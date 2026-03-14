document.addEventListener('DOMContentLoaded', fetchHistory);

async function fetchHistory() {
    // 1. FIXED: Pointing to the correct ID in your new HTML
    const tableBody = document.getElementById('historyTableBody');
    const token = localStorage.getItem('token');

    if (!token) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 3rem; color: #e74c3c;">Authentication required. Please log in.</td></tr>`;
        return;
    }

    try {
        const response = await fetch('/api/ai/history', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch history');

        const data = await response.json();

        // 2. Beautiful Empty State (No need for the old 'noHistory' div)
        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 3rem; color: #7f8c8d;">
                        <i class="fas fa-leaf" style="font-size: 2.5rem; color: #bdc3c7; margin-bottom: 15px; display: block;"></i>
                        No scans found. Head to the dashboard to scan your first crop!
                    </td>
                </tr>`;
            return;
        }

        // 3. Map the data into rows with data-labels for mobile responsiveness
        tableBody.innerHTML = data.map(item => {
            // FIXED: Better date handling
            let dateObj;
            
            // Try to use createdAt if available
            if (item.createdAt) {
                dateObj = new Date(item.createdAt);
            } 
            // Try to extract from MongoDB _id if it's an ObjectId string
            else if (item._id && item._id.length === 24) {
                // MongoDB ObjectIds contain timestamp in first 8 characters (4 bytes)
                const timestamp = parseInt(item._id.substring(0, 8), 16) * 1000;
                dateObj = new Date(timestamp);
            }
            // Fallback to current date if all else fails
            else {
                dateObj = new Date();
            }

            // Check if date is valid
            if (isNaN(dateObj.getTime())) {
                dateObj = new Date(); // Fallback to current date if invalid
            }

            // Format date nicely
            const formattedDate = dateObj.toLocaleDateString('en-KE', { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });

            // Dynamic styling based on health status
            const isHealthy = item.status && item.status.toLowerCase() === 'healthy';
            const statusColor = isHealthy ? '#2ecc71' : '#e74c3c';
            const statusIcon = isHealthy ? 'fa-check-circle' : 'fa-exclamation-triangle';

            return `
            <tr>
                <td data-label="Date" style="color: #34495e; font-size: 0.9rem;">${formattedDate}</td>
                <td data-label="Crop" style="color: #2c3e50; font-weight: 600;">${item.crop || 'N/A'}</td>
                <td data-label="Diagnosis" style="color: #34495e;">${item.disease || 'N/A'}</td>
                <td data-label="Status">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                        <i class="fas ${statusIcon}"></i> ${item.status || 'Unknown'}
                    </span>
                </td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("History Error:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 3rem; color: #e74c3c;">Failed to load history. Please check your connection.</td></tr>`;
    }
}