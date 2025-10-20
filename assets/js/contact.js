/* =====================================================
   Grip & Review — Contact Form Handler (Enhanced v1.2.0)
   + Ambil IP Publik via ipify (fallback)
   + Auto geo (via Cloudflare header)
   + Aman dari injeksi
   ===================================================== */

(() => {
  const form = document.getElementById('hk-contact-form');
  const toast = document.getElementById('hk-toast');
  const msg = document.getElementById('hk-message');
  const charCount = document.getElementById('hk-char-count');
  const nameInput = document.getElementById('hk-name');
  const emailInput = document.getElementById('hk-email');
  const subjectInput = document.getElementById('hk-subject');
  const honeypot = document.getElementById('hk-robot-check');

  /* === CONFIG === */
  const BACKEND_URL = "https://gripandreview-contact.kangadoelcakep.workers.dev";
  const MIN_SUBMIT_TIME = 2000;
  const MAX_MESSAGE_LEN = 500;

  /* === COUNTER === */
  msg.addEventListener('input', () => {
    const len = msg.value.length;
    charCount.textContent = len;
    if (len > MAX_MESSAGE_LEN) {
      msg.value = msg.value.substring(0, MAX_MESSAGE_LEN);
    }
  });

  /* === TOAST === */
  function showToast(text, type = 'success') {
    toast.textContent = text;
    toast.className = `hk-toast show hk-${type}`;
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  /* === SANITIZER === */
  function sanitizeFrontend(s = '') {
    return String(s || '')
      .replace(/[<>]/g, '')
      .replace(/`/g, '')
      .replace(/["']/g, '')
      .replace(/\\/g, '')
      .replace(/;/g, '')
      .replace(/script/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/\$\{.*?\}/g, '')
      .trim()
      .substring(0, 1000);
  }

  /* === VALIDATION === */
  function validate() {
    let valid = true;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const fields = [
      { el: nameInput, id: 'hk-name-error', cond: v => v.trim() !== '' },
      { el: emailInput, id: 'hk-email-error', cond: v => emailPattern.test(v) },
      { el: subjectInput, id: 'hk-subject-error', cond: v => v.trim() !== '' },
      { el: msg, id: 'hk-message-error', cond: v => v.trim() !== '' }
    ];
    fields.forEach(f => {
      const err = document.getElementById(f.id);
      if (!f.cond(f.el.value)) {
        err.style.display = 'block';
        valid = false;
      } else {
        err.style.display = 'none';
      }
    });
    return valid;
  }

  /* === DAPATKAN IP PUBLIK === */
  async function fetchClientIp(timeout = 2500) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) return null;
      const data = await res.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }

  const formStart = Date.now();

  /* === SUBMIT === */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (honeypot.value !== '') return;

    if (Date.now() - formStart < MIN_SUBMIT_TIME) {
      showToast('Terlalu cepat, coba lagi.', 'error');
      return;
    }

    if (!validate()) {
      showToast('Mohon lengkapi form dengan benar.', 'error');
      return;
    }

    // ⏳ Ubah tombol
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Mengirim...';
    button.disabled = true;

    // 🌍 Ambil IP publik (fallback jika header CF kosong)
    const clientIp = await fetchClientIp();

    // 📦 Payload lengkap
    const payload = {
      type: 'contact',
      name: sanitizeFrontend(nameInput.value),
      email: sanitizeFrontend(emailInput.value),
      subject: sanitizeFrontend(subjectInput.value),
      message: sanitizeFrontend(msg.value),
      origin: window.location.origin,
      source: window.location.hostname,
      client_ip: clientIp, // dikirim ke Worker
      ua: navigator.userAgent,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({ status: 'error', message: 'Invalid response' }));

      if (data.status === 'success') {
        form.reset();
        showToast('Pesan berhasil dikirim 🎉', 'success');
      } else {
        showToast(data.message || 'Gagal mengirim pesan.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  });
})();
