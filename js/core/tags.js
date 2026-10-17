/* ============================================================
 * MX.Tags —— 四级标签体系（年级 → 知识领域 → 二级知识点 → 三级考点）
 * 数据源按教材版本切换（MX.Version，卡 8；默认北师大版）：
 *   rj  → data/tags.json      人教版   12 册
 *   bsd → data/tags-bsd.json  北师大版 12 册
 * 加载完成后派发 mx:tagsready 事件（detail.version），供外壳更新统计文案。
 * ============================================================ */
(function (global) {
  'use strict';

  var data = null;
  var maps = { book: {}, point: {}, knowledge: {}, domain: {}, code2book: {} };

  function buildIndex() {
    maps.book = {}; maps.point = {}; maps.knowledge = {}; maps.domain = {}; maps.code2book = {};
    data.books.forEach(function (b) { maps.book[b.id] = b; maps.code2book[b.code] = b.id; });
    data.domains.forEach(function (d) { maps.domain[d.id] = d; });
    data.knowledge.forEach(function (k) { maps.knowledge[k.id] = k; });
    data.points.forEach(function (p) { maps.point[p.id] = p; });
  }

  async function load() {
    if (data) return data;
    var V = global.MX.Version;
    var cur = V ? V.current() : 'rj';
    var url = V ? V.tagsJson() : 'data/tags.json';
    var gname = V ? V.tagsGlobal() : '__MATH_TAGS__';
    data = await global.MX.Loader.loadJSON(url, function () { return global[gname]; });
    buildIndex();
    try {
      global.document.dispatchEvent(new CustomEvent('mx:tagsready', { detail: { version: cur } }));
    } catch (e) { /* 非浏览器环境（如 Node 自检）无 CustomEvent/dispatchEvent */ }
    return data;
  }

  /** 构建四级标签树（可按册过滤） */
  function tree(opts) {
    opts = opts || {};
    var books = data.books.filter(function (b) {
      if (opts.books && opts.books.length) return opts.books.indexOf(b.id) >= 0;
      if (opts.grade) return b.grade === Number(opts.grade);
      return true;
    });
    return books.map(function (b) {
      var ks = data.knowledge
        .filter(function (k) { return k.book === b.id; })
        .sort(function (a, c) { return a.order - c.order; });
      return {
        id: b.id, name: b.name, grade: b.grade, term: b.term, short: b.short,
        type: 'book', pointCount: b.pointCount,
        children: ks.map(function (k) {
          var pts = data.points.filter(function (p) { return p.knowledge === k.id; });
          return {
            id: k.id, name: k.name, domain: k.domain, type: 'knowledge',
            domainName: maps.domain[k.domain] ? maps.domain[k.domain].name : k.domain,
            children: pts.map(function (p) {
              return {
                id: p.id, name: p.name, type: 'point', pointType: p.type,
                suitableTypes: p.suitableTypes, difficultyRange: p.difficultyRange,
                extend: p.extend
              };
            })
          };
        })
      };
    });
  }

  /**
   * 标签组合过滤
   * 逻辑：年级 AND 领域 AND (考点A OR 考点B) AND 题型匹配 AND 难度匹配
   */
  function filter(cond) {
    cond = cond || {};
    var books = cond.books && cond.books.length ? cond.books : null;
    var domains = cond.domains && cond.domains.length ? cond.domains : null;
    var points = cond.points && cond.points.length ? cond.points : null;
    var knowledges = cond.knowledges && cond.knowledges.length ? cond.knowledges : null;
    var types = cond.types && cond.types.length ? cond.types : null;
    var dmin = cond.difficultyMin || 1;
    var dmax = cond.difficultyMax || 3;
    var pointTypes = cond.pointTypes && cond.pointTypes.length ? cond.pointTypes : null;
    var kw = (cond.keyword || '').trim();

    return data.points.filter(function (p) {
      if (books && books.indexOf(p.book) < 0) return false;
      if (domains && domains.indexOf(p.domain) < 0) return false;
      if (knowledges && knowledges.indexOf(p.knowledge) < 0) return false;
      if (points && points.indexOf(p.id) < 0) return false;
      if (pointTypes && pointTypes.indexOf(p.type) < 0) return false;
      if (types && !types.some(function (t) { return p.suitableTypes.indexOf(t) >= 0; })) return false;
      var lo = p.difficultyRange[0], hi = p.difficultyRange[1];
      if (hi < dmin || lo > dmax) return false;
      if (kw) {
        var hay = (p.name + ' ' + (p.knowledgeName || '') + ' ' + (p.extend.keywords || []).join(' ')).toLowerCase();
        if (hay.indexOf(kw.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }

  function search(kw, limit) {
    kw = (kw || '').trim().toLowerCase();
    if (!kw) return [];
    return data.points.filter(function (p) {
      return (p.name + ' ' + p.bookName + ' ' + p.knowledgeName).toLowerCase().indexOf(kw) >= 0;
    }).slice(0, limit || 40);
  }

  function stats() {
    return data.stats;
  }

  /** 某考点历年（各册）分布，用于跨年级分析 */
  function keywordAcrossBooks(kw) {
    var out = {};
    data.points.forEach(function (p) {
      if ((p.name || '').indexOf(kw) >= 0) out[p.bookId] = (out[p.book] || 0) + 1;
    });
    return out;
  }

  global.MX = global.MX || {};
  global.MX.Tags = {
    load: load,
    get data() { return data; },
    get books() { return data ? data.books : []; },
    get domains() { return data ? data.domains : []; },
    get points() { return data ? data.points : []; },
    get knowledge() { return data ? data.knowledge : []; },
    get pointTypes() { return data ? data.pointTypes : {}; },
    get questionTypes() { return data ? data.questionTypes : []; },
    book: function (id) { return maps.book[id] || null; },
    point: function (id) { return maps.point[id] || null; },
    knowledgeOf: function (id) { return maps.knowledge[id] || null; },
    domain: function (id) { return maps.domain[id] || null; },
    bookIdByCode: function (code) { return maps.code2book[code] || null; },
    tree: tree,
    filter: filter,
    search: search,
    stats: stats,
    keywordAcrossBooks: keywordAcrossBooks
  };
})(window);
