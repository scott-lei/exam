/* ============================================================
 * MX.Storage —— 本地存储层（可替换实现）
 * 默认使用 localStorage；如需要，可整体替换为 IndexedDB / 云存储。
 *
 * 卡 4 改造要点：
 *   1) 试卷瘦身：savePaper 只存元数据 + questionIds + paperScores，不再存整卷 questions；
 *      getPaper(id) 用 MX.Bank.getMany 回查题目重新拼装（兼容旧格式 paper.questions）。
 *   2) 版本信封：所有写入统一包成 { v: 2, data: ... }；read() 兼容旧裸 JSON 并自动升级。
 *   3) 容量监控：getUsage() 遍历自身 key、统计字节数并排序，超过 3.5MB 在 Shell 上提示。
 *   4) 清理：clearOldRecords(days=180) 清理超期记录与已完成（submitted）的进度。
 *
 * 键名约定：
 *   math_exam_records   考试记录
 *   math_exam_wrong     错题本
 *   math_exam_progress_* 答题进度
 *   math_exam_settings  用户设置
 *   math_exam_history   历史成绩（趋势）
 *   math_exam_papers    保存的试卷（已瘦身）
 * ============================================================ */
(function (global) {
  'use strict';

  var STORAGE_VERSION = 2;          // 存储信封版本
  var USAGE_LIMIT = 3.5 * 1024 * 1024; // 3.5MB 告警阈值
  var usageWarned = false;          // 同一次会话内只提示一次

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

  /* ---------------- 版本信封读写 ---------------- */
  /** UTF-8 字节长度（用于精确的容量统计） */
  function byteLen(s) {
    try { return unescape(encodeURIComponent(String(s))).length; } catch (e) { return String(s).length; }
  }

  /** 读取：自动解信封；遇到旧裸 JSON 则原地升级为信封（幂等） */
  function read(key, fallback) {
    var raw = safeGet(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    var v;
    try { v = JSON.parse(raw); } catch (e) {
      console.warn('[Storage] 解析失败，已忽略：', key, e);
      return fallback;
    }
    // 版本信封：{ v: <number>, data: <any> }
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.v === 'number' && 'data' in v) {
      return v.data === null ? fallback : v.data;
    }
    // 旧裸格式：自动升级为信封（下次读取即命中信封，避免重复升级）
    try { write(key, v); } catch (e) { /* 升级失败不影响本次读取 */ }
    return v === null ? fallback : v;
  }

  /** 写入：统一包成版本信封 { v: 2, data: value } */
  function write(key, value) {
    try {
      safeSet(key, JSON.stringify({ v: STORAGE_VERSION, data: value }));
      return true;
    } catch (e) {
      console.warn('[Storage] 写入失败（可能超出本地存储上限）：', key, e);
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || 'X') + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  var api = {
    KEYS: KEYS,
    STORAGE_VERSION: STORAGE_VERSION,
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

    /* ---------------- 保存的试卷（已瘦身） ---------------- */
    getPapers: function () { return read(KEYS.PAPERS, []); },
    /**
     * 保存试卷：只存元数据 + questionIds + paperScores，不再存整卷 questions。
     * 兼容两种传入形态：{ ...meta, paper: <整卷> } 或直接传整卷对象。
     */
    savePaper: function (paper) {
      var full = (paper && paper.paper) || paper || {};
      var qs = full.questions || [];
      var slim = {
        id: paper && paper.id != null ? paper.id : full.id,
        examId: full.examId || full.id,
        title: paper && paper.title != null ? paper.title : full.title,
        createdAt: paper && paper.createdAt != null ? paper.createdAt : (full.createdAt || Date.now()),
        count: paper && paper.count != null ? paper.count : qs.length,
        totalScore: paper && paper.totalScore != null ? paper.totalScore : full.totalScore,
        duration: full.duration,
        stats: full.stats,
        config: paper && paper.config != null ? paper.config : full.config,
        questionIds: qs.map(function (q) { return q.id; }),          // 仅存题目 id
        paperScores: qs.map(function (q) { return (q.paperScore != null ? q.paperScore : q.score); })
      };
      var list = api.getPapers().filter(function (p) { return p.id !== slim.id; });
      list.unshift(slim);
      write(KEYS.PAPERS, list.slice(0, 50));
      return slim;
    },
    /**
     * 取回完整试卷：新格式按 questionIds 用 MX.Bank.getMany 回查拼装；
     * 旧格式（paper.questions 存在）直接返回，保证兼容。
     * 拼装时会还原 paperIndex 与 paperScore（题序与题分）。
     * @returns {Promise<object|null>}
     */
    getPaper: async function (id) {
      var list = api.getPapers();
      var entry = null;
      for (var i = 0; i < list.length; i++) { if (list[i].id === id) { entry = list[i]; break; } }
      if (!entry) return null;
      // 旧格式：嵌套 paper 含整卷 questions
      if (entry.paper && entry.paper.questions && entry.paper.questions.length) return entry.paper;
      // 旧格式：扁平 questions
      if (entry.questions && entry.questions.length) return entry;
      // 新格式：根据 questionIds 回查题库重新拼装
      if (!entry.questionIds || !entry.questionIds.length) return null;
      var qs = await global.MX.Bank.getMany(entry.questionIds);
      var scores = entry.paperScores || [];
      var byId = {};
      (qs || []).forEach(function (q) { byId[q.id] = q; });
      var questions = entry.questionIds.map(function (qid, i) {
        var q = byId[qid];
        if (!q) return null;
        var item = Object.assign({}, q, { paperIndex: i + 1 });
        if (scores[i] != null) item.paperScore = scores[i];
        return item;
      }).filter(Boolean);
      return Object.assign({}, entry, { questions: questions });
    },
    removePaper: function (id) {
      write(KEYS.PAPERS, api.getPapers().filter(function (p) { return p.id !== id; }));
    },

    /* ---------------- 容量监控 ---------------- */
    /**
     * 统计自身（math_exam*）键的占用字节数，按从大到小排序。
     * 超过 3.5MB 时在 Shell 上提示「本地存储接近上限，建议导出备份后清理旧记录」。
     * @returns {{items:Array<{key:string,bytes:number}>, total:number, totalMB:number, over:boolean, limitMB:number}}
     */
    getUsage: function () {
      var items = driver.keys()
        .filter(function (k) { return k.indexOf('math_exam') === 0; })
        .map(function (k) {
          var v = safeGet(k) || '';
          return { key: k, bytes: byteLen(k) + byteLen(v) };
        })
        .sort(function (a, b) { return b.bytes - a.bytes; });
      var total = items.reduce(function (s, it) { return s + it.bytes; }, 0);
      var over = total > USAGE_LIMIT;
      if (over && !usageWarned) {
        usageWarned = true;
        try {
          if (global.MX && global.MX.Toast && global.MX.Toast.warn) {
            global.MX.Toast.warn('本地存储接近上限，建议导出备份后清理旧记录');
          }
        } catch (e) { /* 非浏览器环境忽略 */ }
      }
      return {
        items: items,
        total: total,
        totalMB: +(total / (1024 * 1024)).toFixed(2),
        over: over,
        limitMB: 3.5
      };
    },
    /** 估算占用空间（字节，旧接口，保留兼容） */
    usage: function () {
      var n = 0;
      driver.keys().forEach(function (k) {
        var v = safeGet(k);
        if (v) n += k.length + v.length;
      });
      return n;
    },

    /* ---------------- 清理超期数据 ---------------- */
    /**
     * 清理超期考试记录与「已完成（submitted）」的答题进度。
     * @param {number} [days=180] 记录超期天数阈值
     * @returns {{removedRecords:number, removedProgress:number}}
     */
    clearOldRecords: function (days) {
      days = days || 180;
      var cutoff = Date.now() - days * 86400000;
      var recs = api.getRecords();
      var removedRecords = recs.filter(function (r) { return (r.ts || 0) < cutoff; }).length;
      if (removedRecords) {
        write(KEYS.RECORDS, recs.filter(function (r) { return (r.ts || 0) >= cutoff; }));
      }
      var progs = api.listProgress().filter(function (p) { return p && p.submitted; });
      var removedProgress = progs.length;
      progs.forEach(function (p) { api.clearProgress(p.examId); });
      return { removedRecords: removedRecords, removedProgress: removedProgress };
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
    }
  };

  global.MX = global.MX || {};
  global.MX.Storage = api;
})(window);
