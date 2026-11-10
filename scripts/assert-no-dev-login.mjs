// Fails the build if a SIT/prod bundle would enable the dev-login persona picker.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'dist/localgo/browser';
const bad = [/allowDevLogin:\s*(!0|true)\b/, /httpConsoleLog:\s*(!0|true)\b/];
let checked = 0;
let found = false;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  checked++;
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const re of bad) {
    const m = src.match(re);
    if (m) {
      console.error(`ERROR: ${f} contains "${m[0]}" — SIT/prod must not ship dev login / console log`);
      found = true;
    }
  }
}
if (!checked) {
  console.error(`ERROR: no .js files in ${dir}`);
  process.exit(1);
}
if (found) process.exit(1);
console.log(`OK: ${checked} JS files checked — no allowDevLogin/httpConsoleLog enabled`);
