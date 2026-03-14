const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db'); 
const sendVerificationEmail = require('../utils/sendEmail');

/**
 * 1. REGISTER FARMER - BYPASS ENABLED
 */
exports.register = async (req, res) => {
    const { fullName, email, password } = req.body;
    
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: "Full name, email, and password are required." });
    }

    const client = await pgPool.connect(); 
    try {
        await client.query('BEGIN'); 

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 🔥 HACKATHON BYPASS: Setting is_verified to 'true' by default
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email.toLowerCase().trim(), hash, true] 
        );
        const userId = userResult.rows[0].id;

        await client.query(
            'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName.trim()]
        );
        
        await client.query('COMMIT'); 

        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${token}`;
        
        // Background call - if it fails, it doesn't matter because user is already 'true'
        sendVerificationEmail(email, verificationUrl).catch(e => {
            console.log("⚠️ Verification email skipped for demo purposes.");
        });
        
        res.status(201).json({ 
            message: "Farmer account created! Access granted for demo." 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Registration Error:", err.message);
        if (err.code === '23505') {
            return res.status(400).json({ error: "This email is already registered." });
        }
        res.status(500).json({ error: "Registration failed." });
    } finally { 
        client.release(); 
    }
};

/**
 * 2. LOGIN FARMER - BYPASS ENABLED
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        const result = await pgPool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: "No account found." });
        }

        // 🔥 HACKATHON BYPASS: Commenting out the verification block
        /*
        if (!user.is_verified) {
            return res.status(403).json({ error: "Please verify your email." });
        }
        */

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({ message: "Welcome to CropAI!", token });

    } catch (err) {
        console.error("❌ Login Error:", err.message);
        res.status(500).json({ error: "Internal server error." });
    }
};

/**
 * 3. VERIFY EMAIL (Remains unchanged for structure)
 */
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token.");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await pgPool.query('UPDATE users SET is_verified = true WHERE id = $1', [decoded.id]);
        res.redirect('/pages/login.html?verified=true');
    } catch (err) {
        res.status(400).send("Invalid link.");
    }
};
