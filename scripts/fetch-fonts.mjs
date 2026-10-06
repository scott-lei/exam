// 下载 KaTeX 依赖的 woff2 字体到 vendor/katex/fonts，保证离线可用
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'vendor/katex/katex.min.css');
const fontDir = path.join(root, 'vendor/katex/fonts');

const css = fs.readFileSync(cssPath, 'utf8');
const urls = [...new Set([...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1].replace(/['"]/g, '')))];
console.log('found fonts:', urls.length);

const base = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';
for (const u of urls) {
  const name = path.basename(u);
  const dest = path.join(fontDir, name);
  if (fs.existsSync(dest)) continue;
  const full = u.startsWith('http') ? u : base + u.replace(/^\.\//, '');
  const res = await fetch(full);
  if (!res.ok) { console.error('FAIL', name, res.status); continue; }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log('ok', name);
}
console.log('done');
