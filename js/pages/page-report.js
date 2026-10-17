/* ============================================================
 * page-report.js —— 成绩报告
 * 总分 / 雷达图 / 柱状图 / 错题 / 趋势
 * ============================================================ */
(function () {
  'use strict';

  var S = function () { return window.MX.Storage; };
  var root, record = null, questions = [], views = [];
  var viewOf = {};          // results 下标 → 题目视图（供评分后局部刷新）
  var scoreChartDirty = false; // 评分后雷达/薄弱数据已变但图表未重画

  function esc(s) { return window.MX.Math.escapeHtml(s); }
  function $(s, c) { return (c || document).querySelector(s); }

  function round2(n) { return Math.round(n * 100) / 100; }
  function fmtScore(n) {
    var v = Math.round(n * 100) / 100;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

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
      '<div style="font-size:1.5em;font-weight:800;color:' + gradeColor + '" id="score-grade">' + grade + '</div></div>' +
      '</div>' +
      '</div>' +
      '<hr class="sep">' +
      '<div class="grid grid-4">' +
      stat('得分', r.earnedScore + ' / ' + r.totalScore, '分', '满分 ' + r.totalScore, 'stat-earned') +
      stat('正确率', r.accuracy, '%', accFoot(), 'stat-accuracy') +
      stat('答对题数', r.rightCount, '题', '答错 ' + r.wrongCount + ' 题', 'stat-right') +
      stat('待人工评阅', r.manualCount || 0, '题', '作图题等主观题', 'stat-manual') +
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
      '<span class="muted small">按得分率 %</span>' +
      '<span class="stale-note" id="radar-stale" hidden>数据已更新，请刷新图表</span></div>' +
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
      var entry = S().getPapers().filter(function (x) { return x.id === r.examId; })[0];
      if (entry) {
        S().getPaper(r.examId).then(function (full) {
          if (full) {
            S().write('math_exam_current_paper', { paper: full, createdAt: Date.now() });
            location.href = 'exam.html?examId=' + encodeURIComponent(full.examId || full.id);
          } else location.href = 'paper-builder.html';
        });
      } else location.href = 'paper-builder.html';
    });
    $('#filter-seg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      Array.prototype.slice.call(document.querySelectorAll('#filter-seg button')).forEach(function (x) { x.classList.toggle('on', x === b); });
      applyFilter(b.getAttribute('data-f'));
    });
  }

  function stat(label, value, unit, foot, id) {
    return '<div class="stat-card flat"' + (id ? ' id="' + id + '"' : '') + '><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '<small>' + unit + '</small></div>' +
      '<div class="stat-foot">' + foot + '</div></div>';
  }

  /* 待评/已评人工题计数 */
  function countScored() {
    var done = 0, wait = 0;
    record.results.forEach(function (res) {
      if (!res.manual) return;
      if (res.scored) done++; else wait++;
    });
    return { done: done, wait: wait };
  }

  /* 正确率脚注：随评分进度动态变化 */
  function accFoot() {
    var auto = 0;
    record.results.forEach(function (res) { if (!res.manual) auto++; });
    var c = countScored();
    var parts = ['共 ' + auto + ' 道客观题'];
    if (c.done) parts.push('已评 ' + c.done + ' 题');
    if (c.wait) parts.push('待评 ' + c.wait + ' 题');
    return parts.join(' · ');
  }

  /* 局部刷新统计卡 */
  function setStat(id, value, foot) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = el.querySelector('.stat-value'), f = el.querySelector('.stat-foot');
    if (v) v.innerHTML = value;
    if (f) f.innerHTML = foot;
  }

  function updateStats() {
    var r = record;
    var pct = Math.round(rate(r) * 1000) / 10;
    var grade = pct >= 90 ? '优秀' : pct >= 80 ? '良好' : pct >= 60 ? '及格' : '需加油';
    var gradeColor = pct >= 90 ? 'var(--green-600)' : pct >= 80 ? 'var(--blue-600)' : pct >= 60 ? 'var(--amber-600)' : 'var(--red-600)';
    setStat('stat-earned', r.earnedScore + ' / ' + r.totalScore + '<small>分</small>', '满分 ' + r.totalScore);
    setStat('stat-accuracy', r.accuracy + '<small>%</small>', accFoot());
    var c = countScored();
    setStat('stat-manual', c.wait + '<small>题</small>', c.wait ? '作图题等主观题' : '全部主观题已评完');
    var g = document.getElementById('score-grade');
    if (g) { g.textContent = grade; g.style.color = gradeColor; }
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
      if (res.manual && !res.scored) return; // 未评人工题不计入得分率
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
    viewOf = {};
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
      if (res.manual) {
        v.el.appendChild(scoreBarEl(res, idx, i));
        var badge = v.el.querySelector('.q-result');
        if (badge && res.scored) {
          badge.classList.add('scored');
          badge.classList.remove('manual');
          badge.textContent = '已评分 ' + fmtScore(res.score) + ' 分';
        }
      }
      box.appendChild(v.el);
      views.push(v);
      viewOf[idx] = v;
    });
    if (!views.length) box.innerHTML = '<div class="card">' + window.MX.Shell.emptyState('无法加载题目详情', '题目数据可能已被清理。') + '</div>';
  }

  /* 人工题评分条（DOM，便于后续局部刷新） */
  function scoreBarEl(res, idx, qno) {
    var el = document.createElement('div');
    el.className = 'score-bar no-print';
    el.dataset.scoreIdx = String(idx);
    el.dataset.qno = String(qno || idx + 1);
    el.innerHTML = scoreBarHtml(res, idx);
    return el;
  }

  function scoreBarHtml(res, idx) {
    var resId = String(idx);
    if (res.scored) {
      return '<div class="score-bar-info">' +
        '<span class="badge badge-manual scored-badge">已评分 ' + fmtScore(res.score) + ' / ' + fmtScore(res.max) + ' 分</span>' +
        (res.note ? '<span class="score-bar-note" title="' + esc(res.note) + '">备注：' + esc(res.note) + '</span>' : '') +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" data-score="' + resId + '">修改评分</button>';
    }
    return '<div class="score-bar-info">' +
      '<span class="badge badge-manual">待评分</span>' +
      '<span class="muted small">本卷共 ' + fmtScore(res.max) + ' 分，需教师人工评阅</span>' +
      '</div>' +
      '<button class="btn btn-primary btn-sm" data-score="' + resId + '">评分</button>';
  }

  function applyFilter(f) {
    views.forEach(function (v) {
      var verdict = v.el.dataset.verdict;
      v.el.style.display = (f === 'all' || verdict === f) ? '' : 'none';
    });
  }

  /* ============================================================
   * 人工评分（作图题）
   * ============================================================ */
  var scoreListenerBound = false;

  function onScoreClick(e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-score]') : null;
    if (!b) return;
    var idx = parseInt(b.getAttribute('data-score'), 10);
    if (isNaN(idx)) return;
    var bar = b.closest ? b.closest('.score-bar') : null;
    var qno = bar && bar.dataset.qno ? parseInt(bar.dataset.qno, 10) : idx + 1;
    openScoreDrawer(idx, qno);
  }

  /* ---------- 评分抽屉 ---------- */
  function openScoreDrawer(idx, qno) {
    var res = record.results[idx], q = questions[idx];
    if (!res || !q || !res.manual) return;
    var ans = record.answers[q.id] || {};
    var max = res.max;
    var picked = res.scored ? res.score : null;
    var noteVal = res.note || '';

    var mask = document.createElement('div');
    mask.className = 'modal-mask no-print score-mask';

    var pickBtns = '';
    for (var h = 0; h <= max * 2; h++) {
      var val = h / 2;
      pickBtns += '<button type="button" class="score-pick-btn' + (picked === val ? ' on' : '') +
        '" data-v="' + val + '">' + fmtScore(val) + '</button>';
    }

    mask.innerHTML =
      '<div class="score-panel" role="dialog" aria-modal="true">' +
      '<div class="score-head">' +
      '<div><h3 class="modal-title">人工评分 · 第 ' + qno + ' 题</h3>' +
      '<div class="muted small">' + esc(window.MX.Render.typeName(q.type)) + ' · 满分 ' + fmtScore(max) + ' 分</div></div>' +
      '<button type="button" class="btn btn-ghost btn-sm score-close" aria-label="关闭">✕</button>' +
      '</div>' +
      '<div class="score-body">' +
      '<div class="score-grid">' +
      '<div class="score-col">' +
      '<div class="score-col-title">学生作图</div>' +
      (ans.dataUrl
        ? '<img class="score-img" src="' + ans.dataUrl + '" alt="学生作图">'
        : '<div class="score-img-empty">学生未留下作图（仅文字作答或未作答）</div>') +
      (ans.note && ans.note.trim()
        ? '<div class="score-student-note"><b>文字说明：</b><span>' + esc(ans.note) + '</span></div>'
        : '') +
      '</div>' +
      '<div class="score-col">' +
      '<div class="score-col-title">评分要点</div>' +
      '<div class="score-rubric">' + esc(q.answer && q.answer.rubric ? q.answer.rubric : '（本题未提供评分要点）') + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="score-pick">' +
      '<div class="score-col-title">选择分数（0 ~ ' + fmtScore(max) + '，步进 0.5）</div>' +
      '<div class="score-pick-btns">' + pickBtns + '</div>' +
      '<div class="field mt-2">' +
      '<label class="field-label" for="score-note-input">评分备注（可选）</label>' +
      '<textarea class="score-note-input" id="score-note-input" rows="2" placeholder="例如：构图正确，但未标注边长">' + esc(noteVal) + '</textarea>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="score-foot">' +
      '<span class="score-cur">当前选择：<b id="score-cur-val">' + (picked === null ? '未选择' : fmtScore(picked)) + '</b> / ' + fmtScore(max) + ' 分</span>' +
      '<span class="flex gap-2">' +
      '<button type="button" class="btn btn-ghost btn-sm score-cancel">取消</button>' +
      '<button type="button" class="btn btn-primary btn-sm score-submit"' + (picked === null ? ' disabled' : '') + '>提交评分</button>' +
      '</span>' +
      '</div>' +
      '</div>';

    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('in'); });

    var cur = picked;
    var curEl = $('.score-cur b', mask);
    var submitBtn = $('.score-submit', mask);

    $('.score-pick-btns', mask).addEventListener('click', function (e) {
      var b = e.target.closest('.score-pick-btn');
      if (!b) return;
      Array.prototype.slice.call(mask.querySelectorAll('.score-pick-btn')).forEach(function (x) { x.classList.toggle('on', x === b); });
      cur = parseFloat(b.getAttribute('data-v'));
      if (curEl) curEl.textContent = fmtScore(cur);
      if (submitBtn) submitBtn.disabled = false;
    });
    $('.score-note-input', mask).addEventListener('input', function () {
      noteVal = this.value;
    });

    function close() {
      mask.classList.remove('in');
      setTimeout(function () { if (mask.parentNode) mask.parentNode.removeChild(mask); }, 200);
    }
    $('.score-close', mask).addEventListener('click', close);
    $('.score-cancel', mask).addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    $('.score-submit', mask).addEventListener('click', function () {
      if (cur === null) return;
      applyScore(idx, cur, noteVal);
      close();
    });
  }

  /* ---------- 提交评分：改 res → 重算 → 持久化 → 局部刷新 ---------- */
  function applyScore(idx, score, note) {
    var res = record.results[idx];
    if (!res || !res.manual) return;
    res.scored = true;
    res.score = score;
    res.earned = score;
    res.note = note || '';
    res.manualTs = Date.now();
    res.correct = res.max > 0 && score >= res.max;
    res.ratio = res.max ? round2(score / res.max) : 0;
    recomputeRecord();
    persist();
    refreshAfterScore(idx);
  }

  /* 重算卷级字段（评分口径与交卷时对齐：人工题计入 earned，
     仅「已评」人工题进入正确率/题型得分率的分母） */
  function recomputeRecord() {
    var autoEarn = 0, manEarn = 0, manWait = 0;
    var right = 0, count = 0; // count = 客观题 + 已评人工题
    record.results.forEach(function (res) {
      if (res.manual) {
        if (!res.scored) { manWait++; return; }
        manEarn += res.earned;
      } else {
        autoEarn += res.earned;
      }
      count++;
      if (res.correct) right++;
    });
    record.earnedScore = round2(autoEarn + manEarn);
    record.accuracy = count ? Math.round(right / count * 1000) / 10 : 0;
    record.manualCount = manWait;
  }

  /* 写回 records + 同步 history（history 无更新接口，按 examId+ts 匹配后整表回写） */
  function persist() {
    var recs = S().getRecords();
    var found = false;
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].id === record.id) { recs[i] = record; found = true; break; }
    }
    if (!found) recs.unshift(record);
    S().write(S().KEYS.RECORDS, recs);

    var hist = S().getHistory();
    var idx = -1;
    for (var j = hist.length - 1; j >= 0; j--) {
      if (hist[j].examId === record.examId && hist[j].ts === record.ts) { idx = j; break; }
    }
    if (idx < 0) {
      for (var k = hist.length - 1; k >= 0; k--) {
        if (hist[k].examId === record.examId) { idx = k; break; }
      }
    }
    if (idx >= 0) {
      hist[idx].earnedScore = record.earnedScore;
      hist[idx].accuracy = record.accuracy;
      hist[idx].totalScore = record.totalScore;
      S().write(S().KEYS.HISTORY, hist);
    }
  }

  /* 评分后局部刷新：统计卡 / 圆环 / 题型图 / 趋势图原地重画；
     雷达与薄弱知识点依赖已存档数据，标记过期提示刷新 */
  function refreshAfterScore(idx) {
    updateStats();
    drawScoreRing(Math.round(rate(record) * 1000) / 10);
    try { drawTypeChart(); } catch (e) { /* 图表缺失时降级忽略 */ }
    try { drawTrend(); } catch (e) { /* 图表缺失时降级忽略 */ }
    if (!scoreChartDirty) {
      scoreChartDirty = true;
      var note = document.getElementById('radar-stale');
      if (note) note.hidden = false;
    }
    var v = viewOf[idx];
    if (v) {
      var bar = v.el.querySelector('.score-bar');
      if (bar) bar.innerHTML = scoreBarHtml(record.results[idx], idx);
      var badge = v.el.querySelector('.q-result');
      if (badge) {
        badge.classList.remove('manual');
        badge.classList.add('scored');
        badge.textContent = '已评分 ' + fmtScore(record.results[idx].score) + ' 分';
      }
      v.el.dataset.verdict = record.results[idx].correct ? 'right' : 'wrong';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!scoreListenerBound) {
      scoreListenerBound = true;
      document.addEventListener('click', onScoreClick);
    }
    boot();
  });
})();
