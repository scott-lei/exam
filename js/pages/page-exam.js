/* ============================================================
 * page-exam.js —— 考试页
 * 计时 / 答题 / 答题卡导航 / 交卷 / 断点续考
 * ============================================================ */
(function () {
  'use strict';

  var S = function () { return window.MX.Storage; };
  var root, paper = null, views = [], answers = {}, flags = {};
  var examId = '', elapsed = 0, remain = 0, timerId = null, lastTick = 0;
  var current = 0, perPage = 1, saveTimer = null, submitted = false;

  function esc(s) { return window.MX.Math.escapeHtml(s); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ============================================================
   * 入口
   * ============================================================ */
  async function boot() {
    root = document.getElementById('page-root');
    window.MX.Shell.mount({ page: 'exam', title: '在线考试' });

    var load = window.MX.Shell.loading('准备试卷…');
    try { await window.MX.Tags.load(); } catch (e) {
      load.close(); root.innerHTML = errBox(e.message); return;
    }
    load.close();

    var qs = new URLSearchParams(location.search);
    examId = qs.get('examId') || '';

    if (examId) {
      var prog = S().getProgress(examId);
      if (prog && !prog.submitted) { resumeExam(prog); return; }
      var cur = S().read('math_exam_current_paper', null);
      if (cur && cur.paper && (cur.paper.examId === examId || cur.paper.id === examId)) { startExam(cur.paper); return; }
      // 尝试从已保存试卷中找（试卷已瘦身，需回查题目重新拼装）
      var saved = S().getPapers().filter(function (p) { return p.id === examId; })[0];
      if (saved) {
        S().getPaper(examId).then(function (full) {
          if (full) startExam(full);
          else window.MX.Toast.warn('未找到该试卷，可在下方选择待完成的试卷或重新组卷');
        });
        return;
      }
      window.MX.Toast.warn('未找到该试卷，可在下方选择待完成的试卷或重新组卷');
    }
    renderExamList();
  }

  function errBox(msg) {
    return '<div class="card"><h2>出错了</h2><p class="muted">' + esc(msg) + '</p></div>';
  }

  /* ============================================================
   * 试卷列表（无 examId 时）
   * ============================================================ */
  function renderExamList() {
    var progs = S().listProgress().filter(function (p) { return !p.submitted; });
    var papers = S().getPapers();
    var records = S().getRecords();

    root.innerHTML =
      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">待完成的试卷</h2>' +
      '<span class="muted small">已自动保存答题进度，可随时继续</span></div>' +
      (progs.length ? '<div class="grid grid-3">' + progs.map(function (p) {
        var answered = countAnswered(p);
        return '<div class="card hoverable">' +
          '<div class="card-head"><h3 class="card-title" style="font-size:1em">' + esc(p.title || '试卷') + '</h3>' +
          '<span class="badge">' + answered + ' / ' + (p.paper ? p.paper.count : 0) + '</span></div>' +
          '<div class="bar mb-2"><i style="width:' + (p.paper ? Math.round(answered / p.paper.count * 100) : 0) + '%"></i></div>' +
          '<p class="muted small">上次保存：' + window.MX.Shell.relTime(p.updatedAt) + '</p>' +
          '<div class="btn-group">' +
          '<a class="btn btn-primary btn-sm" href="exam.html?examId=' + encodeURIComponent(p.examId) + '">继续答题</a>' +
          '<button class="btn btn-danger btn-sm" data-drop-prog="' + esc(p.examId) + '">放弃</button>' +
          '</div></div>';
      }).join('') + '</div>'
        : '<div class="card">' + window.MX.Shell.emptyState('暂无未完成的试卷', '去组卷中心生成一份试卷即可开始考试。',
          '<a class="btn btn-primary mt-2" href="paper-builder.html">去组卷</a>') + '</div>') +
      '</section>' +

      '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">我保存的试卷</h2>' +
      '<a class="btn btn-ghost btn-sm" href="paper-builder.html">+ 新建试卷</a></div>' +
      (papers.length ? '<div class="grid grid-3">' + papers.map(function (p) {
        return '<div class="card hoverable">' +
          '<div class="card-head"><h3 class="card-title" style="font-size:1em">' + esc(p.title) + '</h3>' +
          '<span class="badge">' + p.count + ' 题</span></div>' +
          '<p class="muted small">' + p.totalScore + ' 分 · 保存于 ' + window.MX.Shell.fmtDateTime(p.createdAt) + '</p>' +
          '<div class="btn-group">' +
          '<button class="btn btn-primary btn-sm" data-start-paper="' + esc(p.id) + '">开始考试</button>' +
          '<button class="btn btn-danger btn-sm" data-drop-paper="' + esc(p.id) + '">删除</button>' +
          '</div></div>';
      }).join('') + '</div>'
        : '<div class="card">' + window.MX.Shell.emptyState('还没有保存的试卷', '在组卷中心生成试卷后点击「保存试卷」即可在此看到。') + '</div>') +
      '</section>' +

      (records.length ? '<section class="section"><div class="section-head"><h2 class="section-title">最近成绩</h2>' +
        '<a class="btn btn-ghost btn-sm" href="report.html">全部报告</a></div>' +
        '<div class="card"><table class="data-table"><thead><tr><th>试卷</th><th>得分</th><th>正确率</th><th>用时</th><th>时间</th><th></th></tr></thead><tbody>' +
        records.slice(0, 8).map(function (r) {
          return '<tr><td>' + esc(r.title || '') + '</td>' +
            '<td class="num">' + r.earnedScore + ' / ' + r.totalScore + '</td>' +
            '<td class="num">' + r.accuracy + '%</td>' +
            '<td>' + window.MX.Shell.fmtDuration(r.duration) + '</td>' +
            '<td>' + window.MX.Shell.fmtDateTime(r.ts) + '</td>' +
            '<td><a class="btn btn-ghost btn-sm" href="report.html?examId=' + encodeURIComponent(r.examId || r.id) + '">查看</a></td></tr>';
        }).join('') + '</tbody></table></div></section>' : '');

    root.addEventListener('click', function (e) {
      var t = e.target;
      var dp = t.getAttribute && t.getAttribute('data-drop-prog');
      if (dp) { S().clearProgress(dp); window.MX.Toast.ok('已放弃该试卷'); renderExamList(); return; }
      var sp = t.getAttribute && t.getAttribute('data-start-paper');
      if (sp) {
        var p = S().getPapers().filter(function (x) { return x.id === sp; })[0];
        if (p) { S().getPaper(sp).then(function (full) { if (full) startExam(full); }); }
        return;
      }
      var dpp = t.getAttribute && t.getAttribute('data-drop-paper');
      if (dpp) {
        window.MX.Toast.confirm({ title: '删除试卷', text: '确定删除这份保存的试卷吗？', danger: true })
          .then(function (yes) { if (yes) { S().removePaper(dpp); window.MX.Toast.ok('已删除'); renderExamList(); } });
      }
    });
  }

  function countAnswered(p) {
    if (!p || !p.answers) return 0;
    return Object.keys(p.answers).filter(function (k) {
      var a = p.answers[k];
      return a && JSON.stringify(a) !== '{}' && JSON.stringify(a) !== '{"index":[]}' && JSON.stringify(a) !== '{"values":[""]}';
    }).length;
  }

  /* ============================================================
   * 开始 / 恢复
   * ============================================================ */
  function startExam(p) {
    paper = p; examId = p.examId || p.id;
    answers = {}; flags = {}; elapsed = 0; remain = (p.duration || 30) * 60;
    renderShell();
    mountQuestions();
  }

  function resumeExam(prog) {
    paper = prog.paper;
    examId = prog.examId;
    answers = prog.answers || {};
    flags = prog.flags || {};
    elapsed = prog.elapsed || 0;
    remain = Math.max(0, (paper.duration || 30) * 60 - elapsed);
    current = prog.currentIndex || 0;
    renderShell();
    mountQuestions();
    window.MX.Toast.info('已恢复上次的答题进度');
  }

  /* ============================================================
   * 页面骨架
   * ============================================================ */
  function renderShell() {
    var showTimer = S().getSettings().showTimer;
    root.innerHTML =
      '<div class="sticky-bar no-print">' +
      '<div style="min-width:0"><div style="font-weight:800;color:var(--ink)">' + esc(paper.title) + '</div>' +
      '<div class="muted small" id="exam-sub">共 ' + paper.count + ' 题 · 满分 ' + paper.totalScore + ' 分</div></div>' +
      (showTimer ? '<span class="timer-chip" id="timer">--:--</span>' : '') +
      '<div class="progress-mini"><div class="bar"><i id="prog-bar" style="width:0%"></i></div>' +
      '<div class="muted small" id="prog-text">已答 0 / ' + paper.count + '</div></div>' +
      '<div class="btn-group">' +
      '<button class="btn btn-ghost btn-sm" id="btn-prev">上一题</button>' +
      '<button class="btn btn-ghost btn-sm" id="btn-next">下一题</button>' +
      '<button class="btn btn-primary btn-sm" id="btn-submit">交卷</button>' +
      '</div>' +
      '</div>' +

      '<div class="grid grid-side-r">' +
      '<div id="question-area"></div>' +

      '<aside style="align-self:start" class="no-print">' +
      '<div class="card" style="position:sticky;top:96px">' +
      '<div class="card-head"><h3 class="card-title">答题卡</h3>' +
      '<span class="muted small" id="sheet-progress">0/' + paper.count + '</span></div>' +
      '<div class="answer-sheet" id="answer-sheet"></div>' +
      '<hr class="sep">' +
      '<div class="field"><label>每页显示</label>' +
      '<div class="btn-seg" id="paging-seg">' +
      '<button data-pp="1" class="on">单题</button><button data-pp="5">5 题</button><button data-pp="all">全部</button>' +
      '</div></div>' +
      '<div class="flex gap-1 wrap">' +
      '<button class="btn btn-ghost btn-sm" id="btn-print-exam">打印试卷</button>' +
      '<button class="btn btn-danger btn-sm" id="btn-abandon">放弃考试</button>' +
      '</div>' +
      '<p class="muted small mt-2">提示：答题进度会自动保存，关闭页面后可从「在线考试」页继续作答。</p>' +
      '</div>' +
      '</aside>' +
      '</div>';

    $('#btn-prev').addEventListener('click', function () { goto(current - 1); });
    $('#btn-next').addEventListener('click', function () { goto(current + 1); });
    $('#btn-submit').addEventListener('click', confirmSubmit);
    $('#btn-abandon').addEventListener('click', function () {
      window.MX.Toast.confirm({ title: '放弃考试', text: '将清空本次答题进度，且不生成成绩记录。确定放弃？', danger: true })
        .then(function (yes) {
          if (!yes) return;
          S().clearProgress(examId);
          stopTimer();
          location.href = 'exam.html';
        });
    });
    $('#btn-print-exam').addEventListener('click', function () {
      var old = perPage; setPerPage('all');
      setTimeout(function () { window.print(); setTimeout(function () { setPerPage(old); }, 400); }, 120);
    });
    $('#paging-seg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pp]');
      if (!b) return;
      setPerPage(b.getAttribute('data-pp'));
    });
    $('#answer-sheet').addEventListener('click', function (e) {
      var it = e.target.closest('.as-item');
      if (!it) return;
      goto(Number(it.getAttribute('data-i')));
    });

    startTimer();
  }

  function setPerPage(pp) {
    perPage = pp === 'all' ? 'all' : Number(pp);
    $$('#paging-seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pp') === String(pp)); });
    applyPaging();
  }

  /* ============================================================
   * 题目挂载
   * ============================================================ */
  function mountQuestions() {
    var area = $('#question-area');
    area.innerHTML = '';
    views = [];
    paper.questions.forEach(function (q, i) {
      var v = window.MX.Render.createQuestionView(q, {
        index: i + 1,
        onChange: function (a, meta) {
          answers[q.id] = a;
          if (meta && meta.flagged !== undefined) flags[q.id] = meta.flagged;
          refreshSheet();
          scheduleSave();
          maybeAutoNext(q, i, a);
        }
      });
      if (answers[q.id]) v.setAnswer(answers[q.id]);
      views.push(v);
      area.appendChild(v.el);
    });
    applyPaging();
    refreshSheet();
    goto(current, true);
    reflectSaveState();
  }

  function maybeAutoNext(q, i, a) {
    if (!S().getSettings().autoNext) return;
    if (['choice', 'judge'].indexOf(q.type) < 0) return;
    if (perPage !== 1) return;
    var ok = q.type === 'choice' ? (a.index || []).length > 0 : typeof a.value === 'boolean';
    if (!ok) return;
    setTimeout(function () { if (current === i && i < paper.count - 1) goto(i + 1); }, 420);
  }

  function applyPaging() {
    if (perPage === 'all') {
      views.forEach(function (v) { v.el.style.display = ''; });
      return;
    }
    var start = Math.floor(current / perPage) * perPage;
    views.forEach(function (v, i) {
      v.el.style.display = (i >= start && i < start + perPage) ? '' : 'none';
    });
  }

  function goto(i, silent) {
    if (i < 0 || i >= paper.count) return;
    current = i;
    if (perPage !== 'all') {
      applyPaging();
      views[i].el.scrollIntoView({ behavior: silent ? 'auto' : 'smooth', block: 'start' });
      views[i].focus();
      // 让作图题的画布在显示后重新按容器宽度自适应
      if (window.dispatchEvent) window.dispatchEvent(new Event('resize'));
    }
    refreshSheet();
    scheduleSave();
  }

  /* ============================================================
   * 答题卡 / 进度
   * ============================================================ */
  function refreshSheet() {
    var sheet = $('#answer-sheet');
    sheet.innerHTML = paper.questions.map(function (q, i) {
      var done = window.MX.Render.isAnswered(q, answers[q.id]);
      var cls = ['as-item'];
      if (done) cls.push('done');
      if (i === current) cls.push('current');
      if (flags[q.id]) cls.push('flagged');
      return '<button class="' + cls.join(' ') + '" data-i="' + i + '" title="第 ' + (i + 1) + ' 题">' + (i + 1) + '</button>';
    }).join('');

    var done = paper.questions.filter(function (q) { return window.MX.Render.isAnswered(q, answers[q.id]); }).length;
    var pct = Math.round(done / paper.count * 100);
    $('#prog-bar').style.width = pct + '%';
    $('#prog-text').textContent = '已答 ' + done + ' / ' + paper.count;
    $('#sheet-progress').textContent = done + '/' + paper.count;
  }

  /* ============================================================
   * 计时
   * ============================================================ */
  function startTimer() {
    lastTick = Date.now();
    stopTimer();
    tick();
    timerId = setInterval(tick, 1000);
  }
  function tick() {
    var now = Date.now();
    var delta = Math.round((now - lastTick) / 1000);
    if (delta > 0) { elapsed += delta; remain = Math.max(0, remain - delta); lastTick = now; }
    var el = $('#timer');
    if (el) {
      var h = Math.floor(remain / 3600), m = Math.floor((remain % 3600) / 60), s = remain % 60;
      el.textContent = (h > 0 ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      el.classList.toggle('warn', remain <= 300 && remain > 60);
      el.classList.toggle('danger', remain <= 60);
    }
    if (remain <= 0 && !submitted) { doSubmit(true); }
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  /* ============================================================
   * 断点续考：保存进度
   * ============================================================ */
  function scheduleSave() {
    if (submitted) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function saveNow() {
    if (submitted || !paper) return;
    var ok = S().saveProgress(examId, {
      examId: examId,
      title: paper.title,
      paper: paper,
      answers: answers,
      flags: flags,
      elapsed: elapsed,
      currentIndex: current,
      startedAt: paper.createdAt || Date.now(),
      updatedAt: Date.now(),
      submitted: false
    });
    if (!ok) {
      var el = $('#exam-sub');
      if (el) el.innerHTML = '<span style="color:var(--red-600)">进度保存失败（浏览器存储已满），请尽快交卷</span>';
    }
  }
  function reflectSaveState() { saveNow(); }

  /* ============================================================
   * 交卷
   * ============================================================ */
  function confirmSubmit() {
    var unanswered = paper.questions.filter(function (q) { return !window.MX.Render.isAnswered(q, answers[q.id]); });
    var text = '确认交卷吗？交卷后将自动阅卷并生成成绩报告。';
    if (unanswered.length) {
      text += '<br><br><b style="color:var(--red-600)">仍有 ' + unanswered.length + ' 道题未作答：</b>第 ' +
        unanswered.slice(0, 20).map(function (q) { return q.paperIndex || (paper.questions.indexOf(q) + 1); }).join('、') +
        (unanswered.length > 20 ? ' 等' : '') + ' 题。';
    }
    window.MX.Toast.confirm({ title: '交卷确认', text: text, okText: '确认交卷' }).then(function (yes) {
      if (yes) doSubmit(false);
    });
  }

  function doSubmit(auto) {
    if (submitted) return;
    submitted = true;
    stopTimer();
    if (auto) window.MX.Toast.warn('考试时间已到，系统自动交卷');

    // 收集最后的作答
    views.forEach(function (v) { answers[v.question.id] = v.getAnswer(); });

    var report = window.MX.Grader.gradePaper(paper.questions, answers);
    var duration = elapsed;
    var rec = {
      id: S().uid('R'),
      examId: examId,
      title: paper.title,
      ts: Date.now(),
      duration: duration,
      questionCount: report.questionCount,
      totalScore: report.totalScore,
      earnedScore: report.earnedScore,
      accuracy: report.accuracy,
      rightCount: report.rightCount,
      wrongCount: report.wrongCount,
      manualCount: report.manualCount,
      books: Object.keys(paper.stats.books || {}),
      config: paper.config,
      answers: answers,
      results: report.results.map(function (r) {
        return { qid: r.qid, type: r.type, correct: r.correct, manual: r.manual, earned: r.earned, max: r.max, ratio: r.ratio };
      })
    };
    S().addRecord(rec);
    S().addHistory({ ts: rec.ts, earnedScore: rec.earnedScore, totalScore: rec.totalScore, examId: examId, title: paper.title, accuracy: rec.accuracy });

    // 错题入本
    var wrongCount = 0;
    report.results.forEach(function (r) {
      if (r.manual || r.correct) return;
      var q = paper.questions.filter(function (x) { return x.id === r.qid; })[0];
      if (!q) return;
      var pt = window.MX.Tags.point(q.point) || {};
      S().pushWrong({
        qid: q.id,
        book: q.book,
        bookName: q.bookName,
        domain: q.domain,
        domainName: q.domainName,
        point: q.point,
        pointName: q.pointName,
        knowledgeName: q.knowledgeName,
        type: q.type,
        stem: q.stem,
        myAnswer: answers[q.id],
        correctAnswer: window.MX.Plugins.answerTextOf(q),
        ts: Date.now(),
        fromExam: examId,
        title: paper.title
      });
      wrongCount++;
      void pt;
    });

    S().clearProgress(examId);
    S().remove('math_exam_current_paper');

    window.MX.Toast.ok('交卷成功！得分 ' + rec.earnedScore + ' / ' + rec.totalScore);
    setTimeout(function () {
      location.href = 'report.html?examId=' + encodeURIComponent(examId) + '&recordId=' + encodeURIComponent(rec.id);
    }, 700);
  }

  /* ============================================================
   * 关闭前保存
   * ============================================================ */
  window.addEventListener('beforeunload', function () {
    if (!submitted) saveNow();
  });

  document.addEventListener('DOMContentLoaded', boot);
})();
