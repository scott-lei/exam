// 五、六年级题库（示例题，每册 ≥10 道，覆盖多种题型）
import {
  svgBars, svgPolygon, svgCircle, svgGrid, svgPickable, svgSolid,
  svgNumberLine, svgRuler, C,
} from './svg.mjs';

/* ---------- 交互图形题素材 ---------- */

// 数对定位：6 列 × 5 行方格
const coordGrid = (() => {
  const items = [];
  for (let x = 1; x <= 6; x++) {
    for (let y = 1; y <= 5; y++) {
      items.push({ id: `x${x}y${y}`, kind: 'rect', cx: 62 + (x - 1) * 56, cy: 284 - (y - 1) * 56, size: 24, color: (x + y) % 2 });
    }
  }
  const w = 62 + 5 * 56 + 62, h = 340;
  const extra =
    `<text x="${w / 2}" y="330" text-anchor="middle" font-size="12" fill="${C.gray}" font-family="system-ui">→ 列（第几列）</text>` +
    `<text x="24" y="160" text-anchor="middle" font-size="12" fill="${C.gray}" font-family="system-ui" transform="rotate(-90 24 160)">↑ 行（第几行）</text>`;
  return svgPickable(items, { w, h, extra });
})();

// 扇形辨识
const sectorPick = svgPickable([
  { id: 'a1', kind: 'custom', cx: 70, cy: 120, r: 50,
    custom: `<path d="M70,120 L70,70 A50,50 0 0 1 120,120 Z" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
            `<circle cx="70" cy="120" r="3.5" fill="${C.ink}"/>` },
  { id: 'a2', kind: 'custom', cx: 215, cy: 120, r: 50,
    custom: `<polygon points="215,70 172,150 258,150" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` },
  { id: 'a3', kind: 'custom', cx: 360, cy: 120, r: 50,
    custom: `<path d="M310,120 A50,50 0 0 1 410,120 Z" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
            `<circle cx="360" cy="120" r="3.5" fill="${C.ink}"/>` },
  { id: 'a4', kind: 'custom', cx: 510, cy: 120, r: 50,
    custom: `<path d="M472,152 A40,40 0 0 1 548,152 Z" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` },
], { w: 600, h: 210 });

// 数轴点选
const numberLinePick = (() => {
  const w = 620, h = 150, pad = 40, min = -5, max = 5;
  const sx = (v) => pad + ((v - min) / (max - min)) * (w - 2 * pad);
  const y = 96;
  let extra = `<line x1="${pad}" y1="${y}" x2="${w - pad + 10}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>` +
    `<polygon points="${w - pad + 12},${y} ${w - pad + 1},${y - 5} ${w - pad + 1},${y + 5}" fill="${C.ink}"/>`;
  const items = [];
  for (let v = min; v <= max; v++) {
    extra += `<line x1="${sx(v)}" y1="${y - 6}" x2="${sx(v)}" y2="${y + 6}" stroke="${C.gray}" stroke-width="1.5"/>` +
      `<text x="${sx(v)}" y="${y + 26}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.ink}" font-family="system-ui">${v}</text>`;
    items.push({ id: `p${v}`, kind: 'circle', cx: sx(v), cy: y - 34, size: 11, color: v % 5 });
  }
  extra += `<text x="${sx(0)}" y="${y - 62}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.gray}" font-family="system-ui">请点击正确的点</text>`;
  return svgPickable(items, { w, h, extra });
})();

export const UPPER = {
  'grade5-up': [
    {
      p: 'g5u-NA-01-02', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$2.4\times1.5=\underline{\quad}$`,
      answer: { value: 3.6 },
      analysis: '先按整数算：24×15=360，两个因数共有 2 位小数，从右数出 2 位点上小数点，得 3.6。',
    },
    {
      p: 'g5u-NA-02-02', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$7.2\div0.9=\underline{\quad}$`,
      answer: { value: 8 },
      analysis: '把除数变成整数：7.2÷0.9 = 72÷9 = 8。',
    },
    {
      p: 'g5u-NA-02-03', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`$4\div7$ 的商保留两位小数约是 $\underline{\quad}$。`,
      answer: { blanks: ['0.57'] },
      analysis: '4÷7≈0.5714…，保留两位小数看第三位 1，舍去，得 0.57。',
    },
    {
      p: 'g5u-NA-02-04', type: 'choice', difficulty: 3, score: 4,
      stem: String.raw`$0.333\cdots$ 这个数是（　　）。`,
      options: ['有限小数', '循环小数', '整数', '无限不循环小数'],
      answer: { index: [1] },
      analysis: '小数部分数字 3 依次不断重复出现，是循环小数，可以写作 0.3̇。',
    },
    {
      p: 'g5u-NA-03-05', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`解方程：$3x+5=26$，$x=\underline{\quad}$`,
      answer: { value: 7 },
      analysis: '两边同时减 5：3x=21；两边同时除以 3：x=7。',
    },
    {
      p: 'g5u-NA-03-06', type: 'application', difficulty: 3, score: 6,
      stem: '学校买了 5 个同样的足球，一共用去 425 元。每个足球多少元？（列方程解答）',
      answer: { blanks: [{ value: 85, unit: '元' }] },
      analysis: '设每个足球 x 元，5x=425，x=425÷5=85。答：每个足球 85 元。',
    },
    {
      p: 'g5u-NA-03-02', type: 'judge', difficulty: 2, score: 4,
      stem: String.raw`$3x-5$ 是一个方程。`,
      answer: { value: false },
      analysis: '方程必须同时满足两个条件：含有未知数、是等式。3x-5 不是等式，所以不是方程。',
    },
    {
      p: 'g5u-GG-05-01', type: 'figure', difficulty: 2, score: 5,
      stem: '下面平行四边形的面积是（　　）平方厘米。',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 8, y: 4 }, { x: 2, y: 4 }], {
        w: 340, h: 230, fill: C.greenSoft, stroke: C.green,
        labels: [
          { x: 3, y: 0, text: '6 厘米', dy: -14 },
          { x: 3, y: 4, text: '4 厘米', dy: 20 },
        ],
        extra: `<line x1="150" y1="46" x2="150" y2="184" stroke="${C.pink}" stroke-width="2" stroke-dasharray="6 5"/>` +
               `<path d="M150,184 L162,184 L162,172" fill="none" stroke="${C.pink}" stroke-width="2"/>`,
      }),
      answer: { value: 24, unit: '平方厘米' },
      analysis: '平行四边形面积 = 底 × 高 = 6 × 4 = 24（平方厘米）。注意高是 4 厘米，底是 6 厘米。',
    },
    {
      p: 'g5u-GG-05-03', type: 'application', difficulty: 3, score: 6,
      stem: '一个梯形的上底是 4 厘米，下底是 6 厘米，高是 5 厘米。它的面积是多少平方厘米？',
      answer: { blanks: [{ value: 25, unit: '平方厘米' }] },
      analysis: '梯形面积 =（上底 + 下底）× 高 ÷ 2 =（4 + 6）× 5 ÷ 2 = 25（平方厘米）。',
    },
    {
      p: 'g5u-GG-05-04', type: 'reading', difficulty: 3, score: 6,
      stem: '一个组合图形由一个长 8 厘米、宽 5 厘米的长方形和一个底 8 厘米、高 3 厘米的三角形拼成（三角形与长方形共用一条 8 厘米的边）。回答下面各题。',
      media: svgPolygon([{ x: 0, y: 3 }, { x: 8, y: 3 }, { x: 8, y: 8 }, { x: 0, y: 8 }], {
        w: 340, h: 250, fill: C.blueSoft, stroke: C.blue,
        labels: [{ x: 4, y: 8, text: '8 厘米', dy: 20 }],
        extra: `<polygon points="${0},${3}" fill="${C.amberSoft}"/>` +
          `<path d="M52,136 L262,136 L262,52 Z" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>`,
      }),
      answer: { subs: [
        { label: '(1)', text: '长方形的面积是多少平方厘米？', answer: { value: 40, unit: '平方厘米' } },
        { label: '(2)', text: '三角形的面积是多少平方厘米？', answer: { value: 12, unit: '平方厘米' } },
        { label: '(3)', text: '这个组合图形的面积是多少平方厘米？', answer: { value: 52, unit: '平方厘米' } },
      ] },
      analysis: '(1) 8×5=40；(2) 8×3÷2=12；(3) 40+12=52（平方厘米）。',
    },
    {
      p: 'g5u-SP-06-01', type: 'choice', difficulty: 2, score: 4,
      stem: '一个袋子里有 5 个红球和 1 个白球（除颜色外都相同），任意摸出一个球，摸到（　　）的可能性大。',
      options: ['红球', '白球', '两种一样大', '无法判断'],
      answer: { index: [0] },
      analysis: '红球 5 个，白球 1 个，红球数量多，摸到红球的可能性大。',
    },
    {
      p: 'g5u-CP-07-01', type: 'application', difficulty: 3, score: 6,
      stem: '在一条长 60 米的小路的一旁栽树，每隔 5 米栽一棵。如果两端都栽，一共要栽多少棵树？',
      answer: { blanks: [{ value: 13, unit: '棵' }] },
      analysis: '两端都栽时：棵数 = 间隔数 + 1。间隔数 = 60÷5 = 12，所以棵数 = 12 + 1 = 13（棵）。',
    },
    {
      p: 'g5u-GG-04-01', type: 'figure-interactive', difficulty: 3, score: 6,
      stem: '在下面的方格图中，点击表示数对 (3, 4) 的格子（先数第几列，再数第几行）。',
      media: coordGrid,
      answer: { regions: ['x3y4'] },
      analysis: '数对 (3, 4) 表示第 3 列、第 4 行，即从下往上数第 4 行、从左往右数第 3 列的那个格子。',
    },
    {
      p: 'g5u-GG-05-01', type: 'draw', difficulty: 2, score: 5,
      stem: '在方格纸上画一个面积是 12 平方厘米的平行四边形（每小格边长 1 厘米），并画出它的高。',
      media: svgGrid(12, 7, 30),
      answer: { manual: true, rubric: '底 × 高 = 12，如底 6 高 2、底 4 高 3；高要与底垂直并用虚线标注。' },
      analysis: '面积 12 平方厘米的平行四边形有 6×2、4×3、12×1 等多种画法。',
    },
  ],

  'grade5-down': [
    {
      p: 'g5d-NA-01-03', type: 'choice', difficulty: 2, score: 4,
      stem: '下面各数中，既是 2 的倍数又是 5 的倍数的是（　　）。',
      options: ['15', '24', '30', '45'],
      answer: { index: [2] },
      analysis: '既是 2 的倍数又是 5 的倍数，个位一定是 0。只有 30 的个位是 0。',
    },
    {
      p: 'g5d-NA-01-05', type: 'fill', difficulty: 3, score: 5,
      stem: String.raw`在 1、2、9、11、15 中，质数有 $\underline{\quad}$，合数有 $\underline{\quad}$。（多个数之间用逗号分隔）`,
      answer: { blanks: [{ value: '2,11', mode: 'set' }, { value: '9,15', mode: 'set' }] },
      analysis: '只有 1 和它本身两个因数的数是质数：2、11。除 1 和它本身外还有别的因数的数是合数：9、15。1 既不是质数也不是合数。',
    },
    {
      p: 'g5d-NA-02-05', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`把 $\frac{18}{24}$ 化成最简分数是 $\underline{\quad}$（写成 a/b 的形式）。`,
      answer: { value: '3/4' },
      analysis: '18 和 24 的最大公因数是 6：18÷6=3，24÷6=4，所以最简分数是 3/4。',
    },
    {
      p: 'g5d-NA-02-07', type: 'fill', difficulty: 3, score: 5,
      stem: String.raw`把 0.75 化成最简分数是 $\underline{\quad}$（写成 a/b 的形式）；把 $\frac{3}{5}$ 化成小数是 $\underline{\quad}$。`,
      answer: { blanks: [{ value: '3/4' }, { value: 0.6 }] },
      analysis: '0.75 = 75/100 = 3/4；3÷5 = 0.6。',
    },
    {
      p: 'g5d-NA-03-02', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$\frac{1}{2}+\frac{1}{3}=\underline{\quad}$（写成 a/b 的形式）。`,
      answer: { value: '5/6' },
      analysis: '先通分：1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 5/6。',
    },
    {
      p: 'g5d-NA-03-05', type: 'application', difficulty: 3, score: 6,
      stem: String.raw`一块地，第一天耕了这块地的 $\frac{2}{5}$，第二天耕了这块地的 $\frac{1}{3}$。两天一共耕了这块地的几分之几？`,
      answer: { blanks: [{ value: '11/15' }] },
      analysis: '通分后相加：2/5 = 6/15，1/3 = 5/15，6/15 + 5/15 = 11/15。',
    },
    {
      p: 'g5d-NA-01-01', type: 'judge', difficulty: 3, score: 4,
      stem: '一个非零自然数的最大因数和最小倍数都是它本身。',
      answer: { value: true },
      analysis: '例如 6 的因数有 1、2、3、6，最大是 6；6 的倍数有 6、12、18…，最小是 6。说法正确。',
    },
    {
      p: 'g5d-GG-04-04', type: 'figure', difficulty: 3, score: 5,
      stem: '下面长方体的体积是（　　）立方厘米。',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }, { x: 0, y: 3 }], {
        w: 340, h: 240, fill: C.blueSoft, stroke: C.blue,
        labels: [
          { x: 2.5, y: 3, text: '5 厘米', dy: 22 },
          { x: 5, y: 1.5, text: '3 厘米', dx: 34, dy: 5 },
        ],
        extra: `<polygon points="62,64 242,64 288,30 108,30" fill="${C.greenSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
          `<polygon points="242,64 288,30 288,140 242,174" fill="${C.amberSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
          `<text x="270" y="96" font-size="13" font-weight="700" fill="${C.ink}" font-family="system-ui">2 厘米</text>`,
      }),
      answer: { value: 30, unit: '立方厘米' },
      analysis: '长方体体积 = 长 × 宽 × 高 = 5 × 3 × 2 = 30（立方厘米）。',
    },
    {
      p: 'g5d-GG-04-02', type: 'application', difficulty: 3, score: 6,
      stem: '一个正方体的棱长是 4 分米，它的表面积是多少平方分米？',
      answer: { blanks: [{ value: 96, unit: '平方分米' }] },
      analysis: '正方体表面积 = 棱长 × 棱长 × 6 = 4 × 4 × 6 = 96（平方分米）。',
    },
    {
      p: 'g5d-GG-04-06', type: 'reading', difficulty: 3, score: 6,
      stem: '一个长方体玻璃容器，从里面量长 20 厘米、宽 15 厘米，容器中原来水深 6 厘米。放入一块完全浸没的石头后，水面上升到 8 厘米。回答下面各题。',
      media: svgSolid('cuboid'),
      answer: { subs: [
        { label: '(1)', text: '这块石头的体积是多少立方厘米？', answer: { value: 600, unit: '立方厘米' } },
        { label: '(2)', text: '如果容器高 10 厘米，这个容器最多能装多少升水？', answer: { value: 3, unit: '升' } },
      ] },
      analysis: '(1) 20×15×(8-6)=600（立方厘米）；(2) 20×15×10=3000（立方厘米）= 3 立方分米 = 3 升。',
    },
    {
      p: 'g5d-GG-06-01', type: 'choice', difficulty: 3, score: 4,
      stem: '用 4 个同样的小正方体摆成一个几何体，从正面看到的图形是“田”字形（2×2），从上面看最多能看到（　　）个小正方形。',
      options: ['1 个', '2 个', '3 个', '4 个'],
      answer: { index: [1] },
      analysis: '从正面看到 2×2，说明横向有 2 列、纵向 2 层。摆成前后 2 排后，从上面看最多看到 2 个小正方形。',
    },
    {
      p: 'g5d-SP-07-01', type: 'reading', difficulty: 3, score: 6,
      stem: '下面是某地一周内每天最高气温的折线统计图数据（单位：℃）：周一 18，周二 20，周三 24，周四 22，周五 26，周六 28，周日 25。',
      media: svgBars([
        { label: '一', value: 18 }, { label: '二', value: 20 }, { label: '三', value: 24 }, { label: '四', value: 22 },
        { label: '五', value: 26 }, { label: '六', value: 28 }, { label: '日', value: 25 },
      ], { unit: '', color: C.pink, w: 460 }),
      answer: { subs: [
        { label: '(1)', text: '哪天最高气温最高？请填“周一”“周二”…“周日”。', answer: { value: '周六', alts: ['星期六'] } },
        { label: '(2)', text: '最高气温最低的那天是多少摄氏度？', answer: { value: 18, unit: '℃' } },
        { label: '(3)', text: '这一周的平均最高气温是多少摄氏度？（结果取整数）', answer: { value: 23, unit: '℃' } },
      ] },
      analysis: '(1) 周六 28℃ 最高；(2) 周一 18℃ 最低；(3) (18+20+24+22+26+28+25)÷7 = 163÷7 ≈ 23（℃）。',
    },
    {
      p: 'g5d-GG-05-01', type: 'draw', difficulty: 3, score: 5,
      stem: '在方格纸上画一个直角三角形，再把它绕直角顶点顺时针旋转 90°，画出旋转后的图形。',
      media: svgGrid(12, 8, 30),
      answer: { manual: true, rubric: '旋转后图形与原图形大小、形状相同；对应点到旋转中心的距离相等；对应点与旋转中心连线的夹角是 90°。' },
      analysis: '考查旋转的三要素（中心、方向、角度）与作图，由老师人工评阅。',
    },
  ],

  'grade6-up': [
    {
      p: 'g6u-NA-02-02', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$\frac{3}{4}\div\frac{2}{5}=\underline{\quad}$（写成 a/b 的形式）。`,
      answer: { value: '15/8' },
      analysis: '除以一个不为 0 的数，等于乘这个数的倒数：3/4 × 5/2 = 15/8。',
    },
    {
      p: 'g6u-NA-01-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`简便计算：$\frac{5}{9}\times\frac{3}{7}+\frac{4}{9}\times\frac{3}{7}=\underline{\quad}$（写成 a/b 的形式）。`,
      answer: { value: '3/7' },
      analysis: '逆用乘法分配律：(5/9 + 4/9) × 3/7 = 1 × 3/7 = 3/7。',
    },
    {
      p: 'g6u-NA-03-02', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`把 $0.75:1.5$ 化成最简整数比是 $\underline{\quad}$。`,
      answer: { blanks: [{ value: '1:2', mode: 'ratio' }] },
      analysis: '前项后项同时乘 100 得 75:150，再同时除以 75 得 1:2。',
    },
    {
      p: 'g6u-NA-03-01', type: 'application', difficulty: 3, score: 6,
      stem: '一种混凝土由水泥、沙子、石子按 2:3:5 的质量比配制而成。要配制 600 千克这种混凝土，需要水泥、沙子、石子各多少千克？',
      answer: { blanks: [
        { value: 120, unit: '千克水泥' }, { value: 180, unit: '千克沙子' }, { value: 300, unit: '千克石子' },
      ] },
      analysis: '总份数 2+3+5=10，每份 600÷10=60（千克）。水泥 60×2=120，沙子 60×3=180，石子 60×5=300（千克）。',
    },
    {
      p: 'g6u-NA-04-02', type: 'fill', difficulty: 3, score: 5,
      stem: String.raw`把 $\frac{3}{4}$ 化成百分数是 $\underline{\quad}$；把 0.06 化成百分数是 $\underline{\quad}$。`,
      answer: { blanks: [{ value: '75%', alts: ['75％'] }, { value: '6%', alts: ['6％'] }] },
      analysis: '分数化百分数：3/4 = 0.75 = 75%；小数化百分数：0.06 = 6%。',
    },
    {
      p: 'g6u-NA-04-03', type: 'application', difficulty: 3, score: 6,
      stem: '六（1）班今天有 48 人按时到校，2 人请假。今天的出勤率是多少？',
      answer: { blanks: [{ value: 96, unit: '%' }] },
      analysis: '全班共 48+2=50（人），出勤率 = 48÷50×100% = 96%。',
    },
    {
      p: 'g6u-NA-04-05', type: 'application', difficulty: 3, score: 6,
      stem: '一件商品原价 200 元，现在打八折出售。现价是多少元？',
      answer: { blanks: [{ value: 160, unit: '元' }] },
      analysis: '八折就是按原价的 80% 出售：200 × 80% = 160（元）。',
    },
    {
      p: 'g6u-GG-05-02', type: 'figure', difficulty: 3, score: 5,
      stem: '下面圆的半径是 3 厘米，这个圆的周长是（　　）厘米（π 取 3.14）。',
      media: svgCircle({ r: 76, size: 240, labels: [{ x: 76, y: 0, text: 'r = 3 厘米', tx: -34, ty: -10 }] }),
      answer: { value: 18.84, tolerance: 0.05, unit: '厘米' },
      analysis: '圆的周长 C = 2πr = 2 × 3.14 × 3 = 18.84（厘米）。',
    },
    {
      p: 'g6u-GG-05-03', type: 'application', difficulty: 3, score: 6,
      stem: '一个圆形花坛的半径是 4 米。它的面积是多少平方米？（π 取 3.14）',
      answer: { blanks: [{ value: 50.24, tolerance: 0.05, unit: '平方米' }] },
      analysis: '圆的面积 S = πr² = 3.14 × 4² = 3.14 × 16 = 50.24（平方米）。',
    },
    {
      p: 'g6u-GG-05-06', type: 'reading', difficulty: 3, score: 6,
      stem: '一个边长为 4 厘米的正方形中，画了一个最大的圆（圆的直径等于正方形的边长）。回答下面各题（π 取 3.14）。',
      media: svgCircle({ r: 72, size: 240, fill: C.amberSoft, stroke: C.amber,
        extra: `<rect x="48" y="48" width="144" height="144" fill="none" stroke="${C.blue}" stroke-width="2.5"/>` }),
      answer: { subs: [
        { label: '(1)', text: '这个圆的面积是多少平方厘米？', answer: { value: 12.56, tolerance: 0.05, unit: '平方厘米' } },
        { label: '(2)', text: '阴影部分（正方形去掉圆）的面积是多少平方厘米？', answer: { value: 3.44, tolerance: 0.05, unit: '平方厘米' } },
      ] },
      analysis: '(1) 半径 2 厘米，S = 3.14×2² = 12.56（平方厘米）；(2) 正方形面积 4×4 = 16，16-12.56 = 3.44（平方厘米）。',
    },
    {
      p: 'g6u-SP-07-01', type: 'choice', difficulty: 2, score: 4,
      stem: '要清楚地表示出各部分数量与总数之间的关系，应选用（　　）。',
      options: ['条形统计图', '折线统计图', '扇形统计图', '复式统计表'],
      answer: { index: [2] },
      analysis: '扇形统计图能直观地反映各部分数量与总数之间的百分比关系。',
    },
    {
      p: 'g6u-NA-02-05', type: 'application', difficulty: 3, score: 6,
      stem: '一项工程，甲队单独做 10 天完成，乙队单独做 15 天完成。两队合做，多少天可以完成？',
      answer: { blanks: [{ value: 6, unit: '天' }] },
      analysis: '把这项工程看作单位“1”：1 ÷ (1/10 + 1/15) = 1 ÷ 1/6 = 6（天）。',
    },
    {
      p: 'g6u-GG-05-05', type: 'figure-interactive', difficulty: 3, score: 6,
      stem: '下面 4 个图形中，哪些是扇形？请依次点击（可多选），再点击“确认选择”。',
      media: sectorPick,
      answer: { regions: ['a1', 'a3'] },
      analysis: '一条弧和经过这条弧两端的两条半径所围成的图形叫扇形。a1（90° 扇形）和 a3（半圆，也是扇形）是扇形；a2 是三角形，a4 是由弦和弧围成的弓形，都不是扇形。',
    },
    {
      p: 'g6u-GG-05-01', type: 'draw', difficulty: 2, score: 5,
      stem: '用圆规在方格纸上画一个半径是 2 厘米的圆，并标出圆心 O、一条半径和一条直径。',
      media: svgGrid(12, 7, 30),
      answer: { manual: true, rubric: '圆规两脚间距离为 2 厘米；正确标出圆心 O、半径 r 与直径 d，且直径经过圆心。' },
      analysis: '考查圆规的使用与圆的表征，由老师人工评阅。',
    },
  ],

  'grade6-down': [
    {
      p: 'g6d-NA-01-01', type: 'choice', difficulty: 2, score: 4,
      stem: '零上 5℃ 记作 +5℃，那么零下 3℃ 应记作（　　）。',
      options: ['3℃', '-3℃', '+3℃', '0℃'],
      answer: { index: [1] },
      analysis: '零上温度记为正，零下温度记为负，所以零下 3℃ 记作 -3℃。',
    },
    {
      p: 'g6d-NA-01-02', type: 'figure-interactive', difficulty: 3, score: 6,
      stem: '下面的数轴上有一个点 A 表示 -2。请在数轴上点击出表示 -2 的点。',
      media: numberLinePick,
      answer: { regions: ['p-2'] },
      analysis: '在数轴上，0 左边的第一个、第二个刻度分别表示 -1、-2，所以点 A 在 0 左边第 2 格。',
    },
    {
      p: 'g6d-NA-03-07', type: 'calculation', difficulty: 3, score: 5,
      stem: '在一幅比例尺是 1:5000000 的地图上，量得甲、乙两地的距离是 6 厘米。甲、乙两地的实际距离是多少千米？',
      answer: { value: 300, unit: '千米' },
      analysis: '实际距离 = 图上距离 ÷ 比例尺 = 6 × 5000000 = 30000000（厘米）= 300（千米）。',
    },
    {
      p: 'g6d-NA-03-02', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`解比例：$x:6=4:3$，$x=\underline{\quad}$`,
      answer: { value: 8 },
      analysis: '根据比例的基本性质：3x = 6×4 = 24，x = 8。',
    },
    {
      p: 'g6d-NA-02-04', type: 'application', difficulty: 3, score: 6,
      stem: '小明的爸爸把 20000 元存入银行，定期三年，年利率是 2.75%。到期时一共可以取回多少钱？',
      answer: { blanks: [{ value: 21650, unit: '元' }] },
      analysis: '利息 = 本金 × 利率 × 时间 = 20000 × 2.75% × 3 = 1650（元）；一共取回 20000 + 1650 = 21650（元）。',
    },
    {
      p: 'g6d-NA-03-04', type: 'judge', difficulty: 3, score: 4,
      stem: '长方形的面积一定，它的长和宽成反比例。',
      answer: { value: true },
      analysis: '长 × 宽 = 面积（一定），乘积一定，所以长和宽成反比例。说法正确。',
    },
    {
      p: 'g6d-NA-03-03', type: 'choice', difficulty: 3, score: 4,
      stem: '下面各题中，两种量成正比例的是（　　）。',
      options: ['圆的周长和它的直径', '面积一定时长方形的长和宽', '路程一定时速度和时间', '底一定时三角形的面积和高'],
      answer: { index: [0] },
      analysis: '圆的周长 ÷ 直径 = π（一定），比值一定，成正比例。其余三项都是乘积一定，成反比例（或含反比例关系）。',
    },
    {
      p: 'g6d-GG-04-02', type: 'calculation', difficulty: 3, score: 5,
      stem: '一个圆柱的底面积是 12 平方厘米，高是 8 厘米。它的体积是多少立方厘米？',
      answer: { value: 96, unit: '立方厘米' },
      analysis: '圆柱体积 = 底面积 × 高 = 12 × 8 = 96（立方厘米）。',
    },
    {
      p: 'g6d-GG-04-03', type: 'application', difficulty: 3, score: 6,
      stem: '一个圆锥的底面半径是 3 分米，高是 4 分米。它的体积是多少立方分米？（π 取 3.14）',
      answer: { blanks: [{ value: 37.68, tolerance: 0.05, unit: '立方分米' }] },
      analysis: 'V = 1/3 × πr²h = 1/3 × 3.14 × 9 × 4 = 37.68（立方分米）。',
    },
    {
      p: 'g6d-GG-04-01', type: 'reading', difficulty: 3, score: 6,
      stem: '一个圆柱形茶叶罐，底面直径是 10 厘米，高是 15 厘米。回答下面各题（π 取 3.14）。',
      media: svgSolid('cylinder'),
      answer: { subs: [
        { label: '(1)', text: '它的侧面积是多少平方厘米？', answer: { value: 471, tolerance: 0.5, unit: '平方厘米' } },
        { label: '(2)', text: '做这样一个茶叶罐至少需要多少平方厘米铁皮？（得数保留整数）', answer: { value: 628, tolerance: 0.5, unit: '平方厘米' } },
      ] },
      analysis: '(1) 侧面积 = πdh = 3.14×10×15 = 471（平方厘米）；(2) 表面积 = 侧面积 + 2 个底面积 = 471 + 2×3.14×5² = 471 + 157 = 628（平方厘米）。',
    },
    {
      p: 'g6d-SP-07-02', type: 'reading', difficulty: 3, score: 6,
      stem: '10 名同学的身高数据如下（单位：厘米）：142，138，145，150，138，140，138，152，146，141。回答下面各题。',
      answer: { subs: [
        { label: '(1)', text: '这组数据的众数是多少？', answer: { value: 138, unit: '厘米' } },
        { label: '(2)', text: '这组数据的中位数是多少？', answer: { value: 141.5, unit: '厘米' } },
        { label: '(3)', text: '这组数据的平均数是多少？（得数保留整数）', answer: { value: 143, tolerance: 0.5, unit: '厘米' } },
      ] },
      analysis: '(1) 138 出现 3 次，次数最多，众数是 138；(2) 从小到大排列后中间两个数是 141 和 142，中位数 =(141+142)÷2 = 141.5；(3) 总和 1430，1430÷10 = 143（厘米）。',
    },
    {
      p: 'g6d-CP-08-02', type: 'application', difficulty: 3, score: 6,
      stem: '把 5 个苹果放进 3 个抽屉里，不管怎么放，总有一个抽屉里至少放进几个苹果？',
      answer: { blanks: [{ value: 2, unit: '个' }] },
      analysis: '这是鸽巢问题：5÷3 = 1……2，至少数 = 商 + 1 = 2（个）。',
    },
    {
      p: 'g6d-CP-08-01', type: 'choice', difficulty: 3, score: 4,
      stem: '甲、乙、丙三人中，只有一人说了真话。甲说：“乙说的是假话。”乙说：“丙说的是假话。”丙说：“甲和乙都在说假话。”说真话的是（　　）。',
      options: ['甲', '乙', '丙', '无法确定'],
      answer: { index: [1] },
      analysis: '逐一假设：若乙说真话，则丙说假话，此时甲确实在说假话，与“只有一人说真话”吻合。所以乙说真话。',
    },
    {
      p: 'g6d-NA-02-01', type: 'choice', difficulty: 2, score: 4,
      stem: '一件商品打七五折出售，现价是原价的（　　）。',
      options: ['75%', '25%', '7.5%', '105%'],
      answer: { index: [0] },
      analysis: '“七五折”就是按原价的 75% 出售。',
    },
    {
      p: 'g6d-NA-02-05', type: 'application', difficulty: 3, score: 6,
      stem: '一种商品原价 120 元。A 超市“打八折”出售，B 超市“满 100 元减 20 元”出售。到哪家超市买更便宜？请填“A”或“B”。',
      answer: { blanks: [{ value: 'A', alts: ['a', 'A 超市', 'A超市'] }] },
      analysis: 'A 超市：120×80% = 96（元）；B 超市：120-20 = 100（元）。96 < 100，所以 A 超市更便宜。',
    },
    {
      p: 'g6d-CP-08-03', type: 'draw', difficulty: 3, score: 5,
      stem: '在方格纸上画一个长 4 厘米、宽 2 厘米的长方形，再按 2:1 画出放大后的图形。',
      media: svgGrid(14, 8, 30),
      answer: { manual: true, rubric: '放大后长 8 厘米、宽 4 厘米；对应边成比例，图形形状不变、大小改变。' },
      analysis: '按 2:1 放大，就是把每条边都扩大到原来的 2 倍。',
    },
  ],
};
