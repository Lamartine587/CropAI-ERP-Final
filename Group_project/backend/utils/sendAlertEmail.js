const nodemailer = require('nodemailer');

// 1. Create a persistent transporter (Singleton Pattern)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Simplifies host/port config for Gmail
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Personal Alert: Sent to the farmer who performed the scan.
 */
const sendAlertEmail = async (userEmail, crop, disease, insight) => {
    try {
        const mailOptions = {
            from: `"CropAI Intelligence" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `🚩 Diagnosis Report: ${disease} found in ${crop}`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #2ecc71; padding: 20px; border-radius: 12px;">
                    <h2 style="color: #27ae60;">Scan Successful</h2>
                    <p>Your <strong>${crop}</strong> has been analyzed.</p>
                    <p><strong>Result:</strong> ${disease}</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                        <p>${insight.expertRecommendation || insight}</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Personal Alert Email failed:', error);
    }
};

/**
 * Regional Warning: Broadcast to all farmers in the area.
 */
const sendRegionalWarning = async (recipientEmail, region, crop, disease, insight) => {
    try {
        const mailOptions = {
            from: `"CropAI Regional Watch" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `⚠️ REGIONAL THREAT: ${disease} in ${region}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; border: 2px solid #e67e22; border-radius: 15px; background-color: #fff;">
                    <h2 style="color: #d35400; margin-top: 0;">📍 Regional Outbreak Warning</h2>
                    <p>A symptomatic case of <strong>${disease}</strong> has been confirmed in <strong>${region}</strong>.</p>
                    
                    <div style="background: #fff5eb; padding: 15px; border-radius: 10px; border-left: 5px solid #e67e22; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Affected Crop:</strong> ${crop}</p>
                        <p style="margin: 5px 0;"><strong>Prevention:</strong> ${insight.expertRecommendation || "Monitor your fields closely."}</p>
                        <p style="margin: 5px 0;"><strong>Risk Level:</strong> ${insight.futureRisk || "High Spread Potential"}</p>
                    </div>

                    <p style="font-size: 0.9rem; color: #7f8c8d;">This is an automated intelligence alert to help maintain regional biosecurity.</p>
                    <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: #27ae60; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Farm Data</a>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Regional Warning failed for ${recipientEmail}:`, error);
    }
};

module.exports = { sendAlertEmail, sendRegionalWarning };
