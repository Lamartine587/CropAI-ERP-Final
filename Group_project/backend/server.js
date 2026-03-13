const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDBs } = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();

// Security & Proxy Config
app.set('trust proxy', 1);
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 1. SERVE UPLOADS DIRECTORY (The Fix)
 * This tells Express: "If a request starts with /uploads, 
 * look inside the local 'uploads' folder for that file."
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * 2. STATIC DIRECTORY (Frontend)
 * Serves the 'frontend' folder as the root (/).
 */
app.use(express.static(path.join(__dirname, '../frontend')));

// Health Check for presentation
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Connected', 
        timestamp: new Date(), 
        engine: 'Llama 3 via Featherless' // Updated for your new AI pivot!
    });
});

app.use('/api', apiRoutes);

app.get('/', (req, res) => res.redirect('/index.html'));

const PORT = process.env.PORT || 5000;
connectDBs().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 CropAI Server Running on http://localhost:${PORT}`);
        console.log(`📂 Uploads enabled at: ${path.join(__dirname, 'uploads')}`);
    });
});