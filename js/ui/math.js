/* ============================================================
 * MX.Math —— KaTeX 公式渲染（本地 vendor，离线可用）
 * 支持 $...$ 、$$...$$ 、\(...\) 、\[...\] 四种定界符
 * KaTeX 不可用时自动降级为纯文本（去掉定界符），不影响功能
 * ============================================================ */
(function (global) {
  'use strict';

  var katex = null;
  var available = false;

  function init() {
    katex = global.katex || null;
    available = !!(katex && typeof katex.renderToString === 'function');
    return available;
  }

  var INLINE = /\$([^$\n]+?)\$/g;
  var DISPLAY = /\$\$([\s\S]+?)\$\$/g;
  var PAREN = /\\\(([\s\S]+?)\\\)/g;
  var BRACKET = /\\\[([\s\S]+?)\\\]/g;

  function tex(src, display) {
    if (!available && !init()) return display ? src : src;
    try {
      return katex.renderToString(src, {
        displayMode: !!display,
        throwOnError: false,
        strict: false,
        output: 'htmlAndMathml',
        trust: false,
        macros: { '\\d': '\\mathrm{d}' }
      });
    } catch (e) {
      return '<span class="math-error" title="公式渲染失败">' + escapeHtml(src) + '</span>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * 把一段含 LaTeX 的文本转成 HTML（先转义 HTML，再替换公式，避免注入）
   */
  function toHtml(text) {
    if (text === null || text === undefined) return '';
    if (!available && !init()) init();
    var s = escapeHtml(String(text));

    // 先把公式提取出来，避免被后续处理干扰
    var store = [];
    function hold(html) { store.push(html); return '\u0000' + (store.length - 1) + '\u0000'; }

    s = s.replace(DISPLAY, function (_, m) { return hold(tex(unescapeForTex(m), true)); });
    s = s.replace(BRACKET, function (_, m) { return hold(tex(unescapeForTex(m), true)); });
    s = s.replace(INLINE, function (_, m) { return hold(tex(unescapeForTex(m), false)); });
    s = s.replace(PAREN, function (_, m) { return hold(tex(unescapeForTex(m), false)); });

    // 换行
    s = s.replace(/\n/g, '<br>');
    // 下划线空 \underline{\quad} 之外，普通下划线保留
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return store[Number(i)]; });
    return s;
  }

  function unescapeForTex(m) {
    return m
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /** 渲染到元素（替换元素的 innerHTML） */
  function renderInto(el, text) {
    if (!el) return el;
    el.innerHTML = toHtml(text);
    return el;
  }

  function isAvailable() { return available || init(); }

  global.MX = global.MX || {};
  global.MX.Math = {
    init: init,
    tex: tex,
    toHtml: toHtml,
    renderInto: renderInto,
    escapeHtml: escapeHtml,
    isAvailable: isAvailable
  };
})(window);
