/* ============================================================
 * page-builder.js —— 组卷中心（三步向导，卡 6）
 *   Step0 场景卡 → Step1 范围 → Step2 规格 → Step3 预览
 * 引擎：MX.Builder（卡 5）
 *   - previewCount()  实时预判「当前条件下可出 N 题」
 *   - autoRelax       题目不足时自动放宽（同单元→同册同类→同册）
 *   - swapOne / lockQuestion  换一题（总分不变）/ 锁定
 * 用语（面向小学老师 / 家长，不出现专业术语）：
 *   册次 → 上册 / 下册；考点 → 知识点；二级知识点 → 单元
 * 兼容：?book= / ?point= / ?quick= 直达并自动跳到 Step3
 * ============================================================ */
(function () {
  'use strict';

  var root, previewPaper = null, previewViews = [];
  var availTimer = null, availToken = 0;
  var lastAvail = null;          // 最近一次 previewCount 结果（用于黄条与计数）

  /* ---------- 向导状态 ---------- */
  var state = {
    step: 0,                     // 0 场景 / 1 范围 / 2 规格 / 3 预览
    maxStep: 0,                  // 已到达的最大步骤（控制步骤条可回退）
    scenario: '',                // unit / midterm / oral / book / custom
    grade: 1,                    // 1..6
    term: 'up',                  // up / down
    units: [],                   // 已选单元（knowledge id）
    unitAll: false,              // 整册
    points: [],                  // 仅 URL ?point= 直达时使用
    count: 10,                   // 题量
    difficulty: 'std',           // basic / std / hard
    shuffle: true,               // 打乱题序
    autoRelax: true,             // 题目不足时自动补齐
    totalScore: 100,             // 高级：总分
    typeRatio: {},               // 高级：题型权重 { choice: 1, ... }
    seed: '',                    // 高级：随机种子
    title: '',                   // 试卷标题（留空自动命名）
    titleTouched: false          // 用户是否手动改过标题（改过就不再自动覆盖）
  };

  var GRADES = [
    { g: 1, name: '一年级' }, { g: 2, name: '二年级' }, { g: 3, name: '三年级' },
    { g: 4, name: '四年级' }, { g: 5, name: '五年级' }, { g: 6, name: '六年级' }
  ];
  var TERMS = [{ t: 'up', name: '上册' }, { t: 'down', name: '下册' }];
  var COUNTS = [10, 15, 20, 25];
  var DIFFS = [
    { d: 'basic', name: '基础', desc: '1 星 · 紧扣课本' },
    { d: 'std', name: '标准', desc: '1–2 星 · 难易搭配' },
    { d: 'hard', name: '挑战', desc: '2–3 星 · 拔高练习' }
  ];
  var DIFF_RANGE = { basic: [1, 1], std: [1, 2], hard: [2, 3] };
  var STEPS = ['选场景', '选范围', '设规格', '看预览'];

  /* 场景卡：点击后按预设进入向导（错题重练直接跳错题本） */
  var SCENARIOS = [
    { id: 'unit', ico: '📝', name: '单元测验', desc: '围绕一个单元，快速来一次小测验', count: 10, diff: 'std', unitAll: false, types: {} },
    { id: 'midterm', ico: '📋', name: '期中期末', desc: '整册范围综合卷，考前摸摸底', count: 20, diff: 'std', unitAll: true, types: {} },
    { id: 'oral', ico: '⚡', name: '口算速练', desc: '只练计算题，限时提速', count: 10, diff: 'basic', unitAll: false, types: { calculation: 1 } },
    { id: 'book', ico: '📚', name: '整册综合', desc: '一册一整卷，覆盖全册内容', count: 25, diff: 'std', unitAll: true, types: {} },
    { id: 'custom', ico: '🎛️', name: '自定义', desc: '范围和规格都由自己决定', count: 10, diff: 'std', unitAll: false, types: {} }
  ];

  function esc(s) { return window.MX.Math.escapeHtml(s); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function bookId() { return 'grade' + state.grade + '-' + state.term; }
  function gradeName() { return (GRADES.filter(function (g) { return g.g === state.grade; })[0] || {}).name || ''; }
  function termName() { return (TERMS.filter(function (t) { return t.t === state.term; })[0] || {}).name || ''; }
  function scenarioName() { return (SCENARIOS.filter(function (s) { return s.id === state.scenario; })[0] || {}).name || '自定义'; }

  /** 自动标题：年级 + 册次 + 场景（用户手动改过后不再覆盖） */
  function autoTitle() { return gradeName() + termName() + '·' + scenarioName(); }

  /* ============================================================
   * 配置映射：向导选择 → 卡 5 引擎配置（模式由选择自动推断）
   * ============================================================ */
  function inferMode(cfg) {
    if (cfg.books.length > 1) return 'cross';
    if (cfg.points.length === 1) return 'single';
    if (cfg.points.length > 1) return 'multi';
    if (cfg.types.length) return 'type';
    return 'multi';
  }

  function builderConfig() {
    var types = Object.keys(state.typeRatio).filter(function (k) { return state.typeRatio[k] > 0; });
    var cfg = {
      title: state.title,
      books: [bookId()],
      knowledges: state.unitAll ? [] : state.units.slice(),
      points: state.points.slice(),
      domains: [],
      types: types,
      typeRatio: state.typeRatio,
      difficultyMin: DIFF_RANGE[state.difficulty][0],
      difficultyMax: DIFF_RANGE[state.difficulty][1],
      difficultyWeights: { 1: 1, 2: 1, 3: 1 },
      count: state.count,
      totalScore: state.totalScore,
      shuffle: state.shuffle,
      shuffleOptions: window.MX.Storage.getSettings().shuffleOptions,
      seed: state.seed,
      autoRelax: state.autoRelax,
      groupBy: 'flat'
    };
    cfg.mode = inferMode(cfg);
    return cfg;
  }

  function unitsOfBook(bid) {
    var tree = window.MX.Tags.tree({ books: [bid] });
    return (tree[0] && tree[0].children) || [];
  }

  /* ============================================================
   * 渲染
   * ============================================================ */
  function render() {
    root.innerHTML = '<div class="wz">' + stepsHtml() + paneHtml() + '</div>';
    if (state.step === 3) mountQuestionViews();
    else if (state.step === 1 || state.step === 2) scheduleAvail();
  }

  function stepsHtml() {
    var html = '<nav class="wz-steps" aria-label="组卷步骤">';
    STEPS.forEach(function (name, i) {
      var cls = 'wz-step' + (i === state.step ? ' on' : '') + (i < state.step ? ' done' : '');
      var disabled = i > state.maxStep ? ' disabled' : '';
      var cur = i === state.step ? ' aria-current="step"' : '';
      html += '<button type="button" class="' + cls + '" data-act="goto" data-i="' + i + '"' + disabled + cur + '>' +
        '<span class="wz-step-no">' + (i + 1) + '</span><span>' + name + '</span></button>';
    });
    return html + '</nav>';
  }

  function paneHtml() {
    if (state.step === 0) return sceneHtml();
    if (state.step === 1) return scopeHtml();
    if (state.step === 2) return specHtml();
    return previewHtml();
  }

  /* ---------- Step0 场景卡 ---------- */
  function sceneHtml() {
    var html = '<div class="wz-pane">' +
      '<div class="card wz-pad">' +
      '<h2 class="wz-h2">你想出一份什么样的卷子？</h2>' +
      '<p class="wz-tip mb-3">选一个场景，剩下的两步很简单：选范围 → 设规格。</p>' +
      '<div class="wz-scenes">';
    SCENARIOS.forEach(function (s) {
      html += '<button type="button" class="wz-scene" data-act="scene" data-s="' + s.id + '">' +
        '<span class="wz-scene-ico">' + s.ico + '</span>' +
        '<span class="wz-scene-name">' + esc(s.name) + '</span>' +
        '<span class="wz-scene-desc">' + esc(s.desc) + '</span>' +
        '</button>';
    });
    html += '</div>' +
      '<div class="wz-scene-extra">' +
      '<button type="button" class="wz-scene wz-scene-link" data-act="scene" data-s="wrong">' +
      '<span class="wz-scene-ico">📌</span>' +
      '<span class="wz-scene-name">错题重练</span>' +
      '<span class="wz-scene-desc">把错题本里的题组成一份新练习（前往错题本）</span>' +
      '</button>' +
      '</div>' +
      '</div></div>';
    return html;
  }

  /* ---------- Step1 范围 ---------- */
  function scopeHtml() {
    var html = '<div class="wz-pane">' +
      '<div class="card wz-pad">' +
      '<h2 class="wz-h2">选范围</h2>' +

      '<h3 class="wz-q">几年级？</h3>' +
      '<div class="wz-grid-3">';
    GRADES.forEach(function (g) {
      html += '<button type="button" class="wz-big-btn' + (state.grade === g.g ? ' on' : '') + '" data-act="grade" data-g="' + g.g + '" aria-pressed="' + (state.grade === g.g) + '">' + g.name + '</button>';
    });
    html += '</div>' +

      '<h3 class="wz-q wz-mt">上册还是下册？</h3>' +
      '<div class="wz-grid-2">';
    TERMS.forEach(function (t) {
      html += '<button type="button" class="wz-big-btn' + (state.term === t.t ? ' on' : '') + '" data-act="term" data-t="' + t.t + '" aria-pressed="' + (state.term === t.t) + '">' + t.name + '</button>';
    });
    html += '</div>' +

      '<h3 class="wz-q wz-mt">选单元<span class="wz-q-sub">可多选；点「整册」就是整本书</span></h3>' +
      '<div class="wz-unit-grid">' +
      '<button type="button" class="wz-unit wz-unit-all' + (state.unitAll ? ' on' : '') + '" data-act="unit-all" aria-pressed="' + state.unitAll + '">📖 整册' +
      '<span class="wz-unit-n">' + (unitsOfBook(bookId()).length) + ' 个单元</span></button>';
    unitsOfBook(bookId()).forEach(function (u) {
      var on = !state.unitAll && state.units.indexOf(u.id) >= 0;
      html += '<button type="button" class="wz-unit' + (on ? ' on' : '') + '" data-act="unit" data-id="' + u.id + '" aria-pressed="' + on + '">' +
        '<span>' + esc(u.name) + '</span><span class="wz-unit-n">' + (u.children || []).length + ' 个知识点</span></button>';
    });
    html += '</div></div>' +

      '<div class="wz-countbar">' +
      '<div><div class="wz-avail" id="wz-avail">正在数题…</div>' +
      '<div class="wz-avail-hint" id="wz-avail-hint"></div></div>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-ghost" data-act="goto" data-i="0">← 上一步</button>' +
      '<button type="button" class="btn btn-primary btn-lg" data-act="next">下一步：设规格 →</button>' +
      '</div></div>';
    return html;
  }

  /* ---------- Step2 规格 ---------- */
  function specHtml() {
    var types = window.MX.Tags.questionTypes || [];
    var html = '<div class="wz-pane">' +
      '<div class="card wz-pad">' +
      '<h2 class="wz-h2">设规格</h2>' +

      '<h3 class="wz-q">出多少题？</h3>' +
      '<div class="wz-grid-3">';
    COUNTS.forEach(function (c) {
      html += '<button type="button" class="wz-big-btn' + (state.count === c ? ' on' : '') + '" data-act="count" data-c="' + c + '" aria-pressed="' + (state.count === c) + '">' + c + ' 题</button>';
    });
    html += '</div>' +

      '<h3 class="wz-q wz-mt">难度？</h3>' +
      '<div class="wz-grid-3">';
    DIFFS.forEach(function (d) {
      html += '<button type="button" class="wz-big-btn' + (state.difficulty === d.d ? ' on' : '') + '" data-act="diff" data-d="' + d.d + '" aria-pressed="' + (state.difficulty === d.d) + '">' + d.name + '<small>' + d.desc + '</small></button>';
    });
    html += '</div>' +

      '<h3 class="wz-q wz-mt">题目顺序</h3>' +
      '<button type="button" class="wz-switch" role="switch" aria-checked="' + state.shuffle + '" data-act="shuffle">' +
      '<span class="dot"></span>打乱题目顺序' + (state.shuffle ? '（已开启）' : '（按题型顺序）') + '</button>' +

      '<details class="wz-adv wz-mt">' +
      '<summary>高级设置（总分 / 题型权重 / 随机种子，可不改）</summary>' +
      '<div class="wz-adv-body">' +

      '<div class="field"><label>总分（留作默认 100，练习卷不折算）</label>' +
      '<input type="number" class="input" data-adv="total" min="0" max="300" step="5" value="' + state.totalScore + '" style="max-width:160px"></div>' +

      '<div class="field"><label>题型权重（0 表示不限，数字越大占比越高）</label>' +
      '<div class="wz-type-grid">';
    types.forEach(function (t) {
      var v = state.typeRatio[t.id] || 0;
      var on = v > 0;
      html += '<div class="wz-type-row">' +
        '<label class="check-pill' + (on ? ' on' : '') + '"><input type="checkbox" data-adv="type" value="' + t.id + '"' + (on ? ' checked' : '') + '>' + t.name + '</label>' +
        '<input type="number" class="input" data-tw="' + t.id + '" min="0" max="9" value="' + v + '">' +
        '</div>';
    });
    html += '</div></div>' +

      '<div class="field"><label>随机种子（相同种子 + 相同条件 = 同一份卷）</label>' +
      '<input type="text" class="input" data-adv="seed" placeholder="留空则每次不同" value="' + esc(state.seed) + '" style="max-width:260px"></div>' +

      '<div class="field"><label>题目不够时</label>' +
      '<button type="button" class="wz-switch" role="switch" aria-checked="' + state.autoRelax + '" data-act="adv-relax">' +
      '<span class="dot"></span>自动补齐（加入同单元 / 同册的题）</button></div>' +

      '</div></details>' +

      '</div>' +

      '<div class="wz-countbar">' +
      '<div><div class="wz-avail" id="wz-avail2">正在数题…</div>' +
      '<div class="wz-avail-hint" id="wz-avail2-hint"></div></div>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-ghost" data-act="goto" data-i="1">← 上一步</button>' +
      '<button type="button" class="btn btn-primary btn-lg" data-act="build">🎲 生成试卷</button>' +
      '</div></div>';
    return html;
  }

  /* ---------- Step3 预览 ---------- */
  function previewHtml() {
    var p = previewPaper;
    if (!p) return '<div class="wz-pane"><div class="card wz-pad">' + window.MX.Shell.emptyState('还没有试卷', '请先完成前面的步骤，生成一份试卷。') + '</div></div>';

    var exact = lastAvail ? lastAvail.available : null;
    var availTxt = exact == null ? '—' : String(exact);
    if (p.relaxLevel > 0 && p.stats && p.stats.candidates > (exact || 0)) {
      availTxt += '（放宽后 ' + p.stats.candidates + '）';
    }

    var html = '<div class="wz-pane">' +
      '<div class="card wz-pad wz-paper-head">' +
      '<div class="flex gap-1 wrap" style="align-items:center">' +
      '<input type="text" class="input wz-paper-title" id="wz-paper-title" value="' + esc(p.title) + '" placeholder="给这份卷子起个名字" aria-label="试卷标题" style="flex:1 1 220px">' +
      (p.practice ? '<span class="badge badge-manual">练习卷</span>' : '') +
      '</div>' +
      '<div class="wz-paper-meta">' +
      '<span>题量：<b>' + p.count + '</b> 题</span>' +
      '<span>总分：<b>' + p.totalScore + '</b> 分</span>' +
      '<span>建议时长：<b>' + p.duration + '</b> 分钟</span>' +
      '<span>范围内可出：<b>' + availTxt + '</b> 题</span>' +
      '</div>' +
      noticeHtml(p) +
      '</div>' +

      '<div id="wz-qlist"></div>' +

      '<div class="wz-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="redraw">🎲 整卷重抽</button>' +
      '<button type="button" class="btn btn-ghost" data-act="print" data-m="student">🖨️ 打印学生版</button>' +
      '<button type="button" class="btn btn-ghost" data-act="print" data-m="teacher">🖨️ 打印教师版</button>' +
      '<button type="button" class="btn btn-ghost" data-act="print" data-m="answer">🖨️ 打印答案页</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-ghost" data-act="save">💾 保存试卷</button>' +
      '<button type="button" class="btn btn-success btn-lg" data-act="start">▶ 开始考试</button>' +
      '</div>' +

      '<div class="wz-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="goto" data-i="2">← 上一步：改规格</button>' +
      '<button type="button" class="btn btn-ghost" data-act="goto" data-i="1">换范围</button>' +
      '</div>' +

      '</div>';
    return html;
  }

  /** 黄条：题目不足 / 自动补齐说明 + 「不自动补齐」开关 */
  function noticeHtml(p) {
    var info = noticeInfo(p);
    if (!info) return '';
    var btnTxt = state.autoRelax ? '不自动补齐' : '恢复自动补齐';
    return '<div class="wz-notice" id="wz-notice">' +
      '<span>⚠️ ' + esc(info.text) + '</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-warm btn-sm" data-act="toggle-relax">' + btnTxt + '</button>' +
      '</div>';
  }

  function noticeInfo(p) {
    if (!p) return null;
    var exact = lastAvail ? lastAvail.available : null;
    var req = builderConfig().count;
    var scope = { 1: '同单元', 2: '同册同类', 3: '同册' }[p.relaxLevel] || '';
    if (p.relaxLevel > 0 && exact != null) {
      var added = Math.max(0, (p.stats && p.stats.candidates || 0) - exact);
      return { text: '当前范围仅 ' + exact + ' 道题，已自动加入' + scope + '的 ' + added + ' 道题', relaxed: true };
    }
    if (p.count < req) {
      var txt = '当前范围共 ' + (exact == null ? p.count : exact) + ' 道题，不足 ' + req + ' 道' +
        (state.autoRelax ? '（已尽可能自动补齐）' : '（未自动补齐）') +
        '，本卷按实际题量 ' + p.count + ' 题出卷';
      return { text: txt, relaxed: state.autoRelax };
    }
    return null;
  }

  function mountQuestionViews() {
    var list = $('#wz-qlist');
    if (!list || !previewPaper) return;
    previewViews.forEach(function (v) { v.destroy && v.destroy(); });
    previewViews = [];
    previewPaper.questions.forEach(function (q, i) {
      var row = document.createElement('div');
      row.className = 'wz-qrow' + (q.locked ? ' locked' : '');
      row.setAttribute('data-i', String(i));
      row.innerHTML =
        '<div class="wz-qrow-head">' +
        '<span class="wz-qno">' + (q.paperIndex || (i + 1)) + '</span>' +
        '<span class="badge badge-type">' + window.MX.Render.typeName(q.type) + '</span>' +
        '<span class="q-score">' + q.paperScore + ' 分</span>' +
        (q.locked ? '<span class="badge badge-manual">已锁定</span>' : '') +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="swap" data-i="' + i + '"' + (q.locked ? ' disabled' : '') + '>🔁 换一题</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="lock" data-i="' + i + '" aria-pressed="' + (!!q.locked) + '">' + (q.locked ? '🔒 已锁定' : '🔓 锁定') + '</button>' +
        '</div>' +
        '<div class="wz-qview"></div>';
      var v = window.MX.Render.createQuestionView(q, { index: q.paperIndex || (i + 1), readonly: true, startExpanded: true });
      previewViews.push(v);
      row.querySelector('.wz-qview').appendChild(v.el);
      list.appendChild(row);
    });
  }

  /* ============================================================
   * 实时计数（previewCount，只算不抽）
   * ============================================================ */
  function scheduleAvail() {
    if (availTimer) clearTimeout(availTimer);
    availTimer = setTimeout(refreshAvail, 220);
  }

  async function refreshAvail() {
    if (state.step !== 1 && state.step !== 2) return;
    var token = ++availToken;
    var pre;
    try { pre = await window.MX.Builder.previewCount(builderConfig()); }
    catch (e) { return; }
    if (token !== availToken) return;   // 已过期（用户又改了条件）
    lastAvail = pre;
    var n = pre.available;
    var hint = '';
    if (n === 0) hint = '这个范围暂时没有题目，换一个年级 / 单元 / 难度试试';
    else if (n < state.count) hint = '不足 ' + state.count + ' 题：将自动补齐，或按实际题量出卷';
    else hint = '足够出 ' + state.count + ' 题';
    var main = $('#wz-avail') || $('#wz-avail2');
    var sub = $('#wz-avail-hint') || $('#wz-avail2-hint');
    if (main) main.innerHTML = '当前条件下可出 <b>' + n + '</b> 题';
    if (sub) sub.textContent = hint;
  }

  /* ============================================================
   * 组卷
   * ============================================================ */
  async function doBuild(silent) {
    var cfg = builderConfig();
    var load = window.MX.Shell.loading('正在组卷…');
    try {
      // 先算「精确范围」的可出题数（不放宽），供黄条与计数使用
      var pre = null;
      try { pre = await window.MX.Builder.previewCount(cfg); } catch (e) { pre = null; }
      var res = await window.MX.Builder.build(cfg);
      load.close();
      if (!res.ok) { window.MX.Toast.warn(res.message); return false; }
      previewPaper = res.paper;
      lastAvail = pre;
      if (state.step < 3) { state.step = 3; }
      if (state.maxStep < 3) state.maxStep = 3;
      render();
      if (!silent) {
        window.MX.Toast.ok('组卷完成：共 ' + res.paper.count + ' 题，总分 ' + res.paper.totalScore + ' 分' + (res.paper.practice ? '（练习卷）' : ''));
      }
      return true;
    } catch (e) {
      load.close();
      window.MX.Toast.error('组卷失败：' + e.message);
      console.error(e);
      return false;
    }
  }

  async function swapAt(i) {
    if (!previewPaper) return;
    var load = window.MX.Shell.loading('正在换题…');
    try {
      var res = await window.MX.Builder.swapOne(previewPaper, i, builderConfig());
      load.close();
      if (!res.ok) { window.MX.Toast.warn(res.message); return; }
      // 只重绘被换掉的那一题（总分由引擎保证不变）
      var old = previewViews[i];
      if (old && old.destroy) old.destroy();
      var q = previewPaper.questions[i];
      var row = $('#wz-qlist .wz-qrow[data-i="' + i + '"]');
      if (row && q) {
        row.querySelector('.wz-qview').innerHTML = '';
        var v = window.MX.Render.createQuestionView(q, { index: q.paperIndex || (i + 1), readonly: true, startExpanded: true });
        previewViews[i] = v;
        row.querySelector('.wz-qview').appendChild(v.el);
      }
      window.MX.Toast.ok(res.message + '，分值不变');
    } catch (e) {
      load.close();
      window.MX.Toast.error('换题失败：' + e.message);
      console.error(e);
    }
  }

  function lockAt(i) {
    if (!previewPaper) return;
    var locked = window.MX.Builder.lockQuestion(previewPaper, i);
    applyLockUI(i, locked);
    window.MX.Toast.info(locked ? '已锁定第 ' + (i + 1) + ' 题，换题与重抽都会跳过它' : '已解除锁定');
  }

  /** 把某行的锁定状态同步到界面（不重建整页） */
  function applyLockUI(i, locked) {
    var row = $('#wz-qlist .wz-qrow[data-i="' + i + '"]');
    if (!row) return;
    row.classList.toggle('locked', !!locked);
    var btn = row.querySelector('[data-act="lock"]');
    if (btn) {
      btn.innerHTML = locked ? '🔒 已锁定' : '🔓 锁定';
      btn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    }
    var sw = row.querySelector('[data-act="swap"]');
    if (sw) sw.disabled = !!locked;
    var head = row.querySelector('.wz-qrow-head');
    if (!head) return;
    var tag = head.querySelector('.badge-manual');
    if (locked && !tag) {
      tag = document.createElement('span');
      tag.className = 'badge badge-manual';
      tag.textContent = '已锁定';
      head.insertBefore(tag, head.querySelector('.spacer'));
    } else if (!locked && tag && tag.parentNode) {
      tag.parentNode.removeChild(tag);
    }
  }

  function redraw() {
    // 记录当前锁定的题目：重抽后仍在卷中的保留锁定标记
    var lockedIds = {};
    if (previewPaper) {
      previewPaper.questions.forEach(function (q) { if (q.locked) lockedIds[q.id] = 1; });
    }
    state.seed = 'R' + Date.now().toString(36);
    doBuild(true).then(function (ok) {
      if (!ok || !previewPaper) return;
      // doBuild 内部已整体重绘；这里只把「仍在卷中的锁定题」的界面状态补回来
      var kept = 0;
      previewPaper.questions.forEach(function (q, i) {
        if (lockedIds[q.id]) { q.locked = true; kept++; applyLockUI(i, true); }
      });
      window.MX.Toast.ok('已重新抽题' + (kept ? '（其中 ' + kept + ' 道锁定题仍在卷中）' : ''));
    });
  }

  function openPrint(mode) {
    if (!previewPaper) { window.MX.Toast.warn('请先生成试卷'); return; }
    window.MX.Storage.write('math_exam_print_job', previewPaper);
    location.href = 'print.html?mode=' + mode;
  }

  function startExam() {
    if (!previewPaper) { window.MX.Toast.warn('请先生成试卷'); return; }
    window.MX.Storage.write('math_exam_current_paper', { paper: previewPaper, createdAt: Date.now() });
    location.href = 'exam.html?examId=' + encodeURIComponent(previewPaper.examId);
  }

  function savePaper() {
    if (!previewPaper) { window.MX.Toast.warn('请先生成试卷'); return; }
    window.MX.Storage.savePaper({
      id: previewPaper.id, title: previewPaper.title, createdAt: Date.now(),
      count: previewPaper.count, totalScore: previewPaper.totalScore,
      config: previewPaper.config, paper: previewPaper
    });
    window.MX.Toast.ok('试卷已保存到「我的试卷」');
  }

  /* ============================================================
   * 事件（根元素委托，切换步骤后无需重新绑定）
   * ============================================================ */
  function onClick(e) {
    var b = e.target.closest('button[data-act]');
    if (!b || !root.contains(b)) return;
    var act = b.getAttribute('data-act');

    if (act === 'scene') {
      var id = b.getAttribute('data-s');
      if (id === 'wrong') { location.href = 'wrongbook.html'; return; }
      var sc = SCENARIOS.filter(function (s) { return s.id === id; })[0];
      if (!sc) return;
      state.scenario = sc.id;
      state.count = sc.count;
      state.difficulty = sc.diff;
      state.unitAll = sc.unitAll;
      state.units = [];
      state.points = [];
      state.typeRatio = {};
      Object.keys(sc.types).forEach(function (k) { state.typeRatio[k] = sc.types[k]; });
      state.titleTouched = false;
      state.title = autoTitle();
      state.step = 1;
      if (state.maxStep < 1) state.maxStep = 1;
      render();
      return;
    }

    if (act === 'grade') {
      state.grade = Number(b.getAttribute('data-g'));
      state.units = []; state.unitAll = false;
      if (!state.titleTouched) state.title = autoTitle();
      render();
      return;
    }
    if (act === 'term') {
      state.term = b.getAttribute('data-t');
      state.units = []; state.unitAll = false;
      if (!state.titleTouched) state.title = autoTitle();
      render();
      return;
    }
    if (act === 'unit-all') {
      state.unitAll = true; state.units = [];
      render();
      return;
    }
    if (act === 'unit') {
      var uid = b.getAttribute('data-id');
      var i = state.units.indexOf(uid);
      if (i >= 0) state.units.splice(i, 1); else state.units.push(uid);
      state.unitAll = false;
      render();
      return;
    }

    if (act === 'count') { state.count = Number(b.getAttribute('data-c')); render(); return; }
    if (act === 'diff') { state.difficulty = b.getAttribute('data-d'); render(); return; }
    if (act === 'shuffle') {
      state.shuffle = !state.shuffle;
      b.setAttribute('aria-checked', state.shuffle ? 'true' : 'false');
      b.innerHTML = '<span class="dot"></span>打乱题目顺序' + (state.shuffle ? '（已开启）' : '（按题型顺序）');
      return;
    }
    if (act === 'adv-relax') {
      state.autoRelax = !state.autoRelax;
      b.setAttribute('aria-checked', state.autoRelax ? 'true' : 'false');
      return;
    }

    if (act === 'next') {
      if (!state.unitAll && !state.units.length) {
        window.MX.Toast.warn('请至少选一个单元，或点「整册」');
        return;
      }
      state.step = 2;
      if (state.maxStep < 2) state.maxStep = 2;
      render();
      return;
    }
    if (act === 'goto') {
      var to = Number(b.getAttribute('data-i'));
      if (to > state.maxStep) { window.MX.Toast.warn('请先完成前面的步骤'); return; }
      state.step = to;
      render();
      return;
    }

    if (act === 'build') { doBuild(false); return; }
    if (act === 'redraw') { redraw(); return; }
    if (act === 'swap') { swapAt(Number(b.getAttribute('data-i'))); return; }
    if (act === 'lock') { lockAt(Number(b.getAttribute('data-i'))); return; }
    if (act === 'toggle-relax') {
      state.autoRelax = !state.autoRelax;
      doBuild(true).then(function (ok) {
        if (ok) window.MX.Toast.info(state.autoRelax ? '已恢复自动补齐' : '已关闭自动补齐，按当前范围实际题量出卷');
      });
      return;
    }
    if (act === 'print') { openPrint(b.getAttribute('data-m')); return; }
    if (act === 'start') { startExam(); return; }
    if (act === 'save') { savePaper(); return; }
  }

  function onInput(e) {
    var t = e.target;
    if (t.id === 'wz-paper-title' && previewPaper) {
      state.title = t.value;
      state.titleTouched = true;
      previewPaper.title = t.value;
      return;
    }
    if (t.getAttribute && t.getAttribute('data-adv') === 'seed') { state.seed = t.value; return; }
    var tw = t.getAttribute && t.getAttribute('data-tw');
    if (tw) { syncTypeWeight(tw, t.value); return; }
  }

  function onChange(e) {
    var t = e.target;
    if (!t.getAttribute) return;
    var adv = t.getAttribute('data-adv');
    if (adv === 'total') {
      state.totalScore = Math.min(300, Math.max(0, Number(t.value) || 0));
      return;
    }
    if (adv === 'seed') { state.seed = t.value; return; }
    if (adv === 'type') {
      var type = t.value;
      var num = $('[data-tw="' + type + '"]');
      var cur = num ? Number(num.value) || 0 : 0;
      var v = t.checked ? Math.max(1, cur) : 0;
      state.typeRatio[type] = v;
      if (num) num.value = v;
      t.closest('.check-pill').classList.toggle('on', v > 0);
      scheduleAvail();
      return;
    }
    var tw2 = t.getAttribute('data-tw');
    if (tw2) { syncTypeWeight(tw2, t.value); scheduleAvail(); }
  }

  function syncTypeWeight(type, raw) {
    var v = Math.min(9, Math.max(0, Number(raw) || 0));
    state.typeRatio[type] = v;
    var cb = $('[data-adv="type"][value="' + type + '"]');
    if (cb) {
      cb.checked = v > 0;
      cb.closest('.check-pill').classList.toggle('on', v > 0);
    }
  }

  /* ============================================================
   * URL 兼容：?book= / ?point= / ?quick= 直达 Step3
   * ============================================================ */
  function applyBook(bid) {
    var book = window.MX.Tags.book(bid);
    if (!book) { window.MX.Toast.warn('没有找到「' + bid + '」这一册，已回到首页'); return false; }
    state.grade = book.grade;
    state.term = book.term;
    state.unitAll = true;
    state.units = [];
    state.points = [];
    state.scenario = 'book';
    state.count = 10;
    state.difficulty = 'std';
    state.typeRatio = {};
    state.title = book.name + '·综合练习';
    return true;
  }

  function applyPoint(pid) {
    var pt = window.MX.Tags.point(pid);
    if (!pt) { window.MX.Toast.warn('没有找到这个知识点，已回到首页'); return false; }
    var book = window.MX.Tags.book(pt.book) || {};
    state.grade = book.grade || 1;
    state.term = book.term || 'up';
    state.unitAll = false;
    state.units = pt.knowledge ? [pt.knowledge] : [];
    state.points = [pid];
    state.scenario = 'unit';
    state.count = 10;
    state.difficulty = 'std';
    state.typeRatio = {};
    state.title = pt.name + '·专项练习';
    return true;
  }

  /* ============================================================
   * 启动
   * ============================================================ */
  async function boot() {
    root = document.getElementById('page-root');
    window.MX.Shell.mount({
      page: 'paper-builder',
      title: '组卷中心',
      subtitle: '选场景 → 选范围 → 设规格，三步出一份能打印、能考试的卷子'
    });

    var load = window.MX.Shell.loading('正在加载题库…');
    try { await window.MX.Tags.load(); }
    catch (e) {
      load.close();
      root.innerHTML = '<div class="card"><h2>数据加载失败</h2><p class="muted">' + esc(e.message) + '</p></div>';
      return;
    }
    load.close();

    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    render();

    var qs = new URLSearchParams(location.search);
    var point = qs.get('point');
    var book = qs.get('book');
    var quick = qs.get('quick');
    if (point) {
      if (applyPoint(point)) await doBuild(true);
    } else if (book) {
      if (applyBook(book)) await doBuild(true);
    } else if (quick) {
      if (applyBook(book || 'grade1-up')) await doBuild(true);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
