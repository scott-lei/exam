/* ============================================================
 * MX.AI —— AI 出题 / AI 讲题 预留接口（扩展能力）
 *
 * 使用方式（在页面中先注入 provider，再调用）：
 *   MX.AI.setProvider({
 *     name: 'my-llm',
 *     async generate({ point, pointName, type, difficulty, count, seed }) {
 *       // 返回题目数组，字段与 data/questions/*.json 中的 question 保持一致
 *       return [ { id, type, difficulty, score, stem, answer, options, analysis, media } ];
 *     },
 *     async explain(question, userAnswer) {
 *       return '讲解文本（可含 $LaTeX$）';
 *     }
 *   });
 *   const qs = await MX.AI.generate({ pointId: 'g4u-NA-01-01', type: 'choice', count: 3 });
 *
 * 没有配置 provider 时，会自动降级为「本地模板出题」，保证功能可用。
 * ============================================================ */
(function (global) {
  'use strict';

  var provider = null;

  function setProvider(p) {
    if (!p || typeof p.generate !== 'function') throw new Error('provider 必须实现 generate 方法');
    provider = p;
    return provider;
  }
  function getProvider() { return provider; }
  function isReady() { return !!provider; }

  /**
   * 生成题目
   * @param {object} opts { pointId, type, difficulty, count, seed }
   * @returns {Promise<Array>}
   */
  async function generate(opts) {
    opts = opts || {};
    var pt = opts.pointId ? global.MX.Tags.point(opts.pointId) : null;
    if (provider && typeof provider.generate === 'function') {
      var list = await provider.generate({
        point: opts.pointId,
        pointName: pt ? pt.name : '',
        bookName: pt ? pt.bookName : '',
        domainName: pt ? (global.MX.Tags.domain(pt.domain) || {}).name : '',
        type: opts.type || 'fill',
        difficulty: opts.difficulty || 2,
        count: opts.count || 1,
        seed: opts.seed || ''
      });
      return normalizeGenerated(list, opts);
    }
    return localTemplateGenerate(opts, pt);
  }

  /** AI 讲题（无 provider 时返回结构化解析） */
  async function explain(question, userAnswer) {
    if (provider && typeof provider.explain === 'function') {
      return await provider.explain(question, userAnswer);
    }
    var lines = [];
    if (question.analysis) lines.push(question.analysis);
    lines.push('正确答案：' + global.MX.Plugins.answerTextOf(question));
    if (userAnswer) lines.push('你的作答：' + JSON.stringify(userAnswer));
    lines.push('（提示：配置 AI provider 后可获得逐步讲解。）');
    return lines.join('\n');
  }

  function normalizeGenerated(list, opts) {
    return (list || []).map(function (q, i) {
      var point = opts.pointId ? global.MX.Tags.point(opts.pointId) : null;
      var book = point ? global.MX.Tags.book(point.book) : null;
      var kn = point ? global.MX.Tags.knowledgeOf(point.knowledge) : null;
      return Object.assign({
        id: 'AI-' + Date.now().toString(36).toUpperCase() + '-' + i,
        grade: book ? book.grade : 1,
        book: book ? book.id : '',
        bookName: book ? book.name : '',
        domain: point ? point.domain : '',
        domainName: point ? (global.MX.Tags.domain(point.domain) || {}).name : '',
        knowledge: point ? point.knowledge : '',
        knowledgeName: kn ? kn.name : '',
        point: opts.pointId || '',
        pointName: point ? point.name : '',
        type: opts.type || 'fill',
        difficulty: opts.difficulty || 2,
        score: 5,
        options: null,
        analysis: '',
        tags: point ? point.extend.keywords : [],
        media: { type: 'none' },
        extend: { source: 'AI 生成', autoGraded: true }
      }, q);
    });
  }

  /* ---------- 本地模板出题（离线兜底，不是 AI，但保证接口可用） ---------- */
  function localTemplateGenerate(opts, pt) {
    var type = opts.type || 'fill';
    var n = Math.max(1, opts.count || 1);
    var diff = opts.difficulty || 2;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = 2 + Math.floor(Math.random() * 9 * diff);
      var b = 1 + Math.floor(Math.random() * 9);
      var stem, answer, options = null;
      if (type === 'choice') {
        var right = a + b;
        options = [String(right), String(right + 1), String(right - 1), String(right + 2)];
        // 洗牌
        var idx = options.map(function (_, k) { return k; });
        for (var j = idx.length - 1; j > 0; j--) { var t = Math.floor(Math.random() * (j + 1)); var tmp = idx[j]; idx[j] = idx[t]; idx[t] = tmp; }
        var shuffled = idx.map(function (k) { return options[k]; });
        var newIdx = idx.indexOf(0);
        stem = '（本地模板题·占位）计算 $' + a + '+' + b + '=$';
        answer = { index: [newIdx] };
        options = shuffled;
      } else if (type === 'judge') {
        var ok = Math.random() > 0.5;
        stem = '（本地模板题·占位）$' + a + '+' + b + (ok ? '=' : '\\ne') + (ok ? (a + b) : (a + b + 1)) + '$。';
        answer = { value: ok };
      } else {
        stem = '（本地模板题·占位）计算：$' + a + '+' + b + '=\\underline{\\quad}$';
        answer = { value: a + b };
      }
      out.push({
        id: 'TMP-' + Date.now().toString(36) + '-' + i,
        type: type,
        difficulty: diff,
        score: 5,
        stem: stem,
        options: options,
        answer: answer,
        analysis: '本地模板题目，仅用于验证「题型插件 / 组卷 / 阅卷」链路；接入真实 AI provider 后即可生成高质量试题。',
        extend: { source: '本地模板', autoGraded: type !== 'draw' }
      });
    }
    return normalizeGenerated(out, opts);
  }

  global.MX = global.MX || {};
  global.MX.AI = {
    setProvider: setProvider,
    getProvider: getProvider,
    isReady: isReady,
    generate: generate,
    explain: explain
  };
})(window);
