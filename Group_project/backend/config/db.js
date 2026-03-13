const { Pool } = require('pg');
const mongoose = require('mongoose');

// Use the environment variable provided by Render/Neon
const connectionString = process.env.DATABASE_URL;

const pgPool = new Pool({
    connectionString: connectionString,
    ssl: {
        // This is CRITICAL for Neon and Render cloud connections
        rejectUnauthorized: false 
    }
});

const connectDBs = async () => {
    try {
        // Connect MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected (IoT & AI Data)');

        // Test PostgreSQL Connection
        const client = await pgPool.connect();
        console.log('✅ PostgreSQL Connected (Neon Cloud)');
        client.release();
    } catch (err) {
        console.error('❌ Database Connection Error:', err);
        process.exit(1);
    }
};

module.exports = { connectDBs, pgPool };
