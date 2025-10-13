/* ==========================================
⭐ Grip & Review - Homepage Rating Loader v1.0
Menampilkan rating bintang otomatis di homepage
========================================== */
(function() {
  const API_URL = "https://gripandreview-backend.kangadoelcakep.workers.dev";

  // Tambah animasi CSS ringan
  const style = document.createElement("style");
  style.textContent = `
    .rating {
      opacity: 0;
      transition: opacity .5s ease;
    }
    .rating.loaded {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  async function init() {
    const items = document.querySelectorAll(".difficulty.meta-info");

    if (!items.length) {
      console.warn("⚠️ Tidak ada elemen rating di homepage.");
      return;
    }

    for (const el of items) {
      const link = el.closest("article")?.querySelector("a")?.getAttribute("href");
      if (!link) continue;

      // Normalisasi URL artikel
      const path = link.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "");
      const ratingBox = el.querySelector(".rating");

      try {
        const res = await fetch(`${API_URL}?action=get_stats&postUrl=${encodeURIComponent(path)}`);
        const data = await res.json();

        if (!data.total || data.total === 0) {
          ratingBox.innerHTML = `<span style="color:#aaa;">Belum ada</span>`;
          ratingBox.classList.add("loaded");
          continue;
        }

        const avg = parseFloat(data.average || 0).toFixed(1);
        const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));

        ratingBox.innerHTML = `
          <span style="color:#6a4ee9;font-weight:600;">${stars}</span>
          <span style="font-size:0.9em;color:#555;">(${avg})</span>
        `;
        ratingBox.classList.add("loaded");
      } catch (err) {
        console.warn("⚠️ Gagal memuat rating:", err);
      }
    }
  }

  // Jalankan setelah DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
