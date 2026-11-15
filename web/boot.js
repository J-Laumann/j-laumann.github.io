(function () {
  var on = false;
  try { on = sessionStorage.getItem("emberheim-gm") === "1"; } catch (e) {}
  if (!on && window.name.indexOf("emberheim-gm") !== -1) on = true;
  if (on) document.documentElement.classList.add("gm");
})();
