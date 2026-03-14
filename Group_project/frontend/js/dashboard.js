/**
 * Dashboard Controller - CropAI ERP
 * Optimized for PostgreSQL, IoT Prediction, and Featherless AI.
 */

// 1. DYNAMIC API TARGETING
const API_BASE_URL = window.location.origin + '/api'; 

// DOM Selectors
const uploadArea = document.getElementById('uploadArea');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const imageInput = document.getElementById('imageInput');
const analysisModal = document.getElementById('analysisModal');
const analysisResult = document.getElementById('analysisResult');
const loadingSpinner = document.getElementById('loading-spinner');
const alertsList = document.getElementById('alertsList');

document.addEventListener('DOMContentLoaded', () => {
    startSensorPolling();
    fetchUserProfile(); 
    
    if(imageInput) {
        imageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imagePreview) {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                    }
                    if (uploadArea) uploadArea.style.display = 'none';
                    if (previewContainer) previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});

// --- 1. PERSONALIZATION LOGIC ---
async function fetchUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) return; 

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true' 
            }
        });
        
        const data = await response.json();

        if (response.ok) {
            const fullName = data.full_name || "Farmer";
            const firstName = fullName.split(' ')[0];
            
            const welcomeName = document.getElementById('welcome-name');
            const userWelcome = document.getElementById('user-welcome'); 
            
            if (welcomeName) welcomeName.textContent = firstName;
            if (userWelcome) userWelcome.textContent = `Welcome back, ${firstName}!`;
        }
    } catch (err) {
        console.warn("Failed to load user profile for personalization.");
    }
}

// --- 2. AI SCANNER LOGIC (Reactive) ---
async function analyzeImage() {
    const file = imageInput.files[0];
    if (!file) {
        alert("Please select a crop image to analyze.");
        return;
    }

    if (analysisModal) analysisModal.style.display = 'flex';
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (analysisResult) analysisResult.style.display = 'none';
    
    const formData = new FormData();
    formData.append('image', file);
    
    const token = localStorage.getItem('token');
    const endpoint = token ? `${API_BASE_URL}/ai/detect` : `${API_BASE_URL}/ai/public-detect`;
    
    const headers = { 'ngrok-skip-browser-warning': '69420' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'AI Analysis failed');

        if (loadingSpinner) loadingSpinner.style.display = 'none';
        displayResults(result.data);

    } catch (error) {
        console.error("AI Error:", error);
        alert(`Diagnostic Error: ${error.message}`);
        closeModal();
    }
}

// --- NEW: DETAILED RESULTS MAPPING ---
function displayResults(data) {
    if (!analysisResult) return;
    
    // JSON Guard: Just in case the AI wraps the response
    let aiData = data;
    if (typeof aiData === 'string') {
        const match = aiData.match(/\{[\s\S]*\}/);
        aiData = match ? JSON.parse(match[0]) : {};
    }

    // Modal DOM Elements
    const statusBadge = document.getElementById('statusBadge');
    const diseaseName = document.getElementById('diseaseName');
    const cropTypeIdentified = document.getElementById('cropTypeIdentified');
    const symptomsEl = document.getElementById('symptoms');
    const treatmentEl = document.getElementById('treatment');
    const preventionEl = document.getElementById('prevention');

    // 1. Status Badge (Dynamic Color)
    if (statusBadge) {
        const statusText = aiData.status || "EVALUATED";
        statusBadge.textContent = statusText.toUpperCase() + " VERIFIED";
        
        // Turn red if infected, green if healthy
        if (statusText.toLowerCase() === 'infected') {
            statusBadge.style.color = '#e74c3c';
            statusBadge.style.backgroundColor = 'rgba(231, 76, 60, 0.15)';
        } else {
            statusBadge.style.color = '#2ecc71';
            statusBadge.style.backgroundColor = 'rgba(46, 204, 113, 0.15)';
        }
    }

    // 2. High-Level Info
    if (diseaseName) diseaseName.textContent = aiData.disease || "No Pathogen Found";
    if (cropTypeIdentified) cropTypeIdentified.textContent = "Detected in " + (aiData.crop || "Unknown Crop");
    
    // 3. Detailed AI Insights
    if (symptomsEl) symptomsEl.textContent = aiData.symptoms || "No visible symptoms mapped.";
    if (preventionEl) preventionEl.textContent = aiData.prevention || "Maintain standard field hygiene and watering schedules.";

    // 4. Treatment List Formatting
    if (treatmentEl) {
        if (Array.isArray(aiData.treatments)) {
            treatmentEl.innerHTML = `<ul style="margin: 0; padding-left: 20px;">
                ${aiData.treatments.map(t => `<li style="margin-bottom: 5px;">${t}</li>`).join('')}
            </ul>`;
        } else {
            treatmentEl.textContent = aiData.treatments || "No immediate chemical intervention required.";
        }
    }

    // Reveal the populated modal
    analysisResult.style.display = 'block';
}

function resetUpload() {
    if (imageInput) imageInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
}

function closeModal() {
    if (analysisModal) analysisModal.style.display = 'none';
    resetUpload();
}

// --- 3. IOT SENSOR POLLING & PREDICTIVE ALERTS (Proactive) ---
function startSensorPolling() {
    const fetchSensors = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/iot/sensors/latest`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            
            if (data && data.temperature !== undefined) {
                // Update numerical values
                const tVal = document.getElementById('temperatureValue');
                const mVal = document.getElementById('moistureValue');
                const hVal = document.getElementById('humidityValue');

                if (tVal) tVal.textContent = `${data.temperature}°C`;
                if (mVal) mVal.textContent = `${data.soilMoisture}%`;
                if (hVal) hVal.textContent = `${data.humidity}%`;

                // --- AI PREDICTION LOGIC ---
                if (alertsList && data.prediction && data.prediction.riskLevel === 'High') {
                    alertsList.innerHTML = `
                        <div class="alert-box predictive" style="background: #fff5f5; color: #c53030; padding: 20px; border-radius: 12px; border-left: 6px solid #f56565; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                            <h4 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-biohazard"></i> REGIONAL AI THREAT
                            </h4>
                            <p style="margin: 5px 0; font-size: 0.95rem;">
                                <strong>Predicted:</strong> ${data.prediction.predictedDisease} in ${data.prediction.likelyAffectedCrop}
                            </p>
                            <div style="margin-top: 15px; font-size: 0.85rem; background: white; padding: 12px; border-radius: 8px; border: 1px solid #fed7d7;">
                                <strong style="color: #e53e3e;">Action Required:</strong><br>
                                ${data.prediction.expertRecommendation}
                            </div>
                        </div>`;
                }
            }
        } catch (e) { 
            console.warn("Sensor sync idle."); 
        }
    };
    
    fetchSensors();
    setInterval(fetchSensors, 8000); // Polling backed off to 8 seconds to save Render resources
}
