// =============================
// 🧩 Grip & Review Widget v1.1
// =============================

(function() {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const container = document.getElementById("review-widget");
  if (!container) return;

  // =============================
  // Inject HTML ke dalam artikel
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

  const emailForm = document.getElementById("subscribeForm");
  const reviewForm = document.getElementById("reviewForm");
  const emailMsg = document.getElementById("emailMsg");
  const reviewMsg = document.getElementById("reviewMsg");
  const postUrl = window.location.href;
  const cachedEmail = localStorage.getItem("gr_email");
  const savedName = localStorage.getItem("gr_name");

  // =============================
  // ⭐ Render Bintang
  // =============================
  function renderStars() {
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
  }

  // =============================
  // 🔓 Tampilkan form review
  // =============================
  function showReviewForm() {
    emailForm.style.display = "none";
    reviewForm.style.display = "block";
    if (savedName) {
      document.getElementById("name").value = savedName;
      document.getElementById("name").style.display = "none";
    }
  }

  // =============================
  // 📊 Update Ringkasan Rating
  // =============================
  function updateSummary(reviews) {
    if (!reviews.length) return;

    const avg = (reviews.reduce((sum, r) => sum + Number(r.Rating), 0) / reviews.length).toFixed(1);
    document.getElementById("avgRating").textContent = avg;
    document.getElementById("totalReviews").textContent = reviews.length;

    const counts = [5, 4, 3, 2, 1].map(s => reviews.filter(r => r.Rating == s).length);
    const total = reviews.length;

    counts.forEach((count, i) => {
      const star = 5 - i;
      const percent = ((count / total) * 100).toFixed(0) + "%";
      document.querySelector(`.bar-fill[data-star="${star}"]`).style.width = percent;
      document.getElementById(`percent-${star}`).textContent = percent;
    });
  }

  // =============================
  // 💬 Render Daftar Review
  // =============================
  function renderReviews(reviews) {
    const list = document.getElementById("review-list");
    if (!reviews.length) {
      list.innerHTML = "<p>Belum ada ulasan. Jadilah yang pertama mengulas produk ini!</p>";
      updateSummary([]);
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
    updateSummary(reviews);
  }

  // =============================
  // 🔁 Load Review dari backend
  // =============================
  async function loadReviews() {
    try {
      const res = await fetch(`${API_URL}?action=list_reviews&url=${encodeURIComponent(postUrl)}`);
      const data = await res.json();
      renderReviews(data || []);
    } catch (err) {
      console.error("Gagal memuat review:", err);
    }
  }

  // =============================
  // Cek status email saat load
  // =============================
  if (cachedEmail) {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "check", email: cachedEmail })
    })
      .then(res => res.json())
      .then(d => {
        if (d.state === "approved") showReviewForm();
        else localStorage.removeItem("gr_email");
      });
  }

  // =============================
  // Validasi Email
  // =============================
  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("emailInput").value.trim().toLowerCase();
    const joinUrl = window.location.href;
    emailMsg.textContent = "⏳ Memvalidasi email...";

    const check = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "check", email })
    }).then(r => r.json());

    if (check.state === "approved") {
      localStorage.setItem("gr_email", email);
      emailMsg.textContent = "✅ Email sudah terverifikasi!";
      showReviewForm();
      return;
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "subscribe", email, joinUrl })
    }).then(r => r.json());

    emailMsg.textContent = res.message || "⚠️ Terjadi kesalahan.";
  });

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

    const payload = {
      type: "review",
      name,
      email,
      rating,
      text,
      marketplace,
      seller,
      postUrl: encodeURIComponent(postUrl)
    };

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
  renderStars();
  loadReviews();

})();
