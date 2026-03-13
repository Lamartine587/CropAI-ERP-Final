document.addEventListener('DOMContentLoaded', fetchHistory);

async function fetchHistory() {
    const historyBody = document.getElementById('historyBody');
    const noHistory = document.getElementById('noHistory');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/ai/history', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const data = await response.json();

        if (data.length === 0) {
            noHistory.style.display = 'block';
            return;
        }

        historyBody.innerHTML = data.map(item => `
            <tr>
                <td>${new Date(item.createdAt).toLocaleDateString()}</td>
                <td><strong>${item.crop}</strong></td>
                <td>${item.disease}</td>
                <td>
                    <span class="badge ${item.status === 'Healthy' ? 'bg-success' : 'bg-danger'}">
                        ${item.status}
                    </span>
                </td>
                <td>
                    <small>${Array.isArray(item.treatments) ? item.treatments.join(', ') : item.treatments}</small>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("History Error:", err);
        alert("Failed to load diagnostic history.");
    }
}