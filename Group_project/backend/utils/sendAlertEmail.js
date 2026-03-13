const nodemailer = require('nodemailer');

// Helper to create the transporter once
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const sendAlertEmail = async (userEmail, crop, disease, insight) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"CropAI Alerts" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Crop Health Alert: ${disease} Detected`,
            html: `<p>Your ${crop} has been diagnosed with ${disease}. ${insight}</p>`
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Alert Email failed:', error);
    }
};

const sendRegionalWarning = async (recipientEmail, region, crop, disease, insight) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"CropAI Regional Alerts" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `⚠️ REGIONAL ALERT: ${disease} in ${region}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #e67e22; border-radius: 10px;">
                    <h2 style="color: #e67e22;">📍 Regional Threat Detected</h2>
                    <p>Hello Farmer, a crop threat has been identified in <strong>${region}</strong>.</p>
                    <div style="background: #fff5eb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Threat:</strong> ${disease} in ${crop}</p>
                        <p><strong>Advice:</strong> ${insight.expertRecommendation}</p>
                        <p><strong>Risk:</strong> ${insight.futureRisk}</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Regional Email failed:', error);
    }
};

module.exports = { sendAlertEmail, sendRegionalWarning };
