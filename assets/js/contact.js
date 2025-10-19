/* =====================================================
   Grip & Review — Contact Form Handler (Simplified)
   Version: 1.1.0
   Author: Grip & Review
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
  const MIN_SUBMIT_TIME = 2000; // ms (anti spam bot)
  const MAX_MESSAGE_LEN = 500;

  /* === MESSAGE COUNTER === */
  msg.addEventListener('input', () => {
    const len = msg.value.length;
    charCount.textContent = len;
    if (len > MAX_MESSAGE_LEN) {
      msg.value = msg.value.substring(0, MAX_MESSAGE_LEN);
    }
  });

  /* === TOAST FUNCTION === */
  function showToast(text, type = 'success') {
    toast.textContent = text;
    toast.className = `hk-toast show hk-${type}`;
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
   // === SANITIZER ===
function sanitize(str) {
  return str
    .replace(/[<>]/g, '')                // Hapus tanda < dan >
    .replace(/script/gi, '')             // Hapus kata "script"
    .replace(/javascript:/gi, '')        // Hapus "javascript:" URL
    .replace(/on\w+="[^"]*"/gi, '')      // Hapus event handler (onclick, onload, dll)
    .trim();
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

  /* === ANTI-SPAM TIMER === */
  const formStart = Date.now();

  /* === SUBMIT HANDLER === */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // 🧠 Honeypot (anti bot)
    if (honeypot.value !== '') return;

    // 🕒 Timing check
    if (Date.now() - formStart < MIN_SUBMIT_TIME) {
      showToast('Terlalu cepat, coba lagi.', 'error');
      return;
    }

    // ✅ Validate fields
    if (!validate()) {
      showToast('Mohon lengkapi form dengan benar.', 'error');
      return;
    }

    // 📦 Build payload
    const payload = {
     type: 'contact',
     name: sanitize(nameInput.value),
     email: sanitize(emailInput.value),
     subject: sanitize(subjectInput.value),
     message: sanitize(msg.value),
     source: window.location.hostname,
     origin: window.location.origin
   };


    // 🚀 Kirim
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Mengirim...';
    button.disabled = true;

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

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
