import * as fs from 'fs';

const path = 'frontend/src/core/integrations/supabase/types.ts';
let content = fs.readFileSync(path, 'utf8');

// Find all occurrences of Update: ...; or Update: { ... }; and append Relationships: []; if not present
// It's safer to just look for the end of the table block.
// A table block ends with something like:
// Update: ...;
// };
// Let's replace `Update: (.*?);(\s*)\};` with `Update: $1;$2Relationships: [];$2};`
// But we need to be careful with multi-line Update blocks.

// A better way: split by lines, look for `        Update: `
// We can just add `        Relationships: [];` before the closing `      };` of each table.
// The indentation is exactly 6 spaces for `      table_name: {` and 8 spaces for `        Relationships: [];`

let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s{6}\};/)) { // End of a table block
        // check if previous lines have Relationships
        let hasRelationships = false;
        for (let j = i - 1; j >= 0; j--) {
            if (lines[j].match(/^\s{6}\w+: \{/)) break; // Start of the table block
            if (lines[j].match(/Relationships:/)) {
                hasRelationships = true;
                break;
            }
        }
        if (!hasRelationships) {
            lines.splice(i, 0, '        Relationships: [];');
            i++; // skip the newly inserted line
        }
    }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Fixed types.ts');