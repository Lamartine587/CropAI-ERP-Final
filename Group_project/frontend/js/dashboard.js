/**
 * Dashboard Controller
 * Manages sensor polling, AI image analysis, and user personalization.
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

document.addEventListener('DOMContentLoaded', () => {
    startSensorPolling();
    fetchUserProfile(); // Automatically fetch and display the user's name
    
    // Preview image on selection
    if(imageInput) {
        imageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    uploadArea.style.display = 'none';
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});

// --- PERSONALIZATION LOGIC ---
async function fetchUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) return; // Leave as "Farm Overview" if guest

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Capitalize first name and update the DOM
            const firstName = data.fullName.split(' ')[0];
            const welcomeTitle = document.getElementById('welcome-title');
            if (welcomeTitle) {
                welcomeTitle.textContent = `Welcome, ${firstName}!`;
            }
        }
    } catch (err) {
        console.warn("Failed to load user profile for personalization.");
    }
}

// --- AI SCANNER LOGIC ---
async function analyzeImage() {
    const file = imageInput.files[0];
    if (!file) return;

    // Show the modal as a flexbox to center it
    analysisModal.style.display = 'flex';
    loadingSpinner.style.display = 'block';
    analysisResult.style.display = 'none';
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/ai/detect`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'ngrok-skip-browser-warning': 'true' 
            },
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Analysis failed');

        // Hide spinner and show results
        loadingSpinner.style.display = 'none';
        displayResults(result.data);

    } catch (error) {
        console.error("AI Error:", error);
        alert("Diagnostic Error: " + error.message);
        closeModal();
    }
}

function displayResults(data) {
    analysisResult.style.display = 'block';
    document.getElementById('diseaseName').textContent = data.disease;
    document.getElementById('symptoms').textContent = `Detected in ${data.crop}. Status: ${data.status}`;
    
    const badge = document.getElementById('severityBadge');
    badge.textContent = data.status;
    badge.className = `severity ${data.status.toLowerCase()}`;

    const treatments = data.treatments 
        ? data.treatments.map(t => `<li style="margin-bottom:8px;"><i class="fas fa-check-circle" style="color:#2ecc71;"></i> ${t}</li>`).join('')
        : "No treatment needed.";
        
    document.getElementById('treatment').innerHTML = `<ul style="list-style:none; padding:0; font-size:0.9rem;">${treatments}</ul>`;
}

function resetUpload() {
    imageInput.value = '';
    previewContainer.style.display = 'none';
    uploadArea.style.display = 'block';
}

function closeModal() {
    analysisModal.style.display = 'none';
    resetUpload();
}

// --- IOT SENSOR POLLING ---
function startSensorPolling() {
    const fetchSensors = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/iot/sensors/latest`);
            const data = await res.json();
            if (data.temperature) {
                document.getElementById('temperatureValue').textContent = `${data.temperature}°C`;
                document.getElementById('moistureValue').textContent = `${data.soilMoisture}%`;
                document.getElementById('humidityValue').textContent = `${data.humidity}%`;
            }
        } catch (e) { console.warn("Sensor sync idle..."); }
    };
    fetchSensors();
    setInterval(fetchSensors, 5000);
}