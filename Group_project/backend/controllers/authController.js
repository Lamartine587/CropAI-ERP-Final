const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db'); 
const sendVerificationEmail = require('../utils/sendEmail');

/**
 * 1. REGISTER FARMER
 * Handles secure password hashing, atomic DB transactions, and background emailing.
 */
exports.register = async (req, res) => {
    const { fullName, email, password } = req.body;
    
    // Basic validation
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: "Full name, email, and password are required." });
    }

    const client = await pgPool.connect(); 
    try {
        await client.query('BEGIN'); // Start SQL Transaction

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert into users (Set is_verified: false for security)
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email.toLowerCase().trim(), hash, false]
        );
        const userId = userResult.rows[0].id;

        // Insert into profiles
        await client.query(
            'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName.trim()]
        );
        
        // COMMIT database changes first!
        // This ensures the account exists even if the email server is slow.
        await client.query('COMMIT'); 

        // Generate Verification Token
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Construct full URL for the farmer to click
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${token}`;
        
        // Send Email in the background (No 'await' so response is instant)
        sendVerificationEmail(email, verificationUrl).catch(e => {
            console.error("⚠️ Background Verification Email Failed:", e.message);
        });
        
        res.status(201).json({ 
            message: "Farmer account created! Please check your email to verify your identity." 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Undo DB changes if something fails
        console.error("❌ Registration Logic Error:", err.message);

        // Handle unique constraint violation (Email already exists)
        if (err.code === '23505') {
            return res.status(400).json({ error: "This email is already registered with CropAI." });
        }
        
        res.status(500).json({ error: "An internal server error occurred during registration." });
    } finally { 
        client.release(); // Return connection to the pool
    }
};

/**
 * 2. LOGIN FARMER
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
            return res.status(400).json({ error: "No account found with that email." });
        }

        // Verification Check
        if (!user.is_verified) {
            return res.status(403).json({ error: "Please verify your email address before logging in." });
        }

        // Password Comparison
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password. Please try again." });
        }

        // Generate Session Token (Valid for 7 days)
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({ 
            message: "Authentication successful!", 
            token 
        });

    } catch (err) {
        console.error("❌ Login Logic Error:", err.message);
        res.status(500).json({ error: "An error occurred during authentication." });
    }
};

/**
 * 3. VERIFY EMAIL
 * Activates the user account after they click the email link.
 */
exports.verifyEmail = async (req, res) => {
    const { token } = req.query; // Extracts ?token=... from URL

    if (!token) {
        return res.status(400).send("Verification token is missing.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Set user as verified in PostgreSQL
        await pgPool.query(
            'UPDATE users SET is_verified = true WHERE id = $1', 
            [decoded.id]
        );

        // Redirect the user back to your login page with a success flag
        res.redirect('/pages/login.html?verified=true');

    } catch (err) {
        console.error("❌ Token Verification Error:", err.message);
        res.status(400).send("The verification link is invalid or has expired.");
    }
};
