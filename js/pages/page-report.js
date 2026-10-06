/* ============================================================
 * page-report.js —— 成绩报告
 * 总分 / 雷达图 / 柱状图 / 错题 / 趋势
 * ============================================================ */
(function () {
  'use strict';

  var S = function () { return window.MX.Storage; };
  var root, record = null, questions = [], views = [];

  function esc(s) { return window.MX.Math.escapeHtml(s); }
  function $(s, c) { return (c || document).querySelector(s); }

  async function boot() {
    root = document.getElementById('page-root');
    window.MX.Shell.mount({ page: 'report', title: '成绩报告', subtitle: '总分 · 知识点掌握雷达 · 题型得分 · 错题讲评 · 成绩趋势' });

    var load = window.MX.Shell.loading('正在生成报告…');
    try { await window.MX.Tags.load(); } catch (e) { load.close(); root.innerHTML = '<div class="card"><h2>数据加载失败</h2><p class="muted">' + esc(e.message) + '</p></div>'; return; }

    var qs = new URLSearchParams(location.search);
    var examId = qs.get('examId'), recordId = qs.get('recordId');
    var records = S().getRecords();
    if (recordId) record = records.filter(function (r) { return r.id === recordId; })[0] || null;
    if (!record && examId) record = records.filter(function (r) { return r.examId === examId; })[0] || null;
    if (!record) record = records[0] || null;

    if (!record) {
      load.close();
      root.innerHTML = '<div class="card">' + window.MX.Shell.emptyState('还没有成绩记录', '完成一次考试后即可查看详细的成绩报告。',
        '<a class="btn btn-primary mt-2" href="paper-builder.html">去组卷</a>') + '</div>';
      return;
    }

    try { questions = await window.MX.Bank.getMany(record.results.map(function (r) { return r.qid; })); }
    catch (e) { questions = []; }
    load.close();
    render();
  }

  function rate(rec) { return rec.totalScore ? rec.earnedScore / rec.totalScore : 0; }

  function render() {
    var r = record;
    var pct = Math.round(rate(r) * 1000) / 10;
    var grade = pct >= 90 ? '优秀' : pct >= 80 ? '良好' : pct >= 60 ? '及格' : '需加油';
    var gradeColor = pct >= 90 ? 'var(--green-600)' : pct >= 80 ? 'var(--blue-600)' : pct >= 60 ? 'var(--amber-600)' : 'var(--red-600)';

    root.innerHTML =
      '<section class="section">' +
      '<div class="card">' +
      '<div class="flex-between wrap gap-3">' +
      '<div style="min-width:0">' +
      '<h2 style="margin-bottom:4px">' + esc(r.title || '试卷') + '</h2>' +
      '<div class="paper-meta">' +
      '<span>考试时间：<b>' + window.MX.Shell.fmtDateTime(r.ts) + '</b></span>' +
      '<span>用时：<b>' + window.MX.Shell.fmtDuration(r.duration) + '</b></span>' +
      '<span>题量：<b>' + r.questionCount + '</b></span>' +
      (S().getSettings().nickname ? '<span>考生：<b>' + esc(S().getSettings().nickname) + '</b></span>' : '') +
      '</div></div>' +
      '<div class="flex gap-2" style="align-items:center">' +
      '<div class="ring" id="ring-score"></div>' +
      '<div class="right"><div class="muted small">等级</div>' +
      '<div style="font-size:1.5em;font-weight:800;color:' + gradeColor + '">' + grade + '</div></div>' +
      '</div>' +
      '</div>' +
      '<hr class="sep">' +
      '<div class="grid grid-4">' +
      stat('得分', r.earnedScore + ' / ' + r.totalScore, '分', '满分 ' + r.totalScore) +
      stat('正确率', r.accuracy, '%', '共 ' + (r.questionCount - (r.manualCount || 0)) + ' 道客观题') +
      stat('答对题数', r.rightCount, '题', '答错 ' + r.wrongCount + ' 题') +
      stat('待人工评阅', r.manualCount || 0, '题', '作图题等主观题') +
      '</div>' +
      '<div class="btn-group mt-3 no-print">' +
      '<button class="btn btn-ghost btn-sm" id="btn-print">打印报告</button>' +
      '<button class="btn btn-ghost btn-sm" id="btn-again">再考一次</button>' +
      '<a class="btn btn-ghost btn-sm" href="wrongbook.html">去错题本</a>' +
      '<a class="btn btn-ghost btn-sm" href="report.html">查看其它报告</a>' +
      '</div>' +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="grid grid-2">' +
      '<div class="card"><div class="card-head"><h3 class="card-title">🕸️ 知识领域掌握雷达</h3>' +
      '<span class="muted small">按得分率 %</span></div>' +
      '<div class="chart chart-tall" id="chart-radar"></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="card-title">📊 各题型得分率</h3>' +
      '<span class="muted small">按题型统计</span></div>' +
      '<div class="chart chart-tall" id="chart-type"></div></div>' +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="grid grid-2">' +
      '<div class="card"><div class="card-head"><h3 class="card-title">⏳ 成绩趋势</h3>' +
      '<span class="muted small">最近 12 次</span></div>' +
      '<div class="chart" id="chart-trend"></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="card-title">🧭 薄弱知识点 TOP 5</h3></div>' +
      '<div id="weak-list"></div></div>' +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">📝 逐题讲评</h2>' +
      '<div class="btn-seg no-print" id="filter-seg">' +
      '<button data-f="all" class="on">全部</button><button data-f="wrong">只看错题</button><button data-f="right">只看对题</button>' +
      '</div></div>' +
      '<div id="review-list"></div>' +
      '</section>';

    drawScoreRing(pct);
    drawRadar();
    drawTypeChart();
    drawTrend();
    drawWeak();
    renderReview();

    $('#btn-print').addEventListener('click', function () { window.print(); });
    $('#btn-again').addEventListener('click', function () {
      var p = (S().getPapers().filter(function (x) { return x.id === r.examId; })[0] || {}).paper;
      if (p) { S().write('math_exam_current_paper', { paper: p, createdAt: Date.now() }); location.href = 'exam.html?examId=' + encodeURIComponent(p.examId); }
      else location.href = 'paper-builder.html';
    });
    $('#filter-seg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      Array.prototype.slice.call(document.querySelectorAll('#filter-seg button')).forEach(function (x) { x.classList.toggle('on', x === b); });
      applyFilter(b.getAttribute('data-f'));
    });
  }

  function stat(label, value, unit, foot) {
    return '<div class="stat-card flat"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '<small>' + unit + '</small></div>' +
      '<div class="stat-foot">' + foot + '</div></div>';
  }

  /* ---------- 得分圆环 ---------- */
  function drawScoreRing(pct) {
    var box = $('#ring-score');
    var R = 56, C2 = 2 * Math.PI * R;
    var off = C2 * (1 - Math.min(1, pct / 100));
    box.innerHTML =
      '<svg width="132" height="132" viewBox="0 0 132 132">' +
      '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient></defs>' +
      '<circle class="ring-bg" cx="66" cy="66" r="' + R + '"/>' +
      '<circle class="ring-fg" cx="66" cy="66" r="' + R + '" stroke-dasharray="' + C2.toFixed(1) + '" stroke-dashoffset="' + C2.toFixed(1) + '"/>' +
      '</svg>' +
      '<div class="ring-text"><div><b>' + pct + '</b><span>得分率 %</span></div></div>';
    requestAnimationFrame(function () {
      var fg = box.querySelector('.ring-fg');
      if (fg) fg.style.strokeDashoffset = off.toFixed(1);
    });
  }

  /* ---------- 分组统计 ---------- */
  function groupStats(keyFn) {
    var map = {};
    record.results.forEach(function (res, i) {
      var q = questions[i];
      if (!q) return;
      if (res.manual) return;
      var k = keyFn(q);
      if (k === undefined || k === null) return;
      if (!map[k]) map[k] = { earn: 0, max: 0, right: 0, n: 0 };
      map[k].earn += res.earned; map[k].max += res.max;
      map[k].n++; if (res.correct) map[k].right++;
    });
    return map;
  }

  function drawRadar() {
    var map = groupStats(function (q) { return q.domainName || '其他'; });
    var names = Object.keys(map);
    if (!names.length) { $('#chart-radar').innerHTML = '<p class="muted center" style="padding:40px 0">暂无客观题数据</p>'; return; }
    var indicators = names.map(function (n) { return { name: n, max: 100 }; });
    var data = names.map(function (n) { return map[n].max ? Math.round(map[n].earn / map[n].max * 1000) / 10 : 0; });
    window.MX.Charts.radar($('#chart-radar'), indicators, [{ name: '得分率(%)', value: data, areaStyle: { color: 'rgba(59,130,246,.28)' }, lineStyle: { color: '#2563eb' }, itemStyle: { color: '#2563eb' } }]);
  }

  function drawTypeChart() {
    var map = groupStats(function (q) { return window.MX.Render.typeName(q.type); });
    var names = Object.keys(map);
    if (!names.length) { $('#chart-type').innerHTML = '<p class="muted center" style="padding:40px 0">暂无客观题数据</p>'; return; }
    var vals = names.map(function (n) { return map[n].max ? Math.round(map[n].earn / map[n].max * 1000) / 10 : 0; });
    window.MX.Charts.bar($('#chart-type'), names, vals, { yName: '%', rotate: names.length > 5 ? 20 : 0, padBottom: 60 });
  }

  function drawTrend() {
    var h = S().getHistory().slice(-12);
    if (h.length < 2) { $('#chart-trend').innerHTML = '<p class="muted center" style="padding:40px 0">完成 2 次以上考试后即可查看趋势</p>'; return; }
    window.MX.Charts.line($('#chart-trend'),
      h.map(function (x) { return window.MX.Shell.fmtDate(x.ts).slice(5); }),
      [{ name: '得分率(%)', data: h.map(function (x) { return Math.round((x.totalScore ? x.earnedScore / x.totalScore : 0) * 1000) / 10; }) }],
      { yName: '%' });
  }

  /* ---------- 薄弱知识点 ---------- */
  function drawWeak() {
    var map = {};
    record.results.forEach(function (res, i) {
      var q = questions[i];
      if (!q || res.manual) return;
      var k = q.pointName || q.point;
      if (!map[k]) map[k] = { n: 0, wrong: 0, point: q.point, bookName: q.bookName };
      map[k].n++;
      if (!res.correct) map[k].wrong++;
    });
    var list = Object.keys(map).map(function (k) { return Object.assign({ name: k }, map[k]); })
      .filter(function (x) { return x.wrong > 0; })
      .sort(function (a, b) { return b.wrong - a.wrong || b.wrong / b.n - a.wrong / a.n; })
      .slice(0, 5);

    var box = $('#weak-list');
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="padding:30px 10px"><div class="empty-ico">🎉</div><p class="muted">客观题全部答对，非常棒！</p></div>';
      return;
    }
    box.innerHTML = list.map(function (x, i) {
      var pct = Math.round((1 - x.wrong / x.n) * 100);
      return '<div class="mb-2">' +
        '<div class="flex-between"><span><b>' + (i + 1) + '.</b> ' + esc(x.name) + '</span>' +
        '<span class="muted small">' + x.bookName + ' · 错 ' + x.wrong + '/' + x.n + '</span></div>' +
        '<div class="bar ' + (pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red') + ' mt-1"><i style="width:' + pct + '%"></i></div>' +
        '<div class="right mt-1"><a class="small" href="paper-builder.html?point=' + encodeURIComponent(x.point) + '">针对该考点组卷 →</a></div>' +
        '</div>';
    }).join('');
  }

  /* ---------- 逐题讲评 ---------- */
  function renderReview() {
    var box = $('#review-list');
    box.innerHTML = '';
    views = [];
    var i = 0;
    record.results.forEach(function (res, idx) {
      var q = questions[idx];
      if (!q) return;
      i++;
      var v = window.MX.Render.createQuestionView(q, { index: i, readonly: true });
      v.setAnswer(record.answers[q.id]);
      v.mark(res);
      v.reveal(true);
      v.el.dataset.verdict = res.manual ? 'manual' : (res.correct ? 'right' : 'wrong');
      box.appendChild(v.el);
      views.push(v);
    });
    if (!views.length) box.innerHTML = '<div class="card">' + window.MX.Shell.emptyState('无法加载题目详情', '题目数据可能已被清理。') + '</div>';
  }

  function applyFilter(f) {
    views.forEach(function (v) {
      var verdict = v.el.dataset.verdict;
      v.el.style.display = (f === 'all' || verdict === f) ? '' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
