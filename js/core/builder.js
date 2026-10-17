/* ============================================================
 * MX.Builder —— 组卷引擎
 * 四种模式：single 单考点 / multi 多考点 / cross 跨年级 / type 题型优先
 * 标签组合逻辑：年级 AND 领域 AND (考点A OR 考点B) AND 题型匹配 AND 难度匹配
 *
 * 卡 5 新增能力：
 *   1. previewCount(config)        实时预判（只算不抽）
 *   2. autoRelax 选项               候选不足时四级放宽（指定考点→同二级知识点→同册同领域→同册）
 *   3. SCORE_TABLE + 配分规则       默认按题型配分、等比缩放、单题≤0.4×总分、题量<5 降级练习卷
 *   4. swapOne / lockQuestion       保持总分不变替换单题、锁定
 *   5. groupBy:'type'              按题型分大题（固定序、组内重编号）
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 可复现随机数 ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pickWeighted(list, weights, rng) {
    var sum = 0;
    for (var i = 0; i < list.length; i++) sum += Math.max(0, weights[i]);
    if (sum <= 0) return null;
    var r = rng() * sum;
    for (var k = 0; k < list.length; k++) {
      r -= Math.max(0, weights[k]);
      if (r <= 0) return list[k];
    }
    return list[list.length - 1];
  }
  function round1(x) { return Math.round(x * 10) / 10; }

  /* ---------- 默认配置 ---------- */
  var DEFAULT_CONFIG = {
    title: '',
    mode: 'single',
    books: [],
    domains: [],
    knowledges: [],
    points: [],
    types: [],
    typeRatio: {},                 // { choice: 0.3, fill: 0.2, ... }
    difficultyMin: 1,
    difficultyMax: 3,
    difficultyWeights: { 1: 1, 2: 1, 3: 1 },
    count: 10,
    totalScore: 100,
    shuffle: true,
    shuffleOptions: false,
    seed: '',
    autoRelax: false,              // 卡 5：候选不足时自动放宽
    groupBy: 'flat'                // 卡 5：'flat' | 'type'
  };

  /* ---------- 卡 5.3 分值表 ---------- */
  // 默认按题型配分；totalScore 仅做等比缩放；单题分不得 > totalScore*0.4。
  var SCORE_TABLE = {
    choice: 2, fill: 2, judge: 1, calculation: 4, application: 5,
    figure: 3, reading: 6, draw: 4, 'figure-interactive': 3
  };
  var DEFAULT_SCORE = 5; // 未知题型兜底

  /* ---------- 卡 5.5 题型固定序 ---------- */
  var TYPE_ORDER = ['choice', 'fill', 'judge', 'calculation', 'application', 'figure', 'figure-interactive', 'reading', 'draw'];
  var TYPE_NAME = {
    choice: '选择题', fill: '填空题', judge: '判断题', calculation: '计算题',
    application: '应用题', figure: '图形题', 'figure-interactive': '互动图形题',
    reading: '阅读题', draw: '作图题'
  };
  function typeOrderIndex(t) { var i = TYPE_ORDER.indexOf(t); return i < 0 ? TYPE_ORDER.length : i; }

  /* ---------- 卡 5.2 放宽级别文案 ---------- */
  var RELAX_LEVELS = [
    null,
    '已放宽到「同二级知识点」（原考点题目不足以满足题量）',
    '已放宽到「同册同领域」（原考点题目不足）',
    '已放宽到「同册」（原考点题目不足）'
  ];

  /* ---------- 候选池 ---------- */
  function buildPool(bookIds) {
    var qs = global.MX.Bank.questionsOf(bookIds);
    return qs.filter(function (q) { return q && q.point; });
  }

  /** 计算册次范围（未指定则按 考点/知识点/领域 反推，否则全 12 册） */
  function resolveBookIds(cfg) {
    var bookIds = (cfg.books && cfg.books.length) ? cfg.books.slice() : null;
    if (!bookIds) {
      var inferred = {};
      global.MX.Tags.points.forEach(function (p) {
        if (cfg.points && cfg.points.length && cfg.points.indexOf(p.id) < 0) return;
        if (cfg.knowledges && cfg.knowledges.length && cfg.knowledges.indexOf(p.knowledge) < 0) return;
        if (cfg.domains && cfg.domains.length && cfg.domains.indexOf(p.domain) < 0) return;
        inferred[p.book] = 1;
      });
      bookIds = Object.keys(inferred);
      if (!bookIds.length) bookIds = global.MX.Tags.books.map(function (b) { return b.id; });
    }
    return bookIds;
  }

  /** 依据配置计算可用考点集合（等级 0：精确匹配） */
  function matchedPoints(config, bookIds) {
    var cond = {
      books: bookIds,
      domains: config.domains,
      knowledges: config.knowledges,
      points: config.points,
      types: config.mode === 'type' ? null : config.types,
      difficultyMin: config.difficultyMin,
      difficultyMax: config.difficultyMax
    };
    return global.MX.Tags.filter(cond);
  }

  /** 放宽后的考点集合：lvl 1 同二级知识点 / 2 同册同领域 / 3 同册 */
  function expandedPointSet(cfg, bookIds, anchors, lvl) {
    var anchorKnowledge = {}, anchorDomain = {};
    anchors.forEach(function (p) {
      if (p.knowledge) anchorKnowledge[p.knowledge] = 1;
      if (p.domain) anchorDomain[p.domain] = 1;
    });
    return global.MX.Tags.points.filter(function (p) {
      if (bookIds.indexOf(p.book) < 0) return false;
      if (lvl === 1) return !!anchorKnowledge[p.knowledge];
      if (lvl === 2) return !!anchorDomain[p.domain];
      if (lvl === 3) return true; // 同册全部
      return false;
    });
  }

  /** 题型是否命中配置（mode=type 时按 types 严格；否则 types 为空表示不限） */
  function typeMatches(q, cfg) {
    if (cfg.types && cfg.types.length) return cfg.types.indexOf(q.type) >= 0;
    return true;
  }

  /** 由候选池按考点集合 + 难度 + 题型过滤 */
  function filterCandidates(pool, pointList, cfg) {
    var pointSet = {};
    (pointList || []).forEach(function (p) { pointSet[(p && p.id) || p] = 1; });
    var dmin = cfg.difficultyMin || 1, dmax = cfg.difficultyMax || 3;
    return pool.filter(function (q) {
      if (!pointSet[q.point]) return false;
      if (q.difficulty < dmin || q.difficulty > dmax) return false;
      if (!typeMatches(q, cfg)) return false;
      return true;
    });
  }

  /** 题型配额（与 build 共用） */
  function computeQuota(count, byTypeCount, ratio) {
    var availTypes = Object.keys(byTypeCount);
    var quota = {};
    var ratioKeys = (ratio && Object.keys(ratio).filter(function (k) { return ratio[k] > 0 && availTypes.indexOf(k) >= 0; })) || [];
    if (ratioKeys.length) {
      var rsum = ratioKeys.reduce(function (s, k) { return s + Number(ratio[k]); }, 0) || 1;
      var assigned = 0;
      ratioKeys.forEach(function (k) { quota[k] = Math.floor(count * Number(ratio[k]) / rsum); assigned += quota[k]; });
      var rest = count - assigned, idx = 0;
      while (rest > 0 && ratioKeys.length) { quota[ratioKeys[idx % ratioKeys.length]]++; idx++; rest--; }
    } else {
      var per = Math.floor(count / availTypes.length), left = count - per * availTypes.length;
      availTypes.forEach(function (t, i) { quota[t] = per + (i < left ? 1 : 0); });
    }
    return quota;
  }

  /* ---------- 卡 5.3 配分：题型表 + 等比缩放 + 单题上限 + 练习卷 ---------- */
  /** 单题不得高于 cap；超出部分按比例回补给有余量的题，循环收敛 */
  function enforceCap(scores, cap) {
    var out = scores.slice();
    for (var iter = 0; iter < 12; iter++) {
      var hasOver = out.some(function (s) { return s > cap + 1e-9; });
      if (!hasOver) break;
      var excess = 0;
      out = out.map(function (s) { if (s > cap) { excess += (s - cap); return cap; } return s; });
      var belowIdx = [], belowSum = 0;
      out.forEach(function (s, i) { if (s < cap) { belowIdx.push(i); belowSum += s; } });
      if (!belowIdx.length || belowSum <= 0) break;
      belowIdx.forEach(function (i) { out[i] = round1(out[i] + excess * out[i] / belowSum); });
    }
    return out;
  }

  /**
   * @param {Array} ordered 题目数组（只需 type 字段）
   * @param {number} target  目标总分（练习卷忽略）
   * @param {boolean} isPractice 练习卷：直接用题型基准分，不折算
   * @returns {{scores:number[], total:number}}
   */
  function assignScores(ordered, target, isPractice) {
    var base = ordered.map(function (q) {
      return SCORE_TABLE[q.type] != null ? SCORE_TABLE[q.type] : DEFAULT_SCORE;
    });
    if (isPractice) {
      return { scores: base.slice(), total: round1(base.reduce(function (a, b) { return a + b; }, 0)) };
    }
    var bsum = base.reduce(function (a, b) { return a + b; }, 0) || 1;
    var factor = target / bsum;
    var scores = base.map(function (b) { return round1(b * factor); });
    var cap = round1(target * 0.4);
    scores = enforceCap(scores, cap);
    // 精确对齐 target（残差补到距上限最远的题，保持其不破 cap）
    var total = scores.reduce(function (a, b) { return a + b; }, 0);
    var residual = round1(target - total);
    if (residual !== 0) {
      var best = -1, bestHead = -1;
      for (var i = 0; i < scores.length; i++) {
        var head = cap - scores[i];
        if (head > bestHead) { bestHead = head; best = i; }
      }
      if (best >= 0) scores[best] = round1(scores[best] + residual);
    }
    total = scores.reduce(function (a, b) { return a + b; }, 0);
    return { scores: scores, total: round1(total) };
  }

  /* ---------- 卡 5.5 按题型分大题 ---------- */
  function buildSections(questions) {
    var grouped = {};
    questions.forEach(function (q) { (grouped[q.type] = grouped[q.type] || []).push(q); });
    var order = TYPE_ORDER.slice();
    Object.keys(grouped).forEach(function (t) { if (order.indexOf(t) < 0) order.push(t); });
    var sections = [];
    order.forEach(function (t) {
      var qs = grouped[t];
      if (!qs || !qs.length) return;
      qs.forEach(function (q, i) { q.paperIndex = i + 1; }); // 组内重编号
      var sum = qs.reduce(function (a, q) { return a + q.paperScore; }, 0);
      sections.push({
        type: t,
        name: TYPE_NAME[t] || t,
        scorePer: round1(sum / qs.length),
        count: qs.length,
        questions: qs
      });
    });
    return sections;
  }

  /**
   * 执行组卷
   * @param {object} config 见 DEFAULT_CONFIG
   * @returns {{ok:boolean, paper:object, message:string, stats:object}}
   */
  async function build(config) {
    await global.MX.Tags.load();
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    cfg.difficultyWeights = Object.assign({ 1: 1, 2: 1, 3: 1 }, cfg.difficultyWeights || {});
    var explicitTotal = !!(config && typeof config.totalScore === 'number');

    // 1) 确定册次范围
    var bookIds = resolveBookIds(cfg);
    if (cfg.mode === 'cross' && bookIds.length < 2) {
      return { ok: false, message: '跨年级组题至少需要选择 2 个册次。', paper: null, stats: {} };
    }

    // 2) 加载题库并构建候选池
    await global.MX.Bank.loadBooks(bookIds);
    var pool = buildPool(bookIds);

    // 3) 标签过滤（等级 0）
    var basePts = matchedPoints(cfg, bookIds);
    var count = Math.max(1, Number(cfg.count) || 10);

    var candidates = filterCandidates(pool, basePts, cfg);
    var relaxLevel = 0, relaxNote = '';

    // 4) 卡 5.2 自动放宽：候选不足时四级放宽
    if (cfg.autoRelax && candidates.length < count) {
      for (var lvl = 1; lvl <= 3; lvl++) {
        var ext = expandedPointSet(cfg, bookIds, basePts, lvl);
        var c2 = filterCandidates(pool, ext, cfg);
        if (c2.length > candidates.length) { candidates = c2; relaxLevel = lvl; relaxNote = RELAX_LEVELS[lvl]; }
        if (c2.length >= count) break;
      }
    }

    if (!candidates.length) {
      return { ok: false, message: '当前条件下没有可用题目，请放宽年级 / 领域 / 考点 / 题型 / 难度条件。', paper: null, stats: { pool: pool.length, points: basePts.length } };
    }

    // 5) 题型配额
    var byType = {};
    candidates.forEach(function (q) { (byType[q.type] = byType[q.type] || []).push(q); });
    var byTypeCount = {};
    Object.keys(byType).forEach(function (t) { byTypeCount[t] = byType[t].length; });
    var quota = computeQuota(count, byTypeCount, cfg.typeRatio || {});

    // 6) 抽题（题型优先 + 难度加权）
    var rng = mulberry32(hashSeed(cfg.seed || (String(Date.now()) + cfg.title)));
    var used = {};
    var selected = [];
    function takeFrom(type, n) {
      var got = 0;
      for (var i = 0; i < n; i++) {
        var list = (byType[type] || []).filter(function (q) { return !used[q.id]; });
        if (!list.length) break;
        var w = list.map(function (q) { return Math.max(0.01, Number(cfg.difficultyWeights[q.difficulty] || 0.01)); });
        var q = pickWeighted(list, w, rng);
        if (!q) break;
        used[q.id] = 1; selected.push(q); got++;
      }
      return got;
    }
    Object.keys(quota).forEach(function (t) { takeFrom(t, quota[t]); });

    // 不足则从剩余候选补足
    if (selected.length < count) {
      var remain = candidates.filter(function (q) { return !used[q.id]; });
      var w2 = remain.map(function (q) { return Math.max(0.01, Number(cfg.difficultyWeights[q.difficulty] || 0.01)); });
      while (selected.length < count && remain.length) {
        var q2 = pickWeighted(remain, w2, rng);
        var i2 = remain.indexOf(q2);
        if (i2 < 0) break;
        remain.splice(i2, 1); w2.splice(i2, 1);
        used[q2.id] = 1; selected.push(q2);
      }
    }

    if (!selected.length) {
      return { ok: false, message: '抽题失败，请调整组卷条件后重试。', paper: null, stats: { candidates: candidates.length } };
    }

    // 7) 顺序：按题型分组时按固定序；否则按 shuffle 配置
    var ordered = selected.slice();
    if (cfg.groupBy === 'type') {
      ordered.sort(function (a, b) { return typeOrderIndex(a.type) - typeOrderIndex(b.type); });
    } else if (cfg.shuffle) {
      ordered = shuffle(selected, rng);
    }

    // 8) 卡 5.3 配分
    var isPractice = ordered.length < 5; // 题量 < 5 自动降级为练习卷
    var target = isPractice ? 0 : (explicitTotal ? (Number(cfg.totalScore) || 0) : 100);
    var sc = assignScores(ordered, target, isPractice);
    var scores = sc.scores;

    // 9) 选项打乱（可选）+ 落分
    var finalQuestions = ordered.map(function (q, i) {
      var item = Object.assign({}, q, { paperScore: scores[i], paperIndex: i + 1 });
      if (cfg.shuffleOptions && q.type === 'choice' && Array.isArray(q.options)) {
        var idxs = q.options.map(function (_, k) { return k; });
        var sh = shuffle(idxs, rng);
        var newOptions = sh.map(function (k) { return q.options[k]; });
        var newIndex = ((q.answer || {}).index || []).map(function (k) { return sh.indexOf(k); }).sort();
        item = Object.assign(item, {
          options: newOptions,
          answer: Object.assign({}, q.answer, { index: newIndex })
        });
      }
      return item;
    });

    // 10) 卡 5.5 分大题
    var sections = null;
    if (cfg.groupBy === 'type') sections = buildSections(finalQuestions);

    // 11) 统计
    var stats = {
      candidates: candidates.length,
      pool: pool.length,
      points: basePts.length,
      domains: {}, pointTypes: {}, types: {}, difficulty: {}, books: {},
      relaxLevel: relaxLevel
    };
    finalQuestions.forEach(function (q) {
      stats.types[q.type] = (stats.types[q.type] || 0) + 1;
      stats.difficulty[q.difficulty] = (stats.difficulty[q.difficulty] || 0) + 1;
      stats.domains[q.domainName] = (stats.domains[q.domainName] || 0) + 1;
      stats.pointTypes[q.pointType] = (stats.pointTypes[q.pointType] || 0) + 1;
      stats.books[q.bookName] = (stats.books[q.bookName] || 0) + 1;
    });

    var paperId = global.MX.Storage.uid('P');
    var paper = {
      id: paperId,
      examId: paperId,
      title: cfg.title || defaultTitle(cfg, finalQuestions),
      createdAt: Date.now(),
      config: cfg,
      totalScore: sc.total,
      count: finalQuestions.length,
      duration: Math.max(5, finalQuestions.length * 3), // 分钟：每题 3 分钟
      questions: finalQuestions,
      stats: stats,
      practice: isPractice,
      relaxLevel: relaxLevel,
      relaxNote: relaxNote
    };
    if (sections) paper.sections = sections;

    var message = '组卷成功';
    if (relaxNote) message = relaxNote;
    if (isPractice) message += (relaxNote ? '；' : '') + '题量较少，已自动标记为练习卷（不按固定总分折算）';
    return { ok: true, paper: paper, message: message, stats: stats };
  }

  /* ============================================================
   * 卡 5.1 previewCount —— 实时预判（只算不抽）
   * ============================================================ */
  async function previewCount(config) {
    await global.MX.Tags.load();
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    var reqCount = Math.max(1, Number(cfg.count) || 10);
    var bookIds = resolveBookIds(cfg);
    await global.MX.Bank.loadBooks(bookIds);
    var pool = buildPool(bookIds);
    var pts = matchedPoints(cfg, bookIds);
    var candidates = filterCandidates(pool, pts, cfg);

    var byTypeCount = {};
    candidates.forEach(function (q) { byTypeCount[q.type] = (byTypeCount[q.type] || 0) + 1; });
    var quota = computeQuota(reqCount, byTypeCount, cfg.typeRatio || {});

    var byType = {}, totalAvail = candidates.length;
    Object.keys(byTypeCount).forEach(function (t) {
      var avail = byTypeCount[t];
      var q = quota[t] || 0;
      byType[t] = { available: avail, quota: q, achievable: Math.min(q, avail), shortage: Math.max(0, q - avail) };
    });
    var achievableTotal = Math.min(reqCount, totalAvail);
    return {
      count: achievableTotal,
      requested: reqCount,
      available: totalAvail,
      byType: byType,
      shortage: Math.max(0, reqCount - achievableTotal)
    };
  }

  /* ============================================================
   * 卡 5.4 swapOne / lockQuestion —— 保持总分不变替换单题
   * ============================================================ */
  async function swapOne(paper, index, config) {
    if (!paper || !Array.isArray(paper.questions)) return { ok: false, message: '试卷数据无效' };
    var q = paper.questions[index];
    if (!q) return { ok: false, message: '题目索引越界' };
    if (q.locked) return { ok: false, message: '该题已锁定，无法替换' };
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || paper.config || {});
    await global.MX.Tags.load();
    var bookIds = resolveBookIds(cfg);
    await global.MX.Bank.loadBooks(bookIds);
    var pool = buildPool(bookIds);
    var pts = matchedPoints(cfg, bookIds);
    var pointSet = {};
    pts.forEach(function (p) { pointSet[p.id] = 1; });
    var used = {};
    paper.questions.forEach(function (x) { used[x.id] = 1; });
    var repl = pool.filter(function (x) {
      return x.type === q.type && !used[x.id] && pointSet[x.point] &&
        x.difficulty >= (cfg.difficultyMin || 1) && x.difficulty <= (cfg.difficultyMax || 3);
    });
    if (!repl.length) return { ok: false, message: '未找到同类型可替换题目' };
    var rng = mulberry32(hashSeed((cfg.seed || '') + 'swap' + index + String(Date.now())));
    var pick = repl[Math.floor(rng() * repl.length)];
    var newQ = Object.assign({}, pick, { paperScore: q.paperScore, paperIndex: q.paperIndex, locked: !!q.locked });
    paper.questions[index] = newQ;
    if (Array.isArray(paper.sections)) {
      paper.sections.forEach(function (s) {
        var si = s.questions.indexOf(q);
        if (si >= 0) s.questions[si] = newQ;
      });
    }
    return { ok: true, paper: paper, oldId: q.id, newId: pick.id, message: '已替换第 ' + q.paperIndex + ' 题' };
  }

  function lockQuestion(paper, index) {
    if (!paper || !Array.isArray(paper.questions)) return false;
    var q = paper.questions[index];
    if (!q) return false;
    q.locked = !q.locked;
    if (Array.isArray(paper.sections)) {
      paper.sections.forEach(function (s) {
        var si = s.questions.indexOf(q);
        if (si >= 0) s.questions[si] = q;
      });
    }
    return q.locked;
  }

  function defaultTitle(cfg, qs) {
    var names = {};
    qs.forEach(function (q) { names[q.bookName] = 1; });
    var bookPart = Object.keys(names).slice(0, 3).join('/') + (Object.keys(names).length > 3 ? ' 等' : '');
    var modeName = { single: '单考点', multi: '多考点', cross: '跨年级', type: '题型优先' }[cfg.mode] || '智能';
    return bookPart + '·' + modeName + '组卷';
  }

  /* ---------- 校验 ---------- */
  function validate(config) {
    var errs = [];
    var mode = config.mode;
    if (!config.books || !config.books.length) errs.push('请至少选择一个册次。');
    if (mode === 'single' && (!config.points || config.points.length !== 1)) errs.push('单考点组题需且仅需选择 1 个考点。');
    if (mode === 'multi' && (!config.points || config.points.length < 2)) errs.push('多考点组题需选择 2 个及以上考点。');
    if (mode === 'cross' && (!config.books || config.books.length < 2)) errs.push('跨年级组题需选择 2 个及以上册次。');
    if (mode === 'type' && (!config.types || !config.types.length)) errs.push('题型优先组题需选择至少 1 种题型。');
    if (!config.count || config.count < 1) errs.push('题量至少为 1。');
    return { ok: errs.length === 0, errors: errs };
  }

  global.MX = global.MX || {};
  global.MX.Builder = {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    SCORE_TABLE: SCORE_TABLE,
    TYPE_ORDER: TYPE_ORDER,
    TYPE_NAME: TYPE_NAME,
    RELAX_LEVELS: RELAX_LEVELS,
    build: build,
    previewCount: previewCount,
    swapOne: swapOne,
    lockQuestion: lockQuestion,
    assignScores: assignScores,
    validate: validate,
    shuffle: shuffle,
    mulberry32: mulberry32
  };
})(window);
