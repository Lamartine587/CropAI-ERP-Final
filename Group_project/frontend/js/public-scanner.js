// 1. Define the base URL at the top to fix the "not defined" error
// Using a relative path '/' makes it work on localhost AND ngrok automatically
const API_BASE_URL = '/api';

const fileInput = document.getElementById('publicFile');
const uploadArea = document.getElementById('publicUploadArea');
const preview = document.getElementById('publicPreview');
const imgDisplay = document.getElementById('imgDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('publicResult');
const spinner = document.getElementById('spinner');

// Handle Image Selection
fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imgDisplay.src = e.target.result;
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// Handle AI Analysis
analyzeBtn.addEventListener('click', async () => {
    if (!fileInput.files[0]) return alert("Please select an image first!");

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    // UI state: show loading, hide preview
    preview.style.display = 'none';
    spinner.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        // 2. Use the defined API_BASE_URL variable
        // This removes the hardcoded localhost:5000 that causes tunnel errors
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            // This header helps bypass the ngrok warning page for automated calls
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });

        const result = await response.json();

        if (response.ok) {
            spinner.style.display = 'none';
            resultDiv.style.display = 'block';
            
            // Populate results from the standard AI Controller response
            document.getElementById('diseaseHeader').textContent = result.data.disease;
            document.getElementById('cropType').textContent = result.data.crop;
            document.getElementById('cropStatus').textContent = result.data.status;
            
            // Join the treatments array into a readable string
            const treatmentList = result.data.treatments;
            document.getElementById('cropTreatment').textContent = Array.isArray(treatmentList) 
                ? treatmentList.join(', ') 
                : treatmentList;

        } else {
            throw new Error(result.error || "AI failed to analyze image");
        }
    } catch (err) {
        spinner.style.display = 'none';
        preview.style.display = 'block';
        alert("Error: " + err.message);
        console.error("Scanner Error:", err);
    }
});