/* ============================================================
   REVIEW WIDGET – gripandreview.com
   Author: Grip & Review Team
   Versi: 1.0.0
   ============================================================ */

(function () {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const WIDGET_SELECTOR = "#review-widget";
  const EMAIL_KEY = "gripandreview_user_email";

  document.addEventListener("DOMContentLoaded", initWidget);

  // --- INIT ---
  function initWidget() {
    const wrap = document.querySelector(WIDGET_SELECTOR);
    if (!wrap) {
      console.warn("❌ Review widget container tidak ditemukan.");
      return;
    }

    // Inject HTML dasar
    wrap.innerHTML = `
      <style>
        .review-summary { margin-bottom: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 1rem; }
        .review-stars { color: #ffb400; font-size: 1.1rem; margin-bottom: .25rem; }
        .bar { background: #eee; border-radius: 3px; overflow: hidden; height: 6px; margin: 4px 0; }
        .bar-fill { background: #ffb400; height: 100%; }
        .review-item { border-bottom: 1px solid #eee; padding: .75rem 0; }
        .review-item:last-child { border-bottom: none; }
        .review-form { margin-top: 1rem; }
        .review-form input, .review-form textarea, .review-form select {
          width: 100%; padding: 8px; margin-bottom: 10px;
          border: 1px solid #ccc; border-radius: 4px;
        }
        .review-form button {
          background: #0078d7; color: white; border: none;
          padding: 10px 16px; border-radius: 4px; cursor: pointer;
        }
        .review-form button:hover { background: #005fa3; }
      </style>

      <div class="review-summary"></div>
      <div class="review-list"></div>
      <div class="review-form"></div>
    `;

    console.log("✅ Review widget ditemukan, memuat konten...");

    const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
    loadStats(wrap, postUrl);
    loadReviews(wrap, postUrl);
    renderForm(wrap, postUrl);
  }

  // --- LOAD SUMMARY ---
  async function loadStats(wrap, postUrl) {
    const summaryEl = wrap.querySelector(".review-summary");
    summaryEl.innerHTML = `<p>Memuat statistik...</p>`;

    try {
      const res = await fetch(`${API_URL}?action=list_reviews&postUrl=${encodeURIComponent(postUrl)}`);
      const reviews = await res.json();

      if (!reviews || !reviews.length) {
        summaryEl.innerHTML = `<p>Belum ada ulasan untuk produk ini.</p>`;
        return;
      }

      const avg = reviews.reduce((a, b) => a + Number(b.Rating), 0) / reviews.length;
      const starAvg = avg.toFixed(1);
      const counts = [5, 4, 3, 2, 1].map(star =>
        reviews.filter(r => Number(r.Rating) === star).length
      );

      const bars = counts
        .map((c, i) => {
          const percent = (c / reviews.length) * 100;
          return `
            <div>${5 - i} ★
              <div class="bar"><div class="bar-fill" style="width:${percent}%;"></div></div>
            </div>`;
        })
        .join("");

      summaryEl.innerHTML = `
        <div class="review-stars">${renderStars(starAvg)} <b>${starAvg}</b> dari ${reviews.length} ulasan</div>
        ${bars}
      `;
    } catch (err) {
      console.error("Gagal memuat statistik:", err);
      summaryEl.innerHTML = `<p>Gagal memuat data ulasan.</p>`;
    }
  }

  // --- LOAD REVIEWS ---
  async function loadReviews(wrap, postUrl) {
    const listEl = wrap.querySelector(".review-list");
    listEl.innerHTML = `<p>Memuat ulasan...</p>`;

    try {
      const res = await fetch(`${API_URL}?action=list_reviews&postUrl=${encodeURIComponent(postUrl)}`);
      const reviews = await res.json();

      if (!reviews || !reviews.length) {
        listEl.innerHTML = `<p>Belum ada ulasan.</p>`;
        return;
      }

      listEl.innerHTML = reviews
        .map(
          r => `
        <div class="review-item">
          <div class="review-stars">${renderStars(r.Rating)}</div>
          <p><strong>${r.Name}</strong> — ${r.Review}</p>
        </div>`
        )
        .join("");
    } catch (err) {
      console.error("Gagal memuat review:", err);
      listEl.innerHTML = `<p>Gagal memuat ulasan.</p>`;
    }
  }

  // --- FORM REVIEW ---
  function renderForm(wrap, postUrl) {
    const formEl = wrap.querySelector(".review-form");
    const cachedEmail = localStorage.getItem(EMAIL_KEY) || "";

    formEl.innerHTML = `
      <h3>Tulis Ulasan</h3>
      <form id="reviewForm">
        <input type="text" name="name" placeholder="Nama Anda" required />
        <input type="email" name="email" placeholder="Email Anda" value="${cachedEmail}" required />
        <select name="rating" required>
          <option value="">Pilih Rating</option>
          <option value="5">★★★★★ (5)</option>
          <option value="4">★★★★☆ (4)</option>
          <option value="3">★★★☆☆ (3)</option>
          <option value="2">★★☆☆☆ (2)</option>
          <option value="1">★☆☆☆☆ (1)</option>
        </select>
        <textarea name="review" placeholder="Tulis ulasan Anda..." required></textarea>
        <button type="submit">Kirim</button>
      </form>
    `;

    const form = formEl.querySelector("#reviewForm");
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const formData = Object.fromEntries(new FormData(form).entries());
      const body = {
        type: "submit_review",
        name: formData.name.trim(),
        email: formData.email.trim(),
        rating: formData.rating,
        review: formData.review.trim(),
        postUrl
      };

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" }
        });
        const result = await res.json();

        if (result.status === "ok") {
          alert("✅ Ulasan berhasil dikirim!");
          localStorage.setItem(EMAIL_KEY, formData.email.trim());
          form.reset();
          await loadStats(wrap, postUrl);
          await loadReviews(wrap, postUrl);
        } else {
          alert(result.message || "Gagal mengirim ulasan.");
        }
      } catch (err) {
        console.error("Gagal submit:", err);
        alert("Terjadi kesalahan koneksi.");
      }
    });
  }

  // --- RENDER STARS ---
  function renderStars(rating) {
    const full = "★".repeat(Math.round(rating));
    const empty = "☆".repeat(5 - Math.round(rating));
    return `<span class="review-stars">${full}${empty}</span>`;
  }
})();
