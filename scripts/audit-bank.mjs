/* ============================================================
 * audit-bank.mjs —— 题库体检：题量与覆盖报表 + 缺口表 + 问题清单（卡 9）
 * 起点：OPTIMIZATION-PLAN.md 附录 A 的脚本，按卡 9 要求扩展。
 *
 * 运行：node scripts/audit-bank.mjs
 *      可用 VERSION=rj|bsd 选择教材版本（默认 rj，与构建脚本一致）。
 * 产物：控制台打印三张表 + 写入 data/audit-report.md。
 * 退出码：任一阈值不达标或存在数据问题 → 1；全部达标 → 打印 OK 并返回 0。
 *
 * 三张表：
 *   表① 册级汇总     —— 每册题量、缺口、考点覆盖、题型分布、难度分布
 *   表② 知识点缺口   —— 每个二级知识点题量与目标（PER_KNOW_MIN）的差距
 *   表③ 问题清单     —— 答案为空 / 解析过短 / 题干重复 / 考点不存在 / 文件缺失
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/* ---------- 可配置阈值（卡 9：置顶，扩题规划时只改这里） ---------- */
const PER_BOOK_MIN = 50;   // 每册题量下限
const PER_KNOW_MIN = 6;    // 每个二级知识点题量下限
const ANALYSIS_MIN = 20;   // 解析最短字数

/* ---------- 教材版本（rj 默认 | bsd，与 build-tags / build-questions 一致） ---------- */
const VERSION = String(process.env.VERSION || 'rj').toLowerCase();
if (VERSION !== 'rj' && VERSION !== 'bsd') {
  console.error(`!! 未知 VERSION="${process.env.VERSION}"，可选值：rj | bsd`);
  process.exit(1);
}
const VNAME = VERSION === 'bsd' ? '北师大版' : '人教版';
const tagsFile = VERSION === 'bsd' ? 'data/tags-bsd.json' : 'data/tags.json';
const questionDir = VERSION === 'bsd' ? 'data/questions-bsd' : 'data/questions';

const tags = JSON.parse(fs.readFileSync(path.join(root, tagsFile), 'utf8'));
const ptById = new Map(tags.points.map((p) => [p.id, p]));
const domName = new Map(tags.domains.map((d) => [d.id, d.name]));
const typeOrder = tags.questionTypes.map((t) => t.id);

/* ---------- 采集 ---------- */
const problems = [];        // 表③：数据问题 {type, loc, detail}（按发现顺序）
const seenStem = new Map(); // 题干去重（全局，忽略空白）
const knowCount = new Map();// 二级知识点 id -> 题量
const bookRows = [];        // 表①
let total = 0;
let coveredPts = 0;

/** 答案为空判定：null / 空串 / 空数组 / 空对象 / blanks|index|regions|subs 为空数组 */
function isEmptyAnswer(ans) {
  if (!ans) return true;
  if (typeof ans === 'string') return ans.trim() === '';
  if (Array.isArray(ans)) return ans.length === 0;
  if (typeof ans === 'object') {
    if (Object.keys(ans).length === 0) return true;
    if (Array.isArray(ans.blanks) && ans.blanks.length === 0) return true;
    if (Array.isArray(ans.index) && ans.index.length === 0) return true;
    if (Array.isArray(ans.regions) && ans.regions.length === 0) return true;
    if (Array.isArray(ans.subs) && ans.subs.length === 0) return true;
  }
  return false;
}

function statStr(map) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}×${v}`)
    .join(' ');
}

for (const book of tags.books) {
  const file = path.join(root, questionDir, `${book.id}.json`);
  const row = {
    id: book.id, short: book.short, name: book.name, count: 0,
    covered: 0, pointTotal: book.pointCount,
    byType: {}, byDiff: {}, missing: false
  };
  bookRows.push(row);

  if (!fs.existsSync(file)) {
    row.missing = true;
    problems.push({ type: '文件缺失', loc: book.short, detail: `题库文件缺失：${questionDir}/${book.id}.json` });
    continue;
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  row.count = json.questions.length;
  total += row.count;

  const byPoint = new Set();
  const byKnow = new Map();
  json.questions.forEach((q, i) => {
    const loc = `${book.short} 第 ${i + 1} 题（${q.id}）`;
    const pt = ptById.get(q.point);
    if (!pt) {
      problems.push({ type: '考点不存在', loc, detail: `考点 ${q.point} 不存在于标签体系` });
    } else {
      byPoint.add(q.point);
      const kn = pt.knowledge;
      byKnow.set(kn, (byKnow.get(kn) || 0) + 1);
      knowCount.set(kn, (knowCount.get(kn) || 0) + 1);
    }
    row.byType[q.type] = (row.byType[q.type] || 0) + 1;
    row.byDiff[q.difficulty] = (row.byDiff[q.difficulty] || 0) + 1;
    if (isEmptyAnswer(q.answer)) problems.push({ type: '答案为空', loc, detail: 'answer 为空或空结构' });
    if (!q.analysis || String(q.analysis).length < ANALYSIS_MIN) {
      problems.push({ type: '解析过短', loc, detail: `解析 ${(q.analysis || '').length} 字 < ${ANALYSIS_MIN} 字` });
    }
    const key = String(q.stem || '').replace(/\s+/g, '');
    if (seenStem.has(key)) problems.push({ type: '题干重复', loc, detail: `与 ${seenStem.get(key)} 题干重复` });
    else seenStem.set(key, `${book.short} ${q.id}`);
  });
  row.covered = byPoint.size;
  coveredPts += byPoint.size;
}

/* ---------- 表②：每个二级知识点的题量缺口（按册次顺序） ---------- */
const knowRows = tags.knowledge.map((k) => {
  const count = knowCount.get(k.id) || 0;
  return {
    book: k.book, short: bookRows.find((b) => b.id === k.book)?.short || k.bookCode,
    name: k.name, domain: domName.get(k.domain) || k.domain,
    count, gap: Math.max(0, PER_KNOW_MIN - count)
  };
});

/* ---------- 结论 ---------- */
const bookFails = bookRows.filter((r) => r.count < PER_BOOK_MIN);
const knowFails = knowRows.filter((r) => r.count < PER_KNOW_MIN);
const knowGapTotal = knowRows.reduce((s, r) => s + r.gap, 0);
const bookGapTotal = bookRows.reduce((s, r) => s + Math.max(0, PER_BOOK_MIN - r.count), 0);
const failed = bookFails.length > 0 || knowFails.length > 0 || problems.length > 0;
const rate = tags.points.length ? ((coveredPts / tags.points.length) * 100).toFixed(1) : '0.0';

/* ---------- 控制台输出 ---------- */
console.log(`题库体检（${VNAME}，VERSION=${VERSION}）  数据源：${tagsFile} + ${questionDir}/`);
console.log(`阈值：每册 ≥ ${PER_BOOK_MIN} 题 · 每二级知识点 ≥ ${PER_KNOW_MIN} 题 · 解析 ≥ ${ANALYSIS_MIN} 字\n`);

console.log('表① 册级汇总');
console.log('册次  题量            缺口       覆盖考点      题型分布 / 难度分布');
for (const r of bookRows) {
  const mark = r.count >= PER_BOOK_MIN ? '✓' : '✗';
  const gap = r.count >= PER_BOOK_MIN ? '—' : `差 ${PER_BOOK_MIN - r.count} 题`;
  console.log(
    `${r.short}  ${String(r.count).padStart(4)} ${mark}  ${gap.padEnd(10)}` +
    `${r.covered}/${r.pointTotal}（${r.pointTotal ? ((r.covered / r.pointTotal) * 100).toFixed(0) : 0}%）`.padEnd(16) +
    `${statStr(r.byType) || '—'}  |  ${statStr(r.byDiff) || '—'}`
  );
}

console.log(`\n表② 二级知识点题量缺口（目标 ≥ ${PER_KNOW_MIN} 题/知识点，共 ${knowRows.length} 个）`);
console.log('册次  二级知识点                领域        题量  缺口');
for (const r of knowRows) {
  console.log(`${r.short}  ${r.name.slice(0, 22).padEnd(22)}  ${r.domain.slice(0, 8).padEnd(8)}  ${String(r.count).padStart(3)}  ${r.gap ? '差 ' + r.gap + ' 题' : '达标'}`);
}

console.log(`\n表③ 问题清单（共 ${problems.length} 个）`);
if (problems.length) problems.forEach((p, i) => console.log(`${i + 1}. [${p.type}] ${p.loc}：${p.detail}`));
else console.log('（无）');

console.log(`\n合计 ${total} 题 / ${tags.points.length} 考点 / 覆盖 ${coveredPts}（${rate}%）`);
console.log(`册级缺口 ${bookFails.length} 册共 ${bookGapTotal} 题：${bookFails.map((r) => `${r.short}缺 ${PER_BOOK_MIN - r.count} 题`).join('，') || '无'}`);
console.log(`知识点缺口 ${knowFails.length}/${knowRows.length} 个共 ${knowGapTotal} 题`);

/* ---------- 写入 data/audit-report.md（无论是否达标都生成，供扩题规划） ---------- */
const now = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const genTime = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
const md = [];
md.push(`# 题库体检报告（${VNAME}）`);
md.push('');
md.push(`- 生成时间：${genTime}（由 scripts/audit-bank.mjs 自动生成，请勿手工修改）`);
md.push(`- 数据源：\`${tagsFile}\` + \`${questionDir}/\`（${tags.books.length} 册 · ${tags.points.length} 考点 · ${tags.knowledge.length} 个二级知识点）`);
md.push(`- 阈值：每册 ≥ ${PER_BOOK_MIN} 题 · 每二级知识点 ≥ ${PER_KNOW_MIN} 题 · 解析 ≥ ${ANALYSIS_MIN} 字`);
md.push(`- **结论：${failed ? '未达标' : '达标'}** —— 册级缺口 ${bookFails.length} 册（共 ${bookGapTotal} 题）/ 知识点缺口 ${knowFails.length} 个（共 ${knowGapTotal} 题）/ 数据问题 ${problems.length} 个`);
md.push('');
md.push(`## 表① 册级汇总`);
md.push('');
md.push('| 册次 | 题量 | 缺口 | 覆盖考点 | 题型分布 | 难度分布 |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const r of bookRows) {
  const gap = r.count >= PER_BOOK_MIN ? '—' : `差 ${PER_BOOK_MIN - r.count} 题`;
  const rateCell = r.pointTotal ? `${r.covered}/${r.pointTotal}（${((r.covered / r.pointTotal) * 100).toFixed(1)}%）` : '—';
  md.push(`| ${r.short} | ${r.count}${r.missing ? '（文件缺失）' : ''} | ${gap} | ${rateCell} | ${statStr(r.byType) || '—'} | ${statStr(r.byDiff) || '—'} |`);
}
md.push('');
md.push(`## 表② 二级知识点题量缺口（目标 ≥ ${PER_KNOW_MIN} 题/知识点）`);
md.push('');
md.push('| 册次 | 二级知识点 | 领域 | 题量 | 缺口 |');
md.push('| --- | --- | --- | --- | --- |');
for (const r of knowRows) {
  md.push(`| ${r.short} | ${r.name} | ${r.domain} | ${r.count} | ${r.gap ? `差 ${r.gap} 题` : '达标'} |`);
}
md.push('');
md.push(`## 表③ 问题清单（答案为空 / 解析 < ${ANALYSIS_MIN} 字 / 题干重复 / 考点不存在）`);
md.push('');
if (problems.length) {
  md.push('| # | 类型 | 位置 | 详情 |');
  md.push('| --- | --- | --- | --- |');
  problems.forEach((p, i) => {
    md.push(`| ${i + 1} | ${p.type} | ${p.loc} | ${p.detail} |`);
  });
} else {
  md.push('（无）');
}
md.push('');
md.push(`---`);
md.push(`合计 ${total} 题 / ${tags.points.length} 考点 / 覆盖 ${coveredPts}（${rate}%）。` +
  `册级缺口 ${bookFails.length} 册共 ${bookGapTotal} 题；知识点缺口 ${knowFails.length}/${knowRows.length} 个共 ${knowGapTotal} 题。` +
  (failed ? '**未达标，退出码 1。**' : '达标，退出码 0。'));

fs.writeFileSync(path.join(root, 'data/audit-report.md'), md.join('\n') + '\n', 'utf8');
console.log(`\n已写入 data/audit-report.md`);

if (failed) {
  console.error(`\n未达标：册级 ${bookFails.length} 项 / 知识点 ${knowFails.length} 项 / 数据问题 ${problems.length} 项`);
  process.exit(1);
}
console.log('OK');
