/* ============================================================
 * MX.PaperPrint —— 独立打印页卷面渲染器
 * 纯静态字符串渲染，不依赖任何页面交互逻辑。
 * render(paper, mode, opts) -> HTML 字符串
 *   mode: 'student' 学生版 | 'teacher' 教师版(学生版+答案页) | 'answer' 答案页
 *   opts: { bare: true } 答案页不输出解析，只输出答案
 *
 * 设计约束（诉求④）：
 *   - 学生版 DOM 中【根本不出现】答案、解析、难度星、考点标签；
 *     这些字段本函数从未拼接进 HTML，不是靠 CSS 隐藏。
 *   - 所有公式统一走 MX.Math.toHtml（KaTeX 封装），不自写渲染。
 *   - LaTeX 的 \underline{\quad} 填空占位会被转成 4em 宽的 border-bottom 横线。
 * ============================================================ */
(function (global) {
  'use strict';
  var MX = global.MX = global.MX || {};

  /* 题型顺序（决定试卷大题排列）与中文名 */
  var TYPE_ORDER = ['choice', 'judge', 'fill', 'calculation', 'application',
    'figure', 'figure-interactive', 'draw', 'reading'];
  var TYPE_NAME = {
    choice: '选择题', judge: '判断题', fill: '填空题', calculation: '计算题',
    application: '应用题', figure: '图形题', 'figure-interactive': '图形操作题',
    draw: '作图题', reading: '阅读理解'
  };
  var CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

  function esc(s) {
    return MX.Math && MX.Math.escapeHtml
      ? MX.Math.escapeHtml(s == null ? '' : String(s))
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }

  function math(text) {
    try { return MX.Math.toHtml(text || ''); }
    catch (e) { return esc(text || ''); }
  }

  /* 将 KaTeX 渲染出的「空下划线占位」替换为可打印的 4em 填空横线。
   * KaTeX 对 \underline{\quad} 的输出以 <span class="mord underline"> 开头，
   * 我们用栈式匹配找到其闭合 </span>，整体替换为空白横线。 */
  function blanks(html) {
    if (!html) return html;
    var OPEN = '<span', CLOSE = '</span>';
    var tag = '<span class="mord underline">';
    var out = '', i = 0;
    while (i < html.length) {
      var idx = html.indexOf(tag, i);
      if (idx < 0) { out += html.slice(i); break; }
      out += html.slice(i, idx);
      var depth = 0, j = idx;
      while (j < html.length) {
        var open = html.indexOf(OPEN, j);
        var close = html.indexOf(CLOSE, j);
        if (close < 0) { j = html.length; break; }
        if (open >= 0 && open < close) { depth++; j = open + OPEN.length; }
        else { depth--; j = close + CLOSE.length; if (depth === 0) break; }
      }
      out += '<span class="pp-blank"></span>';
      i = j;
    }
    return out;
  }

  function stemHtml(stem) { return blanks(math(stem)); }

  function renderOptions(q) {
    var opts = q.options || [];
    return '<div class="pp-opts">' + opts.map(function (o, i) {
      var letter = String.fromCharCode(65 + i);
      return '<div class="pp-opt">' +
        '<span class="pp-opt-mark">' + letter + '.</span>' +
        '<span class="pp-opt-text">' + math(o) + '</span></div>';
    }).join('') + '</div>';
  }

  function renderMedia(q) {
    var m = q.media || {};
    if (m.type === 'svg' || m.type === 'svg-interactive') {
      return '<div class="pp-media">' + (m.content || '') + '</div>';
    }
    return '';
  }

  function renderStudentQuestion(q, num) {
    var inner = '<div class="pp-stem">' + stemHtml(q.stem) + '</div>';
    if (q.type === 'choice') {
      inner += renderOptions(q);
    } else if (q.type === 'judge') {
      inner += '<div class="pp-judge-line">（ &nbsp; ）&nbsp;&nbsp;正确（ &nbsp; ）&nbsp;&nbsp;错误（ &nbsp; ）</div>';
    } else if (q.type === 'figure' || q.type === 'figure-interactive') {
      inner += renderMedia(q);
    } else if (q.type === 'draw') {
      inner += '<div class="pp-draw"></div>';
    } else if (q.type === 'reading') {
      var subs = (q.answer && q.answer.subs) || [];
      inner += '<div class="pp-subs">' + subs.map(function (s) {
        return '<div class="pp-sub"><span class="pp-sub-label">' + esc(s.label) + '</span>' +
          '<span class="pp-sub-text">' + math(s.text) + '</span></div>';
      }).join('') + '</div>';
    } else if (q.type === 'calculation' || q.type === 'application') {
      inner += '<div class="pp-lines">' +
        '<div class="pp-line"></div><div class="pp-line"></div><div class="pp-line"></div>' +
        '</div>';
    }
    var score = (q.paperScore != null) ? q.paperScore : q.score;
    return '<div class="pp-q">' +
      '<div class="pp-q-head">' +
      '<span class="pp-q-num">' + num + '.</span>' +
      '<span class="pp-q-score">（' + esc(score) + ' 分）</span>' +
      '</div>' + inner + '</div>';
  }

  function renderHeader(paper) {
    var title = paper.title || '数学试卷';
    var total = (paper.totalScore != null) ? paper.totalScore : '';
    var dur = (paper.duration != null) ? paper.duration : '';
    return '<table class="pp-head">' +
      '<tr><td class="pp-title" colspan="4">' + esc(title) + '</td></tr>' +
      '<tr>' +
      '<td>学校：__________</td>' +
      '<td>班级：__________</td>' +
      '<td>姓名：__________</td>' +
      '<td>学号：__________</td>' +
      '</tr>' +
      '<tr>' +
      '<td>得分：__________ / ' + esc(total) + ' 分</td>' +
      '<td colspan="2">时间：' + esc(dur) + ' 分钟</td>' +
      '<td>满分：' + esc(total) + ' 分</td>' +
      '</tr>' +
      '</table>';
  }

  function groupByType(paper) {
    var groups = {};
    (paper.questions || []).forEach(function (q) {
      (groups[q.type] = groups[q.type] || []).push(q);
    });
    var result = [];
    TYPE_ORDER.forEach(function (t) {
      if (groups[t] && groups[t].length) {
        result.push({ type: t, name: TYPE_NAME[t] || t, items: groups[t] });
      }
    });
    Object.keys(groups).forEach(function (t) {
      if (TYPE_ORDER.indexOf(t) < 0) {
        result.push({ type: t, name: TYPE_NAME[t] || t, items: groups[t] });
      }
    });
    return result;
  }

  function renderStudent(paper) {
    var groups = groupByType(paper);
    var num = 0;
    var html = '<div class="pp-student">' + renderHeader(paper);
    groups.forEach(function (g, gi) {
      var scoreSum = g.items.reduce(function (s, q) {
        return s + ((q.paperScore != null) ? q.paperScore : q.score);
      }, 0);
      html += '<div class="pp-section">' +
        '<div class="pp-section-head">' + (CN_NUM[gi] || (gi + 1)) + '、' +
        esc(g.name) + '（共 ' + g.items.length + ' 题，' + scoreSum + ' 分）</div>';
      g.items.forEach(function (q) {
        num++;
        html += renderStudentQuestion(q, num);
      });
      html += '</div>';
    });
    html += '<div class="pp-foot">— 共 ' + num + ' 题 —</div></div>';
    return html;
  }

  function ansWithUnit(a) {
    if (a.value == null) return '';
    return '' + a.value + (a.unit ? (' ' + a.unit) : '');
  }

  function formatAnswer(q) {
    var a = q.answer || {};
    switch (q.type) {
      case 'choice':
        return (a.index || []).map(function (i) { return String.fromCharCode(65 + i); }).join('、');
      case 'judge':
        return a.value === true ? '正确' : (a.value === false ? '错误' : '');
      case 'fill':
        return (a.blanks || []).map(function (x) { return '' + x; }).join('、');
      case 'calculation':
        return ansWithUnit(a) + (a.unit && a.tolerance != null ? '（误差±' + a.tolerance + '）' : '');
      case 'application':
        return (a.blanks || []).map(function (x) { return '' + x; }).join('、');
      case 'figure':
        return ansWithUnit(a) + (a.tolerance != null ? '（误差±' + a.tolerance + '）' : '');
      case 'figure-interactive':
        return '在图中标出：' + (a.regions || []).join('、');
      case 'draw':
        return a.manual ? ('（作图题，教师批改）' + (a.rubric ? ' 评分要点：' + a.rubric : '')) : '';
      case 'reading':
        return (a.subs || []).map(function (s) {
          var v = (s.answer && s.answer.value != null) ? s.answer.value : '';
          var u = (s.answer && s.answer.unit) ? (' ' + s.answer.unit) : '';
          return esc(s.label) + ' ' + v + u;
        }).join('；');
      default:
        return '';
    }
  }

  function renderAnswer(paper, bare) {
    var groups = groupByType(paper);
    var num = 0;
    var html = '<div class="pp-answer-wrap"><div class="pp-answer-title">参考答案</div>' +
      '<div class="pp-answer">';
    groups.forEach(function (g) {
      g.items.forEach(function (q) {
        num++;
        var ans = formatAnswer(q);
        var line = '<div class="pp-ans-item"><b>' + num + '.</b> 答案：' + esc(ans);
        if (!bare && q.analysis) line += '　解析：' + math(q.analysis);
        line += '</div>';
        html += line;
      });
    });
    html += '</div></div>';
    return html;
  }

  /* 主入口 */
  function render(paper, mode, opts) {
    opts = opts || {};
    mode = mode || 'student';
    if (mode === 'answer') return renderAnswer(paper, opts.bare);
    if (mode === 'teacher') {
      return renderStudent(paper) +
        '<div class="pp-pagebreak"></div>' +
        renderAnswer(paper, opts.bare);
    }
    return renderStudent(paper);
  }

  MX.PaperPrint = {
    render: render,
    formatAnswer: formatAnswer,
    groupByType: groupByType,
    TYPE_NAME: TYPE_NAME
  };
})(window);
