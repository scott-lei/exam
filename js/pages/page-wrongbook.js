/* ============================================================
 * page-wrongbook.js —— 错题本
 * 分组 / 重练 / 移除 / 筛选
 * ============================================================ */
(function () {
  'use strict';

  var S = function () { return window.MX.Storage; };
  var root, all = [], filter = { group: 'book', status: 'active', kw: '' };
  var practiceViews = [];

  function esc(s) { return window.MX.Math.escapeHtml(s); }
  function $(s, c) { return (c || document).querySelector(s); }

  async function boot() {
    root = document.getElementById('page-root');
    window.MX.Shell.mount({ page: 'wrongbook', title: '错题本', subtitle: '按册次 / 领域 / 考点 / 题型分组，针对薄弱环节重练到会为止' });
    var load = window.MX.Shell.loading('正在加载错题…');
    try { await window.MX.Tags.load(); } catch (e) { load.close(); root.innerHTML = '<div class="card"><h2>数据加载失败</h2></div>'; return; }
    all = S().getWrong();
    load.close();
    render();
  }

  /* ---------- 分组键 ---------- */
  function groupKey(w) {
    switch (filter.group) {
      case 'domain': return w.domainName || '未分类';
      case 'point': return w.pointName || '未分类';
      case 'type': return window.MX.Render.typeName(w.type);
      case 'book':
      default: return w.bookName || '未分类';
    }
  }

  function filtered() {
    return all.filter(function (w) {
      if (filter.status === 'active' && w.mastered) return false;
      if (filter.status === 'mastered' && !w.mastered) return false;
      if (filter.kw) {
        var hay = (w.stem || '') + (w.pointName || '') + (w.bookName || '') + (w.knowledgeName || '');
        if (hay.toLowerCase().indexOf(filter.kw.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }

  function render() {
    var list = filtered();
    var groups = {};
    list.forEach(function (w) { var k = groupKey(w); (groups[k] = groups[k] || []).push(w); });
    var groupNames = Object.keys(groups).sort();

    root.innerHTML =
      '<section class="section">' +
      '<div class="grid grid-4">' +
      statCard('错题总数', all.length, '题', '累计收录') +
      statCard('待攻克', all.filter(function (w) { return !w.mastered; }).length, '题', '尚未掌握') +
      statCard('已掌握', all.filter(function (w) { return w.mastered; }).length, '题', '已标记掌握') +
      statCard('涉及考点', Object.keys(all.reduce(function (m, w) { m[w.point || w.qid] = 1; return m; }, {})).length, '个', '知识点覆盖面') +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="card">' +
      '<div class="card-head">' +
      '<h3 class="card-title">📕 我的错题</h3>' +
      '<div class="btn-group">' +
      '<button class="btn btn-primary btn-sm" id="btn-practice-all">全部重练</button>' +
      '<button class="btn btn-ghost btn-sm" id="btn-practice-wrong-only">错题重练（全部错题）</button>' +
      '<button class="btn btn-ghost btn-sm" id="btn-build-paper">按错题组卷</button>' +
      '<button class="btn btn-danger btn-sm" id="btn-clear">清空错题本</button>' +
      '</div></div>' +

      '<div class="flex gap-2 wrap mb-3">' +
      '<div class="btn-seg" id="seg-group">' +
      '<button data-g="book" class="on">按册次</button><button data-g="domain">按领域</button>' +
      '<button data-g="point">按考点</button><button data-g="type">按题型</button>' +
      '</div>' +
      '<div class="btn-seg" id="seg-status">' +
      '<button data-s="active" class="on">待攻克</button><button data-s="mastered">已掌握</button><button data-s="all">全部</button>' +
      '</div>' +
      '<input type="text" class="input" id="kw" placeholder="搜索题干 / 考点" style="flex:1 1 180px">' +
      '</div>' +

      '<div id="list-box"></div>' +
      '</div>' +
      '</section>';

    renderList(groups, groupNames);
    bind();
  }

  function statCard(label, value, unit, foot) {
    return '<div class="stat-card"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '<small>' + unit + '</small></div>' +
      '<div class="stat-foot">' + foot + '</div></div>';
  }

  function renderList(groups, groupNames) {
    var box = $('#list-box');
    if (!groupNames.length) {
      box.innerHTML = window.MX.Shell.emptyState('没有符合条件的错题', '保持这个状态，说明你已经掌握得很好了！',
        '<a class="btn btn-primary mt-2" href="paper-builder.html">去组卷练习</a>');
      return;
    }
    box.innerHTML = groupNames.map(function (g) {
      var items = groups[g];
      return '<div class="acc open" data-group="' + esc(g) + '">' +
        '<div class="acc-head"><span>' + esc(g) + ' <span class="badge">' + items.length + '</span></span>' +
        '<span class="acc-arrow">▾</span></div>' +
        '<div class="acc-body">' +
        items.map(function (w) { return itemHtml(w); }).join('') +
        '</div></div>';
    }).join('');
  }

  function itemHtml(w) {
    var typeBadge = '<span class="badge badge-type">' + window.MX.Render.typeName(w.type) + '</span>';
    var statusBadge = w.mastered ? '<span class="badge" style="background:var(--green-100);color:var(--green-700);border-color:#bbf7d0">已掌握</span>'
      : '<span class="badge badge-diff-3">待攻克 ×' + (w.times || 1) + '</span>';
    return '<div class="wrong-item' + (w.mastered ? ' mastered' : '') + '" data-qid="' + esc(w.qid) + '">' +
      '<div class="wrong-head">' + typeBadge + statusBadge +
      '<span class="tag">' + esc(w.pointName || '') + '</span>' +
      '<span class="muted small">' + esc(w.bookName || '') + ' · ' + window.MX.Shell.fmtDate(w.lastWrongTs || w.ts) + '</span>' +
      '</div>' +
      '<div class="wrong-stem">' + window.MX.Math.toHtml(w.stem || '（题干缺失）') + '</div>' +
      '<div class="wrong-meta">' +
      '<span>我的答案：<b style="color:var(--red-600)">' + esc(window.MX.Render.answerSummary({ type: w.type }, w.myAnswer)) + '</b></span>' +
      '<span>正确答案：<b style="color:var(--green-700)">' + esc(w.correctAnswer || '—') + '</b></span>' +
      '</div>' +
      '<div class="wrong-acts">' +
      '<button class="btn btn-primary btn-sm" data-act="practice" data-qid="' + esc(w.qid) + '">重练此题</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="master" data-qid="' + esc(w.qid) + '">' + (w.mastered ? '取消掌握' : '标记已掌握') + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="detail" data-qid="' + esc(w.qid) + '">查看解析</button>' +
      '<button class="btn btn-danger btn-sm" data-act="remove" data-qid="' + esc(w.qid) + '">移除</button>' +
      '</div>' +
      '<div class="practice-box" hidden></div>' +
      '</div>';
  }

  /* ---------- 事件 ---------- */
  function bind() {
    $('#seg-group').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-g]'); if (!b) return;
      filter.group = b.getAttribute('data-g');
      Array.prototype.slice.call(this.querySelectorAll('button')).forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    $('#seg-status').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-s]'); if (!b) return;
      filter.status = b.getAttribute('data-s');
      Array.prototype.slice.call(this.querySelectorAll('button')).forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    var kwEl = $('#kw');
    var t = null;
    kwEl.addEventListener('input', function () {
      clearTimeout(t);
      var v = this.value;
      t = setTimeout(function () { filter.kw = v; render(); }, 240);
    });
    kwEl.value = filter.kw;

    $('#btn-clear').addEventListener('click', function () {
      window.MX.Toast.confirm({ title: '清空错题本', text: '将删除全部错题记录，此操作不可恢复。确定继续？', danger: true, okText: '确定清空' })
        .then(function (yes) {
          if (!yes) return;
          S().clearWrong(); all = []; render(); window.MX.Toast.ok('错题本已清空');
        });
    });
    $('#btn-practice-all').addEventListener('click', function () {
      var list = filtered();
      if (!list.length) return window.MX.Toast.warn('当前没有可重练的错题');
      startPractice(list.map(function (w) { return w.qid; }));
    });
    $('#btn-practice-wrong-only').addEventListener('click', function () {
      var list = all.filter(function (w) { return !w.mastered; });
      if (!list.length) return window.MX.Toast.warn('没有待攻克的错题');
      startPractice(list.map(function (w) { return w.qid; }));
    });
    $('#btn-build-paper').addEventListener('click', async function () {
      var list = filtered();
      if (!list.length) return window.MX.Toast.warn('当前没有可用错题');
      var load = window.MX.Shell.loading('正在按错题组卷…');
      try {
        var qs = await window.MX.Bank.getMany(list.map(function (w) { return w.qid; }));
        var books = {};
        qs.forEach(function (q) { books[q.book] = 1; });
        var res = await window.MX.Builder.build({
          mode: 'multi',
          books: Object.keys(books),
          points: qs.map(function (q) { return q.point; }).filter(function (v, i, a) { return a.indexOf(v) === i; }),
          count: Math.min(20, qs.length),
          totalScore: 100,
          difficultyMin: 1, difficultyMax: 3,
          shuffle: true,
          title: '错题重练卷'
        });
        load.close();
        if (!res.ok) return window.MX.Toast.warn(res.message);
        S().savePaper({ id: res.paper.id, title: res.paper.title, createdAt: Date.now(), count: res.paper.count, totalScore: res.paper.totalScore, config: res.paper.config, paper: res.paper });
        S().write('math_exam_current_paper', { paper: res.paper, createdAt: Date.now() });
        window.MX.Toast.ok('已生成错题重练卷，正在进入考试…');
        setTimeout(function () { location.href = 'exam.html?examId=' + encodeURIComponent(res.paper.examId); }, 700);
      } catch (e) {
        load.close(); window.MX.Toast.error('组卷失败：' + e.message);
      }
    });

    $('#list-box').addEventListener('click', function (e) {
      var acc = e.target.closest('.acc-head');
      if (acc) { acc.parentElement.classList.toggle('open'); return; }
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var qid = btn.getAttribute('data-qid');
      var act = btn.getAttribute('data-act');
      if (act === 'remove') {
        S().removeWrong(qid);
        all = S().getWrong();
        render(); window.MX.Toast.ok('已从错题本移除');
      } else if (act === 'master') {
        var w = all.filter(function (x) { return x.qid === qid; })[0];
        S().setWrongMastered(qid, !(w && w.mastered));
        all = S().getWrong(); render();
        window.MX.Toast.ok('状态已更新');
      } else if (act === 'detail') {
        showDetail(btn.closest('.wrong-item'), qid);
      } else if (act === 'practice') {
        var box = btn.closest('.wrong-item').querySelector('.practice-box');
        if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
        openPractice(box, qid, btn);
      }
    });
  }

  /* ---------- 单题重练 ---------- */
  async function openPractice(box, qid, btn) {
    var q = window.MX.Bank.get(qid);
    if (!q) {
      try { var list = await window.MX.Bank.getMany([qid]); q = list[0]; } catch (e) { q = null; }
    }
    if (!q) return window.MX.Toast.warn('题目数据已不可用（题库可能已更新）');
    box.hidden = false;
    box.innerHTML = '<div class="mt-2" id="practice-slot"></div>' +
      '<div class="btn-group mt-2"><button class="btn btn-primary btn-sm" id="p-submit">提交作答</button>' +
      '<button class="btn btn-ghost btn-sm" id="p-close">收起</button></div>';
    var view = window.MX.Render.createQuestionView(q, { index: 1 });
    box.querySelector('#practice-slot').appendChild(view.el);
    if (btn) btn.textContent = '收起重练';

    box.querySelector('#p-close').addEventListener('click', function () {
      box.hidden = true; box.innerHTML = '';
      if (btn) btn.textContent = '重练此题';
    });
    box.querySelector('#p-submit').addEventListener('click', function () {
      var a = view.getAnswer();
      var res = window.MX.Grader.gradeQuestion(q, a);
      view.lock();
      view.mark(res);
      if (res.manual) {
        window.MX.Toast.warn('该题需人工评阅（评分要点已展开）');
        view.reveal(true);
        return;
      }
      view.reveal(true);
      if (res.correct) {
        window.MX.Toast.ok('答对啦！已自动标记为「已掌握」');
        S().setWrongMastered(qid, true);
        all = S().getWrong();
      } else {
        window.MX.Toast.error('仍然不正确，已保留在错题本中');
        S().pushWrong(Object.assign({}, all.filter(function (x) { return x.qid === qid; })[0] || {}, {
          qid: qid, book: q.book, bookName: q.bookName, domain: q.domain, domainName: q.domainName,
          point: q.point, pointName: q.pointName, knowledgeName: q.knowledgeName, type: q.type,
          stem: q.stem, myAnswer: a, correctAnswer: window.MX.Plugins.answerTextOf(q), ts: Date.now()
        }));
        all = S().getWrong();
      }
    });
    view.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 查看解析 ---------- */
  async function showDetail(item, qid) {
    var slot = item.querySelector('.detail-box');
    if (slot) { slot.remove(); return; }
    var q = window.MX.Bank.get(qid);
    if (!q) { var l = await window.MX.Bank.getMany([qid]); q = l[0]; }
    var w = all.filter(function (x) { return x.qid === qid; })[0] || {};
    var d = document.createElement('div');
    d.className = 'detail-box mt-2';
    d.innerHTML = '<div class="q-analysis"><div class="analysis-title">答案与解析</div>' +
      '<div class="analysis-answer"><span class="label">正确答案：</span><span class="value">' + esc(w.correctAnswer || (q ? window.MX.Plugins.answerTextOf(q) : '—')) + '</span></div>' +
      '<div class="analysis-body">' + (q ? window.MX.Math.toHtml(q.analysis || '（暂无解析）') : '题目已不可用') + '</div></div>';
    item.appendChild(d);
  }

  /* ---------- 连续重练模式 ---------- */
  async function startPractice(qids) {
    var load = window.MX.Shell.loading('正在加载重练题目…');
    var qs = [];
    try { qs = await window.MX.Bank.getMany(qids); } catch (e) { }
    load.close();
    if (!qs.length) return window.MX.Toast.warn('题目数据不可用');

    practiceViews.forEach(function (v) { v.destroy && v.destroy(); });
    practiceViews = [];

    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = '<div class="modal" style="width:min(920px,calc(100vw - 24px));max-height:92vh;overflow:auto">' +
      '<div class="card-head"><h3 class="modal-title" style="margin:0">🔁 错题重练（' + qs.length + ' 题）</h3>' +
      '<button class="btn-icon" data-act="close">×</button></div>' +
      '<p class="muted small">逐题作答并提交，答对后会自动标记为「已掌握」。</p>' +
      '<div id="prac-list"></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" data-act="close">完成重练</button></div></div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('in'); });

    var list = mask.querySelector('#prac-list');
    qs.forEach(function (q, i) {
      var wrap = document.createElement('div');
      wrap.className = 'mb-3';
      var view = window.MX.Render.createQuestionView(q, { index: i + 1 });
      practiceViews.push(view);
      wrap.appendChild(view.el);
      var bar = document.createElement('div');
      bar.className = 'btn-group';
      bar.innerHTML = '<button class="btn btn-primary btn-sm">提交作答</button>';
      bar.querySelector('button').addEventListener('click', function () {
        var res = window.MX.Grader.gradeQuestion(q, view.getAnswer());
        view.lock(); view.mark(res); view.reveal(true);
        if (res.manual) { window.MX.Toast.warn('该题为人工阅卷'); return; }
        if (res.correct) {
          S().setWrongMastered(q.id, true);
          window.MX.Toast.ok('第 ' + (i + 1) + ' 题答对，已标记掌握');
        } else {
          S().pushWrong(Object.assign({}, all.filter(function (x) { return x.qid === q.id; })[0] || {}, {
            qid: q.id, book: q.book, bookName: q.bookName, domain: q.domain, domainName: q.domainName,
            point: q.point, pointName: q.pointName, knowledgeName: q.knowledgeName, type: q.type,
            stem: q.stem, myAnswer: view.getAnswer(), correctAnswer: window.MX.Plugins.answerTextOf(q), ts: Date.now()
          }));
          window.MX.Toast.error('第 ' + (i + 1) + ' 题答错，请结合解析再理解一次');
        }
        all = S().getWrong();
      });
      wrap.appendChild(bar);
      list.appendChild(wrap);
    });

    mask.addEventListener('click', function (e) {
      if (e.target === mask || (e.target.getAttribute && e.target.getAttribute('data-act') === 'close')) {
        mask.classList.remove('in');
        setTimeout(function () { mask.remove(); render(); }, 220);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
