/* ============================================================
 * page-print.js —— 独立打印页入口
 * 从 localStorage 读取 math_exam_print_job（组卷中心写入的试卷对象），
 * 按地址栏 ?mode= / ?bare= 渲染，等字体就绪后自动调起打印。
 *   ?mode=student  学生版（默认）
 *   ?mode=teacher  教师版（学生版 + 答案页）
 *   ?mode=answer   答案页
 *   ?bare=1        答案页不输出解析
 * ============================================================ */
(function () {
  'use strict';

  var JOB_KEY = 'math_exam_print_job';

  function param(name) {
    try { return new URLSearchParams(location.search).get(name); }
    catch (e) { return null; }
  }

  function showError(msg) {
    var root = document.getElementById('print-root');
    if (root) {
      root.innerHTML = '<div class="pp-error">' + msg + '</div>' +
        '<div class="pp-error-tip">请先在「组卷中心」生成试卷，再点击「打印试卷 / 打印答案 / 打印教师版」。</div>';
    }
  }

  async function boot() {
    var mode = param('mode') || 'student';
    var bare = param('bare') === '1';

    var paper = null;
    try {
      paper = window.MX.Storage.read(JOB_KEY, null);
    } catch (e) { paper = null; }

    if (!paper || !paper.questions || !paper.questions.length) {
      showError('没有可打印的试卷。');
      return;
    }

    var root = document.getElementById('print-root');
    try {
      root.innerHTML = window.MX.PaperPrint.render(paper, mode, { bare: bare });
    } catch (e) {
      showError('卷面渲染失败：' + (e && e.message ? e.message : e));
      console.error(e);
      return;
    }

    // 工具栏按钮：手动再打印一次
    var btn = document.getElementById('pp-btn-print');
    if (btn) btn.addEventListener('click', function () { window.print(); });

    // 等字体（KaTeX / 系统字体）就绪，保证打印预览公式不乱码
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; }
    catch (e) { /* 忽略 */ }

    // 自动调起打印对话框
    window.print();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
