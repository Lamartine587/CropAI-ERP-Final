/**
 * Navigation & Portal Loader
 * Handles dynamic sidebar injection, theme switching, and path resolution.
 */

async function loadSidebar() {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) return;

    try {
        // PATH FIX: Pointing to the location shown in your 'tree' output
        const response = await fetch('/includes/portal.html');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: Sidebar not found.`);
        
        const html = await response.text();
        placeholder.innerHTML = html;

        // Initialize UI after HTML is injected
        initSidebarUI();
        highlightActiveLink();
        
        // Handshake: Refresh button visibility for the new sidebar
        if (typeof updateAuthUI === 'function') updateAuthUI();
        
    } catch (err) {
        console.error("Navigation Load Error:", err);
        placeholder.innerHTML = `<div style="color:red; padding:20px;">${err.message}</div>`;
    }
}

function initSidebarUI() {
    const toggleBtn = document.getElementById('toggleBtn');   // Hamburger
    const mobileClose = document.getElementById('mobileClose'); // 'X' button
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const themeBtn = document.getElementById('themeToggle');

    // --- 1. THEME LOGIC (Changes Whole Website) ---
    const applyTheme = (theme) => {
        const icon = themeBtn?.querySelector('i');
        const themeText = themeBtn?.querySelector('.theme-text');

        if (theme === 'dark') {
            document.body.classList.add('dark-theme'); // This changes the global background
            if(icon) icon.className = 'fas fa-sun';
            if(themeText) themeText.textContent = 'Light Mode';
        } else {
            document.body.classList.remove('dark-theme');
            if(icon) icon.className = 'fas fa-moon';
            if(themeText) themeText.textContent = 'Dark Mode';
        }
    };

    applyTheme(localStorage.getItem('theme') || 'light');

    if (themeBtn) {
        themeBtn.onclick = () => {
            const newTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        };
    }

    // --- 2. SIDEBAR TOGGLE & MOBILE CLOSE ---
    const openSidebar = () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    };

    if (toggleBtn) toggleBtn.onclick = openSidebar;
    if (mobileClose) mobileClose.onclick = closeSidebar; // FIXED: Added 'X' click listener
    if (overlay) overlay.onclick = closeSidebar;

    // Desktop Toggle (Wide view)
    if (toggleBtn && window.innerWidth > 992) {
        toggleBtn.onclick = () => {
            sidebar.classList.toggle('closed');
            document.querySelector('.main-content')?.classList.toggle('wide');
        };
    }
}

function highlightActiveLink() {
    const page = window.location.pathname.split("/").pop();
    const navMap = {
        'dashboard.html': 'nav-dashboard',
        'history.html': 'nav-history',
        'hardware.html': 'nav-hardware',
        'info.html': 'nav-info'
    };
    
    const activeId = navMap[page];
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
}

loadSidebar();