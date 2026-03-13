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
 * STATIC DIRECTORY
 * Serves the 'frontend' folder as the root (/).
 * This allows navigation.js to fetch '/includes/portal.html'
 */
app.use(express.static(path.join(__dirname, '../frontend')));

// Health Check for presentation
app.get('/api/health', (req, res) => {
    res.json({ status: 'Connected', timestamp: new Date(), engine: 'Gemini 2.0 Flash' });
});

app.use('/api', apiRoutes);

app.get('/', (req, res) => res.redirect('/index.html'));

const PORT = process.env.PORT || 5000;
connectDBs().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 CropAI Server Running on http://localhost:${PORT}`);
    });
});