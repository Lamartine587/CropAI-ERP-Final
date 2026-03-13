const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db'); 
const sendVerificationEmail = require('../utils/sendEmail');

exports.register = async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ error: "All fields are required." });

    const client = await pgPool.connect(); 
    try {
        await client.query('BEGIN'); 
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 1. Create User
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email.toLowerCase(), hash, false]
        );
        const userId = userResult.rows[0].id;

        // 2. Create Profile
        await client.query('INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)', [userId, fullName]);
        
        // 3. COMMIT database changes first!
        await client.query('COMMIT'); 

        // 4. Verification Setup
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const url = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${token}`;
        
        // 5. Send Email in background (Doesn't block registration if it fails)
        sendVerificationEmail(email, url).catch(e => console.error("Background Mail Error:", e.message));
        
        res.status(201).json({ message: "Account created! Please check your email." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Reg Error:", err.message);
        res.status(500).json({ error: "Registration failed. Email may already exist." });
    } finally { 
        client.release(); 
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pgPool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });
        
        const user = result.rows[0];
        // Note: For hackathon demo, you can comment out the line below to allow unverified logins
        if (!user.is_verified) return res.status(403).json({ error: "Please verify your email first." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: "Login successful", token });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
};

exports.verifyEmail = async (req, res) => {
    const { token } = req.query; // Matches the URL structure in registration
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await pgPool.query('UPDATE users SET is_verified = true WHERE id = $1', [decoded.id]);
        res.redirect('/pages/login.html?verified=true');
    } catch (error) { 
        res.status(400).send("Invalid or expired link."); 
    }
};
