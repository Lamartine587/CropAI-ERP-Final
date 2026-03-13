// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

// Notice we changed 'token' to 'verificationUrl' in the parameters
const sendVerificationEmail = async (userEmail, verificationUrl) => { 
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // We completely removed the hardcoded localhost line here!

        const mailOptions = {
            from: `"CropAI Intelligence" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your Farmer Account - CropAI',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                    <h2 style="color: #2ecc71;">Welcome to CropAI! 🌱</h2>
                    <p>Thank you for joining our community. Please verify your email to access your dashboard and start scanning your crops.</p>
                    
                    <a href="${verificationUrl}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; font-weight: bold;">Verify My Account</a>
                    
                    <p style="margin-top: 20px; color: #7f8c8d; font-size: 12px;">This link will expire in 1 hour.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Verification email sent to ${userEmail} via ${verificationUrl.split('/api')[0]}`);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Could not send verification email.');
    }
};

module.exports = sendVerificationEmail;
