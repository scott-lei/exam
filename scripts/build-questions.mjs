// 构建 12 册题库文件 data/questions/gradeN-up|down.json（+ .js 兜底）并做完整性校验
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOWER } from './data/questions-lower.mjs';
import { MIDDLE } from './data/questions-middle.mjs';
import { UPPER } from './data/questions-upper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tags = JSON.parse(fs.readFileSync(path.join(root, 'data/tags.json'), 'utf8'));

const ALL = { ...LOWER, ...MIDDLE, ...UPPER };
const pointById = new Map(tags.points.map((p) => [p.id, p]));
const knowledgeById = new Map(tags.knowledge.map((k) => [k.id, k]));
const domainById = new Map(tags.domains.map((d) => [d.id, d]));
const AUTO_TYPES = new Set(tags.questionTypes.filter((t) => t.auto).map((t) => t.id));

const outDir = path.join(root, 'data/questions');
fs.mkdirSync(outDir, { recursive: true });

let totalQuestions = 0;
const report = [];
const errors = [];
const widened = [];

for (const book of tags.books) {
  const raw = ALL[book.id];
  if (!raw) { errors.push(`${book.id} 缺少题库`); continue; }

  const list = raw.map((q, i) => {
    const pt = pointById.get(q.p);
    if (!pt) { errors.push(`${book.id} 第 ${i + 1} 题引用了不存在的考点 ${q.p}`); return null; }
    const kn = knowledgeById.get(pt.knowledge);
    const dm = domainById.get(pt.domain);
    if (!AUTO_TYPES.has(q.type) && q.type !== 'draw') {
      errors.push(`${book.id} 第 ${i + 1} 题题型非法：${q.type}`);
    }
    if (!pt.suitableTypes.includes(q.type) && q.type !== 'draw') {
      // 示例题实际用到的题型自动并入考点的 suitableTypes，保证组卷时可被命中
      pt.suitableTypes.push(q.type);
      widened.push(`${pt.id}(${pt.name}) += ${q.type}`);
    }
    return {
      id: `${book.code}-Q${String(i + 1).padStart(3, '0')}`,
      grade: book.grade,
      book: book.id,
      bookName: book.name,
      domain: pt.domain,
      domainName: dm ? dm.name : pt.domain,
      knowledge: pt.knowledge,
      knowledgeName: kn ? kn.name : '',
      point: pt.id,
      pointName: pt.name,
      topics: [pt.id],
      pointType: pt.type,
      type: q.type,
      difficulty: q.difficulty,
      score: q.score,
      stem: q.stem,
      options: q.options || null,
      answer: q.answer,
      analysis: q.analysis || '',
      tags: [book.name, dm ? dm.name : pt.domain, kn ? kn.name : '', pt.name].filter(Boolean),
      media: q.media || { type: 'none' },
      extend: {
        source: '内置示例题库',
        autoGraded: q.type !== 'draw',
        tolerance: 0,
        ...(q.extend || {}),
      },
    };
  }).filter(Boolean);

  if (list.length < 10) errors.push(`${book.id} 只有 ${list.length} 道题，少于 10 道`);

  const payload = {
    version: '1.0.0',
    book: book.id,
    bookName: book.name,
    grade: book.grade,
    term: book.term,
    count: list.length,
    typeStat: list.reduce((m, q) => ((m[q.type] = (m[q.type] || 0) + 1), m), {}),
    questions: list,
  };

  fs.writeFileSync(path.join(outDir, `${book.id}.json`), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(outDir, `${book.id}.js`),
    `/* 自动生成，请勿手工修改。源文件：data/questions/${book.id}.json */\nwindow.__MATH_BANK__ = window.__MATH_BANK__ || {};\nwindow.__MATH_BANK__["${book.id}"] = ` + JSON.stringify(payload) + ';\n',
    'utf8'
  );
  totalQuestions += list.length;
  report.push(`${book.short}  ${list.length} 题  ${Object.entries(payload.typeStat).map(([k, v]) => `${k}×${v}`).join(' ')}`);
}

console.log(report.join('\n'));
console.log(`\n题库合计 ${totalQuestions} 题；自动扩充 suitableTypes ${widened.length} 处`);

// 回写 tags.json / tags.js，保证「考点 suitableTypes」与题库实际题型一致
if (widened.length) {
  fs.writeFileSync(path.join(root, 'data/tags.json'), JSON.stringify(tags, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(root, 'data/tags.js'),
    '/* 自动生成，请勿手工修改。源文件：data/tags.json */\nwindow.__MATH_TAGS__ = ' + JSON.stringify(tags) + ';\n',
    'utf8'
  );
}

if (errors.length) { console.error('\n错误：\n' + errors.join('\n')); process.exit(1); }
console.log('OK');
