/* ==========================================
⭐ Grip & Review - Homepage Rating Loader v1.1
+ Auto-refresh 30s
+ Format tanggal tanpa jam
========================================== */
(function(){
  const API_URL="https://gripandreview-backend.kangadoelcakep.workers.dev";

  // ===== CSS animasi =====
  const style=document.createElement("style");
  style.textContent=`
    .rating{opacity:0;transition:opacity .5s ease;}
    .rating.loaded{opacity:1;}
    .meta time.meta-info{display:inline-flex;align-items:center;gap:4px;}
  `;
  document.head.appendChild(style);

  // ===== Helper tanggal =====
  function formatDate(dateStr){
    const d=new Date(dateStr);
    return d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  }

  // ===== Update tanggal (hapus jam) =====
  function fixDates(){
    document.querySelectorAll("time.meta-info[datetime]").forEach(el=>{
      const raw=el.getAttribute("datetime");
      if(raw){
        el.innerHTML=`<svg class="icon main-color small"><use xlink:href="#calendar-icon"></use></svg> ${formatDate(raw)}`;
      }
    });
  }

  // ===== Load rating homepage =====
  async function loadRatings(){
    const items=document.querySelectorAll(".difficulty.meta-info");
    if(!items.length)return console.warn("⚠️ Tidak ada elemen rating di homepage.");

    for(const el of items){
      const link=el.closest("article")?.querySelector("a")?.getAttribute("href");
      if(!link)continue;

      const path=link.replace(/^https?:\/\/[^/]+/,"").replace(/^\/+|\/+$/g,"");
      const ratingBox=el.querySelector(".rating");

      try{
        const res=await fetch(`${API_URL}?action=get_stats&postUrl=${encodeURIComponent(path)}`);
        const data=await res.json();

        if(!data.total||data.total===0){
          ratingBox.innerHTML=`<span style="color:#aaa;">Belum ada</span>`;
          ratingBox.classList.add("loaded");
          continue;
        }

        const avg=parseFloat(data.average||0).toFixed(1);
        const stars="★".repeat(Math.round(avg))+"☆".repeat(5-Math.round(avg));
        ratingBox.innerHTML=`<span style="color:#6a4ee9;font-weight:300;">${stars}</span> <span style="font-size:0.8em;color:#555;">(${avg})</span>`;
        ratingBox.classList.add("loaded");
      }catch(err){
        console.warn("⚠️ Gagal memuat rating:",err);
      }
    }
  }

  async function init(){
    fixDates();
    await loadRatings();
    setInterval(loadRatings,30000); // refresh tiap 30 detik
  }

  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();
