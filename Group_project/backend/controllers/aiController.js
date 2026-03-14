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

        // 🔥 ENHANCED PROMPT: Added "Not a crop" fallback logic
        const prompt = `Act as an expert Agricultural Pathologist. 
        First, verify if the image actually contains a plant, leaf, or crop.
        
        IF IT IS NOT A PLANT (e.g., a person, car, animal, random object), return EXACTLY this JSON ONLY:
        {
            "crop": "Invalid Image",
            "disease": "None",
            "status": "Not a Crop",
            "confidence": 100,
            "symptoms": "The uploaded image does not appear to contain any agricultural plants or leaves.",
            "treatments": ["Please upload a clear, focused photo of a crop or leaf."],
            "prevention": "Ensure the camera is focused directly on the affected plant tissue."
        }

        IF IT IS A PLANT, analyze it and return ONLY a raw JSON object: 
        {
            "crop": "string (name of crop)",
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

        // Only save to scan history if it was actually a valid scan
        let detectionRecord = null;
        if (aiResponse.status !== "Not a Crop") {
            detectionRecord = await Detection.create({
                user_id: userId,
                ...aiResponse,
                analyzedAt: new Date()
            });
        }

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        // Return the response to the frontend regardless (so the user sees the error)
        return detectionRecord || aiResponse;

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
 */
const generateEnvironmentalRisk = async (crops, sensors) => {
    try {
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
        
        let clean = data.choices[0].message.content.trim().replace(/```json/gi, '').replace(/```/g, '');
        return JSON.parse(clean);
    } catch (err) {
        console.error("Prediction Engine Error:", err);
        return null;
    }
};

// CRITICAL: Ensure all 3 functions are exported
module.exports = { analyzeCropImage, generatePersonalizedInsight, generateEnvironmentalRisk };
