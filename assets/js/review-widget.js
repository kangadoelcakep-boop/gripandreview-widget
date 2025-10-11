// =============================
// 🧩 Grip & Review Widget v2.0
// =============================
(function() {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const container = document.getElementById("review-widget");
  if (!container) return;

  // =============================
  // Inject HTML
  // =============================
  container.innerHTML = `
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
      <h2>💬 Tulis Ulasan</h2>

      <form id="subscribeForm">
        <input type="email" id="emailInput" placeholder="Masukkan email Anda" required />
        <button type="submit">Validasi Email</button>
        <p id="emailMsg"></p>
      </form>

      <form id="reviewForm" style="display:none;">
        <input type="text" id="name" placeholder="Nama Anda" required />
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
        <input type="text" id="seller" placeholder="Nama seller" required />
        <button type="submit">Kirim Ulasan</button>
        <p id="reviewMsg"></p>
      </form>

      <div id="review-list"></div>
    </div>
  `;

  const postUrl = window.location.href;
  const emailForm = document.getElementById("subscribeForm");
  const reviewForm = document.getElementById("reviewForm");
  const emailMsg = document.getElementById("emailMsg");
  const reviewMsg = document.getElementById("reviewMsg");
  const cachedEmail = localStorage.getItem("gr_email");
  const savedName = localStorage.getItem("gr_name");

  // =============================
  // ⭐ Render Bintang Input
  // =============================
  document.querySelectorAll("#starRating span").forEach(star => {
    star.addEventListener("click", () => {
      const value = star.dataset.value;
      document.getElementById("rating").value = value;
      document.querySelectorAll("#starRating span").forEach(s => s.classList.remove("active"));
      for (let i = 0; i < value; i++) {
        document.querySelectorAll("#starRating span")[i].classList.add("active");
      }
    });
  });

  // =============================
  // 📊 Update Ringkasan Rating
  // =============================
  async function updateSummary() {
    try {
      const res = await fetch(`${API_URL}?action=get_summary&url=${encodeURIComponent(postUrl)}`);
      const data = await res.json();
      document.getElementById("avgRating").textContent = data.avg || "0.0";
      document.getElementById("totalReviews").textContent = data.total || "0";
    } catch (err) {
      console.error("Gagal memuat summary:", err);
    }
  }

  // =============================
  // 💬 Render Daftar Review
  // =============================
  function renderReviews(reviews) {
    const list = document.getElementById("review-list");
    if (!reviews.length) {
      list.innerHTML = "<p>Belum ada ulasan. Jadilah yang pertama mengulas produk ini!</p>";
      return;
    }
    const html = reviews.map(r => `
      <div class="review-item">
        <strong>${r.Name}</strong>
        <div class="stars">${"★".repeat(r.Rating)}${"☆".repeat(5 - r.Rating)}</div>
        <p>${r.Review}</p>
        <small>${r.Marketplace} • ${r.Seller}</small>
      </div>
    `).join("");
    list.innerHTML = html;
  }

  // =============================
  // 🔁 Load Review
  // =============================
  async function loadReviews() {
    try {
      const res = await fetch(`${API_URL}?action=list_reviews&url=${encodeURIComponent(postUrl)}`);
      const data = await res.json();
      renderReviews(data || []);
      updateSummary();
    } catch (err) {
      console.error("Gagal memuat review:", err);
    }
  }

  // =============================
  // Kirim Review
  // =============================
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = localStorage.getItem("gr_email");
    const rating = parseInt(document.getElementById("rating").value);
    const text = document.getElementById("reviewText").value.trim();
    const marketplace = document.getElementById("marketplace").value;
    const seller = document.getElementById("seller").value;

    const payload = { type: "review", name, email, rating, text, marketplace, seller, postUrl };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    reviewMsg.textContent = res.message;
    if (res.status === "ok") {
      localStorage.setItem("gr_name", name);
      document.getElementById("reviewText").value = "";
      document.getElementById("rating").value = "0";
      document.querySelectorAll("#starRating span").forEach(s => s.classList.remove("active"));
      loadReviews();
    }
  });

  // =============================
  // Jalankan fungsi awal
  // =============================
  loadReviews();
})();
