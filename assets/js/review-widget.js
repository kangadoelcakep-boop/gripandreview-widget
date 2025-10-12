/* ==========================================
 🧩 Grip & Review Widget — Final Stable v2.0
 Integrasi langsung dengan Proxy Worker
========================================== */
(function () {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const cacheEmail = localStorage.getItem("gr_email") || null;
  const cacheName = localStorage.getItem("gr_name") || "";

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
  `;
  document.head.appendChild(style);

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
  }

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
        </div>`).join("");
      wrap.querySelector(".review-list").innerHTML = html;
    } catch (err) {
      console.error("Gagal load review:", err);
    }
  }

  function renderForm(wrap) {
    const formHTML = `
      <h4>Tulis Ulasan</h4>
      <form id="reviewForm">
        <input type="text" name="name" placeholder="Nama Anda" value="${cacheName}" required />
        <select name="rating" required>
          <option value="">Pilih Rating</option>
          ${[5,4,3,2,1].map(s => `<option value="${s}">${s}</option>`).join("")}
        </select>
        <textarea name="review" placeholder="Tulis ulasan Anda..." required></textarea>
        <button type="submit">Kirim Ulasan</button>
      </form>
    `;
    wrap.querySelector(".review-form").innerHTML = formHTML;

    const form = wrap.querySelector("#reviewForm");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = {
        type: "review",
        name: fd.get("name"),
        email: cacheEmail,
        rating: fd.get("rating"),
        text: fd.get("review"),
        marketplace: "Offline",
        seller: "-",
        postUrl
      };

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await res.json();
        alert(result.message || "Gagal mengirim ulasan.");

        if (result.status === "ok") {
          localStorage.setItem("gr_name", fd.get("name"));
          await loadStats(wrap);
          await loadReviews(wrap);
        }
      } catch (err) {
        alert("❌ Gagal koneksi ke server.");
      }
    });
  }

  init();
})();
