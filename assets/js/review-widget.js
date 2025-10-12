/* ==========================================
 🧩 Grip & Review Widget — Stable v2.6
 + Timestamp Review
 + Batas Karakter Input
 + Realtime Counter untuk Ulasan
========================================== */
(function () {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const cacheEmail = localStorage.getItem("gr_email");
  const cacheName = localStorage.getItem("gr_name");

  /* -----------------------------
   🔧 CSS
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
    .review-item small { color: #888; display:block; margin-top:4px; font-size:0.85rem; }
    .review-form form { display: flex; flex-direction: column; gap: .6rem; margin-top: 1rem; }
    .review-form input, .review-form textarea, .review-form select {
      padding: .5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
    }
    .char-counter {
      text-align: right; font-size: 0.85rem; color: #888;
      margin-top: -4px; margin-bottom: 6px;
      transition: color .3s;
    }
    .review-form button {
      background: #f5a623; color: white; padding: .6rem; border: none;
      border-radius: 6px; font-weight: bold; cursor: pointer; transition: background .2s;
    }
    .review-form button:hover { background: #e5941f; }
    .star-rating { display: flex; gap: 4px; cursor: pointer; font-size: 1.4rem; }
    .star-rating span { color: #ccc; transition: color .2s; }
    .star-rating span.active { color: #f5a623; }
    /* 🔔 Toast */
    .toast {
      position: fixed; bottom: 20px; right: 20px;
      background: rgba(50,50,50,0.95); color: #fff;
      padding: 10px 16px; border-radius: 8px;
      font-size: 0.95rem; opacity: 0;
      transform: translateY(30px);
      transition: all .4s ease; z-index: 9999;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);

  /* -----------------------------
   🔔 TOAST
  ----------------------------- */
  function showToast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = "toast";
    if (type === "success") el.style.background = "#4caf50";
    if (type === "error") el.style.background = "#f44336";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 100);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 400);
    }, 3000);
  }

  /* -----------------------------
   ⚙️ INIT
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

    // Cek subscriber
    if (cacheEmail) {
      const verified = await validateSubscriber(cacheEmail);
      if (verified) renderReviewForm(wrap, cacheName, cacheEmail);
      else renderSubscribeForm(wrap);
    } else renderSubscribeForm(wrap);

    // Auto-refresh moderasi (30 detik)
    setInterval(async () => {
      await loadStats(wrap);
      await loadReviews(wrap);
    }, 30000);
  }

  async function validateSubscriber(email) {
    try {
      const res = await fetch(`${API_URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const d = await res.json();
      return d.state === "approved";
    } catch {
      return false;
    }
  }

  /* -----------------------------
   📊 STATS & REVIEWS
  ----------------------------- */
  async function loadStats(wrap) {
    try {
      const res = await fetch(`${API_URL}?action=get_stats&postUrl=${encodeURIComponent(postUrl)}`);
      const d = await res.json();
      if (!d.total) {
        wrap.querySelector(".review-summary").innerHTML = `<p>Belum ada rating.</p>`;
        return;
      }

      const stars = [5, 4, 3, 2, 1];
      const bars = stars.map(s => {
        const percent = d.total ? Math.round((d.count[s - 1] / d.total) * 100) : 0;
        return `
          <div class="star-row">
            <span>${s}★</span>
            <div class="bar"><div class="fill" style="width:${percent}%"></div></div>
            <span>${percent}%</span>
          </div>`;
      }).join("");

      wrap.querySelector(".review-summary").innerHTML = `
        <h3>⭐ ${d.average} / 5</h3>
        <small>${d.total} ulasan</small>
        <div class="rating-bars">${bars}</div>
      `;
    } catch (err) {
      console.error("Gagal load stats:", err);
    }
  }

  async function loadReviews(wrap) {
    try {
      const res = await fetch(`${API_URL}?action=list_reviews&postUrl=${encodeURIComponent(postUrl)}`);
      const all = await res.json();

      const reviews = all.filter(r =>
        (r.Visible === true || r.Visible === "TRUE") &&
        (r.Moderation === true || r.Moderation === "TRUE")
      );

      if (!reviews.length) {
        wrap.querySelector(".review-list").innerHTML = `<p>Belum ada ulasan terverifikasi.</p>`;
        return;
      }

      const fmtDate = d => {
        const t = new Date(d);
        return t.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      };

      wrap.querySelector(".review-list").innerHTML = reviews.map(r => `
        <div class="review-item">
          <strong>${r.Name}</strong> — <span>${"★".repeat(r.Rating)}</span>
          <p>${r.Review}</p>
          <small>${r.Marketplace} • ${r.Seller} • ${fmtDate(r.Timestamp)}</small>
        </div>
      `).join("");
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
        <input type="text" name="name" placeholder="Nama Anda" maxlength="40" required />
        <input type="email" name="email" placeholder="Email Anda" required />
        <button type="submit">Validasi Email</button>
      </form>
    `;

    const form = wrap.querySelector("#subscribeForm");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = { name: fd.get("name"), email: fd.get("email"), joinUrl: window.location.href };
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
          ${[1, 2, 3, 4, 5].map(v => `<span data-value="${v}">★</span>`).join("")}
        </div>
        <input type="hidden" name="rating" value="1" /> <!-- default -->
        <select name="marketplace" required>
          <option value="Tokopedia">Tokopedia</option>
          <option value="Shopee">Shopee</option>
          <option value="Lazada">Lazada</option>
          <option value="Tiktok">Tiktok</option>
          <option value="Offline" selected>Offline</option>
        </select>
        <input type="text" name="seller" placeholder="Nama seller" maxlength="40" required />
        <textarea name="review" placeholder="Tulis ulasan Anda (maks. 500 karakter)..." maxlength="500" required></textarea>
        <div class="char-counter">0 / 500</div>
        <button type="submit">Kirim Ulasan</button>
      </form>
    `;

    const form = wrap.querySelector("#reviewForm");
    const stars = form.querySelectorAll(".star-rating span");
    const ratingInput = form.querySelector("input[name=rating]");
    const textarea = form.querySelector("textarea[name=review]");
    const counter = form.querySelector(".char-counter");
    stars[0].classList.add("active");

    // ⭐ Rating selector
    stars.forEach(s =>
      s.addEventListener("click", () => {
        const v = parseInt(s.dataset.value);
        ratingInput.value = v;
        stars.forEach(x => x.classList.toggle("active", parseInt(x.dataset.value) <= v));
      })
    );

    // 🧮 Character counter
    textarea.addEventListener("input", () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / 500`;
      counter.style.color =
        len > 480 ? "#f44336" :
        len > 400 ? "#f5a623" : "#888";
    });

    // 📨 Submit
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
          stars[0].classList.add("active");
          counter.textContent = "0 / 500";
          counter.style.color = "#888";
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
