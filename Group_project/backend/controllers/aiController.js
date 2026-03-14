const fs = require('fs');
const { Detection } = require('../models/mongoModels');

/**
 * 1. MULTI-MODAL IMAGE ANALYSIS
 * Model: Qwen3-VL (Vision)
 */
const analyzeCropImage = async (filePath, mimeType, userId = null) => {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');

        const prompt = `Act as an expert Agricultural Pathologist. Analyze this crop image.
        Return ONLY a raw JSON object: 
        {
            "crop": "string",
            "disease": "string",
            "status": "Healthy|Infected",
            "confidence": number,
            "symptoms": "Detailed description of patterns",
            "treatments": ["Immediate Step", "Organic Fix", "Chemical Fix"],
            "prevention": "A comprehensive, step-by-step prevention guide including soil management, watering habits, and field hygiene to avoid future outbreaks."
        }`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "Qwen/Qwen3-VL-30B-A3B-Instruct",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let cleanContent = data.choices[0].message.content.trim();
        cleanContent = cleanContent.replace(/```json/gi, '').replace(/```/g, '').trim();

        const aiResponse = JSON.parse(cleanContent);

        const detectionRecord = await Detection.create({
            user_id: userId,
            ...aiResponse,
            analyzedAt: new Date()
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return detectionRecord;

    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("Vision AI Error:", error.message);
        throw error;
    }
};

/**
 * 2. PREDICTIVE INSIGHTS
 * Model: DeepSeek V3.2
 */
const generatePersonalizedInsight = async (userCrops, sensorData, imageResult) => {
    try {
        const prompt = `Farmer Profile: ${userCrops}. Sensors: Temp ${sensorData?.temperature}°C. Scan: ${imageResult.disease}.
        Return JSON ONLY: {"alertHeadline": "string", "expertRecommendation": "string", "futureRisk": "string"}`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3.2",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2
            })
        });

        const data = await response.json(); 
        let clean = data.choices[0].message.content.trim().replace(/```json/gi, '').replace(/```/g, '');
        return JSON.parse(clean);
    } catch (err) {
        return { alertHeadline: "Status Normal", expertRecommendation: "Continue monitoring sensor data.", futureRisk: "Low" };
    }
};

/**
 * 3. ENVIRONMENTAL RISK PREDICTION
 * Model: DeepSeek V3.2
 * Function: Predicts threats based on real-time weather and the user's registered crops.
 */
const generateEnvironmentalRisk = async (crops, sensors) => {
    try {
        // 🔥 ENHANCED PROMPT: Forces AI to identify the exact crop at risk and provide a prevention plan
        const prompt = `You are an expert AI Agronomist.
        Current Weather: Temperature ${sensors.temperature}°C, Humidity ${sensors.humidity}%, Soil Moisture ${sensors.soilMoisture}%.
        Farmer's Registered Crops: ${crops}.
        
        Task: Predict the most likely disease or pest threat based on these conditions. Note that high humidity favors fungal/blight outbreaks, while high heat and low moisture favor drought stress or pests.
        
        Return EXACTLY this JSON structure ONLY:
        {
            "riskLevel": "Low|Medium|High",
            "predictedDisease": "Name of the specific disease or pest",
            "likelyAffectedCrop": "Which specific crop from the farmer's list is most vulnerable",
            "expertRecommendation": "Detailed prevention steps (e.g., specific organic/chemical applications, watering adjustments)"
        }`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3.2",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1
            })
        });

        const data = await response.json();
        
        // Robust JSON cleaning
        let clean = data.choices[0].message.content.trim().replace(/```json/gi, '').replace(/```/g, '');
        return JSON.parse(clean);
    } catch (err) {
        console.error("Prediction Engine Error:", err);
        return null;
    }
};

// CRITICAL: Ensure all 3 functions are exported
module.exports = { analyzeCropImage, generatePersonalizedInsight, generateEnvironmentalRisk };
