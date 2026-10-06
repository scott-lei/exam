/* ============================================================
 * MX.Render —— 题目视图（题型渲染器）
 * 统一负责：题干（KaTeX）、题图（SVG / 交互 SVG）、答题区、解析区、判分样式
 * 被 exam.html（考试）、report.html（讲评）、wrongbook.html（重练）、
 * paper-builder.html（预览）共用
 * ============================================================ */
(function (global) {
  'use strict';

  var M = function () { return global.MX.Math; };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function typeName(id) {
    var list = global.MX.Tags.questionTypes || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id;
  }

  function typeIsAuto(id) {
    var list = global.MX.Tags.questionTypes || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return !!list[i].auto;
    return true;
  }

  function stars(n) {
    var s = '';
    for (var i = 1; i <= 3; i++) s += i <= n ? '★' : '☆';
    return s;
  }

  function pointTypeBadge(pt) {
    var meta = (global.MX.Tags.pointTypes || {})[pt] || {};
    return '<span class="badge badge-pt" style="--c:' + (meta.color || '#64748b') + '">' + (meta.label || pt) + '</span>';
  }

  /**
   * 创建题目视图
   * @param {object} q 题目
   * @param {object} opts { index, readonly, showAnalysis, onChange, startExpanded }
   */
  function createQuestionView(q, opts) {
    opts = opts || {};
    var state = initialState(q);
    var answer = null;   // 当前作答

    var card = el('article', 'q-card');
    card.dataset.qid = q.id;
    card.dataset.type = q.type;
    if (opts.bigFont) card.classList.add('big-font');

    /* ---------- 头部 ---------- */
    var head = el('header', 'q-head');
    head.innerHTML =
      '<span class="q-index">' + (opts.index || 1) + '</span>' +
      '<span class="badge badge-type">' + typeName(q.type) + '</span>' +
      (q.pointType ? pointTypeBadge(q.pointType) : '') +
      '<span class="q-diff" title="难度 ' + q.difficulty + '/3">' + stars(q.difficulty) + '</span>' +
      '<span class="q-score">' + (q.paperScore !== undefined ? q.paperScore : q.score) + ' 分</span>' +
      (typeIsAuto(q.type) ? '' : '<span class="badge badge-manual">人工阅卷</span>') +
      '<span class="q-head-spacer"></span>' +
      '<button class="q-flag btn-icon" title="标记此题，便于回头检查" type="button">⚑</button>';
    card.appendChild(head);

    head.querySelector('.q-flag').addEventListener('click', function () {
      card.classList.toggle('flagged');
      this.classList.toggle('active');
      if (opts.onChange) opts.onChange(getAnswer(), { flagged: card.classList.contains('flagged') });
    });

    /* ---------- 题干 ---------- */
    var stem = el('div', 'q-stem');
    stem.innerHTML = M().toHtml(q.stem || '');
    card.appendChild(stem);

    /* ---------- 标签行 ---------- */
    var tagRow = el('div', 'q-tags-row');
    (q.tags || []).forEach(function (t, i) {
      var b = el('span', 'tag tag-' + i, M().escapeHtml(t));
      tagRow.appendChild(b);
    });
    card.appendChild(tagRow);

    /* ---------- 题图 ---------- */
    var mediaBox = null;
    if (q.media && q.media.type && q.media.type !== 'none') {
      mediaBox = el('div', 'q-media');
      card.appendChild(mediaBox);
    }

    /* ---------- 答题区 ---------- */
    var body = el('div', 'q-body');
    card.appendChild(body);

    /* ---------- 解析区 ---------- */
    var analysisBox = el('div', 'q-analysis');
    analysisBox.hidden = true;
    analysisBox.innerHTML =
      '<div class="analysis-title">答案与解析</div>' +
      '<div class="analysis-answer"><span class="label">正确答案：</span><span class="value">' +
      M().escapeHtml(global.MX.Plugins.answerTextOf(q)) + '</span></div>' +
      '<div class="analysis-body">' + M().toHtml(q.analysis || '（暂无解析）') + '</div>';
    card.appendChild(analysisBox);

    var toggle = el('button', 'btn btn-ghost q-toggle-analysis', '查看解析');
    toggle.type = 'button';
    toggle.addEventListener('click', function () {
      analysisBox.hidden = !analysisBox.hidden;
      toggle.textContent = analysisBox.hidden ? '查看解析' : '收起解析';
    });
    card.appendChild(toggle);

    /* ---------- 渲染答题区 ---------- */
    var controller = buildBody(q, body, {
      readonly: opts.readonly,
      get: function () { return answer; },
      set: function (a, silent) {
        answer = a;
        if (!silent && opts.onChange) opts.onChange(getAnswer());
      }
    });

    // 题图在答题区渲染完成后附加（交互题需要绑定选择回调）
    if (mediaBox) attachMedia(q, mediaBox, controller);

    function getAnswer() {
      if (!controller) return answer;
      answer = controller.read();
      return answer;
    }
    function setAnswer(a) {
      answer = a;
      if (controller) controller.write(a);
    }

    var view = {
      el: card,
      question: q,
      getAnswer: getAnswer,
      setAnswer: setAnswer,
      isAnswered: function () { return isAnswered(q, getAnswer()); },
      /** 显示/隐藏解析 */
      reveal: function (show) {
        analysisBox.hidden = !show;
        toggle.textContent = show ? '收起解析' : '查看解析';
        if (show) card.classList.add('revealed');
        else card.classList.remove('revealed');
      },
      /** 标注判分结果 */
      mark: function (result) {
        card.classList.add('graded');
        card.classList.remove('correct', 'wrong', 'manual');
        if (result.manual) card.classList.add('manual');
        else card.classList.add(result.correct ? 'correct' : 'wrong');
        var flagText = result.manual ? '待人工评阅' : (result.correct ? '✓ 答对' : '✗ 答错');
        var badge = el('span', 'q-result ' + (result.manual ? 'manual' : (result.correct ? 'correct' : 'wrong')), flagText);
        var old = card.querySelector('.q-result');
        if (old) old.remove();
        head.appendChild(badge);
        // 逐空标注
        if (Array.isArray(result.detail)) {
          var inputs = card.querySelectorAll('[data-blank]');
          result.detail.forEach(function (d, i) {
            if (!inputs[i]) return;
            if (d.correct) inputs[i].classList.add('blank-correct');
            else inputs[i].classList.add('blank-wrong');
          });
          card.querySelectorAll('.reading-sub').forEach(function (sub, si) {
            var d = result.detail[si];
            if (!d) return;
            sub.classList.add(d.correct ? 'blank-correct' : 'blank-wrong');
          });
        }
      },
      lock: function () { controller && controller.lock && controller.lock(); card.classList.add('locked'); },
      unlock: function () { controller && controller.unlock && controller.unlock(); card.classList.remove('locked'); },
      focus: function () {
        var first = card.querySelector('input, textarea, button.opt-btn');
        if (first) first.focus();
      },
      destroy: function () { if (controller && controller.destroy) controller.destroy(); }
    };

    if (opts.readonly) view.lock();
    if (opts.showAnalysis) view.reveal(true);
    if (opts.startExpanded) analysisBox.hidden = false;

    setAnswer(state.values);
    return view;
  }

  /* ============================================================
   * 初始化的空作答
   * ============================================================ */
  function initialState(q) {
    var specs = global.MX.Plugins.specsOf(q);
    var v = null;
    switch (q.type) {
      case 'choice': v = { index: [] }; break;
      case 'judge': v = { value: null }; break;
      case 'figure-interactive': v = { regions: [] }; break;
      case 'reading':
        v = { subs: ((q.answer || {}).subs || []).map(function (s) {
          var sp = (s.answer && Array.isArray(s.answer.blanks)) ? s.answer.blanks : [s.answer];
          return new Array(sp.length).fill('');
        }) };
        break;
      case 'draw': v = { dataUrl: '', note: '' }; break;
      default: v = { values: new Array(Math.max(1, specs.length)).fill('') };
    }
    return { values: v };
  }

  function isAnswered(q, a) {
    if (!a) return false;
    switch (q.type) {
      case 'choice': return (a.index || []).length > 0;
      case 'judge': return typeof a.value === 'boolean';
      case 'figure-interactive': return (a.regions || []).length > 0;
      case 'reading': return (a.subs || []).some(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
      case 'draw': return !!(a.dataUrl || (a.note && a.note.trim()));
      default: return (a.values || []).some(function (x) { return String(x === undefined || x === null ? '' : x).trim() !== ''; });
    }
  }

  /* ============================================================
   * 各题型的答题区
   * ============================================================ */
  function buildBody(q, body, ctx) {
    switch (q.type) {
      case 'choice': return buildChoice(q, body, ctx);
      case 'judge': return buildJudge(q, body, ctx);
      case 'figure-interactive': return buildRegions(q, body, ctx);
      case 'reading': return buildReading(q, body, ctx);
      case 'draw': return buildDraw(q, body, ctx);
      default: return buildBlanks(q, body, ctx);
    }
  }

  /* ---- 选择题 ---- */
  function buildChoice(q, body, ctx) {
    var multi = ((q.answer || {}).index || []).length > 1;
    var wrap = el('div', 'opts' + (multi ? ' opts-multi' : ''));
    var inputs = [];
    (q.options || []).forEach(function (opt, i) {
      var lbl = el('label', 'opt');
      var inp = document.createElement('input');
      inp.type = multi ? 'checkbox' : 'radio';
      inp.name = 'q-' + q.id;
      inp.value = i;
      var mark = el('span', 'opt-mark', String.fromCharCode(65 + i));
      var txt = el('span', 'opt-text');
      txt.innerHTML = M().toHtml(String(opt));
      lbl.appendChild(inp); lbl.appendChild(mark); lbl.appendChild(txt);
      inp.addEventListener('change', function () { onPick(); });
      wrap.appendChild(lbl);
      inputs.push(inp);
    });
    body.appendChild(wrap);
    if (multi) {
      var hint = el('p', 'hint', '本题为多选题，请选出所有正确选项。');
      body.appendChild(hint);
    }

    function read() {
      var idx = [];
      inputs.forEach(function (i) { if (i.checked) idx.push(Number(i.value)); });
      return { index: idx };
    }
    function write(a) {
      var idx = (a && a.index) || [];
      inputs.forEach(function (i) { i.checked = idx.indexOf(Number(i.value)) >= 0; });
    }
    function lock() { inputs.forEach(function (i) { i.disabled = true; }); }
    function unlock() { inputs.forEach(function (i) { i.disabled = false; }); }
    function onPick() {
      var a = read();
      inputs.forEach(function (i) {
        var l = i.closest('.opt');
        l.classList.toggle('picked', i.checked);
      });
      ctx.set(a);
    }
    if (ctx.readonly) lock();
    return { read: read, write: write, lock: lock, unlock: unlock, onPick: onPick };
  }

  /* ---- 判断题 ---- */
  function buildJudge(q, body, ctx) {
    var wrap = el('div', 'judge-opts');
    var btns = [];
    [['√', true, 'correct'], ['×', false, 'wrong']].forEach(function (item) {
      var b = el('button', 'judge-btn judge-' + item[2], '<span>' + item[0] + '</span><em>' + (item[1] ? '正确' : '错误') + '</em>');
      b.type = 'button';
      b.addEventListener('click', function () { pick(item[1]); });
      wrap.appendChild(b); btns.push({ el: b, val: item[1] });
    });
    body.appendChild(wrap);

    function read() {
      var picked = btns.filter(function (b) { return b.el.classList.contains('picked'); })[0];
      return { value: picked ? picked.val : null };
    }
    function write(a) {
      var v = a ? a.value : null;
      btns.forEach(function (b) { b.el.classList.toggle('picked', b.val === v); });
    }
    function pick(v) {
      btns.forEach(function (b) { b.el.classList.toggle('picked', b.val === v); });
      ctx.set({ value: v });
    }
    function lock() { btns.forEach(function (b) { b.el.disabled = true; }); }
    function unlock() { btns.forEach(function (b) { b.el.disabled = false; }); }
    if (ctx.readonly) lock();
    return { read: read, write: write, lock: lock, unlock: unlock };
  }

  /* ---- 填空 / 计算 / 应用 / 图形 ---- */
  function buildBlanks(q, body, ctx) {
    var specs = global.MX.Plugins.specsOf(q);
    var n = Math.max(1, specs.length);
    var wrap = el('div', 'blanks');
    var inputs = [];
    for (var i = 0; i < n; i++) {
      var row = el('div', 'blank-row');
      if (n > 1) {
        var lb = el('span', 'blank-label', '第 ' + (i + 1) + ' 空');
        row.appendChild(lb);
      }
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'blank-input';
      inp.setAttribute('data-blank', String(i));
      inp.setAttribute('autocomplete', 'off');
      inp.placeholder = n > 1 ? '填第 ' + (i + 1) + ' 空' : '在此输入答案';
      inp.addEventListener('input', function () { ctx.set(read()); });
      row.appendChild(inp);
      if (specs[i] && specs[i].unit) {
        row.appendChild(el('span', 'blank-unit', String(specs[i].unit)));
      }
      wrap.appendChild(row);
      inputs.push(inp);
    }
    body.appendChild(wrap);

    function read() { return { values: inputs.map(function (i) { return i.value; }) }; }
    function write(a) {
      var v = (a && a.values) || [];
      inputs.forEach(function (i, k) { i.value = v[k] === undefined || v[k] === null ? '' : v[k]; });
    }
    function lock() { inputs.forEach(function (i) { i.disabled = true; }); }
    function unlock() { inputs.forEach(function (i) { i.disabled = false; }); }
    if (ctx.readonly) lock();
    return {
      read: read, write: write, lock: lock, unlock: unlock,
      focus: function () { inputs[0] && inputs[0].focus(); }
    };
  }

  /* ---- 阅读理解（子问题） ---- */
  function buildReading(q, body, ctx) {
    var subs = (q.answer || {}).subs || [];
    var rows = [];
    subs.forEach(function (s, si) {
      var spec = s.answer || {};
      var sp = Array.isArray(spec.blanks) ? spec.blanks : [spec];
      var box = el('div', 'reading-sub');
      var line = el('div', 'reading-line');
      line.innerHTML = '<span class="reading-label">' + M().escapeHtml(s.label || ('(' + (si + 1) + ')')) + '</span>' +
        '<span class="reading-text">' + M().toHtml(s.text || '') + '</span>';
      box.appendChild(line);
      var inputs = [];
      var bl = el('div', 'blanks inline');
      sp.forEach(function (spec2, k) {
        var row = el('div', 'blank-row');
        if (sp.length > 1) row.appendChild(el('span', 'blank-label', '第 ' + (k + 1) + ' 空'));
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'blank-input';
        inp.setAttribute('data-blank', si + '-' + k);
        inp.placeholder = '作答';
        inp.setAttribute('autocomplete', 'off');
        inp.addEventListener('input', function () { ctx.set(read()); });
        row.appendChild(inp);
        if (spec2 && spec2.unit) row.appendChild(el('span', 'blank-unit', String(spec2.unit)));
        bl.appendChild(row);
        inputs.push(inp);
      });
      box.appendChild(bl);
      body.appendChild(box);
      rows.push({ inputs: inputs, el: box });
    });

    function read() {
      return { subs: rows.map(function (r) { return r.inputs.map(function (i) { return i.value; }); }) };
    }
    function write(a) {
      var v = (a && a.subs) || [];
      rows.forEach(function (r, si) {
        (v[si] || []).forEach(function (val, k) {
          if (r.inputs[k]) r.inputs[k].value = val === undefined || val === null ? '' : val;
        });
      });
    }
    function lock() { rows.forEach(function (r) { r.inputs.forEach(function (i) { i.disabled = true; }); }); }
    function unlock() { rows.forEach(function (r) { r.inputs.forEach(function (i) { i.disabled = false; }); }); }
    if (ctx.readonly) lock();
    return { read: read, write: write, lock: lock, unlock: unlock };
  }

  /* ---- 交互图形题 ---- */
  function buildRegions(q, body, ctx) {
    var chosen = [];
    var chips = el('div', 'region-chips');
    var confirm = el('button', 'btn btn-ghost btn-sm', '确认选择');
    confirm.type = 'button';
    var ctrl = {
      read: function () { return { regions: chosen.slice() }; },
      write: function (a) {
        chosen = ((a && a.regions) || []).slice();
        paintChips();
        if (mediaCtl) mediaCtl.refresh(chosen);
      },
      lock: function () { if (mediaCtl) mediaCtl.setInteractive(false); confirm.disabled = true; },
      unlock: function () { if (mediaCtl) mediaCtl.setInteractive(true); confirm.disabled = false; }
    };
    var mediaCtl = null;

    function paintChips() {
      if (!chosen.length) {
        chips.innerHTML = '<span class="muted">尚未选择任何图形</span>';
        return;
      }
      var map = {};
      ((q.media || {}).regions || []).forEach(function (r) { map[r.id] = r.label || r.id; });
      chips.innerHTML = chosen.map(function (id, i) {
        return '<span class="chip chip-' + (i % 4) + '">' + M().escapeHtml(map[id] || id) + '</span>';
      }).join('');
    }

    confirm.addEventListener('click', function () {
      ctx.set(ctrl.read());
      global.MX.Toast.ok('已确认选择：' + (chosen.length ? chosen.length + ' 项' : '未选择'));
    });

    body.appendChild(chips);
    body.appendChild(confirm);
    paintChips();
    if (ctx.readonly) lock();

    ctrl.attachMedia = function (ctl) { mediaCtl = ctl; };
    function lock() { ctrl.lock(); }
    return ctrl;
  }

  /* ---- 作图题（Canvas 手绘） ---- */
  function buildDraw(q, body, ctx) {
    var wrap = el('div', 'draw-wrap');
    wrap.innerHTML =
      '<div class="draw-toolbar">' +
      '<span class="draw-tools">' +
      '<button type="button" class="btn-icon draw-color active" data-color="#2563eb" style="color:#2563eb">●</button>' +
      '<button type="button" class="btn-icon draw-color" data-color="#dc2626" style="color:#dc2626">●</button>' +
      '<button type="button" class="btn-icon draw-color" data-color="#16a34a" style="color:#16a34a">●</button>' +
      '<button type="button" class="btn-icon draw-color" data-color="#1e293b" style="color:#1e293b">●</button>' +
      '</span>' +
      '<label class="draw-width">笔粗 <input type="range" min="1" max="10" value="3"></label>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="undo">撤销</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="clear">清空</button>' +
      '</div>' +
      '<div class="draw-canvas-box"><canvas class="draw-canvas"></canvas><div class="draw-hint">在此区域手写作图</div></div>' +
      '<label class="draw-note-label">文字说明（可选）</label>' +
      '<textarea class="draw-note" rows="2" placeholder="例如：先确定圆心，再取半径 2 厘米画圆……"></textarea>';

    var canvas = wrap.querySelector('.draw-canvas');
    var note = wrap.querySelector('.draw-note');
    var ctx2d = canvas.getContext('2d');
    var drawing = false, color = '#2563eb', width = 3;
    var strokes = [], current = null;

    function fit() {
      var box = wrap.querySelector('.draw-canvas-box');
      var w = Math.max(320, box.clientWidth - 4);
      var h = 260;
      var img = null;
      if (canvas.width && canvas.height) {
        try { img = canvas.toDataURL(); } catch (e) { img = null; }
      }
      var ratio = global.devicePixelRatio || 1;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw();
      void img;
    }
    function redraw() {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach(function (s) { drawStroke(s); });
      if (current) drawStroke(current);
    }
    function drawStroke(s) {
      if (!s.pts.length) return;
      ctx2d.save();
      ctx2d.strokeStyle = s.color;
      ctx2d.lineWidth = s.width;
      ctx2d.lineCap = 'round';
      ctx2d.lineJoin = 'round';
      ctx2d.beginPath();
      ctx2d.moveTo(s.pts[0].x, s.pts[0].y);
      for (var i = 1; i < s.pts.length; i++) ctx2d.lineTo(s.pts[i].x, s.pts[i].y);
      ctx2d.stroke();
      ctx2d.restore();
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (ctx.readonly) return;
      drawing = true;
      current = { color: color, width: width, pts: [pos(e)] };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      wrap.querySelector('.draw-hint').style.display = 'none';
    });
    canvas.addEventListener('pointermove', function (e) { if (!drawing) return; current.pts.push(pos(e)); redraw(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) {
      canvas.addEventListener(t, function () {
        if (!drawing) return;
        drawing = false;
        if (current && current.pts.length) strokes.push(current);
        current = null; redraw(); push();
      });
    });
    wrap.querySelectorAll('.draw-color').forEach(function (b) {
      b.addEventListener('click', function () {
        color = b.getAttribute('data-color');
        wrap.querySelectorAll('.draw-color').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      });
    });
    wrap.querySelector('.draw-width input').addEventListener('input', function () { width = Number(this.value); });
    wrap.querySelector('[data-act="undo"]').addEventListener('click', function () { strokes.pop(); redraw(); push(); });
    wrap.querySelector('[data-act="clear"]').addEventListener('click', function () {
      strokes = []; current = null; redraw();
      wrap.querySelector('.draw-hint').style.display = '';
      push();
    });
    note.addEventListener('input', function () { push(); });

    function push() { ctx.set(read()); }
    function read() {
      var url = '';
      try { url = strokes.length ? canvas.toDataURL('image/png') : ''; } catch (e) { url = ''; }
      return { dataUrl: url, note: note.value };
    }
    function write(a) {
      note.value = (a && a.note) || '';
      if (a && a.dataUrl) {
        var img = new Image();
        img.onload = function () {
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          ctx2d.drawImage(img, 0, 0);
        };
        img.src = a.dataUrl;
      }
    }
    function lock() {
      wrap.querySelectorAll('button, input, textarea').forEach(function (b) { b.disabled = true; });
      canvas.style.pointerEvents = 'none';
      ctx.readonly = true;
    }
    function unlock() {
      wrap.querySelectorAll('button, input, textarea').forEach(function (b) { b.disabled = false; });
      canvas.style.pointerEvents = '';
      ctx.readonly = false;
    }

    body.appendChild(wrap);
    setTimeout(fit, 30);
    global.addEventListener('resize', fit);
    if (ctx.readonly) lock();
    return { read: read, write: write, lock: lock, unlock: unlock, destroy: function () { global.removeEventListener('resize', fit); } };
  }

  /* ---- 挂载题图（并在交互题中建立双向联动） ---- */
  function attachMedia(q, box, controller) {
    if (q.media.type === 'svg-interactive' && controller.attachMedia) {
      var ctl = {
        refresh: function () { /* 由下方重建实现 */ },
        setInteractive: function () { }
      };
      function build(interactive) {
        box.innerHTML = '';
        var node = global.MX.Media.render(q.media, {
          interactive: interactive,
          selected: controller.read().regions,
          onToggle: function (sel) {
            controller.write({ regions: sel });
            if (interactive) global.MX.Toast.info('已选择 ' + sel.length + ' 项');
          }
        });
        if (node) box.appendChild(node);
      }
      ctl.setInteractive = function (on) { build(on); };
      ctl.refresh = function () { /* 选中态由 Media 内部维护 */ };
      build(!controller.disabled);
      controller.attachMedia(ctl);
      return;
    }
    var node = global.MX.Media.render(q.media, { interactive: false });
    if (node) box.appendChild(node);
  }

  /* ============================================================
   * 作答摘要（报告 / 错题本展示用）
   * ============================================================ */
  function answerSummary(q, a) {
    if (!a) return '未作答';
    switch (q.type) {
      case 'choice': {
        var idx = a.index || [];
        return idx.length ? idx.map(function (i) { return String.fromCharCode(65 + i); }).join('、') : '未作答';
      }
      case 'judge': return typeof a.value === 'boolean' ? (a.value ? '正确（√）' : '错误（×）') : '未作答';
      case 'figure-interactive': {
        var map = {};
        ((q.media || {}).regions || []).forEach(function (r) { map[r.id] = r.label || r.id; });
        return (a.regions || []).map(function (id) { return map[id] || id; }).join('、') || '未选择';
      }
      case 'reading': return (a.subs || []).map(function (r, i) { return '(' + (i + 1) + ') ' + (r.join(' / ') || '空'); }).join('；');
      case 'draw': return a.dataUrl ? '已作图' + (a.note ? '：' + a.note : '') : (a.note || '未作答');
      default: return (a.values || []).map(function (v) { return String(v === undefined || v === null || v === '' ? '空' : v); }).join(' / ');
    }
  }

  global.MX = global.MX || {};
  global.MX.Render = {
    createQuestionView: createQuestionView,
    answerSummary: answerSummary,
    typeName: typeName,
    stars: stars,
    isAnswered: isAnswered,
    el: el
  };
})(window);
