#!/usr/bin/env node
/**
 * ES module dynamic imports resolve relative to the document URL, not <base href>.
 * Deep links like /requester/post would request /requester/chunk-*.js and get
 * index.html (wrong MIME). Rewrite built assets to root-absolute paths.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist/localgo/browser');
if (!fs.existsSync(root)) {
  console.error(`absolutize-assets: missing ${root}`);
  process.exit(1);
}

function rewriteHtml(file) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(
    /(href|src)="(?!\/|https?:|data:)([^"]+\.(?:js|css|ico|png|svg|webp|woff2?))"/g,
    (_, attr, asset) => `${attr}="/${asset}"`,
  );
  if (html !== before) {
    fs.writeFileSync(file, html);
    console.log(`absolutize-assets: patched ${path.basename(file)}`);
  }
}

function rewriteJs(file) {
  let code = fs.readFileSync(file, 'utf8');
  const before = code;
  // "./chunk-XXX.js" → "/chunk-XXX.js"
  code = code.replace(/(["'])\.\/(chunk-[A-Z0-9]+\.js)\1/g, '$1/$2$1');
  // import("chunk-XXX.js") → import("/chunk-XXX.js")
  code = code.replace(/import\((["'])(?!\/)(chunk-[A-Z0-9]+\.js)\1\)/g, 'import($1/$2$1)');
  if (code !== before) {
    fs.writeFileSync(file, code);
    console.log(`absolutize-assets: patched ${path.basename(file)}`);
  }
}

rewriteHtml(path.join(root, 'index.html'));
for (const name of fs.readdirSync(root)) {
  if (name.endsWith('.js')) {
    rewriteJs(path.join(root, name));
  }
}
console.log('absolutize-assets: done');
