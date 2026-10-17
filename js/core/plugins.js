/* ============================================================
 * MX.Plugins —— 题型插件注册表（扩展能力：题型插件式注册）
 * 每种题型是一个插件：{ id, name, auto, input, specs(q), grade(q, ua, U), answerText(q) }
 * 新增题型只需 MX.Plugins.register({...}) 即可参与组卷、作答与阅卷。
 * ============================================================ */
(function (global) {
  'use strict';

  var registry = {};
  var order = [];

  function register(def) {
    if (!def || !def.id) throw new Error('题型插件必须包含 id');
    if (!registry[def.id]) order.push(def.id);
    registry[def.id] = Object.assign({
      auto: true,
      input: 'text',
      desc: '',
      specs: defaultSpecs,
      grade: defaultGrade,
      answerText: defaultAnswerText
    }, def);
    return registry[def.id];
  }

  /** 从题目 answer 中取出「空的规格列表」 */
  function defaultSpecs(q) {
    var a = q.answer || {};
    if (Array.isArray(a.blanks)) return a.blanks;
    if ('value' in a) return [a];
    if (Array.isArray(a.index)) return [{ value: a.index, mode: 'indexArray' }];
    if (Array.isArray(a.regions)) return [{ value: a.regions, mode: 'regionArray' }];
    return [];
  }

  function defaultGrade(q, ua, U) {
    var specs = defaultSpecs(q);
    var users = ua && Array.isArray(ua.values) ? ua.values : [];
    var r = U.cmpBlanks(specs, users);
    return r;
  }

  function defaultAnswerText(q) {
    var specs = defaultSpecs(q);
    if (!specs.length) return q.answer && q.answer.manual ? '（人工阅卷）' : '—';
    return specs.map(function (s) {
      var v = (s && typeof s === 'object' && 'value' in s) ? s.value : s;
      if (Array.isArray(v)) return v.join('、');
      return String(v);
    }).join('　|　');
  }

  /* ---------------- 内置题型 ---------------- */

  register({
    id: 'choice', name: '选择题', auto: true, input: 'choice',
    desc: '选项数组比对（支持多选，顺序无关）',
    specs: function (q) { return [{ value: (q.answer || {}).index || [] }]; },
    grade: function (q, ua, U) {
      var expected = (q.answer || {}).index || [];
      var user = (ua && ua.index) || [];
      var ok = U.cmpArrayUnordered(expected, user);
      return {
        correct: ok, ratio: ok ? 1 : 0,
        detail: [{ index: 0, correct: ok, user: user.join(','), expected: expected.join(',') }]
      };
    },
    answerText: function (q) {
      var idx = (q.answer || {}).index || [];
      return idx.map(function (i) { return String.fromCharCode(65 + i) + '．' + (q.options || [])[i]; }).join('；');
    }
  });

  register({
    id: 'judge', name: '判断题', auto: true, input: 'judge',
    desc: '布尔比对',
    specs: function (q) { return [{ value: (q.answer || {}).value }]; },
    grade: function (q, ua, U) {
      var expected = !!(q.answer || {}).value;
      var user = ua && typeof ua.value === 'boolean' ? ua.value : null;
      var ok = user !== null && user === expected;
      return { correct: ok, ratio: ok ? 1 : 0, detail: [{ index: 0, correct: ok, user: user === null ? '未作答' : (user ? '√' : '×'), expected: expected ? '√' : '×' }] };
    },
    answerText: function (q) { return (q.answer || {}).value ? '正确（√）' : '错误（×）'; }
  });

  register({
    id: 'fill', name: '填空题', auto: true, input: 'blanks',
    desc: '字符串匹配 / 多空独立判定 / 数值容差',
    specs: function (q) { return (q.answer || {}).blanks || []; },
    grade: function (q, ua, U) { return U.cmpBlanks((q.answer || {}).blanks || [], (ua && ua.values) || []); }
  });

  register({
    id: 'calculation', name: '计算题', auto: true, input: 'blanks',
    desc: '数值比对 + 容差 + 单位容错 + 分数等价',
    specs: function (q) {
      var a = q.answer || {};
      if (Array.isArray(a.blanks)) return a.blanks;
      if ('value' in a) return [a];
      return [];
    },
    grade: function (q, ua, U) { return U.cmpBlanks(this.specs(q), (ua && ua.values) || []); }
  });

  register({
    id: 'application', name: '应用题', auto: true, input: 'blanks',
    desc: '多答案 / 多问分步给分 / 单位容错',
    specs: function (q) { return (q.answer || {}).blanks || []; },
    grade: function (q, ua, U) { return U.cmpBlanks((q.answer || {}).blanks || [], (ua && ua.values) || []); }
  });

  register({
    id: 'figure', name: '图形题', auto: true, input: 'blanks',
    desc: '由图形测量/计算得到的数值比对',
    specs: function (q) {
      var a = q.answer || {};
      if (Array.isArray(a.blanks)) return a.blanks;
      return ['value' in a ? a : { value: '' }];
    },
    grade: function (q, ua, U) { return U.cmpBlanks(this.specs(q), (ua && ua.values) || []); }
  });

  register({
    id: 'figure-interactive', name: '交互图形题', auto: true, input: 'regions',
    desc: '区域 id 数组比对（选中集合完全一致才得分）',
    specs: function (q) { return [{ value: (q.answer || {}).regions || [] }]; },
    grade: function (q, ua, U) {
      var expected = (q.answer || {}).regions || [];
      var user = (ua && ua.regions) || [];
      var ok = U.cmpArrayUnordered(expected, user);
      var inter = expected.filter(function (x) { return user.indexOf(x) >= 0; }).length;
      var ratio = ok ? 1 : (expected.length ? inter / expected.length * 0.5 : 0);
      return { correct: ok, ratio: ratio, detail: [{ index: 0, correct: ok, user: user.join(',') || '未选择', expected: expected.join(',') }] };
    },
    answerText: function (q) {
      var regions = (q.answer || {}).regions || [];
      var map = {};
      ((q.media || {}).regions || []).forEach(function (r) { map[r.id] = r.label || r.id; });
      return regions.map(function (id) { return map[id] || id; }).join('、');
    }
  });

  register({
    id: 'reading', name: '阅读理解题', auto: true, input: 'reading',
    desc: '材料阅读 + 子问题逐个比对',
    specs: function (q) {
      var subs = (q.answer || {}).subs || [];
      return subs.map(function (s) { return s.answer; });
    },
    grade: function (q, ua, U) {
      var subs = (q.answer || {}).subs || [];
      var users = (ua && ua.subs) || [];
      var detail = [], right = 0, total = 0;
      subs.forEach(function (s, i) {
        var spec = s.answer || {};
        var myVals = users[i] || [];
        if (!Array.isArray(myVals)) myVals = [myVals];
        var specs = Array.isArray(spec.blanks) ? spec.blanks : [spec];
        var r = U.cmpBlanks(specs, myVals);
        total += specs.length;
        right += r.right;
        detail.push({ index: i, label: s.label || ('(' + (i + 1) + ')'), correct: r.correct, user: myVals.join(' / '), expected: specs.map(function (x) { return (x && x.value !== undefined) ? x.value : x; }).join(' / ') });
      });
      return { correct: total > 0 && right === total, ratio: total ? right / total : 0, detail: detail, right: right, total: total };
    },
    answerText: function (q) {
      var subs = (q.answer || {}).subs || [];
      return subs.map(function (s) {
        var spec = s.answer || {};
        var specs = Array.isArray(spec.blanks) ? spec.blanks : [spec];
        return (s.label || '') + specs.map(function (x) { return (x && x.value !== undefined) ? x.value : x; }).join('、');
      }).join('；');
    }
  });

  register({
    id: 'draw', name: '作图题', auto: false, input: 'draw',
    desc: '人工阅卷（提供评分要点，支持教师打分）',
    specs: function () { return []; },
    grade: function (q) {
      return { correct: false, ratio: 0, manual: true, feedback: (q.answer || {}).rubric || '请按评分要点人工判分。', detail: [] };
    },
    answerText: function (q) { return '（人工阅卷）' + ((q.answer || {}).rubric || ''); }
  });

  /* ---------------- 对外 API ---------------- */
  var api = {
    register: register,
    get: function (id) { return registry[id] || null; },
    has: function (id) { return !!registry[id]; },
    list: function () { return order.map(function (id) { return registry[id]; }); },
    autoTypes: function () { return order.filter(function (id) { return registry[id].auto; }); },
    /** 返回题目的输入区域规格（渲染层会使用） */
    inputOf: function (q) { return (registry[q.type] || {}).input || 'text'; },
    /** 返回题目的答案规格列表（用于渲染输入框数量） */
    specsOf: function (q) {
      var p = registry[q.type];
      return p ? p.specs(q) : [];
    },
    answerTextOf: function (q) {
      var p = registry[q.type];
      return p ? p.answerText(q) : '—';
    }
  };

  global.MX = global.MX || {};
  global.MX.Plugins = api;
})(window);
