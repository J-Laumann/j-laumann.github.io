import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "web");

const sections = ["locations", "groups", "campaigns", "people", "reference", "services", "items", "open"];
const leads = {
  locations: "emberheim",
  groups: "empire",
  campaigns: "campaigns",
  people: "people",
  reference: "prices",
  services: "shared-services",
  items: "magic-items",
  open: "still-open"
};
const labels = {
  locations: "Locations",
  groups: "Factions",
  campaigns: "Campaigns",
  people: "People",
  reference: "Reference",
  services: "Shared Services",
  items: "Magic Items",
  open: "Still open"
};
const gmNav = new Set(["campaigns", "items", "open"]);
const stubs = new Map();

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text.replace(/\r\n/g, "\n"), "utf8");
}

function decode(value) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function visible(text) {
  return decode(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function follow(section, stem, frag) {
  const seen = new Set();
  while (stubs.has(`${section}/${stem}`) && !seen.has(`${section}/${stem}`)) {
    seen.add(`${section}/${stem}`);
    const next = stubs.get(`${section}/${stem}`);
    section = next.section;
    stem = next.stem;
    if (!frag && next.frag) frag = next.frag;
  }
  return { section, stem, frag: frag || null };
}

function finalHref(section, stem, frag, here) {
  const resolved = follow(section, stem, frag);
  if (here == null && !resolved.frag && leads[resolved.section] === resolved.stem) return `${resolved.section}.html`;
  const target = resolved.frag || resolved.stem;
  if (here === resolved.section) return `#${target}`;
  return `${resolved.section}.html#${target}`;
}

function parseLink(href, here) {
  href = href.trim();
  if (!href || /^(https?:|mailto:|javascript:)/.test(href)) return { href, external: true };
  if (href.startsWith("#")) return { href, section: here, anchor: href.slice(1) };
  let path = href;
  let frag = null;
  const hash = href.indexOf("#");
  if (hash >= 0) {
    path = href.slice(0, hash);
    frag = href.slice(hash + 1) || null;
  }
  path = path.replace(/^\.\//, "");
  while (path.startsWith("../")) path = path.slice(3);
  if (path === "" || path === "index.html") {
    return { href: "index.html" + (frag ? `#${frag}` : ""), external: true };
  }
  if (!path.endsWith(".html")) return { href, external: true };
  const parts = path.split("/");
  let section;
  let stem;
  if (parts.length === 2 && leads[parts[0]]) {
    section = parts[0];
    stem = parts[1].slice(0, -5);
  } else if (parts.length === 1 && here) {
    section = here;
    stem = parts[0].slice(0, -5);
  } else {
    return { href, external: true };
  }
  const resolved = follow(section, stem, frag);
  const url = finalHref(resolved.section, resolved.stem, resolved.frag, here);
  const out = { href: url, section: resolved.section, page: resolved.stem };
  if (resolved.frag) out.anchor = resolved.frag;
  return out;
}

function rewriteHtml(inner, here) {
  inner = inner.replace(/href=(['"])([^'"]*)\1/g, (all, quote, raw) => {
    const next = parseLink(decode(raw), here).href;
    return `href=${quote}${escapeAttr(next)}${quote}`;
  });
  return inner.replace(/src=(['"])([^'"]*)\1/g, (all, quote, raw) => {
    let src = decode(raw);
    while (src.startsWith("../")) src = src.slice(3);
    return `src=${quote}${escapeAttr(src)}${quote}`;
  });
}

function tokenize(source) {
  const tokens = [];
  const re = /<!--[\s\S]*?-->|<\/([A-Za-z0-9]+)>|<([A-Za-z0-9]+)([^>]*)>|([^<]+)/g;
  let match;
  while ((match = re.exec(source))) {
    if (match[1]) tokens.push({ type: "end", tag: match[1].toLowerCase() });
    else if (match[2]) {
      const attrs = {};
      const raw = match[3] || "";
      const attr = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
      let found;
      while ((found = attr.exec(raw))) attrs[found[1]] = decode(found[2] ?? found[3] ?? found[4] ?? "");
      tokens.push({ type: "start", tag: match[2].toLowerCase(), attrs });
    } else if (match[4]) tokens.push({ type: "text", text: decode(match[4]) });
  }
  return tokens;
}

function parseAside(source) {
  const root = { kind: "root", children: [] };
  const stack = [root];
  let capture = null;
  let buf = "";
  let href = "";
  let classes = "";
  for (const token of tokenize(source)) {
    if (token.type === "start" && token.tag === "details") {
      const node = {
        kind: "group",
        title: "",
        gm: (token.attrs.class || "").split(/\s+/).includes("gm-block"),
        open: Object.prototype.hasOwnProperty.call(token.attrs, "open"),
        children: []
      };
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (token.type === "start" && token.tag === "summary") {
      capture = "summary";
      buf = "";
      href = "";
      classes = "";
    } else if (token.type === "start" && token.tag === "a" && capture === "summary") {
      href = token.attrs.href || "";
      classes = token.attrs.class || "";
    } else if (token.type === "start" && token.tag === "a" && !capture) {
      capture = "a";
      buf = "";
      href = token.attrs.href || "";
      classes = token.attrs.class || "";
    } else if (token.type === "start" && token.tag === "span" && (token.attrs.class || "").split(/\s+/).includes("label")) {
      capture = "label";
      buf = "";
      classes = token.attrs.class || "";
    } else if (token.type === "end" && token.tag === "summary" && capture === "summary") {
      const group = stack.at(-1);
      group.title = buf.replace(/\s+/g, " ").trim();
      group._href = href;
      group._classes = classes;
      capture = null;
    } else if (token.type === "end" && token.tag === "a" && capture === "a") {
      stack.at(-1).children.push({
        kind: "link",
        title: buf.replace(/\s+/g, " ").trim(),
        href,
        classes
      });
      capture = null;
    } else if (token.type === "end" && token.tag === "span" && capture === "label") {
      stack.at(-1).children.push({
        kind: "label",
        title: buf.replace(/\s+/g, " ").trim(),
        classes
      });
      capture = null;
    } else if (token.type === "end" && token.tag === "details" && stack.length > 1) {
      stack.pop();
    } else if (token.type === "text" && capture) {
      buf += token.text;
    }
  }
  return root.children;
}

function depthOf(classes) {
  for (const name of ["d0", "d1", "d2", "d3", "d4"]) {
    if (classes.split(/\s+/).includes(name)) return name;
  }
  return "d1";
}

function gmClass(classes) {
  return (classes || "").split(/\s+/).includes("gm-block");
}

function pack(node, here) {
  if (node.kind === "label") {
    const out = { kind: "label", title: node.title, depth: depthOf(node.classes) };
    if (gmClass(node.classes)) out.gm = true;
    return out;
  }
  if (node.kind === "link") {
    const info = parseLink(node.href, here);
    const out = { kind: "link", title: node.title, href: info.href, depth: depthOf(node.classes) };
    if (gmClass(node.classes)) out.gm = true;
    for (const key of ["section", "page", "anchor"]) if (info[key]) out[key] = info[key];
    return out;
  }
  const info = node._href ? parseLink(node._href, here) : {};
  const out = { kind: "group", title: node.title, children: node.children.map((child) => pack(child, here)) };
  if (node.gm || gmClass(node._classes)) out.gm = true;
  if (node.open) out.open = true;
  if (info.href) out.href = info.href;
  for (const key of ["section", "page", "anchor"]) if (info[key]) out[key] = info[key];
  return out;
}

function headingsOf(source) {
  const heads = [];
  const stack = [];
  let capture = null;
  let buf = "";
  let id = "";
  let gm = false;
  for (const token of tokenize(source)) {
    if (token.type === "start" && token.tag === "div") {
      stack.push(gmClass(token.attrs.class) ? "gm" : "div");
    } else if (token.type === "start" && ["h2", "h3", "h4", "h5"].includes(token.tag)) {
      capture = token.tag;
      buf = "";
      id = token.attrs.id || "";
      gm = stack.includes("gm") || gmClass(token.attrs.class);
    } else if (token.type === "end" && token.tag === capture) {
      heads.push({ id, title: buf.replace(/\s+/g, " ").trim(), gm });
      capture = null;
    } else if (token.type === "end" && token.tag === "div" && stack.length) {
      stack.pop();
    } else if (token.type === "text" && capture) {
      buf += token.text;
    }
  }
  return heads;
}

function articleOf(text) {
  const match = text.match(/<article\b([^>]*)>([\s\S]*)<\/article>/);
  return match ? { attrs: match[1], inner: match[2] } : null;
}

function whollyGm(inner) {
  return /^<div class="gm-block">[\s\S]*<\/div>\s*$/.test(inner.trim());
}

function walk(nodes, visit) {
  for (const node of nodes) {
    visit(node);
    if (node.children) walk(node.children, visit);
  }
}

function shell(section) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${labels[section]} · Emberheim</title>
<link rel="stylesheet" href="site.css">
<script src="boot.js"></script>
<script src="section-state.js"></script>
</head>
<body data-section="${section}">
<div id="app"></div>
<script src="repo.js"></script>
<script src="data/${section}.js"></script>
<script src="search.js"></script>
<script src="find.js"></script>
<script src="reader.js"></script>
<script src="gm.js"></script>
</body>
</html>
`;
}

for (const section of sections) {
  const folder = join(web, section);
  for (const name of readdirSync(folder)) {
    if (!name.endsWith(".html")) continue;
    const text = read(join(folder, name));
    if (text.includes("<article")) continue;
    const match = text.match(/location\.replace\(\s*['"]([^'"]+)['"]\s*\)/);
    if (!match) {
      console.log(`No article and no redirect: ${section}/${name}`);
      continue;
    }
    const info = parseLink(match[1], section);
    if (info.external || !info.page) {
      console.log(`Could not follow redirect ${name} -> ${match[1]}`);
      continue;
    }
    stubs.set(`${section}/${name.slice(0, -5)}`, {
      section: info.section,
      stem: info.page,
      frag: info.anchor || null
    });
  }
}
for (const [key, value] of [...stubs]) {
  const resolved = follow(value.section, value.stem, value.frag);
  stubs.set(key, { section: resolved.section, stem: resolved.stem, frag: resolved.frag });
}

const pages = Object.fromEntries(sections.map((name) => [name, {}]));
const rawText = new Map();
const asides = Object.fromEntries(sections.map((name) => [name, []]));
const solo = Object.fromEntries(sections.map((name) => [name, false]));
const asideGm = Object.fromEntries(sections.map((name) => [name, false]));

for (const section of sections) {
  const folder = join(web, section);
  for (const name of readdirSync(folder).filter((item) => item.endsWith(".html")).sort()) {
    const text = read(join(folder, name));
    const article = articleOf(text);
    if (!article) continue;
    const stem = name.slice(0, -5);
    rawText.set(`${section}/${stem}`, visible(article.inner));
    pages[section][stem] = {
      title: stem,
      html: rewriteHtml(article.inner, section),
      _gm: /\bgm-block\b/.test(article.attrs) || whollyGm(article.inner)
    };
    const aside = text.match(/<aside\b([^>]*)>([\s\S]*)<\/aside>/);
    if (aside) {
      if (/\bgm-block\b/.test(aside[1])) asideGm[section] = true;
      let normalized = aside[2].replace(/\s+/g, " ");
      normalized = normalized.replace(/\saria-current="[^"]*"/g, "");
      normalized = normalized.replace(/\sopen(?=[\s>])/g, "");
      asides[section].push([name, normalized.trim()]);
    } else if (text.includes('class="layout solo"')) {
      solo[section] = true;
    }
  }
}

const trees = {};
for (const section of sections) {
  if (!asides[section].length) {
    trees[section] = [];
    continue;
  }
  const best = asides[section].reduce((a, b) => (a[1].split("href=").length > b[1].split("href=").length ? a : b));
  const unique = new Set(asides[section].map((item) => item[1]));
  if (unique.size > 1) console.log(`${section}: sidebars differ across pages; using ${best[0]}`);
  trees[section] = parseAside(best[1]).map((node) => pack(node, section));
}

const missing = [];
const linked = Object.fromEntries(sections.map((name) => [name, new Set()]));
for (const section of sections) {
  walk(trees[section], (node) => {
    if (!node.page) return;
    const owner = node.section || section;
    if (!pages[owner]?.[node.page]) {
      missing.push(`${section} -> ${owner}/${node.page} (${node.title})`);
      return;
    }
    if (!node.anchor) {
      linked[owner].add(node.page);
      if (node.title && pages[owner][node.page].title === node.page) pages[owner][node.page].title = node.title;
      if (node.gm) pages[owner][node.page]._gm = true;
    }
  });
}

for (const section of sections) {
  for (const [stem, page] of Object.entries(pages[section])) {
    const heads = headingsOf(page.html);
    if (heads[0]?.title && page.title === stem) page.title = heads[0].title;
    if (page._gm) page.gm = true;
    delete page._gm;
    if (visible(page.html) !== rawText.get(`${section}/${stem}`)) missing.push(`text changed in ${section}/${stem}`);
  }
  const orphans = Object.keys(pages[section]).filter((stem) => !linked[section].has(stem));
  if (orphans.length && trees[section].length) {
    console.log(`${section} pages not in the sidebar: ${orphans.join(", ")}`);
    trees[section].push({
      kind: "group",
      title: "Also",
      open: true,
      children: orphans.map((stem) => {
        const link = {
          kind: "link",
          title: pages[section][stem].title,
          href: `#${stem}`,
          section,
          page: stem,
          depth: "d1"
        };
        if (pages[section][stem].gm) link.gm = true;
        return link;
      })
    });
  }
}

const aliases = Object.fromEntries(sections.map((name) => [name, {}]));
for (const section of sections) {
  const shim = join(web, `${section}.html`);
  if (!existsSync(shim)) continue;
  const match = read(shim).match(/const H = (\{[\s\S]*?\});/);
  if (!match) continue;
  const table = JSON.parse(match[1]);
  for (const [key, target] of Object.entries(table)) {
    const info = parseLink(target, section);
    if (info.external || !info.page) continue;
    const hashId = info.anchor || info.page;
    if (info.section === section && hashId === key) continue;
    aliases[section][key] = info.section === section ? `#${hashId}` : info.href;
  }
  for (const [stubKey, target] of stubs) {
    const [folder, stem] = stubKey.split("/");
    if (folder !== section || pages[section][stem]) continue;
    const hashId = target.frag || target.stem;
    aliases[section][stem] = target.section === section ? `#${hashId}` : `${target.section}.html#${hashId}`;
  }
}

if (missing.length) {
  console.log("Stopped without writing. Problems:");
  for (const line of missing) console.log(" -", line);
  process.exit(1);
}

const search = [];
const seen = new Set();
function addSearch(title, url, label, source, gm) {
  title = title.replace(/\s+/g, " ").trim();
  if (!title) return;
  const key = `${url}\0${title}`;
  if (seen.has(key)) return;
  seen.add(key);
  const entry = { t: title, u: url, p: label, s: source };
  if (gm) entry.g = 1;
  search.push(entry);
}

for (const section of sections) {
  for (const [stem, page] of Object.entries(pages[section])) {
    const pageGm = gmNav.has(section) || asideGm[section] || !!page.gm;
    const heads = headingsOf(page.html);
    if (!heads.length) addSearch(page.title, `${section}.html#${stem}`, labels[section], section, pageGm);
    for (const head of heads) {
      if (head.id) addSearch(head.title, `${section}.html#${head.id}`, labels[section], section, pageGm || head.gm);
    }
  }
}

let indexText = read(join(web, "index.html"));
const timeline = indexText.match(/<section class="home-timeline">[\s\S]*?<\/section>/);
for (const head of headingsOf(timeline ? timeline[0] : "")) {
  if (head.id) addSearch(head.title, `index.html#${head.id}`, "Home", "home", head.gm);
}

for (const section of sections) {
  const data = {
    id: section,
    label: labels[section],
    lead: leads[section],
    tree: trees[section],
    pages: pages[section]
  };
  if (gmNav.has(section) || asideGm[section]) data.gm = true;
  if (solo[section]) data.solo = true;
  if (Object.keys(aliases[section]).length) data.aliases = aliases[section];
  if (!pages[section][leads[section]]) {
    console.log(`${section} is missing its opening page ${leads[section]}`);
    process.exit(1);
  }
  const payload = `window.EMBERHEIM_SECTION = ${JSON.stringify(data, null, 2)};\n`;
  write(join(web, "data", `${section}.js`), payload);
  write(join(web, `${section}.html`), shell(section));
  console.log(`${section}: ${Object.keys(pages[section]).length} pages, ${payload.length.toLocaleString()} bytes`);
}

const redirects = {};
for (const [stubKey, target] of stubs) {
  redirects[`${stubKey}.html`] = `${target.section}.html#${target.frag || target.stem}`;
}
write(join(web, "redirects.js"), `window.EMBERHEIM_REDIRECTS = ${JSON.stringify(redirects, null, 2)};\n`);
write(join(web, "search.js"), `window.EMBERHEIM_SEARCH = ${JSON.stringify(search)};\n`);
console.log(`search entries: ${search.length}`);
console.log(`redirects: ${Object.keys(redirects).length}`);

function indexHref(all, raw) {
  const info = parseLink(decode(raw), null);
  if (info.href === raw) return all;
  return `href="${escapeAttr(info.href)}"`;
}

let updated = indexText.replace(
  /<script>\s*\(function \(\) \{\s*var on = false;[\s\S]*?\}\)\(\);\s*<\/script>/,
  '<script src="boot.js"></script>'
);
updated = updated.replace(
  /<script>\s*const INDEX = \[[\s\S]*?<\/script>/,
  '<script src="search.js"></script>\n<script src="find.js"></script>'
);
updated = updated.replace(/href="([^"]*)"/g, (all, raw) => indexHref(all, raw));
if (updated.includes("const INDEX") || !updated.includes('<script src="boot.js"></script>') || !updated.includes('<script src="search.js"></script>')) {
  console.log("Index page did not pick up the shared scripts.");
  process.exit(1);
}
write(join(web, "index.html"), updated);

let removed = 0;
for (const section of sections) {
  const folder = join(web, section);
  for (const name of readdirSync(folder)) {
    if (!name.endsWith(".html")) continue;
    unlinkSync(join(folder, name));
    removed += 1;
  }
  const leftover = readdirSync(folder);
  if (!leftover.length) rmdirSync(folder);
  else console.log(`Kept ${section}/ because it still holds: ${leftover.join(", ")}`);
}
console.log(`Removed ${removed} page files.`);
console.log(relative(root, web));
