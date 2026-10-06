/* ============================================================
 * MX.Media —— 媒体渲染（扩展能力：媒体可扩展）
 * 内置 svg / svg-interactive / image / audio / table；可注册自定义类型。
 * ============================================================ */
(function (global) {
  'use strict';

  var renderers = {};

  function register(type, fn) { renderers[type] = fn; }
  function has(type) { return !!renderers[type]; }

  /**
   * 渲染媒体
   * @param {object} media 题目 media 字段
   * @param {object} opts  { interactive:bool, selected:[], onToggle:fn }
   * @returns {HTMLElement|null}
   */
  function render(media, opts) {
    if (!media || !media.type || media.type === 'none') return null;
    var fn = renderers[media.type];
    if (fn) return fn(media, opts || {});
    // 未知类型：兜底为占位提示
    var d = document.createElement('div');
    d.className = 'media-unknown';
    d.textContent = '［暂不支持的媒体类型：' + media.type + '］';
    return d;
  }

  /* ---- 静态 SVG ---- */
  register('svg', function (media) {
    var box = document.createElement('div');
    box.className = 'media media-svg';
    box.innerHTML = media.content || '';
    return box;
  });

  /* ---- 可点击 SVG（交互图形题） ---- */
  register('svg-interactive', function (media, opts) {
    var box = document.createElement('div');
    box.className = 'media media-interactive';
    box.dataset.mediaId = media.id || '';
    var inner = document.createElement('div');
    inner.className = 'media-interactive-canvas';
    inner.innerHTML = media.content || '';
    box.appendChild(inner);

    var svg = inner.querySelector('svg');
    if (!svg) return box;

    var selected = (opts.selected || []).slice();
    var regions = media.regions || [];
    var drawn = [];

    function emit() {
      if (typeof opts.onToggle === 'function') opts.onToggle(selected.slice());
    }
    function paint() {
      drawn.forEach(function (d, i) {
        d.node.setAttribute('fill', selected.indexOf(regions[i].id) >= 0 ? 'rgba(59,130,246,.35)' : 'rgba(0,0,0,0)');
        d.node.setAttribute('stroke', selected.indexOf(regions[i].id) >= 0 ? '#2563eb' : 'transparent');
        d.node.setAttribute('stroke-width', '4');
        d.node.setAttribute('stroke-dasharray', selected.indexOf(regions[i].id) >= 0 ? 'none' : 'none');
      });
      box.dataset.selected = selected.join(',');
    }

    regions.forEach(function (r) {
      var node;
      if (r.kind === 'circle') {
        node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        node.setAttribute('cx', r.cx); node.setAttribute('cy', r.cy); node.setAttribute('r', r.r || 40);
      } else if (r.kind === 'rect') {
        node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        node.setAttribute('x', r.cx - (r.r || 34)); node.setAttribute('y', r.cy - (r.r || 34));
        node.setAttribute('width', (r.r || 34) * 2); node.setAttribute('height', (r.r || 34) * 2);
      } else {
        node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        node.setAttribute('cx', r.cx); node.setAttribute('cy', r.cy); node.setAttribute('r', r.r || 44);
      }
      node.setAttribute('fill', 'rgba(0,0,0,0)');
      node.setAttribute('stroke', 'transparent');
      node.setAttribute('stroke-width', '4');
      node.style.cursor = opts.interactive === false ? 'default' : 'pointer';
      node.style.pointerEvents = 'all';
      if (opts.interactive !== false) {
        node.addEventListener('click', function () {
          var i = selected.indexOf(r.id);
          if (i >= 0) selected.splice(i, 1); else selected.push(r.id);
          paint(); emit();
        });
      }
      svg.appendChild(node);
      drawn.push({ id: r.id, node: node });
    });
    paint();
    return box;
  });

  /* ---- 位图 ---- */
  register('image', function (media) {
    var box = document.createElement('div');
    box.className = 'media media-image';
    var img = document.createElement('img');
    img.src = media.src || media.content || '';
    img.alt = media.alt || '题目插图';
    img.loading = 'lazy';
    box.appendChild(img);
    if (media.caption) {
      var cap = document.createElement('div');
      cap.className = 'media-caption';
      cap.textContent = media.caption;
      box.appendChild(cap);
    }
    return box;
  });

  /* ---- 音频（听力/朗读，为将来扩展预留） ---- */
  register('audio', function (media) {
    var box = document.createElement('div');
    box.className = 'media media-audio';
    var au = document.createElement('audio');
    au.controls = true;
    au.src = media.src || media.content || '';
    box.appendChild(au);
    return box;
  });

  /* ---- 表格（阅读理解题的统计材料） ---- */
  register('table', function (media) {
    var box = document.createElement('div');
    box.className = 'media media-table';
    var head = media.head || [];
    var rows = media.rows || [];
    var html = '<table class="data-table"><thead><tr>' +
      head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table>';
    box.innerHTML = html;
    return box;
  });

  global.MX = global.MX || {};
  global.MX.Media = { register: register, has: has, render: render, types: function () { return Object.keys(renderers); } };
})(window);
