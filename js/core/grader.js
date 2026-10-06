/* ============================================================
 * MX.Grader —— 答案比对底层工具 + 自动阅卷引擎
 * 支持：字符串匹配、多答案、数值容差、单位容错、集合/比/分数等价
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 1. 文本归一化 ---------- */
  var FULL2HALF = (function () {
    var m = {};
    for (var d = 0; d < 10; d++) m[String.fromCharCode(0xFF10 + d)] = String(d);
    for (var a = 0; a < 26; a++) {
      m[String.fromCharCode(0xFF21 + a)] = String.fromCharCode(0x41 + a); // Ａ-Ｚ
      m[String.fromCharCode(0xFF41 + a)] = String.fromCharCode(0x61 + a); // ａ-ｚ
    }
    [['＋', '+'], ['－', '-'], ['＝', '='], ['．', '.'], ['％', '%'],
      ['（', '('], ['）', ')'], ['，', ','], ['：', ':'], ['；', ';'],
      ['？', '?'], ['！', '!'], ['～', '~'], ['　', ' '], ['＊', '*'], ['／', '/']]
      .forEach(function (p) { m[p[0]] = p[1]; });
    return m;
  })();

  function normalize(s) {
    if (s === null || s === undefined) return '';
    s = String(s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      out += (FULL2HALF[c] !== undefined ? FULL2HALF[c] : c);
    }
    return out
      .replace(/\s+/g, '')
      .replace(/[。，、；：？！""''《》【】]/g, '')
      .replace(/\*/g, '×')
      .toLowerCase();
  }

  function normalizeRatio(s) {
    return normalize(s).replace(/[:：]/g, ':').replace(/比/g, ':');
  }

  /* ---------- 2. 数值抽取 ---------- */
  function toNumber(s) {
    if (typeof s === 'number') return isFinite(s) ? s : null;
    var t = normalize(s);
    if (!t) return null;
    // 带分数 1又1/2
    var mixed = t.match(/^(-?\d+)又(\d+)\/(-?\d+)$/);
    if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    var frac = t.match(/^(-?\d+)\/(-?\d+)$/);
    if (frac) {
      var den = Number(frac[2]);
      if (den === 0) return null;
      return Number(frac[1]) / den;
    }
    var m = t.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    return Number(m[0]);
  }

  function isFractionLike(s) {
    var t = normalize(s).replace(/^-/, '');
    return /^(\d+)又(\d+)\/(\d+)$/.test(t) || /^\d+\/\d+$/.test(t);
  }

  /* ---------- 3. 单项比对 ---------- */
  /**
   * spec 支持：
   *   '12' | 12
   *   { value, alts:[], tolerance, unit, mode:'set'|'ratio'|'text'|'auto' }
   */
  function cmpBlank(spec, user) {
    var s;
    if (spec === null || spec === undefined) {
      s = { value: spec, mode: 'auto', alts: [], tolerance: 0 };
    } else if (typeof spec === 'object') {
      s = Object.assign({ mode: 'auto', alts: [], tolerance: 0 }, spec);
    } else {
      s = { value: spec, mode: 'auto', alts: [], tolerance: 0 };
    }
    var expected = s.value;
    var u = normalize(user);
    if (u === '') return false;

    // --- 集合比对（多答案，顺序无关）---
    if (s.mode === 'set') {
      var expSet = tokenSet(expected);
      var usrSet = tokenSet(user);
      if (!expSet.length) return false;
      return expSet.length === usrSet.length && expSet.every(function (x) { return usrSet.indexOf(x) >= 0; });
    }

    // --- 比例比对 1:2 ---
    if (s.mode === 'ratio') {
      var a = normalizeRatio(expected), b = normalizeRatio(user);
      if (a === b) return true;
      var pa = a.split(':').map(Number), pb = b.split(':').map(Number);
      if (pa.length === 2 && pb.length === 2 && pa.every(isFinite) && pb.every(isFinite) && pa[1] && pb[1]) {
        return Math.abs(pa[0] * pb[1] - pb[0] * pa[1]) < 1e-9;
      }
      return false;
    }

    // --- 字符串完全匹配 / 别名 ---
    var candidates = [expected].concat(s.alts || []);
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c === null || c === undefined) continue;
      if (typeof c === 'number' || typeof c === 'boolean') {
        if (Number(c) === Number(u) || String(c) === u) return true;
        continue;
      }
      if (normalize(c) === u) return true;
      // 分数等价：3/4 == 6/8
      if (isFractionLike(c) && isFractionLike(u)) {
        var n1 = toNumber(c), n2 = toNumber(u);
        if (n1 !== null && n2 !== null && Math.abs(n1 - n2) < 1e-9) return true;
      }
      // 数值等价（含单位容错：'13只' ≈ 13）
      if (s.mode !== 'text') {
        var e1 = toNumber(c), e2 = toNumber(u);
        if (e1 !== null && e2 !== null && numbersEqual(e1, e2, s.tolerance || 0)) return true;
      }
      // 百分比容错：'96%' ≈ '96'
      if (typeof c === 'string' && /%$/.test(normalize(c)) === false && /%$/.test(u)) {
        var e3 = toNumber(c), e4 = toNumber(u);
        if (e3 !== null && e4 !== null && numbersEqual(e3, e4, s.tolerance || 0)) return true;
      }
    }

    // --- 纯数值型规范（value 是数字）---
    if (typeof expected === 'number') {
      var un = toNumber(user);
      return un !== null && numbersEqual(expected, un, s.tolerance || 0);
    }
    return false;
  }

  function numbersEqual(a, b, tol) {
    tol = Math.max(Number(tol) || 0, 1e-9);
    return Math.abs(a - b) <= tol + 1e-9;
  }

  function tokenSet(v) {
    if (Array.isArray(v)) return v.map(function (x) { return String(x).trim(); }).sort();
    return normalize(v).split(/[,\-\s;]+/).filter(Boolean).sort();
  }

  /* ---------- 4. 数组 / 布尔 / 集合比对 ---------- */
  function cmpArrayUnordered(a, b) {
    var A = (a || []).map(String).sort();
    var B = (b || []).map(String).sort();
    return A.length === B.length && A.every(function (x, i) { return x === B[i]; });
  }

  /* ---------- 5. 逐空评分 ---------- */
  /**
   * @returns {{correct:boolean, ratio:number, detail:Array}}
   */
  function cmpBlanks(specs, users) {
    specs = specs || [];
    users = users || [];
    var detail = [];
    var right = 0;
    specs.forEach(function (spec, i) {
      var exp = (spec && typeof spec === 'object' && 'value' in spec) ? spec.value : spec;
      var ok = cmpBlank(spec, users[i]);
      if (ok) right++;
      detail.push({ index: i, correct: ok, user: users[i] === undefined ? '' : users[i], expected: exp });
    });
    return {
      correct: specs.length > 0 && right === specs.length,
      ratio: specs.length ? right / specs.length : 0,
      detail: detail,
      right: right,
      total: specs.length
    };
  }

  /* ---------- 6. 顶层阅卷（走题型插件） ---------- */
  function gradeQuestion(q, userAnswer) {
    var plugin = (global.MX.Plugins && global.MX.Plugins.get(q.type)) || null;
    var max = Number(q.score) || 0;
    var res;
    if (plugin && typeof plugin.grade === 'function') {
      res = plugin.grade(q, userAnswer, {
        cmpBlank: cmpBlank,
        cmpBlanks: cmpBlanks,
        cmpArrayUnordered: cmpArrayUnordered,
        normalize: normalize,
        toNumber: toNumber,
        numbersEqual: numbersEqual
      });
    } else {
      res = { correct: false, ratio: 0, detail: [], manual: true };
    }
    var ratio = res.manual ? 1 : (res.ratio === undefined ? (res.correct ? 1 : 0) : res.ratio);
    var score = res.manual ? 0 : Math.round(max * ratio * 100) / 100;
    return {
      qid: q.id,
      type: q.type,
      correct: !!res.correct,
      manual: !!res.manual,
      ratio: ratio,
      earned: score,
      max: max,
      detail: res.detail || [],
      feedback: res.feedback || ''
    };
  }

  /** 整卷阅卷 */
  function gradePaper(questions, answers) {
    var results = [], earned = 0, full = 0, right = 0, manual = 0;
    questions.forEach(function (q) {
      var r = gradeQuestion(q, answers[q.id]);
      results.push(r);
      full += r.max;
      earned += r.earned;
      if (r.manual) manual++;
      else if (r.correct) right++;
    });
    var autoCount = questions.length - manual;
    return {
      results: results,
      totalScore: Math.round(full * 100) / 100,
      earnedScore: Math.round(earned * 100) / 100,
      accuracy: autoCount ? Math.round((right / autoCount) * 1000) / 10 : 0,
      rightCount: right,
      wrongCount: autoCount - right,
      manualCount: manual,
      questionCount: questions.length
    };
  }

  global.MX = global.MX || {};
  global.MX.Grader = {
    normalize: normalize,
    toNumber: toNumber,
    cmpBlank: cmpBlank,
    cmpBlanks: cmpBlanks,
    cmpArrayUnordered: cmpArrayUnordered,
    numbersEqual: numbersEqual,
    gradeQuestion: gradeQuestion,
    gradePaper: gradePaper
  };
})(window);
