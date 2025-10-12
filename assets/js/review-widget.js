/* ============================================================
 🧩 Grip & Review Widget — Final Stable v2.7
✅ Integrasi Proxy Worker + Auto Moderasi Refresh + Rating Header/Sidebar
============================================================ */
(function () {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const cacheEmail = localStorage.getItem("gr_email") || null;
  const cacheName = localStorage.getItem("gr_name") || "";

  // =============================
  // 💅 CSS Inline
  // =============================
  const style = document.createElement("style");
  style.textContent = `
    #review-widget { font-family: system-ui, sans-serif; margin: 2rem 0; }
    .review-summary h3 { font-size: 1.8rem; color: #f5a623; margin: 0; }
    .review-summary small { color: #666; }
    .rating-bars { margin: 1rem 0; }
    .star-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .bar { flex: 1; background: #eee; height: 8px; border-radius: 4px; overflow: hidden; }
    .fill { background: #f5a623; height: 100%; transition: width .4s ease; }
    .review-item { border-bottom: 1px solid #eee; padding: .6rem 0; }
    .review-item strong { color: #333; display:block; }
    .review-item span { color: #f5a623; }
    .review-item small { color: #999; font-size: .85rem; }
    .review-form form { display: flex; flex-direction: column; gap: .6rem; margin-top: 1rem; }
    .review-form input, .review-form textarea, .review-form select {
      padding: .5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
    }
    .review-form button {
      background: #f5a623; color: white; padding: .6rem; border: none;
      border-radius: 6px; font-weight: bold; cursor: pointer; transition: background .2s;
    }
    .review-form button:hover { background: #e5941f; }

    .toast {
      position: fixed; bottom: 20px; right: 20px;
      background: #333; color: #fff; padding: 10px 16px;
      border-radius: 6px; opacity: 0; transform: translateY(20px);
      transition: all 0.4s ease; z-index: 9999;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .char-counter { font-size: 0.85rem; color: #888; text-align: right; margin-top: -6px; }
  `;
  document.head.appendChild(style);

  // =============================
  // 🚀 Init
  // =============================
  async function init() {
    const wrap = document.getElementById("review-widget");
    if (!wrap) return console.warn("⚠️ #review-widget tidak ditemukan.");

    wrap.innerHTML = `
      <div class="review-summary"></div>
      <div class="review-list"></div>
      <div class="review-form"></div>
    `;

    await loadStats(wrap);
    await loadReviews(wrap);
    renderForm(wrap);

    // Auto refresh moderasi tiap 30 detik
    setInterval(() => loadReviews(wrap), 30000);
  }

  // =============================
  // 📊 Summary Rating
  // =============================
  async function loadStats(wrap) {
    try {
      const res = await fetch(`${API_URL}?action=get_stats&postUrl=${encodeURIComponent(postUrl)}`);
      const data = await res.json();
      if (!data.total) {
        wrap.querySelector(".review-summary").innerHTML = `<p>Belum ada rating.</p>`;
        return;
      }

      const stars = [5, 4, 3, 2, 1];
      const bars = stars.map(s => {
        const percent = data.total ? Math.round((data.count[s - 1] / data.total) * 100) : 0;
        return `
          <div class="star-row">
            <span>${s}★</span>
            <div class="bar"><div class="fill" style="width:${percent}%"></div></div>
            <span>${percent}%</span>
          </div>`;
      }).join("");

      wrap.querySelector(".review-summary").innerHTML = `
        <h3>⭐ ${data.average} / 5</h3>
        <small>${data.total} ulasan</small>
        <div class="rating-bars">${bars}</div>
      `;

      // 🟡 Sinkronkan ke header dan sidebar
      updateGlobalRating(data);
    } catch (err) {
      console.error("Gagal load stats:", err);
    }
  }

  // =============================
  // 💬 Review List
  // =============================
  async function loadReviews(wrap) {
    try {
      const res = await fetch(`${API_URL}?action=list_reviews&postUrl=${encodeURIComponent(postUrl)}`);
      const reviews = await res.json();
      if (!reviews.length) {
        wrap.querySelector(".review-list").innerHTML = `<p>Belum ada ulasan.</p>`;
        return;
      }

      const html = reviews.map(r => `
        <div class="review-item">
          <strong>${r.Name}</strong>
          <span>${"★".repeat(r.Rating)}</span>
          <p>${r.Review}</p>
          <small>${r.Marketplace} • ${r.Seller} • ${new Date(r.Timestamp).toLocaleString("id-ID")}</small>
        </div>`).join("");
      wrap.querySelector(".review-list").innerHTML = html;
    } catch (err) {
      console.error("Gagal load review:", err);
    }
  }

  // =============================
  // ✍️ Form Review
  // =============================
  function renderForm(wrap) {
    const formHTML = `
      <h4>Tulis Ulasan</h4>
      <form id="reviewForm">
        <input type="text" name="name" placeholder="Nama Anda" maxlength="50" value="${cacheName}" required />
        <div class="star-select">${[1,2,3,4,5].map(s => `<span data-star="${s}">★</span>`).join("")}</div>
        <input type="hidden" name="rating" value="1" />
        <select name="marketplace" required>
          <option value="Tokopedia">Tokopedia</option>
          <option value="Shopee">Shopee</option>
          <option value="Lazada">Lazada</option>
          <option value="Tiktok">Tiktok</option>
          <option value="Offline">Offline</option>
        </select>
        <input type="text" name="seller" placeholder="Nama seller" maxlength="50" required />
        <textarea name="review" placeholder="Tulis ulasan Anda..." maxlength="500" required></textarea>
        <div class="char-counter" id="charCount">0 / 500</div>
        <button type="submit">Kirim Ulasan</button>
      </form>
    `;
    wrap.querySelector(".review-form").innerHTML = formHTML;

    const form = wrap.querySelector("#reviewForm");
    const stars = form.querySelectorAll(".star-select span");
    const ratingInput = form.querySelector('input[name="rating"]');
    const reviewInput = form.querySelector('textarea[name="review"]');
    const charCount = form.querySelector("#charCount");

    // ⭐ Interaksi rating
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const val = star.dataset.star;
        ratingInput.value = val;
        stars.forEach(s => s.classList.toggle("active", s.dataset.star <= val));
      });
    });
    stars[0].classList.add("active");

    // 🔤 Counter karakter ulasan
    reviewInput.addEventListener("input", () => {
      const len = reviewInput.value.length;
      charCount.textContent = `${len} / 500`;
      charCount.style.color = len > 480 ? "red" : "#888";
    });

    // 📤 Submit Review
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = {
        type: "review",
        name: fd.get("name"),
        email: cacheEmail,
        rating: fd.get("rating"),
        text: fd.get("review"),
        marketplace: fd.get("marketplace"),
        seller: fd.get("seller"),
        postUrl
      };

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await res.json();
        showToast(result.message || "Gagal mengirim ulasan.");

        if (result.status === "ok") {
          localStorage.setItem("gr_name", fd.get("name"));
          form.reset();
          ratingInput.value = "1";
          stars.forEach((s, i) => s.classList.toggle("active", i === 0));
          charCount.textContent = "0 / 500";
          await loadStats(wrap);
          await loadReviews(wrap);
        }
      } catch (err) {
        showToast("❌ Gagal koneksi ke server.");
      }
    });
  }

  // =============================
  // 🔔 Toast Notifikasi
  // =============================
  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"), 50);
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 400);
    }, 3000);
  }

  // =============================
  // 🌟 Update Rating di Header dan Sidebar
  // =============================
  function updateGlobalRating(data) {
    const avg = parseFloat(data.average || 0).toFixed(1);
    const total = data.total || 0;
    const rounded = Math.round(avg);
    const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

    const main = document.getElementById("product-rating");
    if (main) {
      main.innerHTML = `${stars} (${avg}/5) • ${total} Reviews •`;
    }

    const side = document.getElementById("sidebar-rating");
    if (side) {
      side.innerHTML = `
        ${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}
      `;
    }
  }

  // Jalankan
  init();
})();
