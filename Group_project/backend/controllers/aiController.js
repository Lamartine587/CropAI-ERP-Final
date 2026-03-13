const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { Detection } = require('../models/mongoModels');

// Create an array of keys for rotation
const apiKeys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2];

const analyzeCropImage = async (filePath, mimeType, userId = null, keyIndex = 0) => {
    // If we have tried all keys and they are all throttled
    if (keyIndex >= apiKeys.length) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw new Error("QUOTA EXHAUSTED: All API keys have reached their limit for today.");
    }

    try {
        // Initialize with the current key index
        const genAI = new GoogleGenerativeAI(apiKeys[keyIndex]);
        
        // Using the model confirmed in your 'modesl.js' output
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-lite-001" 
        });

        const prompt = `Analyze this crop leaf image. Respond ONLY with a raw JSON object. 
        Structure: {"crop": "string", "disease": "string", "status": "Healthy/Infected", "treatments": ["string"]}`;

        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Robust JSON extraction
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        if (start === -1) throw new Error("AI failed to return valid JSON");
        
        const aiData = JSON.parse(text.substring(start, end));

        // Save real record to MongoDB
        const detectionRecord = await Detection.create({
            user_id: userId,
            ...aiData
        });

        // Cleanup
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return detectionRecord;

    } catch (error) {
        // If we hit a 429 (Rate Limit), rotate to the next key automatically
        if (error.message.includes('429')) {
            console.warn(`⚠️ Key ${keyIndex + 1} throttled. Swapping to Key ${keyIndex + 2}...`);
            return analyzeCropImage(filePath, mimeType, userId, keyIndex + 1);
        }

        // Cleanup file for any other error
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error(`AI Error (Key ${keyIndex + 1}):`, error.message);
        throw error;
    }
};

module.exports = { analyzeCropImage };