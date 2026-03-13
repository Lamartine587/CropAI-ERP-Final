const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db'); 
const sendVerificationEmail = require('../utils/sendEmail');

/**
 * REGISTER FARMER
 */
exports.register = async (req, res) => {
    const { fullName, email, password } = req.body; 
    
    // 1. Basic validation
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: "Please provide all required fields." });
    }

    const client = await pgPool.connect();

    try {
        await client.query('BEGIN'); // Start Transaction

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 3. Insert into users table
        // We set is_verified to false. (Change to true if you want to skip verification for the demo)
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email.toLowerCase(), hash, false]
        );
        const userId = userResult.rows[0].id;

        // 4. Insert into profiles table
        await client.query(
            'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName]
        );

        // 5. COMMIT early! This ensures the user is saved even if the email fails later.
        await client.query('COMMIT'); 

        // 6. Generate Verification Token
        const verificationToken = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 7. Build full Verification URL
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${verificationToken}`;

        // 8. Send Email in the background (No 'await' here)
        sendVerificationEmail(email, verificationUrl).catch(mailErr => {
            console.error("⚠️ Background Mail Error (User still created):", mailErr.message);
        });

        res.status(201).json({ 
            message: "Account created! Please check your email to verify." 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Registration Error:", err.message);
        
        const errorMsg = err.code === '23505' 
            ? "This email is already registered." 
            : "Registration failed. Please try again.";
            
        res.status(500).json({ error: errorMsg });
    } finally {
        client.release();
    }
};

/**
 * LOGIN FARMER
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pgPool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: "Invalid credentials." });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

        // HACKATHON OVERRIDE: 
        // If you want to bypass verification for the demo, comment out this block:
        /*
        if (!user.is_verified) {
            return res.status(401).json({ error: "Please verify your email before logging in." });
        }
        */

        // Generate Session Token
        const token = jwt.sign(
            { id: user.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ token, message: "Welcome back!" });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server error during login." });
    }
};

/**
 * VERIFY EMAIL
 */
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) return res.status(400).send("Verification token is missing.");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        await pgPool.query(
            'UPDATE users SET is_verified = true WHERE id = $1', 
            [decoded.id]
        );

        // Redirect back to login with a success flag
        res.redirect('/pages/login.html?verified=true');

    } catch (err) {
        console.error("Verification Error:", err.message);
        res.status(400).send("Invalid or expired verification link.");
    }
};
