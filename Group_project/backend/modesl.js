// backend/check_models.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // We use the 'v1' endpoint to fetch the list
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        console.log("--- AUTHORIZED MODELS FOR YOUR KEY ---");
        if (data.models) {
            data.models.forEach(m => {
                console.log(`ID: ${m.name} | Methods: ${m.supportedGenerationMethods}`);
            });
        } else {
            console.log("No models found. Check if your API Key is restricted or expired.");
            console.log(data);
        }
    } catch (err) {
        console.error("Error listing models:", err.message);
    }
}

listModels();