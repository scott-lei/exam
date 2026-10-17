/* ============================================================
 * MX.Shell —— 全站外壳：导航、设置抽屉、公共工具
 * ============================================================ */
(function (global) {
  'use strict';

  var PAGES = [
    { id: 'index', href: 'index.html', name: '首页', icon: '🏠' },
    { id: 'paper-builder', href: 'paper-builder.html', name: '组卷中心', icon: '🧩' },
    { id: 'exam', href: 'exam.html', name: '在线考试', icon: '✏️' },
    { id: 'report', href: 'report.html', name: '成绩报告', icon: '📊' },
    { id: 'wrongbook', href: 'wrongbook.html', name: '错题本', icon: '📕' }
  ];

  function fmtDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function fmtDateTime(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return fmtDate(ts) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m >= 60) {
      var h = Math.floor(m / 60);
      return h + ' 小时 ' + (m % 60) + ' 分';
    }
    return m + ' 分 ' + String(s).padStart(2, '0') + ' 秒';
  }
  function relTime(ts) {
    if (!ts) return '—';
    var diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' 天前';
    return fmtDate(ts);
  }

  /** 挂载页面外壳 */
  function mount(opts) {
    opts = opts || {};
    var current = opts.page || 'index';
    var settings = global.MX.Storage.getSettings();

    // 低年级大字版
    if (settings.bigFont) document.body.classList.add('big-font');

    // 顶部导航
    var header = document.getElementById('app-header');
    if (header) {
      header.innerHTML =
        '<div class="container nav-wrap">' +
        '<a class="brand" href="index.html">' +
        '<span class="brand-logo">＋－</span>' +
        '<span class="brand-text"><b>小学数学在线考试平台</b><em>12 册 · 378 考点 · 8 大题型</em></span>' +
        '</a>' +
        '<nav class="nav" id="main-nav">' +
        PAGES.map(function (p) {
          return '<a class="nav-link' + (p.id === current ? ' active' : '') + '" href="' + p.href + '" data-page="' + p.id + '">' +
            '<span class="nav-ico">' + p.icon + '</span><span>' + p.name + '</span></a>';
        }).join('') +
        '</nav>' +
        '<div class="nav-actions">' +
        '<button class="btn-icon" id="btn-bigfont" title="低年级大字版">Aa</button>' +
        '<button class="btn-icon" id="btn-settings" title="设置">⚙</button>' +
        '<button class="btn-icon nav-toggle" id="btn-nav-toggle" title="菜单">☰</button>' +
        '</div>' +
        '</div>';
      var toggle = document.getElementById('btn-nav-toggle');
      if (toggle) toggle.addEventListener('click', function () {
        document.getElementById('main-nav').classList.toggle('open');
      });
      document.getElementById('btn-settings').addEventListener('click', openSettings);
      var bf = document.getElementById('btn-bigfont');
      bf.classList.toggle('on', settings.bigFont);
      bf.addEventListener('click', function () {
        settings = global.MX.Storage.saveSettings({ bigFont: !settings.bigFont });
        document.body.classList.toggle('big-font', settings.bigFont);
        this.classList.toggle('on', settings.bigFont);
        global.MX.Toast.info(settings.bigFont ? '已开启大字版' : '已关闭大字版');
      });
    }

    // 页头
    var ph = document.getElementById('page-head');
    if (ph && (opts.title || opts.subtitle)) {
      ph.innerHTML =
        '<div class="container">' +
        (opts.breadcrumb ? '<div class="breadcrumb">' + opts.breadcrumb + '</div>' : '') +
        '<h1 class="page-title">' + (opts.title || '') + '</h1>' +
        (opts.subtitle ? '<p class="page-subtitle">' + opts.subtitle + '</p>' : '') +
        '<div id="page-head-actions" class="page-head-actions"></div>' +
        '</div>';
    }

    // 页脚
    var footer = document.getElementById('app-footer');
    if (footer) {
      var env = global.MX.Loader.env();
      footer.innerHTML =
        '<div class="container footer-wrap">' +
        '<div>小学数学在线考试平台 · 纯前端离线版</div>' +
        '<div class="footer-meta">' +
        '<span class="dot ' + (env.fileMode ? 'dot-warn' : 'dot-ok') + '"></span>' +
        (env.fileMode ? '本地文件模式（' + env.protocol + '）' : 'HTTP 服务模式（' + env.protocol + '）') +
        ' · 数据存储于浏览器 localStorage' +
        '</div>' +
        '</div>';
    }
    return { settings: settings, pages: PAGES };
  }

  /** 设置抽屉 */
  function openSettings() {
    var s = global.MX.Storage.getSettings();
    var mask = document.createElement('div');
    mask.className = 'drawer-mask';
    mask.innerHTML =
      '<aside class="drawer" role="dialog" aria-modal="true">' +
      '<header class="drawer-head"><h3>设置</h3><button class="btn-icon" data-act="close">×</button></header>' +
      '<div class="drawer-body">' +
      '<label class="switch-row"><span>低年级大字版</span><input type="checkbox" data-k="bigFont"' + (s.bigFont ? ' checked' : '') + '></label>' +
      '<label class="switch-row"><span>显示计时器</span><input type="checkbox" data-k="showTimer"' + (s.showTimer ? ' checked' : '') + '></label>' +
      '<label class="switch-row"><span>客观题作答后自动跳题</span><input type="checkbox" data-k="autoNext"' + (s.autoNext ? ' checked' : '') + '></label>' +
      '<label class="switch-row"><span>默认展开解析</span><input type="checkbox" data-k="showAnalysis"' + (s.showAnalysis ? ' checked' : '') + '></label>' +
      '<label class="switch-row"><span>组卷时打乱选项顺序</span><input type="checkbox" data-k="shuffleOptions"' + (s.shuffleOptions ? ' checked' : '') + '></label>' +
      '<div class="field"><label>昵称（用于成绩单）</label><input type="text" data-k="nickname" value="' + global.MX.Math.escapeHtml(s.nickname || '') + '" placeholder="请输入昵称"></div>' +
      '<hr class="sep">' +
      '<h4 class="drawer-sub">数据管理</h4>' +
      '<div class="drawer-btns">' +
      '<button class="btn btn-ghost btn-sm" data-act="export">导出备份</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="import">导入备份</button>' +
      '<button class="btn btn-danger btn-sm" data-act="clearall">清空全部数据</button>' +
      '</div>' +
      '<p class="muted small">当前占用约 ' + (global.MX.Storage.usage() / 1024).toFixed(1) + ' KB</p>' +
      '<hr class="sep">' +
      '<h4 class="drawer-sub">扩展能力</h4>' +
      '<p class="muted small">题型插件：' + global.MX.Plugins.list().map(function (p) { return p.name; }).join('、') + '</p>' +
      '<p class="muted small">媒体类型：' + global.MX.Media.types().join('、') + '</p>' +
      '<p class="muted small">AI 出题：' + (global.MX.AI.isReady() ? '已接入自定义 provider' : '未接入（当前为本地模板兜底）') + '</p>' +
      '</div></aside>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('in'); });

    function close() { mask.classList.remove('in'); setTimeout(function () { mask.remove(); }, 200); }
    mask.addEventListener('click', function (e) {
      if (e.target === mask || (e.target.getAttribute && e.target.getAttribute('data-act') === 'close')) return close();
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'export') {
        var bundle = global.MX.Storage.exportAll();
        var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'math-exam-backup-' + fmtDate(Date.now()) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        global.MX.Toast.ok('备份已导出');
      } else if (act === 'import') {
        var f = document.createElement('input');
        f.type = 'file'; f.accept = '.json,application/json';
        f.onchange = function () {
          var file = f.files[0]; if (!file) return;
          var r = new FileReader();
          r.onload = function () {
            try {
              global.MX.Storage.importAll(JSON.parse(r.result));
              global.MX.Toast.ok('备份导入成功，页面即将刷新');
              setTimeout(function () { location.reload(); }, 800);
            } catch (err) { global.MX.Toast.error('导入失败：' + err.message); }
          };
          r.readAsText(file);
        };
        f.click();
      } else if (act === 'clearall') {
        global.MX.Toast.confirm({ title: '清空全部数据', text: '将删除所有考试记录、错题本与答题进度，此操作不可恢复。确定继续？', danger: true, okText: '确定清空' })
          .then(function (yes) {
            if (!yes) return;
            global.MX.Storage.clearAll();
            global.MX.Toast.ok('已清空');
            setTimeout(function () { location.reload(); }, 600);
          });
      }
    });
    mask.addEventListener('change', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-k');
      if (!k) return;
      var val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      s = global.MX.Storage.saveSettings((function () { var o = {}; o[k] = val; return o; })());
      if (k === 'bigFont') document.body.classList.toggle('big-font', val);
      global.MX.Toast.ok('设置已保存');
    });
  }

  /** 空状态 */
  function emptyState(title, desc, actionHtml) {
    return '<div class="empty"><div class="empty-ico">🗂️</div><h3>' + title + '</h3><p>' + desc + '</p>' + (actionHtml || '') + '</div>';
  }

  /** 载入遮罩 */
  function loading(text) {
    var d = document.createElement('div');
    d.className = 'loading-mask';
    d.innerHTML = '<div class="loading-box"><span class="spinner"></span><span>' + (text || '加载中…') + '</span></div>';
    document.body.appendChild(d);
    return { close: function () { d.remove(); } };
  }

  global.MX = global.MX || {};
  global.MX.Shell = {
    PAGES: PAGES,
    mount: mount,
    openSettings: openSettings,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    fmtDuration: fmtDuration,
    relTime: relTime,
    emptyState: emptyState,
    loading: loading
  };
})(window);
