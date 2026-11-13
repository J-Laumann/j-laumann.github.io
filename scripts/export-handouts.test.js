const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'export-handouts.js'), 'utf8');
const start = source.indexOf('/* EXPORT_HELPERS_START */');
const end = source.indexOf('/* EXPORT_HELPERS_END */');
assert.notStrictEqual(start, -1);
assert.notStrictEqual(end, -1);

const helpers = new Function(
    source.slice(start, end) + `
        return {
            looksEncoded,
            normalizeField,
            htmlToText,
            formatHandout,
            buildParts,
            withHeaders,
            textToNotesHtml,
            isArchivedValue,
            padPart
        };
    `
)();

const wikiSample = 'Erik%20%28Viking%2BScientist%29%20%5BFighter%3A%203%2C%20Wizard%3A%202%5D';
assert.strictEqual(
    helpers.normalizeField(wikiSample),
    'Erik (Viking+Scientist) [Fighter: 3, Wizard: 2]'
);

assert.strictEqual(helpers.normalizeField('caf%C3%A9%20notes'), 'café notes');

assert.strictEqual(
    helpers.normalizeField('%253Cp%253EDouble%2520encoded%253C%252Fp%253E'),
    'Double encoded'
);

assert.strictEqual(
    helpers.htmlToText('<p>Hello</p><p>World</p><ul><li>One</li><li>Two &amp; three</li></ul>'),
    'Hello\nWorld\n- One\n- Two & three'
);

assert.strictEqual(
    helpers.normalizeField('<p>Already decoded</p><br>next'),
    'Already decoded\n\nnext'
);

assert.strictEqual(helpers.normalizeField('Save 20% of your gold'), 'Save 20% of your gold');
assert.strictEqual(helpers.looksEncoded('Save 20% of your gold'), false);

const formatted = helpers.formatHandout({
    index: 1,
    total: 2,
    name: 'Ledger',
    folder: 'City / Docks',
    archived: false,
    tags: 'clue',
    notes: 'The harbormaster lied.',
    gmnotes: ''
});
assert.ok(formatted.includes('===== HANDOUT 1 of 2 ====='));
assert.ok(formatted.includes('Folder: City / Docks'));
assert.ok(formatted.includes('Tags: clue'));
assert.ok(formatted.includes('--- GM notes ---\n(none)'));

const blocks = ['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(80)];
const parts = helpers.buildParts(blocks, 70);
assert.strictEqual(parts.length, 3);
assert.strictEqual(parts[0], 'a'.repeat(30) + '\n\n' + 'b'.repeat(30));
assert.ok(parts[1].startsWith('c'));
assert.strictEqual(parts[1].length + parts[2].length, 80);

const headed = helpers.withHeaders(['body'], 'Sunken City', 4);
assert.ok(headed[0].startsWith('HANDOUT EXPORT\nCampaign: Sunken City\nPart: 1 of 1'));
assert.ok(headed[0].endsWith('body'));

const html = helpers.textToNotesHtml('Tom & Jerry\n\n<draft>');
assert.strictEqual(
    html,
    '<p>Tom &amp; Jerry</p><p><br></p><p>&lt;draft&gt;</p>'
);

assert.strictEqual(helpers.isArchivedValue('true'), true);
assert.strictEqual(helpers.isArchivedValue(false), false);
assert.strictEqual(helpers.padPart(1), '01');
assert.strictEqual(helpers.padPart(12), '12');

console.log('export-handouts tests passed');
