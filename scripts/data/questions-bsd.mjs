// 北师大版题库源（卡 10 起建设，按册增量补充）
// 与人教版 questions-*.mjs 的区别：p 字段使用考点 slug（与 data/tags-bsd.json 一致）。
// 题型答案格式、字段结构与 questions-lower.mjs 完全相同，由 build-questions.mjs 统一构建。
import {
  svgCircles, svgClock, svgBars,
  svgGrid, svgPickable, C,
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
};

// 统一补齐 extend：卡 10 要求每题 extend.source="自编"
for (const list of Object.values(BSD)) {
  for (const q of list) q.extend = { source: '自编', ...(q.extend || {}) };
}
