document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const profileForm = document.getElementById('profile-form');
    const avatarPreview = document.getElementById('avatar-preview');
    const profileInitials = document.getElementById('profile-initials');
    const updateBtn = document.getElementById('updateBtn');

    /**
     * 1. LOAD FARMER PROFILE & STATS
     */
    async function loadFarmerProfile() {
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Defensive ID Check - prevents "null" errors
                const nameEl = document.getElementById('display-name');
                const emailEl = document.getElementById('display-email');
                const scanEl = document.getElementById('stat-scans');
                const locEl = document.getElementById('stat-location');

                if (nameEl) nameEl.textContent = data.full_name || 'Farmer';
                if (emailEl) emailEl.textContent = data.email || '--';
                
                if (data.stats && scanEl) {
                    scanEl.textContent = data.stats.totalScans || 0;
                }
                
                if (locEl) locEl.textContent = data.location || 'Unknown';

                // Populate Form Fields
                if (document.getElementById('profile-name')) document.getElementById('profile-name').value = data.full_name || '';
                if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = data.phone || '';
                if (document.getElementById('profile-location')) document.getElementById('profile-location').value = data.location || '';
                if (document.getElementById('profile-crops')) document.getElementById('profile-crops').value = data.crops || '';
                if (document.getElementById('profile-bio')) document.getElementById('profile-bio').value = data.bio || '';

                // Handle Avatar vs Initials
                if (data.avatar_url && avatarPreview) {
                    avatarPreview.src = data.avatar_url;
                    avatarPreview.style.display = 'block';
                    if (profileInitials) profileInitials.style.display = 'none';
                } else if (profileInitials) {
                    const nameString = data.full_name || "Farmer User";
                    const names = nameString.trim().split(/\s+/);
                    const firstInitial = names[0] ? names[0][0] : '?';
                    const lastInitial = (names.length > 1) ? names[names.length - 1][0] : '';
                    
                    profileInitials.textContent = (firstInitial + lastInitial).toUpperCase();
                    profileInitials.style.display = 'flex';
                    if (avatarPreview) avatarPreview.style.display = 'none';
                }
            }
        } catch (err) {
            console.error("Profile Load Error:", err);
        }
    }

    loadFarmerProfile();

    /**
     * 2. HANDLE PROFILE UPDATE
     */
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            updateBtn.disabled = true;
            const originalBtnText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

            const formData = new FormData();
            formData.append('fullName', document.getElementById('profile-name').value);
            formData.append('phone', document.getElementById('profile-phone').value);
            formData.append('location', document.getElementById('profile-location').value);
            formData.append('crops', document.getElementById('profile-crops').value);
            formData.append('bio', document.getElementById('profile-bio').value);
            
            const fileInput = document.getElementById('avatar-input');
            if (fileInput.files[0]) {
                formData.append('avatar', fileInput.files[0]);
            }

            try {
                const res = await fetch('/api/auth/profile/update', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    alert("Profile updated!");
                    location.reload();
                } else {
                    alert("Update failed.");
                }
            } catch (err) {
                console.error("Update Error:", err);
            } finally {
                updateBtn.disabled = false;
                updateBtn.innerHTML = originalBtnText;
            }
        });
    }
});

/**
 * 3. INSTANT IMAGE PREVIEW (Safe Global Function)
 */
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('avatar-preview');
            const initials = document.getElementById('profile-initials');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (initials) initials.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}