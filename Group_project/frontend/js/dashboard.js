/**
 * Dashboard Controller - CropAI ERP
 * Optimized for PostgreSQL (Snake Case), IoT Prediction, and Featherless AI.
 */

const API_BASE_URL = '/api'; 

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
    
    const headers = { 'ngrok-skip-browser-warning': 'true' };
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

function displayResults(data) {
    if (!analysisResult) return;
    analysisResult.style.display = 'block';
    
    const diseaseName = document.getElementById('diseaseName');
    const symptoms = document.getElementById('symptoms');
    const severityBadge = document.getElementById('severityBadge');
    const treatmentList = document.getElementById('treatment');

    if (diseaseName) diseaseName.textContent = data.disease;
    if (symptoms) symptoms.textContent = `Crop: ${data.crop} | Confidence: ${data.confidence}%`;
    
    if (severityBadge) {
        severityBadge.textContent = data.status;
        severityBadge.className = `severity ${data.status.toLowerCase()}`;
    }

    const treatmentsHtml = data.treatments && data.treatments.length > 0
        ? data.treatments.map(t => `<li style="margin-bottom:8px;"><i class="fas fa-check-circle" style="color:#2ecc71; margin-right:8px;"></i>${t}</li>`).join('')
        : "<li>No specific treatment required.</li>";
        
    if (treatmentList) {
        treatmentList.innerHTML = `<ul style="list-style:none; padding:0; font-size:0.95rem; color:#4a5568;">${treatmentsHtml}</ul>`;
    }
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
                if (alertsList) {
                    if (data.prediction && data.prediction.riskLevel === 'High') {
                        // Display AI Threat Prediction
                        alertsList.innerHTML = `
                            <div class="alert-box predictive" style="background: #fff5f5; color: #c53030; padding: 15px; border-radius: 12px; border-left: 6px solid #f56565; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                <h4 style="margin: 0 0 5px 0; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-biohazard"></i> AI REGIONAL THREAT ALERT
                                </h4>
                                <p style="margin: 5px 0; font-size: 0.9rem;">
                                    <strong>Predicted Threat:</strong> ${data.prediction.predictedDisease} in <strong>${data.prediction.likelyAffectedCrop}</strong>
                                </p>
                                <div style="margin-top: 10px; font-size: 0.85rem; background: rgba(255,255,255,0.5); padding: 8px; border-radius: 6px;">
                                    <strong>Recommendation:</strong> ${data.prediction.expertRecommendation}
                                </div>
                                <small style="display: block; margin-top: 8px; opacity: 0.8; font-style: italic;">
                                    *Alert broadcasted to all farmers in this region.
                                </small>
                            </div>`;
                    } else if (data.soilMoisture < 30) {
                        // Fallback to basic sensor alert if no AI prediction
                        alertsList.innerHTML = `
                            <div class="alert-box critical" style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; border-left: 5px solid #ef4444; margin-bottom: 10px; font-weight: 500;">
                                <i class="fas fa-exclamation-triangle"></i> <strong>CRITICAL:</strong> Moisture low (${data.soilMoisture}%).
                            </div>`;
                    } else {
                        // Optimal Status
                        alertsList.innerHTML = `
                            <div class="alert-box optimal" style="background: #dcfce7; color: #166534; padding: 15px; border-radius: 8px; border-left: 5px solid #22c55e; margin-bottom: 10px; font-weight: 500;">
                                <i class="fas fa-check-circle"></i> Farm conditions are currently optimal. No threats predicted.
                            </div>`;
                    }
                }
            }
        } catch (e) { 
            console.warn("Sensor sync idle."); 
        }
    };
    
    fetchSensors();
    setInterval(fetchSensors, 5000); // Poll every 5 seconds
}