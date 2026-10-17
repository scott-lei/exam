/* ============================================================
 * MX.Builder —— 组卷引擎
 * 四种模式：single 单考点 / multi 多考点 / cross 跨年级 / type 题型优先
 * 标签组合逻辑：年级 AND 领域 AND (考点A OR 考点B) AND 题型匹配 AND 难度匹配
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
    seed: ''
  };

  /** 已加载题库的候选池 */
  function buildPool(bookIds) {
    var qs = global.MX.Bank.questionsOf(bookIds);
    return qs.filter(function (q) { return q && q.point; });
  }

  /** 依据配置计算可用考点集合 */
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

  /**
   * 执行组卷
   * @param {object} config 见 DEFAULT_CONFIG
   * @returns {{ok:boolean, paper:object, message:string, stats:object}}
   */
  async function build(config) {
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    cfg.difficultyWeights = Object.assign({ 1: 1, 2: 1, 3: 1 }, cfg.difficultyWeights || {});

    // 1) 确定册次范围
    var bookIds = (cfg.books && cfg.books.length) ? cfg.books.slice() : null;
    if (!bookIds) {
      // 依据考点/知识点反推册次；没有指定则默认全 12 册
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
    if (cfg.mode === 'cross' && bookIds.length < 2) {
      return { ok: false, message: '跨年级组题至少需要选择 2 个册次。', paper: null, stats: {} };
    }

    // 2) 加载题库并构建候选池
    await global.MX.Bank.loadBooks(bookIds);
    var pool = buildPool(bookIds);

    // 3) 标签过滤
    var pts = matchedPoints(cfg, bookIds);
    var pointSet = {};
    pts.forEach(function (p) { pointSet[p.id] = 1; });
    var candidates = pool.filter(function (q) {
      if (!pointSet[q.point]) return false;
      if (q.difficulty < cfg.difficultyMin || q.difficulty > cfg.difficultyMax) return false;
      if (cfg.mode !== 'type' && cfg.types && cfg.types.length && cfg.types.indexOf(q.type) < 0) return false;
      if (cfg.mode === 'type' && cfg.types && cfg.types.length && cfg.types.indexOf(q.type) < 0) return false;
      return true;
    });

    if (!candidates.length) {
      return { ok: false, message: '当前条件下没有可用题目，请放宽年级 / 领域 / 考点 / 题型 / 难度条件。', paper: null, stats: { pool: pool.length, points: pts.length } };
    }

    // 4) 题型配额
    var count = Math.max(1, Number(cfg.count) || 10);
    var byType = {};
    candidates.forEach(function (q) { (byType[q.type] = byType[q.type] || []).push(q); });
    var availTypes = Object.keys(byType);
    var ratio = cfg.typeRatio || {};
    var ratioKeys = Object.keys(ratio).filter(function (k) { return ratio[k] > 0 && availTypes.indexOf(k) >= 0; });
    var quota = {};

    if (ratioKeys.length) {
      var rsum = ratioKeys.reduce(function (s, k) { return s + Number(ratio[k]); }, 0) || 1;
      var assigned = 0;
      ratioKeys.forEach(function (k) {
        quota[k] = Math.floor(count * Number(ratio[k]) / rsum);
        assigned += quota[k];
      });
      // 余数按比例补齐
      var rest = count - assigned;
      var idx = 0;
      while (rest > 0 && ratioKeys.length) { quota[ratioKeys[idx % ratioKeys.length]]++; idx++; rest--; }
    } else {
      // 未指定比例：按各题型可用量均衡分配
      var per = Math.floor(count / availTypes.length);
      var left = count - per * availTypes.length;
      availTypes.forEach(function (t, i) { quota[t] = per + (i < left ? 1 : 0); });
    }

    // 5) 抽题（题型优先 + 难度加权）
    var rng = mulberry32(hashSeed(cfg.seed || String(Date.now()) + cfg.title));
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

    // 6) 顺序
    var ordered = cfg.shuffle ? shuffle(selected, rng) : selected.slice();

    // 7) 分值分配：按难度加权，总分对齐
    var totalScore = Number(cfg.totalScore) || 0;
    var weights = ordered.map(function (q) { return Math.max(1, Number(cfg.difficultyWeights[q.difficulty] || q.difficulty)); });
    var wsum = weights.reduce(function (a, b) { return a + b; }, 0);
    var scores = [], acc = 0;
    if (totalScore > 0) {
      ordered.forEach(function (q, i) {
        var s = Math.round((totalScore * weights[i] / wsum) * 10) / 10;
        scores.push(s); acc += s;
      });
      var diff = Math.round((totalScore - acc) * 10) / 10;
      if (diff !== 0) {
        var target = 0;
        for (var i = 1; i < scores.length; i++) if (scores[i] > scores[target]) target = i;
        scores[target] = Math.round((scores[target] + diff) * 10) / 10;
      }
    } else {
      ordered.forEach(function (q) { scores.push(Number(q.score) || 5); });
      totalScore = scores.reduce(function (a, b) { return a + b; }, 0);
    }

    // 8) 选项打乱（可选）
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

    // 9) 统计
    var stats = {
      candidates: candidates.length,
      pool: pool.length,
      points: pts.length,
      domains: {},
      pointTypes: {},
      types: {},
      difficulty: {},
      books: {}
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
      totalScore: Math.round(totalScore * 10) / 10,
      count: finalQuestions.length,
      duration: Math.max(5, finalQuestions.length * 3), // 分钟：每题 3 分钟
      questions: finalQuestions,
      stats: stats
    };
    return { ok: true, paper: paper, message: '组卷成功', stats: stats };
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
    build: build,
    validate: validate,
    shuffle: shuffle,
    mulberry32: mulberry32
  };
})(window);
