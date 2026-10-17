// 构建题库文件 —— 人教版 data/questions/ / 北师大版 data/questions-bsd/ 下 <bookId>.json（+ .js 兜底）并做完整性校验
// 版本由环境变量 VERSION 决定：rj（默认）| bsd。
// 注意：北师大版题库尚未建设，bsd 分支生成 12 个占位空文件（count 0），组卷时会诚实提示无题。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOWER } from './data/questions-lower.mjs';
import { MIDDLE } from './data/questions-middle.mjs';
import { UPPER } from './data/questions-upper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ---- 教材版本（卡 8）：VERSION=rj|bsd，默认 rj ----
const VERSION = String(process.env.VERSION || 'rj').toLowerCase();
if (VERSION !== 'rj' && VERSION !== 'bsd') {
  console.error(`!! 未知 VERSION="${process.env.VERSION}"，可选值：rj | bsd`);
  process.exit(1);
}
const tagsFile = VERSION === 'bsd' ? 'data/tags-bsd.json' : 'data/tags.json';
const tagsJsFile = VERSION === 'bsd' ? 'data/tags-bsd.js' : 'data/tags.js';
const tagsGlobal = VERSION === 'bsd' ? '__MATH_TAGS_BSD__' : '__MATH_TAGS__';
const outDirName = VERSION === 'bsd' ? 'data/questions-bsd' : 'data/questions';

// 确定性工具：FNV-1a 32 位哈希（与 build-tags.mjs 保持一致）
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
const tags = JSON.parse(fs.readFileSync(path.join(root, tagsFile), 'utf8'));

const ALL = { ...LOWER, ...MIDDLE, ...UPPER };
const pointById = new Map(tags.points.map((p) => [p.id, p]));
// 题库源文件 scripts/data/questions-*.mjs 中的 q.p 仍是旧序号主键（legacyId），
// 切换主键后必须用 legacyId 反查考点，否则解析失败。
const pointByLegacy = new Map(tags.points.map((p) => [p.legacyId, p]));
const knowledgeById = new Map(tags.knowledge.map((k) => [k.id, k]));
const domainById = new Map(tags.domains.map((d) => [d.id, d]));
const AUTO_TYPES = new Set(tags.questionTypes.filter((t) => t.auto).map((t) => t.id));

const outDir = path.join(root, outDirName);
fs.mkdirSync(outDir, { recursive: true });

if (VERSION === 'bsd') {
  console.log('=================================================================');
  console.log('!! 北师大版题库尚未建设：生成 12 个占位文件（count 0），属预期行为。');
  console.log('!! 切换北师大版后组卷会提示无可用题目；建设题库后重跑本脚本即可。');
  console.log('=================================================================');
}

let totalQuestions = 0;
const report = [];
const errors = [];
const widened = [];

for (const book of tags.books) {
  // 北师大版分支：题库未建设，生成占位空文件，保证 bank.js 的加载链不中断
  if (VERSION === 'bsd') {
    const payload = {
      version: '1.0.0',
      book: book.id,
      bookName: book.name,
      grade: book.grade,
      term: book.term,
      count: 0,
      typeStat: {},
      questions: [],
      placeholder: true,
      note: '北师大版题库尚未建设，此文件为构建占位；补充题目后重跑 VERSION=bsd node scripts/build-questions.mjs。'
    };
    fs.writeFileSync(path.join(outDir, `${book.id}.json`), JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(outDir, `${book.id}.js`),
      `/* 自动生成，请勿手工修改。源文件：${outDirName}/${book.id}.json */\nwindow.__MATH_BANK__ = window.__MATH_BANK__ || {};\nwindow.__MATH_BANK__["${book.id}"] = ` + JSON.stringify(payload) + ';\n',
      'utf8'
    );
    report.push(`${book.short}  （占位，0 题）`);
    continue;
  }

  const raw = ALL[book.id];
  if (!raw) { errors.push(`${book.id} 缺少题库`); continue; }

  const list = raw.map((q, i) => {
    const pt = pointByLegacy.get(q.p);
    if (!pt) { errors.push(`${book.id} 第 ${i + 1} 题引用了不存在的考点 ${q.p}`); return null; }
    const pSlug = pt.slug || pt.id; // 防御：tags 未含 slug 时回退到原 id
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
    const qSlug = `${pSlug}-${String(i + 1).padStart(3, '0')}`;
    return {
      id: qSlug,                                  // 新主键：语义化 slug（卡 3）
      legacyId: `${book.code}-Q${String(i + 1).padStart(3, '0')}`, // 旧序号主键，保留用于迁移
      slug: qSlug,                                // 与 id 同值，便于下游兼容
      contentHash: fnv1a(q.stem + JSON.stringify(q.answer)),
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
    `/* 自动生成，请勿手工修改。源文件：${outDirName}/${book.id}.json */\nwindow.__MATH_BANK__ = window.__MATH_BANK__ || {};\nwindow.__MATH_BANK__["${book.id}"] = ` + JSON.stringify(payload) + ';\n',
    'utf8'
  );
  totalQuestions += list.length;
  report.push(`${book.short}  ${list.length} 题  ${Object.entries(payload.typeStat).map(([k, v]) => `${k}×${v}`).join(' ')}`);
}

console.log(report.join('\n'));
console.log(`\n题库合计 ${totalQuestions} 题；自动扩充 suitableTypes ${widened.length} 处`);

// 回写 tags 文件，保证「考点 suitableTypes」与题库实际题型一致（按版本写回各自文件）
if (widened.length) {
  fs.writeFileSync(path.join(root, tagsFile), JSON.stringify(tags, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(root, tagsJsFile),
    `/* 自动生成，请勿手工修改。源文件：${tagsFile} */\nwindow.${tagsGlobal} = ` + JSON.stringify(tags) + ';\n',
    'utf8'
  );
}

if (errors.length) { console.error('\n错误：\n' + errors.join('\n')); process.exit(1); }
console.log('OK');
