/* ============================================================
 * MX.Loader —— 数据加载器
 * 目标：既能通过 HTTP 服务运行（fetch JSON），也能直接双击 index.html（file://）运行。
 * 策略：优先 fetch 原始 .json；失败时回退到同名 .js（内联 window.__MATH_* 变量）。
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
