/* ============================================================
 * MX.Toast —— 轻提示 / 确认框
 * ============================================================ */
(function (global) {
  'use strict';

  function ensureRoot() {
    var root = document.getElementById('mx-toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'mx-toast-root';
      root.className = 'toast-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function show(msg, type, ms) {
    var root = ensureRoot();
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.innerHTML = '<span class="toast-ico">' + ({ info: 'ℹ', ok: '✓', warn: '!', err: '×' }[type || 'info'] || 'ℹ') + '</span><span>' + global.MX.Math.escapeHtml(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 260);
    }, ms || 2600);
    return el;
  }

  function confirmDialog(opts) {
    opts = typeof opts === 'string' ? { text: opts } : (opts || {});
    return new Promise(function (resolve) {
      var mask = document.createElement('div');
      mask.className = 'modal-mask';
      mask.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
        '<h3 class="modal-title">' + global.MX.Math.escapeHtml(opts.title || '请确认') + '</h3>' +
        '<div class="modal-body">' + global.MX.Math.toHtml(opts.text || '') + '</div>' +
        '<div class="modal-actions">' +
        '<button class="btn btn-ghost" data-act="cancel">' + global.MX.Math.escapeHtml(opts.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + global.MX.Math.escapeHtml(opts.okText || '确定') + '</button>' +
        '</div></div>';
      document.body.appendChild(mask);
      requestAnimationFrame(function () { mask.classList.add('in'); });
      function close(v) {
        mask.classList.remove('in');
        setTimeout(function () { mask.remove(); }, 200);
        resolve(v);
      }
      mask.addEventListener('click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (act) return close(act === 'ok');
        if (e.target === mask) close(false);
      });
    });
  }

  global.MX = global.MX || {};
  global.MX.Toast = {
    info: function (m, ms) { return show(m, 'info', ms); },
    ok: function (m, ms) { return show(m, 'ok', ms); },
    warn: function (m, ms) { return show(m, 'warn', ms); },
    error: function (m, ms) { return show(m, 'err', ms || 3600); },
    confirm: confirmDialog
  };
})(window);
