(function () {
  var STORE = "emberheim-sections";
  var known = {
    locations: 1,
    groups: 1,
    campaigns: 1,
    people: 1,
    reference: 1,
    services: 1,
    items: 1,
    open: 1
  };

  function folder() {
    var file = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    return known[file] ? file : "root";
  }

  function readState() {
    try {
      var stored = localStorage.getItem(STORE);
      if (stored) return JSON.parse(stored) || {};
    } catch (error) {
      /* this page may not share storage; window.name still covers the tab */
    }
    var match = window.name.match(/emberheim-sections:(\S+)/);
    if (!match) return {};
    try {
      return JSON.parse(decodeURIComponent(match[1])) || {};
    } catch (error) {
      return {};
    }
  }

  function writeState(state) {
    var json = JSON.stringify(state);
    try {
      localStorage.setItem(STORE, json);
    } catch (error) {
      /* file pages can refuse storage */
    }
    var token = "emberheim-sections:" + encodeURIComponent(json);
    if (window.name.indexOf("emberheim-sections:") === -1) {
      window.name = (window.name + " " + token).trim();
    } else {
      window.name = window.name.replace(/emberheim-sections:\S+/, token);
    }
  }

  var state = readState();
  var area = folder();
  var bound = new WeakSet();
  var accept = false;
  function arm() { accept = true; }
  window.addEventListener("pointerdown", arm, { capture: true, once: true });
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(arm, 0);
  });

  function keyFor(details) {
    var names = [];
    var node = details;
    while (node && node.tagName === "DETAILS") {
      var summary = node.querySelector(":scope > summary");
      names.unshift(summary ? summary.textContent.replace(/\s+/g, " ").trim() : "");
      node = node.parentElement ? node.parentElement.closest("details") : null;
    }
    return area + "\n" + names.join("\n");
  }

  function bind(details) {
    if (bound.has(details)) return;
    bound.add(details);
    var key = keyFor(details);
    if (Object.prototype.hasOwnProperty.call(state, key)) details.open = !!state[key];
    details.addEventListener("toggle", function () {
      if (!accept) return;
      state[key] = details.open;
      writeState(state);
    });
  }

  function scan() {
    var aside = document.querySelector("aside.sections");
    if (!aside) return;
    var list = aside.querySelectorAll("details");
    for (var i = 0; i < list.length; i++) bind(list[i]);
  }

  var observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
