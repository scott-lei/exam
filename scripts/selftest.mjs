/* ============================================================
 * selftest.mjs —— 端到端自检
 * 在 Node 中构造最小浏览器环境，加载 core 层，验证：
 *   1) 数据完整性（378 考点 / 12 册 / 每册 ≥10 题 / 引用合法）
 *   2) 自动阅卷正确性（标准答案满分 + 容错 + 反例）
 *   3) 四种组卷模式可用
 * 运行：node scripts/selftest.mjs
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg + (extra ? '  →  ' + extra : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------- 构造最小 window 环境 ---------- */
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON, Promise, Array, Object, String, Number, Boolean, Error, isFinite,
  location: { protocol: 'http:', search: '', href: 'http://localhost/' },
  navigator: { userAgent: 'node' },
  localStorage: (() => {
    const m = new Map();
    return {
      get length() { return m.size; },
      key: (i) => Array.from(m.keys())[i],
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k)
    };
  })(),
  fetch: async (url) => {
    const p = path.join(root, url.split('?')[0]);
    if (!fs.existsSync(p)) return { ok: false, status: 404, json: async () => null };
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) };
  },
  addEventListener() { }, removeEventListener() { },
  document: { createElement: () => ({ style: {}, setAttribute() { }, appendChild() { }, addEventListener() { } }), head: { appendChild() { } } }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, ctx, { filename: rel });
}

['js/core/loader.js', 'js/core/storage.js', 'js/core/tags.js', 'js/core/bank.js',
  'js/core/grader.js', 'js/core/plugins.js', 'js/core/builder.js',
  'js/core/media.js', 'js/core/ai.js'].forEach(load);

const MX = sandbox.MX;

/* ---------- 标准答案合成 ---------- */
function valOf(spec) {
  if (spec && typeof spec === 'object' && 'value' in spec) return spec.value;
  return spec;
}
function synth(q) {
  const a = q.answer || {};
  switch (q.type) {
    case 'choice': return { index: (a.index || []).slice() };
    case 'judge': return { value: a.value };
    case 'figure-interactive': return { regions: (a.regions || []).slice() };
    case 'reading': return {
      subs: (a.subs || []).map((s) => {
        const sp = Array.isArray(s.answer.blanks) ? s.answer.blanks : [s.answer];
        return sp.map(valOf);
      })
    };
    case 'draw': return null;
    default: {
      const sp = Array.isArray(a.blanks) ? a.blanks : [a];
      return { values: sp.map(valOf) };
    }
  }
}

/* ============================================================
 * 1. 数据完整性
 * ============================================================ */
section('1. 数据完整性');
const tags = JSON.parse(fs.readFileSync(path.join(root, 'data/tags.json'), 'utf8'));
ok(tags.books.length === 12, '册数应为 12', tags.books.length);
ok(tags.points.length === 378, '三级考点应为 378', tags.points.length);
ok(tags.domains.length === 4, '知识领域应为 4', tags.domains.length);
let bookRangeOk = true, badBook = '';
tags.books.forEach((b) => { if (b.pointCount < 23 || b.pointCount > 38) { bookRangeOk = false; badBook = b.name + '=' + b.pointCount; } });
ok(bookRangeOk, '每册考点数应在 23~38 之间', badBook);

const pointIds = new Set(tags.points.map((p) => p.id));
const knIds = new Set(tags.knowledge.map((k) => k.id));
ok(tags.points.every((p) => knIds.has(p.knowledge)), '所有考点都应挂到合法二级知识点');
ok(tags.points.every((p) => p.suitableTypes && p.suitableTypes.length > 0), '所有考点都应有 suitableTypes');
ok(tags.points.every((p) => Array.isArray(p.difficultyRange) && p.difficultyRange.length === 2), '所有考点都应有难度区间');
ok(tags.points.every((p) => p.type && p.extend), '所有考点都应有 type 与 extend');
ok(new Set(tags.points.map((p) => p.id)).size === 378, '考点 id 不应重复');

let qTotal = 0, qRefOk = true, qTypeOk = true, qFieldOk = true, badRefs = [], badTypes = [], badFields = [];
const knownTypes = new Set(tags.questionTypes.map((t) => t.id));
const seenQids = new Set();
for (const b of tags.books) {
  const p = path.join(root, 'data/questions', b.id + '.json');
  ok(fs.existsSync(p), '题库文件存在：' + b.id);
  const payload = JSON.parse(fs.readFileSync(p, 'utf8'));
  ok(payload.questions.length >= 10, b.name + ' 至少 10 题', payload.questions.length);
  payload.questions.forEach((q) => {
    qTotal++;
    if (!pointIds.has(q.point)) { qRefOk = false; badRefs.push(q.id + '→' + q.point); }
    if (!knownTypes.has(q.type)) { qTypeOk = false; badTypes.push(q.type); }
    if (q.id && seenQids.has(q.id)) { qFieldOk = false; badFields.push('重复 id ' + q.id); }
    seenQids.add(q.id);
    ['id', 'grade', 'domain', 'knowledge', 'point', 'type', 'difficulty', 'score', 'stem', 'answer', 'analysis', 'tags', 'media', 'extend']
      .forEach((f) => { if (q[f] === undefined) { qFieldOk = false; badFields.push(q.id + ' 缺字段 ' + f); } });
    if (q.type === 'choice' && (!q.options || !q.options.length)) { qFieldOk = false; badFields.push(q.id + ' 选择题缺少 options'); }
  });
}
ok(qRefOk, '所有题目的考点引用合法', badRefs.slice(0, 5).join(', '));
ok(qTypeOk, '所有题目题型已注册', [...new Set(badTypes)].join(', '));
ok(qFieldOk, '所有题目字段完整', badFields.slice(0, 5).join(', '));
console.log(`题库合计 ${qTotal} 题，覆盖 ${seenQids.size} 个唯一 id`);

/* ============================================================
 * 2. 自动阅卷
 * ============================================================ */
section('2. 自动阅卷');
await MX.Tags.load();
const allBooks = tags.books.map((b) => b.id);
await MX.Bank.loadBooks(allBooks);

let gradedCount = 0, fullScoreFail = [], autoFail = [];
MX.Bank.all().forEach((q) => {
  const plugin = MX.Plugins.get(q.type);
  ok(!!plugin, '题型插件已注册：' + q.type);
  if (!plugin) return;
  const r = MX.Grader.gradeQuestion(q, synth(q));
  if (q.type === 'draw') {
    if (!r.manual) autoFail.push(q.id + ' 作图题应为人工阅卷');
    return;
  }
  gradedCount++;
  if (!r.correct || Math.abs(r.earned - r.max) > 1e-6) fullScoreFail.push(q.id + ' ' + q.type + ' 得分 ' + r.earned + '/' + r.max);
  if (r.manual) autoFail.push(q.id + ' 不应为人工阅卷');
});
ok(fullScoreFail.length === 0, '标准答案应全部满分（共 ' + gradedCount + ' 道客观题）', fullScoreFail.slice(0, 8).join('; '));
ok(autoFail.length === 0, '客观/主观题标记正确', autoFail.slice(0, 5).join('; '));

// 反例：空作答不得分
let emptyFail = [];
MX.Bank.all().forEach((q) => {
  if (q.type === 'draw') return;
  const r = MX.Grader.gradeQuestion(q, null);
  if (r.correct || r.earned > 0) emptyFail.push(q.id);
});
ok(emptyFail.length === 0, '空作答不得分', emptyFail.slice(0, 5).join(', '));

// 数值容差 / 单位容错 / 分数 / 集合 / 比
const G = MX.Grader;
ok(G.cmpBlank({ value: 13, unit: '只' }, '13只') === true, '单位容错：13只 ≈ 13');
ok(G.cmpBlank({ value: 13, unit: '只' }, '十三只') === false, '非数字同义词不作答分（需在 alts 中声明）');
ok(G.cmpBlank({ value: 18.84, tolerance: 0.05 }, '18.85') === true, '数值容差 ±0.05');
ok(G.cmpBlank({ value: 18.84, tolerance: 0 }, '18.85') === false, '无容差时不接受偏差');
ok(G.cmpBlank({ value: '5/7' }, '10/14') === true, '分数等值 5/7 == 10/14');
ok(G.cmpBlank({ value: '3/4' }, '0.75') === true, '分数与小数等值 3/4 == 0.75');
ok(G.cmpBlank({ value: '2,11', mode: 'set' }, '11,2') === true, '多答案集合比对（顺序无关）');
ok(G.cmpBlank({ value: '2,11', mode: 'set' }, '2,11,9') === false, '集合元素数量不同 → 不得分');
ok(G.cmpBlank({ value: '1:2', mode: 'ratio' }, '2:4') === true, '比例等值 1:2 == 2:4');
ok(G.cmpBlank({ value: '75%' }, '75') === true, '百分号容错');
ok(G.cmpBlank({ value: '三', alts: ['3'] }, '3') === true, '别名答案');
ok(G.cmpBlank({ value: 620 }, '６２０') === true, '全角数字归一化');
ok(G.cmpBlank({ value: 620 }, ' 620 ') === true, '空白字符归一化');
ok(G.cmpBlanks([{ value: true }], ['true']).correct === true, '布尔值在填空规格中按字符串等价处理');
ok(MX.Grader.gradeQuestion({ type: 'judge', score: 1, answer: { value: true } }, { value: 'true' }).correct === false, '判断题不接受字符串作答');

// 多空部分给分
const partial = G.cmpBlanks(['2', '4'], ['2', '5']);
ok(partial.ratio === 0.5 && partial.correct === false, '多空部分正确按比例给分');
ok(G.cmpBlanks(['2', '4'], ['2', '4']).correct === true, '多空全对');

// choice / judge / figure-interactive 专项
const cq = { type: 'choice', score: 4, answer: { index: [1, 3] }, options: ['a', 'b', 'c', 'd'] };
ok(MX.Grader.gradeQuestion(cq, { index: [3, 1] }).correct === true, '选择题多选顺序无关');
ok(MX.Grader.gradeQuestion(cq, { index: [1] }).correct === false, '选择题漏选不得分');
const jq = { type: 'judge', score: 4, answer: { value: false } };
ok(MX.Grader.gradeQuestion(jq, { value: false }).correct === true, '判断题布尔比对');
ok(MX.Grader.gradeQuestion(jq, { value: true }).correct === false, '判断题错选');
const fq = { type: 'figure-interactive', score: 6, answer: { regions: ['a', 'b'] }, media: { regions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } };
ok(MX.Grader.gradeQuestion(fq, { regions: ['b', 'a'] }).correct === true, '区域数组顺序无关');
ok(MX.Grader.gradeQuestion(fq, { regions: ['a'] }).correct === false, '区域选择不完整不得满分');
ok(MX.Grader.gradeQuestion(fq, { regions: ['a'] }).earned > 0, '区域部分命中给部分分');

// reading 子问题
const rq = {
  type: 'reading', score: 6,
  answer: { subs: [{ label: '(1)', answer: { value: 4, unit: '个' } }, { label: '(2)', answer: { blanks: [1, 2] } }] }
};
ok(MX.Grader.gradeQuestion(rq, { subs: [['4个'], ['1', '2']] }).correct === true, '阅读理解逐问比对');
ok(MX.Grader.gradeQuestion(rq, { subs: [['4'], ['1', '3']] }).ratio === 2 / 3, '阅读理解分步给分');

/* ============================================================
 * 3. 组卷
 * ============================================================ */
section('3. 组卷四种模式');

const p1 = tags.points.find((p) => p.id === 'rj-g3u-GG-cfxhzfxdzc');
const p2 = tags.points.find((p) => p.id === 'rj-g4u-NA-swsclwsdbs');

// 注：该考点仅 1 题，count < 5 触发「练习卷」降级（卡 5.3），不再按请求总分折算
const r1 = await MX.Builder.build({ mode: 'single', books: ['grade3-up'], points: ['rj-g3u-GG-cfxhzfxdzc'], count: 3, totalScore: 30 });
ok(r1.ok, '模式一：单考点组题', r1.message);
ok(r1.ok && r1.paper.questions.every((q) => q.point === 'rj-g3u-GG-cfxhzfxdzc'), '单考点题目的考点唯一');
ok(r1.ok && r1.paper.practice === true, '题量 < 5 自动降级为练习卷（卡 5.3）');
ok(r1.ok && r1.paper.questions.length === 1, '候选不足时如实产出 1 题（不静默凑数）');
ok(r1.ok && Math.abs(r1.paper.totalScore - r1.paper.questions[0].paperScore) < 0.01, '练习卷：单题即整卷总分');
ok(r1.ok && r1.paper.totalScore < 30, '练习卷不再产出请求的 30 分', r1.ok ? r1.paper.totalScore : '');

const r2 = await MX.Builder.build({ mode: 'multi', books: ['grade3-up', 'grade4-up'], points: ['rj-g3u-GG-zcdrs', 'rj-g4u-NA-swsclwsdbs'], count: 4, totalScore: 40 });
ok(r2.ok, '模式二：多考点组题', r2.message);
ok(r2.ok && r2.paper.questions.every((q) => ['rj-g3u-GG-zcdrs', 'rj-g4u-NA-swsclwsdbs'].includes(q.point)), '多考点题目落在选择范围内');

const r3 = await MX.Builder.build({ mode: 'cross', books: ['grade1-up', 'grade1-down', 'grade2-up', 'grade2-down', 'grade3-up', 'grade3-down', 'grade4-up', 'grade4-down', 'grade5-up', 'grade5-down', 'grade6-up', 'grade6-down'], count: 12, totalScore: 100 });
ok(r3.ok, '模式三：跨年级组题', r3.message);
const crossBooks = r3.ok ? new Set(r3.paper.questions.map((q) => q.book)) : new Set();
ok(crossBooks.size >= 2, '跨年级卷覆盖 ≥2 个册次', [...crossBooks].join(','));

const r4 = await MX.Builder.build({ mode: 'type', books: ['grade4-down'], types: ['choice', 'fill', 'calculation'], count: 6, totalScore: 60 });
ok(r4.ok, '模式四：题型优先组题', r4.message);
ok(r4.ok && r4.paper.questions.every((q) => ['choice', 'fill', 'calculation'].includes(q.type)), '题型优先模式题型受控');

// 题型比例
const r5 = await MX.Builder.build({
  mode: 'type', books: ['grade5-down'], types: ['choice', 'fill', 'calculation', 'application', 'judge', 'reading', 'figure'],
  typeRatio: { choice: 2, fill: 2, calculation: 2, application: 2, judge: 1, reading: 1, figure: 1 },
  count: 11, totalScore: 100
});
ok(r5.ok, '题型比例组卷', r5.message);
if (r5.ok) {
  const t = {};
  r5.paper.questions.forEach((q) => { t[q.type] = (t[q.type] || 0) + 1; });
  ok((t.choice || 0) >= (t.judge || 0), '权重高的题型出题更多', JSON.stringify(t));
  ok(Math.abs(r5.paper.totalScore - 100) < 0.01, '总分精确对齐 100', r5.paper.totalScore);
}

// 难度过滤
const r6 = await MX.Builder.build({ mode: 'type', books: ['grade6-up'], types: ['calculation', 'application'], count: 5, difficultyMin: 3, difficultyMax: 3, totalScore: 50 });
ok(r6.ok, '难度区间过滤', r6.message);
ok(r6.ok && r6.paper.questions.every((q) => q.difficulty === 3), '难度过滤生效');

// 无可用题目
const r7 = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], types: ['draw'], count: 5 });
ok(r7.ok === false, '无匹配题型时应给出明确失败提示', r7.message);

/* ============================================================
 * 5b. 组卷内核 API（卡 5）
 * ============================================================ */
section('5b. 组卷内核 API（卡 5）');
await MX.Tags.load();
const ALL_BOOKS = MX.Tags.books.map((b) => b.id);

// 5.1 previewCount：只算不抽
const pc = await MX.Builder.previewCount({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 10 });
ok(pc.count === 1, 'previewCount：单考点仅 1 题时如实返回 1', JSON.stringify(pc));
ok(pc.shortage > 0, 'previewCount：候选不足时 shortage > 0', 'shortage=' + pc.shortage);
ok(pc.byType.choice && pc.byType.choice.available === 1, 'previewCount：byType 报告该题型可用 1 题');

// 5.2 autoRelax：候选不足时四级放宽
const ar = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 8, autoRelax: true });
ok(ar.ok, 'autoRelax：组卷成功', ar.message);
ok(ar.ok && ar.paper.relaxLevel >= 1, 'autoRelax：确实触发了放宽', 'relaxLevel=' + ar.paper.relaxLevel);
ok(ar.ok && ar.paper.questions.length >= 6, 'autoRelax：把 1 题放宽到 ≥6 题', ar.paper.questions.length);
// 对照组：无 autoRelax 时仍只产出 1 题（不静默凑数）
const noRelax = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 8 });
ok(noRelax.ok && noRelax.paper.questions.length === 1, '对照：无 autoRelax 时如实产出 1 题');

// 5.3 分值表 + 配分规则
const ST = MX.Builder.SCORE_TABLE;
ok(ST.choice === 2 && ST.fill === 2 && ST.judge === 1 && ST.calculation === 4 &&
   ST.application === 5 && ST.figure === 3 && ST.reading === 6 && ST.draw === 4 &&
   ST['figure-interactive'] === 3, 'SCORE_TABLE 题型分值正确');
// 单题 ≤ 0.4×总分，且总分精确对齐
const capRes = MX.Builder.assignScores(
  [{ type: 'reading' }, { type: 'judge' }, { type: 'judge' }, { type: 'judge' }, { type: 'judge' }], 50, false);
ok(Math.abs(capRes.total - 50) < 0.01, 'assignScores：总分精确对齐 50', capRes.total);
ok(capRes.scores.every((s) => s <= 50 * 0.4 + 1e-9), 'assignScores：任意单题 ≤ 0.4×总分（20）', JSON.stringify(capRes.scores));
ok(capRes.scores[0] === 20, 'assignScores：超分题被压到上限 20', capRes.scores[0]);
// 练习卷：直接用题型基准分，不折算
const pracRes = MX.Builder.assignScores([{ type: 'choice' }], 0, true);
ok(pracRes.scores[0] === 2 && pracRes.total === 2, 'assignScores：练习卷用基准分（choice=2）');

// 5.3 验收：1 题不再产出 100 分（题量<5 降级练习卷）
const oneQ = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 1 });
ok(oneQ.ok && oneQ.paper.practice === true, '1 题：标记为练习卷');
ok(oneQ.ok && oneQ.paper.totalScore < 100, '1 题：不再产出 100 分', oneQ.paper.totalScore);
ok(oneQ.ok && Math.abs(oneQ.paper.totalScore - oneQ.paper.questions[0].paperScore) < 0.01, '1 题：单题即整卷总分');

// 5.4 swapOne / lockQuestion：保持总分不变替换单题
const sw = await MX.Builder.build({ mode: 'type', books: ALL_BOOKS, types: ['calculation'], count: 8, totalScore: 80 });
ok(sw.ok, 'swapOne 准备卷', sw.message);
if (sw.ok) {
  const before = sw.paper.totalScore;
  const sr = await MX.Builder.swapOne(sw.paper, 0);
  ok(sr.ok, 'swapOne：替换成功', sr.message);
  ok(sr.ok && Math.abs(sw.paper.totalScore - before) < 0.01, 'swapOne：替换后总分不变', before + '→' + sw.paper.totalScore);
  ok(sr.ok && sr.oldId !== sr.newId, 'swapOne：换成了不同题目', sr.oldId + '→' + sr.newId);
}
const lk = await MX.Builder.build({ mode: 'type', books: ALL_BOOKS, types: ['calculation'], count: 8, totalScore: 80 });
if (lk.ok) {
  ok(MX.Builder.lockQuestion(lk.paper, 0) === true, 'lockQuestion：锁定成功');
  const lr = await MX.Builder.swapOne(lk.paper, 0);
  ok(lr.ok === false, 'lockQuestion：锁定题不可被替换', lr.message);
  ok(MX.Builder.lockQuestion(lk.paper, 0) === false, 'lockQuestion：再次切换即解锁');
}

// 5.5 groupBy:'type'：按题型分大题（固定序、组内重编号）
const gs = await MX.Builder.build({ mode: 'type', books: ALL_BOOKS, types: ['choice', 'fill', 'calculation', 'application'], count: 12, totalScore: 120, groupBy: 'type' });
ok(gs.ok, 'groupBy 分大题组卷', gs.message);
if (gs.ok) {
  ok(Array.isArray(gs.paper.sections) && gs.paper.sections.length === 4, '分 4 个大题', gs.paper.sections && gs.paper.sections.length);
  const order = gs.paper.sections.map((s) => s.type);
  ok(JSON.stringify(order) === JSON.stringify(['choice', 'fill', 'calculation', 'application']), '大题顺序固定（choice→fill→calculation→application）', order.join(','));
  ok(gs.paper.sections.every((s) => s.questions[0].paperIndex === 1), '每个大题首题题号均从 1 重编号');
  ok(gs.paper.sections.every((s) => s.scorePer > 0), '每个大题都有平均分 scorePer');
  // 全卷题号：所有 section 的 paperIndex 在各自组内连续从 1 起
  let contiguous = true;
  gs.paper.sections.forEach((s) => s.questions.forEach((q, i) => { if (q.paperIndex !== i + 1) contiguous = false; }));
  ok(contiguous, '组内题号连续重编号');
}

/* ============================================================
 * 4. 存储层
 * ============================================================ */
section('4. 存储层');
MX.Storage.saveSettings({ bigFont: true });
ok(MX.Storage.getSettings().bigFont === true, '设置读写');
MX.Storage.addRecord({ id: 'R1', earnedScore: 80, totalScore: 100 });
ok(MX.Storage.getRecords().length === 1, '考试记录写入');
MX.Storage.pushWrong({ qid: 'X1', ts: Date.now() });
MX.Storage.pushWrong({ qid: 'X1', ts: Date.now() });
const w = MX.Storage.getWrong();
ok(w.length === 1 && w[0].times === 2, '错题重复收录累加次数');
MX.Storage.saveProgress('E1', { examId: 'E1', updatedAt: 1 });
ok(MX.Storage.getProgress('E1') !== null, '答题进度写入（断点续考）');
ok(MX.Storage.listProgress().length === 1, '进度列表');
const bundle = MX.Storage.exportAll();
ok(Object.keys(bundle.data).length >= 3, '数据备份导出');
MX.Storage.clearAll();
ok(MX.Storage.getRecords().length === 0, '清空全部数据');
MX.Storage.importAll(bundle);
ok(MX.Storage.getRecords().length === 1, '备份恢复');

/* ============================================================
 * 4b. 存储瘦身与版本化（卡 4）
 * ============================================================ */
section('4b. 存储瘦身与版本化（卡 4）');
MX.Storage.clearAll();

// 1) 试卷瘦身：savePaper 只存元数据 + questionIds + paperScores，不再存整卷 questions
var built = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 8 });
ok(built.ok === true, '组卷成功（用于试卷瘦身测试）', built.message);
MX.Storage.savePaper(built.paper);
var slim = MX.Storage.getPapers()[0];
ok(slim && Array.isArray(slim.questionIds) && slim.questionIds.length === built.paper.questions.length, 'savePaper 保留 questionIds 且数量一致');
ok(slim && !slim.questions && !slim.paper, 'savePaper 不再存整卷 questions / paper');
ok(slim && Array.isArray(slim.paperScores) && slim.paperScores.length === built.paper.questions.length, 'savePaper 保留 paperScores');

// 2) getPaper 回查拼装（题序、题分、stats、duration 还原）
var full = await MX.Storage.getPaper(built.paper.id);
ok(full && Array.isArray(full.questions) && full.questions.length === built.paper.questions.length, 'getPaper 回查题目数量一致');
ok(full && full.questions.every(function (q, i) { return q.id === slim.questionIds[i]; }), 'getPaper 题序与 questionIds 一致');
ok(full && full.questions[0].paperIndex === 1, 'getPaper 还原 paperIndex');
ok(full && full.questions[0].paperScore != null, 'getPaper 还原 paperScore');
ok(full && full.stats && full.duration, 'getPaper 还原 stats / duration（交卷报告依赖）');

// 3) 版本信封：所有写入包成 {v:2,data:...}，旧裸 JSON 自动升级
var rawRec = sandbox.localStorage.getItem(MX.Storage.KEYS.PAPERS);
ok(rawRec && rawRec.indexOf('"v":2') >= 0, '写入带版本信封 v:2');
sandbox.localStorage.setItem('math_exam_test_oldfmt', JSON.stringify({ hello: 'world', n: 42 }));
var upgraded = MX.Storage.read('math_exam_test_oldfmt', null);
ok(upgraded && upgraded.hello === 'world' && upgraded.n === 42, '旧裸 JSON 可被正确读取');
var rawUpg = sandbox.localStorage.getItem('math_exam_test_oldfmt');
ok(rawUpg && rawUpg.indexOf('"v":2') >= 0, '旧裸 JSON 读取后自动升级为信封');

// 4) getUsage：容量统计 + 单份试卷 < 3KB（保存 3 份验证）
function blen(s) { try { return unescape(encodeURIComponent(String(s))).length; } catch (e) { return String(s).length; } }
var pp1 = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 5, title: '卷一' });
var pp2 = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 6, title: '卷二', seed: 's2' });
var pp3 = await MX.Builder.build({ mode: 'single', books: ['grade1-up'], points: ['rj-g1u-NA-sys110gs'], count: 7, title: '卷三', seed: 's3' });
MX.Storage.savePaper(pp1.paper); MX.Storage.savePaper(pp2.paper); MX.Storage.savePaper(pp3.paper);
var u = MX.Storage.getUsage();
ok(u && Array.isArray(u.items) && typeof u.total === 'number', 'getUsage 返回统计结构');
var maxPaper = Math.max.apply(null, MX.Storage.getPapers().map(function (e) { return blen(JSON.stringify({ v: 2, data: e })); }));
ok(maxPaper > 0 && maxPaper < 3 * 1024, '单份试卷（含信封）占用 < 3KB（最大 ' + maxPaper + 'B）');

// 5) clearOldRecords：清理超期记录与已完成进度
var oldTs = Date.now() - 400 * 86400000;
MX.Storage.addRecord({ id: 'OLD', ts: oldTs, earnedScore: 10, totalScore: 100 });
MX.Storage.addRecord({ id: 'NEW', ts: Date.now(), earnedScore: 90, totalScore: 100 });
ok(MX.Storage.getRecords().length === 2, '写入 1 条超期 + 1 条近期记录');
MX.Storage.saveProgress('DONE', { examId: 'DONE', submitted: true, updatedAt: Date.now() });
MX.Storage.saveProgress('RUN', { examId: 'RUN', submitted: false, updatedAt: Date.now() });
var cleared = MX.Storage.clearOldRecords(180);
ok(cleared.removedRecords === 1, 'clearOldRecords 清理 1 条超期记录');
ok(MX.Storage.getRecords().length === 1 && MX.Storage.getRecords()[0].id === 'NEW', '近期记录保留');
ok(cleared.removedProgress === 1, 'clearOldRecords 清理 1 条已完成进度');
ok(MX.Storage.getProgress('DONE') === null, '已完成的 progress 被清除');
ok(MX.Storage.getProgress('RUN') !== null, '未完成的 progress 保留');

/* ============================================================
 * 5. 扩展能力
 * ============================================================ */
section('5. 扩展能力');
let customGraded = false;
MX.Plugins.register({
  id: 'unit-test-type', name: '自定义题型', auto: true, input: 'blanks',
  specs: (q) => q.answer.blanks,
  grade: (q, ua, U) => { customGraded = true; return U.cmpBlanks(q.answer.blanks, (ua && ua.values) || []); }
});
const custom = { id: 'C1', type: 'unit-test-type', score: 5, answer: { blanks: ['ok'] } };
ok(MX.Grader.gradeQuestion(custom, { values: ['ok'] }).correct === true, '自定义题型插件参与阅卷');
ok(customGraded, '自定义插件的 grade 被调用');
ok(MX.Plugins.inputOf(custom) === 'blanks', '自定义题型输入类型');
ok(MX.Media.types().length >= 4, '媒体类型可扩展', MX.Media.types().join(','));
const aiQ = await MX.AI.generate({ pointId: 'rj-g1u-NA-5yndjf', type: 'calculation', count: 2 });
ok(aiQ.length === 2 && aiQ[0].point === 'rj-g1u-NA-5yndjf', 'AI 出题接口（本地模板兜底）');
ok(MX.AI.isReady() === false, '未配置 provider 时 AI 处于未接入状态');
const exp = await MX.AI.explain({ analysis: '测试解析', answer: { value: 1 }, type: 'fill' }, null);
ok(exp.indexOf('测试解析') >= 0, 'AI 讲题接口兜底');

/* ---------- 结果 ---------- */
console.log('\n============================');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
if (fail) {
  console.log('\n失败项：');
  failures.forEach((f) => console.log(' ✗ ' + f));
  process.exit(1);
}
console.log('✅ 全部自检通过');
void p1; void p2;
