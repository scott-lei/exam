// 一、二年级题库（示例题，每册 ≥10 道，覆盖多种题型）
import {
  svgCircles, svgClock, svgBars, svgSolid, svgPolygon, svgCircle,
  svgGrid, svgRuler, svgPickable, C,
} from './svg.mjs';

// 「点击出所有圆形」交互题
const pickCircles = svgPickable([
  { id: 'c1', kind: 'circle', cx: 70, cy: 100, size: 32, color: 0 },
  { id: 's1', kind: 'rect', cx: 190, cy: 100, size: 30, color: 1 },
  { id: 't1', kind: 'triangle', cx: 305, cy: 100, size: 34, color: 2 },
  { id: 'c2', kind: 'circle', cx: 425, cy: 100, size: 32, color: 3 },
], { w: 480, h: 200 });

// 「平移几格」交互题：一排方格
const shiftCells = svgPickable(
  Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 1}`, kind: 'rect', cx: 46 + i * 58, cy: 100, size: 22, color: i % 5,
  })),
  { w: 500, h: 200 }
);
shiftCells.extraSvg = `<text x="46" y="42" text-anchor="middle" font-size="20" font-weight="700" fill="${C.blue}" font-family="system-ui">▲</text>`;

export const LOWER = {
  'grade1-up': [
    {
      p: 'g1u-NA-01-01', type: 'choice', difficulty: 1, score: 4,
      stem: '数一数，下图中共有多少个圆点？',
      media: svgCircles(7, C.blue),
      options: ['5个', '6个', '7个', '8个'],
      answer: { index: [2] },
      analysis: '一个一个地数：1、2、3、4、5、6、7，一共 7 个圆点。',
    },
    {
      p: 'g1u-NA-01-02', type: 'judge', difficulty: 1, score: 4,
      stem: '小明有 5 个苹果，小红有 3 个苹果，小明的苹果比小红多。',
      answer: { value: true },
      analysis: '5 > 3，所以小明的苹果比小红多。这句话是对的。',
    },
    {
      p: 'g1u-NA-02-01', type: 'fill', difficulty: 1, score: 4,
      stem: String.raw`3 的前面一个数是 $\underline{\quad}$，后面一个数是 $\underline{\quad}$。`,
      answer: { blanks: ['2', '4'] },
      analysis: '按顺序数：1、2、3、4、5……3 的前面是 2，后面是 4。',
    },
    {
      p: 'g1u-NA-02-04', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`5 可以分成 2 和 $\underline{\quad}$；5 还可以分成 $\underline{\quad}$ 和 1。`,
      answer: { blanks: ['3', '4'] },
      analysis: '5 = 2 + 3，5 = 4 + 1，所以两空分别填 3 和 4。',
    },
    {
      p: 'g1u-NA-02-05', type: 'calculation', difficulty: 1, score: 4,
      stem: String.raw`计算：$2+3=\underline{\quad}$`,
      answer: { value: 5 },
      analysis: '2 和 3 合起来是 5。',
    },
    {
      p: 'g1u-NA-03-07', type: 'calculation', difficulty: 2, score: 5,
      stem: String.raw`计算：$3+2+4=\underline{\quad}$`,
      answer: { value: 9 },
      analysis: '连加要按从左到右的顺序算：先算 3+2=5，再算 5+4=9。',
    },
    {
      p: 'g1u-NA-04-01', type: 'choice', difficulty: 2, score: 4,
      stem: '18 里面有（　　）个十和（　　）个一。',
      options: ['1 个十和 8 个一', '8 个十和 1 个一', '1 个十和 7 个一', '10 个十和 8 个一'],
      answer: { index: [0] },
      analysis: '18 的十位上是 1，表示 1 个十；个位上是 8，表示 8 个一。',
    },
    {
      p: 'g1u-NA-05-01', type: 'calculation', difficulty: 2, score: 5,
      stem: String.raw`计算：$9+6=\underline{\quad}$`,
      answer: { value: 15 },
      analysis: '用“凑十法”：9 借 1 给 6 凑成 10，6 剩下 5，10+5=15。',
    },
    {
      p: 'g1u-NA-06-01', type: 'figure', difficulty: 2, score: 4,
      stem: '看下面的钟面，此时是（　　）时。只填数字。',
      media: svgClock(8, 0),
      answer: { value: 8, unit: '时' },
      analysis: '分针指向 12，时针指向 8，是 8 时。',
    },
    {
      p: 'g1u-NA-05-04', type: 'application', difficulty: 3, score: 6,
      stem: '树上有 8 只小鸟，又飞来 5 只。现在树上一共有多少只小鸟？',
      answer: { blanks: [{ value: 13, unit: '只' }] },
      analysis: '求“一共”用加法：8 + 5 = 13（只）。答：一共有 13 只小鸟。',
    },
    {
      p: 'g1u-CP-09-01', type: 'reading', difficulty: 2, score: 6,
      stem: '下面是小朋友整理水果的结果：苹果 4 个，梨 6 个。看图回答下面各题。',
      media: svgBars([{ label: '苹果', value: 4 }, { label: '梨', value: 6 }], { unit: '个', color: C.green }),
      answer: { subs: [
        { label: '(1)', text: '苹果有多少个？', answer: { value: 4, unit: '个' } },
        { label: '(2)', text: '梨有多少个？', answer: { value: 6, unit: '个' } },
        { label: '(3)', text: '苹果和梨一共有多少个？', answer: { value: 10, unit: '个' } },
      ] },
      analysis: '(1) 苹果 4 个；(2) 梨 6 个；(3) 4+6=10（个）。',
    },
    {
      p: 'g1u-GG-07-01', type: 'draw', difficulty: 1, score: 5,
      stem: '在下面的方格纸上画出一个圆和一个正方形。',
      media: svgGrid(10, 6, 30),
      answer: { manual: true, rubric: '圆是曲线围成的封闭图形；正方形四条边一样长、四个角都是直角。两个图形各得一半分。' },
      analysis: '本题考查对圆和正方形的表征能力，由老师人工评阅。',
    },
  ],

  'grade1-down': [
    {
      p: 'g1d-NA-01-01', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$13-9=\underline{\quad}$`,
      answer: { value: 4 },
      analysis: '用“破十法”：13 拆成 10 和 3，10-9=1，1+3=4。',
    },
    {
      p: 'g1d-NA-01-02', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$15-8=\underline{\quad}$`,
      answer: { value: 7 },
      analysis: '15-5=10，10-3=7；所以 15-8=7。',
    },
    {
      p: 'g1d-NA-02-01', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`6 个十和 5 个一组成的数是 $\underline{\quad}$，读作 $\underline{\quad}$。`,
      answer: { blanks: ['65', { value: '六十五', alts: ['六十五。'] }] },
      analysis: '6 个十是 60，5 个一是 5，合起来是 65，读作“六十五”。',
    },
    {
      p: 'g1d-NA-03-06', type: 'judge', difficulty: 3, score: 4,
      stem: String.raw`计算 $20-(5+3)$ 时，要先算 $5+3=8$，再算 $20-8=12$。`,
      answer: { value: true },
      analysis: '有小括号的要先算小括号里面的：20-(5+3)=20-8=12。正确。',
    },
    {
      p: 'g1d-NA-03-05', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$32-7=\underline{\quad}$`,
      answer: { value: 25 },
      analysis: '个位 2 不够减 7，从十位退 1：12-7=5，十位剩 2，结果是 25。',
    },
    {
      p: 'g1d-NA-03-07', type: 'application', difficulty: 3, score: 6,
      stem: '停车场原来有 45 辆车，开走了 20 辆，又开来了 12 辆。现在停车场有多少辆车？',
      answer: { blanks: [{ value: 37, unit: '辆' }] },
      analysis: '45 - 20 + 12 = 25 + 12 = 37（辆）。答：现在有 37 辆车。',
    },
    {
      p: 'g1d-NA-04-01', type: 'choice', difficulty: 2, score: 4,
      stem: '1 元可以换（　　）张 1 角。',
      options: ['5 张', '10 张', '100 张', '2 张'],
      answer: { index: [1] },
      analysis: '1 元 = 10 角，所以 1 元可以换 10 张 1 角。',
    },
    {
      p: 'g1d-GG-05-01', type: 'figure', difficulty: 2, score: 5,
      stem: '下面是由小棒围成的图形，图中一共有（　　）个三角形。',
      media: svgPolygon(
        [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 30, y: 50 }],
        { w: 300, h: 200, fill: C.greenSoft, stroke: C.green, extra:
          `<path d="M110,20 L170,20 L140,70 Z" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
          `<path d="M200,20 L200,70 L260,70 L260,20 Z" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="2.5"/>` +
          `<path d="M100,110 L160,110 L130,160 Z" fill="${C.pinkSoft}" stroke="${C.pink}" stroke-width="2.5"/>` }
      ),
      answer: { value: 3 },
      analysis: '图中 3 个图形都是由三条边围成的，都是三角形，共 3 个。',
    },
    {
      p: 'g1d-CP-08-06', type: 'reading', difficulty: 3, score: 6,
      stem: '文具店部分商品价格如下：铅笔 2 元 5 角，尺子 1 元 8 角，橡皮 1 元 2 角。下面各题结果请用“角”作答。',
      answer: { subs: [
        { label: '(1)', text: '买一支铅笔和一块橡皮一共要多少钱？', answer: { value: 37, unit: '角' } },
        { label: '(2)', text: '一支铅笔比一把尺子贵多少钱？', answer: { value: 7, unit: '角' } },
      ] },
      analysis: '(1) 2元5角=25角，1元2角=12角，25+12=37（角）；(2) 25-18=7（角）。',
    },
    {
      p: 'g1d-GG-05-01', type: 'figure-interactive', difficulty: 2, score: 6,
      stem: '在图中依次点击出所有的圆（可多选），再点击“确认选择”。',
      media: pickCircles,
      answer: { regions: ['c1', 'c2'] },
      analysis: '第 1 个和第 4 个图形是圆；第 2 个是正方形，第 3 个是三角形。',
    },
    {
      p: 'g1d-GG-05-02', type: 'draw', difficulty: 3, score: 5,
      stem: '用两个完全一样的直角三角形，在方格纸上拼出一个长方形。',
      media: svgGrid(10, 6, 30),
      answer: { manual: true, rubric: '两个直角三角形的斜边相接，四边两两相等且四个角都是直角即为长方形。' },
      analysis: '考查平面图形的拼组与空间想象，由老师人工评阅。',
    },
  ],

  'grade2-up': [
    {
      p: 'g2u-NA-01-01', type: 'choice', difficulty: 2, score: 4,
      stem: '量一支铅笔的长度，用（　　）作单位比较合适。',
      options: ['米', '厘米', '千米', '吨'],
      answer: { index: [1] },
      analysis: '铅笔比较短，用“厘米”作单位比较合适。',
    },
    {
      p: 'g2u-NA-02-02', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$47+38=\underline{\quad}$`,
      answer: { value: 85 },
      analysis: '个位 7+8=15，写 5 进 1；十位 4+3+1=8。所以 47+38=85。',
    },
    {
      p: 'g2u-NA-02-04', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$62-27=\underline{\quad}$`,
      answer: { value: 35 },
      analysis: '个位 2 不够减 7，退 1 当十：12-7=5；十位 5-2=3。结果是 35。',
    },
    {
      p: 'g2u-NA-03-01', type: 'fill', difficulty: 2, score: 4,
      stem: String.raw`$5+5+5+5$ 改写成乘法算式是 $\underline{\quad}$。`,
      answer: { blanks: [{ value: '5×4', alts: ['4×5'] }] },
      analysis: '4 个 5 相加，可以写成 5×4 或 4×5。',
    },
    {
      p: 'g2u-NA-04-02', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$8\times7=\underline{\quad}$`,
      answer: { value: 56 },
      analysis: '口诀：七八五十六。所以 8×7=56。',
    },
    {
      p: 'g2u-NA-03-05', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$6\times4+8=\underline{\quad}$`,
      answer: { value: 32 },
      analysis: '先算乘法再算加法：6×4=24，24+8=32。',
    },
    {
      p: 'g2u-GG-05-02', type: 'judge', difficulty: 2, score: 4,
      stem: '所有的直角都一样大。',
      answer: { value: true },
      analysis: '直角是 90° 的角，所有的直角大小都相同。说法正确。',
    },
    {
      p: 'g2u-GG-06-01', type: 'choice', difficulty: 3, score: 4,
      stem: '从上面看一个竖放的圆柱，看到的形状是（　　）。',
      options: ['长方形', '圆', '三角形', '正方形'],
      answer: { index: [1] },
      analysis: '从上面看竖放的圆柱，看到的是它的底面，形状是圆。',
    },
    {
      p: 'g2u-NA-01-03', type: 'figure', difficulty: 2, score: 5,
      stem: '用直尺量下面这条线段，它的长度是（　　）厘米。',
      media: svgRuler(4),
      answer: { value: 4, unit: '厘米' },
      analysis: '线段左端对准刻度 0，右端对准刻度 4，长度是 4 厘米。',
    },
    {
      p: 'g2u-NA-04-04', type: 'application', difficulty: 3, score: 6,
      stem: '每盒有 9 个乒乓球，7 盒一共有多少个乒乓球？',
      answer: { blanks: [{ value: 63, unit: '个' }] },
      analysis: '求 7 个 9 是多少，用乘法：9×7=63（个）。答：一共有 63 个。',
    },
    {
      p: 'g2u-SP-08-01', type: 'reading', difficulty: 3, score: 6,
      stem: '二年级同学最喜欢的运动项目统计如下：跳绳 12 人，踢足球 9 人，打篮球 15 人。',
      media: svgBars([
        { label: '跳绳', value: 12 }, { label: '踢足球', value: 9 }, { label: '打篮球', value: 15 },
      ], { unit: '人', color: C.purple }),
      answer: { subs: [
        { label: '(1)', text: '最喜欢跳绳的有多少人？', answer: { value: 12, unit: '人' } },
        { label: '(2)', text: '最喜欢打篮球的比最喜欢踢足球的多多少人？', answer: { value: 6, unit: '人' } },
        { label: '(3)', text: '一共调查了多少人？', answer: { value: 36, unit: '人' } },
      ] },
      analysis: '(1) 12 人；(2) 15-9=6（人）；(3) 12+9+15=36（人）。',
    },
    {
      p: 'g2u-GG-05-02', type: 'draw', difficulty: 2, score: 5,
      stem: '在方格纸上画一个直角，并标上直角符号“⌐”。',
      media: svgGrid(10, 6, 30),
      answer: { manual: true, rubric: '两条边从同一点出发且互相垂直，并正确标注直角符号。' },
      analysis: '考查直角的表征与画法，由老师人工评阅。',
    },
  ],

  'grade2-down': [
    {
      p: 'g2d-NA-01-03', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$24\div6=\underline{\quad}$`,
      answer: { value: 4 },
      analysis: '口诀：四六二十四。所以 24÷6=4。',
    },
    {
      p: 'g2d-NA-02-01', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$72\div9=\underline{\quad}$`,
      answer: { value: 8 },
      analysis: '口诀：八九七十二。所以 72÷9=8。',
    },
    {
      p: 'g2d-NA-04-02', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`一个数除以 7，余数最大是 $\underline{\quad}$。`,
      answer: { blanks: ['6'] },
      analysis: '余数一定要比除数小，除数是 7，余数最大是 6。',
    },
    {
      p: 'g2d-NA-04-01', type: 'judge', difficulty: 3, score: 4,
      stem: '在有余数的除法中，余数一定比除数小。',
      answer: { value: true },
      analysis: '如果余数不小于除数，就还能再分一次。所以余数一定比除数小。',
    },
    {
      p: 'g2d-NA-03-02', type: 'choice', difficulty: 3, score: 4,
      stem: String.raw`计算 $12+3\times4$ 时，应该先算（　　）。`,
      options: ['12+3', '3×4', '从左到右依次算', '都可以'],
      answer: { index: [1] },
      analysis: '有乘法和加法时，要先算乘法：3×4=12，再算 12+12=24。',
    },
    {
      p: 'g2d-NA-03-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`计算：$(28+8)\div6=\underline{\quad}$`,
      answer: { value: 6 },
      analysis: '先算小括号：28+8=36；再算 36÷6=6。',
    },
    {
      p: 'g2d-NA-05-01', type: 'choice', difficulty: 2, score: 4,
      stem: '由 5 个百、3 个十和 7 个一组成的数是（　　）。',
      options: ['537', '573', '5037', '357'],
      answer: { index: [0] },
      analysis: '5 个百是 500，3 个十是 30，7 个一是 7，合起来是 537。',
    },
    {
      p: 'g2d-NA-04-04', type: 'application', difficulty: 3, score: 6,
      stem: '有 38 个苹果，每 5 个装一袋。最多可以装满多少袋？还剩多少个苹果？',
      answer: { blanks: [{ value: 7, unit: '袋' }, { value: 3, unit: '个' }] },
      analysis: '38÷5=7（袋）……3（个）。答：最多装满 7 袋，还剩 3 个。',
    },
    {
      p: 'g2d-GG-07-01', type: 'figure', difficulty: 2, score: 4,
      stem: '一个长方形有（　　）条对称轴。',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 90, y: 0 }, { x: 90, y: 50 }, { x: 0, y: 50 }], {
        w: 280, h: 190, fill: C.blueSoft, stroke: C.blue,
        extra: `<line x1="140" y1="24" x2="140" y2="166" stroke="${C.pink}" stroke-width="1.8" stroke-dasharray="6 5"/>` +
               `<line x1="34" y1="95" x2="246" y2="95" stroke="${C.pink}" stroke-width="1.8" stroke-dasharray="6 5"/>`,
      }),
      answer: { value: 2 },
      analysis: '长方形沿对边中点连线对折可以完全重合，这样的折痕有 2 条，所以有 2 条对称轴。',
    },
    {
      p: 'g2d-SP-08-02', type: 'reading', difficulty: 3, score: 6,
      stem: '二（1）班同学最喜欢的课外书统计如下：故事书 18 本，科技书 12 本，漫画书 15 本，其他 5 本。',
      media: svgBars([
        { label: '故事书', value: 18 }, { label: '科技书', value: 12 },
        { label: '漫画书', value: 15 }, { label: '其他', value: 5 },
      ], { unit: '本', color: C.blue }),
      answer: { subs: [
        { label: '(1)', text: '最喜欢故事书的有多少本？', answer: { value: 18, unit: '本' } },
        { label: '(2)', text: '最喜欢漫画书的比最喜欢科技书的多多少本？', answer: { value: 3, unit: '本' } },
        { label: '(3)', text: '一共统计了多少本？', answer: { value: 50, unit: '本' } },
      ] },
      analysis: '(1) 18 本；(2) 15-12=3（本）；(3) 18+12+15+5=50（本）。',
    },
    {
      p: 'g2d-GG-07-03', type: 'figure-interactive', difficulty: 3, score: 6,
      stem: '图中 ▲ 在第 1 格。把它向右平移 5 格，平移后的图形在第几格？请点击对应的方格。',
      media: shiftCells,
      answer: { regions: ['c6'] },
      analysis: '第 1 格向右平移 5 格，1+5=6，落在第 6 格。',
    },
    {
      p: 'g2d-CP-09-04', type: 'draw', difficulty: 3, score: 5,
      stem: '在方格纸上先画一个你喜欢的图形，再把它向右平移 4 格，画出平移后的图形。',
      media: svgGrid(12, 6, 30),
      answer: { manual: true, rubric: '平移后图形与原图形形状、大小完全相同，方向不变，只改变位置，且恰好向右移 4 格。' },
      analysis: '考查平移的表征与作图，由老师人工评阅。',
    },
  ],
};
