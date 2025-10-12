/* ============================================================
   REVIEW WIDGET – gripandreview.com
   Author: Grip & Review Team
   Versi: 1.0.0
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const backendURL =
    "https://script.google.com/macros/s/AKfycbwjJQ69NNajRuYS2_w2mZlK7zY3CHs1pbY2vJvOisRtmMZSwEZJIPcn9u4djtUCe1HqPg/exec";
  const wrap = document.querySelector(".review-widget");
  if (!wrap) return console.warn("⚠️ Review widget tidak ditemukan.");

  wrap.innerHTML = `
    <div class="review-summary"></div>
    <div class="review-list"></div>
    <div class="review-form"></div>
  `;

  console.log("✅ Review widget ditemukan, memuat konten...");
  loadStats();
  loadReviews();
  setupForm();

  /* ------------------------------------------------------------
     1️⃣  LOAD SUMMARY STATS
  ------------------------------------------------------------ */
  async function loadStats() {
    try {
      const url = `${backendURL}?action=list_reviews&postUrl=${encodeURIComponent(
        window.location.pathname.replace(/^\/+|\/+$/g, "")
      )}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        wrap.querySelector(".review-summary").innerHTML = `<p>Belum ada ulasan.</p>`;
        return;
      }

      const ratings = data.map(r => Number(r.Rating) || 0);
      const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);

      const counts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: ratings.filter(r => r === star).length
      }));

      const total = ratings.length;
      const bars = counts
        .map(c => {
          const percent = ((c.count / total) * 100).toFixed(1);
          return `
            <div class="bar-row">
              <span>${c.star} ★</span>
              <div class="bar"><div style="width:${percent}%"></div></div>
              <span>${c.count}</span>
            </div>`;
        })
        .join("");

      wrap.querySelector(".review-summary").innerHTML = `
        <div class="summary-box">
          <div class="avg">${avg}<small>/5</small></div>
          <div class="stars">${"★".repeat(Math.round(avg))}</div>
          <div class="total">${total} ulasan</div>
        </div>
        <div class="bar-wrap">${bars}</div>
      `;
    } catch (err) {
      console.error("Gagal memuat statistik:", err);
    }
  }

  /* ------------------------------------------------------------
     2️⃣  LOAD REVIEW LIST
  ------------------------------------------------------------ */
  async function loadReviews() {
    try {
      const url = `${backendURL}?action=list_reviews&postUrl=${encodeURIComponent(
        window.location.pathname.replace(/^\/+|\/+$/g, "")
      )}`;
      const res = await fetch(url);
      const data = await res.json();

      const list = wrap.querySelector(".review-list");
      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = `<p>Belum ada ulasan, jadilah yang pertama!</p>`;
        return;
      }

      list.innerHTML = data
        .map(
          r => `
        <div class="review-item">
          <div class="r-header">
            <strong>${r.Name}</strong>
            <span class="stars">${"★".repeat(r.Rating)}</span>
          </div>
          <p>${r.Review}</p>
        </div>`
        )
        .join("");
    } catch (err) {
      console.error("Gagal memuat ulasan:", err);
    }
  }

  /* ------------------------------------------------------------
     3️⃣  SETUP REVIEW FORM
  ------------------------------------------------------------ */
  function setupForm() {
    const formBox = wrap.querySelector(".review-form");
    const savedEmail = localStorage.getItem("gr_email");
    const savedName = localStorage.getItem("gr_name");

    // Form HTML
    formBox.innerHTML = `
      <h3>Tulis Ulasan Anda</h3>
      <form id="grForm">
        <input type="text" id="grName" placeholder="Nama Anda" value="${savedName || ""}" required />
        <input type="email" id="grEmail" placeholder="Email Anda" value="${savedEmail || ""}" required />
        <select id="grRating" required>
          <option value="">Pilih Rating</option>
          <option value="5">5 ★ Sangat Puas</option>
          <option value="4">4 ★ Puas</option>
          <option value="3">3 ★ Cukup</option>
          <option value="2">2 ★ Kurang</option>
          <option value="1">1 ★ Buruk</option>
        </select>
        <textarea id="grReview" rows="4" placeholder="Tulis ulasan..." required></textarea>
        <button type="submit">Kirim Ulasan</button>
      </form>
    `;

    const form = formBox.querySelector("#grForm");

    form.addEventListener("submit", async e => {
      e.preventDefault();

      const name = form.querySelector("#grName").value.trim();
      const email = form.querySelector("#grEmail").value.trim().toLowerCase();
      const rating = form.querySelector("#grRating").value;
      const review = form.querySelector("#grReview").value.trim();

      if (!name || !email || !rating || !review) {
        alert("Harap isi semua kolom terlebih dahulu.");
        return;
      }

      localStorage.setItem("gr_email", email);
      localStorage.setItem("gr_name", name);

      const body = {
        type: "submitReview",
        name,
        email,
        rating,
        review,
        postUrl: window.location.pathname.replace(/^\/+|\/+$/g, "")
      };

      try {
        const res = await fetch(backendURL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await res.json();

        if (result.status === "ok") {
          alert("✅ Ulasan berhasil dikirim!");
          form.reset();
          await loadStats();
          await loadReviews();
        } else {
          alert(result.message || "Gagal mengirim ulasan.");
        }
      } catch (err) {
        console.error("Gagal submit:", err);
        alert("Terjadi kesalahan koneksi.");
      }
    });
  }

  /* ------------------------------------------------------------
     4️⃣  TAMBAHKAN CSS BAWAAN
  ------------------------------------------------------------ */
  const style = document.createElement("style");
  style.textContent = `
    .review-summary { border-bottom:1px solid #ddd; margin-bottom:1rem; padding-bottom:1rem; }
    .summary-box { display:flex; align-items:center; gap:1rem; }
    .summary-box .avg { font-size:2.5rem; font-weight:bold; }
    .summary-box .stars { color:#ffb400; font-size:1.5rem; }
    .summary-box .total { color:#555; }
    .bar-wrap .bar-row { display:flex; align-items:center; gap:0.5rem; font-size:0.9rem; }
    .bar-wrap .bar { flex:1; background:#eee; height:8px; border-radius:4px; overflow:hidden; }
    .bar-wrap .bar div { background:#ffb400; height:100%; }
    .review-item { border-bottom:1px solid #eee; padding:0.75rem 0; }
    .r-header { display:flex; justify-content:space-between; align-items:center; }
    .r-header .stars { color:#ffb400; }
    .review-form { margin-top:1.5rem; }
    .review-form input, .review-form select, .review-form textarea {
      width:100%; margin-bottom:0.5rem; padding:0.5rem;
      border:1px solid #ccc; border-radius:6px;
    }
    .review-form button {
      background:#007bff; color:white; padding:0.6rem 1rem;
      border:none; border-radius:6px; cursor:pointer;
    }
    .review-form button:hover { background:#0069d9; }
  `;
  document.head.appendChild(style);
});
