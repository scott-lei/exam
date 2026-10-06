/* ============================================================
 * page-builder.js —— 组卷中心
 * 标签树选择 + 组卷配置 + 试卷预览
 * 四种模式：单考点 / 多考点 / 跨年级 / 题型优先
 * ============================================================ */
(function () {
  'use strict';

  var root, previewPaper = null, previewViews = [];
  var state = {
    mode: 'single',
    books: [],
    domains: [],
    knowledges: [],
    points: [],
    types: [],
    typeRatio: {},
    difficultyMin: 1,
    difficultyMax: 3,
    difficultyWeights: { 1: 1, 2: 1, 3: 1 },
    count: 10,
    totalScore: 100,
    shuffle: true,
    shuffleOptions: false,
    title: ''
  };

  var MODES = [
    { id: 'single', name: '单考点组题', desc: '锁定一个三级考点，集中突破' },
    { id: 'multi', name: '多考点组题', desc: '选择若干考点，考点间取「或」' },
    { id: 'cross', name: '跨年级组题', desc: '跨册取题，适合期末 / 总复习' },
    { id: 'type', name: '题型优先组题', desc: '按题型比例出题，考点不限' }
  ];

  function esc(s) { return window.MX.Math.escapeHtml(s); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ============================================================
   * 渲染：整体布局
   * ============================================================ */
  function layout() {
    return '' +
    '<div class="grid grid-side">' +

      /* ---------- 左：标签树 ---------- */
      '<aside class="card" style="align-self:start">' +
      '<div class="card-head"><h3 class="card-title">🏷️ 标签体系</h3>' +
      '<span class="badge" id="tag-count">—</span></div>' +
      '<div class="tree-toolbar">' +
      '<input type="text" id="tree-search" class="input" placeholder="搜索考点，如「分数」「面积」" style="flex:1 1 140px">' +
      '</div>' +
      '<div class="tree-toolbar">' +
      '<button class="btn btn-ghost btn-sm" data-tree="expand">全部展开</button>' +
      '<button class="btn btn-ghost btn-sm" data-tree="collapse">全部收起</button>' +
      '<button class="btn btn-ghost btn-sm" data-tree="clear">清空选择</button>' +
      '</div>' +
      '<div class="tree-body" id="tree-body"></div>' +
      '</aside>' +

      /* ---------- 右：配置 + 预览 ---------- */
      '<div>' +

      '<div class="card mb-3">' +
      '<div class="card-head"><h3 class="card-title">🧩 组卷配置</h3>' +
      '<div class="btn-seg" id="mode-seg">' +
      MODES.map(function (m) {
        return '<button data-mode="' + m.id + '"' + (m.id === state.mode ? ' class="on"' : '') + '>' + m.name + '</button>';
      }).join('') +
      '</div></div>' +
      '<p class="muted small" id="mode-desc">' + MODES[0].desc + '</p>' +

      '<div class="field"><label>试卷标题</label>' +
      '<input type="text" id="cfg-title" class="input" placeholder="留空则自动命名，如「五年级上册·单考点组卷」"></div>' +

      '<div class="field"><label>年级 / 册次（可多选，跨年级组题请选 2 册以上）</label>' +
      '<div class="check-list" id="cfg-books"></div></div>' +

      '<div class="field"><label>知识领域</label>' +
      '<div class="check-list" id="cfg-domains"></div></div>' +

      '<div class="grid grid-3">' +
      '<div class="field"><label>题量</label><input type="number" id="cfg-count" class="input" min="1" max="60" value="' + state.count + '"></div>' +
      '<div class="field"><label>总分</label><input type="number" id="cfg-score" class="input" min="0" max="300" step="5" value="' + state.totalScore + '"></div>' +
      '<div class="field"><label>难度区间</label>' +
      '<div class="flex gap-1"><select id="cfg-dmin" class="select" style="flex:1">' +
      [1, 2, 3].map(function (d) { return '<option value="' + d + '"' + (d === 1 ? ' selected' : '') + '>' + d + ' 星</option>'; }).join('') +
      '</select><span style="align-self:center">—</span><select id="cfg-dmax" class="select" style="flex:1">' +
      [1, 2, 3].map(function (d) { return '<option value="' + d + '"' + (d === 3 ? ' selected' : '') + '>' + d + ' 星</option>'; }).join('') +
      '</select></div></div>' +
      '</div>' +

      '<div class="field"><label>题型比例（相对权重，0 表示不选）</label>' +
      '<div class="grid grid-4" id="cfg-types"></div></div>' +

      '<div class="field"><label>难度权重（影响抽题与配分）</label>' +
      '<div class="grid grid-3">' +
      [1, 2, 3].map(function (d) {
        return '<div class="flex gap-1" style="align-items:center"><span class="badge badge-diff-' + d + '">' + d + ' 星</span>' +
          '<input type="number" class="input" data-dw="' + d + '" min="0" max="9" value="' + state.difficultyWeights[d] + '" style="width:80px"></div>';
      }).join('') +
      '</div></div>' +

      '<div class="flex gap-2 wrap mb-2">' +
      '<label class="check-pill' + (state.shuffle ? ' on' : '') + '" id="pill-shuffle"><input type="checkbox"' + (state.shuffle ? ' checked' : '') + '>打乱题目顺序</label>' +
      '<label class="check-pill' + (state.shuffleOptions ? ' on' : '') + '" id="pill-shuffle-opt"><input type="checkbox"' + (state.shuffleOptions ? ' checked' : '') + '>打乱选项顺序</label>' +
      '</div>' +

      '<div class="flex gap-2 wrap">' +
      '<button class="btn btn-primary btn-lg" id="btn-build">🎲 生成试卷</button>' +
      '<button class="btn btn-ghost" id="btn-save-paper">保存试卷</button>' +
      '<button class="btn btn-ghost" id="btn-reset">重置条件</button>' +
      '</div>' +
      '<p class="hint" id="cfg-hint"></p>' +
      '</div>' +

      '<div class="card" id="preview-card">' +
      '<div class="card-head"><h3 class="card-title">📄 试卷预览</h3>' +
      '<div class="btn-group">' +
      '<button class="btn btn-ghost btn-sm" id="btn-print">打印试卷</button>' +
      '<button class="btn btn-success btn-sm" id="btn-start">开始考试</button>' +
      '</div></div>' +
      '<div id="preview-body">' +
      window.MX.Shell.emptyState('尚未生成试卷', '在左侧选择考点、或直接配置组卷条件，然后点击「生成试卷」。') +
      '</div>' +
      '</div>' +

      '</div>' +
      '</div>';
  }

  /* ============================================================
   * 标签树
   * ============================================================ */
  function renderTree(filterKw) {
    var tree = window.MX.Tags.tree();
    var html = '';
    tree.forEach(function (book, bi) {
      var bookSel = state.books.indexOf(book.id) >= 0;
      var bookOpen = bi < 2 || bookSel;
      html += '<div class="tree-group" data-book="' + book.id + '">' +
        '<div class="tree-node lv-book' + (bookSel ? ' sel' : '') + (bookOpen ? ' open' : '') + '" data-act="toggle">' +
        '<span class="tw">▶</span>' +
        '<input type="checkbox" class="tcheck" data-check="book" value="' + book.id + '"' + (bookSel ? ' checked' : '') + '>' +
        '<span class="tname">' + esc(book.name) + '</span>' +
        '<span class="tcount">' + book.pointCount + '</span></div>' +
        '<div class="tree-children' + (bookOpen ? ' open' : '') + '">';

      book.children.forEach(function (kn) {
        var knSel = state.knowledges.indexOf(kn.id) >= 0;
        html += '<div class="tree-group">' +
          '<div class="tree-node lv-know' + (knSel ? ' sel' : '') + '" data-act="toggle">' +
          '<span class="tw">▶</span>' +
          '<input type="checkbox" class="tcheck" data-check="knowledge" value="' + kn.id + '"' + (knSel ? ' checked' : '') + '>' +
          '<span class="tname">' + esc(kn.name) + '</span>' +
          '<span class="tcount">' + kn.children.length + '</span></div>' +
          '<div class="tree-children">';

        kn.children.forEach(function (pt) {
          var ptSel = state.points.indexOf(pt.id) >= 0;
          var hit = !filterKw || pt.name.toLowerCase().indexOf(filterKw.toLowerCase()) >= 0;
          html += '<div class="tree-node lv-point' + (ptSel ? ' sel' : '') + '" data-point="' + pt.id + '"' + (hit ? '' : ' style="display:none"') + '>' +
            '<input type="checkbox" class="tcheck" data-check="point" value="' + pt.id + '"' + (ptSel ? ' checked' : '') + '>' +
            '<span class="tname" title="' + esc(pt.name) + '">' + esc(pt.name) + '</span>' +
            '<span class="badge badge-pt" style="--c:' + ((window.MX.Tags.pointTypes[pt.pointType] || {}).color || '#64748b') + '">' +
            ((window.MX.Tags.pointTypes[pt.pointType] || {}).short || '') + '</span>' +
            '</div>';
        });
        html += '</div></div>';
      });
      html += '</div></div>';
    });
    $('#tree-body').innerHTML = html;
    updateTagCount();
  }

  function updateTagCount() {
    var n = window.MX.Tags.filter({
      books: state.books, domains: state.domains, knowledges: state.knowledges, points: state.points
    }).length;
    var el = $('#tag-count');
    if (el) el.textContent = '匹配 ' + n + ' 考点';
    var hint = $('#cfg-hint');
    if (hint) {
      hint.textContent = '当前选择：' + state.books.length + ' 册 · ' + state.domains.length + ' 领域 · ' +
        state.knowledges.length + ' 二级知识点 · ' + state.points.length + ' 考点 · ' + state.types.length + ' 题型';
    }
  }

  /* ============================================================
   * 配置区
   * ============================================================ */
  function renderConfig() {
    $('#cfg-books').innerHTML = window.MX.Tags.books.map(function (b) {
      return '<label class="check-pill' + (state.books.indexOf(b.id) >= 0 ? ' on' : '') + '">' +
        '<input type="checkbox" data-cfg="book" value="' + b.id + '">' + b.name + '</label>';
    }).join('');

    $('#cfg-domains').innerHTML = window.MX.Tags.domains.map(function (d) {
      return '<label class="check-pill' + (state.domains.indexOf(d.id) >= 0 ? ' on' : '') + '" title="' + esc(d.desc) + '">' +
        '<input type="checkbox" data-cfg="domain" value="' + d.id + '">' + d.name + '</label>';
    }).join('');

    $('#cfg-types').innerHTML = window.MX.Tags.questionTypes.map(function (t) {
      var v = state.typeRatio[t.id] || 0;
      return '<div class="flex gap-1" style="align-items:center">' +
        '<label class="check-pill' + (v > 0 ? ' on' : '') + '" style="flex:1 1 auto">' +
        '<input type="checkbox" data-cfg="type" value="' + t.id + '"' + (v > 0 ? ' checked' : '') + '>' + t.name + '</label>' +
        '<input type="number" class="input" data-tr="' + t.id + '" min="0" max="9" value="' + v + '" style="width:64px">' +
        '</div>';
    }).join('');
  }

  function syncTypeChecks() {
    $$('#cfg-types [data-cfg="type"]').forEach(function (inp) {
      var on = (state.typeRatio[inp.value] || 0) > 0;
      inp.checked = on;
      inp.closest('.check-pill').classList.toggle('on', on);
    });
  }

  /* ============================================================
   * 事件绑定
   * ============================================================ */
  function bind() {
    /* 模式切换 */
    $('#mode-seg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]');
      if (!b) return;
      state.mode = b.getAttribute('data-mode');
      $$('#mode-seg button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $('#mode-desc').textContent = (MODES.filter(function (m) { return m.id === state.mode; })[0] || {}).desc || '';
      if (state.mode === 'type') { $('#cfg-types').closest('.field').classList.add('highlight'); }
      updateTagCount();
    });

    /* 标签树 */
    $('#tree-body').addEventListener('click', function (e) {
      var check = e.target.closest('input[type="checkbox"]');
      var node = e.target.closest('.tree-node');
      if (check) {
        var kind = check.getAttribute('data-check');
        var val = check.value;
        var arr = kind === 'book' ? state.books : kind === 'knowledge' ? state.knowledges : state.points;
        var i = arr.indexOf(val);
        if (check.checked && i < 0) arr.push(val);
        if (!check.checked && i >= 0) arr.splice(i, 1);
        // 单选模式约束
        if (state.mode === 'single' && kind === 'point' && check.checked) {
          state.points = [val];
        }
        if (kind === 'point') { renderTree($('#tree-search').value); renderConfig(); }
        else { node.classList.toggle('sel', check.checked); updateTagCount(); }
        e.stopPropagation();
        return;
      }
      if (node && node.getAttribute('data-act') === 'toggle') {
        node.classList.toggle('open');
        var kids = node.nextElementSibling;
        if (kids) kids.classList.toggle('open');
      }
    });

    $('#tree-search').addEventListener('input', function () {
      var kw = this.value;
      renderTree(kw);
      if (kw) {
        // 搜索时展开有命中的分组
        $$('#tree-body .tree-children').forEach(function (c) {
          if (c.querySelector('.lv-point:not([style*="display:none"])')) c.classList.add('open');
        });
        $$('#tree-body .tree-node').forEach(function (n) { if (n.nextElementSibling && n.nextElementSibling.classList.contains('open')) n.classList.add('open'); });
      }
    });

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tree]');
      if (!b) return;
      var act = b.getAttribute('data-tree');
      if (act === 'expand') { $$('#tree-body .tree-children').forEach(function (c) { c.classList.add('open'); }); $$('#tree-body .tree-node').forEach(function (n) { n.classList.add('open'); }); }
      if (act === 'collapse') { $$('#tree-body .tree-children').forEach(function (c) { c.classList.remove('open'); }); $$('#tree-body .tree-node').forEach(function (n) { n.classList.remove('open'); }); }
      if (act === 'clear') {
        state.books = []; state.knowledges = []; state.points = [];
        renderTree(''); renderConfig();
      }
    });

    /* 配置项 */
    document.addEventListener('change', function (e) {
      var t = e.target;
      var cfg = t.getAttribute && t.getAttribute('data-cfg');
      if (cfg) {
        var arr = cfg === 'book' ? state.books : cfg === 'domain' ? state.domains : null;
        if (cfg === 'type') {
          state.typeRatio[t.value] = t.checked ? Math.max(1, Number(state.typeRatio[t.value]) || 1) : 0;
          var num = $('[data-tr="' + t.value + '"]');
          if (num) num.value = state.typeRatio[t.value];
          state.types = Object.keys(state.typeRatio).filter(function (k) { return state.typeRatio[k] > 0; });
          syncTypeChecks();
        } else {
          var i = arr.indexOf(t.value);
          if (t.checked && i < 0) arr.push(t.value);
          if (!t.checked && i >= 0) arr.splice(i, 1);
          t.closest('.check-pill').classList.toggle('on', t.checked);
          // 同步标签树中的册次勾选
          if (cfg === 'book') renderTree($('#tree-search').value);
        }
        updateTagCount();
        return;
      }
      var tr = t.getAttribute && t.getAttribute('data-tr');
      if (tr) {
        state.typeRatio[tr] = Math.max(0, Number(t.value) || 0);
        state.types = Object.keys(state.typeRatio).filter(function (k) { return state.typeRatio[k] > 0; });
        syncTypeChecks(); updateTagCount();
        return;
      }
      var dw = t.getAttribute && t.getAttribute('data-dw');
      if (dw) { state.difficultyWeights[dw] = Math.max(0, Number(t.value) || 0); return; }
      if (t.id === 'cfg-count') state.count = Math.max(1, Number(t.value) || 1);
      if (t.id === 'cfg-score') state.totalScore = Math.max(0, Number(t.value) || 0);
      if (t.id === 'cfg-dmin') state.difficultyMin = Number(t.value);
      if (t.id === 'cfg-dmax') state.difficultyMax = Number(t.value);
      if (t.id === 'cfg-title') state.title = t.value;
    });

    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'cfg-title') state.title = t.value;
      var tr = t.getAttribute && t.getAttribute('data-tr');
      if (tr) {
        state.typeRatio[tr] = Math.max(0, Number(t.value) || 0);
        state.types = Object.keys(state.typeRatio).filter(function (k) { return state.typeRatio[k] > 0; });
        syncTypeChecks(); updateTagCount();
      }
    });

    $('#pill-shuffle').addEventListener('change', function (e) {
      state.shuffle = e.target.checked;
      this.classList.toggle('on', state.shuffle);
    });
    $('#pill-shuffle-opt').addEventListener('change', function (e) {
      state.shuffleOptions = e.target.checked;
      this.classList.toggle('on', state.shuffleOptions);
    });

    /* 生成 / 保存 / 重置 / 打印 / 开始 */
    $('#btn-build').addEventListener('click', doBuild);
    $('#btn-reset').addEventListener('click', function () {
      location.href = 'paper-builder.html';
    });
    $('#btn-save-paper').addEventListener('click', function () {
      if (!previewPaper) return window.MX.Toast.warn('请先生成试卷');
      window.MX.Storage.savePaper({
        id: previewPaper.id, title: previewPaper.title, createdAt: Date.now(),
        count: previewPaper.count, totalScore: previewPaper.totalScore,
        config: previewPaper.config, paper: previewPaper
      });
      window.MX.Toast.ok('试卷已保存到「我的试卷」');
    });
    $('#btn-print').addEventListener('click', function () {
      if (!previewPaper) return window.MX.Toast.warn('请先生成试卷');
      window.print();
    });
    $('#btn-start').addEventListener('click', function () {
      if (!previewPaper) return window.MX.Toast.warn('请先生成试卷');
      startExam(previewPaper);
    });
  }

  function startExam(paper) {
    window.MX.Storage.write('math_exam_current_paper', {
      paper: paper, createdAt: Date.now()
    });
    location.href = 'exam.html?examId=' + encodeURIComponent(paper.examId);
  }

  /* ============================================================
   * 组卷 & 预览
   * ============================================================ */
  async function doBuild(silent) {
    if (state.difficultyMin > state.difficultyMax) {
      return window.MX.Toast.warn('难度下限不能大于上限');
    }
    if (state.mode === 'single' && state.points.length !== 1) {
      return window.MX.Toast.warn('「单考点组题」请恰好选择 1 个三级考点（也可用册次+领域让系统自动取考点）');
    }
    if (state.mode === 'multi' && state.points.length < 2) {
      return window.MX.Toast.warn('「多考点组题」请至少选择 2 个三级考点');
    }
    if (state.mode === 'cross' && state.books.length < 2) {
      return window.MX.Toast.warn('「跨年级组题」请至少选择 2 个册次');
    }
    if (state.mode === 'type' && state.types.length === 0) {
      return window.MX.Toast.warn('「题型优先组题」请至少选择 1 种题型');
    }
    if (state.books.length === 0 && state.mode !== 'type') {
      return window.MX.Toast.warn('请至少选择一个册次');
    }

    var load = window.MX.Shell.loading('正在从题库抽题…');
    try {
      var res = await window.MX.Builder.build(Object.assign({}, state, {
        shuffleOptions: state.shuffleOptions || window.MX.Storage.getSettings().shuffleOptions
      }));
      load.close();
      if (!res.ok) { window.MX.Toast.warn(res.message); return; }
      previewPaper = res.paper;
      renderPreview();
      if (!silent) window.MX.Toast.ok(res.message + '：共 ' + res.paper.count + ' 题，总分 ' + res.paper.totalScore + ' 分');
    } catch (e) {
      load.close();
      window.MX.Toast.error('组卷失败：' + e.message);
      console.error(e);
    }
  }

  function renderPreview() {
    var p = previewPaper;
    previewViews.forEach(function (v) { v.destroy && v.destroy(); });
    previewViews = [];

    var statChips = Object.keys(p.stats.types).map(function (k) {
      return '<span class="chip">' + window.MX.Render.typeName(k) + ' ×' + p.stats.types[k] + '</span>';
    }).join('');
    var diffChips = Object.keys(p.stats.difficulty).sort().map(function (k) {
      return '<span class="badge badge-diff-' + k + '">' + k + ' 星 ×' + p.stats.difficulty[k] + '</span>';
    }).join('');

    $('#preview-body').innerHTML =
      '<div class="paper-meta mb-2">' +
      '<span>标题：<b>' + esc(p.title) + '</b></span>' +
      '<span>题量：<b>' + p.count + '</b> 题</span>' +
      '<span>总分：<b>' + p.totalScore + '</b> 分</span>' +
      '<span>建议时长：<b>' + p.duration + '</b> 分钟</span>' +
      '</div>' +
      '<div class="flex gap-1 wrap mb-3">' + statChips + diffChips + '</div>' +
      '<div id="preview-list"></div>';

    var list = $('#preview-list');
    p.questions.forEach(function (q, i) {
      var v = window.MX.Render.createQuestionView(q, { index: i + 1, readonly: true, startExpanded: true });
      previewViews.push(v);
      list.appendChild(v.el);
    });
    window.MX.Toast.info('已生成 ' + p.count + ' 道题，可预览 / 打印 / 直接开始考试');
  }

  /* ============================================================
   * 启动
   * ============================================================ */
  async function boot() {
    root = document.getElementById('page-root');
    window.MX.Shell.mount({
      page: 'paper-builder',
      title: '组卷中心',
      subtitle: '四级标签精准定位 → 四种模式灵活组卷 → 一键生成可打印试卷'
    });

    var load = window.MX.Shell.loading('正在加载标签体系…');
    try { await window.MX.Tags.load(); } catch (e) {
      load.close();
      root.innerHTML = '<div class="card"><h2>数据加载失败</h2><p class="muted">' + esc(e.message) + '</p></div>';
      return;
    }
    load.close();

    root.innerHTML = layout();
    renderTree('');
    renderConfig();
    bind();

    var qs = new URLSearchParams(location.search);

    // 快速组卷：?quick=1（可叠加 &book=grade1-up）
    if (qs.get('quick')) {
      var book = qs.get('book');
      if (book) state.books = [book];
      else state.books = [window.MX.Tags.books[0].id];
      state.mode = 'type';
      state.types = ['choice', 'fill', 'calculation', 'application', 'judge', 'reading', 'figure'];
      state.typeRatio = { choice: 2, fill: 2, calculation: 3, application: 2, judge: 1, reading: 1, figure: 1 };
      state.difficultyMin = 1; state.difficultyMax = 3;
      syncTypeChecks();
      $$('#mode-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-mode') === 'type'); });
      updateTagCount();
      await doBuild(true);
      if (previewPaper) window.MX.Toast.ok('已生成「' + previewPaper.title + '」，共 ' + previewPaper.count + ' 题');
      return;
    }

    // 从某册进入
    if (qs.get('book')) {
      state.books = [qs.get('book')];
      state.mode = 'type';
      state.types = ['choice', 'fill', 'calculation', 'application', 'judge', 'reading', 'figure'];
      state.typeRatio = { choice: 1, fill: 1, calculation: 1, application: 1, judge: 1, reading: 1, figure: 1 };
      $$('#mode-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-mode') === 'type'); });
      $('#mode-desc').textContent = (MODES.filter(function (m) { return m.id === 'type'; })[0] || {}).desc || '';
      renderTree('');
      renderConfig();
      syncTypeChecks();
      updateTagCount();
    }
    if (qs.get('point')) {
      state.points = [qs.get('point')];
      state.mode = 'single';
      var pt = window.MX.Tags.point(qs.get('point'));
      if (pt) state.books = [pt.book];
      $$('#mode-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-mode') === 'single'); });
      renderTree('');
      renderConfig();
      updateTagCount();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
