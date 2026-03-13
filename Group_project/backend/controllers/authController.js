const bcrypt = require('bcrypt');
const { pgPool } = require('../config/db'); // Adjust path to your db config

exports.register = async (req, res) => {
    const { fullName, email, password } = req.body;
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN'); // Start Transaction

        // 1. Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 2. Insert into users table
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
            [email, hash]
        );
        const userId = userResult.rows[0].id;

        // 3. Insert into profiles table
        await client.query(
            'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: "Farmer account and profile created!" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Registration failed. Email might exist." });
    } finally {
        client.release();
    }
};