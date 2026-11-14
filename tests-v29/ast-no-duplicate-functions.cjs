#!/usr/bin/env node
/**
 * Regression: top-level FunctionDeclaration names must be unique.
 * Local/inner FunctionExpressions may reuse short names (g, go, etc.).
 */
const fs = require('fs');
const path = require('path');

let acorn;
try { acorn = require(require('path').join(__dirname, '..', 'node_modules', 'acorn')); }
catch (e) {
  try { acorn = require('/tmp/acorn-pkg/node_modules/acorn'); }
  catch (e1) {
    try { acorn = require('acorn'); }
    catch (e2) {
      try { acorn = require('/usr/local/slides_js/node_modules/acorn'); }
      catch (e3) { console.error('acorn required (run npm install)'); process.exit(1); }
    }
  }
}

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let main = '', m;
while ((m = re.exec(html))) if (m[1].length > main.length) main = m[1];

const ast = acorn.parse(main, {
  ecmaVersion: 2022,
  locations: true,
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true
});

const decls = {};
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && node.id) {
    const name = node.id.name;
    if (!decls[name]) decls[name] = [];
    decls[name].push(node.loc.start.line);
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object' && v.type) walk(v);
  }
}
walk(ast);

const dups = Object.entries(decls).filter(([, lines]) => lines.length > 1);
console.log('Top-level FunctionDeclaration unique names:', Object.keys(decls).length);
console.log('Top-level FunctionDeclaration total:', Object.values(decls).reduce((s, a) => s + a.length, 0));

if (dups.length) {
  console.log('FAIL — duplicate FunctionDeclarations:');
  dups.forEach(([n, lines]) => console.log('  ' + n + ' at script lines ' + lines.join(', ')));
  process.exit(1);
}
console.log('PASS — no duplicate top-level FunctionDeclaration names');
process.exit(0);
