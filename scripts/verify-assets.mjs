// 校验 HTML 中引用的本地资源是否都存在（离线可运行性的静态检查）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const htmls = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let missing = 0, checked = 0;
const re = /(?:src|href)\s*=\s*["']([^"'#?]+)["']/g;

for (const h of htmls) {
  const txt = fs.readFileSync(path.join(root, h), 'utf8');
  let m;
  while ((m = re.exec(txt))) {
    const url = m[1];
    if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) continue;
    checked++;
    const p = path.join(root, url);
    if (!fs.existsSync(p)) { missing++; console.log(`✗ ${h} → ${url} 不存在`); }
  }
}

// 反向检查：页面是否都引用了必要的 core 模块
const required = ['js/core/loader.js', 'js/core/storage.js', 'js/core/tags.js', 'js/core/bank.js',
  'js/core/grader.js', 'js/core/plugins.js', 'js/core/builder.js', 'js/core/media.js', 'js/core/ai.js',
  'js/ui/math.js', 'js/ui/toast.js', 'js/ui/charts.js', 'js/ui/render.js', 'js/ui/shell.js',
  'vendor/katex/katex.min.js', 'vendor/echarts/echarts.min.js', 'data/tags.js'];
for (const h of htmls) {
  const txt = fs.readFileSync(path.join(root, h), 'utf8');
  required.forEach((r) => {
    if (txt.indexOf(r) < 0) { missing++; console.log(`✗ ${h} 缺少引用 ${r}`); }
  });
}

// KaTeX 字体是否齐全
const css = fs.readFileSync(path.join(root, 'vendor/katex/katex.min.css'), 'utf8');
const fonts = [...new Set([...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((x) => x[1].replace(/['"]/g, '')))];
fonts.forEach((f) => {
  checked++;
  if (!fs.existsSync(path.join(root, 'vendor/katex', f))) { missing++; console.log(`✗ KaTeX 字体缺失 ${f}`); }
});

console.log(`\n已检查 ${checked} 个资源引用 + ${fonts.length} 个字体；缺失 ${missing} 项`);
process.exit(missing ? 1 : 0);
