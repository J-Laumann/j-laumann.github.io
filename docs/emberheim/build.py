#!/usr/bin/env python3
"""Combine the Emberheim chapter files into one Markdown file, one HTML file, and one Word file."""

from __future__ import annotations

import html
import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent
CHAPTERS = ROOT / "chapters"
MAP = ROOT / "emberheim-map.jpg"

# Every handout title from Weird West and Flying Boats. The build fails if one is missing.
HANDOUTS = [
    "Item Values",
    "Western NPC Random Loot Table (d100)",
    "Sparky",
    "BBQ Inventory",
    "Emberheim",
    "Historical Timeline",
    "Ninth Circle (Treachery)",
    "Altar of Rot",
    "Myconid Colony",
    "Castle Darkstone Torture Chamber",
    "Castle Darkstone - Areas",
    "Cult of Boogle",
    "Xanthis' Study",
    "Xanthis' Tower",
    "Castle Darkstone",
    "Castle Darkstone - Map Overview",
    "The Heart of Sorrow",
    "Putting Beatrice to Rest",
    "Highrest",
    "Tor's Tent",
    "The Shadow",
    "Scraps of Disaster",
    "Elowen's Home",
    "The Enigma",
    "heavily eastern-inspired",
    "Fort Ironclad",
    "The Stolen Schematic",
    "Underground Gigs",
    "Sack of Cold",
    "The Contest of Heroes",
    "Contest of Heroes: Rivals",
    "Team Rating (DMG)",
    "4 Statues",
    "Official Business",
    "Ironspire",
    "Imperial Palace",
    "The Church of Ironspire",
    "Brass & Barter",
    "The Grease Trap",
    "Briggs' BOOM!",
    "Crystals and Curios",
    "The Gilded Gear",
    "Digs & Dives",
    "Dusthaven Random Encounter Ideas",
    "Scaly Sam",
    "Axe Beaks",
    "The Iron Riders",
    "Hive Sighting",
    "Supernatural Emergency",
    'Oswald "Friendly Face" Price',
    "Investigate Cemetary",
    "Lucky Luke",
    "Marauder Incursion",
    "Shapeshifting Threat",
    '"Rex Refund"',
    "Creatures",
    "Dusthaven",
    "Sheriff's Office",
    "Sheriff of Dusthaven",
    "Gunther's Guns",
    "Spare-a-drop Supplies",
    "The Lounging Lizard Inn",
    "The Mayor's House",
    "The Sandstorm Marauders",
    "The Stinger",
    "Scorpion Gulch Miner's Union",
    "Scorpion Gulch",
    "The Orecrusher Vault",
    "Sun Prism Aquarium",
    "Sunfire Temple",
    "Elowen's Journal",
    "The Sunfire Prism",
    "The Shattered Colossus",
    "Steamwood",
    "The Axeman's Alehouse",
    "The Steamwood Central Market",
    "money buys literally anything",
    "Shipfaced",
    "The Admiral's Table",
    "Portside Provisions",
    "The Kraken's Cache",
    "The Docks",
    "The Savagebloom Expanse",
    "Bloomridge",
    "The Burning Barrel",
    "General Ignar",
    "Aeris Thorne",
    "Venomshade",
    "The Lost City of Gold",
    "The Goblin Map",
    "River of Ssstyx",
    "Goblin Camp",
    "Sunken Temple",
    "Death in the Jungle",
    "The Isle of Falling Stars",
    "Azure Lagoon",
    "General Store",
    "The Stables",
    "The Church",
    "Railway Station",
    "Firearms",
    "Heart Seeker Bullet",
    "Flak Shell",
    "Lightning Rod Bullet",
    "Blessed Bullets",
    "Bullet of Anchoring",
    "Permafrost Pellets",
    "Potion of Heroism",
    "Holy Nog",
    "Bronze Hero Badge",
    "Ring of Demonic Dominance",
    "Ring of Y'ghnath'ull",
    "Ring of Spell Storing",
    "Wand of Secrets",
    "Rod of the Pact Keeper (+1)",
    "Mind Sharpener",
    "Soul Orb",
    "Robe of Useful Items",
    "Animated Shield",
    "Luckstone",
    "Holy Symbol of Darkstone",
    "Skull of Stefan Gregorovich",
    "Skull of Intree Sik-Valoo",
    "Sanctum Amulet",
    "+1 Crystal",
    "Amulet of Shifting Seaweed",
    "Revenue Rifle",
    "Staff of the Cauldron Carrier",
    "Mace of Disruption",
    "Marksman's Cloak",
    "Phantomstrike Rifle",
    "Boots of Elvenkind",
    "Sporosylvan",
    "Buckler of Bone",
    "The Pretty Pistol",
    "Goggles of Night",
    "Delectable Dice",
    "Coin of Divination",
    "Eyes of the Eagle",
    "Infernal Fang Dagger",
    "Luck Blade",
    "Heaven's Lance",
    "Henry Stormshot",
    "Shard of Warmth",
    "Bottle of Boundless Coffee",
    "Hunter's Best Buddy",
    "Double Jumpers",
    "Hunter's Coat",
    "Lantern of Truth",
    "Scale-shot",
    "The Opportune Uppercut",
    "The Lucky Lid",
    "Chains of Ethereal Torment",
    "Her Handkerchief",
    "Axe Beak Tomahawk",
    "Frostweaver Gloves",
    "Urnblade",
    "Sword of Aric (Purified)",
    "??? Sword",
    "Carpet of Flying",
    "Shield of Whispered Warnings",
    "Icon of Faith",
    "Boots of Levitation",
    "Sandstorm Cloak",
    "Barroth Scalp Helm",
    "Barroth Ridge Armor",
    "Ring of Seething",
    "Scorpion Lasher",
    "The Sun Prism",
    "Manual of Bodily Health",
    "Boogle Ki Ring",
    "Cloak of Protection",
    "Pocket Anchor",
    "The Kulu Cross",
    "Ring of Protection",
    "Shotgun Knuckles",
    "Blessing of Holy Hands",
    "Mask of Emilio",
    "Trade - Orwin Delvane",
    "Transportation - Essira Tidewake",
    "Arcane - Vaelrix Morra",
    "Innovation - Fenwick Sprox",
    "Land - Bren Tallwood",
    "Faith - Archbishop Evalyne",
    "War - Kael Durnhart",
    "Meryn Bronzethumb",
    "Dr. Verid Threx",
    "Buck",
    "Briggs",
    "Lady Evelina Darkstone",
    "Sir Aric the Fallen",
    "General Xanthis the Necromancer",
    "Grizzle",
    "Elowen Sunweaver",
    "Thorian Brightshield",
    "Cloudsplitter Cargo",
    "Campaign Timeline",
    "Boat Basics",
    "Ship Combat",
    "Action Stations",
    "Moving a Ship",
    "Shakharra",
    "CW's Hidden Laboratory",
    "First Node",
    "Mysterious Note - Abandoned Quarry",
    "Lord Kaarak's Questions",
    "Evershroud",
    "Mad Mist Effects",
    "Mysterious Note",
    "Party Night",
    "Dinner",
    "Evershroud Manor",
    "Crazy Fog Man",
    "Fogbell Tower",
    "The Blind Gull",
    "Grandma's Pearlob Pie",
    "Falner's Furs",
    "Mister's Spider Scarf",
    "Philter of Love",
    "Safety Bear",
    "Candle of Borrowed Shadows",
    "Bark of Debarking",
    "Flute of the Fae",
    "Pocket Cleric",
    "Floab Lance",
    "Powder Horn of Pazazz",
    "Pixie Scissors",
    "Spell Sewing Needle",
    "Pipe of Blowing Smoke",
    "Bangles of Auran Armory",
    "Pearlob",
    "(Floab/Flobe) Ore",
    "Gauntlets of Unyielding Grasp",
    "Pearl of Power",
    "+1 Floab Greatsword",
    "Amulet of Last Whispers",
    "Ointments",
    "Lady Sanswari",
    "Lord Kaarak",
    "Yan-C-Bin",
    "Elric Caltor",
    "The Lady of the House",
]


def load_chapters() -> str:
    parts = []
    for path in sorted(CHAPTERS.glob("*.md")):
        parts.append(path.read_text(encoding="utf-8").strip())
    return "\n\n".join(parts) + "\n"


def slugify(text: str) -> str:
    plain = re.sub(r"[*_`]", "", text)
    plain = plain.lower()
    plain = re.sub(r"[^a-z0-9]+", "-", plain).strip("-")
    return plain or "section"


def heading_entries(markdown: str) -> list[tuple[int, str, str]]:
    entries = []
    seen: dict[str, int] = {}
    for line in markdown.splitlines():
        match = re.match(r"^(#{2,6})\s+(.+)$", line)
        if not match:
            continue
        level = len(match.group(1))
        title = match.group(2).strip()
        base = slugify(title)
        seen[base] = seen.get(base, 0) + 1
        anchor = base if seen[base] == 1 else f"{base}-{seen[base]}"
        if level <= 4:
            entries.append((level, title, anchor))
    return entries


def insert_toc(markdown: str, entries: list[tuple[int, str, str]]) -> str:
    lines = ["## Contents", ""]
    for level, title, anchor in entries:
        if title == "Contents":
            continue
        indent = "    " if level >= 4 else "  " if level == 3 else ""
        lines.append(f"{indent}- [{title}](#{anchor})")
    lines.append("")
    block = "\n".join(lines)
    if "<!--TOC-->" not in markdown:
        raise SystemExit("Missing <!--TOC--> marker")
    return markdown.replace("<!--TOC-->", block, 1)


def inline_html(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", escaped)
    escaped = re.sub(
        r"\[([^\]]+)\]\(#([^)]+)\)",
        r'<a href="#\2">\1</a>',
        escaped,
    )
    return escaped


def markdown_to_html(markdown: str, entries: list[tuple[int, str, str]]) -> str:
    anchors: dict[str, int] = {}
    body: list[str] = []
    paragraph: list[str] = []
    list_items: list[tuple[int, str]] = []
    table: list[list[str]] = []
    quote: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            body.append(f"<p>{inline_html(' '.join(paragraph))}</p>")
            paragraph.clear()

    def flush_list() -> None:
        if list_items:
            items = []
            for indent, item in list_items:
                cls = ' class="sub2"' if indent >= 4 else ' class="sub"' if indent else ""
                items.append(f"<li{cls}>{inline_html(item)}</li>")
            body.append("<ul>" + "".join(items) + "</ul>")
            list_items.clear()

    def flush_table() -> None:
        if not table:
            return
        rows = []
        for index, row in enumerate(table):
            tag = "th" if index == 0 else "td"
            cells = "".join(f"<{tag}>{inline_html(cell.strip())}</{tag}>" for cell in row)
            rows.append(f"<tr>{cells}</tr>")
        body.append("<table>" + "".join(rows) + "</table>")
        table.clear()

    def flush_quote() -> None:
        if quote:
            body.append(f"<blockquote><p>{inline_html(' '.join(quote))}</p></blockquote>")
            quote.clear()

    def flush_all() -> None:
        flush_paragraph()
        flush_list()
        flush_table()
        flush_quote()

    for raw in markdown.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush_all()
            continue
        if line.startswith("|") and line.endswith("|"):
            flush_paragraph()
            flush_list()
            flush_quote()
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                table.append(cells)
            continue
        if line.startswith("> "):
            flush_paragraph()
            flush_list()
            flush_table()
            quote.append(line[2:])
            continue
        bullet = re.match(r"^( *)- (.+)$", line)
        if bullet:
            flush_paragraph()
            flush_table()
            flush_quote()
            list_items.append((len(bullet.group(1)), bullet.group(2)))
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            flush_all()
            level = len(heading.group(1))
            title = heading.group(2).strip()
            if level == 1:
                body.append(f"<h1>{inline_html(title)}</h1>")
                body.append(
                    '<figure class="map"><img src="emberheim-map.jpg" '
                    'alt="Map of Emberheim in the year 980, from Heaven\'s Reach to Umimura.">'
                    "<figcaption>Emberheim in 980.</figcaption></figure>"
                )
                continue
            base = slugify(title)
            anchors[base] = anchors.get(base, 0) + 1
            anchor = base if anchors[base] == 1 else f"{base}-{anchors[base]}"
            body.append(f'<h{level} id="{anchor}">{inline_html(title)}</h{level}>')
            continue
        if line.strip() == "---":
            flush_all()
            body.append("<hr>")
            continue
        flush_list()
        flush_table()
        flush_quote()
        body.append(f"<p>{inline_html(line.strip())}</p>")
    flush_all()

    style = """
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      max-width: 46rem;
      padding: 2.5rem 1.4rem 5rem;
      background: #f3ecdf;
      color: #241c16;
      font: 1.05rem/1.6 Palatino, "Palatino Linotype", Georgia, serif;
    }
    h1, h2, h3, h4 { font-family: Georgia, "Times New Roman", serif; line-height: 1.2; color: #3d2418; }
    h1 { font-size: 3rem; text-align: center; margin: 0 0 0.3rem; letter-spacing: 0.04em; }
    h2 { font-size: 1.8rem; margin: 2.4rem 0 0.6rem; border-bottom: 1px solid #c4b39a; padding-bottom: 0.25rem; }
    h3 { font-size: 1.28rem; margin: 1.6rem 0 0.4rem; }
    h4 { font-size: 1.08rem; margin: 1.1rem 0 0.3rem; }
    h5 { font-size: 1rem; margin: 0.9rem 0 0.25rem; }
    h6 { font-size: 0.95rem; margin: 0.8rem 0 0.2rem; }
    p { margin: 0.55rem 0; }
    a { color: #8a341c; }
    ul { margin: 0.4rem 0 0.8rem; padding-left: 1.3rem; }
    li { margin: 0.18rem 0; }
    li.sub { margin-left: 1.15rem; list-style-type: circle; }
    li.sub2 { margin-left: 2.3rem; list-style-type: disc; }
    blockquote {
      margin: 0.8rem 0;
      padding: 0.6rem 0.9rem;
      background: #efe2cf;
      border-left: 4px solid #8a341c;
    }
    table { width: 100%; border-collapse: collapse; margin: 0.8rem 0 1.2rem; font-size: 0.95rem; }
    th, td { text-align: left; vertical-align: top; padding: 0.35rem 0.45rem; border-bottom: 1px solid #d9cbb6; }
    th { background: #e7d8c2; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
    .map { margin: 0.4rem 0 1.4rem; }
    .map img { width: 100%; height: auto; border: 1px solid #c4b39a; }
    .map figcaption { font-size: 0.9rem; color: #5c4c3d; text-align: center; margin-top: 0.4rem; }
    #contents + ul, #contents + ul ul { list-style: none; padding-left: 0; }
    #contents + ul ul { padding-left: 1rem; }
    @media print {
      body { max-width: none; background: white; }
      a { color: inherit; text-decoration: none; }
      h2, h3 { break-after: avoid; }
    }
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Emberheim</title>
<style>{style}</style>
</head>
<body>
{chr(10).join(body)}
</body>
</html>
"""


def add_text(paragraph, text: str, *, bold: bool = False, italic: bool = False) -> None:
    # Split **bold** and *italic* while leaving the rest intact.
    pattern = re.compile(r"(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)")
    cursor = 0
    for match in pattern.finditer(text):
        if match.start() > cursor:
            run = paragraph.add_run(text[cursor:match.start()])
            run.bold = bold
            run.italic = italic
        token = match.group(0)
        run = paragraph.add_run(token.strip("*`"))
        run.bold = bold or token.startswith("**")
        run.italic = italic or (token.startswith("*") and not token.startswith("**"))
        cursor = match.end()
    if cursor < len(text):
        run = paragraph.add_run(text[cursor:])
        run.bold = bold
        run.italic = italic


def shade_header(cell) -> None:
    tc = cell._tePr if hasattr(cell, "_tePr") else cell._tc
    tc_pr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "E7D8C2")
    shd.set(qn("w:val"), "clear")
    tc_pr.append(shd)


def markdown_to_docx(markdown: str, dest: Path) -> None:
    document = Document()
    style = document.styles["Normal"]
    style.font.name = "Palatino Linotype"
    style.font.size = Pt(12)
    style.font.color.rgb = RGBColor(0x24, 0x1C, 0x16)
    for name, size in (("Heading 1", 28), ("Heading 2", 20), ("Heading 3", 16), ("Heading 4", 13)):
        heading_style = document.styles[name]
        heading_style.font.color.rgb = RGBColor(0x3D, 0x24, 0x18)
        heading_style.font.size = Pt(size)

    table_buffer: list[list[str]] = []

    def flush_table() -> None:
        if not table_buffer:
            return
        cols = max(len(row) for row in table_buffer)
        table = document.add_table(rows=len(table_buffer), cols=cols)
        table.style = "Table Grid"
        for r_index, row in enumerate(table_buffer):
            for c_index in range(cols):
                value = row[c_index] if c_index < len(row) else ""
                cell = table.rows[r_index].cells[c_index]
                cell.text = ""
                add_text(cell.paragraphs[0], value, bold=r_index == 0)
                if r_index == 0:
                    shade_header(cell)
        table_buffer.clear()

    map_placed = False
    for raw in markdown.splitlines():
        line = raw.rstrip()
        if line.startswith("|") and line.endswith("|"):
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                continue
            table_buffer.append(cells)
            continue
        flush_table()
        if not line.strip():
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            level = len(heading.group(1))
            title = heading.group(2).strip()
            document.add_heading(title, level=level)
            if level == 1 and not map_placed and MAP.exists():
                paragraph = document.add_paragraph()
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                paragraph.add_run().add_picture(str(MAP), width=Inches(6.5))
                caption = document.add_paragraph()
                caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = caption.add_run("Emberheim in 980.")
                run.italic = True
                map_placed = True
            continue
        bullet = re.match(r"^( *)- (.+)$", line)
        if bullet:
            paragraph = document.add_paragraph(style="List Bullet")
            if len(bullet.group(1)) >= 4:
                paragraph.paragraph_format.left_indent = Inches(0.75)
            elif bullet.group(1):
                paragraph.paragraph_format.left_indent = Inches(0.4)
            add_text(paragraph, bullet.group(2).strip())
            continue
        if line.startswith("> "):
            paragraph = document.add_paragraph()
            paragraph.paragraph_format.left_indent = Inches(0.3)
            add_text(paragraph, line[2:].strip(), italic=True)
            continue
        if line.strip() == "---":
            document.add_paragraph("")
            continue
        paragraph = document.add_paragraph()
        add_text(paragraph, line.strip())
    flush_table()
    document.save(dest)


SITE_NAV = [
    ("index.html", "Home"),
    ("locations.html", "Locations"),
    ("groups.html", "Factions"),
    ("campaigns.html", "Campaigns"),
    ("people.html", "People"),
    ("reference.html", "Reference"),
    ("services.html", "Shared Services"),
    ("items.html", "Magic Items"),
    ("open.html", "Still open"),
]

H2_PAGE = {
    "historical-timeline": "index.html",
    "locations": "locations.html",
    "empire": "groups.html",
    "central": "groups.html",
    "the-west": "groups.html",
    "the-east": "groups.html",
    "the-elemental-plane-of-air-2": "groups.html",
    "campaigns": "campaigns.html",
    "people": "people.html",
    "prices": "reference.html",
    "firearms": "reference.html",
    "ships": "reference.html",
    "shared-services": "services.html",
    "magic-items": "items.html",
    "flying-boats-gear": "items.html",
    "still-open": "open.html",
}

GM_SECTIONS = {"tim", "the-elemental-plane-of-air"}
GM_PAGES = {"items.html"}


def write_site(full_html: str) -> None:
    import json
    import shutil

    site = ROOT / "site"
    site.mkdir(exist_ok=True)
    shutil.copy(MAP, site / "emberheim-map.jpg")
    inner = re.search(r"<body>(.*)</body>", full_html, re.S).group(1)
    inner = inner.replace('src="emberheim-map.jpg"', 'src="emberheim-map.jpg"')
    blocks = re.split(r"(?=<h2 id=\")", inner)
    home_bits = []
    pages: dict[str, list[str]] = {name: [] for name, _label in SITE_NAV}
    current = "index.html"
    for block in blocks:
        match = re.match(r'<h2 id="([^"]+)"', block)
        if not match:
            home_bits.append(block)
            continue
        if match.group(1) == "contents":
            continue
        dest = H2_PAGE.get(match.group(1))
        if dest is None and current in ("reference.html", "items.html"):
            dest = current
        if dest is None:
            raise SystemExit(f"No site page for heading {match.group(1)}")
        current = dest
        pages[dest].append(block)
    pages_html = {name: "".join(chunks) for name, chunks in pages.items()}

    label_of = dict(SITE_NAV)
    prepared: dict[str, str] = {}
    id_page: dict[str, str] = {}
    for name, html_text in pages_html.items():
        article = hide_gm_sections(cloak_gm(html_text), GM_SECTIONS)
        if name in GM_PAGES:
            article = f'<div class="gm-block">{article}</div>'
        prepared[name] = article
        for match in re.finditer(r'<h[2-5]\b([^>]*)>', article):
            anchor = re.search(r'id="([^"]+)"', match.group(1))
            if anchor:
                id_page[anchor.group(1)] = name

    def retarget(html_text: str, here: str) -> str:
        def repl(match: re.Match[str]) -> str:
            anchor = match.group(1)
            dest = id_page.get(anchor)
            if dest is None or dest == here:
                return f'href="#{anchor}"'
            return f'href="{dest}#{anchor}"'

        return re.sub(r'href="#([^"]+)"', repl, html_text)

    index: list[dict[str, object]] = []
    articles: dict[str, str] = {}
    for name, html_text in prepared.items():
        article = retarget(html_text, name)
        articles[name] = article
        for match in re.finditer(r'<h([2-5])\b([^>]*)>(.*?)</h\1>', article):
            level, attrs, title = match.group(1), match.group(2), match.group(3)
            anchor = re.search(r'id="([^"]+)"', attrs)
            if anchor is None:
                continue
            plain = re.sub(r"<[^>]+>", "", title)
            hidden = name in GM_PAGES or "gm-block" in attrs
            entry: dict[str, object] = {
                "t": plain,
                "u": f"{name}#{anchor.group(1)}",
                "p": label_of[name],
                "l": level,
            }
            if hidden:
                entry["g"] = 1
            index.append(entry)

    payload = json.dumps(index, ensure_ascii=False)
    for name, article in articles.items():
        if name == "index.html":
            (site / name).write_text(
                page_shell(label_of[name], name, "", article, payload, home=True),
                encoding="utf-8",
            )
            continue
        sidebar = page_sidebar(article, alphabetical=name == "people.html")
        if name in GM_PAGES and sidebar:
            sidebar = sidebar.replace("<aside>", '<aside class="gm-block">', 1)
        (site / name).write_text(
            page_shell(label_of[name], name, sidebar, article, payload),
            encoding="utf-8",
        )


def hide_gm_sections(html_text: str, anchors: set[str]) -> str:
    """Wrap a heading and everything under it until the next same-or-higher heading."""
    tokens = re.split(r"(?=<h[2-6]\b)", html_text)
    out: list[str] = []
    hiding = False
    limit = 6
    for token in tokens:
        match = re.match(r"<h([2-6])\b[^>]*id=\"([^\"]+)\"", token)
        if match:
            level = int(match.group(1))
            if hiding and level <= limit:
                hiding = False
            if match.group(2) in anchors:
                hiding = True
                limit = level
        if hiding:
            token = re.sub(
                r"(<h[2-6]\b[^>]*id=\"[^\"]+\")(?![^>]*class=)",
                r'\1 class="gm-block"',
                token,
                count=1,
            )
            token = f'<div class="gm-block">{token}</div>'
        out.append(token)
    return "".join(out)


def page_sidebar(article: str, alphabetical: bool) -> str:
    items = []
    for match in re.finditer(r'<h([3-4])\b([^>]*)>(.*?)</h\1>', article):
        level, attrs, title = int(match.group(1)), match.group(2), match.group(3)
        anchor = re.search(r'id="([^"]+)"', attrs)
        if anchor is None:
            continue
        plain = re.sub(r"<[^>]+>", "", title)
        items.append((level, anchor.group(1), plain, "gm-block" in attrs))
    if alphabetical:
        items.sort(key=lambda item: item[2].casefold())
    if not items:
        return ""
    lines = []
    for level, anchor, plain, hidden in items:
        classes = []
        if hidden:
            classes.append("gm-block")
        if level == 4:
            classes.append("sub")
        cls = " ".join(classes)
        lines.append(f'<a class="{cls}" href="#{html.escape(anchor)}">{html.escape(plain)}</a>')
    return (
        '<aside><details open><summary>On this page</summary><nav class="side">'
        + "".join(lines)
        + "</nav></details></aside>"
    )


def cloak_gm(html_text: str) -> str:
    """Hide paragraphs and list items that start at a GM. mark, or the tail of a mixed paragraph."""

    def repl(match: re.Match[str]) -> str:
        tag, attrs, inner = match.group(1), match.group(2) or "", match.group(3)
        marker = re.search(r"<strong>GM\b[^<]*</strong>", inner)
        if marker is None:
            return match.group(0)
        before = re.sub(r"<[^>]+>", "", inner[: marker.start()]).strip()
        if not before:
            if 'class="' in attrs:
                attrs = attrs.replace('class="', 'class="gm-only ', 1)
            else:
                attrs += ' class="gm-only"'
            return f"<{tag}{attrs}>{inner}</{tag}>"
        hidden = inner[: marker.start()] + '<span class="gm-only">' + inner[marker.start() :] + "</span>"
        return f"<{tag}{attrs}>{hidden}</{tag}>"

    return re.sub(r"<(p|li)(\s[^>]*)?>([\s\S]*?)</\1>", repl, html_text)


GM_BOOT = """<script>
(function () {
  var on = false;
  try { on = sessionStorage.getItem("emberheim-gm") === "1"; } catch (e) {}
  if (!on && window.name.indexOf("emberheim-gm") !== -1) on = true;
  if (on) document.documentElement.classList.add("gm");
})();
</script>
"""

GM_SLOT = """<div class="gm-slot">
    <button type="button" class="gm-lock" id="gm-lock" aria-pressed="false" aria-label="Unlock GM notes" title="Unlock GM notes">
      <svg class="when-locked" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V7zm7 12H7v-8h10v8z"/></svg>
      <svg class="when-open" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-6V7a2 2 0 1 1 4 0h2a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm0 10H7v-8h10v8z"/></svg>
    </button>
    <form class="gm-gate" id="gm-gate" hidden>
      <label for="gm-pass">GM password</label>
      <input id="gm-pass" type="password" autocomplete="off" spellcheck="false">
      <p id="gm-error" hidden>Wrong password.</p>
      <button type="submit">Unlock</button>
    </form>
  </div>"""


def page_shell(title: str, filename: str, sidebar: str, article: str, payload: str, home: bool = False) -> str:
    tabs = []
    for name, label in SITE_NAV:
        attrs = []
        if name in GM_PAGES:
            attrs.append('class="gm-nav"')
        if name == filename:
            attrs.append('aria-current="page"')
        extra = (" " + " ".join(attrs)) if attrs else ""
        tabs.append(f'<a href="{name}"{extra}>{html.escape(label)}</a>')
    if home:
        body_open = '<body class="home">'
        main = f"""<main class="map-stage">
  <img src="emberheim-map.jpg" alt="Map of Emberheim in the year 980, from Heaven's Reach to Umimura.">
</main>
<section class="home-timeline">
<article>
{article}
</article>
</section>"""
    else:
        body_open = "<body>"
        main = f"""<div class="layout">
{sidebar}
<article>
{article}
</article>
</div>"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Emberheim</title>
<link rel="stylesheet" href="site.css">
{GM_BOOT}</head>
{body_open}
<header class="top">
  <a class="brand" href="index.html">Emberheim</a>
  <nav class="tabs">{''.join(tabs)}</nav>
  <div class="find">
    <input id="find" type="search" placeholder="Find a place, person, or item" autocomplete="off">
    <div id="found" hidden></div>
  </div>
  {GM_SLOT}
</header>
{main}
<script>
const INDEX = {payload};
const input = document.querySelector("#find");
const box = document.querySelector("#found");
input.addEventListener("input", () => {{
  const q = input.value.trim().toLowerCase();
  if (q.length < 2) {{ box.hidden = true; box.innerHTML = ""; return; }}
  const gm = document.documentElement.classList.contains("gm");
  const hits = INDEX.filter((item) => item.t.toLowerCase().includes(q) && (gm || !item.g)).slice(0, 14);
  box.hidden = false;
  box.innerHTML = hits.length
    ? hits.map((hit) => `<a href="${{hit.u}}">${{hit.t}}<small>${{hit.p}}</small></a>`).join("")
    : "<p>Nothing under that name.</p>";
}});
document.addEventListener("click", (event) => {{
  if (!event.target.closest(".find")) box.hidden = true;
}});
</script>
<script src="gm.js"></script>
</body>
</html>
"""


def main() -> None:
    raw = load_chapters()
    missing = [name for name in HANDOUTS if name not in raw]
    if missing:
        raise SystemExit("Missing handouts:\n" + "\n".join(missing))
    if len(HANDOUTS) != 242:
        raise SystemExit(f"Expected 242 handout checks, found {len(HANDOUTS)}")
    entries = heading_entries(raw)
    book = insert_toc(raw, entries)
    (ROOT / "emberheim.md").write_text(book, encoding="utf-8")
    page = markdown_to_html(book, entries)
    (ROOT / "emberheim.html").write_text(page, encoding="utf-8")
    markdown_to_docx(book, ROOT / "emberheim.docx")
    write_site(page)
    print(f"Wrote Emberheim ({len(HANDOUTS)} handouts, {len(entries)} contents entries)")


if __name__ == "__main__":
    main()
