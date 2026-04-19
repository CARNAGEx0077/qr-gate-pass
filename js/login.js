/* TKSCT Gate Pass — Login Logic */
(function () {
  'use strict';

  // Auth Guard: If already logged in, skip to dashboard
  if (localStorage.getItem('tksct_token')) {
    window.location.href = 'dashboard.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailGroup = document.getElementById('emailGroup');
    const passwordGroup = document.getElementById('passwordGroup');
    const passwordToggle = document.getElementById('passwordToggle');
    const loginBtn = document.getElementById('loginBtn');

    if (!loginForm) return;

    /* ── Password Toggle ── */
    passwordToggle.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      passwordToggle.classList.toggle('active', isPassword);
      passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });

    /* ── Validation ── */
    function validateEmail(value) {
      if (!value.trim()) return false;
      if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return value.trim().length >= 3;
    }

    function validatePassword(value) {
      return value.length >= 6;
    }

    function setFieldState(group, isValid, message) {
      if (!group) return;
      group.classList.remove('error', 'success');
      if (isValid === true) group.classList.add('success');
      if (isValid === false) {
        group.classList.add('error');
        const errSpan = group.querySelector('.error-message span');
        if (errSpan && message) errSpan.textContent = message;
      }
    }

    emailInput.addEventListener('blur', function () {
      if (this.value.trim()) setFieldState(emailGroup, validateEmail(this.value));
    });

    passwordInput.addEventListener('blur', function () {
      if (this.value.trim()) setFieldState(passwordGroup, validatePassword(this.value));
    });

    emailInput.addEventListener('focus', () => emailGroup.classList.remove('error'));
    passwordInput.addEventListener('focus', () => passwordGroup.classList.remove('error'));

    /* ── UI Helpers ── */
    function setBtnLoading() {
      loginBtn.disabled = true;
      loginBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" class="spinner">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
        Signing in…
      `;
    }

    function setBtnSuccess() {
      loginBtn.style.background = '#22C55E';
      loginBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Success!
      `;
    }

    function setBtnError() {
      loginBtn.disabled = false;
      loginBtn.style.background = '';
      loginBtn.innerHTML = `
        Sign In
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      `;
    }

    /* ── Form Logic ── */
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const emailValid = validateEmail(emailInput.value);
      const passwordValid = validatePassword(passwordInput.value);

      setFieldState(emailGroup, emailValid, 'Please enter a valid email or username.');
      setFieldState(passwordGroup, passwordValid, 'Password must be at least 6 characters.');

      if (!emailValid) { emailInput.focus(); return; }
      if (!passwordValid) { passwordInput.focus(); return; }

      setBtnLoading();

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passwordInput.value,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setBtnError();
          if (response.status === 422 && data.errors) {
            const emailErr = data.errors.find(e => e.path === 'email');
            const passErr = data.errors.find(e => e.path === 'password');
            if (emailErr) setFieldState(emailGroup, false, emailErr.msg);
            if (passErr) setFieldState(passwordGroup, false, passErr.msg);
          } else {
            setFieldState(emailGroup, false, data.message || 'Login failed. Please try again.');
          }
          return;
        }

        localStorage.setItem('tksct_token', data.token);
        localStorage.setItem('tksct_user', JSON.stringify(data.user));
        setBtnSuccess();

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);

      } catch (err) {
        setBtnError();
        setFieldState(emailGroup, false, 'Cannot connect to server. Is the backend running?');
      }
    });
  });
})();
