// 家族映射诊断：列出某册「家族正则 → 匹配到的考点」，用于检查考点错配与覆盖缺口
// 用法：node scripts/fam-map.mjs bsd-grade6-up
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const tags = JSON.parse(fs.readFileSync(path.join(root, 'data/tags-bsd.json'), 'utf8'));
const lines = fs.readFileSync(path.join(root, 'scripts/gen-questions-bsd.mjs'), 'utf8').split(/\r?\n/);

// 行扫描：记录当前所处的 FAMS['book'] 段，收集段内的 re: /.../
const byBook = {};
let cur = '';
for (const line of lines) {
  const mark = line.indexOf("FAMS['");
  if (mark >= 0 && (line.includes('] = [') || line.includes('].push('))) {
    const q1 = line.indexOf("'", mark);
    const q2 = line.indexOf("'", q1 + 1);
    cur = line.slice(q1 + 1, q2);
    if (!byBook[cur]) byBook[cur] = [];
    continue;
  }
  const at = line.indexOf('re: /');
  if (at >= 0 && cur) {
    const start = at + 5;
    for (let i = start; i < line.length; i++) {
      if (line[i] === '/' && line[i - 1] !== '\\') {
        const rest = line.slice(i + 1).trim();
        if (rest.startsWith(',')) { byBook[cur].push(line.slice(start, i)); break; }
      }
    }
  }
}

const target = process.argv[2];
if (!target) {
  console.log('用法：node scripts/fam-map.mjs <bookId>，可选 bookId：');
  console.log(tags.books.map((b) => '  ' + b.id).join('\n'));
  process.exit(0);
}

const pts = tags.points.filter((p) => p.book === target);
const fams = byBook[target] || [];
console.log(`=== ${target}：${fams.length} 个家族正则，${pts.length} 个考点 ===`);
for (const r of fams) {
  let re;
  try { re = new RegExp(r); } catch { console.log(`/[语法错误]/ ${r}`); continue; }
  const hits = pts.filter((p) => re.test(p.name)).map((p) => p.name);
  console.log(`/${r}/  (${hits.length})`);
  for (const h of hits) console.log('    -> ' + h);
}
console.log('\n--- 无家族匹配的考点（会导致未覆盖）---');
let gap = 0;
for (const p of pts) {
  const ok = fams.some((r) => { try { return new RegExp(r).test(p.name); } catch { return false; } });
  if (!ok) { gap++; console.log('  [X] ' + p.name); }
}
if (!gap) console.log('  （无）');
