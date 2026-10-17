/* ============================================================
 * MX.Storage —— 本地存储层（可替换实现）
 * 默认使用 localStorage；如需要，可整体替换为 IndexedDB / 云存储。
 * 键名约定：
 *   math_exam_records   考试记录
 *   math_exam_wrong     错题本
 *   math_exam_progress_* 答题进度
 *   math_exam_settings  用户设置
 *   math_exam_history   历史成绩（趋势）
 *   math_exam_papers    保存的试卷
 * ============================================================ */
(function (global) {
  'use strict';

  var KEYS = {
    RECORDS: 'math_exam_records',
    WRONG: 'math_exam_wrong',
    PROGRESS: 'math_exam_progress_', // + examId
    SETTINGS: 'math_exam_settings',
    HISTORY: 'math_exam_history',
    PAPERS: 'math_exam_papers'
  };

  var DEFAULTS = {
    bigFont: false,          // 低年级大字版
    autoNext: true,          // 客观题作答后自动跳下一题
    showTimer: true,
    showAnalysis: true,
    soundOn: false,
    perPage: 1,              // 每页题数：1 / 5 / 全部
    shuffleOptions: false,
    nickname: ''
  };

  // ---- 后端适配点：替换 driver 即可切换存储介质 ----
  var driver = {
    get: function (k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { global.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove: function (k) { try { global.localStorage.removeItem(k); } catch (e) { } },
    keys: function () {
      var out = [];
      try {
        for (var i = 0; i < global.localStorage.length; i++) out.push(global.localStorage.key(i));
      } catch (e) { }
      return out;
    }
  };

  var memoryFallback = {};

  function safeGet(key) {
    var raw = driver.get(key);
    if (raw === null && memoryFallback[key] !== undefined) return memoryFallback[key];
    return raw;
  }
  function safeSet(key, raw) {
    memoryFallback[key] = raw;
    return driver.set(key, raw);
  }

  function read(key, fallback) {
    var raw = safeGet(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    try {
      var v = JSON.parse(raw);
      return v === null ? fallback : v;
    } catch (e) {
      console.warn('[Storage] 解析失败，已忽略：', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      safeSet(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Storage] 写入失败：', key, e);
      return false;
    }
  }

  var uid = function (prefix) {
    return (prefix || 'X') + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();
  };

  var api = {
    KEYS: KEYS,
    uid: uid,
    /** 替换存储驱动（扩展能力：存储可替换） */
    useDriver: function (d) { driver = Object.assign({}, driver, d); },
    read: read,
    write: write,
    remove: function (k) { driver.remove(k); delete memoryFallback[k]; },

    /* ---------------- 用户设置 ---------------- */
    getSettings: function () {
      return Object.assign({}, DEFAULTS, read(KEYS.SETTINGS, {}));
    },
    saveSettings: function (patch) {
      var s = Object.assign(api.getSettings(), patch || {});
      write(KEYS.SETTINGS, s);
      return s;
    },

    /* ---------------- 考试记录 ---------------- */
    getRecords: function () { return read(KEYS.RECORDS, []); },
    addRecord: function (rec) {
      var list = api.getRecords();
      list.unshift(rec);
      if (list.length > 200) list = list.slice(0, 200);
      write(KEYS.RECORDS, list);
      return rec;
    },
    getRecord: function (id) {
      return api.getRecords().filter(function (r) { return r.id === id; })[0] || null;
    },
    clearRecords: function () { write(KEYS.RECORDS, []); },

    /* ---------------- 历史成绩（趋势） ---------------- */
    getHistory: function () { return read(KEYS.HISTORY, []); },
    addHistory: function (h) {
      var list = api.getHistory();
      list.push(h);
      if (list.length > 300) list = list.slice(-300);
      write(KEYS.HISTORY, list);
      return h;
    },

    /* ---------------- 错题本 ---------------- */
    getWrong: function () { return read(KEYS.WRONG, []); },
    saveWrong: function (list) { return write(KEYS.WRONG, list); },
    /** 记录一道错题（已存在则累加次数） */
    pushWrong: function (item) {
      var list = api.getWrong();
      var found = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].qid === item.qid) { found = list[i]; break; }
      }
      if (found) {
        found.times = (found.times || 1) + 1;
        found.lastWrongTs = item.ts;
        found.myAnswer = item.myAnswer;
        found.mastered = false;
      } else {
        list.unshift(Object.assign({ times: 1, mastered: false, addedTs: item.ts }, item));
      }
      api.saveWrong(list);
      return list;
    },
    removeWrong: function (qid) {
      var list = api.getWrong().filter(function (w) { return w.qid !== qid; });
      api.saveWrong(list);
      return list;
    },
    setWrongMastered: function (qid, mastered) {
      var list = api.getWrong();
      list.forEach(function (w) { if (w.qid === qid) w.mastered = !!mastered; });
      api.saveWrong(list);
      return list;
    },
    clearWrong: function () { api.saveWrong([]); },
    findWrongByBook: function (bookId) {
      return api.getWrong().filter(function (w) { return w.book === bookId; });
    },

    /* ---------------- 答题进度（断点续考） ---------------- */
    progressKey: function (examId) { return KEYS.PROGRESS + examId; },
    getProgress: function (examId) { return read(api.progressKey(examId), null); },
    saveProgress: function (examId, data) { return write(api.progressKey(examId), data); },
    clearProgress: function (examId) { api.remove(api.progressKey(examId)); },
    listProgress: function () {
      return driver.keys()
        .filter(function (k) { return k.indexOf(KEYS.PROGRESS) === 0; })
        .map(function (k) { return read(k, null); })
        .filter(Boolean)
        .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    },

    /* ---------------- 保存的试卷 ---------------- */
    getPapers: function () { return read(KEYS.PAPERS, []); },
    savePaper: function (paper) {
      var list = api.getPapers().filter(function (p) { return p.id !== paper.id; });
      list.unshift(paper);
      write(KEYS.PAPERS, list.slice(0, 50));
      return paper;
    },
    removePaper: function (id) {
      write(KEYS.PAPERS, api.getPapers().filter(function (p) { return p.id !== id; }));
    },

    /* ---------------- 备份 / 恢复 ---------------- */
    exportAll: function () {
      var out = {};
      driver.keys().forEach(function (k) {
        if (k.indexOf('math_exam') === 0) out[k] = safeGet(k);
      });
      Object.keys(memoryFallback).forEach(function (k) { if (out[k] === undefined) out[k] = memoryFallback[k]; });
      return { version: 1, exportedAt: new Date().toISOString(), data: out };
    },
    importAll: function (bundle) {
      if (!bundle || !bundle.data) throw new Error('备份文件格式不正确');
      Object.keys(bundle.data).forEach(function (k) { safeSet(k, bundle.data[k]); });
      return true;
    },
    clearAll: function () {
      driver.keys().forEach(function (k) { if (k.indexOf('math_exam') === 0) driver.remove(k); });
      memoryFallback = {};
    },
    /** 估算占用空间（字节） */
    usage: function () {
      var n = 0;
      driver.keys().forEach(function (k) {
        var v = safeGet(k);
        if (v) n += k.length + v.length;
      });
      return n;
    }
  };

  global.MX = global.MX || {};
  global.MX.Storage = api;
})(window);
