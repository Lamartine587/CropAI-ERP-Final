const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// --- DATABASE & MODELS ---
const { pgPool } = require('../config/db');
const { SensorLog, Detection } = require('../models/mongoModels');

// --- UTILS & CONTROLLERS ---
const authController = require('../controllers/authController');
const { 
    analyzeCropImage, 
    generatePersonalizedInsight, 
    generateEnvironmentalRisk 
} = require('../controllers/aiController');
const { sendAlertEmail, sendRegionalWarning } = require('../utils/sendAlertEmail'); 

// --- MIDDLEWARE ---
const auth = require('../middleware/auth'); 
const optionalAuth = require('../middleware/optionalAuth');

// ==========================================
// 0. MULTER CONFIGURATION (For Image Uploads)
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

// These use the optimized logic in authController.js
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/verify', authController.verifyEmail);

// --- Get Full User Profile ---
router.get('/auth/profile', auth, async (req, res) => {
    try {
        const pgResult = await pgPool.query(
            `SELECT p.full_name, p.phone, p.location, p.crops, p.bio, p.avatar_url, u.email 
             FROM profiles p JOIN users u ON p.user_id = u.id WHERE u.id = $1`, [req.user.id]
        );
        const totalScans = await Detection.countDocuments({ user_id: req.user.id });
        res.json({ ...pgResult.rows[0], stats: { totalScans } });
    } catch (err) {
        console.error("Profile Fetch Error:", err);
        res.status(500).json({ error: "Could not fetch profile." });
    }
});

// --- Update User Profile ---
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
    } catch (err) {
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: "Update failed." });
    }
});

// ==========================================
// 2. IOT SENSOR DATA (MongoDB + AI Prediction)
// ==========================================

router.post('/iot/sensors', optionalAuth, async (req, res) => {
    const { temperature, humidity, soilMoisture } = req.body;
    const userId = req.user ? req.user.id : null;

    try {
        // 1. Log data to MongoDB
        const newLog = await SensorLog.create({
            user_id: userId,
            temperature,
            humidity,
            soilMoisture
        });

        // 2. Proactive AI Prediction (DeepSeek V3.2)
        if (userId) {
            const profile = await pgPool.query('SELECT location, crops FROM profiles WHERE user_id = $1', [userId]);
            const userRegion = profile.rows[0]?.location;

            if (userRegion) {
                const prediction = await generateEnvironmentalRisk(
                    profile.rows[0].crops, 
                    { temperature, humidity, soilMoisture }
                );

                // 3. Regional Broadcast if risk is high
                if (prediction && prediction.riskLevel === 'High') {
                    const neighbors = await pgPool.query(
                        'SELECT u.email FROM users u JOIN profiles p ON u.id = p.user_id WHERE p.location = $1 AND u.id != $2', 
                        [userRegion, userId]
                    );

                    neighbors.rows.forEach(n => {
                        sendRegionalWarning(n.email, userRegion, prediction.likelyAffectedCrop, prediction.predictedDisease, prediction);
                    });
                }
                
                return res.status(201).json({ message: "IoT Data Logged", prediction, data: newLog });
            }
        }

        res.status(201).json({ message: "IoT Data Logged", data: newLog });
    } catch (err) {
        console.error("IoT Logic Error:", err);
        res.status(500).json({ error: "Failed to process sensor telemetry." });
    }
});

// --- Get Latest Regional Telemetry ---
router.get('/iot/sensors/latest', async (req, res) => {
    try {
        const latest = await SensorLog.findOne().sort({ timestamp: -1 });
        res.json(latest || { temperature: '--', humidity: '--', soilMoisture: '--' });
    } catch (err) {
        res.status(500).json({ error: "Could not fetch latest telemetry." });
    }
});

// ==========================================
// 3. AI DETECTION & SCAN HISTORY
// ==========================================

// --- Authenticated Scan (Vision AI + Multi-modal logic) ---
router.post('/ai/detect', auth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Please upload a crop image." });

    try {
        // 1. Analyze via Qwen3-VL Vision
        const result = await analyzeCropImage(req.file.path, req.file.mimetype, req.user.id);
        res.json({ data: result });

        // 2. Trigger Regional Broadcast if infected
        if (result.status.toLowerCase() === 'infected') {
            const profileRes = await pgPool.query('SELECT location, crops FROM profiles WHERE user_id = $1', [req.user.id]);
            const region = profileRes.rows[0]?.location;

            if (region) {
                const sensor = await SensorLog.findOne({ user_id: req.user.id }).sort({ timestamp: -1 });
                const insight = await generatePersonalizedInsight(profileRes.rows[0].crops, sensor, result);

                const neighbors = await pgPool.query(
                    'SELECT u.email FROM users u JOIN profiles p ON u.id = p.user_id WHERE p.location = $1 AND u.id != $2',
                    [region, req.user.id]
                );

                // Personal Alert
                sendAlertEmail(req.user.email, result.crop, result.disease, insight);
                
                // Regional Broadcast
                neighbors.rows.forEach(n => sendRegionalWarning(n.email, region, result.crop, result.disease, insight));
            }
        }
    } catch (err) {
        console.error("AI Detection Error:", err);
        res.status(500).json({ error: "AI processing engine timed out." });
    }
});

// --- Public / Guest Scan ---
router.post('/ai/public-detect', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image provided." });
    try {
        const result = await analyzeCropImage(req.file.path, req.file.mimetype, null);
        res.json({ message: "Guest analysis complete", data: result });
    } catch (err) {
        res.status(500).json({ error: "Guest AI engine error." });
    }
});

// --- User Scan History ---
router.get('/ai/history', auth, async (req, res) => {
    try {
        const history = await Detection.find({ user_id: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: "Could not retrieve history." });
    }
});

module.exports = router;
