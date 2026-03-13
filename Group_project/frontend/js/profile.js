// frontend/js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'login.html';

    // 1. Load existing data
    try {
        const response = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('profile-name').value = data.fullName;
            document.getElementById('display-name').textContent = data.fullName;
            document.getElementById('display-email').textContent = data.email;
            document.getElementById('profile-phone').value = data.phone || '';
            document.getElementById('profile-location').value = data.location || '';
            
            // Set Initials
            const names = data.fullName.split(' ');
            document.getElementById('profile-initials').textContent = 
                (names[0][0] + (names[1] ? names[1][0] : '')).toUpperCase();
        }
    } catch (err) { console.error("Load error:", err); }

    // 2. Handle Update
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const updatedData = {
            fullName: document.getElementById('profile-name').value,
            phone: document.getElementById('profile-phone').value,
            location: document.getElementById('profile-location').value
        };

        try {
            const res = await fetch('/api/auth/profile/update', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (res.ok) {
                alert("Profile Updated Successfully!");
                location.reload();
            }
        } catch (err) { alert("Failed to update profile"); }
        finally { btn.disabled = false; btn.textContent = 'Update Profile Info'; }
    });
});