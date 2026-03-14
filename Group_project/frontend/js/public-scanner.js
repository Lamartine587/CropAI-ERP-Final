/**
 * CropAI Public Scanner Logic
 * Handles Dual-Input (Camera/Files) and Robust AI Parsing
 */

const API_BASE_URL = window.location.origin + '/api';

const cameraInput = document.getElementById('cameraInput');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('publicUploadArea');
const preview = document.getElementById('publicPreview');
const imgDisplay = document.getElementById('imgDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('publicResult');
const spinner = document.getElementById('spinner');

// Persistent reference to the file selected
let selectedFile = null;

// Unified handler to load image into the preview holder
function loadSelectedImage(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            imgDisplay.src = e.target.result; // Set local preview
            uploadArea.style.display = 'none'; // Hide selection menu
            preview.style.display = 'block';   // Show preview card
        };
        reader.readAsDataURL(selectedFile);
    }
}

// Bind listeners to both buttons
cameraInput.addEventListener('change', () => loadSelectedImage(cameraInput));
fileInput.addEventListener('change', () => loadSelectedImage(fileInput));

// Analyze Button Click Logic
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return alert("Please select or capture an image!");

    const formData = new FormData();
    formData.append('image', selectedFile);

    // Transition UI to loading
    preview.style.display = 'none';
    spinner.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: { "ngrok-skip-browser-warning": "69420" }
        });

        const result = await response.json();

        if (response.ok) {
            // Transfer current preview image to the results card
            document.getElementById('resultImgDisplay').src = imgDisplay.src;

            // Extract AI data (Handles raw JSON or Markdown-wrapped JSON)
            let data = result.data || {};
            if (typeof data === 'string') {
                const match = data.match(/\{[\s\S]*\}/);
                data = match ? JSON.parse(match[0]) : {};
            }

            // Populate Results UI
            document.getElementById('diseaseHeader').textContent = data.disease || "Diagnosis Found";
            document.getElementById('cropType').textContent = data.crop || "Unknown Crop";
            document.getElementById('cropStatus').textContent = data.status || "Analyzed";
            
            const treatment = data.treatments || "Refer to manual for treatment steps.";
            document.getElementById('cropTreatment').textContent = Array.isArray(treatment) 
                ? treatment.join(', ') 
                : treatment;

            // Final UI Reveal
            spinner.style.display = 'none';
            resultDiv.style.display = 'block';
            resultDiv.scrollIntoView({ behavior: 'smooth' });

        } else {
            throw new Error(result.error || "AI Analysis failed.");
        }
    } catch (err) {
        spinner.style.display = 'none';
        preview.style.display = 'block';
        alert("Scanner Error: " + err.message);
    }
});
