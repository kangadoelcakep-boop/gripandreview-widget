/* ==========================================
 🧩 Grip & Review Widget — Stable v2.3
 Real-time Moderation + Toast + Full Marketplace Field
========================================== */
(function () {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const cacheEmail = localStorage.getItem("gr_email");
  const cacheName = localStorage.getItem("gr_name");

  /* -----------------------------
   🔧 CSS STYLING
  ----------------------------- */
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
    .review-item strong { color: #333; }
    .review-item span { color: #f5a623; }
    .review-form form { display: flex; flex-direction: column; gap: .6rem; margin-top: 1rem; }
    .review-form input, .review-form textarea, .review-form select {
      padding: .5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
    }
    .review-form button {
      background: #f5a623; color: white; padding: .6rem; border: none;
      border-radius: 6px; font-weight: bold; cursor: pointer; transition: background .2s;
    }
    .review-form button:hover { background: #e5941f; }
    .star-rating { display: flex; gap: 4px; cursor: pointer; font-size: 1.4rem; }
    .star-rating span { color: #ccc; transition: color .2s; }
    .star-rating span.active { color: #f5a623; }
    /* 🔔 Toast Notification */
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(50, 50, 50, 0.95);
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.4s ease;
      z-index: 9999;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  /* -----------------------------
   🔔 TOAST
  ----------------------------- */
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast";
    if (type === "success") toast.style.background = "#4caf50";
    if (type === "error") toast.style.background = "#f44336";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  /* -----------------------------
   ⚙️ INIT WIDGET
  ----------------------------- */
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

    if (cacheEmail) {
      const verified = await validateSubscriber(cacheEmail);
      if (verified) renderReviewForm(wrap, cacheName, cacheEmail);
      else renderSubscribeForm(wrap);
    } else {
      renderSubscribeForm(wrap);
    }

    // auto-refresh setiap 30 detik (cek moderasi baru)
    setInterval(async () => {
      await loadStats(wrap);
      await loadReviews(wrap);
    }, 30000);
  }

  /* -----------------------------
   🔍 CEK SUBSCRIBER
  ----------------------------- */
  async function validateSubscriber(email) {
    try {
      const res = await fetch(`${API_URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return data.state === "approved";
    } catch {
      return false;
    }
  }

  /* -----------------------------
   📊 LOAD STATS & REVIEWS
  ----------------------------- */
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
    } catch (err) {
      console.error("Gagal load stats:", err);
    }
  }

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
          <strong>${r.Name}</strong> — <span>${"★".repeat(r.Rating)}</span>
          <p>${r.Review}</p>
          <small>${r.Marketplace} • ${r.Seller}</small>
        </div>`).join("");

      wrap.querySelector(".review-list").innerHTML = html;
    } catch (err) {
      console.error("Gagal load review:", err);
    }
  }

  /* -----------------------------
   ✉️ SUBSCRIBE FORM
  ----------------------------- */
  function renderSubscribeForm(wrap) {
    wrap.querySelector(".review-form").innerHTML = `
      <h4>Validasi Email Sebelum Review</h4>
      <form id="subscribeForm">
        <input type="text" name="name" placeholder="Nama Anda" required />
        <input type="email" name="email" placeholder="Email Anda" required />
        <button type="submit">Validasi Email</button>
      </form>
    `;

    const form = wrap.querySelector("#subscribeForm");

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        name: fd.get("name"),
        email: fd.get("email"),
        joinUrl: window.location.href
      };
      showToast("⏳ Memproses validasi...", "info");

      try {
        const res = await fetch(`${API_URL}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        showToast(result.message || "Terjadi kesalahan.", result.status === "subscribed" ? "success" : "error");

        if (result.status === "subscribed") {
          localStorage.setItem("gr_email", data.email);
          localStorage.setItem("gr_name", data.name);
        }
      } catch {
        showToast("❌ Gagal koneksi ke server.", "error");
      }
    });
  }

  /* -----------------------------
   🧾 REVIEW FORM
  ----------------------------- */
  function renderReviewForm(wrap, name, email) {
    wrap.querySelector(".review-form").innerHTML = `
      <h4>Tulis Ulasan</h4>
      <form id="reviewForm">
        <div class="star-rating">
          ${[1,2,3,4,5].map(v => `<span data-value="${v}">★</span>`).join("")}
        </div>
        <input type="hidden" name="rating" value="0" />
        <select name="marketplace" required>
          <option value="Tokopedia">Tokopedia</option>
          <option value="Shopee">Shopee</option>
          <option value="Lazada">Lazada</option>
          <option value="Tiktok">Tiktok</option>
          <option value="Offline" selected>Offline</option>
        </select>
        <input type="text" name="seller" placeholder="Nama seller" required />
        <textarea name="review" placeholder="Tulis ulasan Anda..." required></textarea>
        <button type="submit">Kirim Ulasan</button>
      </form>
    `;

    const form = wrap.querySelector("#reviewForm");
    const stars = form.querySelectorAll(".star-rating span");
    const ratingInput = form.querySelector("input[name=rating]");

    stars.forEach(s =>
      s.addEventListener("click", () => {
        const val = parseInt(s.dataset.value);
        ratingInput.value = val;
        stars.forEach(x => x.classList.toggle("active", parseInt(x.dataset.value) <= val));
      })
    );

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = {
        name,
        email,
        rating: fd.get("rating"),
        text: fd.get("review"),
        marketplace: fd.get("marketplace"),
        seller: fd.get("seller"),
        postUrl
      };

      showToast("⏳ Mengirim ulasan...", "info");
      try {
        const res = await fetch(`${API_URL}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await res.json();
        showToast(result.message || "Gagal mengirim.", result.status === "ok" ? "success" : "error");

        if (result.status === "ok") {
          form.reset();
          stars.forEach(x => x.classList.remove("active"));
          await loadStats(wrap);
          await loadReviews(wrap);
        }
      } catch {
        showToast("❌ Gagal koneksi ke server.", "error");
      }
    });
  }

  init();
})();
