// =============================
// 🧩 Grip & Review Widget v2.1
// =============================
document.addEventListener("DOMContentLoaded", async () => {
  const backendURL = "https://script.google.com/macros/s/AKfycbwjJQ69NNajRuYS2_w2mZlK7zY3CHs1pbY2vJvOisRtmMZSwEZJIPcn9u4djtUCe1HqPg/exec";
  const postUrl = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const cacheEmail = localStorage.getItem("reviewEmail");

  const wrap = document.getElementById("review-widget");
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="review-summary"></div>
    <div class="review-list"></div>
    <div class="review-form"></div>
  `;

  /* --- Load Stats --- */
  async function loadStats() {
    const res = await fetch(`${backendURL}?action=get_stats&postUrl=${encodeURIComponent(postUrl)}`);
    const data = await res.json();
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
  }

  /* --- Load Reviews --- */
  async function loadReviews() {
    const res = await fetch(`${backendURL}?action=list_reviews&postUrl=${encodeURIComponent(postUrl)}`);
    const reviews = await res.json();

    if (!reviews.length) {
      wrap.querySelector(".review-list").innerHTML = "<p>Belum ada ulasan.</p>";
      return;
    }

    const html = reviews.map(r => `
      <div class="review-item">
        <strong>${r.Name}</strong> — <span>${"★".repeat(r.Rating)}</span>
        <p>${r.Review}</p>
      </div>
    `).join("");

    wrap.querySelector(".review-list").innerHTML = html;
  }

  /* --- Form Review --- */
  function renderForm() {
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

    const formEl = document.getElementById("reviewForm");
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

      const res = await fetch(backendURL, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      });

      const result = await res.json();
      if (result.status === "ok") {
        alert("Ulasan berhasil dikirim!");
        formEl.reset();
        await loadStats();
        await loadReviews();
      } else {
        alert(result.message || "Gagal mengirim ulasan.");
      }
    });
  }

  /* --- Inisialisasi --- */
  await loadStats();
  await loadReviews();
  renderForm();
});

