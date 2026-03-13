const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// --- DATABASE & MODELS ---
const { pgPool } = require('../config/db');
const { SensorLog, Detection } = require('../models/mongoModels');

// --- UTILS & CONTROLLERS ---
const sendVerificationEmail = require('../utils/sendEmail');
const { sendAlertEmail, sendRegionalWarning } = require('../utils/sendAlertEmail'); 
const { analyzeCropImage, generatePersonalizedInsight } = require('../controllers/aiController');

// --- MIDDLEWARE ---
const auth = require('../middleware/auth'); 
const optionalAuth = require('../middleware/optionalAuth');

// ==========================================
// 0. MULTER CONFIGURATION
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==========================================
// 1. AUTHENTICATION & PROFILES (PostgreSQL)
// ==========================================

// --- REGISTER ---
router.post('/auth/register', async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ error: "All fields are required." });

    const client = await pgPool.connect(); 
    try {
        await client.query('BEGIN'); 
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email, hash, false]
        );
        const userId = userResult.rows[0].id;

        await client.query('INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)', [userId, fullName]);
        await client.query('COMMIT'); 

        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const url = `${req.protocol}://${req.get('host')}/api/auth/verify/${token}`;
        await sendVerificationEmail(email, url);
        
        res.status(201).json({ message: "Account created! Check email to verify." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Registration failed." });
    } finally { client.release(); }
});

// --- EMAIL VERIFICATION ---
router.get('/auth/verify/:token', async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        await pgPool.query('UPDATE users SET is_verified = true WHERE id = $1', [decoded.id]);
        res.redirect('/pages/login.html?verified=true');
    } catch (error) { res.status(400).send("Invalid or expired link."); }
});

// --- LOGIN ---
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });
        
        const user = result.rows[0];
        if (!user.is_verified) return res.status(403).json({ error: "Verify email first." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: "Login successful", token });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// --- GET PROFILE ---
router.get('/auth/profile', auth, async (req, res) => {
    try {
        const pgResult = await pgPool.query(
            `SELECT p.full_name, p.phone, p.location, p.crops, p.bio, p.avatar_url, u.email 
             FROM profiles p JOIN users u ON p.user_id = u.id WHERE u.id = $1`, [req.user.id]
        );
        const totalScans = await Detection.countDocuments({ user_id: req.user.id });
        res.json({ ...pgResult.rows[0], stats: { totalScans } });
    } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

// --- UPDATE PROFILE ---
router.put('/auth/profile/update', auth, upload.single('avatar'), async (req, res) => {
    const { fullName, phone, location, crops, bio } = req.body;
    let avatarUrl = req.body.avatarUrl;
    if (req.file) avatarUrl = `/uploads/${req.file.filename}`;

    try {
        await pgPool.query(
            `UPDATE profiles SET full_name = $1, phone = $2, location = $3, crops = $4, bio = $5, avatar_url = $6 WHERE user_id = $7`,
            [fullName, phone, location, crops, bio, avatarUrl, req.user.id]
        );
        res.json({ message: "Profile updated successfully!", avatarUrl });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// ==========================================
// 2. IOT SENSOR DATA (MongoDB)
// ==========================================

// backend/routes/api.js

router.post('/iot/sensors', optionalAuth, async (req, res) => {
    const { temperature, humidity, soilMoisture } = req.body;
    const userId = req.user ? req.user.id : null;

    try {
        // 1. Save the sensor log
        const newLog = await SensorLog.create({
            user_id: userId,
            temperature,
            humidity,
            soilMoisture
        });

        // 2. TRIGGER AI PREDICTION (Non-blocking)
        if (userId) {
            // Get user's profile for location and crops
            const profile = await pgPool.query(
                'SELECT location, crops FROM profiles WHERE user_id = $1', [userId]
            );
            const userRegion = profile.rows[0]?.location;

            if (userRegion) {
                // Call Featherless to predict risks based on these numbers
                // Using DeepSeek V3.2 for complex reasoning
                const prediction = await generateEnvironmentalRisk(
                    profile.rows[0].crops, 
                    { temperature, humidity, soilMoisture }
                );

                // 3. BROADCAST IF RISK IS HIGH
                if (prediction && prediction.riskLevel === 'High') {
                    const neighbors = await pgPool.query(
                        'SELECT u.email FROM users u JOIN profiles p ON u.id = p.user_id WHERE p.location = $1', 
                        [userRegion]
                    );

                    neighbors.rows.forEach(n => {
                        sendRegionalWarning(n.email, userRegion, prediction.likelyAffectedCrop, prediction.predictedDisease, prediction);
                    });
                }
                
                // Return the prediction to the dashboard UI
                return res.status(201).json({ 
                    message: "Data logged", 
                    prediction, 
                    data: newLog 
                });
            }
        }

        res.status(201).json({ message: "Data received", data: newLog });
    } catch (err) {
        res.status(500).json({ error: "Failed to process sensor data" });
    }
});
router.get('/iot/sensors/latest', async (req, res) => {
    try {
        const latest = await SensorLog.findOne().sort({ timestamp: -1 });
        res.json(latest || { temperature: '--', humidity: '--', soilMoisture: '--' });
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// ==========================================
// 3. AI DETECTION & REGIONAL BROADCAST
// ==========================================

// --- Authenticated Detect (With Regional Broadcast) ---
router.post('/ai/detect', auth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    try {
        // 1. Analyze via Featherless AI (Vision)
        const result = await analyzeCropImage(req.file.path, req.file.mimetype, req.user.id);
        res.json({ data: result });

        // 2. Broadcast Logic (Only if infection is found)
        if (result.status.toLowerCase() === 'infected') {
            const profileRes = await pgPool.query('SELECT location, crops FROM profiles WHERE user_id = $1', [req.user.id]);
            const region = profileRes.rows[0]?.location;

            if (region) {
                const sensor = await SensorLog.findOne({ user_id: req.user.id }).sort({ timestamp: -1 });
                const insight = await generatePersonalizedInsight(profileRes.rows[0].crops, sensor, result);

                // Find neighbors in same region
                const neighborQuery = await pgPool.query(
                    'SELECT u.email FROM users u JOIN profiles p ON u.id = p.user_id WHERE p.location = $1 AND u.id != $2',
                    [region, req.user.id]
                );

                // Dispatch alerts
                sendAlertEmail(req.user.email, result.crop, result.disease, insight);
                neighborQuery.rows.forEach(n => sendRegionalWarning(n.email, region, result.crop, result.disease, insight));
            }
        }
    } catch (err) { res.status(500).json({ error: "AI processing failed." }); }
});

// --- Public Detect (Guest Scan) ---
router.post('/ai/public-detect', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image" });
    try {
        const result = await analyzeCropImage(req.file.path, req.file.mimetype, null);
        res.json({ message: "Guest scan complete", data: result });
    } catch (err) { res.status(500).json({ error: "Guest AI failed." }); }
});

// --- Scan History ---
router.get('/ai/history', auth, async (req, res) => {
    try {
        const history = await Detection.find({ user_id: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) { res.status(500).json({ error: "History failed" }); }
});

module.exports = router;