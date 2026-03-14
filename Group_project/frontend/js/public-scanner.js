/**
 * CropAI Public Scanner Logic
 * Optimized for Build-with-AI Hackathon 2026
 * Handles: Image Preview, Root-Path API calls, and Robust AI Response Parsing.
 */

// 1. DYNAMIC PATHING
// This ensures the API always hits the root domain regardless of folder depth
const API_BASE_URL = window.location.origin + '/api';

// 2. DOM ELEMENT SELECTION
const fileInput = document.getElementById('publicFile');
const uploadArea = document.getElementById('publicUploadArea');
const preview = document.getElementById('publicPreview');
const imgDisplay = document.getElementById('imgDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('publicResult');
const spinner = document.getElementById('spinner');

// 3. IMAGE PREVIEW LOGIC
fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        
        // Simple size check (Prevent crashing on massive 4K photos)
        if (file.size > 10 * 1024 * 1024) {
            alert("Image is too large. Please select a photo under 10MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imgDisplay.src = e.target.result;
            
            // UI Transition
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
            resultDiv.style.display = 'none'; // Clear old results
            spinner.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// 4. AI ANALYSIS LOGIC
analyzeBtn.addEventListener('click', async () => {
    if (!fileInput.files[0]) return alert("Please select or capture a crop image first!");

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    // UI state: Entering "Thinking" mode
    preview.style.display = 'none';
    spinner.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: {
                // Critical for Ngrok: Bypasses the initial "You are visiting a tunnel" page
                "ngrok-skip-browser-warning": "69420" 
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        const result = await response.json();

        // 5. ROBUST AI PARSING
        // AI models sometimes return JSON inside markdown blocks. This cleans it.
        let analysis = result.data;
        if (typeof analysis === 'string') {
            try {
                const jsonMatch = analysis.match(/\{[\s\S]*\}/);
                analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            } catch (e) {
                console.error("Manual JSON Parse Failed:", e);
            }
        }

        // 6. UI POPULATION
        spinner.style.display = 'none';
        resultDiv.style.display = 'block';
        
        // Populate IDs from scanner.html
        document.getElementById('diseaseHeader').textContent = analysis.disease || "Analysis Complete";
        document.getElementById('cropType').textContent = analysis.crop || "Identified Crop";
        document.getElementById('cropStatus').textContent = analysis.status || "Evaluated";
        
        // Handle treatment as Array or String
        const treatmentElement = document.getElementById('cropTreatment');
        const treatmentData = analysis.treatments || "No specific data for this condition.";
        
        treatmentElement.textContent = Array.isArray(treatmentData) 
            ? treatmentData.join(', ') 
            : treatmentData;

        // Auto-scroll to result for better UX
        resultDiv.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error("Technical Error:", err);
        spinner.style.display = 'none';
        preview.style.display = 'block'; // Give user back their image to try again
        alert("Scanner failed: " + err.message);
    }
});

// 7. HELPER: RESET SCANNER
function resetScanner() {
    fileInput.value = "";
    uploadArea.style.display = 'block';
    preview.style.display = 'none';
    resultDiv.style.display = 'none';
    spinner.style.display = 'none';
}
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Patterns...';
    resultDiv.style.display = 'none';

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: {
                "ngrok-skip-browser-warning": "true" // Bypass ngrok landing page
            }
        });

        const result = await response.json();

        if (response.ok) {
            // 5. Robust Data Parsing
            // AI models sometimes wrap JSON in markdown backticks; this cleans it.
            let data = result.data;
            if (typeof data === 'string') {
                try {
                    const jsonMatch = data.match(/\{[\s\S]*\}/);
                    data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                }
            }

            // 6. Update UI with AI Data
            document.getElementById('diseaseHeader').textContent = data.disease || "Analysis Complete";
            document.getElementById('cropType').textContent = data.crop || "Not Specified";
            document.getElementById('cropStatus').textContent = data.status || "Healthy";
            
            // Handle treatments as either an array or a string
            const treatments = data.treatments || "No specific treatment steps identified.";
            document.getElementById('cropTreatment').textContent = Array.isArray(treatments) 
                ? treatments.join(', ') 
                : treatments;

            // Reveal Result Card
            resultDiv.style.display = 'block';
            resultDiv.scrollIntoView({ behavior: 'smooth' });

        } else {
            throw new Error(result.error || "The AI engine is currently busy.");
        }
    } catch (err) {
        console.error("Scanner Error:", err);
        alert("Scan Failed: " + err.message);
    } finally {
        // Reset Button State
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = 'Analyze with AI';
    }
});

/**
 * LOGOUT HELPER (If included in this script)
 */
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}
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
