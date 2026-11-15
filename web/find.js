(function () {
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bind() {
    const input = document.querySelector("#find");
    const box = document.querySelector("#found");
    if (!input || !box || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      const gm = document.documentElement.classList.contains("gm");
      const hits = (window.EMBERHEIM_SEARCH || [])
        .filter((item) => item.t.toLowerCase().includes(q) && (gm || !item.g))
        .slice(0, 14);
      box.hidden = false;
      box.innerHTML = hits.length
        ? hits.map((hit) => `<a href="${esc(hit.u)}">${esc(hit.t)}<small>${esc(hit.p)}</small></a>`).join("")
        : "<p>Nothing under that name.</p>";
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".find")) box.hidden = true;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
  document.addEventListener("emberheim-ready", bind);
})();
