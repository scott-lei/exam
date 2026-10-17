/* ============================================================
 * MX.Loader —— 数据加载器
 * 目标：既能通过 HTTP 服务运行（fetch JSON），也能直接双击 index.html（file://）运行。
 * 策略：优先 fetch 原始 .json；失败时回退到同名 .js（内联 window.__MATH_* 变量）。
 * 附带 MX.Version：教材版本（人教/北师大）记忆与数据路径解析，供 tags.js / bank.js 使用。
 * ============================================================ */
(function (global) {
  'use strict';

  var cache = {};
  var pending = {};

  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('脚本加载失败：' + src)); };
      document.head.appendChild(s);
    });
  }

  /**
   * 加载 JSON：优先 fetch，其次同名 JS 兜底。
   * @param {string} url   形如 data/tags.json
   * @param {function} pick 从 window 上取值的函数，例如 () => window.__MATH_TAGS__
   */
  async function loadJSON(url, pick) {
    if (cache[url]) return cache[url];
    if (pending[url]) return pending[url];

    pending[url] = (async function () {
      // 1) fetch 原始 JSON（http/https 下可用）
      if (global.location && global.location.protocol !== 'file:') {
        try {
          var res = await fetch(url, { cache: 'no-cache' });
          if (res.ok) {
            var data = await res.json();
            cache[url] = data;
            return data;
          }
        } catch (e) { /* 继续走兜底 */ }
      }
      // 2) 页面已静态引入同名 .js（file:// 场景）：直接取用
      var pre = pick ? pick() : null;
      if (pre) { cache[url] = pre; return pre; }
      // 3) 动态注入同名 .js
      try {
        await injectScript(url.replace(/\.json(\?.*)?$/, '.js'));
        var v = pick ? pick() : null;
        if (v) { cache[url] = v; return v; }
      } catch (e) { /* ignore */ }
      // 4) 再次尝试 fetch（某些环境 file:// 禁用 fetch 但 http 可用）
      try {
        var res2 = await fetch(url);
        if (res2.ok) { var d2 = await res2.json(); cache[url] = d2; return d2; }
      } catch (e) { /* ignore */ }
      throw new Error('无法加载数据文件：' + url + '\n请通过本地服务器打开，或确认 ' + url.replace(/\.json$/, '.js') + ' 存在。');
    })();

    try {
      return await pending[url];
    } finally {
      delete pending[url];
    }
  }

  global.MX = global.MX || {};

  /* ============================================================
   * MX.Version —— 教材版本切换（卡 8）
   * 版本存于 localStorage（键 math_exam_version），默认北师大版（bsd）。
   * tags.js / bank.js 据此选择数据文件：
   *   rj  → data/tags.json      + data/questions/
   *   bsd → data/tags-bsd.json  + data/questions-bsd/
   * 切换入口在顶栏「教材版本」下拉（shell.js），切换后刷新页面生效。
   * ============================================================ */
  var VERSION_KEY = 'math_exam_version';
  var VERSION_DEFAULT = 'bsd';
  var VERSION_LIST = [
    { id: 'rj',  name: '人教版',   tagsJson: 'data/tags.json',     tagsGlobal: '__MATH_TAGS__',     questionDir: 'data/questions/' },
    { id: 'bsd', name: '北师大版', tagsJson: 'data/tags-bsd.json', tagsGlobal: '__MATH_TAGS_BSD__', questionDir: 'data/questions-bsd/' }
  ];
  function versionItem(v) {
    for (var i = 0; i < VERSION_LIST.length; i++) {
      if (VERSION_LIST[i].id === v) return VERSION_LIST[i];
    }
    return null;
  }
  function versionCurrent() {
    try {
      var v = global.localStorage ? global.localStorage.getItem(VERSION_KEY) : null;
      if (versionItem(v)) return v;
    } catch (e) { /* 隐私模式等场景回落默认值 */ }
    return VERSION_DEFAULT;
  }
  global.MX.Version = {
    KEY: VERSION_KEY,
    DEFAULT: VERSION_DEFAULT,
    list: VERSION_LIST,
    current: versionCurrent,
    item: function () { return versionItem(versionCurrent()); },
    name: function (v) { var it = versionItem(v || versionCurrent()); return it ? it.name : ''; },
    tagsJson: function () { return versionItem(versionCurrent()).tagsJson; },
    tagsGlobal: function () { return versionItem(versionCurrent()).tagsGlobal; },
    questionDir: function () { return versionItem(versionCurrent()).questionDir; },
    set: function (v) {
      if (!versionItem(v)) throw new Error('未知教材版本：' + v);
      try { global.localStorage.setItem(VERSION_KEY, v); } catch (e) { /* ignore */ }
      return v;
    }
  };

  global.MX.Loader = {
    loadJSON: loadJSON,
    clear: function () { cache = {}; },
    /** 运行环境提示 */
    env: function () {
      return {
        protocol: global.location ? global.location.protocol : 'unknown',
        fileMode: global.location ? global.location.protocol === 'file:' : true
      };
    }
  };
})(window);
