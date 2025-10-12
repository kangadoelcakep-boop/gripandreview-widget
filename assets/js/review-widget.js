// =============================
// 🧩 Grip & Review Widget v1.3
// =============================
(function () {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const container = document.getElementById("review-widget");
  if (!container) return;

  console.log("✅ Review widget ditemukan, memuat konten...");

  // =============================
  // Inject HTML ke dalam artikel
  // =============================
  container.innerHTML = `
    <style>
      .review-summary { text-align:center; margin-bottom:20px; }
      .review-summary h2 { font-size:2em; margin:0; color:var(--accent,#ff9800); }
      .rating-bars { margin:15px 0; }
      .rating-bar { display:flex; align-items:center; margin:5px 0; gap:5px; }
      .rating-bar span { width:30px; }
      .bar { flex:1; background:#eee; height:8px; border-radius:4px; overflow:hidden; }
      .bar-fill { height:8px; background:#ff9800; width:0%; transition:width .4s ease; border-radius:4px; }
      .percent { width:40px; text-align:right; font-size:.85em; color:#666; }

      .review-section { border-top:1px solid #eee; padding-top:15px; margin-top:15px; }
      .review-item { border-bottom:1px solid #eee; padding:10px 0; }
      .stars { color:#ff9800; font-size:1.1em; margin-bottom:4px; }
      .star-rating { cursor:pointer; margin:8px 0; }
      .star-rating span { font-size:1.4em; color:#ccc; transition:color .3s; }
      .star-rating span.active, .star-rating span:hover, .star-rating span:hover ~ span { color:#ff9800; }

      .review-form input, .review-form textarea, .review-form select {
        width:100%; padding:8px; margin-bottom:8px;
        border:1px solid #ddd; border-radius:6px;
      }
      .review-form button {
        background:#ff9800; border:none; color:white;
        padding:8px 15px; border-radius:6px; cursor:pointer;
      }
      .review-form button:hover { background:#f57c00; }
      #emailMsg, #reviewMsg { font-size:.9em; color:#555; margin-top:5px; }
    </style>

    <div class="review-summary">
      <h2 id="avgRating">0.0</h2>
      <p><span id="totalReviews">0</span> ulasan masuk</p>
    </div>

    <div class="rating-bars" id="ratingBars">
      ${[5,4,3,2,1].map(star => `
        <div class="rating-bar">
          <span>${star}★</span>
          <div class="bar"><div class="bar-fill" data-star="${star}"></div></div>
          <div class="percent" id="percent-${star}">0%</div>
        </div>`).join("")}
    </div>

    <div class="review-section">
      <h3>💬 Tulis Ulasan</h3>
      <form id="reviewForm" class="review-form">
        <input type="text" id="name" placeholder="Nama Anda" required />
        <input type="email" id="email" placeholder="Email Anda" required />
        <div class="star-rating" id="starRating">
          ${[1,2,3,4,5].map(v => `<span data-value="${v}">★</span>`).join("")}
        </div>
        <input type="hidden" id="rating" value="0" required />
        <textarea id="reviewText" placeholder="Tulis ulasan Anda..." required></textarea>
        <select id="marketplace">
          <option value="Tokopedia">Tokopedia</option>
          <option value="Shopee">Shopee</option>
          <option value="Lazada">Lazada</option>
          <option value="Tiktok">Tiktok</option>
          <option value="Offline">Offline</option>
        </select>
        <input type="text" id="seller" placeholder="Nama Seller / Toko" required />
        <button type="submit">Kirim Ulasan</button>
        <p id="reviewMsg"></p>
      </form>

      <div id="review-list"></div>
    </div>
  `;

  // Elemen penting
  const formEl = document.getElementById("reviewForm");
  const reviewMsg = document.getElementById("reviewMsg");
  const listEl = document.getElementById("review-list");
  const postUrl = window.location.href.replace(/https?:\/\//, "");
  const cachedEmail = localStorage.getItem("gr_email");
  const cachedName = localStorage.getItem("gr_name");

  // =============================
  // ⭐ Interaktif Rating Bintang
  // =============================
  document.querySelectorAll("#starRating span").forEach(star => {
    star.addEventListener("click", () => {
      const value = parseInt(star.dataset.value);
      document.getElementById("rating").value = value;
      document.querySelectorAll("#starRating span").forEach(s => {
        s.classList.toggle("active", parseInt(s.dataset.value) <= value);
      });
    });
  });

  // =============================
  // 🔁 Load Data Review & Summary
  // =============================
  async function loadStats() {
    try {
      const res = await fetch(`${API_URL}/stats?postUrl=${encodeURIComponent(postUrl)}`);
      const data = await res.json();
      document.getElementById("avgRating").textContent = data.average || 0;
      document.getElementById("totalReviews").textContent = data.total || 0;

      [5,4,3,2,1].forEach(star => {
        const count = data.count ? data.count[star - 1] : 0;
        const percent = data.total ? ((count / data.total) * 100).toFixed(0) : 0;
        document.querySelector(`.bar-fill[data-star="${star}"]`).style.width = percent + "%";
        document.getElementById(`percent-${star}`).textContent = percent + "%";
      });
    } catch (err) {
      console.warn("Gagal load stats:", err);
    }
  }

  async function loadReviews() {
    try {
      const res = await fetch(`${API_URL}/reviews?postUrl=${encodeURIComponent(postUrl)}`);
      const reviews = await res.json();

      if (!reviews.length) {
        listEl.innerHTML = "<p>Belum ada ulasan. Jadilah yang pertama!</p>";
        return;
      }

      listEl.innerHTML = reviews.map(r => `
        <div class="review-item">
          <strong>${r.Name}</strong>
          <div class="stars">${"★".repeat(r.Rating)}${"☆".repeat(5 - r.Rating)}</div>
          <p>${r.Review}</p>
          <small>${r.Marketplace} • ${r.Seller}</small>
        </div>
      `).join("");
    } catch (err) {
      console.error("Gagal load review:", err);
    }
  }

  // =============================
  // 🔓 Atur Visibility Form
  // =============================
  if (cachedEmail) {
    fetch(`${API_URL}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cachedEmail })
    })
      .then(r => r.json())
      .then(d => {
        if (d.state === "approved") {
          // Hide email & name kalau sudah terdaftar
          document.getElementById("email").style.display = "none";
          document.getElementById("name").style.display = "none";
        } else {
          localStorage.removeItem("gr_email");
        }
      });
  }

  // =============================
  // 📤 Kirim Review
  // =============================
  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    reviewMsg.textContent = "⏳ Mengirim ulasan...";

    const payload = {
      name: cachedName || document.getElementById("name").value.trim(),
      email: cachedEmail || document.getElementById("email").value.trim().toLowerCase(),
      rating: parseInt(document.getElementById("rating").value),
      text: document.getElementById("reviewText").value.trim(),
      marketplace: document.getElementById("marketplace").value,
      seller: document.getElementById("seller").value.trim(),
      postUrl
    };

    try {
      const res = await fetch(`${API_URL}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      reviewMsg.textContent = result.message || "Terjadi kesalahan.";
      if (result.status === "ok") {
        localStorage.setItem("gr_name", payload.name);
        localStorage.setItem("gr_email", payload.email);

        formEl.reset();
        document.querySelectorAll("#starRating span").forEach(s => s.classList.remove("active"));
        await loadStats();
        await loadReviews();
      }
    } catch (err) {
      reviewMsg.textContent = "⚠️ Gagal mengirim ulasan. Periksa koneksi.";
      console.error(err);
    }
  });

  // =============================
  // 🚀 Jalankan Awal
  // =============================
  loadStats();
  loadReviews();
})();
