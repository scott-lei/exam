/* ============================================================
 * page-index.js —— 首页：导航 / 快捷入口 / 最近记录 / 学习统计
 * ============================================================ */
(function () {
  'use strict';
  var S = function () { return window.MX.Storage; };
  var root;

  function html(strings) { return strings; }

  function statCards(records, history, wrongs) {
    var totalExams = records.length;
    var avg = 0, avgAcc = 0, totalQ = 0;
    if (totalExams) {
      var sumScore = 0, sumAcc = 0;
      records.forEach(function (r) { sumScore += r.earnedScore || 0; sumAcc += r.accuracy || 0; totalQ += r.questionCount || 0; });
      avg = (sumScore / totalExams).toFixed(1);
      avgAcc = (sumAcc / totalExams).toFixed(1);
    }
    var pending = S().listProgress().length;
    var activeWrong = wrongs.filter(function (w) { return !w.mastered; }).length;

    return [
      { ico: '📝', label: '累计考试', value: totalExams, unit: '次', foot: '最近一次：' + (records[0] ? window.MX.Shell.fmtDate(records[0].ts) : '—') },
      { ico: '🎯', label: '平均得分率', value: totalExams ? (records.reduce(function (s, r) { return s + (r.totalScore ? r.earnedScore / r.totalScore : 0); }, 0) / totalExams * 100).toFixed(1) : '—', unit: totalExams ? '%' : '', foot: '平均正确率 ' + avgAcc + '%' },
      { ico: '✅', label: '累计做题', value: totalQ, unit: '题', foot: '平均每次 ' + (totalExams ? Math.round(totalQ / totalExams) : 0) + ' 题' },
      { ico: '📕', label: '待攻克错题', value: activeWrong, unit: '题', foot: pending ? '另有 ' + pending + ' 份未完成的试卷' : '错题本共 ' + wrongs.length + ' 题' }
    ];
  }

  function quickEntries() {
    var items = [
      { href: 'paper-builder.html', ico: '🧩', title: '组卷中心', desc: '按考点 / 题型 / 难度智能组卷', tint: 'blue' },
      { href: 'paper-builder.html?quick=1', ico: '⚡', title: '快速组卷', desc: '一册一整卷，3 秒生成', tint: 'green' },
      { href: 'exam.html', ico: '✏️', title: '继续考试', desc: '断点续考，随时接着答', tint: 'amber' },
      { href: 'report.html', ico: '📊', title: '成绩报告', desc: '雷达图 · 柱状图 · 错题分析', tint: 'purple' },
      { href: 'wrongbook.html', ico: '📕', title: '错题本', desc: '分组重练，专项突破', tint: 'pink' }
    ];
    return items.map(function (it) {
      return '<a class="card hoverable" href="' + it.href + '" style="text-decoration:none">' +
        '<div class="flex gap-2" style="align-items:center">' +
        '<span style="font-size:1.9em">' + it.ico + '</span>' +
        '<div style="min-width:0"><div style="font-weight:800;color:var(--ink);font-size:1.04em">' + it.title + '</div>' +
        '<div class="muted small">' + it.desc + '</div></div></div></a>';
    }).join('');
  }

  function recentRecords(records) {
    if (!records.length) {
      return window.MX.Shell.emptyState('还没有考试记录', '去组卷中心生成一份试卷，开始你的第一次在线考试吧。',
        '<a class="btn btn-primary mt-2" href="paper-builder.html">立即组卷</a>');
    }
    var list = records.slice(0, 6);
    return '<div class="timeline">' + list.map(function (r) {
      var rate = r.totalScore ? (r.earnedScore / r.totalScore) : 0;
      var cls = rate >= 0.85 ? 'ok' : (rate >= 0.6 ? '' : 'warn');
      return '<div class="tl-item ' + cls + '">' +
        '<div class="flex-between wrap">' +
        '<div style="min-width:0">' +
        '<a href="report.html?examId=' + encodeURIComponent(r.examId || r.id) + '" style="font-weight:800">' +
        window.MX.Math.escapeHtml(r.title || '试卷') + '</a>' +
        '<div class="tl-time">' + window.MX.Shell.fmtDateTime(r.ts) +
        ' · ' + (r.questionCount || 0) + ' 题 · 用时 ' + window.MX.Shell.fmtDuration(r.duration) + '</div>' +
        '</div>' +
        '<div class="right nowrap">' +
        '<div style="font-weight:800;font-size:1.14em;color:var(--blue-700)">' + (r.earnedScore || 0) + ' / ' + (r.totalScore || 0) + '</div>' +
        '<div class="muted small">正确率 ' + (r.accuracy || 0) + '%</div>' +
        '</div></div></div>';
    }).join('') + '</div>';
  }

  function booksGrid(books) {
    return '<div class="grid grid-auto">' + books.map(function (b) {
      return '<a class="card pad-sm hoverable" href="paper-builder.html?book=' + b.id + '" style="text-decoration:none">' +
        '<div class="flex-between">' +
        '<div><div style="font-weight:800;color:var(--ink)">' + b.name + '</div>' +
        '<div class="muted small">' + b.knowledgeCount + ' 个知识点</div></div>' +
        '<span class="badge">' + b.pointCount + ' 考点</span>' +
        '</div></a>';
    }).join('') + '</div>';
  }

  async function boot() {
    root = document.getElementById('page-root');
    window.MX.Shell.mount({ page: 'index' });

    var load = window.MX.Shell.loading('正在加载知识体系…');
    try {
      await window.MX.Tags.load();
    } catch (e) {
      load.close();
      root.innerHTML = '<div class="card"><h2>数据加载失败</h2><p class="muted">' + window.MX.Math.escapeHtml(e.message) + '</p></div>';
      return;
    }
    load.close();

    var stats = window.MX.Tags.stats();
    var records = S().getRecords();
    var history = S().getHistory();
    var wrongs = S().getWrong();

    root.innerHTML =
      '<section class="hero">' +
      '<h1>小学数学在线考试平台</h1>' +
      '<p>覆盖 1–6 年级 12 册教材，' + stats.points + ' 个微知识点、' + stats.knowledge + ' 个二级知识点，支持 8 大题型自动阅卷。' +
      '纯前端运行，数据保存在你的浏览器里，双击即可使用。</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-light btn-lg" href="paper-builder.html">开始组卷</a>' +
      '<a class="btn btn-ghost btn-lg" href="exam.html">继续考试</a>' +
      '<a class="btn btn-ghost btn-lg" href="wrongbook.html">查看错题本</a>' +
      '</div>' +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><b>' + stats.books + '</b><span>册教材</span></div>' +
      '<div class="hero-stat"><b>' + stats.points + '</b><span>三级考点</span></div>' +
      '<div class="hero-stat"><b>' + (window.MX.Tags.questionTypes.length) + '</b><span>题型支持</span></div>' +
      '<div class="hero-stat"><b>' + records.length + '</b><span>历史考试</span></div>' +
      '</div>' +
      '</section>' +

      '<section class="section mt-3">' +
      '<div class="section-head"><h2 class="section-title">快捷入口</h2></div>' +
      '<div class="grid grid-4">' + quickEntries() + '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">学习统计</h2>' +
      '<span class="muted small">数据来源：本机浏览器 localStorage</span></div>' +
      '<div class="grid grid-4" id="stat-grid">' +
      statCards(records, history, wrongs).map(function (s, i) {
        return '<div class="stat-card' + (i === 0 ? ' accent' : '') + '">' +
          '<span class="stat-ico">' + s.ico + '</span>' +
          '<div class="stat-label">' + s.label + '</div>' +
          '<div class="stat-value">' + s.value + '<small>' + s.unit + '</small></div>' +
          '<div class="stat-foot">' + s.foot + '</div></div>';
      }).join('') +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="grid grid-2">' +
      '<div class="card"><div class="card-head"><h3 class="card-title">📈 成绩趋势</h3>' +
      '<span class="muted small">最近 10 次</span></div>' +
      '<div class="chart" id="chart-trend"></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="card-title">🍩 考点领域分布</h3>' +
      '<span class="muted small">全 12 册</span></div>' +
      '<div class="chart" id="chart-domain"></div></div>' +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="card">' +
      '<div class="card-head"><h3 class="card-title">🕘 最近考试记录</h3>' +
      '<a class="btn btn-ghost btn-sm" href="report.html">查看全部报告</a></div>' +
      recentRecords(records) +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">教材册次</h2>' +
      '<span class="muted small">点击进入对应册次的组卷</span></div>' +
      booksGrid(window.MX.Tags.books) +
      '</section>';

    /* ---- 成绩趋势图 ---- */
    var trendBox = document.getElementById('chart-trend');
    var last = history.slice(-10);
    if (last.length) {
      window.MX.Charts.line(trendBox,
        last.map(function (h) { return window.MX.Shell.fmtDate(h.ts).slice(5); }),
        [{ name: '得分率(%)', data: last.map(function (h) { return Math.round((h.totalScore ? h.earnedScore / h.totalScore : 0) * 1000) / 10; }) }],
        { yName: '%' });
    } else {
      trendBox.innerHTML = '<div class="empty" style="padding:36px 10px"><div class="empty-ico">📉</div><p class="muted">完成一次考试后即可看到成绩趋势</p></div>';
    }

    /* ---- 领域分布环形图 ---- */
    var domainData = window.MX.Tags.domains.map(function (d) {
      return { name: d.name, value: stats.domainStat[d.id] ? stats.domainStat[d.id].count : 0 };
    });
    window.MX.Charts.donut(document.getElementById('chart-domain'), domainData, {
      label: true,
      colors: window.MX.Tags.domains.map(function (d) { return d.color; })
    });

    window.addEventListener('beforeunload', function () { window.MX.Charts.disposeAll(); });
  }

  document.addEventListener('DOMContentLoaded', boot);
  void html;
})();
