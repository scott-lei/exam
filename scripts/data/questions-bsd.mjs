// 北师大版题库源（卡 10 起建设，按册增量补充）
// 与人教版 questions-*.mjs 的区别：p 字段使用考点 slug（与 data/tags-bsd.json 一致）。
// 题型答案格式、字段结构与 questions-lower.mjs 完全相同，由 build-questions.mjs 统一构建。
import {
  svgCircles, svgClock, svgBars, svgPolygon,
  svgGrid, svgRuler, svgPickable, C,
} from './svg.mjs';

// svg.mjs 未导出 wrap，这里补一个本地小图包装器，供自绘题图使用
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const FONT = 'font-family="system-ui"';
const fig = (w, h, body) => ({
  type: 'svg', width: w, height: h,
  content: `<svg ${NS} viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="max-width:100%;height:auto">${body}</svg>`,
});
const dot = (cx, cy, fill, stroke) =>
  `<circle cx="${cx}" cy="${cy}" r="16" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;

// B2：两组圆点比多少（左 4 个苹果 / 右 7 个梨）
const applePear = fig(360, 210,
  `<text x="57" y="24" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}" ${FONT}>苹果</text>` +
  `<text x="268" y="24" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}" ${FONT}>梨</text>` +
  dot(30, 60, C.blueSoft, C.blue) + dot(84, 60, C.blueSoft, C.blue) +
  dot(30, 108, C.blueSoft, C.blue) + dot(84, 108, C.blueSoft, C.blue) +
  dot(200, 60, C.greenSoft, C.green) + dot(248, 60, C.greenSoft, C.green) +
  dot(296, 60, C.greenSoft, C.green) + dot(336, 60, C.greenSoft, C.green) +
  dot(224, 108, C.greenSoft, C.green) + dot(272, 108, C.greenSoft, C.green) +
  dot(320, 108, C.greenSoft, C.green)
);

// D4：混合图形数圆（圆 ×3 / 三角形 ×2 / 正方形 ×2）
const shapeMix = fig(340, 170,
  `<circle cx="45" cy="55" r="20" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<circle cx="105" cy="55" r="20" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<circle cx="45" cy="115" r="20" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<polygon points="175,38 200,78 150,78" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<polygon points="235,38 260,78 210,78" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="280" y="38" width="40" height="40" rx="4" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` +
  `<rect x="280" y="95" width="40" height="40" rx="4" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>`
);

// F6：「点击所有的球」交互题（球 ×2 / 长方体 / 圆柱）
const ballSvg = (cx, cy, r) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(r * 0.34).toFixed(1)}" fill="none" stroke="${C.pink}" stroke-width="1.4" stroke-dasharray="5 4"/>`;
const pickShapes = svgPickable([
  { id: 'ball1', kind: 'custom', cx: 55, cy: 100, r: 42, custom: ballSvg(55, 100, 36) },
  { id: 'box1', kind: 'rect', cx: 160, cy: 100, size: 30, color: 0 },
  { id: 'cyl1', kind: 'custom', cx: 265, cy: 100, r: 42, custom:
    `<rect x="237" y="78" width="56" height="50" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
    `<ellipse cx="265" cy="78" rx="28" ry="10" fill="${C.greenSoft}" stroke="${C.blue}" stroke-width="2.5"/>` },
  { id: 'ball2', kind: 'custom', cx: 370, cy: 100, r: 42, custom: ballSvg(370, 100, 36) },
], { w: 440, h: 200 });

// ---- 卡 11 新增题图（一下 / 二上） ----
// 一排小动物（相对位置题）
const animalHead = (cx, cy, soft, stroke) =>
  `<circle cx="${cx - 14}" cy="${cy - 20}" r="8" fill="${soft}" stroke="${stroke}" stroke-width="2"/>` +
  `<circle cx="${cx + 14}" cy="${cy - 20}" r="8" fill="${soft}" stroke="${stroke}" stroke-width="2"/>` +
  `<circle cx="${cx}" cy="${cy}" r="20" fill="${soft}" stroke="${stroke}" stroke-width="2.5"/>` +
  `<circle cx="${cx - 7}" cy="${cy - 3}" r="2.5" fill="${C.ink}"/><circle cx="${cx + 7}" cy="${cy - 3}" r="2.5" fill="${C.ink}"/>`;
const animalRow = fig(340, 130,
  animalHead(90, 60, C.blueSoft, C.blue) +
  animalHead(170, 60, C.amberSoft, C.amber) +
  animalHead(250, 60, C.greenSoft, C.green) +
  `<text x="90" y="118" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink}" ${FONT}>小兔</text>` +
  `<text x="170" y="118" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink}" ${FONT}>小猴</text>` +
  `<text x="250" y="118" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink}" ${FONT}>小狗</text>`
);

// 同一座房子远看 / 近看（观察物体）
const farNearHouse = fig(340, 190,
  `<polygon points="60,40 100,72 20,72" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<rect x="30" y="72" width="50" height="42" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<text x="60" y="140" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink}" ${FONT}>远看</text>` +
  `<polygon points="240,28 322,82 158,82" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="170" y="82" width="130" height="100" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<text x="240" y="140" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink}" ${FONT}>近看</text>`
);

// 小房子拼搭图（欣赏与设计：数图形）
const houseMix = fig(320, 240,
  `<circle cx="272" cy="48" r="22" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<polygon points="150,40 242,112 58,112" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="88" y="112" width="100" height="100" rx="3" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<rect x="104" y="132" width="28" height="28" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` +
  `<rect x="150" y="132" width="28" height="28" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` +
  `<rect x="128" y="172" width="30" height="40" rx="3" fill="${C.purpleSoft}" stroke="${C.purple}" stroke-width="2.5"/>`
);

// 竖式（result 中第 blankIdx 位留空，0 起从左数）
const vDigit = (x, y, ch) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="30" font-weight="700" fill="${C.ink}" font-family="ui-monospace, Consolas, monospace">${ch}</text>`;
const vertCalc = (a, b, op, result, blankIdx = -1) => {
  const w = 210, h = 185, x0 = 132, y0 = 48, dy = 52, gap = 44;
  const aD = String(a).split(''), bD = String(b).split(''), rD = String(result).split('');
  let body = '';
  aD.forEach((d, i) => vDigit(x0 - (aD.length - 1 - i) * gap, y0, d));
  bD.forEach((d, i) => vDigit(x0 - (bD.length - 1 - i) * gap, y0 + dy, d));
  body += `<text x="${x0 - bD.length * gap - 16}" y="${y0 + dy}" text-anchor="middle" font-size="30" font-weight="700" fill="${C.ink}" font-family="ui-monospace, Consolas, monospace">${op}</text>`;
  body += `<line x1="${x0 - bD.length * gap + 4}" y1="${y0 + dy + 16}" x2="${x0 + 26}" y2="${y0 + dy + 16}" stroke="${C.ink}" stroke-width="2.5"/>`;
  rD.forEach((d, i) => {
    const x = x0 - (rD.length - 1 - i) * gap, y = y0 + dy * 2;
    if (i === blankIdx) body += `<line x1="${x - 17}" y1="${y + 8}" x2="${x + 17}" y2="${y + 8}" stroke="${C.blue}" stroke-width="3"/>`;
    else vDigit(x, y, d);
  });
  return fig(w, h, body);
};

// 机器人拼搭图（图形的变化：数正方形与长方形）
const robotMix = fig(330, 270,
  `<rect x="130" y="24" width="60" height="60" rx="6" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<rect x="108" y="98" width="104" height="82" rx="6" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` +
  `<rect x="66" y="108" width="32" height="32" rx="4" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="222" y="108" width="32" height="32" rx="4" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="118" y="194" width="32" height="62" rx="4" fill="${C.purpleSoft}" stroke="${C.purple}" stroke-width="2.5"/>` +
  `<rect x="170" y="194" width="32" height="62" rx="4" fill="${C.purpleSoft}" stroke="${C.purple}" stroke-width="2.5"/>`
);

// 对称 / 不对称图形（交互图形题）
const butterflySvg = (cx, cy, s) =>
  `<ellipse cx="${cx - s}" cy="${cy}" rx="${s}" ry="${(s * 0.8).toFixed(1)}" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<ellipse cx="${cx + s}" cy="${cy}" rx="${s}" ry="${(s * 0.8).toFixed(1)}" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<ellipse cx="${cx - s * 0.7}" cy="${cy + s * 0.95}" rx="${(s * 0.62).toFixed(1)}" ry="${(s * 0.5).toFixed(1)}" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<ellipse cx="${cx + s * 0.7}" cy="${cy + s * 0.95}" rx="${(s * 0.62).toFixed(1)}" ry="${(s * 0.5).toFixed(1)}" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<rect x="${cx - 4}" y="${cy - s * 1.25}" width="8" height="${(s * 2.5).toFixed(1)}" rx="4" fill="${C.ink}"/>`;
const pickSymmetry = svgPickable([
  { id: 'fly', kind: 'custom', cx: 60, cy: 100, r: 44, custom: butterflySvg(60, 100, 26) },
  { id: 'blob', kind: 'custom', cx: 155, cy: 100, r: 44, custom:
    `<polygon points="128,72 176,84 168,120 134,118" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` },
  { id: 'cir', kind: 'circle', cx: 250, cy: 100, size: 30, color: 0 },
  { id: 'tri', kind: 'custom', cx: 330, cy: 100, r: 46, custom:
    `<polygon points="318,66 352,118 322,130" fill="${C.purpleSoft}" stroke="${C.purple}" stroke-width="2.5"/>` },
  { id: 'sq', kind: 'rect', cx: 405, cy: 100, size: 28, color: 1 },
], { w: 460, h: 200 });

// 尺子上的铅笔（认识厘米）：笔尖对准 0 刻度，橡皮末端对准 8 刻度
const pencilRuler = fig(430, 170,
  `<polygon points="58,58 40,70 58,82" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="58" y="58" width="236" height="24" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
  `<rect x="294" y="58" width="18" height="24" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<line x1="40" y1="86" x2="40" y2="108" stroke="${C.ink}" stroke-width="1.4" stroke-dasharray="4 3"/>` +
  `<line x1="312" y1="86" x2="312" y2="108" stroke="${C.ink}" stroke-width="1.4" stroke-dasharray="4 3"/>` +
  `<rect x="40" y="108" width="340" height="30" rx="4" fill="${C.white}" stroke="${C.gray}" stroke-width="2"/>` +
  Array.from({ length: 11 }, (_, i) => {
    const x = 40 + i * 34;
    return `<line x1="${x}" y1="108" x2="${x}" y2="${i % 5 === 0 ? 120 : 114}" stroke="${C.ink}" stroke-width="1.6"/>` +
      `<text x="${x}" y="152" text-anchor="middle" font-size="12" fill="${C.ink}" ${FONT}>${i}</text>`;
  }).join('')
);

// 正方形纸对折过程图（图形的变化：对折与重合）
const foldSquare = fig(370, 220,
  `<rect x="30" y="50" width="80" height="80" rx="4" fill="${C.white}" stroke="${C.ink}" stroke-width="2.5"/>` +
  `<text x="70" y="162" text-anchor="middle" font-size="15" fill="${C.ink}" ${FONT}>对折前</text>` +
  `<text x="132" y="100" text-anchor="middle" font-size="22" fill="${C.gray}" ${FONT}>→</text>` +
  `<rect x="152" y="68" width="88" height="44" rx="4" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<text x="196" y="162" text-anchor="middle" font-size="15" fill="${C.ink}" ${FONT}>对折 1 次</text>` +
  `<text x="258" y="100" text-anchor="middle" font-size="22" fill="${C.gray}" ${FONT}>→</text>` +
  `<rect x="288" y="50" width="80" height="80" rx="4" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` +
  `<line x1="328" y1="50" x2="328" y2="130" stroke="${C.green}" stroke-width="2"/>` +
  `<line x1="288" y1="90" x2="368" y2="90" stroke="${C.green}" stroke-width="2"/>` +
  `<text x="328" y="162" text-anchor="middle" font-size="15" fill="${C.ink}" ${FONT}>对折 2 次</text>`
);

// D3：「点击所有的三角形」交互题（三角形 ×2 / 圆 ×2 / 长方形 ×1）
const pickTriangles = svgPickable([
  { id: 't1', kind: 'triangle', cx: 60, cy: 100, size: 34, color: 0 },
  { id: 'c1', kind: 'circle', cx: 150, cy: 100, size: 30, color: 1 },
  { id: 's1', kind: 'rect', cx: 240, cy: 100, size: 30, color: 2 },
  { id: 't2', kind: 'triangle', cx: 330, cy: 100, size: 34, color: 3 },
  { id: 'c2', kind: 'circle', cx: 415, cy: 100, size: 30, color: 4 },
], { w: 460, h: 200 });

export const BSD = {
  'bsd-grade1-up': [
    // ============ A 生活中的数（7 题：选择 2 / 填空 3 / 判断 1 / 图形 1） ============
    {
      p: 'bsd-b1u-NA-10ynsdssyydy', type: 'choice', difficulty: 1, score: 4,
      stem: '数一数，下图中有多少个圆？',
      media: svgCircles(8, C.blue),
      options: ['6 个', '7 个', '8 个', '9 个'],
      answer: { index: [2] },
      analysis: '用手指着一个一个地数：1、2、3、4、5、6、7、8，一共数出 8 个圆。',
    },
    {
      p: 'bsd-b1u-NA-10ynsdssyydy', type: 'figure', difficulty: 1, score: 4,
      stem: '数一数，下图中有几朵花？把数量写在横线上。',
      media: svgCircles(6, C.pink),
      answer: { value: 6, unit: '朵' },
      analysis: '按从左到右、从上到下的顺序数：1、2、3、4、5、6，一共 6 朵花。',
    },
    {
      p: 'bsd-b1u-NA-15gsdrsjsyxs', type: 'choice', difficulty: 2, score: 4,
      stem: '小朋友排队做操，从前往后数，小丽排第 4，小丽后面还有 1 人。这一排一共有几人？',
      options: ['4 人', '5 人', '6 人', '3 人'],
      answer: { index: [1] },
      analysis: '小丽排第 4，说明连她前面一共数到 4；后面还有 1 人，4 加 1 等于 5，所以这一排一共 5 人。',
    },
    {
      p: 'bsd-b1u-NA-0drsbsu6ca1yqd', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`一个也没有，用数字 $\underline{\quad}$ 表示；直尺上的 $\underline{\quad}$ 还可以表示起点。`,
      answer: { blanks: ['0', '0'] },
      analysis: '数字 0 表示一个也没有；在直尺上 0 刻在最开头，所以 0 还可以表示起点。',
    },
    {
      p: 'bsd-b1u-NA-610gsdrs', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`与 6 相邻的两个数是 $\underline{\quad}$ 和 $\underline{\quad}$。`,
      answer: { blanks: ['5', '7'] },
      analysis: '按顺序数是 4、5、6、7、8，6 的前面是 5，后面是 7，所以与 6 相邻的是 5 和 7。',
    },
    {
      p: 'bsd-b1u-NA-sdfyh210', type: 'judge', difficulty: 2, score: 4,
      stem: '10 可以分成 8 和 3。',
      answer: { value: false },
      analysis: '8 和 3 合起来是 11，不是 10；10 应该分成 8 和 2，所以这句话是错的。',
    },
    {
      p: 'bsd-b1u-NA-sdfyh210', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`7 可以分成 3 和 $\underline{\quad}$；7 还可以分成 $\underline{\quad}$ 和 1。`,
      answer: { blanks: ['4', '6'] },
      analysis: '3 和 4 合起来是 7，6 和 1 合起来也是 7，所以两空分别填 4 和 6。',
    },

    // ============ B 比较（6 题：选择 1 / 判断 2 / 图形 1 / 应用 2） ============
    {
      p: 'bsd-b1u-NA-bdsyydytu6837d', type: 'choice', difficulty: 1, score: 4,
      stem: '小明有 3 支铅笔，小红有 5 支铅笔，谁的铅笔多？',
      options: ['小明多', '小红多', '一样多', '不能比'],
      answer: { index: [1] },
      analysis: '5 比 3 大，小红有 5 支、小明有 3 支，所以小红的铅笔多。',
    },
    {
      p: 'bsd-b1u-NA-bdsyydytu6837d', type: 'figure', difficulty: 2, score: 5,
      stem: '数一数，比一比：哪种水果多？多几个？',
      media: applePear,
      answer: { blanks: ['梨', { value: 3, unit: '个' }] },
      analysis: '苹果有 4 个，梨有 7 个，7 比 4 多 3，所以梨多，多 3 个。',
    },
    {
      p: 'bsd-b1u-NA-bu8f7bz', type: 'judge', difficulty: 2, score: 4,
      stem: '大象比小猫重得多。',
      answer: { value: true },
      analysis: '大象身材庞大，小猫很小，大象比小猫重得多，这句话是对的。',
    },
    {
      p: 'bsd-b1u-NA-bu9ad8u77eebcu77ed', type: 'judge', difficulty: 3, score: 4,
      stem: '小明比爸爸高，也就是说爸爸比小明矮。',
      answer: { value: true },
      analysis: '两人比高矮时，高和矮是相对的：小明比爸爸高，反过来就是爸爸比小明矮，这句话是对的。',
    },
    {
      p: 'bsd-b1u-NA-bdsyydytu6837d', type: 'application', difficulty: 2, score: 6,
      stem: '小明有 4 个苹果，小红有 7 个苹果。小红比小明多几个？小明再摘几个就和小红同样多？',
      answer: { blanks: [{ value: 3, unit: '个' }, { value: 3, unit: '个' }] },
      analysis: '第一问用 7 减 4 等于 3，小红多 3 个；第二问小明也要变成 7 个，同样要添 3 个，所以两空都是 3 个。',
    },
    {
      p: 'bsd-b1u-NA-bu8f7bz', type: 'application', difficulty: 3, score: 6,
      stem: '铅球比足球重，乒乓球比铅球轻。这三种球中，什么最重？什么最轻？',
      answer: { blanks: ['铅球', '乒乓球'] },
      analysis: '铅球比足球重，乒乓球又比铅球轻，所以最重的是铅球，最轻的是乒乓球，足球排在中间。',
    },

    // ============ C 加与减（一）（6 题：选择 1 / 填空 1 / 计算 4） ============
    {
      p: 'bsd-b1u-NA-jfdcbrsyu5171yds', type: 'choice', difficulty: 1, score: 4,
      stem: '小明左手有 2 个气球，右手有 3 个气球。一共有多少个气球？',
      options: ['4 个', '5 个', '6 个', '7 个'],
      answer: { index: [1] },
      analysis: '把左手和右手的气球合在一起，2 加 3 等于 5，所以一共有 5 个气球。',
    },
    {
      p: 'bsd-b1u-NA-jfdcbrsu5269xju8fd8cj', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`原来有 5 个萝卜，小兔吃掉 2 个。还剩 $\underline{\quad}$ 个萝卜。`,
      answer: { blanks: ['3'] },
      analysis: '从 5 里面去掉 2，5 减 2 等于 3，所以还剩 3 个萝卜。',
    },
    {
      p: 'bsd-b1u-NA-u5f97sz5yndjjf', type: 'calculation', difficulty: 1, score: 5,
      stem: '草地上有 4 只羊，又跑来 1 只。现在有几只羊？',
      answer: { value: 5, unit: '只' },
      analysis: '求一共用加法：4 加 1 等于 5，所以现在一共有 5 只羊。',
    },
    {
      p: 'bsd-b1u-NA-67djjf', type: 'calculation', difficulty: 2, score: 5,
      stem: '池塘里有 6 朵荷花，被风吹落 2 朵。还剩几朵荷花？',
      answer: { value: 4, unit: '朵' },
      analysis: '求还剩几朵用减法：6 减 2 等于 4，所以池塘里还剩 4 朵荷花。',
    },
    {
      p: 'bsd-b1u-NA-8910djjf', type: 'calculation', difficulty: 3, score: 5,
      stem: '树上有 8 只小鸟，又飞来 7 只。现在树上有几只小鸟？',
      answer: { value: 15, unit: '只' },
      analysis: '用凑十法：8 和 2 凑成 10，7 分成 2 和 5，10 加 5 等于 15，所以现在有 15 只小鸟。',
    },
    {
      p: 'bsd-b1u-NA-8910djjf', type: 'calculation', difficulty: 3, score: 5,
      stem: '妈妈买了 10 个鸡蛋，做早餐用去 7 个。还剩几个鸡蛋？',
      answer: { value: 3, unit: '个' },
      analysis: '想 7 加几等于 10，7 加 3 等于 10，所以 10 减 7 等于 3，还剩 3 个鸡蛋。',
    },

    // ============ D 分类（6 题：选择 3 / 图形 1 / 应用 1 / 阅读 1） ============
    {
      p: 'bsd-b1u-SP-au7ed9du6807zfl', type: 'choice', difficulty: 1, score: 4,
      stem: '下面哪种东西不是水果？',
      options: ['苹果', '香蕉', '白菜', '葡萄'],
      answer: { index: [2] },
      analysis: '苹果、香蕉、葡萄都是水果；白菜是蔬菜，所以白菜不是水果。',
    },
    {
      p: 'bsd-b1u-SP-u81eaxu6807zfl', type: 'choice', difficulty: 2, score: 4,
      stem: '把苹果、香蕉、小狗、小猫分成两组，下面哪种分法合适？',
      options: ['苹果、香蕉一组，小狗、小猫一组', '苹果、小狗一组，香蕉、小猫一组', '随便分，都能分', '不能分'],
      answer: { index: [0] },
      analysis: '苹果和香蕉是水果，小狗和小猫是动物，按“是不是水果”的标准分最合适。',
    },
    {
      p: 'bsd-b1u-SP-flju679cdbsyyy', type: 'choice', difficulty: 3, score: 4,
      stem: '三种玩具中，哪种最多？',
      media: svgBars([{ label: '小汽车', value: 4 }, { label: '皮球', value: 5 }, { label: '积木', value: 3 }], { unit: '个' }),
      options: ['小汽车', '皮球', '积木', '一样多'],
      answer: { index: [1] },
      analysis: '条形图中皮球有 5 个，小汽车 4 个，积木 3 个，5 最大，所以皮球最多。',
    },
    {
      p: 'bsd-b1u-SP-au7ed9du6807zfl', type: 'figure', difficulty: 2, score: 4,
      stem: '数一数，图中有几个圆？',
      media: shapeMix,
      answer: { value: 3 },
      analysis: '圆是圆圆的、没有尖角的图形，图中蓝色圆形一共有 3 个。',
    },
    {
      p: 'bsd-b1u-SP-u81eaxu6807zfl', type: 'application', difficulty: 3, score: 6,
      stem: '教室里有男同学 5 人、女同学 3 人。男同学比女同学多几人？教室里一共有几人？',
      answer: { blanks: [{ value: 2, unit: '人' }, { value: 8, unit: '人' }] },
      analysis: '第一问 5 减 3 等于 2，男同学多 2 人；第二问 5 加 3 等于 8，教室里一共 8 人。',
    },
    {
      p: 'bsd-b1u-SP-flju679cdbsyyy', type: 'reading', difficulty: 3, score: 6,
      stem: '下面是小朋友的玩具统计。看图回答下面各题。',
      media: svgBars([{ label: '小熊', value: 4 }, { label: '小汽车', value: 6 }, { label: '布娃娃', value: 3 }], { unit: '个', color: C.green }),
      answer: { subs: [
        { label: '(1)', text: '小熊有多少个？', answer: { value: 4, unit: '个' } },
        { label: '(2)', text: '小汽车和小熊一共有多少个？', answer: { value: 10, unit: '个' } },
        { label: '(3)', text: '布娃娃比小汽车少几个？', answer: { value: 3, unit: '个' } },
      ] },
      analysis: '(1) 小熊 4 个；(2) 6 加 4 等于 10，一共 10 个；(3) 6 减 3 等于 3，布娃娃比小汽车少 3 个。',
    },

    // ============ E 位置与顺序（6 题：选择 1 / 填空 3 / 应用 2） ============
    {
      p: 'bsd-b1u-GG-rssxqh', type: 'choice', difficulty: 1, score: 4,
      stem: '小明家在楼上，爷爷家在楼下。小明家在爷爷家的什么方向？',
      options: ['上面', '下面', '前面', '后面'],
      answer: { index: [0] },
      analysis: '楼上是靠上的位置，楼下是靠下的位置，所以小明家在爷爷家的上面。',
    },
    {
      p: 'bsd-b1u-GG-rssxqh', type: 'fill', difficulty: 1, score: 4,
      stem: '小鸟在天上飞，小鱼在水里游。小鸟在小鱼的（　　）面。',
      answer: { blanks: ['上'] },
      analysis: '天在上面，水面在下面，所以小鸟在小鱼的上面，小鱼在小鸟的下面。',
    },
    {
      p: 'bsd-b1u-GG-rszy', type: 'fill', difficulty: 2, score: 4,
      stem: '我们通常用（　　）手写字。',
      answer: { blanks: ['右'] },
      analysis: '大多数人习惯用右手写字、拿筷子，所以这里填“右”；个别同学是左撇子，也一样能干。',
    },
    {
      p: 'bsd-b1u-GG-wzysxdzhyy', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`排队买票，小方前面有 2 人，后面有 3 人。这一队一共有 $\underline{\quad}$ 人。`,
      answer: { blanks: ['6'] },
      analysis: '前面 2 人，加上小方自己 1 人，再加上后面 3 人，2 加 1 加 3 等于 6，所以这一队一共 6 人。',
    },
    {
      p: 'bsd-b1u-GG-wzysxdzhyy', type: 'application', difficulty: 3, score: 6,
      stem: '小明家住在 3 楼，小红家在小明家楼下，小红家在几楼？小刚家在小明家楼上，小刚家在几楼？',
      answer: { blanks: [{ value: 2, unit: '楼' }, { value: 4, unit: '楼' }] },
      analysis: '楼下楼层数比 3 小 1，是 2 楼；楼上楼层数比 3 大 1，是 4 楼，所以两空分别是 2 楼和 4 楼。',
    },
    {
      p: 'bsd-b1u-GG-rszy', type: 'application', difficulty: 3, score: 6,
      stem: '小朋友们做操，小明左手边有 4 人，右手边有 3 人。这一排一共有多少人？',
      answer: { blanks: [{ value: 8, unit: '人' }] },
      analysis: '左边 4 人，加上小明自己 1 人，再加上右边 3 人，4 加 1 加 3 等于 8，所以这一排一共 8 人。',
    },

    // ============ F 认识图形（6 题：选择 1 / 判断 3 / 作图 1 / 交互图形 1） ============
    {
      p: 'bsd-b1u-GG-rslttxcftzftyzq', type: 'choice', difficulty: 1, score: 4,
      stem: '下面哪种物品的形状是长方体？',
      options: ['足球', '易拉罐', '粉笔盒', '皮球'],
      answer: { index: [2] },
      analysis: '粉笔盒有 6 个面，摸起来是平平的，是长方体；足球和皮球是球，易拉罐是圆柱。',
    },
    {
      p: 'bsd-b1u-GG-rslttxcftzftyzq', type: 'judge', difficulty: 3, score: 4,
      stem: '圆柱上下两个面是一样大的圆。',
      answer: { value: true },
      analysis: '圆柱上下两个面完全相同，都是一样大的圆，侧面是弯曲的面，这句话是对的。',
    },
    {
      p: 'bsd-b1u-GG-rslttxcftzftyzq', type: 'judge', difficulty: 1, score: 4,
      stem: '足球的形状是球，球能任意滚动。',
      answer: { value: true },
      analysis: '足球是球形的，球的面是弯曲的，没有平平的面，放不稳，所以能任意滚动。',
    },
    {
      p: 'bsd-b1u-GG-u6211u8bf4u4f60u505aau6307u4ee4u8fa8rlttx', type: 'judge', difficulty: 2, score: 4,
      stem: '老师说“请拿出数学书”，数学书的封面是长方形。',
      answer: { value: true },
      analysis: '数学书封面有四个直角、对边一样长，是长方形；按老师指令拿出数学书并说出形状，是对的。',
    },
    {
      p: 'bsd-b1u-GG-u73a9ju6728lttxdpd', type: 'draw', difficulty: 2, score: 5,
      stem: '用两个正方体摞成一堆，在下面的方格纸上画出你搭的积木。',
      media: svgGrid(10, 6, 30),
      answer: { manual: true, rubric: '下面画一个正方形表示下面的正方体，上面正中也画一个同样大的正方形表示摞在上面的正方体；两个正方形上下对齐、大小一样得满分。' },
      analysis: '本题考查正方体的拼搭与画图，搭法和画法不唯一，由老师人工评阅。',
    },
    {
      p: 'bsd-b1u-GG-u6211u8bf4u4f60u505aau6307u4ee4u8fa8rlttx', type: 'figure-interactive', difficulty: 2, score: 6,
      stem: '在图中点击出所有的球（可多选），再点击“确认选择”。',
      media: pickShapes,
      answer: { regions: ['ball1', 'ball2'] },
      analysis: '第 1 个和第 4 个是球，圆圆的还能滚动；长方体有平平的面，圆柱有弯曲的侧面，它们都不是球。',
    },

    // ============ G 加与减（二）（7 题：选择 1 / 填空 1 / 计算 4 / 应用 1） ============
    {
      p: 'bsd-b1u-NA-10drsyu7531u6765wu503ccb', type: 'choice', difficulty: 1, score: 4,
      stem: '1 个十是（　　）。',
      options: ['1', '10', '11', '100'],
      answer: { index: [1] },
      analysis: '10 个一是 1 个十，反过来 1 个十就是 10。',
    },
    {
      p: 'bsd-b1u-NA-20ynsdrssdzc', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`15 里面有 $\underline{\quad}$ 个十和 $\underline{\quad}$ 个一；1 个十和 7 个一组成的数是 $\underline{\quad}$。`,
      answer: { blanks: ['1', '5', '17'] },
      analysis: '15 的十位是 1、个位是 5，就是 1 个十和 5 个一；1 个十加 7 个一合起来是 17。',
    },
    {
      p: 'bsd-b1u-NA-sjjjywsbjwbtw', type: 'calculation', difficulty: 2, score: 5,
      stem: '停车场原有 13 辆自行车，又推来 2 辆。现在有多少辆自行车？',
      answer: { value: 15, unit: '辆' },
      analysis: '13 加 2 不用进位：个位上 3 加 2 等于 5，十位还是 1，所以结果是 15 辆。',
    },
    {
      p: 'bsd-b1u-NA-9jju51d1sf', type: 'calculation', difficulty: 3, score: 5,
      stem: '小明有 9 张画片，小红又送给他 5 张。现在小明有多少张画片？',
      answer: { value: 14, unit: '张' },
      analysis: '用凑十法：9 和 1 凑成 10，5 分成 1 和 4，10 加 4 等于 14，所以现在有 14 张画片。',
    },
    {
      p: 'bsd-b1u-NA-sjj9twjfcb', type: 'calculation', difficulty: 3, score: 5,
      stem: '树上有 14 个桃子，小猴吃掉 9 个。还剩几个桃子？',
      answer: { value: 5, unit: '个' },
      analysis: '想 9 加几等于 14，9 加 5 等于 14，所以 14 减 9 等于 5，树上还剩 5 个桃子。',
    },
    {
      p: 'bsd-b1u-NA-sjjjywsbjwbtw', type: 'calculation', difficulty: 2, score: 5,
      stem: '有 17 个苹果，吃掉 5 个。还剩几个苹果？',
      answer: { value: 12, unit: '个' },
      analysis: '17 减 5 不用退位：个位上 7 减 5 等于 2，十位还是 1，所以还剩 12 个苹果。',
    },
    {
      p: 'bsd-b1u-NA-9jju51d1sf', type: 'application', difficulty: 3, score: 6,
      stem: '树上原来有 8 只小鸟，飞来 6 只，又飞走 3 只。先填“飞来后有几只”，再填“现在有几只”。',
      answer: { blanks: [{ value: 14, unit: '只' }, { value: 11, unit: '只' }] },
      analysis: '先算 8 加 6 等于 14 只，再算 14 减 3 等于 11 只，所以两空分别是 14 只和 11 只。',
    },

    // ============ H 认识钟表（6 题：选择 2 / 填空 2 / 图形 1 / 阅读 1） ============
    {
      p: 'bsd-b1u-NA-rszm12gssu9488yfu9488', type: 'choice', difficulty: 1, score: 4,
      stem: '钟面上一共有（　　）个数。',
      options: ['10 个', '11 个', '12 个', '13 个'],
      answer: { index: [2] },
      analysis: '钟面上从 1 到 12 一共有 12 个数，每相邻两个数之间是一大格。',
    },
    {
      p: 'bsd-b1u-NA-rdzs', type: 'choice', difficulty: 2, score: 4,
      stem: '钟面显示的时间是几时？',
      media: svgClock(7, 0),
      options: ['5 时', '6 时', '7 时', '8 时'],
      answer: { index: [2] },
      analysis: '分针正指 12，时针正指 7，这时的时间是 7 时。',
    },
    {
      p: 'bsd-b1u-NA-rdzs', type: 'fill', difficulty: 1, score: 4,
      stem: '钟面上的时间是（　　）时。',
      media: svgClock(3, 0),
      answer: { blanks: ['3'] },
      analysis: '分针指向 12 表示整时，时针指向 3，所以钟面上的时间是 3 时。',
    },
    {
      p: 'bsd-b1u-NA-rdjsb', type: 'fill', difficulty: 3, score: 4,
      stem: '钟面上的时间是（　　）时（　　）分。',
      media: svgClock(8, 30),
      answer: { blanks: ['8', '30'] },
      analysis: '分针从 12 走到 6 正好半圈，是 30 分；时针已经走过 8，所以是 8 时 30 分，也叫 8 时半。',
    },
    {
      p: 'bsd-b1u-NA-rdzs', type: 'figure', difficulty: 1, score: 4,
      stem: '看钟面写出时间：现在是（　　）时。（只填数字）',
      media: svgClock(6, 0),
      answer: { value: 6, unit: '时' },
      analysis: '分针指向 12，时针指向 6，这时的时间是 6 时。',
    },
    {
      p: 'bsd-b1u-NA-rdzs', type: 'reading', difficulty: 2, score: 6,
      stem: '小明星期天的安排：早上 7 时起床，上午 9 时去公园，中午 12 时吃午饭，下午 4 时画画，晚上 8 时睡觉。',
      answer: { subs: [
        { label: '(1)', text: '小明早上几时起床？', answer: { value: 7, unit: '时' } },
        { label: '(2)', text: '小明中午几时吃午饭？', answer: { value: 12, unit: '时' } },
        { label: '(3)', text: '小明下午几时画画？', answer: { value: 4, unit: '时' } },
      ] },
      analysis: '早上 7 时对应起床，中午 12 时对应吃午饭，下午 4 时对应画画，晚上 8 时对应睡觉。',
    },
  ],

  'bsd-grade1-down': [
    // ============ A 加与减（一）8 题：计算 2 / 填空 3 / 判断 2 / 应用 1 ============
    {
      p: 'bsd-b1d-NA-20yndtwjfsjj9', type: 'calculation', difficulty: 1, score: 5,
      stem: '树上有 11 个苹果，摘下来 9 个。树上还剩几个苹果？',
      answer: { value: 2, unit: '个' },
      analysis: '用“破十法”：把 11 分成 10 和 1，先算 10-9=1，再算 1+1=2，所以树上还剩 2 个苹果。写竖式时相同数位对齐，从个位算起。',
    },
    {
      p: 'bsd-b1d-NA-sjj876', type: 'calculation', difficulty: 2, score: 5,
      stem: '小明有 12 颗糖，吃了 8 颗。还剩几颗糖？',
      answer: { value: 4, unit: '颗' },
      analysis: '想加算减：想 8 加几等于 12，8+4=12，所以 12-8=4；也可以用破十法：10-8=2，2+2=4。还剩 4 颗糖。',
    },
    {
      p: 'bsd-b1d-NA-sjj5432', type: 'judge', difficulty: 2, score: 4,
      stem: '11 减 5 的得数是 6。',
      answer: { value: true },
      analysis: '用破十法算：把 11 分成 10 和 1，10-5=5，再算 5+1=6，所以 11-5=6，这句话是对的。',
    },
    {
      p: 'bsd-b1d-NA-20yndtwjfsjj9', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`12-9=$\underline{\quad}$`,
      answer: { blanks: ['3'] },
      analysis: '想加算减：想 9 加几等于 12，9+3=12，所以 12-9=3，横线上填 3。',
    },
    {
      p: 'bsd-b1d-NA-sjj876', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`15-7=$\underline{\quad}$`,
      answer: { blanks: ['8'] },
      analysis: '用破十法：把 15 分成 10 和 5，先算 10-7=3，再算 3+5=8，所以 15-7=8，横线上填 8。',
    },
    {
      p: 'bsd-b1d-NA-sjj5432', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`7 加 $\underline{\quad}$ 等于 11。`,
      answer: { blanks: ['4'] },
      analysis: '想 7 加几是 11，7+4=11，所以横线上填 4；也可以想 11-7=4，想加算减都能做。',
    },
    {
      p: 'bsd-b1d-NA-yjjfjjsjwttwu60c5u5883', type: 'application', difficulty: 3, score: 6,
      stem: '一共有 13 个气球，飞走 9 个，还剩几个？又飞走 2 个，现在还剩几个？',
      answer: { blanks: [{ value: 4, unit: '个' }, { value: 2, unit: '个' }] },
      analysis: '先算 13-9：10-9=1，1+3=4，还剩 4 个；再算 4-2=2，现在还剩 2 个气球。',
    },
    {
      p: 'bsd-b1d-NA-20yndtwjfsjj9', type: 'judge', difficulty: 2, score: 4,
      stem: '计算 12-9 时，可以先想 9+3=12，所以 12-9=3。',
      answer: { value: true },
      analysis: '想加算减是计算退位减法的好方法：因为 9+3=12，所以 12-9=3，这句话是对的。',
    },

    // ============ B 观察物体 6 题：选择 2 / 图形 2 / 判断 1 / 阅读 1 ============
    {
      p: 'bsd-b1d-GG-cbtwzgctygwt', type: 'choice', difficulty: 1, score: 4,
      stem: '站在一个位置观察一个长方体，一次最多能看到几个面？',
      options: ['1 个', '2 个', '3 个', '6 个'],
      answer: { index: [2] },
      analysis: '观察长方体时，正对着的面加上上面和一个侧面，一次最多看到 3 个面，另外 3 个面被挡住了。',
    },
    {
      p: 'bsd-b1d-GG-lgwtdxdwzsxqhzy', type: 'choice', difficulty: 2, score: 4,
      stem: '小猴在小象的左边，小象在小猴的哪边？',
      options: ['左边', '右边', '前面', '后面'],
      answer: { index: [1] },
      analysis: '左右是相对的：小猴在小象的左边，反过来小象就在小猴的右边。',
    },
    {
      p: 'bsd-b1d-GG-lgwtdxdwzsxqhzy', type: 'figure', difficulty: 1, score: 4,
      stem: '小兔、小猴、小狗排成一排（如图）。小猴在小兔的哪边？在小狗的哪边？',
      media: animalRow,
      answer: { blanks: ['右', '左'] },
      analysis: '图中从左到右依次是小兔、小猴、小狗，所以小猴在小兔的右边，在小狗的左边。',
    },
    {
      p: 'bsd-b1d-GG-cbtwzgctygwt', type: 'figure', difficulty: 1, score: 4,
      stem: '同一座房子，远看显得（　　），近看显得（　　）。',
      media: farNearHouse,
      answer: { blanks: ['小', '大'] },
      analysis: '观察同一个物体时，距离远看到的显得小，距离近看到的显得大，所以两空分别填小和大。',
    },
    {
      p: 'bsd-b1d-GG-u6839jgcju679cpdybu8fbe', type: 'judge', difficulty: 3, score: 4,
      stem: '从不同的位置观察同一个长方体，看到的形状可能不同。',
      answer: { value: true },
      analysis: '从正面、侧面观察长方体看到的是长方形，从上面观察看到的是正方形，形状确实可能不同，这句话是对的。',
    },
    {
      p: 'bsd-b1d-GG-u6839jgcju679cpdybu8fbe', type: 'reading', difficulty: 3, score: 6,
      stem: '三个小朋友在观察一个长方体纸箱：小亮从正面看，看到的是长方形；小丽从侧面看，看到的也是长方形；小刚从上面看，看到的是正方形。',
      answer: { subs: [
        { label: '(1)', text: '谁看到的形状和其他两人不同？', answer: { value: '小刚' } },
        { label: '(2)', text: '他们是从几个方向观察的？', answer: { value: 3, unit: '个' } },
        { label: '(3)', text: '这个纸箱可能是什么图形？', answer: { value: '长方体' } },
      ] },
      analysis: '正面和侧面看到长方形、上面看到正方形，与众不同的是小刚；一个纸箱从多个方向观察，说明它是立体图形，上下是正方形、侧面是长方形的纸箱是长方体。',
    },

    // ============ C 生活中的数 7 题：选择 3 / 填空 2 / 判断 1 / 填空(数数) 1 ============
    {
      p: 'bsd-b1d-NA-100ynsdsssgsgu5730s', type: 'choice', difficulty: 1, score: 4,
      stem: '十个十个地数：10、20、30、40、接下来一个数是几？',
      options: ['45', '50', '60', '90'],
      answer: { index: [1] },
      analysis: '十个十个地数，每数一次多一个十：10、20、30、40、50，所以接下来是 50。',
    },
    {
      p: 'bsd-b1d-NA-100ynsdzcdxsw', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`7 个十和 5 个一组成的数是 $\underline{\quad}$。`,
      answer: { blanks: ['75'] },
      analysis: '7 个十是 70，5 个一是 5，合起来就是 75，所以横线上填 75。',
    },
    {
      p: 'bsd-b1d-NA-100ynsdzcdxsw', type: 'choice', difficulty: 1, score: 4,
      stem: '58 里面有（　　）个十和（　　）个一。',
      options: ['1 个十和 8 个一', '8 个十和 1 个一', '5 个十和 8 个一', '10 个十和 8 个一'],
      answer: { index: [2] },
      analysis: '58 的十位上是 5，表示 5 个十；个位上是 8，表示 8 个一，合起来是 58。',
    },
    {
      p: 'bsd-b1d-NA-100ynsddxbj', type: 'judge', difficulty: 2, score: 4,
      stem: '最大的两位数是 100。',
      answer: { value: false },
      analysis: '两位数十位最大是 9、个位最大也是 9，最大的两位数是 99；100 是三位数，所以这句话是错的。',
    },
    {
      p: 'bsd-b1d-NA-100ynsddxbj', type: 'choice', difficulty: 3, score: 4,
      stem: '一个数比 79 大，又比 81 小，这个数是几？',
      options: ['78', '79', '80', '81'],
      answer: { index: [2] },
      analysis: '按顺序数是 79、80、81，比 79 大又比 81 小的数只有 80。',
    },
    {
      p: 'bsd-b1d-NA-dyu4e9bsyu4e9bdu5f97dsu5f97ddms', type: 'choice', difficulty: 3, score: 4,
      stem: '跳绳比赛：小红跳了 42 下，小刚跳了 78 下。小红比小刚跳得（　　）。',
      options: ['少一些', '少得多', '多一些', '多得多'],
      answer: { index: [1] },
      analysis: '42 和 78 相差 36，差距很大，所以小红比小刚跳得少得多，不是少一些。',
    },
    {
      p: 'bsd-b1d-NA-100ynsdsssgsgu5730s', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`一捆小棒是 10 根，9 捆一共有 $\underline{\quad}$ 根。`,
      answer: { blanks: ['90'] },
      analysis: '一捆是 1 个十，9 捆就是 9 个十；十个十个地数：10、20、30、40、50、60、70、80、90，一共 90 根。',
    },

    // ============ D 有趣的图形 6 题：选择 2 / 判断 1 / 交互图形 1 / 图形 1 / 作图 1 ============
    {
      p: 'bsd-b1d-GG-rspmtxcfxzfxsjxy', type: 'choice', difficulty: 1, score: 4,
      stem: '下图是什么图形？',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 30, y: 52 }], { w: 280, h: 180, fill: C.blueSoft, stroke: C.blue }),
      options: ['三角形', '圆', '长方形', '正方形'],
      answer: { index: [0] },
      analysis: '这个图形是由三条边围成的，有三个角，是三角形。',
    },
    {
      p: 'bsd-b1d-GG-rspmtxcfxzfxsjxy', type: 'judge', difficulty: 1, score: 4,
      stem: '数学书封面的四个角都是直角。',
      answer: { value: true },
      analysis: '数学书封面是长方形，长方形有四个角，四个角都是直角，这句话是对的。',
    },
    {
      p: 'bsd-b1d-GG-txdpzyu4e03u5de7u677f', type: 'figure-interactive', difficulty: 3, score: 6,
      stem: '在图中点击出所有的三角形（可多选），再点击“确认选择”。',
      media: pickTriangles,
      answer: { regions: ['t1', 't2'] },
      analysis: '第 1 个和第 4 个图形是由三条边围成的，是三角形；圆是曲线围成的，长方形有四条边，都不是三角形。',
    },
    {
      p: 'bsd-b1d-GG-txdu6b23u8d4fysj', type: 'figure', difficulty: 3, score: 5,
      stem: '拼成的小房子用了（　　）个正方形、（　　）个三角形和（　　）个圆。',
      media: houseMix,
      answer: { blanks: ['3', '1', '1'] },
      analysis: '房子的大墙和两扇窗是正方形，共 3 个；屋顶是 1 个三角形；天上的太阳是 1 个圆。',
    },
    {
      p: 'bsd-b1d-GG-txdpzyu4e03u5de7u677f', type: 'choice', difficulty: 1, score: 4,
      stem: '一套七巧板由几种不同的图形组成？',
      options: ['2 种', '3 种', '5 种', '7 种'],
      answer: { index: [1] },
      analysis: '七巧板里有 5 个三角形、1 个正方形和 1 个平行四边形，一共由 3 种图形组成。',
    },
    {
      p: 'bsd-b1d-GG-txdpzyu4e03u5de7u677f', type: 'draw', difficulty: 2, score: 5,
      stem: '用两个完全一样的三角形，在方格纸上拼出一个长方形。',
      media: svgGrid(10, 6, 30),
      answer: { manual: true, rubric: '画出两个完全一样的三角形，把一样长的两条边拼在一起，组成一个长方形；两个三角形大小相同、拼接处无缝隙得满分。' },
      analysis: '本题考查图形的拼组，两个完全一样的三角形可以拼成长方形，画法不唯一，由老师人工评阅。',
    },

    // ============ E 加与减（二）8 题：计算 6 / 填空 2（竖式步骤写清） ============
    {
      p: 'bsd-b1d-NA-zssjjzss', type: 'calculation', difficulty: 1, score: 5,
      stem: '妈妈买了 50 个鸡蛋，又买了 30 个。一共买了多少个鸡蛋？',
      answer: { value: 80, unit: '个' },
      analysis: '整十数相加：5 个十加 3 个十是 8 个十，就是 80。写竖式时十位对十位：5+3=8，个位 0+0=0，得 80。',
    },
    {
      p: 'bsd-b1d-NA-zssjjzss', type: 'calculation', difficulty: 1, score: 5,
      stem: '一共有 70 个饺子，吃掉 20 个。还剩多少个饺子？',
      answer: { value: 50, unit: '个' },
      analysis: '整十数相减：7 个十减 2 个十是 5 个十，就是 50。竖式中十位 7-2=5，个位 0-0=0，得 50。',
    },
    {
      p: 'bsd-b1d-NA-lwsjlwsbjw', type: 'calculation', difficulty: 2, score: 5,
      stem: '书法班有 35 名男生、24 名女生。一共有多少名学生？',
      answer: { value: 59, unit: '名' },
      analysis: '列竖式计算：相同数位对齐，从个位算起。个位 5+4=9，十位 3+2=5，得 59 名学生。',
    },
    {
      p: 'bsd-b1d-NA-lwsjlwsbjw', type: 'calculation', difficulty: 2, score: 5,
      stem: '小明有 68 元，买书包花了 35 元。还剩多少元？',
      answer: { value: 33, unit: '元' },
      analysis: '列竖式：相同数位对齐，从个位减起。个位 8-5=3，十位 6-3=3，得 33 元。',
    },
    {
      p: 'bsd-b1d-NA-lwsjywsjw', type: 'calculation', difficulty: 3, score: 5,
      stem: '小红做了 48 朵花，又做了 5 朵。一共做了多少朵花？',
      answer: { value: 53, unit: '朵' },
      analysis: '列竖式：个位 8+5=13，写 3 并向十位进 1；十位 4+1=5，得 53 朵花。',
    },
    {
      p: 'bsd-b1d-NA-lwsjywsjw', type: 'judge', difficulty: 3, score: 4,
      stem: '计算 36+7=43 时，个位满十要向十位进 1。',
      answer: { value: true },
      analysis: '个位 6+7=13，满十了要写 3 进 1，十位 3+1=4，得 43；这句话讲的是进位道理，是对的。',
    },
    {
      p: 'bsd-b1d-NA-lwsjywszss', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`67-30=$\underline{\quad}$`,
      answer: { blanks: ['37'] },
      analysis: '67 减 30：个位 7-0=7，十位 6-3=3，得 37，横线上填 37。',
    },
    {
      p: 'bsd-b1d-NA-lwsjywszss', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`52-8=$\underline{\quad}$`,
      answer: { blanks: ['44'] },
      analysis: '个位 2 不够减 8，从十位退 1 当 10：12-8=4，十位剩 4，得 44。写竖式时别忘在十位上点退位点。',
    },

    // ============ F 加与减（三）前 4 题 ============
    {
      p: 'bsd-b1d-NA-100yndjwjflwsjlws', type: 'calculation', difficulty: 3, score: 5,
      stem: '果园里有 45 棵桃树、28 棵梨树。一共有多少棵果树？',
      answer: { value: 73, unit: '棵' },
      analysis: '列竖式：个位 5+8=13，写 3 并向十位进 1；十位 4+2+1=7，得 73 棵果树。',
    },
    {
      p: 'bsd-b1d-NA-100yndtwjflwsjyws', type: 'choice', difficulty: 2, score: 4,
      stem: '50-6 的得数是多少？',
      options: ['44', '45', '46', '54'],
      answer: { index: [0] },
      analysis: '个位 0 不够减 6，从十位退 1 当 10：10-6=4，十位剩 4，得 44。',
    },
    {
      p: 'bsd-b1d-NA-100yndjwjflwsjyws', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`39+4=$\underline{\quad}$`,
      answer: { blanks: ['43'] },
      analysis: '个位 9+4=13，写 3 并向十位进 1；十位 3+1=4，得 43。',
    },
    {
      p: 'bsd-b1d-NA-yjjfjjlbsjwt', type: 'application', difficulty: 2, score: 6,
      stem: '公交车上有 45 人，到站下去 18 人，又上来 15 人。现在车上有多少人？',
      answer: { blanks: [{ value: 42, unit: '人' }] },
      analysis: '先算下去后还剩 45-18=27 人，再算上来后 27+15=42 人，所以现在车上有 42 人。',
    },

    // ============ F 加与减（三）后 4 题 ============
    {
      p: 'bsd-b1d-NA-yjjfjjlbsjwt', type: 'application', difficulty: 3, score: 6,
      stem: '一本书 85 页，第一天看了 27 页，第二天看了 36 页。先填“两天一共看了多少页”，再填“还剩多少页没看”。',
      answer: { blanks: [{ value: 63, unit: '页' }, { value: 22, unit: '页' }] },
      analysis: '先算 27+36=63 页，两天一共看 63 页；再算 85-63=22 页，还剩 22 页没看。',
    },
    {
      p: 'bsd-b1d-NA-100yndtwjflwsjlws', type: 'figure', difficulty: 2, score: 5,
      stem: '下面的竖式表示 82-47，个位上的得数是几？',
      media: vertCalc('82', '47', '-', '35', 1),
      answer: { value: 5 },
      analysis: '竖式中个位 2 不够减 7，从十位退 1 当 10：12-7=5，所以个位上的得数是 5；十位 7-4=3，得 35。',
    },
    {
      p: 'bsd-b1d-NA-yjjfjjlbsjwt', type: 'reading', difficulty: 2, score: 6,
      stem: '按要求计算 60-(25+15)。',
      answer: { subs: [
        { label: '(1)', text: '先算哪一步？', answer: { value: '25+15' } },
        { label: '(2)', text: '25+15 等于多少？', answer: { value: 40 } },
        { label: '(3)', text: '最后得多少？', answer: { value: 20 } },
      ] },
      analysis: '算式里有括号，要先算括号里面的 25+15=40，再算 60-40=20，最后得 20。',
    },
    {
      p: 'bsd-b1d-NA-yjjfjjlbsjwt', type: 'application', difficulty: 2, score: 6,
      stem: '池塘里有 36 只鸭子，游走一些后还剩 9 只，又游来 12 只。先填“游走几只”，再填“现在有几只”。',
      answer: { blanks: [{ value: 27, unit: '只' }, { value: 21, unit: '只' }] },
      analysis: '先算游走 36-9=27 只，再算现在 27+12=21 只，所以两空分别是 27 只和 21 只。',
    },

    // ============ G 数学好玩 7 题：选择 3 / 填空 2 / 应用 2 ============
    {
      p: 'bsd-b1d-CP-u586bsu6e38u620fsbzaglu586bs', type: 'choice', difficulty: 2, score: 4,
      stem: '在百数表中，47 右边的一格是哪个数？',
      options: ['46', '48', '57', '37'],
      answer: { index: [1] },
      analysis: '百数表中每一行有 10 个数，右边一格比左边多 1：47 的右边是 48，左边是 46。',
    },
    {
      p: 'bsd-b1d-CP-u586bsu6e38u620fsbzaglu586bs', type: 'fill', difficulty: 2, score: 4,
      stem: '在百数表中，34 上面一格是（　　），下面一格是（　　）。',
      answer: { blanks: ['24', '44'] },
      analysis: '百数表中下面一行比上面一行多 10：34 的上面是 24，下面是 44。',
    },
    {
      p: 'bsd-b1d-CP-u586bsu6e38u620fsbzaglu586bs', type: 'choice', difficulty: 2, score: 4,
      stem: '按规律填数：2、4、6、（　）、（　）、12，括号里依次填哪两个数？',
      options: ['8、9', '8、10', '9、10', '7、8'],
      answer: { index: [1] },
      analysis: '这列数每次多 2：2、4、6、8、10、12，所以括号里依次填 8 和 10。',
    },
    {
      p: 'bsd-b1d-CP-sxu6e38u620fzdjdtl', type: 'choice', difficulty: 3, score: 4,
      stem: '小红、小丽、小刚比高矮：小红比小丽高，小刚比小丽矮。三人中谁最高？',
      options: ['小红', '小丽', '小刚', '不能比'],
      answer: { index: [0] },
      analysis: '小红比小丽高，小刚又比小丽矮，所以小丽排在中间，小红最高、小刚最矮。',
    },
    {
      p: 'bsd-b1d-CP-sxu6e38u620fzdjdtl', type: 'application', difficulty: 2, score: 6,
      stem: '三袋糖：红袋比黄袋多，蓝袋比黄袋少。先填“哪袋最多”，再填“哪袋最少”。',
      answer: { blanks: ['红袋', '蓝袋'] },
      analysis: '红袋比黄袋多，蓝袋比黄袋少，所以黄袋不多不少排在中间，最多的是红袋，最少的是蓝袋。',
    },
    {
      p: 'bsd-b1d-CP-shzdsxwt', type: 'fill', difficulty: 2, score: 4,
      stem: '小明存零用钱：第一天存 2 元，以后每天比前一天多存 1 元。第三天存（　　）元，前四天一共存（　　）元。',
      answer: { blanks: ['4', '14'] },
      analysis: '第一天 2 元、第二天 3 元、第三天 4 元、第四天 5 元；2+3+4+5=14，所以第三天存 4 元，四天共 14 元。',
    },
    {
      p: 'bsd-b1d-CP-shzdsxwt', type: 'application', difficulty: 3, score: 6,
      stem: '小朋友们排队，从前往后数小红排第 6，从后往前数排第 4。这一队一共有多少人？',
      answer: { blanks: [{ value: 9, unit: '人' }] },
      analysis: '从第 6 和倒数第 4 之间，小红被数了两次：6+4-1=9，所以要减去重复的 1 人，这一队一共 9 人。',
    },
  ],

  'bsd-grade2-up': [
    // ============ H 加与减 7 题：计算 2 / 填空 1 / 选择 1 / 应用 1 / 判断 1 / 阅读 1 ============
    {
      p: 'bsd-b2u-NA-100yndjjhhys', type: 'calculation', difficulty: 3, score: 5,
      stem: '水果店上午运来 24 箱苹果，下午运来 30 箱，晚上又运来 15 箱。一共运来多少箱苹果？',
      answer: { value: 69, unit: '箱' },
      analysis: '连加从左到右算：先 24+30=54，再 54+15=69，所以一共运来 69 箱苹果。',
    },
    {
      p: 'bsd-b2u-NA-ljljys', type: 'calculation', difficulty: 2, score: 5,
      stem: '一本书 80 页，第一天看了 25 页，第二天看了 30 页。还剩多少页没看？',
      answer: { value: 25, unit: '页' },
      analysis: '连减从左到右算：先 80-25=55，再 55-30=25，所以还剩 25 页没看。',
    },
    {
      p: 'bsd-b2u-NA-100yndjjhhys', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`45+25-40=$\underline{\quad}$`,
      answer: { blanks: ['30'] },
      analysis: '加减混合从左到右算：先 45+25=70，再 70-40=30，横线上填 30。',
    },
    {
      p: 'bsd-b2u-NA-100yndjjhhys', type: 'choice', difficulty: 2, score: 4,
      stem: '下面哪道算式的结果是 25？',
      options: ['70-20-25', '70+20-25', '70-20+25', '60-30+5'],
      answer: { index: [0] },
      analysis: '70-20-25：先 70-20=50，再 50-25=25，结果正好是 25；其他三题结果分别是 65、75、35。',
    },
    {
      p: 'bsd-b2u-NA-yjjfjjlbsjwt', type: 'application', difficulty: 3, score: 6,
      stem: '果园有 95 筐苹果，运走 28 筐，又运来 36 筐。先填“运走后有多少筐”，再填“现在有多少筐”。',
      answer: { blanks: [{ value: 67, unit: '筐' }, { value: 103, unit: '筐' }] },
      analysis: '先算运走后 95-28=67 筐，再算运来后 67+36=103 筐，所以两空分别是 67 筐和 103 筐。',
    },
    {
      p: 'bsd-b2u-NA-ljljys', type: 'judge', difficulty: 2, score: 4,
      stem: '计算连减时，要从左到右依次算。',
      answer: { value: true },
      analysis: '连加、连减和加减混合运算，都要按从左到右的顺序依次计算，这句话是对的。',
    },
    {
      p: 'bsd-b2u-NA-yjjfjjlbsjwt', type: 'reading', difficulty: 2, score: 6,
      stem: '公交车上原有 46 人，到站下去 19 人，又上来 25 人。',
      answer: { subs: [
        { label: '(1)', text: '下去后车上还有几人？', answer: { value: 27, unit: '人' } },
        { label: '(2)', text: '现在车上有几人？', answer: { value: 52, unit: '人' } },
        { label: '(3)', text: '现在比原来多几人？', answer: { value: 6, unit: '人' } },
      ] },
      analysis: '下去后 46-19=27 人；上来后 27+25=52 人；52-46=6 人，现在比原来多 6 人。',
    },

    // ============ I 购物 6 题：选择 3 / 填空 1 / 计算 1 / 应用 1 ============
    {
      p: 'bsd-b2u-NA-rmbdrsydwhsyjf', type: 'choice', difficulty: 1, score: 4,
      stem: '1 元 = （　　）角。',
      options: ['5 角', '10 角', '100 角', '1 角'],
      answer: { index: [1] },
      analysis: '1 元等于 10 角，1 角等于 10 分，所以 1 元 = 10 角。',
    },
    {
      p: 'bsd-b2u-NA-rmbdrsydwhsyjf', type: 'fill', difficulty: 1, score: 4,
      stem: '2 元 = （　　）角；5 角 = （　　）分。',
      answer: { blanks: ['20', '50'] },
      analysis: '1 元 = 10 角，2 元就是 2 个 10 角，合 20 角；1 角 = 10 分，5 角就是 5 个 10 分，合 50 分。',
    },
    {
      p: 'bsd-b2u-NA-gwdjdjsyu4ed8yzu56de', type: 'calculation', difficulty: 1, score: 5,
      stem: '买一个书包 45 元，付了 50 元，应找回多少元？',
      answer: { value: 5, unit: '元' },
      analysis: '找回的钱 = 付的钱 - 商品的价钱：50-45=5，所以应找回 5 元。',
    },
    {
      p: 'bsd-b2u-NA-gwdjdjsyu4ed8yzu56de', type: 'application', difficulty: 3, score: 6,
      stem: '一支钢笔 8 元 5 角，一个笔记本 2 元。小明带了 20 元。先填“一共要花多少角”，再填“还剩多少角”。',
      answer: { blanks: [{ value: 105, unit: '角' }, { value: 95, unit: '角' }] },
      analysis: '8 元 5 角 = 85 角，2 元 = 20 角，一共 85+20=105 角；20 元 = 200 角，还剩 200-105=95 角。',
    },
    {
      p: 'bsd-b2u-NA-dsu989dgwygs', type: 'choice', difficulty: 2, score: 4,
      stem: '一台电视 998 元，一个电饭煲 302 元。大约带多少元就够了？',
      options: ['1100 元', '1200 元', '1300 元', '1400 元'],
      answer: { index: [2] },
      analysis: '998 接近 1000，302 接近 300，1000+300=1300，所以大约带 1300 元就够了。',
    },
    {
      p: 'bsd-b2u-NA-dsu989dgwygs', type: 'choice', difficulty: 2, score: 4,
      stem: '书包 68 元、文具盒 23 元、彩笔 35 元。买这三样东西一共要多少元？',
      options: ['120 元', '126 元', '130 元', '136 元'],
      answer: { index: [1] },
      analysis: '分步相加：68+23=91，91+35=126，所以买这三样一共要 126 元。',
    },

    // ============ J 数一数与乘法 6 题：填空 2 / 选择 2 / 判断 1 / 阅读 1 ============
    {
      p: 'bsd-b2u-NA-jgjgu5730sxtjslj', type: 'fill', difficulty: 1, score: 4,
      stem: '5 个 5 个地数，接着数下去：5、10、15、20、（　）、（　）。',
      answer: { blanks: ['25', '30'] },
      analysis: '5 个 5 个地数，每数一次都比前一个多 5：20 往后数是 25，再往后数是 30，所以两空分别填 25 和 30。',
    },
    {
      p: 'bsd-b2u-NA-cfdcbrsyyygbfmc', type: 'choice', difficulty: 1, score: 4,
      stem: '4 个 3 相加，下面哪道算式写得又对又快？',
      options: ['3+3+3', '3×4', '4+4+4', '3+4'],
      answer: { index: [1] },
      analysis: '4 个 3 相加就是 3+3+3+3，求几个相同加数的和可以用乘法表示，写成 3×4，又对又快。',
    },
    {
      p: 'bsd-b2u-NA-cfdcbrsyyygbfmc', type: 'judge', difficulty: 2, score: 4,
      stem: '2×6 和 6×2 的得数相同，但表示的意义不同。',
      answer: { value: true },
      analysis: '2×6 表示 6 个 2 相加，6×2 表示 2 个 6 相加，得数都是 12，但表示的意义不同，这句话是对的。',
    },
    {
      p: 'bsd-b2u-NA-cfyxtjsljdhh', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`7+7+7+7=7×$\underline{\quad}$`,
      answer: { blanks: ['4'] },
      analysis: '7+7+7+7 是 4 个 7 相加，相同加数连加可以改写成乘法 7×4，所以横线上填 4。',
    },
    {
      p: 'bsd-b2u-NA-ycfjjsjwt', type: 'choice', difficulty: 3, score: 4,
      stem: '每组有 6 人，4 组一共有多少人？',
      options: ['10 人', '20 人', '24 人', '28 人'],
      answer: { index: [2] },
      analysis: '每组 6 人，4 组就是 4 个 6 人，用乘法算 6×4=24，所以 4 组一共有 24 人。',
    },
    {
      p: 'bsd-b2u-NA-bgfss', type: 'reading', difficulty: 3, score: 6,
      stem: '同学们把花片摆在方格表里数数，每行摆 5 个，摆了 3 行。',
      answer: { subs: [
        { label: '(1)', text: '3 行一共摆了多少个花片？', answer: { value: 15, unit: '个' } },
        { label: '(2)', text: '照这样摆 5 行，一共要摆多少个花片？', answer: { value: 25, unit: '个' } },
        { label: '(3)', text: '摆 4 行比摆 3 行多摆几个花片？', answer: { value: 5, unit: '个' } },
      ] },
      analysis: '每行摆 5 个：3 行是 3 个 5，5×3=15 个；5 行是 5 个 5，5×5=25 个；4 行比 3 行只多 1 行，多 5 个。',
    },

    // ============ K 图形的变化 6 题：选择 1 / 填空 1 / 图形 2 / 作图 1 / 交互图形 1 ============
    {
      p: 'bsd-b2u-GG-dzyzhdcdcbu611fz', type: 'choice', difficulty: 1, score: 4,
      stem: '把一张纸对折后，折痕两边会怎样？',
      options: ['大小一样，完全重合', '一边大一边小', '都是弯的', '能滚动起来'],
      answer: { index: [0] },
      analysis: '对折后折痕两边的大小和形状完全一样，折起来能够完全重合，这是对称现象的初步感知。',
    },
    {
      p: 'bsd-b2u-GG-txdbhytasj', type: 'figure', difficulty: 3, score: 5,
      stem: '照下图折一折：一张正方形纸对折 1 次，得到 2 个完全一样的（　）；再对折 1 次，得到 4 个完全一样的小（　）。',
      media: foldSquare,
      answer: { blanks: ['长方形', '正方形'] },
      analysis: '正方形纸对折 1 次，折成 2 个完全一样的长方形；再对折 1 次，横竖两道折痕把正方形分成 4 个完全一样的小正方形。',
    },
    {
      p: 'bsd-b2u-GG-u526acdctx', type: 'draw', difficulty: 2, score: 5,
      stem: '把一张纸对折，在上面画出半个松树，再剪下来展开。在方格纸上画出你展开后得到的图形。',
      media: svgGrid(10, 6, 30),
      answer: { manual: true, rubric: '画出左右两边完全重合的松树图案：对折剪开后展开，两边大小、形状完全相同，能沿一条直线完全重合得满分。' },
      analysis: '本题考查对折剪出对称图形，松树的样子不唯一，由老师人工评阅。',
    },
    {
      p: 'bsd-b2u-GG-dzyzhdcdcbu611fz', type: 'figure-interactive', difficulty: 2, score: 6,
      stem: '在图中点击出所有对称的图形（可多选），再点击“确认选择”。',
      media: pickSymmetry,
      answer: { regions: ['fly', 'cir', 'sq'] },
      analysis: '蝴蝶、圆和正方形对折后两边能完全重合，是对称图形；四边形纸片和三角形三条边都不一样长，对折后不能重合，不是对称图形。',
    },
    {
      p: 'bsd-b2u-GG-dzyzhdcdcbu611fz', type: 'fill', difficulty: 2, score: 4,
      stem: '把一张正方形纸对折，折痕两边的部分能够完全（　　）。',
      answer: { blanks: ['重合'] },
      analysis: '正方形对折后，折痕一边正好是另一边翻折过来的，两边大小和形状完全一样，能够完全重合。',
    },
    {
      p: 'bsd-b2u-GG-txdbhytasj', type: 'figure', difficulty: 3, score: 5,
      stem: '下面的机器人用了（　　）个正方形和（　　）个长方形。',
      media: robotMix,
      answer: { blanks: ['3', '3'] },
      analysis: '机器人的头和两只手是正方形，共 3 个；身体和两条腿是长方形，共 3 个。',
    },

    // ============ L 2~5的乘法口诀 6 题：计算 2 / 填空 2 / 判断 1 / 应用 1 ============
    {
      p: 'bsd-b2u-NA-5dcfkj', type: 'calculation', difficulty: 1, score: 5,
      stem: '每盒装 5 块积木，3 盒一共有多少块积木？',
      answer: { value: 15, unit: '块' },
      analysis: '求 3 个 5 是多少，用乘法算：想 5 的乘法口诀「三五十五」，5×3=15，所以 3 盒一共有 15 块。',
    },
    {
      p: 'bsd-b2u-NA-4dcfkj', type: 'fill', difficulty: 1, score: 4,
      stem: '每行种 4 棵树，种了 2 行，一共种了（　　）棵。',
      answer: { blanks: ['8'] },
      analysis: '每行 4 棵，2 行就是 2 个 4，想 4 的乘法口诀「二四得八」，4×2=8，所以一共种了 8 棵。',
    },
    {
      p: 'bsd-b2u-NA-4dcfkj', type: 'calculation', difficulty: 2, score: 5,
      stem: '每组有 4 人，6 组一共有多少人？',
      answer: { value: 24, unit: '人' },
      analysis: '每组 4 人，6 组就是 6 个 4，想口诀「四六二十四」，4×6=24，所以 6 组一共有 24 人。',
    },
    {
      p: 'bsd-b2u-NA-23dcfkj', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`3×4=$\underline{\quad}$`,
      answer: { blanks: ['12'] },
      analysis: '想 2~5 的乘法口诀「三四十二」，3×4=12，所以横线上填 12。',
    },
    {
      p: 'bsd-b2u-NA-23dcfkj', type: 'judge', difficulty: 2, score: 4,
      stem: '计算 3×4 和 4×3 可以用同一句乘法口诀。',
      answer: { value: true },
      analysis: '3×4 和 4×3 都想口诀「三四十二」，得数都是 12，可以用同一句口诀，这句话是对的。',
    },
    {
      p: 'bsd-b2u-NA-y25dcfkjjjsjwt', type: 'application', difficulty: 3, score: 6,
      stem: '有 3 袋糖，每袋 6 块。先填“一共有多少块糖”，再填“吃掉 8 块后还剩多少块”。',
      answer: { blanks: [{ value: 18, unit: '块' }, { value: 10, unit: '块' }] },
      analysis: '先算一共有多少块：每袋 6 块，3 袋就是 3×6=18 块；再算剩下的：18-8=10 块，所以两空分别是 18 块和 10 块。',
    },

    // ============ M 测量 6 题：选择 2 / 图形 2 / 填空 1 / 应用 1 ============
    {
      p: 'bsd-b2u-NA-cldyyytydwdu5fc5u8981x', type: 'choice', difficulty: 1, score: 4,
      stem: '小明用手拃、小丽用铅笔量同一张桌子，量的次数不一样，这是因为什么？',
      options: ['他们用的“一份”大小不一样', '桌子变长了', '两个人数错了', '桌子有弹性'],
      answer: { index: [0] },
      analysis: '手拃和铅笔的「一份」长短不一样，量的次数就不同；测量要用统一的长度单位，量出的结果才能比较。',
    },
    {
      p: 'bsd-b2u-NA-rslmylml', type: 'figure', difficulty: 2, score: 4,
      stem: '下面的线段长几厘米？把长度写在横线上。',
      media: svgRuler(6),
      answer: { value: 6, unit: '厘米' },
      analysis: '线段的左端对准尺子的 0 刻度，右端对准 6 刻度，所以这条线段长 6 厘米。',
    },
    {
      p: 'bsd-b2u-NA-rsmyml1mydc', type: 'choice', difficulty: 1, score: 4,
      stem: '1 米 =（　　）厘米。',
      options: ['10 厘米', '50 厘米', '100 厘米', '1000 厘米'],
      answer: { index: [2] },
      analysis: '1 米里有 100 个 1 厘米，所以 1 米 = 100 厘米，米和厘米之间的进率是 100。',
    },
    {
      p: 'bsd-b2u-NA-rslmylml', type: 'figure', difficulty: 2, score: 4,
      stem: '铅笔的一端对准尺子的 0 刻度，另一端对着刻度几？铅笔长多少厘米？',
      media: pencilRuler,
      answer: { value: 8, unit: '厘米' },
      analysis: '笔尖对准 0 刻度，橡皮一端对着 8 刻度，从 0 到 8 一共 8 个大格，所以铅笔长 8 厘米。',
    },
    {
      p: 'bsd-b2u-NA-rsmyml1mydc', type: 'application', difficulty: 3, score: 6,
      stem: '一根绳子长 1 米，先剪去 30 厘米，又剪去 40 厘米。先填“一共剪去多少厘米”，再填“还剩多少厘米”。',
      answer: { blanks: [{ value: 70, unit: '厘米' }, { value: 30, unit: '厘米' }] },
      analysis: '1 米 = 100 厘米；一共剪去 30+40=70 厘米；还剩 100-70=30 厘米，所以两空分别是 70 厘米和 30 厘米。',
    },
    {
      p: 'bsd-b2u-NA-rslmylml', type: 'fill', difficulty: 1, score: 4,
      stem: '用直尺量物体的长度时，要把物体的一端对准尺子的（　）刻度。',
      answer: { blanks: ['0'] },
      analysis: '量长度时物体的一端要对准尺子的 0 刻度，另一端对着刻度几，物体就长几厘米。',
    },

    // ============ N 分一分与除法 7 题：选择 3 / 判断 2 / 计算 1 / 应用 1（平均分易错点 5 题） ============
    {
      p: 'bsd-b2u-NA-pjfdyy', type: 'choice', difficulty: 2, score: 4,
      stem: '把 8 个桃子分给 2 只猴子，哪种分法是平均分？',
      options: ['每只猴子分 4 个', '一只分 5 个，另一只分 3 个', '一只分 6 个，另一只分 2 个', '一只分 7 个，另一只分 1 个'],
      answer: { index: [0] },
      analysis: '平均分要求每份分得同样多：8 个分成 2 份，每份 4 个才是平均分；另外三种分法两份不一样多，都不是平均分。',
    },
    {
      p: 'bsd-b2u-NA-pjfdyy', type: 'judge', difficulty: 2, score: 4,
      stem: '把 12 个桃子分成 4 份，每份 3 个，是平均分。',
      answer: { value: true },
      analysis: '4 份每份都是 3 个，每份同样多，符合平均分的含义，这句话是对的。',
    },
    {
      p: 'bsd-b2u-NA-pjfdyy', type: 'judge', difficulty: 3, score: 4,
      stem: '把 9 块糖分成 3 份，每份一定是 3 块。',
      answer: { value: false },
      analysis: '题目没有说「平均分」，每份就不一定同样多，比如可以分成 1 块、2 块、6 块，所以不能说每份一定是 3 块，这句话是错的。',
    },
    {
      p: 'bsd-b2u-NA-cfdcbrspjfycfbs', type: 'choice', difficulty: 2, score: 4,
      stem: '把 12 个苹果平均分成 4 份，每份几个？下面列式正确的是（　）。',
      options: ['12÷4=3（个）', '12-4=8（个）', '3×4=12（个）', '12÷3=4（个）'],
      answer: { index: [0] },
      analysis: '平均分成 4 份，求每份几个用除法：12÷4=3，每份 3 个；12÷3=4 是按每份 3 个来分，求分成几份，不是本题的问法。',
    },
    {
      p: 'bsd-b2u-NA-y25dcfkjqs', type: 'calculation', difficulty: 3, score: 5,
      stem: '15 人一起做游戏，每组 3 人，可以分成几组？',
      answer: { value: 5, unit: '组' },
      analysis: '按每组 3 人来分，求分成几组用除法：想乘法口诀「三五十五」，15÷3=5，所以可以分成 5 组。',
    },
    {
      p: 'bsd-b2u-NA-ycfjjsjwt-2', type: 'application', difficulty: 3, score: 6,
      stem: '20 个萝卜平均装到 4 个袋子里。先填“每袋装几个”，再填“如果每袋装 5 个，需要几个袋子”。',
      answer: { blanks: [{ value: 5, unit: '个' }, { value: 4, unit: '袋' }] },
      analysis: '第一种分法：平均装 4 袋求每袋几个，20÷4=5，每袋 5 个；第二种分法：每袋装 5 个求需要几袋，20÷5=4，需要 4 个袋子。',
    },
    {
      p: 'bsd-b2u-NA-bdcbrs', type: 'choice', difficulty: 3, score: 4,
      stem: '红花有 6 朵，黄花有 3 朵，红花的朵数是黄花的几倍？',
      options: ['2 倍', '3 倍', '6 倍', '9 倍'],
      answer: { index: [0] },
      analysis: '求 6 是 3 的几倍用除法：6 里面有 2 个 3，6÷3=2，所以红花的朵数是黄花的 2 倍。',
    },

    // ============ O 6~9的乘法口诀 6 题：计算 2 / 填空 2 / 判断 1 / 应用 1 ============
    {
      p: 'bsd-b2u-NA-6dcfkj', type: 'calculation', difficulty: 1, score: 5,
      stem: '每盒装 6 支铅笔，2 盒一共有多少支铅笔？',
      answer: { value: 12, unit: '支' },
      analysis: '求 2 个 6 是多少，用乘法算：想 6 的乘法口诀「二六十二」，6×2=12，所以 2 盒一共有 12 支。',
    },
    {
      p: 'bsd-b2u-NA-7dcfkj', type: 'fill', difficulty: 2, score: 4,
      stem: '每天背 7 个单词，背 4 天，一共背了（　　）个单词。',
      answer: { blanks: ['28'] },
      analysis: '每天背 7 个，4 天就是 4 个 7，想 7 的乘法口诀「四七二十八」，7×4=28，所以一共背了 28 个单词。',
    },
    {
      p: 'bsd-b2u-NA-89dcfkj', type: 'calculation', difficulty: 3, score: 5,
      stem: '一只风筝 8 元，买 9 只风筝一共要多少元？',
      answer: { value: 72, unit: '元' },
      analysis: '每只 8 元，买 9 只就是 9 个 8，想 8、9 的乘法口诀「八九七十二」，8×9=72，所以一共要 72 元。',
    },
    {
      p: 'bsd-b2u-NA-7dcfkj', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`7×8=$\underline{\quad}$`,
      answer: { blanks: ['56'] },
      analysis: '想 6~9 的乘法口诀「七八五十六」，7×8=56，所以横线上填 56。',
    },
    {
      p: 'bsd-b2u-NA-89dcfkj', type: 'judge', difficulty: 2, score: 4,
      stem: '计算 8×6 时，想口诀「六八四十八」，得 48。',
      answer: { value: true },
      analysis: '8×6 表示 6 个 8 相加，想口诀「六八四十八」，8×6=48，得数是 48，这句话是对的。',
    },
    {
      p: 'bsd-b2u-NA-y69dcfkjjjsjwt', type: 'application', difficulty: 3, score: 6,
      stem: '每人做 7 朵花，6 人一共做多少朵？如果一共要做 42 朵花，需要几人做？先填第一个问题，再填第二个问题。',
      answer: { blanks: [{ value: 42, unit: '朵' }, { value: 6, unit: '人' }] },
      analysis: '先求一共做多少朵：每人 7 朵，6 人就是 7×6=42 朵；再求需要几人：42 里面有 6 个 7，42÷7=6，需要 6 人。',
    },
  ],
};

// 统一补齐 extend：卡 10 要求每题 extend.source="自编"
for (const list of Object.values(BSD)) {
  for (const q of list) q.extend = { source: '自编', ...(q.extend || {}) };
}
