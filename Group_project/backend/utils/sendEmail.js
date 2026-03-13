const nodemailer = require('nodemailer');

const sendVerificationEmail = async (userEmail, verificationUrl) => { 
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Must be false for port 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // CRITICAL: This forces Node to use IPv4 instead of IPv6 (fixes ENETUNREACH)
            // and ignores self-signed cert issues on cloud hosts
            tls: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            }
        });

        const mailOptions = {
            from: `"CropAI Intelligence" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your Farmer Account - CropAI',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
                    <h2 style="color: #2ecc71; text-align: center;">Welcome to CropAI! 🌱</h2>
                    <p>Your account is almost ready. Please click the button below to verify your email and access your smart farming dashboard.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #2ecc71; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify My Account</a>
                    </div>
                    <p style="color: #7f8c8d; font-size: 12px; text-align: center;">If the button doesn't work, copy and paste this link: <br>${verificationUrl}</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Nodemailer Error:', error.message);
        // We don't throw the error so the registration process doesn't stop
    }
};

module.exports = sendVerificationEmail;
