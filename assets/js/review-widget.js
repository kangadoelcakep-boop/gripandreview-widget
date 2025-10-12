/* ==========================================
 🧩 Grip & Review Widget — Stable v1.5
 Injected Rating + Review + Auto Stats
 backend url : pake worker 
========================================== */

(function () {
  const backendURL = "https://gripandreview-backend.kangadoelcakep.workers.dev";
  const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const cacheEmail = localStorage.getItem("reviewEmail");

  // Tambahkan CSS bawaan langsung ke <head>
  const style = document.createElement("style");
  style.textContent = `
    #review-widget { font-family: system-ui, sans-serif; margin: 2rem 0; }
    .review-summary { border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem; }
    .review-summary h3 { font-size: 1.8rem; margin: 0; color: #f5a623; }
    .review-summary small { color: #666; }
    .rating-bars { margin-top: .8rem; }
    .star-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: .9rem; }
    .star-row .bar { flex: 1; background: #eee; height: 8px; border-radius: 4px; overflow: hidden; }
    .star-row .fill { background: #f5a623; height: 100%; transition: width .4s ease; }
    .review-item { border-bottom: 1px solid #eee; padding: .6rem 0; }
    .review-item strong { color: #333; }
    .review-item span { color: #f5a623; font-size: .95rem; }
    .review-item p { margin: .3rem 0; color: #444; }
    .review-form { margin-top: 1.5rem; border-top: 2px solid #eee; padding-top: 1rem; }
    .review-form form { display: flex; flex-direction: column; gap: .6rem; }
    .review-form input, .review-form select, .review-form textarea {
      padding: .5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
    }
    .review-form button {
      background: #f5a623; color: white; padding: .6rem; border: none;
      border-radius: 6px; font-weight: bold; cursor: pointer; transition: background .2s;
    }
    .review-form button:hover { background: #e5941f; }
  `;
  document.head.appendChild(style);

  // Fungsi utama
  function tryInitWidget(retry = 0) {
    const wrap = document.getElementById("review-widget");
    if (!wrap) {
      if (retry < 10) {
        console.log("⏳ Menunggu elemen #review-widget muncul...");
        setTimeout(() => tryInitWidget(retry + 1), 500);
      } else {
        console.warn("⚠️ Elemen #review-widget tidak ditemukan setelah menunggu 5 detik.");
      }
      return;
    }

    console.log("✅ Review widget ditemukan, memuat konten...");
    initWidget(wrap);
  }

  async function initWidget(wrap) {
    wrap.innerHTML = `
      <div class="review-summary">Memuat ringkasan...</div>
      <div class="review-list">Memuat ulasan...</div>
      <div class="review-form">Memuat form...</div>
    `;

    await loadStats(wrap);
    await loadReviews(wrap);
    renderForm(wrap);
  }

  /* --- Load Stats --- */
  async function loadStats(wrap) {
    try {
      const res = await fetch(`${backendURL}?action=get_stats&postUrl=${encodeURIComponent(postUrl)}`);
      const data = await res.json();

      if (!data || !data.total) {
        wrap.querySelector(".review-summary").innerHTML = `<p>Belum ada rating untuk produk ini.</p>`;
        return;
      }

      const stars = [5, 4, 3, 2, 1];
      const bars = stars.map(s => {
        const percent = data.total ? Math.round((data.count[s - 1] / data.total) * 100) : 0;
        return `
          <div class="star-row">
            <span>${s} ★</span>
            <div class="bar"><div class="fill" style="width:${percent}%"></div></div>
            <span>${percent}%</span>
          </div>
        `;
      }).join("");

      wrap.querySelector(".review-summary").innerHTML = `
        <h3>⭐ ${data.average} / 5</h3>
        <small>${data.total} ulasan</small>
        <div class="rating-bars">${bars}</div>
      `;
    } catch (err) {
      console.error("Gagal load stats:", err);
      wrap.querySelector(".review-summary").innerHTML = `<p>Gagal memuat statistik.</p>`;
    }
  }

  /* --- Load Reviews --- */
  async function loadReviews(wrap) {
    try {
      const res = await fetch(`${backendURL}?action=list_reviews&postUrl=${encodeURIComponent(postUrl)}`);
      const reviews = await res.json();

      if (!reviews || !reviews.length) {
        wrap.querySelector(".review-list").innerHTML = `<p>Belum ada ulasan.</p>`;
        return;
      }

      const html = reviews.map(r => `
        <div class="review-item">
          <strong>${r.Name}</strong> — <span>${"★".repeat(r.Rating)}</span>
          <p>${r.Review}</p>
        </div>
      `).join("");

      wrap.querySelector(".review-list").innerHTML = html;
    } catch (err) {
      console.error("Gagal load review:", err);
      wrap.querySelector(".review-list").innerHTML = `<p>Gagal memuat ulasan.</p>`;
    }
  }

  /* --- Form Review --- */
  function renderForm(wrap) {
    const form = `
      <h4>Tulis Ulasan</h4>
      <form id="reviewForm">
        <label>Nama</label>
        <input type="text" name="name" required />
        <label>Rating</label>
        <select name="rating" required>
          <option value="">Pilih</option>
          <option>5</option><option>4</option><option>3</option>
          <option>2</option><option>1</option>
        </select>
        <label>Ulasan</label>
        <textarea name="review" required></textarea>
        <button type="submit">Kirim</button>
      </form>
    `;
    wrap.querySelector(".review-form").innerHTML = form;

    const formEl = wrap.querySelector("#reviewForm");
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(formEl);
      const body = {
        type: "submit_review",
        name: fd.get("name"),
        rating: fd.get("rating"),
        review: fd.get("review"),
        email: cacheEmail,
        postUrl
      };

      try {
        const res = await fetch(backendURL, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" }
        });
        const result = await res.json();

        if (result.status === "ok") {
          alert("✅ Ulasan berhasil dikirim!");
          formEl.reset();
          await loadStats(wrap);
          await loadReviews(wrap);
        } else {
          alert(result.message || "Gagal mengirim ulasan.");
        }
      } catch (err) {
        console.error("Gagal submit:", err);
        alert("Terjadi kesalahan koneksi.");
      }
    });
  }

  // Jalankan pengecekan otomatis sampai elemen tersedia
  tryInitWidget();
})();
