/* ============================================================
 * MX.Bank —— 题库（按册懒加载，可扩展）
 * 数据源按教材版本切换（MX.Version，卡 8）：
 *   rj  → data/questions/
 *   bsd → data/questions-bsd/
 * ============================================================ */
(function (global) {
  'use strict';

  var loaded = {};        // bookId -> { count, questions }
  var qIndex = {};        // qid -> question
  var loading = {};

  function globalKey(bookId) { return function () { return (global.__MATH_BANK__ || {})[bookId]; }; }

  async function loadBook(bookId) {
    if (loaded[bookId]) return loaded[bookId];
    if (loading[bookId]) return loading[bookId];
    loading[bookId] = (async function () {
      var dir = global.MX.Version ? global.MX.Version.questionDir() : 'data/questions/';
      var payload = await global.MX.Loader.loadJSON(dir + bookId + '.json', globalKey(bookId));
      loaded[bookId] = payload;
      payload.questions.forEach(function (q) { qIndex[q.id] = q; });
      return payload;
    })();
    try { return await loading[bookId]; } finally { delete loading[bookId]; }
  }

  async function loadBooks(bookIds) {
    await Promise.all((bookIds || []).map(loadBook));
    return true;
  }

  function all() {
    var out = [];
    Object.keys(loaded).forEach(function (k) { out = out.concat(loaded[k].questions); });
    return out;
  }

  function questionsOf(bookIds) {
    var out = [];
    (bookIds || []).forEach(function (b) {
      if (loaded[b]) out = out.concat(loaded[b].questions);
    });
    return out;
  }

  function get(qid) { return qIndex[qid] || null; }

  function bookIdOfQid(qid) {
    var parts = String(qid || '').split('-');
    // 旧主键：<code>-QNNN（如 g1u-Q001）；新主键：<version>-<code>-<domain>-<pinyin>-<NNN>
    // 版本段为 rj- 或 bsd-；取版本段之后的 book code。
    var code = (parts[0] === 'rj' || parts[0] === 'bsd') ? (parts[1] || '') : parts[0];
    return global.MX.Tags.bookIdByCode(code);
  }

  /** 按题目 id 批量取题（自动加载所属册） */
  async function getMany(qids) {
    var need = {};
    qids.forEach(function (id) {
      var b = bookIdOfQid(id);
      if (b && !loaded[b]) need[b] = 1;
    });
    await loadBooks(Object.keys(need));
    return qids.map(get).filter(Boolean);
  }

  /** 题库统计（需要先加载） */
  function stats() {
    var s = { books: 0, questions: 0, byType: {}, byDifficulty: {} };
    Object.keys(loaded).forEach(function (b) {
      s.books++;
      loaded[b].questions.forEach(function (q) {
        s.questions++;
        s.byType[q.type] = (s.byType[q.type] || 0) + 1;
        s.byDifficulty[q.difficulty] = (s.byDifficulty[q.difficulty] || 0) + 1;
      });
    });
    return s;
  }

  /** 扩展能力：运行时注入自定义题目 */
  function registerQuestion(q, bookId) {
    if (!loaded[bookId]) loaded[bookId] = { book: bookId, count: 0, questions: [], typeStat: {} };
    loaded[bookId].questions.push(q);
    loaded[bookId].count = loaded[bookId].questions.length;
    qIndex[q.id] = q;
    return q;
  }

  global.MX = global.MX || {};
  global.MX.Bank = {
    loadBook: loadBook,
    loadBooks: loadBooks,
    questionsOf: questionsOf,
    all: all,
    get: get,
    getMany: getMany,
    bookIdOfQid: bookIdOfQid,
    stats: stats,
    registerQuestion: registerQuestion,
    get loadedBooks() { return Object.keys(loaded); }
  };
})(window);
