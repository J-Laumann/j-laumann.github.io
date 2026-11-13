# Emberheim

The local site is `docs/emberheim/site/index.html`. Open that file in a browser. The home page is the map of Emberheim in 980, filling the screen under the bar. That bar stays on every page: Home, Locations, Factions, Campaigns, People, Reference, and Still open. The search box jumps to a heading. Copy the whole `site` folder wherever you want to keep it. It does not need a server.

The same book is also `docs/emberheim/emberheim.html` and `docs/emberheim/emberheim.docx`. The map is the present year, 980. Weird West and Lost City are 971. Rex Refund and Scorpion Jack missed the Lost City of Gold. Flying Boats and From Brews to Bullion are both 980. Brews is the current party. Locations come first. Factions follow as Empire, Central, the West, the East, and the Elemental Plane of Air, then Campaigns.

`docs/emberheim/emberheim.docx` is the same book for Google Drive. Upload it and open it with Google Docs. The headings are already marked, so Docs can build its own contents list from Insert, Table of contents. The written contents are already at the top of the file.

Chapters live in `docs/emberheim/chapters/`. After a new campaign is merged, rebuild with:

```bash
python3 docs/emberheim/build.py
```

# Roll20 handout export

Roll20 has no button that copies every handout out of the External Journal. Each handout is its own page. This script runs inside one campaign and writes all of that campaign's handout text into one or more new journal handouts you can select and copy.

It reads player notes and GM notes, including archived handouts, and keeps the export visible only to the GM.

## Requirements

The game's creator needs a Roll20 Pro or Elite subscription. Mod Scripts do not run on Free or Plus. You also have to be a GM in that game, and the game has to be open so the script sandbox is running.

## Install

1. Open the game's details page.
2. Open **Settings → Mod Scripts**.
3. Create a script named `Handout Export`.
4. Paste the contents of `scripts/export-handouts.js`.
5. Save the script.
6. Launch the game.

## Export

In chat, as a GM:

```text
!exporthandouts The Sunken City
```

The words after the command are the campaign title written at the top of the export. Leave them off and the title is `(no title given)`.

When chat says the export is ready:

1. Open the Journal and search for `Handout Export`.
2. Open `Handout Export 01`.
3. Click inside **Description & Notes**. If that box is blank, close the handout and open it again.
4. Select all of that text and copy it.
5. Repeat for `Handout Export 02` and any later parts, in order.

Running the command again replaces those export handouts. It does not change your original handouts.

The same script has to be installed separately in each campaign. Paste each campaign's copied text back in order, and say which campaign it came from if the title line is missing.

## Check the text cleanup locally

```bash
node scripts/export-handouts.test.js
```

That checks decoding and splitting only. It does not talk to Roll20.
