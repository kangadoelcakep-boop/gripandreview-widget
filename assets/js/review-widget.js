/* =========================================================
 *  REVIEW WIDGET FRONTEND — gripandreview.com
 *  Versi: 1.0 (Readable, non-minified)
 *  Tujuan: Menyediakan sistem review + verifikasi email otomatis
 *  Ditempatkan 1x di footer agar aktif di semua artikel
 * ========================================================= */

(function () {
  "use strict";

  // --- KONFIGURASI DASAR ---
  const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwjJQ69NNajRuYS2_w2mZlK7zY3CHs1pbY2vJvOisRtmMZSwEZJIPcn9u4djtUCe1HqPg/exec";
  const CONTAINER_ID = "review-widget"; // id elemen target di artikel
  const widgetContainer = document.getElementById(CONTAINER_ID);

  if (!widgetContainer) return; // jika tidak ada kontainer, hentikan script

  // --- FUNGSI UTILITAS ---
  function htmlToElement(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  function showMessage(text, type = "info") {
    const msg = document.createElement("div");
    msg.className = `rw-msg ${type}`;
    msg.textContent = text;
    widgetContainer.querySelector(".rw-messages").appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
  }

  async function postData(payload) {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  }

  // --- TEMPLATE HTML ---
  const templateHTML = `
    <div class="rw-card">
      <h3>💬 Tinggalkan Review</h3>
      <div class="rw-messages"></div>

      <!-- LANGKAH 1: Validasi Email -->
      <div class="rw-step rw-step-email">
        <label>Masukkan Email Anda:</label>
        <input type="email" id="rw-email" placeholder="contoh@email.com" required>
        <button id="rw-validate">Validasi Email</button>
      </div>

      <!-- LANGKAH 2: Form Review (disembunyikan dulu) -->
      <div class="rw-step rw-step-review" style="display:none;">
        <label>Nama Anda:</label>
        <input type="text" id="rw-name" placeholder="Nama Anda">

        <label>Rating:</label>
        <select id="rw-rating">
          <option value="5">⭐⭐⭐⭐⭐</option>
          <option value="4">⭐⭐⭐⭐</option>
          <option value="3">⭐⭐⭐</option>
          <option value="2">⭐⭐</option>
          <option value="1">⭐</option>
        </select>

        <label>Ulasan Anda:</label>
        <textarea id="rw-comment" placeholder="Tulis ulasan Anda di sini..."></textarea>
        <button id="rw-submit">Kirim Review</button>
      </div>
    </div>
  `;

  widgetContainer.appendChild(htmlToElement(templateHTML));

  // --- EVENT HANDLER: Validasi Email ---
  const btnValidate = widgetContainer.querySelector("#rw-validate");
  const inputEmail = widgetContainer.querySelector("#rw-email");

  btnValidate.addEventListener("click", async () => {
    const email = inputEmail.value.trim().toLowerCase();
    if (!email) return showMessage("Masukkan email terlebih dahulu.", "warn");

    showMessage("Memeriksa status email...");
    try {
      const res = await postData({ type: "checkEmail", email });
      if (res.status === "ok") {
        showMessage("Email sudah terverifikasi ✅");
        showReviewForm();
      } else if (res.status === "pending") {
        showMessage("Email belum dikonfirmasi. Cek inbox Anda.", "warn");
      } else {
        showMessage("Email belum terdaftar. Mengirim link verifikasi...");
        const reg = await postData({ type: "subscribe", email });
        if (reg.status === "ok") {
          showMessage("Link verifikasi sudah dikirim ke email Anda.");
        } else {
          showMessage("Gagal mengirim link verifikasi.", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showMessage("Terjadi kesalahan jaringan.", "error");
    }
  });

  // --- EVENT HANDLER: Kirim Review ---
  const btnSubmit = widgetContainer.querySelector("#rw-submit");
  btnSubmit.addEventListener("click", async () => {
    const name = widgetContainer.querySelector("#rw-name").value.trim();
    const rating = widgetContainer.querySelector("#rw-rating").value;
    const comment = widgetContainer.querySelector("#rw-comment").value.trim();
    const email = inputEmail.value.trim().toLowerCase();

    if (!name || !comment) return showMessage("Isi nama dan komentar.", "warn");

    try {
      const res = await postData({
        type: "submitReview",
        email,
        name,
        rating,
        comment,
        pageUrl: window.location.href,
      });

      if (res.status === "ok") {
        showMessage("Terima kasih! Review Anda sudah dikirim ✅", "success");
        btnSubmit.disabled = true;
      } else {
        showMessage("Gagal mengirim review.", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Terjadi kesalahan jaringan.", "error");
    }
  });

  // --- TAMPILKAN FORM REVIEW ---
  function showReviewForm() {
    widgetContainer.querySelector(".rw-step-email").style.display = "none";
    widgetContainer.querySelector(".rw-step-review").style.display = "block";
  }

  // --- CSS INLINE OTOMATIS (bisa dipisah ke file CSS juga) ---
  const style = document.createElement("style");
  style.textContent = `
    .rw-card { 
      border: 1px solid #ddd; padding: 1rem; border-radius: 12px; 
      background: #fafafa; max-width: 480px; margin: 1rem auto; 
      font-family: system-ui; box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    .rw-card h3 { margin-top: 0; }
    .rw-step { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .rw-step input, .rw-step textarea, .rw-step select {
      padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem;
    }
    .rw-step button {
      background: #007bff; color: white; border: none; border-radius: 8px;
      padding: 0.6rem 1rem; cursor: pointer; font-weight: 500;
    }
    .rw-step button:hover { background: #0056b3; }
    .rw-msg { margin-top: 0.5rem; padding: 0.5rem 0.8rem; border-radius: 6px; font-size: 0.85rem; }
    .rw-msg.info { background: #e7f3ff; color: #004085; }
    .rw-msg.warn { background: #fff3cd; color: #856404; }
    .rw-msg.error { background: #f8d7da; color: #721c24; }
    .rw-msg.success { background: #d4edda; color: #155724; }
  `;
  document.head.appendChild(style);
})();
