// 三、四年级题库（示例题，每册 ≥10 道，覆盖多种题型）
import {
  svgBars, svgPolygon, svgGrid, svgPickable, svgSolid, svgNumberLine, C,
} from './svg.mjs';

/** 角度示意图（用于「点击出所有钝角」交互题） */
function angleGraphic(vx, vy, deg, color) {
  const rad = (d) => (d * Math.PI) / 180;
  const R = 46;
  const p1 = [vx + R * Math.cos(rad(0)), vy - R * Math.sin(rad(0))];
  const p2 = [vx + R * Math.cos(rad(deg)), vy - R * Math.sin(rad(deg))];
  const arc = `M${vx + 26},${vy} A26,26 0 0 ${deg > 180 ? 1 : 0},0 ${vx + 26 * Math.cos(rad(deg))},${vy - 26 * Math.sin(rad(deg))}`;
  return `<line x1="${vx}" y1="${vy}" x2="${p1[0]}" y2="${p1[1]}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<line x1="${vx}" y1="${vy}" x2="${p2[0]}" y2="${p2[1]}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="${arc}" fill="none" stroke="${color}" stroke-width="2"/>`;
}

const pickObtuse = svgPickable([
  { id: 'a1', kind: 'custom', cx: 70, cy: 110, r: 48, custom: angleGraphic(40, 140, 50, C.blue) },
  { id: 'a2', kind: 'custom', cx: 210, cy: 110, r: 48, custom: angleGraphic(180, 140, 90, C.green) },
  { id: 'a3', kind: 'custom', cx: 350, cy: 110, r: 52, custom: angleGraphic(320, 140, 130, C.amber) },
  { id: 'a4', kind: 'custom', cx: 500, cy: 110, r: 52, custom: angleGraphic(470, 140, 180, C.pink) },
], { w: 560, h: 210 });

/** 半成品轴对称图形（作图题底图） */
const halfShape = (() => {
  const g = svgGrid(12, 7, 30, '');
  const { pad, cell } = g.grid;
  const dots = [[4, 1], [5, 1], [5, 2], [6, 2], [6, 3], [7, 3], [7, 4], [6, 4], [6, 5], [5, 5], [5, 6], [4, 6]];
  const d = dots.map((p, i) => `${i === 0 ? 'M' : 'L'}${pad + p[0] * cell},${pad + p[1] * cell}`).join(' ') + ' Z';
  const axisX = pad + 4 * cell;
  const extra = `<path d="${d}" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
    `<line x1="${axisX}" y1="${pad}" x2="${axisX}" y2="${pad + 7 * cell}" stroke="${C.pink}" stroke-width="2" stroke-dasharray="7 5"/>`;
  return svgGrid(12, 7, 30, extra);
})();

export const MIDDLE = {
  'grade3-up': [
    {
      p: 'g3u-NA-01-01', type: 'choice', difficulty: 1, score: 4,
      stem: '1 分钟等于（　　）秒。',
      options: ['10 秒', '60 秒', '100 秒', '30 秒'],
      answer: { index: [1] },
      analysis: '时间单位换算：1 分 = 60 秒。',
    },
    {
      p: 'g3u-NA-02-03', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$340+280=\underline{\quad}$`,
      answer: { value: 620 },
      analysis: '34+28=62，所以 340+280=620。',
    },
    {
      p: 'g3u-NA-03-05', type: 'fill', difficulty: 2, score: 5,
      stem: String.raw`$3$ 千米 $=\underline{\quad}$ 米；$2$ 吨 $=\underline{\quad}$ 千克。`,
      answer: { blanks: ['3000', '2000'] },
      analysis: '1 千米 = 1000 米，所以 3 千米 = 3000 米；1 吨 = 1000 千克，所以 2 吨 = 2000 千克。',
    },
    {
      p: 'g3u-NA-04-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$506-278=\underline{\quad}$`,
      answer: { value: 228 },
      analysis: '个位 6 不够减 8，从十位退 1，但十位是 0，要再向百位退 1：16-8=8，十位 10-1-7=2，百位 5-1-2=2。结果是 228。',
    },
    {
      p: 'g3u-NA-05-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$236\times4=\underline{\quad}$`,
      answer: { value: 944 },
      analysis: '个位 6×4=24 写 4 进 2；十位 3×4+2=14 写 4 进 1；百位 2×4+1=9。结果是 944。',
    },
    {
      p: 'g3u-NA-05-06', type: 'application', difficulty: 3, score: 6,
      stem: '学校买了 3 箱矿泉水，每箱 24 瓶，每瓶 2 元。买这些矿泉水一共花了多少钱？',
      answer: { blanks: [{ value: 144, unit: '元' }] },
      analysis: '一箱 24 瓶，3 箱共 24×3=72（瓶）；每瓶 2 元，共 72×2=144（元）。',
    },
    {
      p: 'g3u-NA-06-03', type: 'judge', difficulty: 2, score: 4,
      stem: String.raw`比较大小：$\frac{1}{3}>\frac{1}{5}$。`,
      answer: { value: true },
      analysis: '分子相同的分数，分母越小分数越大。3 < 5，所以 1/3 > 1/5。正确。',
    },
    {
      p: 'g3u-NA-06-04', type: 'calculation', difficulty: 2, score: 4,
      stem: String.raw`计算：$\frac{2}{7}+\frac{3}{7}=\underline{\quad}$（结果用分数表示，如 3/7）`,
      answer: { value: '5/7' },
      analysis: '同分母分数相加，分母不变，分子相加：2+3=5，结果是 5/7。',
    },
    {
      p: 'g3u-GG-07-03', type: 'figure', difficulty: 2, score: 5,
      stem: '下面是一个长方形，它的周长是（　　）厘米。',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }], {
        w: 300, h: 210, fill: C.greenSoft, stroke: C.green,
        labels: [
          { x: 3, y: 0, text: '6 厘米', dy: -14 },
          { x: 6, y: 2, text: '4 厘米', dx: 34, dy: 5 },
        ],
      }),
      answer: { value: 20, unit: '厘米' },
      analysis: '长方形周长 =（长 + 宽）×2 =（6 + 4）×2 = 20（厘米）。',
    },
    {
      p: 'g3u-GG-07-04', type: 'reading', difficulty: 3, score: 6,
      stem: '用 4 个边长 1 厘米的小正方形拼成一个大正方形。回答下面各题。',
      media: svgGrid(8, 5, 32, `<rect x="46" y="46" width="64" height="64" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2"/><circle cx="110" cy="46" r="3" fill="${C.blue}"/>`),
      answer: { subs: [
        { label: '(1)', text: '拼成的大正方形的边长是多少厘米？', answer: { value: 2, unit: '厘米' } },
        { label: '(2)', text: '大正方形的周长是多少厘米？', answer: { value: 8, unit: '厘米' } },
        { label: '(3)', text: '大正方形的周长比 4 个小正方形的周长之和少多少厘米？', answer: { value: 8, unit: '厘米' } },
      ] },
      analysis: '(1) 每行 2 个，边长 2 厘米；(2) 2×4=8（厘米）；(3) 4 个小正方形周长和是 1×4×4=16（厘米），16-8=8（厘米）。',
    },
    {
      p: 'g3u-CP-09-01', type: 'application', difficulty: 3, score: 6,
      stem: '三（1）班参加跳绳比赛的有 25 人，参加踢毽比赛的有 20 人，两项都参加的有 8 人。参加这两项比赛的共有多少人？',
      answer: { blanks: [{ value: 37, unit: '人' }] },
      analysis: '两项都参加的 8 人被重复数了一次：25+20-8=37（人）。',
    },
    {
      p: 'g3u-GG-07-02', type: 'draw', difficulty: 2, score: 5,
      stem: '在方格纸上画一个周长是 12 厘米的长方形（每小格边长 1 厘米），并标出长和宽。',
      media: svgGrid(12, 7, 30),
      answer: { manual: true, rubric: '长 + 宽 = 6 厘米，如 4×2、5×1 均可；四条边分别平行且相邻两边垂直。' },
      analysis: '周长 12 厘米时，长 + 宽 = 6 厘米，可选 4 厘米和 2 厘米等组合。',
    },
  ],

  'grade3-down': [
    {
      p: 'g3d-NA-01-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$726\div6=\underline{\quad}$`,
      answer: { value: 121 },
      analysis: '7÷6=1 余 1；12÷6=2；6÷6=1。所以 726÷6=121。',
    },
    {
      p: 'g3d-NA-01-04', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$840\div4=\underline{\quad}$`,
      answer: { value: 210 },
      analysis: '8÷4=2；4÷4=1；0÷4=0，商的个位要写 0 占位。所以 840÷4=210。',
    },
    {
      p: 'g3d-NA-02-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$46\times35=\underline{\quad}$`,
      answer: { value: 1610 },
      analysis: '46×35=46×30+46×5=1380+230=1610。',
    },
    {
      p: 'g3d-NA-03-04', type: 'fill', difficulty: 2, score: 5,
      stem: String.raw`$3.5+1.8=\underline{\quad}$；　$7.2-4.5=\underline{\quad}$。`,
      answer: { blanks: ['5.3', '2.7'] },
      analysis: '小数加减法要把小数点对齐：3.5+1.8=5.3，7.2-4.5=2.7。',
    },
    {
      p: 'g3d-NA-04-02', type: 'choice', difficulty: 3, score: 4,
      stem: '下面年份中，是闰年的是（　　）。',
      options: ['2019 年', '2020 年', '2021 年', '2022 年'],
      answer: { index: [1] },
      analysis: '公历年份是 4 的倍数一般是闰年，2020÷4=505 没有余数，所以 2020 年是闰年。',
    },
    {
      p: 'g3d-NA-04-03', type: 'fill', difficulty: 3, score: 5,
      stem: String.raw`下午 3 时用 24 时计时法表示是 $\underline{\quad}$ 时；22 时是晚上 $\underline{\quad}$ 时。`,
      answer: { blanks: ['15', '10'] },
      analysis: '下午 3 时 = 12+3 = 15 时；22 时 = 22-12 = 10 时（晚上 10 时）。',
    },
    {
      p: 'g3d-NA-04-04', type: 'fill', difficulty: 3, score: 5,
      stem: '小明 8:20 到校，11:50 放学。他在学校一共待了（　　）小时（　　）分。',
      answer: { blanks: [{ value: 3, unit: '小时' }, { value: 30, unit: '分' }] },
      analysis: '11 时 50 分 - 8 时 20 分 = 3 时 30 分。',
    },
    {
      p: 'g3d-GG-06-02', type: 'figure', difficulty: 2, score: 5,
      stem: '下面长方形的面积是（　　）平方厘米。',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 5 }, { x: 0, y: 5 }], {
        w: 340, h: 230, fill: C.amberSoft, stroke: C.amber,
        labels: [
          { x: 4, y: 0, text: '8 厘米', dy: -14 },
          { x: 8, y: 2.5, text: '5 厘米', dx: 34, dy: 5 },
        ],
      }),
      answer: { value: 40, unit: '平方厘米' },
      analysis: '长方形面积 = 长 × 宽 = 8 × 5 = 40（平方厘米）。',
    },
    {
      p: 'g3d-GG-06-05', type: 'reading', difficulty: 3, score: 6,
      stem: '一个长 10 厘米、宽 6 厘米的长方形，在它的一个角上剪去一个边长 2 厘米的正方形（如图）。回答下面各题。',
      media: svgPolygon([{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 10, y: 4 }, { x: 10, y: 6 }, { x: 0, y: 6 }], {
        w: 380, h: 260, fill: C.purpleSoft, stroke: C.purple,
        labels: [{ x: 5, y: 6, text: '10 厘米', dy: 22 }, { x: 0, y: 3, text: '6 厘米', dx: -36, dy: 5 }],
      }),
      answer: { subs: [
        { label: '(1)', text: '剩下图形的面积是多少平方厘米？', answer: { value: 56, unit: '平方厘米' } },
        { label: '(2)', text: '剩下图形的周长是多少厘米？', answer: { value: 32, unit: '厘米' } },
      ] },
      analysis: '(1) 10×6-2×2=60-4=56（平方厘米）；(2) 在角上剪去一块，周长与原来相同，(10+6)×2=32（厘米）。',
    },
    {
      p: 'g3d-GG-05-01', type: 'choice', difficulty: 2, score: 4,
      stem: '早晨面向太阳站立，你的后面是（　　）。',
      options: ['东', '南', '西', '北'],
      answer: { index: [2] },
      analysis: '早晨太阳从东方升起，面向太阳就是面向东，后面的方向与东相对，是西。',
    },
    {
      p: 'g3d-SP-07-01', type: 'reading', difficulty: 3, score: 6,
      stem: '下面是三年级三个班男、女生人数统计表（单位：人）。',
      media: svgBars([
        { label: '一班男', value: 22 }, { label: '一班女', value: 20 },
        { label: '二班男', value: 24 }, { label: '二班女', value: 23 },
        { label: '三班男', value: 21 }, { label: '三班女', value: 25 },
      ], { unit: '', color: C.blue, w: 460 }),
      answer: { subs: [
        { label: '(1)', text: '三班一共有多少人？', answer: { value: 46, unit: '人' } },
        { label: '(2)', text: '男生最多的班级是二班，对吗？请填“对”或“错”。', answer: { value: '对', alts: ['正确', '是的'] } },
        { label: '(3)', text: '三年级一共有多少人？', answer: { value: 135, unit: '人' } },
      ] },
      analysis: '(1) 21+25=46（人）；(2) 男生 22、24、21，最多的是二班，对；(3) 46+47+46=135（人）。',
    },
    {
      p: 'g3d-GG-06-02', type: 'draw', difficulty: 3, score: 5,
      stem: '在方格纸上画一个面积是 12 平方厘米的长方形（每小格边长 1 厘米），并标出长和宽。',
      media: svgGrid(12, 7, 30),
      answer: { manual: true, rubric: '长×宽 = 12，如 6×2、4×3、12×1 均可；四条边平行垂直，长宽标注正确。' },
      analysis: '面积 12 平方厘米的长方形有 12×1、6×2、4×3 等不同形状。',
    },
  ],

  'grade4-up': [
    {
      p: 'g4u-NA-01-02', type: 'choice', difficulty: 2, score: 4,
      stem: '下面各数中，一个零也不读出来的是（　　）。',
      options: ['4050000', '4005000', '4000500', '4500000'],
      answer: { index: [3] },
      analysis: '4500000 读作“四百五十万”，中间的零都在数级末尾，不读出来。',
    },
    {
      p: 'g4u-NA-01-06', type: 'fill', difficulty: 3, score: 4,
      stem: String.raw`省略万位后面的尾数，$386400\approx\underline{\quad}$ 万。`,
      answer: { blanks: ['39'] },
      analysis: '386400 的万位是 8，千位是 6，满 5 要向前一位进 1，所以 386400 ≈ 39 万。',
    },
    {
      p: 'g4u-NA-03-01', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$208\times45=\underline{\quad}$`,
      answer: { value: 9360 },
      analysis: '208×45=208×40+208×5=8320+1040=9360。',
    },
    {
      p: 'g4u-NA-04-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`笔算：$858\div26=\underline{\quad}$`,
      answer: { value: 33 },
      analysis: '先把 26 看作 30 试商：858÷26=33。验算：26×33=858。',
    },
    {
      p: 'g4u-NA-03-05', type: 'application', difficulty: 3, score: 6,
      stem: '一列火车每小时行驶 160 千米，从甲地到乙地需要 4 小时。甲、乙两地相距多少千米？',
      answer: { blanks: [{ value: 640, unit: '千米' }] },
      analysis: '路程 = 速度 × 时间 = 160 × 4 = 640（千米）。',
    },
    {
      p: 'g4u-NA-03-03', type: 'judge', difficulty: 3, score: 4,
      stem: '两个数相乘，一个因数不变，另一个因数扩大到原来的 10 倍，积也扩大到原来的 10 倍。',
      answer: { value: true },
      analysis: '这是积的变化规律：一个因数不变，另一个因数乘几，积就乘几。说法正确。',
    },
    {
      p: 'g4u-GG-05-02', type: 'figure', difficulty: 2, score: 5,
      stem: '用量角器量出下面这个角的度数，填在括号里（只填数字）。',
      media: (() => {
        const vx = 60, vy = 160, deg = 60, R = 150;
        const rad = (d) => (d * Math.PI) / 180;
        const ax = vx + R * Math.cos(rad(deg)), ay = vy - R * Math.sin(rad(deg));
        return svgPolygon([{ x: 0, y: 0 }], {
          w: 300, h: 200, margin: 40,
          extra:
            `<line x1="${vx}" y1="${vy}" x2="${vx + R}" y2="${vy}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>` +
            `<line x1="${vx}" y1="${vy}" x2="${ax}" y2="${ay}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>` +
            `<path d="M${vx + 50},${vy} A50,50 0 0 0 ${vx + 50 * Math.cos(rad(deg))},${vy - 50 * Math.sin(rad(deg))}" fill="none" stroke="${C.blue}" stroke-width="2"/>` +
            `<circle cx="${vx}" cy="${vy}" r="4.5" fill="${C.pink}"/>`,
        });
      })(),
      answer: { value: 60, unit: '°' },
      analysis: '角的一边对准 0° 刻度线，另一边落在 60° 刻度上，所以这个角是 60°。',
    },
    {
      p: 'g4u-GG-05-03', type: 'choice', difficulty: 2, score: 4,
      stem: '一个角的度数是 89°，它是（　　）。',
      options: ['锐角', '直角', '钝角', '平角'],
      answer: { index: [0] },
      analysis: '小于 90° 的角叫锐角。89° < 90°，是锐角。',
    },
    {
      p: 'g4u-GG-06-01', type: 'choice', difficulty: 3, score: 4,
      stem: '在同一平面内，两条直线如果不相交，那么这两条直线（　　）。',
      options: ['一定互相平行', '一定互相垂直', '可能平行也可能垂直', '无法确定'],
      answer: { index: [0] },
      analysis: '在同一平面内不相交的两条直线互相平行，这是平行的定义。',
    },
    {
      p: 'g4u-SP-07-02', type: 'figure', difficulty: 3, score: 5,
      stem: '下面是 4 名同学一分钟跳绳的成绩，他们平均每分钟跳（　　）个。',
      media: svgBars([
        { label: '小明', value: 120 }, { label: '小红', value: 140 },
        { label: '小刚', value: 100 }, { label: '小丽', value: 140 },
      ], { unit: '', color: C.green }),
      answer: { value: 125, unit: '个' },
      analysis: '(120+140+100+140)÷4 = 500÷4 = 125（个）。',
    },
    {
      p: 'g4u-SP-07-01', type: 'reading', difficulty: 3, score: 6,
      stem: '水果店一天卖出四种水果的数量如下：苹果 120 千克，香蕉 90 千克，橘子 150 千克，葡萄 60 千克。',
      media: svgBars([
        { label: '苹果', value: 120 }, { label: '香蕉', value: 90 },
        { label: '橘子', value: 150 }, { label: '葡萄', value: 60 },
      ], { unit: '千克', color: C.amber, w: 440 }),
      answer: { subs: [
        { label: '(1)', text: '一共卖出多少千克水果？', answer: { value: 420, unit: '千克' } },
        { label: '(2)', text: '卖出的苹果比葡萄多多少千克？', answer: { value: 60, unit: '千克' } },
        { label: '(3)', text: '平均每种水果卖出多少千克？', answer: { value: 105, unit: '千克' } },
      ] },
      analysis: '(1) 120+90+150+60=420（千克）；(2) 120-60=60（千克）；(3) 420÷4=105（千克）。',
    },
    {
      p: 'g4u-GG-05-03', type: 'figure-interactive', difficulty: 3, score: 6,
      stem: '下面的 4 个角中，哪些是钝角？请依次点击（可多选），再点击“确认选择”。',
      media: pickObtuse,
      answer: { regions: ['a3'] },
      analysis: '钝角要大于 90° 且小于 180°。a1 是 50°（锐角），a2 是 90°（直角），a3 是 130°（钝角），a4 是 180°（平角）。',
    },
    {
      p: 'g4u-GG-05-04', type: 'draw', difficulty: 3, score: 5,
      stem: '用量角器在方格纸上画一个 75° 的角，并标出顶点和度数。',
      media: svgGrid(12, 7, 30),
      answer: { manual: true, rubric: '以一点为顶点，画出两条射线，角的度数与 75° 的误差在 ±2° 之内并正确标注。' },
      analysis: '考查量角器的使用与画角，由老师人工评阅。',
    },
  ],

  'grade4-down': [
    {
      p: 'g4d-NA-02-05', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`用简便方法计算：$125\times32\times25=\underline{\quad}$`,
      answer: { value: 100000 },
      analysis: '32 拆成 8×4：125×8=1000，25×4=100，1000×100=100000。',
    },
    {
      p: 'g4d-NA-02-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`用简便方法计算：$99\times38+38=\underline{\quad}$`,
      answer: { value: 3800 },
      analysis: '38 可写成 38×1，逆用乘法分配律：(99+1)×38=100×38=3800。',
    },
    {
      p: 'g4d-NA-03-04', type: 'fill', difficulty: 3, score: 5,
      stem: String.raw`把 3.6 扩大到原来的 100 倍是 $\underline{\quad}$；把 5.2 缩小到原来的 $\frac{1}{10}$ 是 $\underline{\quad}$。`,
      answer: { blanks: ['360', '0.52'] },
      analysis: '小数点向右移动两位是 360；向左移动一位是 0.52。',
    },
    {
      p: 'g4d-NA-04-03', type: 'calculation', difficulty: 3, score: 5,
      stem: String.raw`用简便方法计算：$4.7+3.8+5.3+6.2=\underline{\quad}$`,
      answer: { value: 20 },
      analysis: '加法交换律和结合律：(4.7+5.3)+(3.8+6.2)=10+10=20。',
    },
    {
      p: 'g4d-NA-01-04', type: 'judge', difficulty: 3, score: 4,
      stem: '0 除以任何数都得 0。',
      answer: { value: false },
      analysis: '0 不能作除数，所以“0 除以任何数”的说法不严谨，这句话是错的。',
    },
    {
      p: 'g4d-NA-02-03', type: 'choice', difficulty: 3, score: 4,
      stem: String.raw`下面算式中，与 $25\times(40+4)$ 结果相等的是（　　）。`,
      options: ['25×40+4', '25×40+25×4', '25×40×25×4', '25+40×4'],
      answer: { index: [1] },
      analysis: '乘法分配律：25×(40+4)=25×40+25×4=1000+100=1100。',
    },
    {
      p: 'g4d-GG-05-03', type: 'figure', difficulty: 3, score: 5,
      stem: '如图，三角形中已知两个角的度数，求 ∠3 的度数（只填数字）。',
      media: (() => {
        const vx = 150, vy = 30, R = 130;
        const rad = (d) => (d * Math.PI) / 180;
        const bx = vx - R, by = vy + 120, cxx = vx + R, cyy = vy + 120;
        return svgPolygon([{ x: 0, y: 0 }], {
          w: 300, h: 190, margin: 20,
          extra:
            `<polygon points="${vx},${vy} ${bx},${by} ${cxx},${cyy}" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
            `<text x="${vx - 22}" y="${vy + 26}" font-size="15" font-weight="700" fill="${C.ink}" font-family="system-ui">45°</text>` +
            `<text x="${cxx - 34}" y="${cyy - 14}" font-size="15" font-weight="700" fill="${C.ink}" font-family="system-ui">65°</text>` +
            `<text x="${vx - 6}" y="${vy + 8}" font-size="15" font-weight="700" fill="${C.pink}" font-family="system-ui">?</text>`,
        });
      })(),
      answer: { value: 70, unit: '°' },
      analysis: '三角形内角和是 180°：180°-45°-65°=70°。',
    },
    {
      p: 'g4d-GG-05-04', type: 'application', difficulty: 3, score: 6,
      stem: '一个四边形的三个内角分别是 85°、95°、110°，第四个内角是多少度？',
      answer: { blanks: [{ value: 70, unit: '°' }] },
      analysis: '四边形可以分成 2 个三角形，内角和是 360°：360°-85°-95°-110°=70°。',
    },
    {
      p: 'g4d-GG-06-01', type: 'choice', difficulty: 3, score: 4,
      stem: '下面图形中，对称轴最多的是（　　）。',
      options: ['正方形', '长方形', '等边三角形', '圆'],
      answer: { index: [3] },
      analysis: '正方形 4 条，长方形 2 条，等边三角形 3 条，圆有无数条对称轴。所以选圆。',
    },
    {
      p: 'g4d-SP-08-02', type: 'reading', difficulty: 3, score: 6,
      stem: '四年级两个班春季、秋季植树情况如下：一班春季 20 棵、秋季 15 棵；二班春季 25 棵、秋季 18 棵。',
      media: svgBars([
        { label: '一班春', value: 20 }, { label: '一班秋', value: 15 },
        { label: '二班春', value: 25 }, { label: '二班秋', value: 18 },
      ], { unit: '棵', color: C.green, w: 440 }),
      answer: { subs: [
        { label: '(1)', text: '一班一共植树多少棵？', answer: { value: 35, unit: '棵' } },
        { label: '(2)', text: '二班一共植树多少棵？', answer: { value: 43, unit: '棵' } },
        { label: '(3)', text: '两个班一共植树多少棵？', answer: { value: 78, unit: '棵' } },
      ] },
      analysis: '(1) 20+15=35；(2) 25+18=43；(3) 35+43=78（棵）。',
    },
    {
      p: 'g4d-CP-09-01', type: 'application', difficulty: 3, score: 6,
      stem: '笼子里有若干只鸡和兔。从上面数有 35 个头，从下面数有 94 只脚。鸡和兔各有多少只？',
      answer: { blanks: [{ value: 23, unit: '只鸡' }, { value: 12, unit: '只兔' }] },
      analysis: '假设都是鸡：35×2=70（只脚），比实际少 94-70=24（只）；每只兔多 2 只脚，兔 = 24÷2 = 12（只），鸡 = 35-12 = 23（只）。',
    },
    {
      p: 'g4d-GG-06-01', type: 'draw', difficulty: 3, score: 5,
      stem: '下图中虚线是图形的对称轴，请画出图形的另一半，使它成为一个轴对称图形。',
      media: halfShape,
      answer: { manual: true, rubric: '对应点到对称轴的距离相等，连线与对称轴垂直，补全后左右完全重合。' },
      analysis: '考查轴对称图形的表征与作图，由老师人工评阅。',
    },
  ],
};
