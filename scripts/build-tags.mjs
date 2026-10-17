// 构建 data/tags.json —— 四级标签体系（378 个三级考点）+ data/tags.js（file:// 兜底）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS, DOMAINS, TYPE_META } from './data/curriculum.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pad = (n) => String(n).padStart(2, '0');

const QUESTION_TYPES = [
  { id: 'choice',      name: '选择题',   auto: true,  desc: '选项数组比对' },
  { id: 'fill',        name: '填空题',   auto: true,  desc: '字符串匹配 / 多空 / 数值容差' },
  { id: 'judge',       name: '判断题',   auto: true,  desc: '布尔比对' },
  { id: 'calculation', name: '计算题',   auto: true,  desc: '数值比对 + 容差 + 单位容错' },
  { id: 'application', name: '应用题',   auto: true,  desc: '多答案 / 分步给分' },
  { id: 'reading',     name: '阅读理解题', auto: true, desc: '子问题逐个比对' },
  { id: 'figure',      name: '图形题',   auto: true,  desc: '图形数值比对' },
  { id: 'figure-interactive', name: '交互图形题', auto: true, desc: '区域 id 数组比对' },
  { id: 'draw',        name: '作图题',   auto: false, desc: '人工阅卷' },
];

const BLOOM = { CONCEPTUAL: '理解与记忆', PROCEDURAL: '应用与运算', REPRESENTATIONAL: '表征与转化' };
const TYPE_FULL = { C: 'CONCEPTUAL', P: 'PROCEDURAL', R: 'REPRESENTATIONAL' };
const QT_FULL = {
  ch: 'choice', fi: 'fill', ju: 'judge', ca: 'calculation',
  fg: 'figure', rd: 'reading', ap: 'application', dr: 'draw', fgi: 'figure-interactive',
};

/** 由考点名称自动派生关键词 */
function keywordsOf(name) {
  return [...new Set(
    name
      .replace(/[（）()【】《》「」·、，,。.：:;；!！?？+=<>≥≤%～~—\-/""'']/g, ' ')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
  )].slice(0, 6);
}

const points = [];
const knowledge = [];
const books = [];

for (const book of BOOKS) {
  let bookPointCount = 0;
  let bookKnowledgeCount = 0;
  let unitIdx = 0;

  for (const unit of book.units) {
    unitIdx += 1;
    const kId = `k-${book.code}-${unit.domain}-${pad(unitIdx)}`;
    knowledge.push({
      id: kId,
      name: unit.name,
      domain: unit.domain,
      book: book.id,
      bookCode: book.code,
      grade: book.grade,
      order: unitIdx,
      pointCount: unit.points.length,
    });
    bookKnowledgeCount += 1;

    unit.points.forEach((pt, i) => {
      const pId = `${book.code}-${unit.domain}-${pad(unitIdx)}-${pad(i + 1)}`;
      const fullType = TYPE_FULL[pt.type] || pt.type;
      const avgDiff = Math.round(((pt.diff[0] + pt.diff[1]) / 2) * 10) / 10;
      points.push({
        id: pId,
        name: pt.name,
        type: fullType,
        suitableTypes: pt.types.map((t) => QT_FULL[t] || t),
        difficultyRange: pt.diff,
        extend: {
          ...(pt.extend || {}),
          bloom: BLOOM[fullType],
          keywords: keywordsOf(pt.name),
          weight: avgDiff >= 2.5 ? 3 : avgDiff >= 1.8 ? 2 : 1,
          core: pt.diff[1] >= 3,
          termId: book.id,
          index: points.length + 1,
        },
        // 冗余索引字段，便于前端 O(1) 过滤
        grade: book.grade,
        book: book.id,
        bookCode: book.code,
        bookName: book.name,
        domain: unit.domain,
        knowledge: kId,
        knowledgeName: unit.name,
      });
      bookPointCount += 1;
    });
  }

  books.push({
    id: book.id,
    code: book.code,
    grade: book.grade,
    term: book.term,
    name: book.name,
    short: book.short,
    knowledgeCount: bookKnowledgeCount,
    pointCount: bookPointCount,
    dataFile: `data/questions/${book.id}.json`,
  });
}

const domainStat = {};
for (const d of DOMAINS) {
  const list = points.filter((x) => x.domain === d.id);
  domainStat[d.id] = {
    count: list.length,
    avgDifficulty: list.length ? Math.round((list.reduce((s, x) => s + (x.difficultyRange[0] + x.difficultyRange[1]) / 2, 0) / list.length) * 100) / 100 : 0,
  };
}

const typeStat = {};
for (const t of Object.keys(TYPE_META)) {
  typeStat[t] = points.filter((x) => x.type === t).length;
}

const out = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  stats: {
    books: books.length,
    domains: DOMAINS.length,
    knowledge: knowledge.length,
    points: points.length,
    domainStat,
    typeStat,
  },
  domains: DOMAINS,
  pointTypes: TYPE_META,
  questionTypes: QUESTION_TYPES,
  books,
  knowledge,
  points,
};

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/tags.json'), JSON.stringify(out, null, 2), 'utf8');
fs.writeFileSync(
  path.join(root, 'data/tags.js'),
  '/* 自动生成，请勿手工修改。源文件：data/tags.json */\nwindow.__MATH_TAGS__ = ' + JSON.stringify(out) + ';\n',
  'utf8'
);

// 校验
const bad = books.filter((b) => b.pointCount < 23 || b.pointCount > 38);
console.log(`books=${books.length}  knowledge=${knowledge.length}  points=${points.length}`);
console.log('每册考点数：', books.map((b) => `${b.short}:${b.pointCount}`).join('  '));
console.log('领域分布：', Object.entries(domainStat).map(([k, v]) => `${k}=${v.count}`).join('  '));
console.log('类型分布：', Object.entries(typeStat).map(([k, v]) => `${k}=${v}`).join('  '));
if (bad.length) { console.error('!! 越界：', bad.map((b) => b.short)); process.exit(1); }
if (points.length !== 378) { console.error(`!! 考点总数 ${points.length} !== 378`); process.exit(1); }
console.log('OK');
