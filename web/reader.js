(function () {
  const TOKEN_KEY = "emberheim-github-pat";
  const TABS = [
    ["index.html", "Home", false],
    ["locations.html", "Locations", false],
    ["groups.html", "Factions", false],
    ["campaigns.html", "Campaigns", true],
    ["people.html", "People", false],
    ["reference.html", "Reference", false],
    ["services.html", "Shared Services", false],
    ["items.html", "Magic Items", true],
    ["open.html", "Still open", true]
  ];
  const SECTION = window.EMBERHEIM_SECTION;
  const app = document.querySelector("#app");
  if (!SECTION || !app) return;

  let anchors = {};
  let editing = false;
  let snapshot = "";
  let showing = "";
  let busy = false;
  let pending = null;
  let afterShow = null;

  const article = document.createElement("article");
  article.id = "article";
  const aside = document.createElement("aside");
  aside.id = "sections";
  aside.className = "sections";
  const tools = document.createElement("div");
  tools.className = "gm-tools";
  tools.innerHTML = [
    '<button type="button" id="edit-start">Edit</button>',
    '<button type="button" id="edit-gm" hidden>GM note</button>',
    '<button type="button" id="edit-save" hidden>Save</button>',
    '<button type="button" id="edit-cancel" hidden>Cancel</button>',
    '<button type="button" id="add-page">Add page</button>',
    '<button type="button" id="add-category">Add category</button>',
    '<button type="button" id="token-forget">Forget token</button>',
    '<p id="edit-status"></p>',
    '<form class="token-form" id="token-form" hidden>',
    "<p>Paste a GitHub token so a save updates the site for everyone. It stays in this browser. On GitHub, create a fine-grained token for this repository only, with Contents set to read and write.</p>",
    '<p><a id="token-link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a token</a></p>',
    '<label for="gh-token">GitHub token</label>',
    '<input id="gh-token" type="password" autocomplete="off" spellcheck="false">',
    '<button type="submit">Keep this token</button>',
    "</form>",
    '<form class="add-form" id="add-form" hidden>',
    '<p id="add-heading"></p>',
    '<label for="add-title">Name</label>',
    '<input id="add-title" type="text" autocomplete="off">',
    '<label for="add-where">Put it in</label>',
    '<select id="add-where"></select>',
    '<label class="checks"><input id="add-gm" type="checkbox"> GM only</label>',
    '<button type="submit">Create</button>',
    "</form>"
  ].join("");

  function renderShell() {
    const header = document.createElement("header");
    header.className = "top";
    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = "index.html";
    brand.textContent = "Emberheim";
    const nav = document.createElement("nav");
    nav.className = "tabs";
    TABS.forEach(([href, label, gm]) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      if (gm) link.className = "gm-nav";
      if (href === SECTION.id + ".html") link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    });
    const find = document.createElement("div");
    find.className = "find";
    find.innerHTML = '<input id="find" type="search" placeholder="Find a place, person, or item" autocomplete="off"><div id="found" hidden></div>';
    const slot = document.createElement("div");
    slot.className = "gm-slot";
    slot.innerHTML = [
      '<button type="button" class="gm-lock" id="gm-lock" aria-pressed="false" aria-label="Unlock GM notes" title="Unlock GM notes">',
      '<svg class="when-locked" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V7zm7 12H7v-8h10v8z"/></svg>',
      '<svg class="when-open" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-6V7a2 2 0 1 1 4 0h2a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm0 10H7v-8h10v8z"/></svg>',
      "</button>",
      '<form class="gm-gate" id="gm-gate" hidden>',
      '<label for="gm-pass">GM password</label>',
      '<input id="gm-pass" type="password" autocomplete="off" spellcheck="false">',
      '<p id="gm-error" hidden>Wrong password.</p>',
      "<button type=\"submit\">Unlock</button>",
      "</form>"
    ].join("");
    header.append(brand, nav, find, slot);
    const layout = document.createElement("div");
    layout.className = "layout";
    layout.id = "layout";
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.append(tools, article);
    layout.append(aside, sheet);
    app.replaceChildren(header, layout);
    document.dispatchEvent(new Event("emberheim-ready"));
  }

  function hashNow() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return "";
    try { return decodeURIComponent(raw); }
    catch (error) { return raw; }
  }

  function rebuildAnchors() {
    anchors = {};
    Object.keys(SECTION.pages).forEach((id) => {
      const box = document.createElement("div");
      box.innerHTML = SECTION.pages[id].html;
      box.querySelectorAll("[id]").forEach((el) => {
        if (!SECTION.pages[el.id]) anchors[el.id] = id;
      });
    });
  }

  function renderLeaf(node) {
    if (node.kind === "label") {
      const span = document.createElement("span");
      span.className = "label " + (node.depth || "d1");
      if (node.gm) span.classList.add("gm-block");
      span.textContent = node.title;
      return span;
    }
    const link = document.createElement("a");
    link.className = node.depth || "d1";
    if (node.gm) link.classList.add("gm-block");
    link.href = node.href || "#";
    link.textContent = node.title;
    if (node.page) link.dataset.page = node.page;
    if (node.anchor) link.dataset.anchor = node.anchor;
    return link;
  }

  function renderGroup(node) {
    const details = document.createElement("details");
    if (node.open) details.open = true;
    if (node.gm) details.classList.add("gm-block");
    const summary = document.createElement("summary");
    if (node.href) {
      const link = document.createElement("a");
      link.href = node.href;
      link.textContent = node.title;
      if (node.page) link.dataset.page = node.page;
      if (node.anchor) link.dataset.anchor = node.anchor;
      summary.appendChild(link);
    } else {
      summary.textContent = node.title;
    }
    const nav = document.createElement("nav");
    nav.className = "side";
    (node.children || []).forEach((child) => {
      nav.appendChild(child.kind === "group" ? renderGroup(child) : renderLeaf(child));
    });
    details.append(summary, nav);
    return details;
  }

  function renderTree() {
    aside.className = SECTION.gm ? "sections gm-block" : "sections";
    aside.replaceChildren();
    let nav = null;
    (SECTION.tree || []).forEach((node) => {
      if (node.kind === "group") {
        nav = null;
        aside.appendChild(renderGroup(node));
      } else {
        if (!nav) {
          nav = document.createElement("nav");
          nav.className = "side";
          aside.appendChild(nav);
        }
        nav.appendChild(renderLeaf(node));
      }
    });
    const layout = document.querySelector("#layout");
    const solo = !!SECTION.solo || !(SECTION.tree || []).length;
    layout.classList.toggle("solo", solo);
  }

  function markCurrent(pageId, hash) {
    aside.querySelectorAll("a").forEach((link) => link.removeAttribute("aria-current"));
    aside.querySelectorAll("a").forEach((link) => {
      const page = link.dataset.page;
      const anchor = link.dataset.anchor || "";
      if (anchor && anchor === hash) link.setAttribute("aria-current", "location");
      else if (!anchor && page === pageId) link.setAttribute("aria-current", "page");
    });
    const current = aside.querySelector('[aria-current="page"], [aria-current="location"]');
    if (!current) return;
    let details = current.closest("details");
    while (details) {
      details.open = true;
      details = details.parentElement ? details.parentElement.closest("details") : null;
    }
    const box = aside.getBoundingClientRect();
    const row = current.getBoundingClientRect();
    if (row.top < box.top || row.bottom > box.bottom) aside.scrollTop += row.top - box.top - 48;
  }

  function show() {
    rebuildAnchors();
    const hash = hashNow();
    const alias = SECTION.aliases && SECTION.aliases[hash];
    if (alias) {
      location.replace(alias);
      return;
    }
    let pageId = SECTION.pages[hash] ? hash : (anchors[hash] || "");
    if (!pageId || !SECTION.pages[pageId]) pageId = SECTION.lead;
    const page = SECTION.pages[pageId];
    if (!page) {
      article.className = "";
      article.textContent = "That page is missing.";
      return;
    }
    showing = hash || pageId;
    article.className = (SECTION.gm || page.gm) ? "gm-block" : "";
    article.innerHTML = page.html;
    document.title = page.title + " · Emberheim";
    markCurrent(pageId, hash);
    if (hash && hash !== pageId) {
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView();
    }
  }

  function status(text) {
    const node = document.querySelector("#edit-status");
    if (node) node.textContent = text || "";
  }

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; }
    catch (error) { return ""; }
  }

  function setBusy(on) {
    busy = on;
    tools.querySelectorAll("button").forEach((button) => {
      button.disabled = on;
    });
  }

  function buttons() {
    const on = editing;
    document.querySelector("#edit-start").hidden = on;
    document.querySelector("#edit-gm").hidden = !on;
    document.querySelector("#edit-save").hidden = !on;
    document.querySelector("#edit-cancel").hidden = !on;
    document.querySelector("#add-page").hidden = on;
    document.querySelector("#add-category").hidden = on;
  }

  function requireToken(action) {
    if (token()) {
      action();
      return;
    }
    pending = action;
    document.querySelector("#token-form").hidden = false;
    document.querySelector("#gh-token").focus();
  }

  function groupChoices() {
    const choices = [{ label: "Top of this section", nodes: SECTION.tree }];
    function walk(nodes, prefix) {
      nodes.forEach((node) => {
        if (node.kind !== "group") return;
        const label = prefix ? prefix + " / " + node.title : node.title;
        choices.push({ label: label, nodes: node.children });
        walk(node.children || [], label);
      });
    }
    walk(SECTION.tree || [], "");
    return choices;
  }

  function fillWhere() {
    const select = document.querySelector("#add-where");
    select.replaceChildren();
    groupChoices().forEach((choice, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = choice.label;
      select.appendChild(option);
    });
  }

  function slugify(text) {
    const slug = text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug || "page";
  }

  function uniqueSlug(title) {
    const base = slugify(title);
    let id = base;
    let n = 2;
    while (SECTION.pages[id]) {
      id = base + "-" + n;
      n += 1;
    }
    return id;
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function searchEntries(section) {
    const entries = [];
    const seen = new Set();
    function add(title, hash, gm) {
      title = String(title || "").replace(/\s+/g, " ").trim();
      if (!title || !hash) return;
      const key = hash + "\0" + title;
      if (seen.has(key)) return;
      seen.add(key);
      const entry = { t: title, u: section.id + ".html#" + hash, p: section.label, s: section.id };
      if (gm) entry.g = 1;
      entries.push(entry);
    }
    Object.keys(section.pages).forEach((id) => {
      const page = section.pages[id];
      const box = document.createElement("div");
      box.innerHTML = page.html;
      const pageGm = !!(section.gm || page.gm);
      const headings = box.querySelectorAll("h2, h3, h4, h5");
      headings.forEach((heading) => {
        const gm = pageGm || heading.classList.contains("gm-block") || !!heading.closest(".gm-block");
        add(heading.textContent, heading.id, gm);
      });
      if (!headings.length) add(page.title, id, pageGm);
    });
    return entries;
  }

  function backup() {
    return JSON.stringify(SECTION);
  }

  function restore(saved) {
    const data = JSON.parse(saved);
    Object.keys(SECTION).forEach((key) => delete SECTION[key]);
    Object.assign(SECTION, data);
  }

  async function gh(path, options) {
    const response = await fetch("https://api.github.com" + path, {
      method: options.method || "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token(),
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    let data = {};
    try { data = await response.json(); } catch (error) { data = {}; }
    if (!response.ok) {
      const error = new Error(data.message || ("GitHub returned " + response.status));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function commitFiles(files, message) {
    const repo = window.EMBERHEIM_REPO;
    const base = "/repos/" + repo.owner + "/" + repo.name;
    const ref = await gh(base + "/git/ref/heads/" + repo.branch, {});
    const parent = ref.object.sha;
    const current = await gh(base + "/git/commits/" + parent, {});
    const tree = [];
    for (let i = 0; i < files.length; i += 1) {
      const blob = await gh(base + "/git/blobs", {
        method: "POST",
        body: { content: files[i].text, encoding: "utf-8" }
      });
      tree.push({ path: files[i].path, mode: "100644", type: "blob", sha: blob.sha });
    }
    const nextTree = await gh(base + "/git/trees", {
      method: "POST",
      body: { base_tree: current.tree.sha, tree: tree }
    });
    const commit = await gh(base + "/git/commits", {
      method: "POST",
      body: { message: message, tree: nextTree.sha, parents: [parent] }
    });
    await gh(base + "/git/refs/heads/" + repo.branch, {
      method: "PATCH",
      body: { sha: commit.sha }
    });
  }

  function explain(error) {
    if (error.status === 401) return "GitHub refused that token. It needs Contents access for this repository.";
    if (error.status === 404) return "GitHub could not see " + window.EMBERHEIM_REPO.owner + "/" + window.EMBERHEIM_REPO.name + " with that token.";
    if (error.status === 422) return "The site changed on GitHub before this save finished. Reload the page and try again.";
    return error.message || "The save did not reach GitHub.";
  }

  async function publish(message) {
    const entries = searchEntries(SECTION);
    const previous = window.EMBERHEIM_SEARCH || [];
    const nextSearch = previous.filter((entry) => entry.s !== SECTION.id).concat(entries);
    setBusy(true);
    status("Saving to GitHub…");
    try {
      await commitFiles([
        { path: "web/data/" + SECTION.id + ".js", text: "window.EMBERHEIM_SECTION = " + JSON.stringify(SECTION, null, 2) + ";\n" },
        { path: "web/search.js", text: "window.EMBERHEIM_SEARCH = " + JSON.stringify(nextSearch) + ";\n" }
      ], message);
      window.EMBERHEIM_SEARCH = nextSearch;
      status("Saved to GitHub. Everyone will see it after the site republishes, usually about a minute.");
      return true;
    } catch (error) {
      status(explain(error));
      return false;
    } finally {
      setBusy(false);
      buttons();
    }
  }

  function syncTitle(pageId) {
    const page = SECTION.pages[pageId];
    const box = document.createElement("div");
    box.innerHTML = page.html;
    const heading = box.querySelector("h2, h3, h4, h5");
    const title = heading && heading.textContent.replace(/\s+/g, " ").trim();
    if (!title) return;
    page.title = title;
    function walk(nodes) {
      nodes.forEach((node) => {
        if (node.page === pageId && !node.anchor) node.title = title;
        if (node.children) walk(node.children);
      });
    }
    walk(SECTION.tree || []);
  }

  function reveal(hash, after) {
    if (hashNow() === hash) {
      renderTree();
      show();
      if (after) after();
      return;
    }
    afterShow = after || null;
    location.hash = hash;
  }

  function currentPageId() {
    const hash = hashNow();
    if (SECTION.pages[hash]) return hash;
    if (anchors[hash]) return anchors[hash];
    return SECTION.lead;
  }

  function startEdit() {
    snapshot = article.innerHTML;
    editing = true;
    article.contentEditable = "true";
    article.classList.add("editing");
    buttons();
    status("Player text stays visible. GM note marks the paragraph you are in.");
    article.focus();
  }

  function cancelEdit() {
    article.innerHTML = snapshot;
    editing = false;
    article.contentEditable = "false";
    article.classList.remove("editing");
    buttons();
    status("");
  }

  function toggleGm() {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return;
    const node = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
    const block = node && node.closest("p, li, h2, h3, h4, h5, blockquote, div, tr");
    if (!block || block === article || !article.contains(block)) return;
    block.classList.toggle("gm-only");
  }

  function openAdd(kind) {
    const form = document.querySelector("#add-form");
    form.dataset.kind = kind;
    document.querySelector("#add-heading").textContent = kind === "page"
      ? "Add a page to this section."
      : "Add a category to this section.";
    document.querySelector("#add-where").hidden = false;
    document.querySelector("label[for='add-where']").hidden = false;
    fillWhere();
    document.querySelector("#add-title").value = "";
    document.querySelector("#add-gm").checked = false;
    form.hidden = false;
    document.querySelector("#add-title").focus();
  }

  renderShell();
  renderTree();
  show();
  buttons();

  document.querySelector("#edit-start").addEventListener("click", startEdit);
  document.querySelector("#edit-cancel").addEventListener("click", cancelEdit);
  document.querySelector("#edit-gm").addEventListener("click", toggleGm);
  document.querySelector("#edit-save").addEventListener("click", () => {
    requireToken(async () => {
      const pageId = currentPageId();
      const page = SECTION.pages[pageId];
      if (!page) return;
      const saved = backup();
      const edited = article.innerHTML;
      page.html = edited;
      syncTitle(pageId);
      const ok = await publish("Update " + SECTION.label + ": " + page.title);
      if (!ok) {
        restore(saved);
        article.innerHTML = edited;
        renderTree();
        return;
      }
      editing = false;
      article.contentEditable = "false";
      article.classList.remove("editing");
      renderTree();
      show();
      buttons();
    });
  });
  document.querySelector("#add-page").addEventListener("click", () => openAdd("page"));
  document.querySelector("#add-category").addEventListener("click", () => openAdd("category"));
  document.querySelector("#token-forget").addEventListener("click", () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch (error) { /* storage may be blocked */ }
    status("The token is forgotten in this browser.");
  });
  document.querySelector("#token-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = document.querySelector("#gh-token").value.trim();
    if (!value) return;
    try { localStorage.setItem(TOKEN_KEY, value); }
    catch (error) {
      status("This browser would not store the token.");
      return;
    }
    document.querySelector("#gh-token").value = "";
    document.querySelector("#token-form").hidden = true;
    const action = pending;
    pending = null;
    if (action) action();
  });
  document.querySelector("#add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#add-title").value.trim();
    if (!title) return;
    const kind = event.currentTarget.dataset.kind;
    const choices = groupChoices();
    const choice = choices[Number(document.querySelector("#add-where").value)] || choices[0];
    const gmOnly = document.querySelector("#add-gm").checked;
    requireToken(async () => {
      const saved = backup();
      if (!Array.isArray(SECTION.tree)) SECTION.tree = [];
      if (kind === "page") {
        const id = uniqueSlug(title);
        const page = { title: title, html: "<h3 id=\"" + id + "\">" + escapeHtml(title) + "</h3><p></p>" };
        if (gmOnly) page.gm = true;
        SECTION.pages[id] = page;
        const link = {
          kind: "link",
          title: title,
          href: "#" + id,
          section: SECTION.id,
          page: id,
          depth: choice.nodes === SECTION.tree ? "d0" : "d1"
        };
        if (gmOnly) link.gm = true;
        choice.nodes.push(link);
        SECTION.solo = false;
        const ok = await publish("Add " + title + " to " + SECTION.label);
        if (!ok) {
          restore(saved);
          renderTree();
          show();
          return;
        }
        document.querySelector("#add-form").hidden = true;
        reveal(id, startEdit);
      } else {
        const group = { kind: "group", title: title, open: true, children: [] };
        if (gmOnly) group.gm = true;
        choice.nodes.push(group);
        SECTION.solo = false;
        const ok = await publish("Add category " + title + " to " + SECTION.label);
        if (!ok) {
          restore(saved);
          renderTree();
          show();
          return;
        }
        document.querySelector("#add-form").hidden = true;
        renderTree();
        show();
      }
    });
  });

  window.addEventListener("hashchange", () => {
    if (afterShow) {
      const after = afterShow;
      afterShow = null;
      renderTree();
      show();
      after();
      return;
    }
    if (editing && article.innerHTML !== snapshot) {
      if (!window.confirm("Leave without saving this edit?")) {
        history.replaceState(null, "", "#" + showing);
        return;
      }
    }
    editing = false;
    article.contentEditable = "false";
    buttons();
    show();
  });

  window.addEventListener("beforeunload", (event) => {
    if (editing && article.innerHTML !== snapshot) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
