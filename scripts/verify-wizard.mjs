/* ============================================================
 * verify-wizard.mjs —— 卡 6 组卷中心三步向导 · Node 端到端验收
 * 在 vm 沙箱中构造最小浏览器环境（零三方依赖）：
 *   - 真实加载 core 层：loader / storage / tags / bank / builder / math
 *   - 以 DOM stub 驱动 js/pages/page-builder.js 的完整交互
 *     （点击场景 → 范围 → 规格 → 生成 → 换题/锁定/重抽/打印/考试/保存）
 *   - 覆盖 URL 兼容：?point= / ?book= 直达 Step3 与黄条自动补齐提示
 * 运行：node scripts/verify-wizard.mjs
 * ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg + (extra !== undefined && extra !== null && extra !== '' ? '  →  ' + extra : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function until(fn, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 5000)) {
    let v = false;
    try { v = fn(); } catch (e) { v = false; }
    if (v) return true;
    await sleep(40);
  }
  ok(false, '等待超时：' + label);
  return false;
}

/* ============================================================
 * 构造一次可运行的沙箱（每次 URL 场景复用）
 * ============================================================ */
function createHarness(search) {
  /* ---------- 元素 stub ---------- */
  function makeEl(tag) {
    const el = {
      tag: tag || 'div', children: [], attrs: {}, _html: '', textContent: '',
      style: {}, dataset: {}, disabled: false, className: '', value: '', checked: false,
      classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
      listeners: {},
      setAttribute(n, v) { this.attrs[n] = String(v); },
      getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; },
      removeAttribute(n) { delete this.attrs[n]; },
      appendChild(c) { this.children.push(c); return c; },
      insertBefore(c) { this.children.push(c); return c; },
      removeChild(c) { return c; },
      addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
      querySelector(sel) { return sel === '.wz-qview' ? makeEl('div') : null; },
      querySelectorAll() { return []; },
      contains() { return true; },
      closest() { return this; },
      focus() { }
    };
    Object.defineProperty(el, 'innerHTML', {
      get() { return this._html; },
      set(v) { this._html = String(v); this.children.length = 0; }
    });
    return el;
  }

  const rootEl = makeEl('div#page-root');
  const elCache = {};
  const docListeners = {};
  const qlistStub = makeEl('div#wz-qlist');
  const availStubs = {};
  const created = [];        // createQuestionView 记录
  const destroyed = [];      // view.destroy 记录
  const toasts = [];         // Toast 记录
  const shellMounts = [];    // Shell.mount 记录

  function availStub(id) { return availStubs[id] || (availStubs[id] = makeEl('div#' + id)); }
  function inDom(idSel) { return rootEl._html.indexOf(idSel) >= 0; }

  const documentStub = {
    getElementById(id) {
      if (id === 'page-root') return rootEl;
      return elCache[id] || (elCache[id] = makeEl('div#' + id));
    },
    createElement(tag) { return makeEl(tag); },
    querySelector(sel) {
      if (sel === '#wz-qlist' && inDom('id="wz-qlist"')) return qlistStub;
      if (sel.indexOf('.wz-qrow[data-i=') >= 0 && inDom('id="wz-qlist"')) return makeEl('div.wz-qrow');
      if (sel.indexOf('#wz-avail') === 0 && inDom('id="' + sel.slice(1) + '"')) return availStub(sel.slice(1));
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    body: makeEl('body'),
    fonts: { ready: Promise.resolve() }
  };

  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    Math, Date, JSON, Promise, Array, Object, String, Number, Boolean, Error, isFinite,
    URLSearchParams,
    location: { protocol: 'http:', search: search || '', href: 'http://localhost/paper-builder.html' },
    navigator: { userAgent: 'node' },
    localStorage: (() => {
      const m = new Map();
      return {
        get length() { return m.size; },
        key: (i) => Array.from(m.keys())[i],
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => { m.delete(k); }
      };
    })(),
    fetch: async (url) => {
      const p = path.join(root, String(url).split('?')[0]);
      if (!fs.existsSync(p)) return { ok: false, status: 404, json: async () => null };
      return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) };
    },
    addEventListener() { }, removeEventListener() { },
    document: documentStub
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  function load(rel) {
    const code = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  }
  ['js/core/loader.js', 'js/core/storage.js', 'js/core/tags.js', 'js/core/bank.js',
    'js/core/builder.js', 'js/ui/math.js'].forEach(load);

  /* ---------- UI 层 stub（Shell / Toast / Render 只做记录） ---------- */
  const MX = sandbox.MX;
  MX.Shell = {
    mount(opts) { shellMounts.push(opts); },
    loading() { return { close() { } }; },
    emptyState(t, d) { return '<div class="empty">' + t + (d ? '：' + d : '') + '</div>'; }
  };
  MX.Toast = {
    info(m) { toasts.push(['info', m]); },
    ok(m) { toasts.push(['ok', m]); },
    warn(m) { toasts.push(['warn', m]); },
    error(m) { toasts.push(['err', m]); }
  };
  MX.Render = {
    typeName(id) {
      const t = (MX.Tags.questionTypes || []).filter((x) => x.id === id)[0];
      return t ? t.name : id;
    },
    createQuestionView(q, opts) {
      created.push({ id: q.id, index: opts && opts.index, score: q.paperScore });
      return { el: makeEl('article.q-card'), qid: q.id, destroy() { destroyed.push(q.id); } };
    }
  };

  load('js/pages/page-builder.js');

  /* ---------- 交互驱动 ---------- */
  function fireClick(act, attrs) {
    const btn = {
      attrs: Object.assign({}, attrs || {}),
      getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; },
      setAttribute(n, v) { this.attrs[n] = String(v); },
      closest() { return this; },
      classList: { toggle() { }, add() { }, remove() { } },
      innerHTML: ''
    };
    btn.attrs['data-act'] = act;
    (rootEl.listeners.click || []).forEach((fn) => fn({ target: btn }));
  }
  function fireEvent(type, attrs) {
    const t = Object.assign({}, attrs || {});
    t.getAttribute = (n) => (n in t ? t[n] : null);
    t.closest = () => t;
    t.classList = { toggle() { }, add() { }, remove() { } };
    (rootEl.listeners[type] || []).forEach((fn) => fn({ target: t }));
  }
  async function boot() {
    (docListeners['DOMContentLoaded'] || []).forEach((fn) => fn());
    await until(() => rootEl._html.indexOf('wz-steps') >= 0, 5000, '页面启动');
    await sleep(650); // 等 Step1 实时计数（220ms 防抖 + previewCount）
  }
  function html() { return rootEl._html; }
  function toastHas(kind, kw) {
    return toasts.some(([k, m]) => k === kind && String(m).indexOf(kw) >= 0);
  }
  function lastToast(kind) {
    for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i][0] === kind) return toasts[i][1];
    return '';
  }

  return { sandbox, MX, rootEl, html, fireClick, fireEvent, boot, toastHas, lastToast, toasts, created, destroyed, shellMounts, availStub };
}

/* ============================================================
 * 场景一：完整向导流程（单元测验 → 范围 → 规格 → 预览 → 各操作）
 * ============================================================ */
async function scenarioFull() {
  section('场景一：三步向导完整流程（真实引擎）');
  const h = createHarness('');
  await h.boot();

  /* ---- Step0 场景卡 ---- */
  ok(h.shellMounts.length === 1 && h.shellMounts[0].page === 'paper-builder', 'Shell.mount 挂载组卷中心');
  const s0 = h.html();
  ['单元测验', '期中期末', '口算速练', '整册综合', '自定义', '错题重练'].forEach((n) => {
    ok(s0.indexOf(n) >= 0, 'Step0 场景卡包含「' + n + '」');
  });
  ok(s0.indexOf('选场景') >= 0 && s0.indexOf('选范围') >= 0 && s0.indexOf('设规格') >= 0 && s0.indexOf('看预览') >= 0, '步骤条四步齐全');
  ok(s0.indexOf('mode-seg') < 0 && s0.indexOf('四种模式') < 0, '已删除「四种模式」选择器');
  ok(s0.indexOf('请恰好选择') < 0, '已删除「请恰好选择 1 个考点」类硬校验文案');

  /* ---- Step1 范围 ---- */
  h.fireClick('scene', { 'data-s': 'unit' });
  const s1 = h.html();
  ok(s1.indexOf('几年级？') >= 0, 'Step1 显示年级选择');
  ok((s1.match(/data-act="grade"/g) || []).length === 6, '年级为 6 个大按钮');
  ok(s1.indexOf('上册') >= 0 && s1.indexOf('下册') >= 0, '册次改为「上册 / 下册」');
  ok(s1.indexOf('📖 整册') >= 0, '单元选择包含「整册」');
  ok(s1.indexOf('data-act="unit"') >= 0, '单元卡片可多选');
  ok(s1.indexOf('下一步：设规格') >= 0, 'Step1 底部有下一步');
  ok(s1.indexOf('册次') < 0 && s1.indexOf('考点') < 0, '界面无「册次 / 考点」术语');

  // 实时计数：场景「单元测验」默认标准难度（1–2 星），一年级上册 11 题可出
  await until(() => h.availStub('wz-avail')._html.indexOf('当前条件下可出') >= 0, 3000, 'Step1 实时计数');
  const avail = h.availStub('wz-avail');
  ok(avail._html.indexOf('<b>11</b>') >= 0, 'Step1 实时显示「当前条件下可出 11 题」', avail._html);

  h.fireClick('grade', { 'data-g': '1' });
  ok(h.html().indexOf('data-g="1" aria-pressed="true"') >= 0, '年级按钮可选中（一年级）');
  h.fireClick('term', { 'data-t': 'up' });
  ok(h.html().indexOf('data-t="up" aria-pressed="true"') >= 0, '上册 / 下册可切换（上册）');
  h.fireClick('unit-all');
  ok(h.html().indexOf('data-act="unit-all" aria-pressed="true"') >= 0, '「整册」可选中');

  /* ---- Step2 规格 ---- */
  h.fireClick('next');
  const s2 = h.html();
  if (process.env.WIZDEBUG) fs.writeFileSync(path.join(os.tmpdir(), 'wz-step2.html'), s2);
  ['10 题', '15 题', '20 题', '25 题'].forEach((c) => ok(s2.indexOf(c) >= 0, 'Step2 题量按钮「' + c + '」'));
  ['基础', '标准', '挑战'].forEach((d) => ok(s2.indexOf(d) >= 0, 'Step2 难度「' + d + '」'));
  ok(s2.indexOf('打乱题目顺序') >= 0, 'Step2 有「是否打乱」开关');
  ok(s2.indexOf('高级设置') >= 0 && s2.indexOf('随机种子') >= 0, '高级设置默认折叠（总分 / 题型权重 / seed）');
  ok(s2.indexOf('自动补齐') >= 0, '高级设置含「自动补齐」开关');

  h.fireClick('count', { 'data-c': '10' });
  ok(h.html().indexOf('data-c="10" aria-pressed="true"') >= 0, '题量可选中（10 题）');
  h.fireClick('diff', { 'data-d': 'std' });
  ok(h.html().indexOf('data-d="std" aria-pressed="true"') >= 0, '难度可选中（标准）');

  /* ---- Step3 预览（真实组卷） ---- */
  h.fireClick('build');
  const built = await until(() => h.html().indexOf('wz-qlist') >= 0, 8000, '生成试卷并进入 Step3');
  if (!built) {
    if (process.env.WIZDEBUG) {
      console.log('  [debug] toasts:', JSON.stringify(h.toasts));
      console.log('  [debug] html tail:', h.html().slice(0, 400));
    }
    return;
  }
  const s3 = h.html();
  if (process.env.WIZDEBUG) {
    fs.writeFileSync(path.join(os.tmpdir(), 'wz-step3.html'), s3);
    fs.writeFileSync(path.join(os.tmpdir(), 'wz-step0.html'), s0);
    fs.writeFileSync(path.join(os.tmpdir(), 'wz-step1.html'), s1);
  }
  ok(s3.indexOf('题量：') >= 0 && s3.indexOf('总分：') >= 0 && s3.indexOf('建议时长：') >= 0, 'Step3 卷头信息齐全');
  ok(s3.indexOf('范围内可出：') >= 0, 'Step3 显示可出题数');
  ok(s3.indexOf('整卷重抽') >= 0, 'Step3 有「整卷重抽」');
  ['打印学生版', '打印教师版', '打印答案页'].forEach((n) => ok(s3.indexOf(n) >= 0, 'Step3 有「' + n + '」'));
  ok(s3.indexOf('开始考试') >= 0, 'Step3 有「开始考试」');
  ok(h.toastHas('ok', '组卷完成'), '生成后给出完成提示');
  ok(h.created.length === 10, '按 10 题量渲染 10 道题（实际 ' + h.created.length + '）', h.created.length);
  ok(h.created.every((c, i) => c.index === i + 1), '题号连续（1..10）');

  // 锁题 → 换题被引擎拒绝
  h.fireClick('lock', { 'data-i': '0' });
  ok(h.toastHas('info', '已锁定第 1 题'), '锁定第 1 题有提示');
  h.fireClick('swap', { 'data-i': '0' });
  await sleep(120);
  ok(h.toastHas('warn', '该题已锁定，无法替换'), '锁定题不能被换一题替换');

  // 换一题：选「题库有余量」的类型，保证可替换；总分必须不变
  const paper0 = h.MX.Storage.getPapers().length; // 尚未保存
  ok(paper0 === 0, '初始无已保存试卷');
  // 与引擎一致的候选口径：同册 + 标准难度（1–2 星）；第 0 题已锁定，跳过
  const bankQs = h.MX.Bank.questionsOf(['grade1-up']).filter((q) => q.difficulty >= 1 && q.difficulty <= 2);
  const paperCountByType = {};
  h.created.forEach((c) => { const q = bankQs.filter((x) => x.id === c.id)[0]; if (q) paperCountByType[q.type] = (paperCountByType[q.type] || 0) + 1; });
  const bankCountByType = {};
  bankQs.forEach((q) => { bankCountByType[q.type] = (bankCountByType[q.type] || 0) + 1; });
  let swapIdx = -1;
  for (let i = 1; i < h.created.length; i++) {
    const q = bankQs.filter((x) => x.id === h.created[i].id)[0];
    if (q && (bankCountByType[q.type] || 0) - (paperCountByType[q.type] || 0) >= 1) { swapIdx = i; break; }
  }
  ok(swapIdx >= 0, '找到可替换的题目（同类型题库有余量）', swapIdx);
  if (swapIdx >= 0) {
    const before = h.created.slice();
    h.fireClick('swap', { 'data-i': String(swapIdx) });
    const swapped = await until(() => h.toastHas('ok', '已替换第'), 5000, '换一题完成');
    if (!swapped && process.env.WIZDEBUG) {
      console.log('  [debug] swap toasts:', JSON.stringify(h.toasts.slice(-4)));
    }
    ok(h.toastHas('ok', '分值不变'), '换一题后总分不变（引擎保证）');
    const after = h.created.slice(-1)[0];
    if (process.env.WIZDEBUG && (!after || after.score !== before[swapIdx].score)) {
      console.log('  [debug] swapIdx=' + swapIdx + ' before=' + JSON.stringify(before[swapIdx]) +
        ' after=' + JSON.stringify(after) + ' createdLen=' + h.created.length +
        ' tail3=' + JSON.stringify(h.created.slice(-3)));
    }
    ok(after && after.score === before[swapIdx].score, '换一题后该题分值不变（' + before[swapIdx].score + '）');
    ok(after && after.id !== before[swapIdx].id, '换一题确实换成了新题（' + before[swapIdx].id + ' → ' + (after && after.id) + '）');
    ok(h.destroyed.indexOf(before[swapIdx].id) >= 0, '旧题视图已销毁重建');
  }

  /* ---- 保存试卷（卡 4 瘦身存储 + 回查拼装） ---- */
  h.fireClick('save');
  await sleep(80);
  const papers = h.MX.Storage.getPapers();
  ok(papers.length === 1, '保存后「我的试卷」有 1 份');
  if (papers.length) {
    const entry = papers[0];
    ok(!entry.questions, '瘦身存储：不再保存整卷 questions');
    ok(Array.isArray(entry.questionIds) && entry.questionIds.length === 10, '瘦身存储：保存 questionIds（10 个）');
    const reassembled = await h.MX.Storage.getPaper(entry.id);
    ok(reassembled && reassembled.questions && reassembled.questions.length === 10, 'getPaper 回查拼装 10 题');
    const sum = reassembled.questions.reduce((a, q) => a + q.paperScore, 0);
    ok(Math.abs(sum - entry.totalScore) < 0.01, '回查拼装后总分一致（' + sum + ' vs ' + entry.totalScore + '）');
  }

  /* ---- 整卷重抽 ---- */
  const createdBefore = h.created.length;
  h.fireClick('redraw');
  await until(() => h.toastHas('ok', '已重新抽题'), 8000, '整卷重抽完成');
  ok(h.created.length === createdBefore + 10, '整卷重抽后重新渲染 10 道题');

  /* ---- 打印三个版本 ---- */
  h.fireClick('print', { 'data-m': 'student' });
  ok(h.sandbox.location.href === 'print.html?mode=student', '打印学生版跳转 print.html', h.sandbox.location.href);
  h.fireClick('print', { 'data-m': 'teacher' });
  ok(h.sandbox.location.href === 'print.html?mode=teacher', '打印教师版跳转 print.html', h.sandbox.location.href);
  h.fireClick('print', { 'data-m': 'answer' });
  ok(h.sandbox.location.href === 'print.html?mode=answer', '打印答案页跳转 print.html', h.sandbox.location.href);
  const job = h.MX.Storage.read('math_exam_print_job', null);
  ok(job && job.questions && job.questions.length === 10, '打印任务包含整卷题目');

  /* ---- 开始考试 ---- */
  h.fireClick('start');
  ok(h.sandbox.location.href.indexOf('exam.html?examId=') === 0, '开始考试跳转 exam.html', h.sandbox.location.href);
  const cur = h.MX.Storage.read('math_exam_current_paper', null);
  ok(cur && cur.paper && cur.paper.questions.length === 10, '考试入口写入当前试卷');
}

/* ============================================================
 * 场景二：题目不足 → 黄条自动补齐 + 「不自动补齐」开关
 * （?point= 只有 1 道题的知识点，验收关键 ②）
 * ============================================================ */
async function scenarioShortage() {
  section('场景二：题目不足黄条与自动补齐开关（?point= 直达 Step3）');
  const h = createHarness('?point=rj-g1u-NA-sys110gs');
  await h.boot();

  const s3 = h.html();
  ok(s3.indexOf('wz-qlist') >= 0, '?point= 直达 Step3（自动生成）');
  ok(s3.indexOf('wz-notice') >= 0, '题目不足时显示黄条');
  ok(s3.indexOf('当前范围仅 1 道题，已自动加入') >= 0, '黄条文案：「当前范围仅 1 道题，已自动加入…」', s3.indexOf('wz-notice') >= 0 ? '有黄条' : '无黄条');
  ok(s3.indexOf('同单元') >= 0 || s3.indexOf('同册') >= 0, '黄条说明放宽范围（同单元 / 同册）');
  ok(s3.indexOf('不自动补齐') >= 0, '黄条提供「不自动补齐」开关');
  ok(h.created.length >= 6, 'autoRelax 把 1 题放宽到 ≥6 题（实际 ' + h.created.length + '）', h.created.length);

  // 关闭自动补齐 → 按实际题量出卷（1 题 → 练习卷）
  h.fireClick('toggle-relax');
  await until(() => h.toastHas('info', '自动补齐'), 8000, '切换自动补齐后重新组卷');
  const s3b = h.html();
  ok(s3b.indexOf('未自动补齐') >= 0, '关闭后黄条说明「未自动补齐」');
  ok(s3b.indexOf('练习卷') >= 0, '题量 < 5 自动降级为练习卷');
  ok(s3b.indexOf('恢复自动补齐') >= 0, '黄条提供「恢复自动补齐」开关');
}

/* ============================================================
 * 场景三：?book= 直达 Step3
 * ============================================================ */
async function scenarioBook() {
  section('场景三：?book= 直达 Step3');
  const h = createHarness('?book=grade2-up');
  await h.boot();
  const s3 = h.html();
  ok(s3.indexOf('wz-qlist') >= 0, '?book= 直达 Step3（自动生成）');
  ok(h.created.length > 0, '?book= 自动出卷（' + h.created.length + ' 题）', h.created.length);
  ok(s3.indexOf('二年级上册') >= 0, '标题带册次名（二年级上册）');
}

/* ============================================================
 * 静态检查：术语替换与 44px 触控目标
 * ============================================================ */
function staticChecks() {
  section('静态检查：术语 / 触控目标 / 移动端');
  const page = fs.readFileSync(path.join(root, 'js/pages/page-builder.js'), 'utf8');
  const noComment = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok(noComment.indexOf('册次') < 0, '页面可见文案无「册次」（已改为上册 / 下册）');
  ok(noComment.indexOf('考点') < 0, '页面可见文案无「考点」（已改为知识点）');
  ok(noComment.indexOf('二级知识点') < 0, '页面可见文案无「二级知识点」（已改为单元）');
  ok(page.indexOf('previewCount') >= 0 && page.indexOf('autoRelax') >= 0 &&
     page.indexOf('swapOne') >= 0 && page.indexOf('lockQuestion') >= 0, '向导调用卡 5 内核 API');

  const css = fs.readFileSync(path.join(root, 'css/components.css'), 'utf8');
  const wzBlock = css.slice(css.indexOf('卡 6 —— 组卷中心三步向导'));
  ok(wzBlock.length > 500, 'components.css 已追加向导样式（仅追加）');
  ok((wzBlock.match(/min-height:\s*44px/g) || []).length >= 6, '可点击元素 ≥ 44px（多处声明）');
  ok(wzBlock.indexOf('position: sticky') >= 0 && wzBlock.indexOf('var(--header-h)') >= 0, '步骤条吸顶');
  ok(wzBlock.indexOf('@media (max-width: 860px)') >= 0 && wzBlock.indexOf('grid-template-columns: 1fr') >= 0, '移动端单列');
  ok(wzBlock.indexOf('overflow-x: auto') >= 0, '步骤条可横向滚动（不撑破页面）');
  ok(css.indexOf('卡 6 —— 组卷中心三步向导') > css.indexOf('acc.open'), '向导样式追加在文件末尾（不影响既有规则）');
}

/* ============================================================ */
(async function main() {
  console.log('卡 6 组卷中心三步向导 · Node 端到端验收');
  await scenarioFull();
  await scenarioShortage();
  await scenarioBook();
  staticChecks();
  console.log('\n============================================================');
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  if (fail) {
    failures.forEach((f) => console.log('  ✗ ' + f));
    process.exitCode = 1;
  } else {
    console.log('✅ 向导验收全部通过');
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
