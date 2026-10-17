/* ============================================================
 * verify-migration.mjs —— 卡 3 历史数据迁移验收（自动化代理）
 *
 * 模拟「旧版（序号主键）」localStorage 数据，加载真实迁移脚本
 * （data/migrate-map.js + js/core/migrate.js），验证：
 *   1) 旧 qid / point 在「值」与「对象键」位置都被改写为新 slug
 *   2) 四个命名空间（records / wrong / progress / papers）全部覆盖
 *   3) 迁移前自动整份备份到 math_exam_backup_v2（可回滚）
 *   4) 二次运行幂等（FLAG 置位后无变化）
 *   5) 迁移后的新 qid 能被 MX.Bank 正确解析（错题本「重练」不断裂）
 *
 * 运行：node scripts/verify-migration.mjs
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const resolve = (p) => path.resolve(ROOT, p);

/* ---------------- 简易断言框架 ---------------- */
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; fails.push(msg); console.error('  ✗ ' + msg); }
}
function eq(a, b, msg) {
  ok(JSON.stringify(a) === JSON.stringify(b), msg + `（实际 ${JSON.stringify(a)} ≠ 期望 ${JSON.stringify(b)}）`);
}

/* ---------------- 内存版 localStorage + 沙箱 ---------------- */
class MemLS {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  get length() { return this.m.size; }
  key(i) { return Array.from(this.m.keys())[i] ?? null; }
}

const ls = new MemLS();
const sandbox = {};
sandbox.window = sandbox;          // 让 window.MX 生效
sandbox.localStorage = ls;
sandbox.console = console;
sandbox.JSON = JSON;
sandbox.Object = Object;
sandbox.Array = Array;
sandbox.Date = Date;
sandbox.Math = Math;
sandbox.String = String;
sandbox.globalThis = sandbox;
// 故意不定义 document -> migrate.js 不会自动运行，由本脚本手动调用
vm.createContext(sandbox);

function loadInto(file) {
  const code = fs.readFileSync(resolve(file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

loadInto('data/migrate-map.js');   // 注入 MX.MIGRATE_MAP
loadInto('js/core/migrate.js');    // 注入 MX.Migrate（不自动运行）

const M = sandbox.MX.MIGRATE_MAP;
ok(M && M.points && M.questions, '迁移映射表已加载（points + questions）');
ok(M.questions['g1d-Q001'] === 'rj-g1d-NA-sjj9-001', '映射点 g1d-Q001 -> rj-g1d-NA-sjj9-001 正确');
ok(M.points['g1u-NA-01-01'] === 'rj-g1u-NA-sys110gs', '映射点 g1u-NA-01-01 -> rj-g1u-NA-sys110gs 正确');

/* ---------------- 造「旧版」样本数据 ---------------- */
// 旧 qid：g1d-Q001 -> rj-g1d-NA-sjj9-001；g1d-Q002 -> rj-g1d-NA-sjj876-002
// 旧 point：g1u-NA-01-01 -> rj-g1u-NA-sys110gs；g1u-NA-01-02 -> rj-g1u-NA-bdsyydy
const OLD_Q1 = 'g1d-Q001', NEW_Q1 = M.questions[OLD_Q1];
const OLD_Q2 = 'g1d-Q002', NEW_Q2 = M.questions[OLD_Q2];
const OLD_P1 = 'g1u-NA-01-01', NEW_P1 = M.points[OLD_P1];
const OLD_P2 = 'g1u-NA-01-02', NEW_P2 = M.points[OLD_P2];

const oldRecords = [{
  id: 'ROLD123', examId: 'EOLD', title: '旧版测验', ts: 1700000000000,
  answers: { [OLD_Q1]: '4', [OLD_Q2]: '3' },                 // 以旧 qid 为键
  results: [
    { qid: OLD_Q1, correct: true, earned: 4, max: 4 },
    { qid: OLD_Q2, correct: false, earned: 0, max: 4 }
  ],
  config: { points: [OLD_P1, OLD_P2] },
  books: ['grade1-down']
}];

const oldWrong = [{
  qid: OLD_Q1, book: 'grade1-down', point: OLD_P1, pointName: '十几减9',
  myAnswer: '4', ts: 1700000000000, times: 2
}];

const oldProgress = {
  examId: 'EOLD', title: '旧版测验',
  answers: { [OLD_Q1]: '4', [OLD_Q2]: '3' },                 // 以旧 qid 为键
  flags: { [OLD_Q1]: true },                                 // 以旧 qid 为键
  paper: {
    id: 'POLD', title: '旧版试卷',
    questions: [
      { id: OLD_Q1, point: OLD_P1, book: 'grade1-down' },
      { id: OLD_Q2, point: OLD_P2, book: 'grade1-down' }
    ]
  },
  updatedAt: 1700000000000
};

const oldPapers = [{
  id: 'POLD', title: '旧版试卷',
  config: { points: [OLD_P1] },
  paper: { id: 'POLD', questions: [{ id: OLD_Q1, point: OLD_P1, book: 'grade1-down' }] }
}];

ls.setItem('math_exam_records', JSON.stringify(oldRecords));
ls.setItem('math_exam_wrong', JSON.stringify(oldWrong));
ls.setItem('math_exam_progress_EOLD', JSON.stringify(oldProgress));
ls.setItem('math_exam_papers', JSON.stringify(oldPapers));

/* ---------------- 第一次迁移 ---------------- */
sandbox.MX.Migrate.run();

/* ---- 断言：records ---- */
const rec = JSON.parse(ls.getItem('math_exam_records'))[0];
eq(Object.keys(rec.answers), [NEW_Q1, NEW_Q2], 'records.answers 键已迁移为 slug');
eq(rec.answers[NEW_Q1], '4', 'records.answers[新qid] 值保留');
eq(rec.results.map(r => r.qid), [NEW_Q1, NEW_Q2], 'records.results.qid 已迁移');
eq(rec.config.points, [NEW_P1, NEW_P2], 'records.config.points 已迁移');
eq(rec.books, ['grade1-down'], 'records.books（非 id）保持不变');

/* ---- 断言：wrong ---- */
const wr = JSON.parse(ls.getItem('math_exam_wrong'))[0];
eq(wr.qid, NEW_Q1, 'wrong.qid 已迁移');
eq(wr.point, NEW_P1, 'wrong.point 已迁移');
eq(wr.times, 2, 'wrong.times（非 id）保持不变');

/* ---- 断言：progress（键 + 嵌套 paper） ---- */
const pr = JSON.parse(ls.getItem('math_exam_progress_EOLD'));
eq(Object.keys(pr.answers), [NEW_Q1, NEW_Q2], 'progress.answers 键已迁移');
eq(Object.keys(pr.flags), [NEW_Q1], 'progress.flags 键已迁移');
eq(pr.paper.questions.map(q => q.id), [NEW_Q1, NEW_Q2], 'progress.paper.questions[].id 已迁移');
eq(pr.paper.questions.map(q => q.point), [NEW_P1, NEW_P2], 'progress.paper.questions[].point 已迁移');

/* ---- 断言：papers ---- */
const pa = JSON.parse(ls.getItem('math_exam_papers'))[0];
eq(pa.config.points, [NEW_P1], 'papers.config.points 已迁移');
eq(pa.paper.questions[0].id, NEW_Q1, 'papers.paper.questions[].id 已迁移');
eq(pa.paper.questions[0].point, NEW_P1, 'papers.paper.questions[].point 已迁移');

/* ---- 断言：FLAG / SCHEMA / 备份 ---- */
eq(ls.getItem('math_exam_migrated_v2'), '1', '迁移标记 math_exam_migrated_v2 已置位');
eq(ls.getItem('math_exam_schema_version'), '2', 'schema 版本已写为 2');
const backup = JSON.parse(ls.getItem('math_exam_backup_v2') || 'null');
ok(backup && backup.v === 2 && backup.data, '已写入整份备份 math_exam_backup_v2');
ok(backup && JSON.stringify(backup.data.math_exam_records).includes(OLD_Q1), '备份中保留原始旧 qid（可回滚）');

/* ---------------- 幂等：第二次迁移 ---------------- */
const snapBefore = JSON.stringify([
  ls.getItem('math_exam_records'),
  ls.getItem('math_exam_wrong'),
  ls.getItem('math_exam_progress_EOLD'),
  ls.getItem('math_exam_papers')
]);
sandbox.MX.Migrate.run();   // 再次运行
const snapAfter = JSON.stringify([
  ls.getItem('math_exam_records'),
  ls.getItem('math_exam_wrong'),
  ls.getItem('math_exam_progress_EOLD'),
  ls.getItem('math_exam_papers')
]);
eq(snapAfter, snapBefore, '二次运行幂等：数据无二次变化');
eq(ls.getItem('math_exam_migrated_v2'), '1', '二次运行后迁移标记仍为 1');

/* ---------------- 关键路径：bank.js 解析迁移后的 qid ---------------- */
// 不定义 document，避免 migrate 自动跑；这里只验证 bank 解析能力。
const tags = JSON.parse(fs.readFileSync(resolve('data/tags.json'), 'utf8'));
const code2book = {};
tags.books.forEach(b => { code2book[b.code] = b.id; });
sandbox.MX.Tags = { bookIdByCode: (c) => code2book[c] || null, point: () => null };
// 提供 Loader 桩，直接从本地 json 读取（模拟浏览器 fetch 兜底）
sandbox.MX.Loader = { loadJSON: async (url) => JSON.parse(fs.readFileSync(resolve(url), 'utf8')) };

loadInto('js/core/bank.js');   // 注入 MX.Bank（仅用到 bookIdOfQid + getMany）

const resolvedBook = sandbox.MX.Bank.bookIdOfQid(NEW_Q1);
eq(resolvedBook, 'grade1-down', 'bank.bookIdOfQid(新slug) 正确解析到册');

const found = await sandbox.MX.Bank.getMany([NEW_Q1]);
ok(found.length === 1 && found[0].id === NEW_Q1, 'bank.getMany(新qid) 能取到题（错题本重练不断裂）');

/* ---------------- 汇总 ---------------- */
console.log('\n============================');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
if (fail === 0) console.log('✅ 迁移验收全部通过');
else { console.log('❌ 存在失败项：'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
