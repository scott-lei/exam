/* ============================================================
 * MX.Migrate —— 历史数据一次性迁移（卡 3：主键由序号式切换为 slug 式）
 *
 * 触发：页面加载时自动运行一次（在 Shell.mount 之前）。
 * 作用：把 localStorage 中旧序号主键（legacyId）改写为新 slug 主键（id）。
 *       - 旧考试记录 / 错题本 / 答题进度 / 保存的试卷 中的 qid、point 引用
 *       - 注意：stored 的 answers / flags 是「以 qid 为键」的对象，键也要改写
 * 安全：
 *       - 写入前先整份快照到 math_exam_backup_v2（可回滚）
 *       - 幂等：math_exam_migrated_v2 置位后不再执行
 *       - 若没有映射表 / 无旧数据，直接跳过，绝不破坏现有数据
 * ============================================================ */
(function (global) {
  'use strict';

  var FLAG = 'math_exam_migrated_v2';
  var BACKUP = 'math_exam_backup_v2';
  var SCHEMA = 'math_exam_schema_version';

  /** 深遍历：把字符串值、以及对象的键，凡是命中旧 id 的都改写为新 id */
  function transform(node, map) {
    if (Array.isArray(node)) return node.map(function (v) { return transform(v, map); });
    if (node && typeof node === 'object') {
      var out = {};
      Object.keys(node).forEach(function (k) {
        var nk = map[k] || k; // 旧 qid / point 作为对象键时也要改写
        out[nk] = transform(node[k], map);
      });
      return out;
    }
    if (typeof node === 'string') return map[node] || node;
    return node;
  }

  /** 合并映射表（point + question） */
  function buildMap() {
    var M = (global.MX && global.MX.MIGRATE_MAP) || null;
    if (!M) return null;
    var map = {};
    if (M.points) Object.keys(M.points).forEach(function (k) { map[k] = M.points[k]; });
    if (M.questions) Object.keys(M.questions).forEach(function (k) { map[k] = M.questions[k]; });
    // 自反保护：若新 id 恰好也出现在旧键集合里（不应发生），跳过以免死循环
    return map;
  }

  function ls() { return global.localStorage; }

  /** 浏览器端执行迁移 */
  function run() {
    try {
      var store = ls();
      if (!store) return;
      if (store.getItem(FLAG)) return; // 已迁移，幂等退出

      var map = buildMap();
      if (!map || !Object.keys(map).length) return; // 无映射表，安全跳过

      // 1) 备份当前所有 math_exam_* 数据
      var keys = [];
      for (var i = 0; i < store.length; i++) {
        var k = store.key(i);
        if (k && k.indexOf('math_exam') === 0 && k !== FLAG && k !== BACKUP && k !== SCHEMA) keys.push(k);
      }
      var snapshot = {};
      keys.forEach(function (k) { snapshot[k] = store.getItem(k); });
      store.setItem(BACKUP, JSON.stringify({ ts: Date.now(), v: 2, data: snapshot }));

      // 2) 逐键迁移
      var migrated = 0;
      keys.forEach(function (k) {
        var raw = store.getItem(k);
        if (!raw) return;
        try {
          var obj = JSON.parse(raw);
          var next = transform(obj, map);
          if (JSON.stringify(next) !== raw) {
            store.setItem(k, JSON.stringify(next));
            migrated++;
          }
        } catch (e) { /* 单键解析失败不阻断其它键 */ }
      });

      // 3) 写迁移标记与 schema 版本
      store.setItem(FLAG, '1');
      store.setItem(SCHEMA, '2');

      if (migrated > 0) {
        console.info('[Migrate] 已迁移 ' + migrated + ' 项 localStorage 数据（旧序号主键 -> slug 主键），备份见 ' + BACKUP);
      } else {
        console.info('[Migrate] 未发现需要迁移的旧版数据（已置迁移标记）');
      }
    } catch (e) {
      console.warn('[Migrate] 迁移跳过：', e && e.message);
    }
  }

  global.MX = global.MX || {};
  global.MX.Migrate = {
    run: run,
    transform: transform,
    buildMap: buildMap
  };

  // 页面加载时自动运行（同步、在 DOMContentLoaded / Shell.mount 之前）
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    run();
  }
})(typeof window !== 'undefined' ? window : globalThis);
