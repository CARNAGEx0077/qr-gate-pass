/* TKSCT Gate Pass — Dashboard Logic */
(function () {
  'use strict';

  // Auth Guard: redirect to login if no token
  const token = localStorage.getItem('tksct_token');
  const userRaw = localStorage.getItem('tksct_user');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const avatarBtn = document.getElementById('avatarBtn');
    const userDropdown = document.getElementById('userDropdown');
    const dateEl = document.getElementById('currentDate');
    const logoutLink = document.getElementById('logoutLink');

    if (!avatarBtn) return;

    /* ── Initial UI Sync ── */
    let currentUser = null;
    try { currentUser = JSON.parse(userRaw); } catch (e) {}
    if (currentUser) populateUserUI(currentUser);

    /* ── Date ── */
    const now = new Date();
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    /* ── Avatar Dropdown ── */
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.remove('open');
    });

    /* ── Logout ── */
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('tksct_token');
      localStorage.removeItem('tksct_user');
      window.location.href = 'login.html';
    });

    /* ── Helpers ── */
    function populateUserUI(user) {
      const name = user.username || user.email || 'User';
      const initial = name.charAt(0).toUpperCase();
      const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

      const welcomeHighlight = document.querySelector('.welcome-text .highlight');
      if (welcomeHighlight) welcomeHighlight.textContent = name;

      const avatarInitials = document.querySelector('.avatar-initials');
      if (avatarInitials) avatarInitials.textContent = initial;

      const dropdownName = document.querySelector('.dropdown-name');
      const dropdownEmail = document.querySelector('.dropdown-email');
      if (dropdownName) dropdownName.textContent = `${name} (${role})`;
      if (dropdownEmail) dropdownEmail.textContent = user.email;
    }

    function animateCount(el, target) {
      let start = 0;
      const duration = 600;
      const step = target / (duration / 16);
      const interval = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = Math.floor(start);
        if (start >= target) clearInterval(interval);
      }, 16);
    }

    function formatTimeAgo(date) {
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
      const days = Math.floor(hrs / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    function renderActivity(activities) {
      const list = document.querySelector('.activity-list');
      if (!list) return;
      list.innerHTML = activities.map(a => {
        const dotClass = a.status === 'approved' ? 'activity-dot--green' : a.status === 'pending' ? 'activity-dot--amber' : 'activity-dot--red';
        const textClass = a.status === 'approved' ? 'text-green' : a.status === 'pending' ? 'text-amber' : 'text-red';
        const timeAgo = formatTimeAgo(new Date(a.timestamp));
        return `
          <div class="activity-item visible">
            <div class="activity-dot ${dotClass}"></div>
            <div class="activity-content">
              <span class="activity-text">Gate pass <strong>#${a.passId}</strong> was
                <strong class="${textClass}">${a.status}</strong></span>
              <span class="activity-time">${timeAgo}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    /* ── API Data fetch ── */
    async function loadDashboardData() {
      try {
        const res = await fetch(`${API_BASE}/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 401) {
          localStorage.removeItem('tksct_token');
          localStorage.removeItem('tksct_user');
          window.location.href = 'login.html';
          return;
        }

        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.data) {
          const { totalPasses, approved, pending, rejected, recentActivity } = data.data;
          const statEls = {
            total: document.querySelector('#statTotalPasses .stat-value'),
            approved: document.querySelector('#statApproved .stat-value'),
            pending: document.querySelector('#statPending .stat-value'),
            rejected: document.querySelector('#statRejected .stat-value'),
          };

          if (statEls.total) animateCount(statEls.total, totalPasses);
          if (statEls.approved) animateCount(statEls.approved, approved);
          if (statEls.pending) animateCount(statEls.pending, pending);
          if (statEls.rejected) animateCount(statEls.rejected, rejected);

          if (data.user) populateUserUI(data.user);
          if (recentActivity && recentActivity.length > 0) renderActivity(recentActivity);
        }
      } catch (err) {
        console.warn('Dashboard API unreachable. Showing cached data.', err);
      }
    }

    /* ── Entrance Animations ── */
    const animatedEls = document.querySelectorAll('.stat-card, .action-card, .activity-item');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    animatedEls.forEach(el => observer.observe(el));

    /* ── Execution ── */
    loadDashboardData();
  });
})();
