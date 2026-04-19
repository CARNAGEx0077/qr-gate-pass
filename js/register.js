/* TKSCT Gate Pass — Register Logic */
(function () {
  'use strict';

  // Auth Guard: If already logged in, skip to dashboard
  if (localStorage.getItem('tksct_token')) {
    window.location.href = 'dashboard.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');
    const passwordToggle = document.getElementById('passwordToggle');
    const registerBtn = document.getElementById('registerBtn');
    const apiError = document.getElementById('apiError');

    const usernameGroup = document.getElementById('usernameGroup');
    const emailGroup = document.getElementById('emailGroup');
    const passwordGroup = document.getElementById('passwordGroup');

    if (!registerForm) return;

    /* ── Password Toggle ── */
    passwordToggle.addEventListener('click', function () {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      passwordToggle.classList.toggle('active', isPass);
    });

    /* ── Validation ── */
    function setFieldState(group, valid, msg) {
      if (!group) return;
      group.classList.remove('error', 'success');
      if (valid === true) group.classList.add('success');
      if (valid === false) {
        group.classList.add('error');
        const span = group.querySelector('.error-message span');
        if (span && msg) span.textContent = msg;
      }
    }

    function validateUsername(v) { return v.trim().length >= 3; }
    function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
    function validatePassword(v) { return v.length >= 6 && /\d/.test(v); }

    usernameInput.addEventListener('blur', () => {
      if (usernameInput.value) setFieldState(usernameGroup, validateUsername(usernameInput.value));
    });
    emailInput.addEventListener('blur', () => {
      if (emailInput.value) setFieldState(emailGroup, validateEmail(emailInput.value));
    });
    passwordInput.addEventListener('blur', () => {
      if (passwordInput.value) setFieldState(passwordGroup, validatePassword(passwordInput.value));
    });

    usernameInput.addEventListener('focus', () => usernameGroup.classList.remove('error'));
    emailInput.addEventListener('focus', () => emailGroup.classList.remove('error'));
    passwordInput.addEventListener('focus', () => passwordGroup.classList.remove('error'));

    /* ── UI Helpers ── */
    function setBtnLoading() {
      registerBtn.disabled = true;
      registerBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" class="spinner">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
        Creating account…`;
    }
    function setBtnSuccess() {
      registerBtn.style.background = '#22C55E';
      registerBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg> Account Created!`;
    }
    function setBtnReset() {
      registerBtn.disabled = false;
      registerBtn.style.background = '';
      registerBtn.innerHTML = `Create Account
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>`;
    }

    /* ── Form Logic ── */
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      apiError.classList.remove('show');

      const unameOk = validateUsername(usernameInput.value);
      const emailOk = validateEmail(emailInput.value);
      const passOk  = validatePassword(passwordInput.value);

      setFieldState(usernameGroup, unameOk, 'Name must be at least 3 characters.');
      setFieldState(emailGroup, emailOk, 'Please enter a valid email address.');
      setFieldState(passwordGroup, passOk, 'Password: min 6 chars, must include a number.');

      if (!unameOk) { usernameInput.focus(); return; }
      if (!emailOk) { emailInput.focus(); return; }
      if (!passOk)  { passwordInput.focus(); return; }

      setBtnLoading();

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            role: roleSelect.value,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setBtnReset();
          if (res.status === 422 && data.errors) {
            data.errors.forEach(err => {
              if (err.path === 'username') setFieldState(usernameGroup, false, err.msg);
              if (err.path === 'email')    setFieldState(emailGroup, false, err.msg);
              if (err.path === 'password') setFieldState(passwordGroup, false, err.msg);
            });
          } else {
            apiError.textContent = data.message || 'Registration failed. Please try again.';
            apiError.classList.add('show');
          }
          return;
        }

        // Success
        localStorage.setItem('tksct_token', data.token);
        localStorage.setItem('tksct_user', JSON.stringify(data.user));
        setBtnSuccess();

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);

      } catch (err) {
        setBtnReset();
        apiError.textContent = 'Cannot connect to server. Is the backend running?';
        apiError.classList.add('show');
      }
    });
  });
})();
