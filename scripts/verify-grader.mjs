// 阅卷验收：用 MX.Grader 对题库做「标准答案全量试阅 + 反向答案抽查」
// 目的：确保每道自动阅卷题的标准答案都能得满分，且错误答案不会被判满分
// 用法：node scripts/verify-grader.mjs            （默认校验北师大版 + 人教版）
//       VERSION=bsd node scripts/verify-grader.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 载入浏览器端的阅卷器（grader 定义 window.MX，plugins 往其上挂题型插件）
const ctx = vm.createContext({ console, window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/grader.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/plugins.js'), 'utf8'), ctx);
const Grader = ctx.window.MX.Grader;

const valOf = (b) => (b && typeof b === 'object' && 'value' in b ? b.value : b);

// 按题型构造「标准答案」的用户作答
function correctUserAnswer(q) {
  const a = q.answer || {};
  switch (q.type) {
    case 'choice': return { index: a.index };
    case 'judge': return { value: a.value };
    case 'reading': return { subs: (a.subs || []).map((s) => {
      const sa = s.answer || {};
      return Array.isArray(sa.blanks) ? sa.blanks.map(valOf) : [valOf(sa)];
    }) };
    case 'figure-interactive': return { regions: a.regions || [] };
    default: return { values: (Array.isArray(a.blanks) ? a.blanks : [a]).map(valOf) };
  }
}

// 构造「错误答案」：数值 +7、选择换项、判断取反
function wrongUserAnswer(q) {
  const a = q.answer || {};
  const bump = (v) => (typeof v === 'number' ? v + 7 : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? String(Number(v) + 7) : '错误答案');
  switch (q.type) {
    case 'choice': { const i = (a.index || [0])[0]; return { index: [(i + 1) % Math.max(1, (q.options || []).length)] }; }
    case 'judge': return { value: !a.value };
    case 'reading': return { subs: (a.subs || []).map((s) => { const sa = s.answer || {}; return (Array.isArray(sa.blanks) ? sa.blanks : [sa]).map((b) => [bump(valOf(b))]); }) };
    case 'figure-interactive': return { regions: ['__none__'] };
    default: return { values: (Array.isArray(a.blanks) ? a.blanks : [a]).map((b) => bump(valOf(b))) };
  }
}

const AUTO = new Set(['choice', 'fill', 'judge', 'calculation', 'application', 'reading', 'figure', 'figure-interactive']);
const only = process.env.VERSION;
const banks = [
  { label: '北师大版', dir: 'data/questions-bsd', enabled: !only || only === 'bsd' },
  { label: '人教版', dir: 'data/questions', enabled: !only || only === 'rj' },
].filter((b) => b.enabled && fs.existsSync(path.join(root, b.dir)));

const REVERSE_MAX = 300; // 每个版本反向抽查的题量
let grandTotal = 0, grandProblems = 0;

for (const bank of banks) {
  const dir = path.join(root, bank.dir);
  const files = fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort();
  let total = 0, autoOk = 0, manual = 0;
  const problems = [];

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const q of data.questions || []) {
      total++;
      if (!AUTO.has(q.type)) { manual++; continue; }
      try {
        const r = Grader.gradeQuestion(q, correctUserAnswer(q));
        if (r.ratio >= 0.999) autoOk++;
        else problems.push(`${f} ${q.id} (${q.type}) 标准答案仅得 ${r.ratio}：${String(q.stem).slice(0, 42)}`);
      } catch (e) { problems.push(`${f} ${q.id} 阅卷异常: ${e.message}`); }
    }
  }

  console.log(`\n【${bank.label}】${files.length} 册 ${total} 题：标准答案满分 ${autoOk}，作图转人工 ${manual}，异常 ${problems.length}`);
  problems.slice(0, 12).forEach((p) => console.log('  ✗ ' + p));

  // 反向抽查：错误答案不得被判满分
  let revTotal = 0, revWrong = 0;
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const q of data.questions || []) {
      if (!AUTO.has(q.type) || revTotal >= REVERSE_MAX) continue;
      revTotal++;
      try {
        const r = Grader.gradeQuestion(q, wrongUserAnswer(q));
        if (r.ratio >= 0.999) { revWrong++; if (revWrong <= 6) console.log(`  ✗ 反向误判: ${f} ${q.id} (${q.type}) ${String(q.stem).slice(0, 40)}`); }
      } catch (e) { /* 抛异常说明判错，符合预期 */ }
    }
  }
  console.log(`  反向抽查 ${revTotal} 题：误判为满分 ${revWrong} 题`);

  grandTotal += total;
  grandProblems += problems.length + revWrong;
}

console.log(`\n${'='.repeat(44)}`);
console.log(`合计校验 ${grandTotal} 题，问题 ${grandProblems} 项`);
console.log(grandProblems ? '✗ 阅卷验收未通过' : '✅ 阅卷验收全部通过');
process.exit(grandProblems ? 1 : 0);
