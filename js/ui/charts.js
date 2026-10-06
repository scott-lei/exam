/* ============================================================
 * MX.Charts —— ECharts 封装（本地 vendor，离线可用）
 * 提供：雷达图、柱状图、折线图、饼图/环形图
 * ECharts 不可用时降级为「表格 + 提示」，保证报告页不空白
 * ============================================================ */
(function (global) {
  'use strict';

  var charts = [];
  var PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#a855f7', '#14b8a6', '#f97316', '#6366f1'];
  var LIGHT = {
    text: '#1e293b', sub: '#64748b', axis: '#cbd5e1', split: '#eef2f7', bg: '#ffffff'
  };

  function available() { return !!(global.echarts && typeof global.echarts.init === 'function'); }

  function init(dom) {
    if (!dom) return null;
    if (!available()) return null;
    // 已存在则复用
    var found = charts.filter(function (c) { return c.dom === dom; })[0];
    if (found) return found.inst;
    var inst = global.echarts.init(dom, null, { renderer: 'canvas' });
    charts.push({ dom: dom, inst: inst });
    autoResize(dom, inst);
    return inst;
  }

  function autoResize(dom, inst) {
    if (global.ResizeObserver) {
      var ro = new ResizeObserver(function () { try { inst.resize(); } catch (e) { } });
      ro.observe(dom);
      charts[charts.length - 1].ro = ro;
    } else {
      global.addEventListener('resize', function () { try { inst.resize(); } catch (e) { } });
    }
  }

  function disposeAll() {
    charts.forEach(function (c) {
      try { c.ro && c.ro.disconnect(); c.inst.dispose(); } catch (e) { }
    });
    charts = [];
  }

  function fallback(dom, data, message) {
    if (!dom) return;
    dom.innerHTML = '<div class="chart-fallback"><p class="muted">' + global.MX.Math.escapeHtml(message || '图表库未加载，已降级为数据表。') + '</p>' +
      '<table class="data-table"><thead><tr><th>项目</th><th>数值</th></tr></thead><tbody>' +
      (data || []).map(function (d) {
        return '<tr><td>' + global.MX.Math.escapeHtml(d.name) + '</td><td>' + global.MX.Math.escapeHtml(String(d.value)) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  var baseTextStyle = { color: LIGHT.text, fontFamily: 'system-ui, -apple-system, "Microsoft YaHei", sans-serif', fontSize: 13 };
  var tooltip = {
    trigger: 'item',
    backgroundColor: 'rgba(255,255,255,.97)',
    borderColor: '#dbeafe',
    borderWidth: 1,
    textStyle: { color: LIGHT.text, fontSize: 13 },
    extraCssText: 'border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:10px 12px;'
  };

  /** 雷达图：多维度掌握度 */
  function radar(dom, indicators, series, opts) {
    opts = opts || {};
    var inst = init(dom);
    if (!inst) return fallback(dom, indicators.map(function (i, k) {
      return { name: i.name, value: (series[0] && series[0].data[k]) || 0 };
    }), '图表库未加载');
    inst.setOption({
      color: PALETTE,
      textStyle: baseTextStyle,
      tooltip: Object.assign({}, tooltip, { trigger: 'item' }),
      legend: series.length > 1 ? { bottom: 0, textStyle: { color: LIGHT.sub } } : { show: false },
      radar: {
        center: ['50%', '52%'],
        radius: opts.radius || '66%',
        indicator: indicators,
        axisName: { color: LIGHT.sub, fontSize: 12 },
        splitLine: { lineStyle: { color: LIGHT.split } },
        splitArea: { areaStyle: { color: ['rgba(59,130,246,.03)', 'rgba(59,130,246,.07)'] } },
        axisLine: { lineStyle: { color: LIGHT.axis } }
      },
      series: [{
        type: 'radar',
        symbolSize: 5,
        areaStyle: { opacity: 0.22 },
        lineStyle: { width: 2.4 },
        data: series
      }],
      animationDuration: 700
    }, true);
    return inst;
  }

  /** 柱状图 */
  function bar(dom, categories, values, opts) {
    opts = opts || {};
    var inst = init(dom);
    if (!inst) return fallback(dom, categories.map(function (c, i) { return { name: c, value: values[i] }; }));
    inst.setOption({
      color: opts.colors || PALETTE,
      textStyle: baseTextStyle,
      grid: { left: opts.padLeft || 40, right: 20, top: 30, bottom: opts.padBottom || 46, containLabel: true },
      tooltip: Object.assign({}, tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
      xAxis: {
        type: 'category', data: categories,
        axisLine: { lineStyle: { color: LIGHT.axis } },
        axisLabel: { color: LIGHT.sub, interval: 0, rotate: opts.rotate || 0 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', name: opts.yName || '',
        nameTextStyle: { color: LIGHT.sub },
        splitLine: { lineStyle: { color: LIGHT.split } },
        axisLabel: { color: LIGHT.sub }
      },
      series: [{
        type: 'bar',
        data: values.map(function (v, i) {
          return { value: v, itemStyle: { color: (opts.colors || PALETTE)[i % (opts.colors || PALETTE).length], borderRadius: [8, 8, 0, 0] } };
        }),
        barMaxWidth: opts.barMaxWidth || 44,
        label: { show: true, position: 'top', color: LIGHT.text, fontSize: 12, fontWeight: 600 }
      }],
      animationDuration: 700
    }, true);
    return inst;
  }

  /** 折线图（趋势） */
  function line(dom, categories, series, opts) {
    opts = opts || {};
    var inst = init(dom);
    if (!inst) return fallback(dom, categories.map(function (c, i) { return { name: c, value: (series[0].data[i]) }; }));
    inst.setOption({
      color: opts.colors || PALETTE,
      textStyle: baseTextStyle,
      grid: { left: 40, right: 24, top: 30, bottom: 40, containLabel: true },
      tooltip: Object.assign({}, tooltip, { trigger: 'axis' }),
      legend: series.length > 1 ? { top: 0, textStyle: { color: LIGHT.sub } } : { show: false },
      xAxis: {
        type: 'category', boundaryGap: false, data: categories,
        axisLine: { lineStyle: { color: LIGHT.axis } },
        axisLabel: { color: LIGHT.sub },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', name: opts.yName || '',
        nameTextStyle: { color: LIGHT.sub },
        splitLine: { lineStyle: { color: LIGHT.split } },
        axisLabel: { color: LIGHT.sub }
      },
      series: series.map(function (s) {
        return Object.assign({
          type: 'line',
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3 },
          areaStyle: { opacity: 0.12 }
        }, s);
      }),
      animationDuration: 700
    }, true);
    return inst;
  }

  /** 环形图（占比） */
  function donut(dom, data, opts) {
    opts = opts || {};
    var inst = init(dom);
    if (!inst) return fallback(dom, data);
    inst.setOption({
      color: opts.colors || PALETTE,
      textStyle: baseTextStyle,
      tooltip: Object.assign({}, tooltip, { trigger: 'item', formatter: '{b}：{c}（{d}%）' }),
      legend: { bottom: 0, icon: 'circle', textStyle: { color: LIGHT.sub } },
      series: [{
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
        label: opts.label === false ? { show: false } : { color: LIGHT.text, fontWeight: 600, formatter: '{b}\n{d}%' },
        data: data
      }],
      animationDuration: 700
    }, true);
    return inst;
  }

  global.MX = global.MX || {};
  global.MX.Charts = {
    available: available,
    radar: radar,
    bar: bar,
    line: line,
    donut: donut,
    disposeAll: disposeAll,
    palette: PALETTE
  };
})(window);
