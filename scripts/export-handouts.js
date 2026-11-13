// Handout Export
// Paste this whole file into one Mod Script on a Pro or Elite campaign.
// In the game, as GM, type:
//   !exporthandouts
//   !exporthandouts The Sunken City
// The optional words are the campaign title written at the top of the export.
//
// The script reads every handout, including archived ones, and writes the
// plain text into journal handouts named "Handout Export 01", "Handout Export 02",
// and so on. Those handouts stay GM-only. Copy each one, in order, and paste it back.

/* EXPORT_HELPERS_START */
var HANDOUT_EXPORT_PREFIX = 'Handout Export ';
var HANDOUT_EXPORT_BODY_LIMIT = 40000;

function looksEncoded(text) {
    var codes = text.match(/%[0-9A-Fa-f]{2}/g);
    var spaces;
    if (!codes || !codes.length) return false;
    spaces = (text.match(/ /g) || []).length;
    if (codes.length >= 3 && spaces === 0) return true;
    if ((text.indexOf('%3C') !== -1 || text.indexOf('%3c') !== -1) && codes.length > spaces) return true;
    if (text.indexOf('%20') !== -1 && codes.length > spaces) return true;
    return false;
}

function percentDecodeOnce(text) {
    var prepared = text.replace(/\+/g, '%20');
    try {
        return decodeURIComponent(prepared);
    } catch (err) {
        try {
            return decodeURIComponent(prepared.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
        } catch (err2) {
            return text;
        }
    }
}

function decodeEntities(text) {
    var named = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        nbsp: ' '
    };
    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (all, body) {
        var code;
        var key = body.toLowerCase();
        if (body.charAt(0) === '#') {
            code = body.charAt(1) === 'x' || body.charAt(1) === 'X'
                ? parseInt(body.slice(2), 16)
                : parseInt(body.slice(1), 10);
            if (!code || code < 0 || code > 0x10ffff) return all;
            return String.fromCodePoint(code);
        }
        return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : all;
    });
}

function htmlToText(html) {
    var text = String(html || '').replace(/\r\n/g, '\n');
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/(p|div|h[1-6]|tr|blockquote|table)>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<li[^>]*>/gi, '- ');
    text = text.replace(/<[^>]+>/g, '');
    text = decodeEntities(text).replace(/\u00a0/g, ' ');
    text = text.replace(/[ \t]+\n/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

function normalizeField(raw) {
    var text = String(raw || '');
    var pass;
    for (pass = 0; pass < 2; pass++) {
        if (!looksEncoded(text)) break;
        text = percentDecodeOnce(text);
    }
    if (/<[a-z!/][^>]*>/i.test(text)) return htmlToText(text);
    return decodeEntities(text).replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').trim();
}

function formatHandout(entry) {
    var lines = [
        '===== HANDOUT ' + entry.index + ' of ' + entry.total + ' =====',
        'Name: ' + (entry.name || '(untitled)'),
        'Folder: ' + (entry.folder || '(journal root)'),
        'Archived: ' + (entry.archived ? 'yes' : 'no')
    ];
    if (entry.tags) lines.push('Tags: ' + entry.tags);
    lines.push(
        '',
        '--- Player notes ---',
        entry.notes || '(none)',
        '',
        '--- GM notes ---',
        entry.gmnotes || '(none)'
    );
    return lines.join('\n');
}

function splitOversized(block, limit) {
    var parts = [];
    var rest = block;
    var cut;
    while (rest.length > limit) {
        cut = rest.lastIndexOf('\n\n', limit);
        if (cut < Math.floor(limit * 0.5)) cut = rest.lastIndexOf('\n', limit);
        if (cut < Math.floor(limit * 0.5)) cut = limit;
        parts.push(rest.slice(0, cut));
        rest = rest.slice(cut).replace(/^\n+/, '');
    }
    if (rest) parts.push(rest);
    return parts;
}

function buildParts(blocks, limit) {
    var budget = limit || HANDOUT_EXPORT_BODY_LIMIT;
    var parts = [];
    var current = [];
    var size = 0;

    function pushCurrent() {
        if (current.length) parts.push(current.join('\n\n'));
        current = [];
        size = 0;
    }

    blocks.forEach(function (block) {
        var pieces = block.length > budget ? splitOversized(block, budget) : [block];
        pieces.forEach(function (piece) {
            if (size > 0 && size + 2 + piece.length > budget) pushCurrent();
            current.push(piece);
            size += (current.length === 1 ? 0 : 2) + piece.length;
        });
    });
    pushCurrent();
    return parts;
}

function withHeaders(parts, campaignTitle, handoutCount) {
    var total = parts.length;
    return parts.map(function (body, index) {
        return [
            'HANDOUT EXPORT',
            'Campaign: ' + campaignTitle,
            'Part: ' + (index + 1) + ' of ' + total,
            'Handouts in campaign: ' + handoutCount,
            '',
            'Paste these parts in order.',
            '',
            body
        ].join('\n');
    });
}

function textToNotesHtml(text) {
    return String(text || '').split('\n').map(function (line) {
        if (!line) return '<p><br></p>';
        return '<p>' + line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;') + '</p>';
    }).join('');
}

function isArchivedValue(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

function padPart(number) {
    return number < 10 ? '0' + number : String(number);
}
/* EXPORT_HELPERS_END */

var handoutExportBusy = false;

function handoutExportWhisper(msg, text) {
    var player = getObj('player', msg.playerid);
    var display = player ? player.get('_displayname') : '';
    if (!display) display = String(msg.who || 'GM').replace(/\s\(GM\)$/, '');
    display = String(display).replace(/"/g, '').trim() || 'GM';
    sendChat('Handout Export', '/w "' + display + '" ' + text);
}

function handoutExportTags(handout) {
    var raw;
    var parsed;
    try {
        raw = handout.get('tags');
    } catch (err) {
        return '';
    }
    if (!raw) return '';
    try {
        parsed = JSON.parse(raw);
    } catch (err2) {
        return '';
    }
    if (!Array.isArray(parsed)) return '';
    return parsed.map(function (tag) { return String(tag); }).filter(Boolean).join(', ');
}

function handoutExportBlob(obj, prop) {
    return new Promise(function (resolve) {
        obj.get(prop, function (value) {
            resolve(value || '');
        });
    });
}

function handoutExportCollect() {
    var seen = {};
    var ordered = [];
    var tree = [];
    var leftovers = [];

    try {
        tree = JSON.parse(Campaign().get('_journalfolder') || '[]');
    } catch (err) {
        tree = [];
    }
    if (!Array.isArray(tree)) tree = [];

    function remember(handout, folder) {
        var name;
        if (!handout || seen[handout.id]) return;
        name = handout.get('name') || '';
        if (name.indexOf(HANDOUT_EXPORT_PREFIX) === 0) return;
        seen[handout.id] = true;
        ordered.push({
            handout: handout,
            folder: folder || '(journal root)'
        });
    }

    function walk(items, path) {
        (items || []).forEach(function (item) {
            if (item && typeof item === 'object' && Array.isArray(item.i)) {
                walk(item.i, path.concat(item.n || 'Folder'));
                return;
            }
            if (typeof item === 'string') {
                remember(getObj('handout', item), path.length ? path.join(' / ') : '(journal root)');
            }
        });
    }

    walk(tree, []);
    findObjs({ type: 'handout' }).forEach(function (handout) {
        if (seen[handout.id]) return;
        if ((handout.get('name') || '').indexOf(HANDOUT_EXPORT_PREFIX) === 0) return;
        leftovers.push(handout);
    });
    leftovers.sort(function (a, b) {
        return (a.get('name') || '').localeCompare(b.get('name') || '');
    });
    leftovers.forEach(function (handout) {
        remember(
            handout,
            isArchivedValue(handout.get('archived')) ? 'Archived' : 'Unfiled'
        );
    });
    return ordered;
}

function handoutExportRemoveOld() {
    findObjs({ type: 'handout' }).forEach(function (handout) {
        if ((handout.get('name') || '').indexOf(HANDOUT_EXPORT_PREFIX) === 0) handout.remove();
    });
}

async function handoutExportRun(msg, campaignTitle) {
    var entries = handoutExportCollect();
    var blocks = [];
    var index;
    var entry;
    var notes;
    var gmnotes;
    var parts;
    var created = [];

    handoutExportWhisper(msg, 'Reading ' + entries.length + ' handout' + (entries.length === 1 ? '' : 's') + '.');

    for (index = 0; index < entries.length; index++) {
        entry = entries[index];
        notes = normalizeField(await handoutExportBlob(entry.handout, 'notes'));
        gmnotes = normalizeField(await handoutExportBlob(entry.handout, 'gmnotes'));
        blocks.push(formatHandout({
            index: index + 1,
            total: entries.length,
            name: entry.handout.get('name') || '(untitled)',
            folder: entry.folder,
            archived: isArchivedValue(entry.handout.get('archived')),
            tags: handoutExportTags(entry.handout),
            notes: notes,
            gmnotes: gmnotes
        }));
    }

    parts = withHeaders(
        blocks.length ? buildParts(blocks, HANDOUT_EXPORT_BODY_LIMIT) : ['No handouts were found.'],
        campaignTitle,
        entries.length
    );

    handoutExportRemoveOld();
    parts.forEach(function (part, partIndex) {
        var handout = createObj('handout', {
            name: HANDOUT_EXPORT_PREFIX + padPart(partIndex + 1),
            inplayerjournals: '',
            archived: false
        });
        handout.set('notes', textToNotesHtml(part));
        created.push(handout.get('name'));
    });

    log('Handout Export wrote ' + created.join(', ') + ' from ' + entries.length + ' handouts.');
    handoutExportWhisper(
        msg,
        'Ready. In the journal, search for Handout Export. Open part 01, click inside Description & Notes, select all, and copy. '
        + 'If a part opens blank, close it and open it again. Copy each later part the same way, in order. '
        + (created.length === 1 ? 'There is 1 part.' : 'There are ' + created.length + ' parts.')
    );
}

on('chat:message', function (msg) {
    var title;
    if (msg.type !== 'api' || !/^!exporthandouts\b/i.test(msg.content || '')) return;
    if (!playerIsGM(msg.playerid)) {
        handoutExportWhisper(msg, 'Only a GM can export handouts.');
        return;
    }
    if (handoutExportBusy) {
        handoutExportWhisper(msg, 'An export is already running.');
        return;
    }
    title = String(msg.content || '').replace(/^!exporthandouts\b/i, '').trim() || '(no title given)';
    handoutExportBusy = true;
    handoutExportRun(msg, title).then(function () {
        handoutExportBusy = false;
    }).catch(function (err) {
        handoutExportBusy = false;
        log('Handout Export failed');
        log(err && err.stack ? err.stack : err);
        handoutExportWhisper(msg, 'Export failed. Check the Mod Scripts API console for the error.');
    });
});
