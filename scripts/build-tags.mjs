// 构建 data/tags.json —— 四级标签体系（378 个三级考点）+ data/tags.js（file:// 兜底）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS, DOMAINS, TYPE_META } from './data/curriculum.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pad = (n) => String(n).padStart(2, '0');

// 教材版本：当前人教版（rj）。后续切北师大版时改为 'bsd' 等，slug 会随之前缀化。
const VERSION = 'rj';

// ---- 确定性工具：FNV-1a 32 位哈希（输出 8 位十六进制） ----
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---- 确定性工具：汉字转拼音首字母（内置字典，零第三方依赖） ----
// 覆盖 curriculum 中全部 364 个汉字；非字典内汉字回退到码点十六进制，保证确定性。
const PINYIN_INITIAL = {
  数:'s',一:'y',各:'g',比:'b',多:'d',少:'s',对:'d',应:'y',的:'d',认:'r',识:'s',大:'d',小:'x',第:'d',几:'j',序:'x',含:'h',义:'y',分:'f',与:'y',合:'h',以:'y',内:'n',加:'j',减:'j',和:'h',组:'z',成:'c',连:'l',混:'h',运:'y',算:'s',相:'x',十:'s',及:'j',不:'b',进:'j',退:'t',用:'y',解:'j',决:'j',问:'w',题:'t',图:'t',文:'w',钟:'z',表:'b',整:'z',时:'s',半:'b',立:'l',体:'t',形:'x',长:'c',方:'f',正:'z',圆:'y',柱:'z',球:'q',置:'z',上:'s',下:'x',前:'q',后:'h',左:'z',右:'y',类:'l',理:'l',学:'x',广:'g',角:'j',简:'j',单:'d',排:'p',列:'l',求:'q',另:'l',个:'g',读:'d',写:'x',顺:'s',较:'j',两:'l',带:'d',括:'k',号:'h',步:'b',计:'j',实:'s',际:'j',人:'r',民:'m',币:'b',元:'y',平:'p',面:'m',拼:'p',接:'j',据:'j',收:'s',集:'j',象:'x',统:'t',找:'z',规:'g',律:'l',字:'z',余:'y',条:'t',件:'j',搭:'d',配:'p',综:'z',估:'g',生:'s',活:'h',中:'z',购:'g',物:'w',厘:'l',米:'m',量:'l',关:'g',系:'x',线:'x',段:'d',画:'h',度:'d',选:'x',择:'z',测:'c',二:'e',乘:'c',初:'c',口:'k',诀:'j',积:'j',部:'b',名:'m',称:'c',直:'z',判:'p',断:'d',锐:'r',钝:'d',三:'s',尺:'c',从:'c',同:'t',观:'g',察:'c',间:'j',践:'j',动:'d',编:'b',码:'m',探:'t',索:'s',均:'j',除:'c',商:'s',级:'j',有:'y',意:'y',万:'w',近:'j',似:'s',百:'b',千:'q',克:'k',换:'h',轴:'z',移:'y',旋:'x',转:'z',现:'x',操:'c',作:'z',调:'t',查:'c',推:'t',周:'z',期:'q',设:'s',师:'s',秒:'m',笔:'b',毫:'h',吨:'d',质:'z',被:'b',或:'h',末:'m',尾:'w',验:'y',因:'y',之:'z',母:'m',四:'s',边:'b',邮:'y',政:'z',身:'s',份:'f',证:'z',重:'z',叠:'d',策:'c',略:'l',年:'n',月:'y',日:'r',基:'j',本:'b',知:'z',闰:'r',经:'j',过:'g',东:'d',南:'n',西:'x',北:'b',路:'l',率:'l',复:'f',式:'s',制:'z',历:'l',归:'g',析:'x',亿:'y',改:'g',产:'c',舍:'s',入:'r',省:'s',公:'g',顷:'q',变:'b',化:'h',价:'j',总:'z',速:'s',程:'c',是:'s',试:'s',射:'s',器:'q',垂:'c',行:'x',梯:'t',特:'t',征:'z',优:'y',沏:'q',茶:'c',烙:'l',饼:'b',则:'z',交:'j',结:'j',便:'b',性:'x',点:'d',引:'y',起:'q',按:'a',向:'x',折:'z',鸡:'j',兔:'t',笼:'l',营:'y',养:'y',午:'w',餐:'c',循:'x',环:'h',去:'q',示:'s',等:'d',稍:'s',杂:'z',倍:'b',差:'c',在:'z',格:'g',纸:'z',确:'q',事:'s',发:'f',可:'k',能:'n',植:'z',树:'s',掷:'z',费:'f',节:'j',约:'y',水:'s',奇:'q',偶:'o',真:'z',假:'j',最:'z',通:'t',互:'h',异:'y',容:'r',次:'c',品:'p',续:'x',已:'y',这:'z',工:'g',出:'c',勤:'q',扣:'k',税:'s',利:'l',心:'x',径:'j',扇:'s',阴:'y',影:'y',距:'j',离:'l',描:'m',述:'s',跑:'p',负:'f',金:'j',息:'x',案:'a',例:'l',反:'f',放:'f',缩:'s',锥:'z',习:'x',常:'c',见:'j',概:'g',众:'z',思:'s',考:'k',逻:'l',辑:'j',鸽:'g',巢:'c',抽:'c',屉:'t',原:'y',准:'z',备:'b',课:'k',易:'y',何:'h',代:'d',法:'f',位:'w',五:'w',定:'d',到:'d',
};

function pinyinFirst(ch) {
  const code = ch.codePointAt(0);
  if (code < 19968 || code > 40869) return null; // 非汉字：交由 pinyinish 保留数字/字母或丢弃标点
  const init = PINYIN_INITIAL[ch];
  if (init) return init;
  // 字典外汉字（未来 curriculum 扩展）：回退到码点十六进制，确定性、避免冲突
  return 'u' + code.toString(16);
}

// 拼音首字母 + 关键数字：保留数字与字母，丢弃标点/空白；全小写，确定性输出。
function pinyinish(name) {
  let out = '';
  for (const ch of String(name)) {
    const f = pinyinFirst(ch);
    if (f !== null) out += f;
    else if (/[0-9a-z]/i.test(ch)) out += ch.toLowerCase();
  }
  return out;
}

// 冲突去重：首次用 base；重复依次追加 -2/-3/...（按生成顺序，确定性）。
function uniqueSlug(base, seen) {
  if (!seen.has(base)) { seen.set(base, 1); return base; }
  const n = seen.get(base) + 1;
  seen.set(base, n);
  return `${base}-${n}`;
}

const seenPoint = new Map();
const seenKnowledge = new Map();

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
      slug: uniqueSlug(`${VERSION}-${book.code}-${unit.domain}-${pad(unitIdx)}-${pinyinish(unit.name)}`, seenKnowledge),
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
        slug: uniqueSlug(`${VERSION}-${book.code}-${unit.domain}-${pinyinish(pt.name)}`, seenPoint),
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
  buildHash: fnv1a(JSON.stringify({ books, knowledge, points })),
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
