const nodemailer = require('nodemailer');

// 1. Existing Personal Alert
const sendAlertEmail = async (userEmail, crop, disease, insight) => {
    // ... (keep your existing personal alert code here)
};

// 2. NEW: Regional Broadcast Alert
const sendRegionalWarning = async (recipientEmail, region, crop, disease, insight) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const mailOptions = {
            from: `"CropAI Regional Alerts" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `⚠️ REGIONAL ALERT: ${disease} detected in ${region}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #e67e22; border-radius: 10px;">
                    <h2 style="color: #e67e22;">📍 Regional Threat Detected</h2>
                    <p>Hello Farmer, a crop threat has been identified in your region: <strong>${region}</strong>.</p>
                    
                    <div style="background: #fff5eb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Threat:</strong> ${disease} in ${crop}</p>
                        <p><strong>Expert Advice:</strong> ${insight.expertRecommendation}</p>
                        <p><strong>Predicted Risk:</strong> ${insight.futureRisk}</p>
                    </div>

                    <p style="font-size: 0.9rem; color: #7f8c8d;">This is a community alert from CropAI to help you prevent the spread of disease in ${region}.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Regional Email failed:', error);
    }
};

module.exports = { sendAlertEmail, sendRegionalWarning };