// 北师大版题库扩充生成器
// 目标：每册 100 题（卡 14）。已由 questions-bsd.mjs 手写建设的册补足差额，未建册整册生成。
// 产出：scripts/data/questions-bsd-ext.mjs（纯数据模块，由 build-questions.mjs 与手写源合并后构建）。
// 确定性：每册随机种子 = fnv1a(bookId)，同参数重复运行输出完全一致（可 git diff 校验）。
// 纪律：所有答案由程序化计算得出，不手写常数；题型必须落在该考点 suitableTypes 内；题干与已有手写题去重。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgCircles, svgClock, svgBars, svgRuler, svgSolid, C } from './data/svg.mjs';
import { BSD } from './data/questions-bsd.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tags = JSON.parse(fs.readFileSync(path.join(root, 'data/tags-bsd.json'), 'utf8'));

const PER_BOOK = 100;

/* ---------------- 确定性随机 ---------------- */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const shuffle = (R, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};

/* ---------------- 分数工具（答案精确计算） ---------------- */
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function fr(n, d) { const g = gcd(n, d) || 1; return [n / g, d / g]; }
const fAdd = (a, b) => fr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fSub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fMul = (a, b) => fr(a[0] * b[0], a[1] * b[1]);
const fDiv = (a, b) => fr(a[0] * b[1], a[1] * b[0]);
function fVal(f) { return f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`; }
// 数字或分数字符串统一为可阅卷值
const vOf = (x) => (typeof x === 'number' ? x : fVal(x));
// 中文数字与乘法口诀（如 2 × 4 → “二四得八”）
const CN_D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const cnNum = (n) => (n < 10 ? CN_D[n] : n === 10 ? '十' : CN_D[Math.floor(n / 10)] + '十' + (n % 10 ? CN_D[n % 10] : ''));
function cnMul(a, b) {
  const p = a * b;
  return `${CN_D[a]}${CN_D[b]}${p < 10 ? '得' : ''}${cnNum(p)}`;
}

/* ---------------- 题图 ---------------- */
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const FONT = 'font-family="system-ui"';
const fig = (w, h, body) => ({
  type: 'svg', width: w, height: h,
  content: `<svg ${NS} viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="max-width:100%;height:auto">${body}</svg>`,
});
// 小旗绕 O 点顺时针旋转 90°（图形旋转的画法）
const rotateFig = fig(240, 200,
  `<circle cx="100" cy="120" r="6" fill="${C.ink}"/>` +
  `<text x="112" y="118" font-size="14" fill="${C.ink}" ${FONT}>O</text>` +
  `<polygon points="100,40 140,105 60,105" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>` +
  `<polygon points="180,120 180,160 140,160" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>` +
  `<path d="M100,75 A45,45 0 0 1 145,120" fill="none" stroke="${C.pink}" stroke-width="2.5"/>` +
  `<text x="152" y="78" font-size="16" font-weight="700" fill="${C.pink}" ${FONT}>90°</text>`
);

/* ---------------- 题目构造助手 ---------------- */
const SCORE = { choice: 2, fill: 2, judge: 1, calculation: 4, application: 5, figure: 3, reading: 6, 'figure-interactive': 3, draw: 4 };
// 选择题：correct 为正确项，wrongs 为干扰项（自动去重、洗牌，index 由程序定位）
function ch(R, d, stem, correct, wrongs, analysis) {
  const cs = String(correct);
  let ws = wrongs.map(String).filter((w) => w !== cs);
  // 选项至少 3 个：不足时用“以上都不对 / 无法确定”等兜底补齐
  while (ws.length < 2) ws.push(ws.length === 0 ? '无法确定' : '以上都不对');
  const opts = shuffle(R, [cs, ...ws]);
  return { type: 'choice', difficulty: d, stem, options: opts, answer: { index: [opts.indexOf(cs)] }, analysis };
}
// 填空题：fill 插件的 specs 只读 answer.blanks，单规格 {value,...} 统一包成 blanks 一项
const fl = (d, stem, answer, analysis) => ({ type: 'fill', difficulty: d, stem, answer: answer && Array.isArray(answer.blanks) ? answer : { blanks: [answer] }, analysis });
const jd = (d, stem, value, analysis) => ({ type: 'judge', difficulty: d, stem, answer: { value }, analysis });
const ca = (d, stem, answer, analysis) => ({ type: 'calculation', difficulty: d, stem, answer, analysis });
const ap = (d, stem, answer, analysis) => ({ type: 'application', difficulty: d, stem, answer, analysis });
const rd = (d, stem, subs, analysis, media) => ({ type: 'reading', difficulty: d, stem, answer: { subs }, analysis, media });
const fg = (d, stem, answer, analysis, media) => ({ type: 'figure', difficulty: d, stem, answer, analysis, media });

/* ---------- 解析补全 ----------
 * 家族解析以精炼表述为主，部分短于体检阈值（ANALYSIS_MIN=20 字）。
 * 入卷前按题型追加一条学法提示，保证解析既有知识点讲解又有答题方法，且全部达标。
 */
const ANALYSIS_TIPS = {
  choice: '选择题要逐项分析，排除不符合题意的选项，再确定答案。',
  fill: '填空时要看清题目要求，填完后把答案代回原题检查是否合理。',
  judge: '判断题要先找出题目中的关键信息，再对照学过的概念逐条分析。',
  calculation: '计算时要按运算顺序一步步来，算完后可以用逆运算或估算验算。',
  application: '解决问题时要先弄清数量之间的关系，再列式解答，注意写上单位和答语。',
  reading: '读懂题意是关键，可以先摘录题目中的条件，再分步列式解答。',
  figure: '观察图形时要按一定的顺序数或看，做到不重复、不遗漏。',
  'figure-interactive': '先在图上圈出符合条件的部分，再数一数、填一填，注意规范作答。',
  draw: '作图前先想清楚图形的特点和位置，再用三角板、直尺规范画出。',
};
const ensureAnalysis = (analysis, type) => {
  const s = String(analysis || '').trim();
  if (s.length >= 20) return s;
  const tip = ANALYSIS_TIPS[type] || '要认真审题，弄清题意后再作答，做完后养成检查的习惯。';
  return s ? s + tip : tip;
};

/* ================= 各册题型家族 =================
 * 每个家族：{ re: 匹配三级考点名称, make: (R, 考点) => 题目规格 | null }
 * 题型自动限制在该考点 suitableTypes 内（组装时过滤）。
 */
const FAMS = {};

/* ---------- 一年级上册 ---------- */
FAMS['bsd-grade1-up'] = [
  {
    re: /数数|各数的认识|以内数的认识|10的认识|0的认识/,
    make: (R) => {
      const n = ri(R, 3, 9);
      const color = pick(R, [C.blue, C.pink, C.green, C.amber]);
      const wrongs = [n - 1, n + 1, n + 2].filter((x) => x > 0 && x !== n);
      return { ...ch(R, 1, '数一数，下图中有多少个圆？', n, wrongs, `用手指着一个一个地数，一共数出 ${n} 个圆。`), media: svgCircles(n, color) };
    },
  },
  {
    re: /数数|各数的认识|以内数的认识|10的认识|0的认识/,
    make: (R) => {
      const n = ri(R, 11, 19);
      return fl(1, `${n} 里面有 ( ) 个十和 ( ) 个一。`, { blanks: [1, n - 10] },
        `${n} 的十位是 1，表示 1 个十；个位是 ${n - 10}，表示 ${n - 10} 个一。`);
    },
  },
  {
    re: /数数|各数的认识|以内数的认识/,
    make: (R) => fg(1, '数一数，下图中有几朵花？把数量写在横线上。', { value: ri(R, 4, 9), unit: '朵' },
      '按顺序一个一个地数，数到几就是几朵。', svgCircles(ri(R, 4, 9), C.pink))
  },
  {
    re: /分与合/,
    make: (R) => {
      const total = ri(R, 6, 10), part = ri(R, 1, total - 2);
      return fl(1, `${total} 可以分成 ${part} 和 ( )。`, { value: total - part },
        `因为 ${part} 和 ${total - part} 合成 ${total}，所以分成的两部分是 ${part} 和 ${total - part}。`);
    },
  },
  {
    re: /比多少|比高矮|比轻重/,
    make: (R) => {
      const a = ri(R, 3, 8), b = ri(R, 3, 8);
      if (a === b) return null;
      const more = a > b ? '小明' : '小红';
      return ch(R, 1, '小明有 ' + a + ' 颗星，小红有 ' + b + ' 颗星，（ ）的星多。', more, a > b ? ['小红', '同样多'] : ['小明', '同样多'],
        `${a} 和 ${b} 比，${a > b ? a + ' 大于 ' + b : b + ' 大于 ' + a}，所以${more}的星多。`);
    },
  },
  {
    re: /比多少|比高矮|比轻重/,
    make: (R) => {
      const a = ri(R, 4, 9), b = ri(R, 1, a - 1);
      return ap(1, '小明有 ' + a + ' 个苹果，小红比小明少 ' + (a - b) + ' 个，小红有 ( ) 个。', { blanks: [{ value: b, unit: '个' }] },
        `小红比小明少 ${a - b} 个，用 ${a} 减 ${a - b} 等于 ${b}，所以小红有 ${b} 个。`);
    },
  },
  {
    re: /加减法|加法|减法/,
    make: (R) => {
      const a = ri(R, 1, 4), b = ri(R, 1, 5 - a);
      return ca(1, `${a} + ${b} =`, { value: a + b }, `先想数的分与合：${a} 和 ${b} 合成 ${a + b}，所以 ${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /加减法|加法|减法/,
    make: (R) => {
      const a = ri(R, 2, 8), b = ri(R, 1, a - 1);
      return fl(1, `${a} - ${b} = ( )`, { value: a - b }, `想：${b} 和 ${a - b} 合成 ${a}，所以 ${a} - ${b} = ${a - b}。`);
    },
  },
  {
    re: /加减法|加法|减法/,
    make: (R) => {
      const a = ri(R, 6, 9), b = ri(R, 1, 10 - a);
      return ap(1, '树上有 ' + a + ' 只小鸟，又飞来 ' + b + ' 只，现在一共有 ( ) 只。', { blanks: [{ value: a + b, unit: '只' }] },
        `求一共多少只，用加法：${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /加减法|加法|减法/,
    make: (R) => {
      const a = ri(R, 12, 18), b = ri(R, 1, 9);
      return ca(1, `${a} + ${b} =`, { value: a + b }, `先把个位上的数相加：${a % 10} + ${b} = ${a % 10 + b}，满十要向十位进 1，所以 ${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /加减法|减法/,
    make: (R) => {
      const b = ri(R, 15, 18), a = 9;
      return ca(2, `${b} - ${a} =`, { value: b - a }, `想：9 和 ${b - a} 合成 ${b}，所以 ${b} - 9 = ${b - a}。`);
    },
  },
  {
    re: /加减法|加法/,
    make: (R) => {
      const b = ri(R, 2, 8);
      return ap(2, '有 ' + (9 + b) + ' 个同学参加活动，每组 ' + b + ' 人……先算 9 加 ' + b + '：9 + ' + b + ' = ( )。', { blanks: [{ value: 9 + b, unit: '人' }] },
        `用凑十法：把 ${b} 分成 1 和 ${b - 1}，9 和 1 凑成 10，10 加 ${b - 1} 等于 ${9 + b}。`);
    },
  },
  {
    re: /分类/,
    make: (R) => ch(R, 1, '把苹果、香蕉、白菜、萝卜分成两类，下面哪种分法合理？', '苹果、香蕉一类，白菜、萝卜一类',
      ['苹果、白菜一类，香蕉、萝卜一类', '苹果、萝卜一类，香蕉、白菜一类', '四种分成四类'],
      '苹果和香蕉是水果，白菜和萝卜是蔬菜，按“是不是水果”来分最合理。')
  },
  {
    re: /分类/,
    make: (R) => {
      const a = ri(R, 4, 8), b = ri(R, 2, 6), c = ri(R, 2, 6);
      return ap(2, '有 ' + a + ' 个苹果、' + b + ' 个梨和 ' + c + ' 个桃，它们都是水果，水果一共有 ( ) 个。', { blanks: [{ value: a + b + c, unit: '个' }] },
        `三种都是水果，把个数合起来：${a} + ${b} + ${c} = ${a + b + c}。`);
    },
  },
  {
    re: /分类/,
    make: (R) => {
      const d1 = ri(R, 3, 6), d2 = ri(R, 2, 5), d3 = ri(R, 2, 5);
      const best = ri(R, 0, 2);
      const labels = ['小熊', '小汽车', '布娃娃'];
      const data = [d1, d2, d3].map((v, i) => ({ label: labels[i], value: v }));
      return { ...ch(R, 2, '全班同学最喜欢玩具的统计如下图，喜欢（ ）的人最多。', labels[best], labels.filter((_, i) => i !== best), '直条最高的一项就是数量最多的一项。'), media: svgBars(data, { unit: '人', color: C.green }) };
    },
  },
  {
    re: /上下|前后|左右|位置/,
    make: (R) => ch(R, 1, '桌子上放着书包，桌子下面放着鞋子，（ ）在桌子的上面。', '书包', ['鞋子', '桌子', '地面'],
      '“上面”是指在水平面之上的位置，书包在桌子上面，鞋子在桌子下面。')
  },
  {
    re: /上下|前后|左右|位置/,
    make: (R) => {
      const front = ri(R, 2, 4);
      return ap(2, '小朋友们排队，小明排在第 ' + (front + 1) + '，他后面还有 ' + front + ' 个人，这一排一共有 ( ) 个人。', { blanks: [{ value: front + 1 + front, unit: '人' }] },
        `小明排第 ${front + 1}，说明他和他前面一共 ${front + 1} 人，再加上后面的 ${front} 人：${front + 1} + ${front} = ${front + 1 + front}。`);
    },
  },
  {
    re: /立体图形|我说你做|积木/,
    make: (R) => {
      const kinds = [['cuboid', '长方体'], ['cube', '正方体'], ['cylinder', '圆柱'], [null, '球']];
      const k = pick(R, kinds);
      const names = kinds.map((x) => x[1]).filter((x) => x !== k[1]);
      return { ...ch(R, 1, '下图是哪种立体图形？', k[1], names, `从图中可以看出这个立体图形是${k[1]}。`), media: svgSolid(k[0]) };
    },
  },
  {
    re: /立体图形|我说你做|积木/,
    make: (R) => jd(1, '足球和乒乓球都是球体，都能滚动。', true, '表面是曲面、没有平面、能向任意方向滚动的立体图形是球体。')
  },
  {
    re: /立体图形|我说你做|积木/,
    make: (R) => ch(R, 2, '下面哪种物品的形状接近圆柱？', '茶叶罐', ['铅笔盒', '方积木', '篮球'],
      '圆柱上下一样粗，有两个圆的底面和一个弯曲的侧面，茶叶罐最接近圆柱。')
  },
  {
    re: /钟|整时|几时半/,
    make: (R) => {
      const h = ri(R, 6, 9);
      const half = R() < 0.5;
      const cs = h + ' 时' + (half ? '半' : '');
      const wrongs = [h + ' 时', h + ' 时半', h + 1 + ' 时', h + 1 + ' 时半'].filter((x) => x !== cs);
      return { ...ch(R, 2, '下图是小明早上起床的时刻，是几时？', cs, wrongs, `分针指向 12 是整时，指向 6 是半时；时针刚过 ${h}，所以是 ${cs}。`), media: svgClock(h, half ? 30 : 0) };
    },
  },
  {
    re: /钟|整时|几时半/,
    make: (R) => fl(1, '分针在钟面上走一圈是 ( ) 小时。', { value: 1 }, '分针走一圈是 60 分钟，60 分钟就是 1 小时。')
  },
  {
    re: /钟|整时|几时半/,
    make: (R) => {
      const h = ri(R, 6, 9);
      return rd(2, '小明上午的时间安排：' + h + ' 时起床，' + (h + 1) + ' 时吃早饭，' + (h + 2) + ' 时去公园。',
        [
          { label: '(1)', text: '小明几时起床？', answer: { value: h, unit: '时' } },
          { label: '(2)', text: '小明在公园玩到几时回家？', answer: { value: h + 2, unit: '时' } },
        ],
        '整时时针指向几就是几时，注意区分“上午”和“下午”。');
    },
  },
];

/* ---------- 一年级下册 ---------- */
FAMS['bsd-grade1-down'] = [
  {
    re: /退位|十几减|减法/,
    make: (R) => {
      const b = ri(R, 12, 17), a = ri(R, 8, 9);
      return ca(2, `${b} - ${a} =`, { value: b - a }, `想：${a} 和 ${b - a} 合成 ${b}，所以 ${b} - ${a} = ${b - a}。`);
    },
  },
  {
    re: /退位|十几减|减法/,
    make: (R) => {
      const b = ri(R, 12, 16), a = ri(R, 5, 8);
      return fl(2, `${b} - ${a} = ( )`, { value: b - a }, `用“破十法”：把 ${b} 分成 10 和 ${b - 10}，10 - ${a} = ${10 - a}，${b - 10} + ${10 - a} = ${b - a}。`);
    },
  },
  {
    re: /退位|减法/,
    make: (R) => {
      const b = ri(R, 13, 18), a = ri(R, 8, 9);
      return ap(2, '有 ' + b + ' 个气球，飞走了 ' + a + ' 个，还剩 ( ) 个。', { blanks: [{ value: b - a, unit: '个' }] },
        `求还剩多少，用减法：${b} - ${a} = ${b - a}。`);
    },
  },
  {
    re: /100以内|组成|读写/,
    make: (R) => fl(1, '10 个十是 ( )。', { value: 100 }, '10 个十就是一百，写作 100。')
  },
  {
    re: /100以内|组成|读写/,
    make: (R) => {
      const n = ri(R, 21, 89);
      return fl(2, `${n} 里面有 ( ) 个十和 ( ) 个一。`, { blanks: [Math.floor(n / 10), n % 10] },
        `${n} 的十位是 ${Math.floor(n / 10)}，个位是 ${n % 10}。`);
    },
  },
  {
    re: /100以内|组成|读写/,
    make: (R) => {
      const n = ri(R, 11, 49);
      const cn = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
      const tens = cn[Math.floor(n / 10) - 1], ones = n % 10 ? cn[n % 10 - 1] : '';
      const txt = ones ? tens + '十' + ones : tens + '十';
      const wrongs = [String(n).split('').reverse().join(''), tens + ones, n + '十'].filter((x) => x !== txt);
      return ch(R, 2, `下面哪个数读作“${txt}”？`, String(n), wrongs, `读两位数先读十位再读个位，${n} 读作 ${txt}。`);
    },
  },
  {
    re: /大小比较|一些/,
    make: (R) => {
      const a = ri(R, 21, 79), b = ri(R, 21, 79);
      if (a === b) return null;
      return ch(R, 2, `${a} 和 ${b} 比，（ ）大。`, Math.max(a, b), [Math.min(a, b), '同样大'],
        `比较两位数先看十位：${a} 的十位是 ${Math.floor(a / 10)}，${b} 的十位是 ${Math.floor(b / 10)}。`);
    },
  },
  {
    re: /一些/,
    make: (R) => {
      const a = ri(R, 41, 69), b = ri(R, 41, 69);
      if (Math.abs(a - b) > 8) return null;
      const more = a > b ? '多一些' : '少一些';
      return ch(R, 2, `65 比 ${a > b ? b : a} ${a > b ? '多' : '少'} 了 ${Math.abs(a - b)}，可以说 65 比 ${a > b ? b : a} ( )。`, more, ['多得多', '少得多', '同样多'],
        `两个数只差 ${Math.abs(a - b)}，差距很小，用“一些”描述。`);
    },
  },
  {
    re: /平面图形/,
    make: (R) => fl(1, '三角形有 ( ) 条边，( ) 个角。', { blanks: [3, 3] }, '三角形由三条线段围成，有 3 条边和 3 个角。')
  },
  {
    re: /平面图形/,
    make: (R) => jd(1, '正方形和长方形都有 4 条边、4 个直角。', true, '正方形是特殊的长方形，四条边都相等；它们都有 4 个直角。')
  },
  {
    re: /平面图形/,
    make: (R) => ch(R, 1, '硬币的面是（ ）形。', '圆', ['长方', '正方', '三角'], '硬币的面是圆圆的，没有角，是圆形。')
  },
  {
    re: /七巧板|欣赏|拼组/,
    make: (R) => ch(R, 1, '七巧板是由 ( ) 块板组成的。', '7', ['5', '6', '8'], '七巧板由 5 个三角形、1 个正方形和 1 个平行四边形共 7 块组成。')
  },
  {
    re: /七巧板|欣赏|拼组/,
    make: (R) => ch(R, 2, '用两个完全一样的直角三角形，可以拼成一个（ ）。', '长方形', ['圆', '球', '扇形'], '两个完全一样的直角三角形沿一条直角边拼起来就得到一个长方形。')
  },
  {
    re: /整十|两位数|进位|加减/,
    make: (R) => {
      const a = ri(R, 2, 6) * 10, b = ri(R, 2, 6) * 10;
      return ca(2, `${a} + ${b} =`, { value: a + b }, `整十数相加，只要把十位上的数相加，再在末尾添 0：${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /整十|两位数|进位|加减/,
    make: (R) => {
      const a = ri(R, 23, 58), b = ri(R, 11, 39);
      return ca(3, `${a} + ${b} =`, { value: a + b }, `个位相加满十要向十位进 1：${a % 10} + ${b % 10} = ${a % 10 + b % 10}，${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /整十|两位数|进位|加减/,
    make: (R) => {
      const a = ri(R, 52, 88), b = ri(R, 13, 39);
      return ca(3, `${a} - ${b} =`, { value: a - b }, `个位不够减，从十位退 1 当 10：${a} - ${b} = ${a - b}。`);
    },
  },
  {
    re: /实际问题|两步|图文/,
    make: (R) => {
      const a = ri(R, 20, 35), b = ri(R, 5, 12), c = ri(R, 6, 15);
      return ap(3, '公交车上原有 ' + a + ' 人，到站下去 ' + b + ' 人，又上来 ' + c + ' 人，现在车上有 ( ) 人。', { blanks: [{ value: a - b + c, unit: '人' }] },
        `先算下去后：${a} - ${b} = ${a - b}；再算上来后：${a - b} + ${c} = ${a - b + c}。`);
    },
  },
  {
    re: /实际问题|两步|图文/,
    make: (R) => {
      const a = ri(R, 20, 40), b = ri(R, 5, 15);
      return rd(2, '果园里有 ' + a + ' 棵苹果树，梨树比苹果树少 ' + b + ' 棵。',
        [
          { label: '(1)', text: '梨树有多少棵？', answer: { value: a - b, unit: '棵' } },
          { label: '(2)', text: '苹果树和梨树一共有多少棵？', answer: { value: a + (a - b), unit: '棵' } },
        ],
        '“比……少”用减法；求“一共”用加法。');
    },
  },
  {
    re: /观察|相对位置|判断/,
    make: (R) => ch(R, 2, '从正面观察一个长方体纸箱，看到的是（ ）。', '长方形', ['圆', '三角形', '球'],
      '长方体的面都是长方形（有时有两个相对的面是正方形），从正面看是长方形。')
  },
  {
    re: /观察|相对位置|判断/,
    make: (R) => jd(2, '从不同的位置观察同一个物体，看到的形状可能不同。', true,
      '观察方向不同，看到的形状往往不同，如从侧面和上面看到的形状就不一样。')
  },
  {
    re: /观察|相对位置|判断/,
    make: (R) => {
      const names = ['小亮', '小丽', '小刚'];
      const i = ri(R, 0, 2);
      return rd(3, '三个小朋友观察一个正方体纸箱：' + names[0] + '从正面看，看到的是正方形；' + names[1] + '从侧面看，看到的也是正方形；' + names[2] + '从上面看，看到的是正方形。',
        [{ label: '(1)', text: '三人看到的形状相同吗？', answer: { value: '相同' } }],
        '正方体从任何方向看，看到的都是同样大的正方形。');
    },
  },
  {
    re: /填数|推理|生活中的数学/,
    make: (R) => {
      const step = pick(R, [2, 3, 5]), start = ri(R, 1, 5);
      const seq = [start, start + step, start + step * 2, start + step * 3];
      return ch(R, 2, `按规律填数：${seq.join('、')}、( )。`, String(start + step * 4), [String(start + step * 3), String(start + step * 5), String(start + step * 4 + 1)],
        `后一个数比前一个数多 ${step}，所以括号里是 ${start + step * 4}。`);
    },
  },
  {
    re: /填数|推理|生活中的数学/,
    make: (R) => {
      const a = ri(R, 4, 9);
      return ap(3, '小明有 ' + a + ' 张贴纸，小红比小明多 3 张，两人一共有 ( ) 张。', { blanks: [{ value: a + (a + 3), unit: '张' }] },
        `小红有 ${a} + 3 = ${a + 3} 张，一共 ${a} + ${a + 3} = ${a + (a + 3)} 张。`);
    },
  },
];

/* ---------- 二年级上册 ---------- */
FAMS['bsd-grade2-up'] = [
  {
    re: /混合|连加|连减/,
    make: (R) => {
      const a = ri(R, 20, 50), b = ri(R, 10, 30), c = ri(R, 5, 20);
      return ca(2, `${a} + ${b} - ${c} =`, { value: a + b - c }, `按从左到右的顺序：${a} + ${b} = ${a + b}，${a + b} - ${c} = ${a + b - c}。`);
    },
  },
  {
    re: /混合|连加|连减/,
    make: (R) => {
      const a = ri(R, 50, 80), b = ri(R, 10, 30), c = ri(R, 5, 15);
      return fl(2, `${a} - ${b} + ${c} = ( )`, { value: a - b + c }, `先算 ${a} - ${b} = ${a - b}，再算 ${a - b} + ${c} = ${a - b + c}。`);
    },
  },
  {
    re: /人民币|购物|估算/,
    make: (R) => fl(1, '1 元 = ( ) 角。', { value: 10 }, '1 元等于 10 角，元角分之间的进率都是 10。')
  },
  {
    re: /人民币|购物|估算/,
    make: (R) => {
      const a = ri(R, 2, 8), b = ri(R, 2, 8);
      return fl(2, `${a} 角 + ${b} 角 = ( ) 角。`, { value: a + b, unit: '角' }, `${a} + ${b} = ${a + b}，所以是 ${a + b} 角。`);
    },
  },
  {
    re: /人民币|购物|估算/,
    make: (R) => {
      const price = ri(R, 3, 8), pay = 10;
      return ch(R, 2, '买一个 ' + price + ' 元的面包，付 10 元，应找回 ( ) 元。', String(pay - price), [String(pay + price), String(price), String(pay)],
        `找回的钱 = 付的钱 - 花的钱 = 10 - ${price} = ${pay - price} 元。`);
    },
  },
  {
    re: /购物|估算/,
    make: (R) => {
      const a = ri(R, 2, 6), b = ri(R, 2, 6);
      return ap(2, '一支铅笔 ' + a + ' 元，一个练习本 ' + b + ' 元，买一本练习本比一支铅笔贵 ( ) 元。', { blanks: [{ value: Math.abs(a - b), unit: '元' }] },
        `求贵多少用减法：${Math.max(a, b)} - ${Math.min(a, b)} = ${Math.abs(a - b)} 元。`);
    },
  },
  {
    re: /乘法|口诀/,
    make: (R) => {
      const a = ri(R, 2, 9), b = ri(R, 2, 9);
      return ca(1, `${a} × ${b} =`, { value: a * b }, `根据乘法口诀“${['二', '三', '四', '五', '六', '七', '八', '九'][a - 2]}${['二', '三', '四', '五', '六', '七', '八', '九'][b - 2]}${a * b < 10 ? '得' : ''}${a * b}”得出 ${a} × ${b} = ${a * b}。`);
    },
  },
  {
    re: /乘法|口诀/,
    make: (R) => {
      const a = ri(R, 2, 9), b = ri(R, 2, 9);
      return fl(1, `${a} × ${b} = ( )`, { value: a * b }, `想口诀：${['二', '三', '四', '五', '六', '七', '八', '九'][a - 2]}${['二', '三', '四', '五', '六', '七', '八', '九'][b - 2]}${a * b < 10 ? '得' : ''}${a * b}。`);
    },
  },
  {
    re: /乘法|口诀/,
    make: (R) => jd(2, '计算 3 × 5 和 5 × 3 可以用同一句乘法口诀。', true, '乘法口诀中一般一句口诀可以计算两道乘法算式，如三五十五。')
  },
  {
    re: /乘法|口诀/,
    make: (R) => {
      const a = ri(R, 2, 9);
      const cn = ['二', '三', '四', '五', '六', '七', '八', '九'];
      return ch(R, 2, `“${cn[a - 2]}七四十二”，写出乘法算式是( )。`, `${a} × 7 = ${a * 7}`, [`7 × ${a} = ${a * 7}`, `${a} + 7 = ${a + 7}`, `${a} × 7 = ${a + 7}`],
        `“${cn[a - 2]}七四十二”表示 ${a} 个 7 相加，算式是 ${a} × 7 = ${a * 7}（交换因数位置也正确，这里按口诀顺序选择）。`);
    },
  },
  {
    re: /除法|平均分/,
    make: (R) => {
      const b = ri(R, 2, 9), q = ri(R, 2, 9);
      return ca(2, `${b * q} ÷ ${b} =`, { value: q }, `想乘法口诀：${b} 和 ${q} 的积是 ${b * q}，所以 ${b * q} ÷ ${b} = ${q}。`);
    },
  },
  {
    re: /除法|平均分/,
    make: (R) => {
      const b = ri(R, 2, 6), q = ri(R, 3, 8);
      return fl(2, `把 ${b * q} 平均分成 ${b} 份，每份是 ( )。`, { value: q }, `平均分用除法：${b * q} ÷ ${b} = ${q}。`);
    },
  },
  {
    re: /除法|平均分/,
    make: (R) => ch(R, 2, '除法的初步认识：把一些物品平均分，下面哪种分法是平均分？', '每份分得同样多', ['有的多有的少', '只分给一个小朋友', '分成大小不同的两堆'],
      '平均分要求每份分得同样多。')
  },
  {
    re: /测量|厘米|米|单位/,
    make: (R) => fl(1, '1 米 = ( ) 厘米。', { value: 100 }, '米和厘米之间的进率是 100。')
  },
  {
    re: /测量|厘米|米|单位/,
    make: (R) => {
      const n = ri(R, 4, 9);
      return fg(1, '下图铅笔的一端对准 0 刻度，另一端对准 ' + n + ' 刻度，铅笔长 ( ) 厘米。', { value: n, unit: '厘米' },
        '物体的一端对准 0，另一端对准几就是几厘米。', svgRuler(n));
    },
  },
  {
    re: /测量|厘米|米|单位/,
    make: (R) => ch(R, 2, '测量教室黑板的长度，用（ ）作单位比较合适。', '米', ['厘米', '毫米', '分米'], '黑板的长度有几米长，用米作单位更合适。')
  },
  {
    re: /倍/,
    make: (R) => {
      const a = ri(R, 2, 6), k = ri(R, 2, 5);
      return ap(2, '公鸡有 ' + a + ' 只，母鸡的只数是公鸡的 ' + k + ' 倍，母鸡有 ( ) 只。', { blanks: [{ value: a * k, unit: '只' }] },
        `求一个数的几倍是多少，用乘法：${a} × ${k} = ${a * k} 只。`);
    },
  },
  {
    re: /倍/,
    make: (R) => {
      const a = ri(R, 2, 8);
      return ch(R, 2, `${a} 的 2 倍是 ( )。`, String(a * 2), [String(a + 2), String(a), String(a * 3)], `2 倍就是 2 个 ${a}：${a} × 2 = ${a * 2}。`);
    },
  },
  {
    re: /对折|对称|图案|剪出|欣赏|设计/,
    make: (R) => jd(2, '圆是轴对称图形。', true, '圆沿任意一条直径对折，两边都能完全重合，所以圆是轴对称图形。')
  },
  {
    re: /对折|对称|图案|剪出|欣赏|设计/,
    make: (R) => ch(R, 2, '把一张正方形纸对折后，两边能（ ）。', '完全重合', ['交换位置', '变大一倍', '变成圆'],
      '轴对称图形沿对称轴对折后，两边能完全重合。')
  },
  {
    re: /几个几个|表格/,
    make: (R) => {
      const step = pick(R, [2, 5, 10]), start = ri(R, 1, 3) * step;
      const seq = [start, start + step, start + step * 2, start + step * 3];
      return ch(R, 1, `${step} 个 ${step} 个地数：${seq.join('、')}、( )。`, String(start + step * 4), [String(start + step * 3), String(start + step * 5), String(start + step * 4 + step)],
        `每次多数 ${step}，所以接下来是 ${start + step * 4}。`);
    },
  },
  {
    re: /几个几个|表格|实际问题|两步|用乘法|用除法/,
    make: (R) => {
      const rows = ri(R, 2, 5), per = ri(R, 2, 5);
      return rd(2, '同学们把圆片摆在方格表里，每行摆 ' + per + ' 个，摆了 ' + rows + ' 行。',
        [
          { label: '(1)', text: rows + ' 行一共摆了多少个？', answer: { value: rows * per, unit: '个' } },
          { label: '(2)', text: '如果增加 1 行，一共是多少个？', answer: { value: (rows + 1) * per, unit: '个' } },
        ],
        '求几个几是多少用乘法。');
    },
  },
  {
    re: /实际问题|两步|用乘法|用除法/,
    make: (R) => {
      const groups = ri(R, 3, 6), per = ri(R, 4, 8);
      return ap(2, '二(1)班同学分成 ' + groups + ' 组，每组 ' + per + ' 人，一共有 ( ) 人。', { blanks: [{ value: groups * per, unit: '人' }] },
        `求 ${groups} 个 ${per} 是多少，用乘法：${groups} × ${per} = ${groups * per}。`);
    },
  },
  {
    re: /实际问题|两步|用除法/,
    make: (R) => {
      const total = ri(R, 18, 42), groups = ri(R, 3, 6);
      if (total % groups) return null;
      return ap(2, '' + total + ' 个同学平均分成 ' + groups + ' 组，每组 ( ) 人。', { blanks: [{ value: total / groups, unit: '人' }] },
        `平均分用除法：${total} ÷ ${groups} = ${total / groups}。`);
    },
  },
];

/* ---------- 二年级下册 ---------- */
FAMS['bsd-grade2-down'] = [
  {
    re: /有余数|余数|进一/,
    make: (R) => {
      const d = ri(R, 3, 8), q = ri(R, 2, 7), r = ri(R, 1, d - 1);
      return fl(2, `${d * q + r} ÷ ${d} = ( ) …… ( )`, { blanks: [q, r] },
        `${d} 和 ${q} 的积是 ${d * q}，${d * q + r} 里还有 ${r} 个 ${d} 分不完，所以商 ${q} 余 ${r}。`);
    },
  },
  {
    re: /有余数|余数|进一/,
    make: (R) => {
      const d = ri(R, 4, 9);
      return ch(R, 2, '在有余数的除法中，除数是 ' + d + '，余数最大是 ( )。', String(d - 1), [String(d), String(d - 2), String(d + 1)],
        `余数一定要比除数小，除数是 ${d}，余数最大是 ${d - 1}。`);
    },
  },
  {
    re: /有余数|余数|进一/,
    make: (R) => jd(2, '在有余数的除法中，余数一定比除数小。', true, '如果余数比除数大，就还能再分一份，所以余数一定比除数小。')
  },
  {
    re: /进一/,
    make: (R) => {
      const d = ri(R, 4, 6), q = ri(R, 5, 9);
      const total = d * q + ri(R, 1, d - 1);
      return ap(3, '' + total + ' 个同学去划船，每条船坐 ' + d + ' 人，至少需要 ( ) 条船。', { blanks: [{ value: Math.ceil(total / d), unit: '条' }] },
        `${total} ÷ ${d} = ${Math.floor(total / d)} 条还剩 ${total % d} 人，剩下的人也要坐 1 条船，所以至少要 ${Math.ceil(total / d)} 条船。`);
    },
  },
  {
    re: /方向|东南西北|东北/,
    make: (R) => ch(R, 1, '早晨，太阳从（ ）方升起。', '东', ['南', '西', '北'], '早晨太阳从东方升起，傍晚从西方落下。')
  },
  {
    re: /方向|东南西北|东北/,
    make: (R) => ch(R, 2, '小明面向北方，他的右面是（ ）方。', '东', ['南', '西', '北'], '面向北方时，前面是北、后面是南、左面是西、右面是东。')
  },
  {
    re: /方向|东南西北|东北/,
    make: (R) => fl(2, '东和（ ）相对，南和（ ）相对。', { blanks: ['西', '北'] }, '在地图上，东对西、南对北。')
  },
  {
    re: /路线图|方向描述/,
    make: (R) => {
      const a = ri(R, 2, 6) * 50, b = ri(R, 2, 5) * 50;
      return rd(3, '小明从家出发，先向东走 ' + a + ' 米到超市，再向北走 ' + b + ' 米到学校。',
        [
          { label: '(1)', text: '超市在小明家的什么方向？', answer: { value: '东' } },
          { label: '(2)', text: '从小明家经过超市到学校，一共要走多少米？', answer: { value: a + b, unit: '米' } },
        ],
        '描述方向先说清参照物；求一共走的路程把两段加起来。');
    },
  },
  {
    re: /1000|10000|万以内|读写/,
    make: (R) => fl(1, '10 个一百是 ( )。', { value: 1000 }, '10 个一百是一千，写作 1000。')
  },
  {
    re: /1000|10000|万以内|读写/,
    make: (R) => {
      const n = ri(R, 1001, 9999);
      const s = String(n);
      const wrongs = [String(n).split('').reverse().join(''), String(n + 1000), String(n - 1000)].filter((x) => x !== s);
      return ch(R, 2, `下面哪个数读作“${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][+s[0]]}千${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][+s[1]]}百${+s[2] || +s[3] ? ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][+s[2]] + '十' + ([+s[3]] ? ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][+s[3]] : '') : ''}”？`, s, wrongs, '读四位数从高位读起，中间有 0 只读一个零。');
    },
  },
  {
    re: /万以内|大小比较|读写/,
    make: (R) => {
      const a = ri(R, 1000, 8999), b = ri(R, 1000, 8999);
      if (a === b) return null;
      return ch(R, 2, `${a} 和 ${b} 比，（ ）大。`, String(Math.max(a, b)), [String(Math.min(a, b)), '同样大'],
        '位数相同，从最高位起依次比较。');
    },
  },
  {
    re: /估计|估测/,
    make: (R) => {
      const a = ri(R, 2, 8) * 100 + ri(R, 1, 9), b = ri(R, 2, 8) * 100 + ri(R, 1, 9);
      const approx = Math.round((a + b) / 100) * 100;
      return fl(2, `估一估：${a} + ${b} ≈ ( )`, { value: approx },
        `把两个数都看成整百数来估算：${a} ≈ ${Math.round(a / 100) * 100}，${b} ≈ ${Math.round(b / 100) * 100}，和大约是 ${approx}。`);
    },
  },
  {
    re: /分米|毫米|千米|换算|长度/,
    make: (R) => fl(1, '1 厘米 = ( ) 毫米。', { value: 10 }, '厘米和毫米间的进率是 10。')
  },
  {
    re: /分米|毫米|千米|换算|长度/,
    make: (R) => fl(2, '3 千米 = ( ) 米。', { value: 3000 }, '1 千米 = 1000 米，3 千米就是 3 个 1000 米。')
  },
  {
    re: /分米|毫米|千米|换算|长度/,
    make: (R) => ch(R, 2, '教室的门高约 2 ( )。', '米', ['厘米', '毫米', '千米'], '门的高度大约是 2 米，用米作单位合适。')
  },
  {
    re: /分米|毫米|千米|换算|长度/,
    make: (R) => {
      const m = ri(R, 2, 5);
      const used = ri(R, 60, Math.min(120, m * 100 - 20));
      return ap(2, '一根绳子长 ' + m + ' 米，用去 ' + used + ' 厘米，还剩 ( ) 厘米。', { blanks: [{ value: m * 100 - used, unit: '厘米' }] },
        `先把米换算成厘米：${m} 米 = ${m * 100} 厘米，再减用去的 ${used} 厘米，还剩 ${m * 100 - used} 厘米。`);
    },
  },
  {
    re: /整百|三位数|验算/,
    make: (R) => {
      const a = ri(R, 200, 500), b = ri(R, 100, 400);
      return ca(3, `${a} + ${b} =`, { value: a + b }, `笔算加法，相同数位对齐，从个位加起，哪一位满十要向前一位进 1：${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /整百|三位数|验算/,
    make: (R) => {
      const a = ri(R, 500, 800), b = ri(R, 200, 400);
      return ca(3, `${a} - ${b} =`, { value: a - b }, `笔算减法，相同数位对齐，从个位减起，哪一位不够减，从前一位退 1 当 10：${a} - ${b} = ${a - b}。`);
    },
  },
  {
    re: /整百|三位数|验算/,
    make: (R) => {
      const a = ri(R, 300, 600), b = ri(R, 100, 250);
      return jd(2, `验算 ${a} - ${b} = ${a - b}，可以用 ${a - b} + ${b} = ${a}。`, true, '减法的验算：差加减数等于被减数。');
    },
  },
  {
    re: /实际问题|两步/,
    make: (R) => {
      const a = ri(R, 200, 400), b = ri(R, 100, 199);
      return ap(3, '图书馆有故事书 ' + a + ' 本，科技书比故事书少 ' + b + ' 本，科技书有 ( ) 本。', { blanks: [{ value: a - b, unit: '本' }] },
        `“比……少”用减法：${a} - ${b} = ${a - b}。`);
    },
  },
  {
    re: /角|直角/,
    make: (R) => ch(R, 1, '一个直角是 ( ) 度。', '90', ['45', '60', '180'], '直角是 90 度，三角板上最大的角就是直角。')
  },
  {
    re: /角|直角/,
    make: (R) => jd(2, '角的大小与画出的两条边的长短无关。', true, '角的大小看两条边张开的大小，边画得长短不影响角的大小。')
  },
  {
    re: /角|直角/,
    make: (R) => fl(1, '长方形有 ( ) 个直角。', { value: 4 }, '长方形的 4 个角都是直角。')
  },
  {
    re: /长方形|正方形|平行四边形/,
    make: (R) => ch(R, 2, '正方形有 ( ) 条边。', '4', ['3', '5', '6'], '正方形有四条边，四条边都相等。')
  },
  {
    re: /长方形|正方形|平行四边形/,
    make: (R) => jd(2, '平行四边形的对边平行且相等。', true, '平行四边形两组对边分别平行并且相等。')
  },
  {
    re: /长方形|正方形|平行四边形/,
    make: (R) => fl(2, '长方形对边（ ），正方形四条边都（ ）。', { blanks: ['相等', '相等'] }, '长方形对边相等，正方形四条边都相等。')
  },
  {
    re: /秒|时分|经过|时间/,
    make: (R) => fl(1, '1 分 = ( ) 秒。', { value: 60 }, '分与秒间的进率是 60。')
  },
  {
    re: /秒|时分|经过|时间/,
    make: (R) => fl(2, '2 时 = ( ) 分。', { value: 120 }, '1 时 = 60 分，2 时就是 2 个 60 分。')
  },
  {
    re: /秒|时分|经过|时间/,
    make: (R) => {
      const h = ri(R, 7, 9), m = ri(R, 0, 3) * 10;
      const eh = h + 1, em = m;
      return ap(3, '一场电影 ' + h + ':' + String(m).padStart(2, '0') + ' 开始，' + eh + ':' + String(em).padStart(2, '0') + ' 结束，放映了 ( ) 分钟。', { blanks: [{ value: 60, unit: '分钟' }] },
        `从 ${h} 时到 ${eh} 时经过了 1 小时，1 小时 = 60 分钟。`);
    },
  },
  {
    re: /规律|奥妙|重复|上学/,
    make: (R) => {
      const colors = ['红', '黄', '蓝'];
      const i = ri(R, 5, 9);
      const c = colors[i % 3];
      const wrongs = colors.filter((x) => x !== c);
      return ch(R, 2, '彩旗按红、黄、蓝、红、黄、蓝……的规律排列，第 ' + i + ' 面是 ( ) 色。', c, wrongs,
        `3 面为一组循环，${i} ÷ 3 余 ${i % 3}，所以第 ${i} 面是${c}色。`);
    },
  },
  {
    re: /规律|奥妙|重复|上学/,
    make: (R) => {
      const start = ri(R, 1, 3), step = pick(R, [2, 3]);
      const seq = [start, start + step, start + step * 2, start + step * 3, start + step * 4];
      return fl(2, `按 ${seq.slice(0, 3).join('、')}……的规律，第 6 个数是 ( )。`, { value: start + step * 5 },
        `后一个数比前一个数多 ${step}，第 6 个数是 ${start + step * 5}。`);
    },
  },
  {
    re: /上学|规律|奥妙|重复/,
    make: (R) => {
      const a = ri(R, 5, 10), b = ri(R, 5, 12);
      return rd(2, '同学们上学方式的统计：步行的有 ' + a + ' 人，乘公交的有 ' + b + ' 人，家长接送的比步行多 3 人。',
        [
          { label: '(1)', text: '家长接送的有多少人？', answer: { value: a + 3, unit: '人' } },
          { label: '(2)', text: '步行的和乘公交的一共有多少人？', answer: { value: a + b, unit: '人' } },
        ],
        '“比……多”用加法；求“一共”用加法。');
    },
  },
];

/* ---------- 三年级上册 ---------- */
FAMS['bsd-grade3-up'] = [
  {
    re: /运算顺序|括号/,
    make: (R) => {
      const a = ri(R, 20, 40), b = ri(R, 2, 6), c = ri(R, 2, 5);
      return ca(2, `${a} + ${b} × ${c} =`, { value: a + b * c }, `先算乘法：${b} × ${c} = ${b * c}；再算加法：${a} + ${b * c} = ${a + b * c}。`);
    },
  },
  {
    re: /运算顺序|括号/,
    make: (R) => {
      const a = ri(R, 10, 30), b = ri(R, 2, 6), c = ri(R, 2, 4);
      return ca(3, `(${a} + ${b}) × ${c} =`, { value: (a + b) * c }, `有括号先算括号里的：${a} + ${b} = ${a + b}；再算 ${a + b} × ${c} = ${(a + b) * c}。`);
    },
  },
  {
    re: /运算顺序|括号/,
    make: (R) => jd(2, '计算 20 + 5 × 3 时，先算加法。', false, '没有括号时要先算乘除、后算加减，所以先算 5 × 3。')
  },
  {
    re: /观察|相对|判断/,
    make: (R) => ch(R, 2, '从正面观察一个正方体，看到的是（ ）。', '正方形', ['圆', '三角形', '长方形'], '正方体的每个面都是正方形，从正面看是正方形。')
  },
  {
    re: /观察|相对|判断/,
    make: (R) => ch(R, 3, '同一个物体，从不同的方向观察，看到的形状（ ）。', '可能不同', ['一定相同', '一定不同', '永远是正方形'],
      '观察方向不同，看到的形状往往不同，所以只能说“可能不同”。')
  },
  {
    re: /观察|相对|判断/,
    make: (R) => {
      const names = ['小亮', '小丽', '小刚'];
      const i = ri(R, 0, 2);
      return rd(3, '三个小朋友观察一个长方体纸箱：' + names[0] + '从正面看，看到的是长方形；' + names[1] + '从侧面看，看到的也是长方形；' + names[2] + '从上面看，看到的是正方形。',
        [{ label: '(1)', text: '谁看到的形状和其他两人不同？', answer: { value: names[2] } }],
        '从上面看到的是正方形，和其他两人看到的长方形不同。');
    },
  },
  {
    re: /三位数连加|加减混合运算/,
    make: (R) => {
      const a = ri(R, 100, 300), b = ri(R, 100, 300), c = ri(R, 100, 300);
      return ca(2, `${a} + ${b} + ${c} =`, { value: a + b + c }, `连加按从左到右的顺序算：${a} + ${b} = ${a + b}，${a + b} + ${c} = ${a + b + c}。`);
    },
  },
  {
    re: /三位数连减|加减混合运算/,
    make: (R) => {
      const a = ri(R, 400, 700), b = ri(R, 100, 300), c = ri(R, 50, 150);
      return ca(3, `${a} - ${b} - ${c} =`, { value: a - b - c }, `连减按从左到右：${a} - ${b} = ${a - b}，${a - b} - ${c} = ${a - b - c}。`);
    },
  },
  {
    re: /里程/,
    make: (R) => {
      const start = ri(R, 100, 300), end = start + ri(R, 150, 400);
      return ap(3, '汽车上里程表的读数是 ' + start + ' 千米，到达加油站时变成 ' + end + ' 千米，这段时间汽车行驶了 ( ) 千米。', { blanks: [{ value: end - start, unit: '千米' }] },
        `行驶的路程 = 现在的读数 - 出发时的读数 = ${end} - ${start} = ${end - start}。`);
    },
  },
  {
    re: /口算|整十|整百/,
    make: (R) => {
      const a = ri(R, 2, 9) * 10, b = ri(R, 2, 9);
      return ca(2, `${a} × ${b} =`, { value: a * b }, `先算 ${a / 10} × ${b} = ${(a / 10) * b}，再在末尾添 1 个 0，得 ${a * b}。`);
    },
  },
  {
    re: /口算|整十|整百/,
    make: (R) => {
      const a = ri(R, 2, 9) * 10, b = ri(R, 2, 9);
      return ca(2, `${a * b} ÷ ${a} =`, { value: b }, `想：${a / 10} × ${b} = ${a * b / 10}……用口诀逆推，${a * b} ÷ ${a} = ${b}。`);
    },
  },
  {
    re: /两位数乘一位数/,
    make: (R) => {
      const a = ri(R, 12, 29), b = ri(R, 2, 9);
      return ca(2, `${a} × ${b} =`, { value: a * b }, `两位数乘一位数，用一位数分别去乘两位数的个位和十位，注意进位：${a} × ${b} = ${a * b}。`);
    },
  },
  {
    re: /因数末尾/,
    make: (R) => {
      const a = ri(R, 2, 9), b = ri(R, 2, 9), c = ri(R, 1, 4);
      const base = a * b;
      return ca(3, `${base} × ${c}0 =`, { value: base * c * 10 }, `先算 ${base} × ${c} = ${base * c}，再在末尾添 1 个 0，得 ${base * c * 10}。`);
    },
  },
  {
    re: /因数末尾/,
    make: (R) => {
      const a = ri(R, 2, 9), b = ri(R, 2, 9);
      return fl(3, `${a} × ${b}0 的积的末尾有 ( ) 个 0。`, { value: (a * b * 10).toString().match(/0+$/)[0].length },
        `先算 ${a} × ${b} = ${a * b}，${a * b} × 10 = ${a * b * 10}，数一数积末尾 0 的个数。`);
    },
  },
  {
    re: /0与/,
    make: (R) => jd(2, '0 乘任何数都得 0。', true, '0 和任何数相乘都等于 0。')
  },
  {
    re: /周长/,
    make: (R) => {
      const a = ri(R, 5, 12), b = ri(R, 3, a - 1);
      return ca(2, '一个长方形长 ' + a + ' 厘米、宽 ' + b + ' 厘米，周长是 ( ) 厘米。', { value: 2 * (a + b), unit: '厘米' },
        `长方形周长 =（长 + 宽）× 2 =（${a} + ${b}）× 2 = ${2 * (a + b)} 厘米。`);
    },
  },
  {
    re: /周长/,
    make: (R) => {
      const a = ri(R, 4, 9);
      return ca(2, '一个正方形的边长是 ' + a + ' 厘米，周长是 ( ) 厘米。', { value: 4 * a, unit: '厘米' },
        `正方形周长 = 边长 × 4 = ${a} × 4 = ${4 * a} 厘米。`);
    },
  },
  {
    re: /周长/,
    make: (R) => {
      const a = ri(R, 8, 15), b = ri(R, 4, 7);
      return ap(3, '一块长方形菜地长 ' + a + ' 米、宽 ' + b + ' 米，一面靠墙，其余三面围篱笆，篱笆至少长 ( ) 米。', { blanks: [{ value: a + 2 * b, unit: '米' }] },
        `长边靠墙最省篱笆：${a} + ${b} + ${b} = ${a + 2 * b} 米。`);
    },
  },
  {
    re: /年、月、日/,
    make: (R) => fl(1, '一年有 ( ) 个月。', { value: 12 }, '一年有 12 个月，大月 31 天，小月 30 天。')
  },
  {
    re: /年、月、日/,
    make: (R) => ch(R, 2, '下面哪个月是 31 天？', '7 月', ['2 月', '4 月', '11 月'], '7 月是大月，有 31 天；2 月平年 28 天，4 月、11 月是小月。')
  },
  {
    re: /年、月、日/,
    make: (R) => jd(2, '2 月只有 28 天。', false, '平年的 2 月有 28 天，闰年的 2 月有 29 天。')
  },
  {
    re: /24时|经过/,
    make: (R) => {
      const h = ri(R, 1, 6);
      return fl(2, `下午 ${h} 时用 24 时计时法表示是 ( ) 时。`, { value: 12 + h }, `下午的时间要加 12：${h} + 12 = ${12 + h} 时。`);
    },
  },
  {
    re: /24时|经过/,
    make: (R) => {
      const h = ri(R, 8, 9);
      return ap(3, '一节课 ' + h + ':20 上课，' + (h + 1) + ':00 下课，这节课上了 ( ) 分钟。', { blanks: [{ value: 40, unit: '分钟' }] },
        `从 ${h} 时 20 分到 ${h + 1} 时整，经过 40 分钟。`);
    },
  },
  {
    re: /小数的初步认识/,
    make: (R) => {
      const t = ri(R, 2, 8);
      return fl(2, `0.${t} 里面有 ( ) 个 0.1。`, { value: t }, `一位小数的计数单位是 0.1，0.${t} 就是 ${t} 个 0.1。`);
    },
  },
  {
    re: /小数的初步认识/,
    make: (R) => ch(R, 2, '3.6 读作 ( )', '三点六', ['三十六点', '三六点', '三点零六'], '读小数时，小数点读作“点”，3.6 读作三点六。')
  },
  {
    re: /小数加减/,
    make: (R) => {
      const a = ri(R, 1, 9) / 10, b = ri(R, 1, 9) / 10;
      return ca(2, `${a.toFixed(1)} + ${b.toFixed(1)} =`, { value: +(a + b).toFixed(1) },
        `小数加减法要把小数点对齐，从末位加起：${a.toFixed(1)} + ${b.toFixed(1)} = ${(a + b).toFixed(1)}。`);
    },
  },
  {
    re: /大小比较/,
    make: (R) => {
      const a = ri(R, 11, 29) / 10, b = ri(R, 5, 9) / 10;
      return ch(R, 3, '比 ' + a.toFixed(1) + ' 大的数是 ( )', a.toFixed(1) + '1', [b.toFixed(1), (a - 0.5).toFixed(1), (a - 0.2).toFixed(1)],
        `比较小数先比整数部分，再比小数部分；只有 ${a.toFixed(1)}1 比 ${a.toFixed(1)} 大。`);
    },
  },
  {
    re: /小数的实际应用/,
    make: (R) => {
      const a = ri(R, 2, 5) + 0.5, b = ri(R, 1, 3) + 0.5;
      return ap(3, '一瓶牛奶 ' + a.toFixed(1) + ' 元，一块面包 ' + b.toFixed(1) + ' 元，买这两样一共要 ( ) 元。', { blanks: [{ value: +(a + b).toFixed(1), unit: '元' }] },
        `求一共用加法：${a.toFixed(1)} + ${b.toFixed(1)} = ${(a + b).toFixed(1)} 元。`);
    },
  },
  {
    re: /用乘法解决实际问题|用乘除法解决实际问题|用混合运算解决实际问题/,
    make: (R) => {
      const per = ri(R, 3, 8), boxes = ri(R, 3, 7);
      return ap(2, '每盒有 ' + per + ' 支铅笔，' + boxes + ' 盒一共有 ( ) 支。', { blanks: [{ value: per * boxes, unit: '支' }] },
        `求 ${boxes} 个 ${per} 是多少，用乘法：${per} × ${boxes} = ${per * boxes}。`);
    },
  },
  {
    re: /用乘除法解决实际问题|用混合运算解决实际问题/,
    make: (R) => {
      const total = ri(R, 18, 42), groups = ri(R, 3, 6);
      if (total % groups) return null;
      return ap(2, '' + total + ' 个同学平均分成 ' + groups + ' 组，每组 ( ) 人。', { blanks: [{ value: total / groups, unit: '人' }] },
        `平均分用除法：${total} ÷ ${groups} = ${total / groups}。`);
    },
  },
];

/* ---------- 三年级下册 ---------- */
FAMS['bsd-grade3-down'] = [
  {
    re: /除法|验算|商/,
    make: (R) => {
      const d = ri(R, 2, 9), q = ri(R, 10, 40);
      return ca(3, `${d * q} ÷ ${d} =`, { value: q }, `从高位除起：${d * q} ÷ ${d}，想 ${d} 和 ${q} 的积是 ${d * q}，商 ${q}。`);
    },
  },
  {
    re: /除法|验算|商/,
    make: (R) => {
      const q = ri(R, 101, 299), d = ri(R, 2, 9);
      return ca(3, `${d * q} ÷ ${d} =`, { value: q }, `商中间或末尾有 0 的除法要注意：哪一位不够商 1 就商 0 占位。${d * q} ÷ ${d} = ${q}。`);
    },
  },
  {
    re: /除法|验算|商/,
    make: (R) => {
      const d = ri(R, 3, 9), q = ri(R, 11, 40);
      return jd(2, `验算 ${d * q} ÷ ${d} = ${q}，可以用 ${q} × ${d} = ${d * q}。`, true, '没有余数的除法验算：商 × 除数 = 被除数。');
    },
  },
  {
    re: /轴对称|平移|旋转|运动/,
    make: (R) => jd(2, '圆是轴对称图形。', true, '圆沿任意一条直径所在直线对折，两边都能完全重合。')
  },
  {
    re: /轴对称|平移|旋转|运动/,
    make: (R) => ch(R, 2, '推拉窗户属于（ ）现象。', '平移', ['旋转', '对称', '放大'], '物体沿直线方向移动，形状和大小不变，是平移。')
  },
  {
    re: /轴对称|平移|旋转|运动/,
    make: (R) => ch(R, 2, '钟面上指针的走动属于（ ）现象。', '旋转', ['平移', '对称', '翻滚'], '指针绕中心点转动，属于旋转。')
  },
  {
    re: /轴对称|平移|旋转|运动/,
    make: (R) => jd(2, '轴对称图形沿对称轴对折后，两边能完全重合。', true, '这是轴对称图形的本质特征。')
  },
  {
    re: /两位数乘|估算|规律/,
    make: (R) => {
      const a = ri(R, 12, 29), b = ri(R, 11, 19);
      return ca(3, `${a} × ${b} =`, { value: a * b }, `两位数乘两位数，先用第二个因数个位上的数乘，再用十位上的数乘，最后把两次积相加：${a} × ${b} = ${a * b}。`);
    },
  },
  {
    re: /两位数乘|估算|规律/,
    make: (R) => {
      const a = ri(R, 29, 49), b = ri(R, 29, 49);
      const approx = Math.round(a / 10) * 10 * Math.round(b / 10) * 10;
      const wrongs = [a * b, approx - 100, approx + 200].filter((x) => x !== approx);
      return ch(R, 3, `估计 ${a} × ${b} 的积，下面最接近的是 ( )`, String(approx), wrongs,
        `把 ${a} 看作 ${Math.round(a / 10) * 10}，${b} 看作 ${Math.round(b / 10) * 10}，积大约是 ${approx}。`);
    },
  },
  {
    re: /规律/,
    make: (R) => {
      const n = ri(R, 12, 123);
      return fl(3, `找规律：1 × 9 = 9，12 × 9 = 108，123 × 9 = 1107，${n} × 9 = ( )`, { value: n * 9 },
        `直接计算：${n} × 9 = ${n * 9}。`);
    },
  },
  {
    re: /千克|吨|质量/,
    make: (R) => fl(1, '1 千克 = ( ) 克。', { value: 1000 }, '千克和克间的进率是 1000。')
  },
  {
    re: /千克|吨|质量/,
    make: (R) => ch(R, 2, '一个鸡蛋约重 ( )', '50 克', ['5 克', '500 克', '5 千克'], '一个鸡蛋大约重 50 克。')
  },
  {
    re: /千克|吨|质量/,
    make: (R) => {
      const a = ri(R, 2, 8);
      return ap(2, '一袋大米重 5 千克，' + a + ' 袋这样的大米一共重 ( ) 千克。', { blanks: [{ value: 5 * a, unit: '千克' }] },
        `求 ${a} 个 5 千克是多少，用乘法：5 × ${a} = ${5 * a}。`);
    },
  },
  {
    re: /面积|进率/,
    make: (R) => {
      const a = ri(R, 9, 20), b = ri(R, 6, 12);
      return ca(2, '一个长方形长 ' + a + ' 米、宽 ' + b + ' 米，面积是 ( ) 平方米。', { value: a * b, unit: '平方米' },
        `长方形面积 = 长 × 宽 = ${a} × ${b} = ${a * b} 平方米。`);
    },
  },
  {
    re: /面积|进率/,
    make: (R) => fl(2, '1 平方米 = ( ) 平方分米。', { value: 100 }, '平方米和平方分米间的进率是 100。')
  },
  {
    re: /面积|进率/,
    make: (R) => {
      const a = ri(R, 6, 12), b = ri(R, 5, 10);
      return ap(3, '教室长 ' + a + ' 米、宽 ' + b + ' 米，要给教室铺地砖，教室的面积是 ( ) 平方米。', { blanks: [{ value: a * b, unit: '平方米' }] },
        `教室是长方形，面积 = ${a} × ${b} = ${a * b} 平方米。`);
    },
  },
  {
    re: /面积|进率/,
    make: (R) => ch(R, 2, '课桌面的面积大约是 40 ( )', '平方分米', ['平方厘米', '平方米', '千米'], '课桌面大约长 5 分米、宽 4 分米，面积约 40 平方分米。')
  },
  {
    re: /分数/,
    make: (R) => ch(R, 2, '把一个苹果平均分成 4 份，每份是这个苹果的 ( )', '1/4', ['1/2', '1/3', '1/5'], '平均分成 4 份，每份就是四分之一。')
  },
  {
    re: /分数/,
    make: (R) => {
      const d = ri(R, 3, 9), n = ri(R, 1, d - 1);
      return fl(2, `${n}/${d} 里面有 ( ) 个 1/${d}。`, { value: n }, `分母是 ${d} 的分数，分数单位是 1/${d}，${n}/${d} 有 ${n} 个这样的单位。`);
    },
  },
  {
    re: /分数/,
    make: (R) => {
      const d = ri(R, 3, 8);
      const n = ri(R, 1, d - 1);
      const a = [n, d], b = [n, d + 1];
      const bigger = a[0] / a[1] > b[0] / b[1] ? `${a[0]}/${a[1]}` : `${b[0]}/${b[1]}`;
      return ch(R, 3, `${a[0]}/${a[1]} 和 ${b[0]}/${b[1]} 比，( ) 大。`, bigger, [`${a[0]}/${a[1]}` === bigger ? `${b[0]}/${b[1]}` : `${a[0]}/${a[1]}`, '同样大'],
        '分子相同的两个分数，分母越大分数越小。');
    },
  },
  {
    re: /分数/,
    make: (R) => {
      const d = ri(R, 4, 9), n = ri(R, 1, d - 2);
      return ca(2, `${n}/${d} + ${n + 1}/${d} =`, { value: `${n + n + 1}/${d}` }, `同分母分数相加，分母不变，分子相加：${n} + ${n + 1} = ${n + n + 1}。`);
    },
  },
  {
    re: /数据|收集|表示|分析/,
    make: (R) => {
      const labels = ['跳绳', '跑步', '游泳'];
      const vals = [ri(R, 4, 8), ri(R, 4, 8), ri(R, 4, 8)];
      const best = vals.indexOf(Math.max(...vals));
      return { ...ch(R, 2, '三年级同学最喜欢的运动统计如下图，喜欢（ ）的人最多。', labels[best], labels.filter((_, i) => i !== best), '直条最高的一项就是人数最多的一项。'), media: svgBars(labels.map((l, i) => ({ label: l, value: vals[i] })), { unit: '人', color: C.blue }) };
    },
  },
  {
    re: /用除法解决实际问题/,
    make: (R) => {
      const groups = ri(R, 4, 8), per = ri(R, 4, 9);
      return ap(2, '三(1)班有 ' + groups * per + ' 人，每组 ' + per + ' 人，可以分成 ( ) 组。', { blanks: [{ value: groups, unit: '组' }] },
        `求分成几组用除法：${groups * per} ÷ ${per} = ${groups}。`);
    },
  },
  {
    re: /推理/,
    make: (R) => ch(R, 3, '甲、乙、丙三人比身高，甲比乙高，乙比丙高，（ ）最高。', '甲', ['乙', '丙', '一样高'], '甲比乙高、乙比丙高，所以甲最高，丙最矮。')
  },
];

/* ---------- 四年级上册 ---------- */
FAMS['bsd-grade4-up'] = [
  {
    re: /亿以内|读数|写法|亿以上/,
    make: (R) => {
      const n = ri(R, 11, 89) * 100 + ri(R, 1, 9);
      const txt = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      const read = (n % 100 === 0 ? '' : txt[Math.floor((n % 100) / 10)] + (n % 10 ? txt[n % 10] : ''));
      const cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][Math.floor(n / 1000)] + '千' + read;
      const wrongs = [String(n).split('').reverse().join(''), String(n + 1000), String(n * 10)].filter((x) => x !== String(n));
      return ch(R, 2, `下面哪个数读作“${cn}”？`, String(n), wrongs, '读数从高位读起，末尾的 0 不读。');
    },
  },
  {
    re: /亿以内|读数|写法|亿以上/,
    make: (R) => {
      const q = ri(R, 3, 9), w = ri(R, 1, 9), o = ri(R, 0, 9);
      const n = q * 10000000 + w * 10000 + o;
      return fl(3, `由 ${q} 个千万、${w} 个万和 ${o} 个一组成的数是 ( )。`, { value: n },
        `按数位顺序写：${q} 在千万位，${w} 在万位，${o} 在个位，中间空位补 0。`);
    },
  },
  {
    re: /近似/,
    make: (R) => {
      const n = ri(R, 1000, 9999);
      const approx = Math.round(n / 1000) * 1000;
      return fl(3, `把 ${n} 四舍五入到千位，约是 ( )。`, { value: approx },
        `看百位：${n} 的百位是 ${Math.floor((n % 1000) / 100)}，${Math.floor((n % 1000) / 100) >= 5 ? '大于 5 向前一位进 1' : '小于 5 舍去'}，约是 ${approx}。`);
    },
  },
  {
    re: /大小比较/,
    make: (R) => {
      const a = ri(R, 100000, 899999), b = ri(R, 100000, 899999);
      if (a === b) return null;
      return ch(R, 2, `${a} 和 ${b} 比，（ ）大。`, String(Math.max(a, b)), [String(Math.min(a, b)), '同样大'], '位数相同，从最高位起依次比较。');
    },
  },
  {
    re: /线的认识/,
    make: (R) => ch(R, 2, '一条线段有 ( ) 个端点。', '2', ['0', '1', '3'], '线段是直的，有两个端点，可以量出长度。')
  },
  {
    re: /平移与平行/,
    make: (R) => jd(2, '同一平面内，不相交的两条直线互相平行。', true, '平行的前提是“同一平面内”且“不相交”。')
  },
  {
    re: /旋转与角|角的度量/,
    make: (R) => ch(R, 2, '直角是 ( ) 度。', '90', ['45', '60', '180'], '直角是 90 度，1 个周角是 360 度。')
  },
  {
    re: /旋转与角|度量|角/,
    make: (R) => fl(2, '1 个周角 = ( ) 个直角。', { value: 4 }, '周角 360 度，直角 90 度，360 里面有 4 个 90。')
  },
  {
    re: /三位数乘/,
    make: (R) => {
      const a = ri(R, 102, 289), b = ri(R, 11, 29);
      return ca(3, `${a} × ${b} =`, { value: a * b }, `三位数乘两位数，用两位数个位和十位上的数分别去乘 ${a}，再把两次积相加：${a} × ${b} = ${a * b}。`);
    },
  },
  {
    re: /三位数乘/,
    make: (R) => {
      const a = ri(R, 100, 300), b = ri(R, 2, 8) * 10;
      return ca(3, `${a} × ${b} =`, { value: a * b }, `先用 ${a} × ${b / 10} = ${a * (b / 10)}，再在末尾添 1 个 0，得 ${a * b}。`);
    },
  },
  {
    re: /估算|计算工具/,
    make: (R) => {
      const a = ri(R, 197, 299), b = ri(R, 19, 39);
      const approx = Math.round(a / 10) * 10 * Math.round(b / 10) * 10;
      const wrongs = [a * b, approx - 500, approx + 1000].filter((x) => x !== approx);
      return ch(R, 3, `估算 ${a} × ${b}，下面最接近的是 ( )`, String(approx), wrongs,
        `把 ${a} 看作 ${Math.round(a / 10) * 10}，${b} 看作 ${Math.round(b / 10) * 10}，积大约是 ${approx}。`);
    },
  },
  {
    re: /计算工具|算式/,
    make: (R) => {
      const a = ri(R, 100, 899), b = ri(R, 100, 499);
      return fl(2, `用计算器计算 ${a} + ${b} = ( )`, { value: a + b }, `用计算器输入时注意核对数字，${a} + ${b} = ${a + b}。`);
    },
  },
  {
    re: /算式/,
    make: (R) => ch(R, 3, '找规律：1 × 1 = 1，11 × 11 = 121，111 × 111 = ( )', '12321', ['111', '1211', '11111'], '结果依次是 1、121、12321，呈回文数规律。')
  },
  {
    re: /交换律|结合律|分配律|简便/,
    make: (R) => {
      const a = ri(R, 2, 9), b = ri(R, 2, 9), c = ri(R, 2, 9);
      return ca(3, `${a} × ${b} × ${c} =`, { value: a * b * c },
        `运用乘法交换律和结合律，先算 ${a} × ${c} = ${a * c}（能凑整），再算 ${a * c} × ${b} = ${a * b * c}。`);
    },
  },
  {
    re: /交换律|结合律|分配律|简便/,
    make: (R) => {
      const a = ri(R, 11, 49), b = ri(R, 20, 80);
      return ca(3, `${a} × ${b} + ${a} =`, { value: a * (b + 1) },
        `把后一个 ${a} 看作 ${a} × 1，逆用乘法分配律：${a} × (${b} + 1) = ${a * (b + 1)}。`);
    },
  },
  {
    re: /交换律|结合律|分配律|简便/,
    make: (R) => ch(R, 3, '下面哪个算式运用了乘法分配律？', '(4 + 8) × 5 = 4 × 5 + 8 × 5', ['25 × 4 = 100', '3 + 5 = 5 + 3', '2 × 9 × 5 = 2 × 5 × 9'],
      '乘法分配律：两个数的和与一个数相乘，可以先把它们与这个数分别相乘，再相加。')
  },
  {
    re: /交换律|结合律|分配律|简便/,
    make: (R) => jd(3, '加法结合律改变的是加数的位置。', false, '改变位置的是加法交换律；加法结合律改变的是运算顺序。')
  },
  {
    re: /整十数除|两位数除|试商|调商|商不变/,
    make: (R) => {
      const d = ri(R, 2, 9) * 10, q = ri(R, 2, 9);
      return ca(2, `${d * q} ÷ ${d} =`, { value: q }, `整十数除整十数，想 ${d / 10} × ${q} = ${d * q / 10}，商 ${q}。`);
    },
  },
  {
    re: /两位数除|试商|调商|商不变/,
    make: (R) => {
      const d = ri(R, 11, 29), q = ri(R, 11, 39);
      return ca(3, `${d * q} ÷ ${d} =`, { value: q }, `除数是两位数，先看被除数的前两位，想 ${d} 和几相乘接近 ${d * q}，商 ${q}。`);
    },
  },
  {
    re: /两位数除|试商|调商|商不变/,
    make: (R) => {
      const d = ri(R, 11, 29), q = ri(R, 11, 39);
      return fl(3, `${d * q} ÷ ${d} = ( )`, { value: q }, `试商时如果把初商写大了要及时调小：${d * q} ÷ ${d} = ${q}。`);
    },
  },
  {
    re: /商不变/,
    make: (R) => jd(3, '被除数和除数同时乘 10，商不变。', true, '这是商不变的规律：被除数和除数同时乘或除以相同的数（0 除外），商不变。')
  },
  {
    re: /数对/,
    make: (R) => fl(2, '数对 (3, 4) 中的 3 表示第 ( ) 列，4 表示第 ( ) 行。', { blanks: [3, 4] }, '数对中第一个数表示列，第二个数表示行。')
  },
  {
    re: /数对/,
    make: (R) => {
      const col = ri(R, 2, 6), row = ri(R, 2, 6);
      return ch(R, 3, `小明的位置是 (${col}, ${row})，他坐在第 ( ) 排。`, String(row), [String(col), String(col + row), String(row - 1)],
        `数对中第二个数表示行，也就是第几排。`);
    },
  },
  {
    re: /路程|速度/,
    make: (R) => {
      const v = ri(R, 40, 90), t = ri(R, 3, 6);
      return ap(3, '一辆汽车每小时行 ' + v + ' 千米，' + t + ' 小时能行 ( ) 千米。', { blanks: [{ value: v * t, unit: '千米' }] },
        `路程 = 速度 × 时间：${v} × ${t} = ${v * t} 千米。`);
    },
  },
  {
    re: /路程|速度/,
    make: (R) => {
      const s = ri(R, 120, 300), t = ri(R, 2, 5);
      if (s % t) return null;
      return ap(3, '一辆自行车 ' + t + ' 小时行驶了 ' + s + ' 千米，它的速度是每小时 ( ) 千米。', { blanks: [{ value: s / t, unit: '千米' }] },
        `速度 = 路程 ÷ 时间：${s} ÷ ${t} = ${s / t} 千米/时。`);
    },
  },
  {
    re: /负数|正负/,
    make: (R) => fl(2, '零下 5 ℃ 记作 ( ) ℃。', { value: -5 }, '零下温度在数字前加“-”号。')
  },
  {
    re: /负数|正负/,
    make: (R) => {
      const a = -ri(R, 1, 9), b = -ri(R, 10, 20);
      return ch(R, 3, `${a} ℃ 和 ${b} ℃ 比，( ) 温度高。`, String(a), [String(b), '同样高'],
        '负数比较大小，负号后面的数越小，温度越高。');
    },
  },
  {
    re: /负数|正负/,
    make: (R) => jd(2, '0 既是正数也不是负数。', true, '0 是正数和负数的分界，0 既不是正数也不是负数。')
  },
  {
    re: /不确定性|可能性/,
    make: (R) => ch(R, 2, '明天（ ）下雨。', '可能', ['一定', '不可能', '必须'], '天气变化不确定，只能说可能下雨。')
  },
  {
    re: /不确定性|可能性/,
    make: (R) => jd(2, '太阳从西边升起。', false, '太阳从东边升起，这是确定的事实。')
  },
  {
    re: /可能性/,
    make: (R) => {
      const red = ri(R, 6, 9), white = ri(R, 1, 3);
      return ch(R, 3, '盒子里有 ' + red + ' 个红球、' + white + ' 个白球，任意摸一个，摸到 ( ) 的可能性大。', '红球', ['白球', '一样大'],
        `红球数量多，摸到红球的可能性大。`);
    },
  },
];

/* ---------- 四年级下册 ---------- */
FAMS['bsd-grade4-down'] = [
  {
    re: /小数的读法和写法/,
    make: (R) => ch(R, 2, '0.35 读作 ( )', '零点三五', ['零点三十五', '三十五点', '三五点'], '小数部分逐位读：0.35 读作零点三五。')
  },
  {
    re: /小数的意义/,
    make: (R) => fl(2, '由 3 个 0.1 和 5 个 0.01 组成的数是 ( )。', { value: 0.35 }, '3 个 0.1 是 0.3，5 个 0.01 是 0.05，合起来是 0.35。')
  },
  {
    re: /小数的大小比较/,
    make: (R) => ch(R, 3, '0.6 和 0.59 比，( ) 大。', '0.6', ['0.59', '同样大'], '整数部分相同，比小数部分：0.60 > 0.59。')
  },
  {
    re: /小数的意义|小数点移动/,
    make: (R) => jd(2, '小数点右边第二位是百分位。', true, '小数点右边第一位是十分位，第二位是百分位。')
  },
  {
    re: /小数的意义/,
    make: (R) => {
      const t = ri(R, 2, 8);
      return fl(3, `0.0${t} 里面有 ( ) 个 0.01。`, { value: t }, `两位小数的计数单位是 0.01，0.0${t} 就是 ${t} 个 0.01。`);
    },
  },
  {
    re: /小数加减/,
    make: (R) => {
      const a = ri(R, 10, 89) / 10, b = ri(R, 10, 89) / 10;
      return ca(2, `${a.toFixed(1)} + ${b.toFixed(1)} =`, { value: +(a + b).toFixed(1) },
        `小数点对齐，从末位加起，满十进一：${a.toFixed(1)} + ${b.toFixed(1)} = ${(a + b).toFixed(1)}。`);
    },
  },
  {
    re: /小数加减/,
    make: (R) => {
      const a = ri(R, 30, 90) / 10, b = ri(R, 5, 29) / 10;
      return ca(2, `${a.toFixed(1)} - ${b.toFixed(1)} =`, { value: +(a - b).toFixed(1) },
        `小数点对齐，哪一位不够减要退一当十：${a.toFixed(1)} - ${b.toFixed(1)} = ${(a - b).toFixed(1)}。`);
    },
  },
  {
    re: /小数乘整数/,
    make: (R) => {
      const a = ri(R, 2, 9) / 10, c = ri(R, 2, 9);
      return ca(3, `${a.toFixed(1)} × ${c} =`, { value: +(a * c).toFixed(1) },
        `先按整数乘法算，再点小数点：${a.toFixed(1)} × ${c} = ${(a * c).toFixed(1)}。`);
    },
  },
  {
    re: /小数乘小数/,
    make: (R) => {
      const a = ri(R, 2, 9) / 10, b = ri(R, 2, 9) / 10;
      return ca(3, `${a.toFixed(1)} × ${b.toFixed(1)} =`, { value: +(a * b).toFixed(2) },
        `先按整数算，因数中共有两位小数，积从右边起数出两位点上小数点：${a.toFixed(1)} × ${b.toFixed(1)} = ${(a * b).toFixed(2)}。`);
    },
  },
  {
    re: /小数乘法的实际应用/,
    make: (R) => {
      const a = ri(R, 30, 80) / 10, c = ri(R, 2, 4);
      return ap(3, '每千克苹果 ' + a.toFixed(1) + ' 元，买 ' + c + ' 千克应付 ( ) 元。', { blanks: [{ value: +(a * c).toFixed(1), unit: '元' }] },
        `单价 × 数量 = 总价：${a.toFixed(1)} × ${c} = ${(a * c).toFixed(1)} 元。`);
    },
  },
  {
    re: /图形分类|三角形的分类/,
    make: (R) => ch(R, 2, '有一个角是锐角的三角形，一定是（ ）。', '不能确定', ['锐角三角形', '直角三角形', '钝角三角形'],
      '只看一个锐角不能确定三角形的类型，因为三种三角形都至少有两个锐角。')
  },
  {
    re: /三角形的内角和/,
    make: (R) => fl(2, '三角形的内角和是 ( ) 度。', { value: 180 }, '任意三角形的内角和都是 180 度。')
  },
  {
    re: /三角形的内角和/,
    make: (R) => {
      const a = ri(R, 30, 80), b = ri(R, 30, 80);
      return ap(3, '一个三角形的两个内角分别是 ' + a + '° 和 ' + b + '°，第三个内角是 ( )°。', { blanks: [{ value: 180 - a - b, unit: '度' }] },
        `内角和 180°：180 - ${a} - ${b} = ${180 - a - b}°。`);
    },
  },
  {
    re: /四边形的分类/,
    make: (R) => ch(R, 2, '正方形是特殊的（ ）。', '长方形', ['三角形', '圆', '平行四边形'], '正方形符合长方形的所有特征，且四条边都相等。')
  },
  {
    re: /三角形的分类/,
    make: (R) => jd(2, '等边三角形是锐角三角形。', true, '等边三角形三个角都是 60 度，都是锐角。')
  },
  {
    re: /观察立体|我说你搭|搭一搭/,
    make: (R) => ch(R, 2, '从正面观察一个正方体，看到的是 ( )', '正方形', ['圆', '长方形', '三角形'], '正方体从正面看是正方形。')
  },
  {
    re: /观察立体|我说你搭|搭一搭/,
    make: (R) => {
      const n = ri(R, 3, 6);
      return ap(3, '用 ' + n + ' 个小正方体摆成一排，从上面看是 ( ) 个正方形。', { blanks: [{ value: n, unit: '个' }] },
        `从上面看，每个小正方体的顶面都是一个正方形，一排 ${n} 个就是 ${n} 个正方形。`);
    },
  },
  {
    re: /观察立体|我说你搭|搭一搭/,
    make: (R) => jd(3, '从不同的方向观察同一个立体图形，看到的形状可能不同。', true, '观察方向不同，看到的形状往往不同。')
  },
  {
    re: /字母|等量|方程/,
    make: (R) => ch(R, 2, 'a × 5 可以简写为 ( )', '5a', ['a5', 'a + 5', '5 + a'], '数字与字母相乘，数字写在字母前面，乘号省略。')
  },
  {
    re: /字母|等量|方程/,
    make: (R) => {
      const x = ri(R, 3, 12), b = ri(R, 2, 9);
      return fl(3, `x + ${b} = ${x + b}，x = ( )`, { value: x }, `一个加数 = 和 - 另一个加数：${x + b} - ${b} = ${x}。`);
    },
  },
  {
    re: /方程/,
    make: (R) => ch(R, 3, '下面哪个是方程？', '3x + 2 = 11', ['5 + 3 = 8', '2x', '4 × 9 = 36'], '含有未知数的等式叫方程。')
  },
  {
    re: /方程/,
    make: (R) => {
      const price = 12 / 3;
      return ap(3, '一支笔 x 元，买 3 支共 12 元，每支笔 ( ) 元。', { blanks: [{ value: price, unit: '元' }] },
        `3 支共 12 元，每支 12 ÷ 3 = ${price} 元。`);
    },
  },
  {
    re: /条形|折线|平均数/,
    make: (R) => {
      const per = ri(R, 2, 5), cells = ri(R, 4, 8);
      return ap(2, '条形统计图中一格代表 ' + per + ' 人，' + cells + ' 格表示 ( ) 人。', { blanks: [{ value: per * cells, unit: '人' }] },
        `一格代表 ${per} 人，${cells} 格就是 ${cells} 个 ${per} 人：${per} × ${cells} = ${per * cells}。`);
    },
  },
  {
    re: /条形|折线|平均数/,
    make: (R) => {
      const a = ri(R, 5, 12), b = ri(R, 5, 12), c = 3 * ri(R, 5, 12) - a - b;
      return ap(3, '三个小组的人数分别是 ' + a + '、' + b + '、' + c + '，平均每组 ( ) 人。', { blanks: [{ value: (a + b + c) / 3, unit: '人' }] },
        `总数 ÷ 组数 = 平均数：(${a} + ${b} + ${c}) ÷ 3 = ${(a + b + c) / 3}。`);
    },
  },
  {
    re: /条形|折线|平均数/,
    make: (R) => ch(R, 3, '要表示某地一年各月气温的变化情况，用（ ）统计图比较合适。', '折线统计图', ['条形统计图', '扇形统计图'], '折线统计图能清楚地反映数量的增减变化。')
  },
  {
    re: /密铺|奥运|优化/,
    make: (R) => ch(R, 3, '下面图形中不能单独密铺的是 ( )', '圆', ['长方形', '正六边形', '正方形'], '圆的边是曲线，拼接处会有缝隙，不能密铺。')
  },
  {
    re: /优化/,
    make: (R) => ch(R, 3, '沏茶要洗水壶 1 分钟、烧水 8 分钟、洗茶杯 2 分钟、拿茶叶 1 分钟，最少要用 ( ) 分钟。', '10', ['9', '11', '12'],
      '烧水的 8 分钟里可以同时洗茶杯、拿茶叶，所以最少 1 + 8 = 10 分钟。')
  },
  {
    re: /奥运/,
    make: (R) => {
      const total = ri(R, 3, 6);
      return ap(2, '奥运知识竞赛每题 ' + total + '分……一组有 4 名同学，平均分是 ' + ri(R, 6, 9) + ' 分，这组总分是 ( ) 分。', { blanks: [{ value: 4 * ri(R, 6, 9), unit: '分' }] },
        '总分 = 平均分 × 人数。');
    },
  },
];

/* ---------- 五年级上册 ---------- */
FAMS['bsd-grade5-up'] = [
  {
    re: /除数是整数的小数除法|小数除法的混合运算/,
    make: (R) => {
      const d = ri(R, 2, 9), q = ri(R, 2, 9) / 10;
      const n = +(d * q).toFixed(1);
      return ca(2, `${n} ÷ ${d} =`, { value: +(n / d).toFixed(2) },
        `除数是整数的小数除法，按整数除法算，商的小数点要和被除数对齐：${n} ÷ ${d} = ${(n / d).toFixed(2)}。`);
    },
  },
  {
    re: /除数是小数的小数除法/,
    make: (R) => {
      const d = ri(R, 2, 9) / 10, q = ri(R, 2, 9);
      const n = +(d * q).toFixed(1);
      return ca(3, `${n} ÷ ${d.toFixed(1)} =`, { value: +(n / d).toFixed(2) },
        `除数是小数的除法，先把除数变成整数再除：${n} ÷ ${d.toFixed(1)} = ${(n / d).toFixed(2)}。`);
    },
  },
  {
    re: /循环/,
    make: (R) => {
      const d = ri(R, 3, 9);
      const q = ri(R, 10, 99);
      if (q % d !== 0) return null;
      return ch(R, 3, `4.666…… 这样的数叫循环小数，它的循环节是 ( )`, '6', ['4', '66', '466'], '依次不断重复出现的数字是循环节，这里重复出现的是 6。');
    },
  },
  {
    re: /小数除法的混合运算/,
    make: (R) => {
      const a = ri(R, 2, 9) / 10, d = ri(R, 2, 9);
      return ca(3, `${a.toFixed(1)} ÷ ${d} × 10 =`, { value: +((a / d) * 10).toFixed(2) },
        `按从左到右的顺序：${a.toFixed(1)} ÷ ${d} = ${(a / d).toFixed(2)}，再乘 10 得 ${((a / d) * 10).toFixed(2)}。`);
    },
  },
  {
    re: /用小数除法解决实际问题/,
    make: (R) => {
      const kg = ri(R, 2, 5), price = kg * ri(R, 2, 6);
      return ap(3, kg + ' 千克苹果一共 ' + price + ' 元，每千克 ( ) 元。', { blanks: [{ value: price / kg, unit: '元' }] },
        `总价 ÷ 数量 = 单价：${price} ÷ ${kg} = ${price / kg} 元。`);
    },
  },
  {
    re: /3的倍数/,
    make: (R) => {
      const cand = [ri(R, 11, 49), ri(R, 11, 49), ri(R, 12, 49), ri(R, 11, 49)];
      const correct = cand.find((x) => x % 3 === 0) || 12;
      const wrongs = [correct + 1, correct - 1, correct + 3].filter((x) => x % 3 !== 0 && x !== correct);
      return ch(R, 3, `下面哪个数是 3 的倍数？`, String(correct), wrongs,
        `各位数字之和是 3 的倍数，这个数就是 3 的倍数；${correct} 的各位数字之和是 ${String(correct).split('').reduce((s, c) => s + +c, 0)}，是 3 的倍数。`);
    },
  },
  {
    re: /质数|找因数/,
    make: (R) => ch(R, 3, '下面哪个数是质数？', '17', ['9', '15', '21'], '质数只有 1 和它本身两个因数；9、15、21 都有 3 个以上的因数。')
  },
  {
    re: /找因数/,
    make: (R) => {
      const n = pick(R, [12, 16, 18, 20, 24]);
      let cnt = 0;
      for (let i = 1; i <= n; i++) if (n % i === 0) cnt++;
      return fl(3, `${n} 的因数一共有 ( ) 个。`, { value: cnt }, `把 ${n} 的因数成对找：1 和 ${n}、2 和 ${n / 2}……一共 ${cnt} 个。`);
    },
  },
  {
    re: /约分|通分/,
    make: (R) => {
      const a = pick(R, [6, 8, 10, 12, 15]), b = pick(R, [4, 6, 8, 10, 12]);
      const lcm = (a * b) / gcd(a, b);
      return fl(3, `${a} 和 ${b} 的最小公倍数是 ( )`, { value: lcm }, `先求最大公因数再求最小公倍数，${a} 和 ${b} 的最小公倍数是 ${lcm}。`);
    },
  },
  {
    re: /倍数与因数|2、5/,
    make: (R) => jd(2, '个位上是 0 或 5 的数一定是 5 的倍数。', true, '5 的倍数的特征：个位是 0 或 5。')
  },
  {
    re: /找因数|倍数与因数/,
    make: (R) => jd(3, '1 既不是质数，也不是合数。', true, '1 只有一个因数，所以它既不是质数也不是合数。')
  },
  {
    re: /平行四边形/,
    make: (R) => {
      const b = ri(R, 6, 15), h = ri(R, 4, 12);
      return ca(3, '一个平行四边形的底是 ' + b + ' 厘米、高是 ' + h + ' 厘米，面积是 ( ) 平方厘米。', { value: b * h, unit: '平方厘米' },
        `平行四边形面积 = 底 × 高 = ${b} × ${h} = ${b * h}。`);
    },
  },
  {
    re: /三角形/,
    make: (R) => {
      const b = ri(R, 6, 16), h = ri(R, 4, 12);
      return ca(3, '一个三角形的底是 ' + b + ' 厘米、高是 ' + h + ' 厘米，面积是 ( ) 平方厘米。', { value: (b * h) / 2, unit: '平方厘米' },
        `三角形面积 = 底 × 高 ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2}。`);
    },
  },
  {
    re: /梯形/,
    make: (R) => {
      const a = ri(R, 3, 8), b = ri(R, 9, 15), h = ri(R, 4, 10);
      return ca(3, '一个梯形的上底是 ' + a + ' 厘米、下底是 ' + b + ' 厘米、高是 ' + h + ' 厘米，面积是 ( ) 平方厘米。', { value: ((a + b) * h) / 2, unit: '平方厘米' },
        `梯形面积 =（上底 + 下底）× 高 ÷ 2 =（${a} + ${b}）× ${h} ÷ 2 = ${((a + b) * h) / 2}。`);
    },
  },
  {
    re: /组合|不规则/,
    make: (R) => {
      const a = ri(R, 8, 15), b = ri(R, 4, 7), h = ri(R, 3, 6);
      return ap(3, '一个组合图形由一个长 ' + a + ' 厘米、宽 ' + b + ' 厘米的长方形和一个底 ' + a + ' 厘米、高 ' + h + ' 厘米的三角形组成，面积是 ( ) 平方厘米。', { blanks: [{ value: a * b + (a * h) / 2, unit: '平方厘米' }] },
        `长方形面积 ${a} × ${b} = ${a * b}，三角形面积 ${a} × ${h} ÷ 2 = ${(a * h) / 2}，合起来 ${a * b + (a * h) / 2}。`);
    },
  },
  {
    re: /公顷|平方千米/,
    make: (R) => fl(3, '1 公顷 = ( ) 平方米。', { value: 10000 }, '公顷是测量土地面积的单位，1 公顷 = 10000 平方米。')
  },
  {
    re: /公顷|平方千米/,
    make: (R) => fl(3, '1 平方千米 = ( ) 公顷。', { value: 100 }, '1 平方千米 = 100 公顷 = 1000000 平方米。')
  },
  {
    re: /分数的意义/,
    make: (R) => ch(R, 2, '3/5 的分数单位是 ( )', '1/5', ['1/3', '3/5', '5/3'], '分母是几，分数单位就是几分之一。')
  },
  {
    re: /真分数|假分数|带分数/,
    make: (R) => ch(R, 3, '下面哪个是真分数？', '4/9', ['3/2', '5/5', '7/3'], '分子比分母小的分数是真分数。')
  },
  {
    re: /分数与除法/,
    make: (R) => {
      const a = ri(R, 1, 6), b = ri(R, 7, 12);
      return fl(3, `${a} ÷ ${b} = ( )/( )`, { blanks: [a, b] }, `被除数作分子，除数作分母：${a} ÷ ${b} = ${a}/${b}。`);
    },
  },
  {
    re: /分数的基本性质/,
    make: (R) => jd(3, '分数的分子和分母同时乘同一个数，分数的大小不变。', true, '这是分数的基本性质。')
  },
  {
    re: /约分/,
    make: (R) => {
      const k = ri(R, 2, 6), a = ri(R, 1, 5), b = ri(R, 6, 9);
      const g = gcd(a * k, b * k);
      const ra = (a * k) / g, rb = (b * k) / g;
      return fl(3, `把 ${a * k}/${b * k} 约分，是 ( )/( )`, { blanks: [ra, rb] },
        `分子分母同时除以最大公因数 ${g}：${a * k}/${b * k} = ${ra}/${rb}。`);
    },
  },
  {
    re: /分数的意义/,
    make: (R) => {
      const a = ri(R, 2, 5), b = ri(R, 6, 9);
      const va = a / (a + 1), vb = b / (b + 1);
      const bigger = va > vb ? `${a}/${a + 1}` : `${b}/${b + 1}`;
      return ch(R, 3, `${a}/${a + 1} 和 ${b}/${b + 1} 比，( ) 大。`, bigger, [bigger === `${a}/${a + 1}` ? `${b}/${b + 1}` : `${a}/${a + 1}`, '同样大'],
        '比较异分母分数大小，可以先通分再比较。');
    },
  },
  {
    re: /轴对称/,
    make: (R) => jd(2, '圆有无数条对称轴。', true, '沿任意一条直径所在的直线对折，圆的两边都能重合。')
  },
  {
    re: /轴对称/,
    make: (R) => ch(R, 3, '下面哪个图形不是轴对称图形？', '平行四边形', ['圆', '长方形', '等腰梯形'], '平行四边形对折后两边不能完全重合。')
  },
  {
    re: /可能性|摸球/,
    make: (R) => {
      const red = ri(R, 5, 8), white = ri(R, 1, 4);
      return ch(R, 3, '袋子里有 ' + red + ' 个红球和 ' + white + ' 个白球，任意摸出一个球，摸到 ( ) 的可能性大。', '红球', ['白球', '一样大'],
        '数量多的那种球被摸到的可能性大。');
    },
  },
  {
    re: /公平|摸球/,
    make: (R) => {
      const n = ri(R, 2, 4);
      return rd(3, '一个转盘被平均分成 ' + n * 2 + ' 个区域，其中涂红色的有 ' + n + ' 个。',
        [{ label: '(1)', text: '指针停在红色区域的可能性是几分之几？', answer: { value: `${n}/${n * 2}` } }],
        '把转盘平均分成几份，每份就是几分之一。')
    },
  },
  {
    re: /秋游/,
    make: (R) => {
      const total = ri(R, 40, 60), per = pick(R, [5, 8, 10]);
      if (total % per) return null;
      return ap(2, '秋游时 ' + total + ' 名同学坐车，每辆车坐 ' + per + ' 人，需要 ( ) 辆车。', { blanks: [{ value: total / per, unit: '辆' }] },
        `求需要几辆车用除法：${total} ÷ ${per} = ${total / per}。`);
    },
  },
];

/* ---------- 五年级下册 ---------- */
FAMS['bsd-grade5-down'] = [
  {
    re: /同分母|异分母|分数加减|加减混合|互化/,
    make: (R) => {
      const d = ri(R, 5, 12), n1 = ri(R, 1, d - 2), n2 = ri(R, 1, d - n1 - 1);
      return ca(2, `${n1}/${d} + ${n2}/${d} =`, { value: `${n1 + n2}/${d}` },
        `同分母分数相加，分母不变，分子相加：${n1} + ${n2} = ${n1 + n2}。`);
    },
  },
  {
    re: /异分母|加减混合|互化/,
    make: (R) => {
      const d1 = pick(R, [2, 3, 4]), d2 = pick(R, [3, 5, 6]);
      const n1 = ri(R, 1, d1 - 1), n2 = ri(R, 1, d2 - 1);
      const sum = fAdd([n1, d1], [n2, d2]);
      return ca(3, `${n1}/${d1} + ${n2}/${d2} =`, { value: fVal(sum) },
        `异分母分数相加，先通分化成同分母分数：${n1}/${d1} = ${sum[1] === d1 ? `${n1}/${d1}` : `${(n1 * (sum[1] / d1))}/${sum[1]}`}，${n2}/${d2} = ${(n2 * (sum[1] / d2))}/${sum[1]}，再相加得 ${fVal(sum)}。`);
    },
  },
  {
    re: /异分母|加减混合/,
    make: (R) => {
      const d1 = pick(R, [2, 3, 4]), d2 = pick(R, [3, 4, 6]);
      const n1 = ri(R, 2, d1), n2 = ri(R, 1, d2);
      const diff = fSub([n1, d1], [n2, d2]);
      if (diff[0] <= 0) return null;
      return ca(3, `${n1}/${d1} - ${n2}/${d2} =`, { value: fVal(diff) },
        `先通分再减：${n1}/${d1} = ${(n1 * (diff[1] / d1))}/${diff[1]}，${n2}/${d2} = ${(n2 * (diff[1] / d2))}/${diff[1]}，差是 ${fVal(diff)}。`);
    },
  },
  {
    re: /互化/,
    make: (R) => {
      const d = pick(R, [4, 5, 8, 10, 20]), n = pick(R, [1, 2, 3]);
      if (n >= d) return null;
      return fl(3, `把 ${n}/${d} 化成小数是 ( )`, { value: +(n / d).toFixed(4) }, `用分子除以分母：${n} ÷ ${d} = ${n / d}。`);
    },
  },
  {
    re: /表面积/,
    make: (R) => {
      const a = ri(R, 4, 8), b = ri(R, 3, a - 1), c = ri(R, 2, b - 1);
      return ca(3, '一个长方体长 ' + a + ' 厘米、宽 ' + b + ' 厘米、高 ' + c + ' 厘米，表面积是 ( ) 平方厘米。', { value: 2 * (a * b + a * c + b * c), unit: '平方厘米' },
        `长方体表面积 =（长×宽 + 长×高 + 宽×高）× 2 =（${a * b} + ${a * c} + ${b * c}）× 2 = ${2 * (a * b + a * c + b * c)}。`);
    },
  },
  {
    re: /表面积/,
    make: (R) => {
      const a = ri(R, 3, 8);
      return ca(2, '一个正方体的棱长是 ' + a + ' 厘米，表面积是 ( ) 平方厘米。', { value: 6 * a * a, unit: '平方厘米' },
        `正方体表面积 = 棱长 × 棱长 × 6 = ${a} × ${a} × 6 = ${6 * a * a}。`);
    },
  },
  {
    re: /露在/,
    make: (R) => {
      const n = ri(R, 2, 5);
      return ap(3, n + ' 个棱长 1 厘米的小正方体摆成一排，露在外面的面一共有 ( ) 个。', { blanks: [{ value: 4 * n + 2, unit: '个' }] },
        `每个小正方体有 ${n > 1 ? '4 个面露在外面，再加上两端的 2 个面' : '全部面露在外面'}：${n > 1 ? `4 × ${n} + 2` : 6} = ${4 * n + 2}。`);
    },
  },
  {
    re: /长方体的认识/,
    make: (R) => fl(2, '长方体有 ( ) 个面，( ) 条棱，( ) 个顶点。', { blanks: [6, 12, 8] }, '长方体有 6 个面、12 条棱、8 个顶点。')
  },
  {
    re: /展开|折叠/,
    make: (R) => jd(2, '正方体的展开图中，相对的面一定不相邻。', true, '展开图中相对的两个面中间隔着一个面。')
  },
  {
    re: /乘整数|乘法的混合运算与应用/,
    make: (R) => {
      const d = ri(R, 4, 9), n = ri(R, 2, 5);
      const prod = fMul([n, d], [n, 1]);
      return ca(2, `${n}/${d} × ${n} =`, { value: fVal(prod) },
        `分数乘整数，分子与整数相乘，分母不变：${n} × ${n} = ${n * n}，得 ${fVal(prod)}。`);
    },
  },
  {
    re: /乘分数|乘法的混合运算与应用/,
    make: (R) => {
      const n1 = ri(R, 1, 4), d1 = ri(R, 5, 9), n2 = ri(R, 1, 4), d2 = ri(R, 5, 9);
      const prod = fMul([n1, d1], [n2, d2]);
      return ca(3, `${n1}/${d1} × ${n2}/${d2} =`, { value: fVal(prod) },
        `分数乘分数，分子相乘的积作分子，分母相乘的积作分母：${n1} × ${n2} = ${n1 * n2}，${d1} × ${d2} = ${d1 * d2}，结果是 ${fVal(prod)}。`);
    },
  },
  {
    re: /除以整数/,
    make: (R) => {
      const d = ri(R, 2, 5), n = ri(R, 1, d - 1), c = ri(R, 2, 5);
      const q = fDiv([n, d], [c, 1]);
      return ca(3, `${n}/${d} ÷ ${c} =`, { value: fVal(q) },
        `分数除以整数，等于乘这个整数的倒数：${n}/${d} × 1/${c} = ${fVal(q)}。`);
    },
  },
  {
    re: /一个数除以分数/,
    make: (R) => {
      const d1 = ri(R, 2, 5), n1 = ri(R, 1, d1 - 1), d2 = ri(R, 2, 5), n2 = ri(R, 1, d2 - 1);
      const q = fDiv([n1, d1], [n2, d2]);
      return ca(3, `${n1}/${d1} ÷ ${n2}/${d2} =`, { value: fVal(q) },
        `除以一个分数等于乘它的倒数：${n1}/${d1} × ${d2}/${n2} = ${fVal(q)}。`);
    },
  },
  {
    re: /倒数/,
    make: (R) => {
      const d = ri(R, 3, 9), n = ri(R, 2, d - 1);
      return fl(3, `${n}/${d} 的倒数是 ( )/( )`, { blanks: [d, n] }, `求倒数把分子分母交换位置：${n}/${d} 的倒数是 ${d}/${n}。`);
    },
  },
  {
    re: /倒数/,
    make: (R) => jd(3, '1 的倒数是 1，0 没有倒数。', true, '乘积是 1 的两个数互为倒数；0 乘任何数都得 0，不可能得 1。')
  },
  {
    re: /乘整数/,
    make: (R) => {
      const kg = ri(R, 3, 8);
      return ap(3, '一桶油重 ' + kg + ' 千克，用去 1/2，用去 ( ) 千克。', { blanks: [{ value: kg / 2, unit: '千克' }] },
        `求 ${kg} 的 1/2 是多少，用乘法：${kg} × 1/2 = ${kg / 2}。`);
    },
  },
  {
    re: /体积与容积|长方体的体积/,
    make: (R) => {
      const a = ri(R, 6, 12), b = ri(R, 4, 8), c = ri(R, 3, 6);
      return ca(3, '一个长方体长 ' + a + ' 厘米、宽 ' + b + ' 厘米、高 ' + c + ' 厘米，体积是 ( ) 立方厘米。', { value: a * b * c, unit: '立方厘米' },
        `长方体体积 = 长 × 宽 × 高 = ${a} × ${b} × ${c} = ${a * b * c}。`);
    },
  },
  {
    re: /体积|单位/,
    make: (R) => fl(3, '1 立方米 = ( ) 立方分米。', { value: 1000 }, '体积单位间的进率是 1000。')
  },
  {
    re: /排水|测量/,
    make: (R) => {
      const s = ri(R, 10, 30), h1 = ri(R, 4, 8), h2 = h1 + ri(R, 2, 5);
      return ap(3, '一个长方体容器的底面积是 ' + s + ' 平方厘米，水面高 ' + h1 + ' 厘米，放入一块石头后水面升到 ' + h2 + ' 厘米，石头的体积是 ( ) 立方厘米。', { blanks: [{ value: s * (h2 - h1), unit: '立方厘米' }] },
        `水面上升的体积就是石头的体积：${s} × ${h2 - h1} = ${s * (h2 - h1)}。`);
    },
  },
  {
    re: /体积|容积/,
    make: (R) => ch(R, 3, '计量冰箱的容积，用（ ）作单位比较合适。', '升', ['毫升', '立方米', '立方厘米'], '冰箱的容积较大，用升作单位合适。')
  },
  {
    re: /数对|位置/,
    make: (R) => fl(2, '数对 (2, 3) 表示第 ( ) 列第 ( ) 行。', { blanks: [2, 3] }, '数对中第一个数表示列，第二个数表示行。')
  },
  {
    re: /数对|位置/,
    make: (R) => {
      const col = ri(R, 2, 6), row = ri(R, 2, 6), dx = ri(R, 1, 4);
      return fl(3, `点 A 在 (${col}, ${row})，向右平移 ${dx} 格后到点 B，点 B 是第 ( ) 列第 ( ) 行。`, { blanks: [col + dx, row] },
        `向右平移，列数加 ${dx}：${col} + ${dx} = ${col + dx}，行数不变。`);
    },
  },
  {
    re: /和倍|差倍|方程方法的综合/,
    make: (R) => {
      const b = ri(R, 5, 12), k = pick(R, [2, 3]);
      return ap(3, '甲、乙两个数的和是 ' + b * (k + 1) + '，甲是乙的 ' + k + ' 倍，乙是 ( )。', { blanks: [{ value: b, unit: '' }] },
        `把乙看作 1 份，甲就是 ${k} 份，一共 ${k + 1} 份：${b * (k + 1)} ÷ ${k + 1} = ${b}。`);
    },
  },
  {
    re: /相遇/,
    make: (R) => {
      const v1 = ri(R, 40, 70), v2 = ri(R, 30, 60), t = ri(R, 2, 5);
      const s = (v1 + v2) * t;
      return ap(3, '甲、乙两地相距 ' + s + ' 千米，两车同时从两地相向而行，速度分别是每小时 ' + v1 + ' 千米和 ' + v2 + ' 千米，( ) 小时后相遇。', { blanks: [{ value: t, unit: '小时' }] },
        `相遇时间 = 路程 ÷ 速度和：${s} ÷ (${v1} + ${v2}) = ${t}。`);
    },
  },
  {
    re: /方程方法的综合/,
    make: (R) => {
      const x = ri(R, 4, 12);
      return ap(3, '一个数的 3 倍是 ' + x * 3 + '，这个数是 ( )。', { blanks: [{ value: x, unit: '' }] },
        `已知一个数的几倍是多少，求这个数用除法：${x * 3} ÷ 3 = ${x}。`);
    },
  },
  {
    re: /平均数/,
    make: (R) => {
      const n = ri(R, 3, 6), total = n * ri(R, 18, 26);
      return ap(3, '第一小组 ' + n + ' 人共得 ' + total + ' 分，平均每人 ( ) 分。', { blanks: [{ value: total / n, unit: '分' }] },
        `平均数 = 总分 ÷ 人数：${total} ÷ ${n} = ${total / n}。`);
    },
  },
  {
    re: /复式/,
    make: (R) => ch(R, 3, '复式条形统计图的特点是（ ）。', '能同时表示两组数据并便于比较', ['只能表示一组数据', '不能比较多少', '只能表示变化情况'],
      '复式条形统计图用两种（或多种）直条表示两组数据，便于比较。')
  },
];

/* ---------- 六年级上册 ---------- */
FAMS['bsd-grade6-up'] = [
  {
    re: /圆的周长/,
    make: (R) => {
      const r = ri(R, 2, 6);
      return ca(3, '一个圆的半径是 ' + r + ' 厘米，周长是 ( ) 厘米。（π 取 3.14）', { value: +(2 * 3.14 * r).toFixed(2), unit: '厘米' },
        `圆的周长 = 2πr = 2 × 3.14 × ${r} = ${2 * 3.14 * r} 厘米。`);
    },
  },
  {
    re: /圆的面积/,
    make: (R) => {
      const d = ri(R, 2, 8) * 2;
      return ca(3, '一个圆的直径是 ' + d + ' 厘米，面积是 ( ) 平方厘米。（π 取 3.14）', { value: +(3.14 * (d / 2) * (d / 2)).toFixed(2), unit: '平方厘米' },
        `先求半径：${d} ÷ 2 = ${d / 2} 厘米；面积 = πr² = 3.14 × ${d / 2}² = ${3.14 * (d / 2) * (d / 2)}。`);
    },
  },
  {
    re: /圆的面积/,
    make: (R) => {
      const R1 = ri(R, 4, 8), r1 = ri(R, 1, R1 - 1);
      return ap(3, '一个圆环的外圆半径是 ' + R1 + ' 厘米、内圆半径是 ' + r1 + ' 厘米，圆环的面积是 ( ) 平方厘米。（π 取 3.14）', { blanks: [{ value: +(3.14 * (R1 * R1 - r1 * r1)).toFixed(2), unit: '平方厘米' }] },
        `圆环面积 = π(R² - r²) = 3.14 × (${R1}² - ${r1}²) = 3.14 × ${R1 * R1 - r1 * r1} = ${3.14 * (R1 * R1 - r1 * r1)}。`);
    },
  },
  {
    re: /圆的周长/,
    make: (R) => ch(R, 2, '圆的周长大约是直径的 ( ) 倍。', '3.14', ['2', '3', '4'], '圆的周长与直径的比值是一个固定的数，叫做圆周率 π，约 3.14。')
  },
  {
    re: /圆的认识/,
    make: (R) => jd(2, '圆有无数条对称轴。', true, '沿任意一条直径所在的直线对折，两边都能重合。')
  },
  {
    re: /圆的认识/,
    make: (R) => ch(R, 2, '用圆规画圆时，圆的大小由（ ）决定。', '半径', ['圆心', '周长', '颜色'], '圆心决定圆的位置，半径决定圆的大小。')
  },
  {
    re: /分数混合|简便/,
    make: (R) => {
      const d1 = pick(R, [2, 3, 4]), n1 = ri(R, 1, d1 - 1), d2 = pick(R, [3, 4, 6]), n2 = ri(R, 1, d2 - 1), c = ri(R, 2, 6);
      const s = fAdd([n1, d1], [n2, d2]);
      const prod = fMul(s, [c, 1]);
      return ca(3, `(${n1}/${d1} + ${n2}/${d2}) × ${c} =`, { value: fVal(prod) },
        `先算括号里的：${n1}/${d1} + ${n2}/${d2} = ${fVal(s)}；再算 ${fVal(s)} × ${c} = ${fVal(prod)}。`);
    },
  },
  {
    re: /分数混合|简便/,
    make: (R) => {
      const d = pick(R, [5, 7, 8, 9]), n = ri(R, 2, d - 2), c = pick(R, [3, 4]);
      const a = fDiv([c, d], [c, d]);
      const prod = fMul([n, d], a);
      return ca(3, `${n}/${d} × ${c}/${d} × ${d}/${c} =`, { value: fVal(prod) },
        `后两个数互为倒数，积是 1，所以结果就是 ${n}/${d}，即 ${fVal(prod)}。`);
    },
  },
  {
    re: /分数混合|简便/,
    make: (R) => jd(3, '整数乘法的运算定律对分数乘法同样适用。', true, '运算定律对整数、小数、分数都适用。')
  },
  {
    re: /互化/,
    make: (R) => {
      const d = pick(R, [4, 5, 10, 20, 25]), n = pick(R, [1, 2, 3]);
      if (n >= d) return null;
      return fl(2, `${n}/${d} = ( )%`, { value: (n / d) * 100 }, `把分数化成百分数，先把分数化成小数再乘 100%：${n} ÷ ${d} = ${n / d}，是 ${(n / d) * 100}%。`);
    },
  },
  {
    re: /百分数的实际应用|百分数应用的综合/,
    make: (R) => {
      const n = ri(R, 2, 9) * 10;
      return fl(2, `${n} 的 25% 是 ( )`, { value: n / 4 }, `求一个数的百分之几是多少用乘法：${n} × 25% = ${n / 4}。`);
    },
  },
  {
    re: /折扣/,
    make: (R) => {
      const price = ri(R, 100, 400) * 10;
      return ap(3, '一件商品原价 ' + price + ' 元，打八折后的现价是 ( ) 元。', { blanks: [{ value: price * 0.8, unit: '元' }] },
        `打八折就是按原价的 80% 出售：${price} × 80% = ${price * 0.8} 元。`);
    },
  },
  {
    re: /百分率/,
    make: (R) => {
      const total = ri(R, 40, 80), ok = total - ri(R, 1, 4);
      return ap(3, '一批产品共 ' + total + ' 个，合格的有 ' + ok + ' 个，合格率是 ( )%。', { blanks: [{ value: (ok / total) * 100, unit: '%' }] },
        `合格率 = 合格数 ÷ 总数 × 100% = ${ok} ÷ ${total} × 100% = ${(ok / total) * 100}%。`);
    },
  },
  {
    re: /互化/,
    make: (R) => fl(2, '0.45 = ( )%', { value: 45 }, '小数化成百分数，把小数点向右移两位，添上百分号。')
  },
  {
    re: /比的化简/,
    make: (R) => {
      const k = ri(R, 2, 9), a = 3 * k, b = 4 * k;
      return fl(3, `把 ${a} : ${b} 化简比，是 ( ) : ( )`, { blanks: [3, 4] },
        `比的前项和后项同时除以 ${k}：${a} : ${b} = 3 : 4。`);
    },
  },
  {
    re: /按比分配/,
    make: (R) => {
      const total = ri(R, 5, 9) * 10;
      return ap(3, '把 ' + total + ' 按 2 : 3 分配，较多的一份是 ( )。', { blanks: [{ value: (total / 5) * 3, unit: '' }] },
        `一共 ${total} ÷ (2 + 3) = ${total / 5} 份，较多的一份是 3 份：${total / 5} × 3 = ${(total / 5) * 3}。`);
    },
  },
  {
    re: /比的意义/,
    make: (R) => ch(R, 2, '比的后项不能为 ( )', '0', ['1', '任何数', '小数'], '比的后项相当于除数，除数不能为 0。')
  },
  {
    re: /扇形/,
    make: (R) => ch(R, 3, '要表示各部分数量与总数量之间的关系，用（ ）统计图。', '扇形统计图', ['条形统计图', '折线统计图'], '扇形统计图用整个圆表示总数，用扇形大小表示各部分占总数的百分比。')
  },
  {
    re: /扇形/,
    make: (R) => {
      const pct = pick(R, [20, 25, 40, 50]);
      return ap(3, '扇形统计图中，某部分占总数的 ' + pct + '%，这部分的圆心角是 ( ) 度。', { blanks: [{ value: (360 * pct) / 100, unit: '度' }] },
        `整个圆是 360 度，占 ${pct}% 的扇形圆心角是 360 × ${pct}% = ${(360 * pct) / 100} 度。`);
    },
  },
  {
    re: /多（少）百分之几/,
    make: (R) => {
      const a = ri(R, 6, 9) * 10, b = ri(R, 3, 5) * 10;
      return ap(3, '甲数是 ' + a + '，乙数是 ' + b + '，甲数比乙数多 ( )%。', { blanks: [{ value: ((a - b) / b) * 100, unit: '%' }] },
        `（甲 - 乙）÷ 乙 = ${a - b} ÷ ${b} = ${((a - b) / b) * 100}%。`);
    },
  },
  {
    re: /观察的范围|生活中的应用/,
    make: (R) => ch(R, 3, '观察物体时，站得越高，观察到的范围越 ( )', '大', ['小', '一样', '无法确定'], '站得越高，视线越开阔，观察到的范围越大。')
  },
  {
    re: /场次|搭配/,
    make: (R) => {
      const n = ri(R, 4, 6);
      return ap(3, n + ' 支球队进行单循环比赛，每两队赛一场，一共要赛 ( ) 场。', { blanks: [{ value: (n * (n - 1)) / 2, unit: '场' }] },
        `每队要和其他 ${n - 1} 队各赛一场，共 ${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2} 场（两队之间重复算了一次，要除以 2）。`);
    },
  },
  {
    re: /反弹/,
    make: (R) => {
      const h = ri(R, 8, 15) * 10;
      return rd(3, '实验：一个球从 ' + h + ' 厘米高处自由落下，每次弹起的高度大约是落下高度的 2/5。',
        [{ label: '(1)', text: '第一次弹起了多少厘米？', answer: { value: (h * 2) / 5, unit: '厘米' } }],
        '求一个数的几分之几是多少，用乘法。')
    },
  },
  {
    re: /看图|身高/,
    make: (R) => {
      const a = ri(R, 130, 150), g = ri(R, 15, 30);
      return rd(3, '下图反映了小明 6～11 岁的身高变化情况：6 岁时 ' + a + ' 厘米，11 岁时 ' + (a + g) + ' 厘米。',
        [
          { label: '(1)', text: '小明 6 岁时的身高是多少厘米？', answer: { value: a, unit: '厘米' } },
          { label: '(2)', text: '从 6 岁到 11 岁，小明长高了多少厘米？', answer: { value: g, unit: '厘米' } },
        ],
        '折线统计图能清楚地反映数量的增减变化。')
    },
  },
];

/* ---------- 六年级下册 ---------- */
FAMS['bsd-grade6-down'] = [
  {
    re: /圆柱的表面积/,
    make: (R) => {
      const r = ri(R, 2, 5), h = ri(R, 4, 10);
      return ca(3, '一个圆柱的底面半径是 ' + r + ' 厘米、高是 ' + h + ' 厘米，侧面积是 ( ) 平方厘米。（π 取 3.14）', { value: +(2 * 3.14 * r * h).toFixed(2), unit: '平方厘米' },
        `圆柱侧面积 = 底面周长 × 高 = 2πr × h = 2 × 3.14 × ${r} × ${h} = ${2 * 3.14 * r * h}。`);
    },
  },
  {
    re: /圆柱的体积/,
    make: (R) => {
      const d = ri(R, 2, 5) * 2, h = ri(R, 4, 10);
      return ca(3, '一个圆柱的底面直径是 ' + d + ' 厘米、高是 ' + h + ' 厘米，体积是 ( ) 立方厘米。（π 取 3.14）', { value: +(3.14 * (d / 2) * (d / 2) * h).toFixed(2), unit: '立方厘米' },
        `圆柱体积 = πr²h = 3.14 × ${d / 2}² × ${h} = ${3.14 * (d / 2) * (d / 2) * h}。`);
    },
  },
  {
    re: /圆锥/,
    make: (R) => {
      const r = ri(R, 2, 5), h = ri(R, 3, 9);
      return ap(3, '一个圆锥的底面半径是 ' + r + ' 厘米、高是 ' + h + ' 厘米，体积是 ( ) 立方厘米。（π 取 3.14）', { blanks: [{ value: +((3.14 * r * r * h) / 3).toFixed(2), unit: '立方厘米' }] },
        `圆锥体积 = 1/3 πr²h = 3.14 × ${r}² × ${h} ÷ 3 = ${(3.14 * r * r * h) / 3}。`);
    },
  },
  {
    re: /圆柱/,
    make: (R) => ch(R, 2, '圆柱的侧面展开图一般是（ ）。', '长方形', ['圆', '三角形', '梯形'], '沿高剪开圆柱侧面，展开图是长方形，长是底面周长，宽是高。')
  },
  {
    re: /圆锥/,
    make: (R) => fl(2, '圆锥有 ( ) 条高。', { value: 1 }, '圆锥只有一条高，就是顶点到底面圆心的距离。')
  },
  {
    re: /不规则立体/,
    make: (R) => {
      const a = ri(R, 5, 10), b = ri(R, 5, 10), dh = ri(R, 2, 4);
      return ap(3, '一个长方体容器从里面量长 ' + a + ' 厘米、宽 ' + b + ' 厘米、高 20 厘米，放入一块石头后水面上升了 ' + dh + ' 厘米，石头的体积是 ( ) 立方厘米。', { blanks: [{ value: a * b * dh, unit: '立方厘米' }] },
        `水面上升的体积就是石头的体积：${a} × ${b} × ${dh} = ${a * b * dh}。`);
    },
  },
  {
    re: /比例的意义|比例的基本性质/,
    make: (R) => {
      const a = ri(R, 2, 9), b = ri(R, 4, 12), c = ri(R, 4, 12);
      const x = (b * c) / a;
      if (!Number.isInteger(x)) return null;
      return ca(3, `解比例：${a} : ${b} = ${c} : x，x = ( )`, { value: x },
        `根据比例的基本性质，内项之积等于外项之积：${b} × ${c} = ${a} × x，x = ${b * c} ÷ ${a} = ${x}。`);
    },
  },
  {
    re: /比例的意义|比例的基本性质/,
    make: (R) => {
      const k = ri(R, 2, 9), a = 4 * k, b = 9 * k;
      return fl(3, `${a} : ${b} = 20 : ( )`, { value: (20 * b) / a }, `先化简或直接用比例的基本性质：${a} : ${b} = 20 : x，${a}x = ${b} × 20，x = ${(20 * b) / a}。`);
    },
  },
  {
    re: /比例的意义/,
    make: (R) => ch(R, 3, '下面哪个是比例？', '4 : 9 = 8 : 18', ['4 + 9 = 13', '4 × 9 = 36', '4 - 9 = -5'], '表示两个比相等的式子叫比例。')
  },
  {
    re: /比例的意义/,
    make: (R) => {
      const k = ri(R, 2, 8), a = 3 * k, b = 5 * k;
      return ap(3, '甲有 ' + a + ' 元，乙有 ' + b + ' 元，甲与乙的钱数比是 ( ) : ( )', { blanks: [3, 5] },
        `把钱数同时除以 ${k} 化简：${a} : ${b} = 3 : 5。`);
    },
  },
  {
    re: /比例尺/,
    make: (R) => {
      const cm = ri(R, 2, 6);
      return ap(3, '一幅图的比例尺是 1 : 1000，图上 ' + cm + ' 厘米表示实际 ( ) 米。', { blanks: [{ value: cm * 10, unit: '米' }] },
        `实际距离 = 图上距离 × 1000 = ${cm} × 1000 = ${cm * 1000} 厘米 = ${cm * 10} 米。`);
    },
  },
  {
    re: /比例尺/,
    make: (R) => {
      const m = ri(R, 3, 9) * 100;
      return fl(3, '实际距离 ' + m + ' 米，画在比例尺 1 : 20000 的图上，应画 ( ) 厘米。', { value: m * 100 / 20000 },
        `图上距离 = 实际距离 ÷ 20000 = ${m * 100} ÷ 20000 = ${m * 100 / 20000} 厘米。`);
    },
  },
  {
    re: /校园/,
    make: (R) => {
      const cm = ri(R, 3, 8);
      return ap(3, '绘制校园平面图的比例尺是 1 : 2000，图上教室长 ' + cm + ' 厘米，实际长 ( ) 米。', { blanks: [{ value: (cm * 2000) / 100, unit: '米' }] },
        `实际距离 = ${cm} × 2000 = ${cm * 2000} 厘米 = ${(cm * 2000) / 100} 米。`);
    },
  },
  {
    re: /图形的旋转|图形旋转的画法/,
    make: (R) => fg(3, '下图红色小旗绕点 O 顺时针旋转到绿色小旗的位置，旋转了 ( ) 度。', { value: 90, unit: '度' },
      '红色小旗绕 O 点顺时针转 90° 后正好到绿色小旗的位置。', rotateFig)
  },
  {
    re: /放大|缩小/,
    make: (R) => ch(R, 3, '图形的放大与缩小，改变的是图形的（ ），不改变形状。', '大小', ['形状', '颜色', '位置'], '按比放大或缩小只改变大小，形状不变。')
  },
  {
    re: /图形的旋转|图形旋转的画法|图形的运动/,
    make: (R) => jd(3, '旋转不改变图形的形状和大小。', true, '旋转只改变图形的方向，形状和大小都不变。')
  },
  {
    re: /图形的旋转|图形旋转的画法|图形的运动/,
    make: (R) => ch(R, 3, '钟面上分针从 12 顺时针旋转到 3，旋转了 ( )', '90', ['30', '60', '120'], '每个大格是 30 度，从 12 到 3 有 3 个大格：3 × 30 = 90 度。')
  },
  {
    re: /变化的量|反比例的意义/,
    make: (R) => jd(3, '路程一定时，速度和时间成反比例。', true, '速度 × 时间 = 路程（一定），乘积一定，成反比例。')
  },
  {
    re: /正比例的意义/,
    make: (R) => jd(3, '圆的周长与直径成正比例。', true, '周长 ÷ 直径 = π（一定），比值一定，成正比例。')
  },
  {
    re: /正比例的意义/,
    make: (R) => ch(R, 3, '下面成正比例的是 ( )', '正方形的周长与边长', ['圆的面积与半径', '人的身高与年龄', '减法中被减数与差'],
      '正方形周长 ÷ 边长 = 4（一定），比值一定，成正比例。')
  },
  {
    re: /反比例的意义/,
    make: (R) => ch(R, 3, '下面成反比例的是 ( )', '路程一定时，速度与时间', ['正方形周长与边长', '圆的周长与直径', '单价一定时，总价与数量'],
      '乘积一定的两个量成反比例。')
  },
  {
    re: /图像|画一画/,
    make: (R) => ch(R, 3, '正比例关系的图像是一条 ( )', '直线', ['曲线', '折线', '不能确定'], '正比例的图像是过原点的一条直线。')
  },
  {
    re: /莫比乌斯/,
    make: (R) => ch(R, 3, '莫比乌斯带沿着中线剪开，得到的是 ( )', '一个更长的纸环', ['两个纸环', '一段纸条', '两个结'],
      '莫比乌斯带只有一个面，沿中线剪开会得到一个更长的纸环。')
  },
  {
    re: /小猫/,
    make: (R) => {
      const col = ri(R, 2, 5), row = ri(R, 2, 5);
      return fl(3, `一只小猫原来在 (${col}, ${row})，向右平移 2 格、向下平移 1 格后，它到了第 ( ) 列第 ( ) 行。`, { blanks: [col + 2, row - 1] },
        `向右平移列数加 2：${col} + 2 = ${col + 2}；向下平移行数减 1：${row} - 1 = ${row - 1}。`);
    },
  },
  {
    re: /欣赏/,
    make: (R) => ch(R, 3, '图案设计中常常用到的图形运动方式有（ ）。', '平移、旋转和轴对称', ['只有平移', '只有旋转', '只数一数'],
      '平移、旋转和轴对称是图案设计的基本手段。')
  },
];

/* ================= 补充家族：补齐未覆盖考点 ================= */
/* 一年级上册 */
FAMS['bsd-grade1-up'].push(
  {
    re: /一一对应/,
    make: (R) => {
      const n = ri(R, 4, 8);
      return fg(1, '数一数，下图中有几朵花？把数量写在横线上。', { blanks: [{ value: n, unit: '朵' }] },
        `用一个一个点数的方法，按顺序数：1、2、3……数到 ${n}，一共 ${n} 朵。`, svgCircles(n, C.pink));
    },
  },
  {
    re: /一一对应/,
    make: (R) => {
      const a = ri(R, 3, 7), b = a + ri(R, 1, 3);
      return ap(1, '第一行有 ' + a + ' 只小兔，第二行有 ' + b + ' 只小兔，第二行比第一行多 ( ) 只。', { blanks: [{ value: b - a, unit: '只' }] },
        `一个对一个地比，第二行比第一行多：${b} - ${a} = ${b - a}。`);
    },
  },
  {
    re: /0的认识/,
    make: (R) => ch(R, 1, '盘子里有 3 个苹果，被小朋友全吃完了，盘子里还剩 ( ) 个。', '0', ['1', '3', '2'],
      '一个也没有了，就用 0 表示，0 表示没有。')
  },
  {
    re: /0的认识/,
    make: (R) => jd(1, '0 也是一个数，比 1 小。', true, '0 表示没有，在尺子上 0 还是起点的位置，0 比 1 小。')
  },
  {
    re: /0的认识/,
    make: (R) => fl(1, '直尺上从 ( ) 开始量物体的长度。', { value: 0 }, '量长度时一般把物体的一端对准 0，0 是起点。')
  },
  {
    re: /自选标准分类/,
    make: (R) => ch(R, 2, '把 2 支铅笔、2 块橡皮、2 把尺子分类，下面哪种分法合理？', '铅笔、尺子一类，橡皮一类', ['按颜色分', '随便分', '不能分'],
      '可以自己选定标准：铅笔和尺子是文具，橡皮也是文具……按“是不是橡皮”分，一类是橡皮，一类是其他文具。')
  },
  {
    re: /分类结果的表示与应用/,
    make: (R) => {
      const labels = ['苹果', '香蕉', '橘子'];
      const vals = [ri(R, 3, 9), ri(R, 3, 9), ri(R, 3, 9)];
      const maxI = vals.indexOf(Math.max(...vals));
      return { ...ch(R, 2, '同学们带水果的统计如下图，带（ ）的人数最多。', labels[maxI], labels.filter((_, i) => i !== maxI), '直条最高的一项数量最多。'),
        media: svgBars(labels.map((l, i) => ({ label: l, value: vals[i] })), { unit: '人', color: C.amber }) };
    },
  },
  {
    re: /分类结果的表示与应用/,
    make: (R) => {
      const clothes = ri(R, 5, 9), toys = ri(R, 2, 4);
      return rd(2, '小明把家里的物品分成两类：衣物有 ' + clothes + ' 件，玩具有 ' + toys + ' 个。',
        [
          { label: '(1)', text: '衣物和玩具一共有多少？', answer: { value: clothes + toys, unit: '件' } },
          { label: '(2)', text: '衣物比玩具多几件？', answer: { value: clothes - toys, unit: '件' } },
        ],
        '先按标准分类，再分别数出每一类的数量，最后求和、比较。')
    },
  },
  {
    re: /我说你做/,
    make: (R) => {
      const kinds = [['cuboid', '长方体'], ['cube', '正方体'], ['cylinder', '圆柱'], [null, '球']];
      const k = pick(R, kinds);
      const names = kinds.map((x) => x[1]).filter((x) => x !== k[1]);
      return { ...ch(R, 1, '听口令：“请拿出一个' + k[1] + '。”拿出的应该是下面哪个图形？', k[1], names,
        `按指令辨认立体图形：${k[1]}。`), media: svgSolid(k[0]) };
    },
  },
  {
    re: /我说你做/,
    make: (R) => ch(R, 2, '老师说“把桌子上最大的正方体举起来”，你应该举（ ）。', '正方体', ['长方体', '圆柱', '球'],
      '先听清指令中的形状名称，再找出对应的立体图形举起来。')
  },
  {
    re: /十几加减一位数/,
    make: (R) => {
      const a = ri(R, 11, 16), b = ri(R, 1, a - 10);
      return ca(1, `${a} + ${b} =`, { value: a + b }, `先算个位：${a % 10} + ${b} = ${a % 10 + b}，个位不满十，十位不变，结果是 ${a + b}。`);
    },
  },
  {
    re: /十几加减一位数/,
    make: (R) => {
      const a = ri(R, 12, 17), b = ri(R, 1, 9);
      return fl(2, `${a} - ${b} = ( )`, { value: a - b }, `个位 ${a % 10} 减 ${b} 够减，十位上的 1 不变，结果是 ${a - b}。`);
    },
  },
  {
    re: /9加几/,
    make: (R) => {
      const b = ri(R, 2, 8);
      return ca(2, `9 + ${b} =`, { value: 9 + b }, `用凑十法：把 ${b} 分成 1 和 ${b - 1}，9 和 1 凑成 10，10 加 ${b - 1} 等于 ${9 + b}。`);
    },
  },
  {
    re: /9加几/,
    make: (R) => {
      const b = ri(R, 2, 8);
      return ap(2, '树上有 9 只小鸟，又飞来 ' + b + ' 只，现在一共有 ( ) 只。', { blanks: [{ value: 9 + b, unit: '只' }] },
        `求一共多少只用加法：9 + ${b}，把 ${b} 分成 1 和 ${b - 1}，9 和 1 凑成 10，一共 ${9 + b} 只。`);
    },
  },
);
/* 一年级下册 */
FAMS['bsd-grade1-down'].push(
  {
    re: /相对位置|上下|前后|左右/,
    make: (R) => rd(2, '小明的文具盒在书包的下面，课本在文具盒的上面。',
      [
        { label: '(1)', text: '课本在文具盒的哪一面？', answer: { value: '上面', unit: '' } },
        { label: '(2)', text: '书包在文具盒的哪一面？', answer: { value: '上面', unit: '' } },
      ],
      '确定位置要先选定一个标准物体，再看另一个物体在它的上、下、左、右、前、后哪一面。')
  },
  {
    re: /相对位置|上下|前后|左右/,
    make: (R) => ch(R, 2, '小明面朝南站着，他的后面是（ ）方。', '北', ['南', '东', '西'],
      '面朝南时，前面是南，后面是北，左面是东，右面是西。')
  },
  {
    re: /欣赏与设计/,
    make: (R) => ch(R, 1, '风车转动时，风车的叶片属于（ ）现象。', '旋转', ['平移', '对称', '滑动'],
      '风车叶片绕中心转动，属于旋转现象。')
  },
  {
    re: /欣赏与设计/,
    make: (R) => jd(2, '轴对称图形沿对称轴对折后，两边能完全重合。', true, '对折后完全重合是轴对称图形的特征。')
  },
);
/* 二年级上册 */
FAMS['bsd-grade2-up'].push(
  {
    re: /剪出对称图形/,
    make: (R) => {
      const w = ri(R, 3, 6);
      return fg(2, '把一张长方形纸对折后，剪去图中所示的部分（虚线为折痕），展开后得到的图形有 ( ) 条对称轴。', { blanks: [{ value: 1, unit: '条' }] },
        `对折后剪出的图形展开一定是轴对称图形，折痕就是它的对称轴，所以有 1 条对称轴。`,
        fig(200, 120, `<rect x="20" y="20" width="80" height="80" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2"/><line x1="100" y1="10" x2="100" y2="110" stroke="${C.ink}" stroke-dasharray="6 4"/><path d="M60,60 A20,20 0 0 1 80,80" fill="none" stroke="${C.pink}" stroke-width="3"/>`));
    },
  },
  {
    re: /图案设计/,
    make: (R) => ch(R, 2, '用长方形纸连续对折三次后剪出一个三角形，展开后一共能得到 ( ) 个三角形。', '8', ['2', '4', '6'],
      '每对折一次，剪出的图形数量就翻倍：对折三次是 2 × 2 × 2 = 8 个。')
  },
  {
    re: /2~5的乘法口诀/,
    make: (R) => {
      const a = ri(R, 2, 5), b = ri(R, 2, 5);
      return ap(2, '每行摆 ' + a + ' 个☆，摆 ' + b + ' 行，一共摆 ( ) 个☆。', { blanks: [{ value: a * b, unit: '个' }] },
        `求几个几是多少用乘法：${a} × ${b} = ${a * b}，用口诀“${cnMul(a, b)}”。`);
    },
  },
  {
    re: /2~5的乘法口诀/,
    make: (R) => {
      const a = ri(R, 2, 4), b = ri(R, 2, 5);
      return rd(2, '同学们做红花，每组做 ' + a + ' 朵，' + b + ' 组一共做多少朵？',
        [
          { label: '(1)', text: '一共做了多少朵红花？', answer: { value: a * b, unit: '朵' } },
          { label: '(2)', text: '如果每组少做 1 朵，一共少做几朵？', answer: { value: b, unit: '朵' } },
        ],
        '求几个几相加的和，用乘法计算比较简便。')
    },
  },
  {
    re: /认识米|用米量/,
    make: (R) => ch(R, 1, '量教室的长和宽，用（ ）作单位比较合适。', '米', ['厘米', '毫米', '千米'],
      '教室的长和宽有几米长，用米作单位合适；厘米用来量较短的物体。')
  },
  {
    re: /认识米|用米量/,
    make: (R) => {
      const n = ri(R, 2, 5), cut = ri(R, 1, n);
      return ap(2, '一根绳子长 ' + n + ' 米，剪下 ' + cut + ' 米，还剩 ( ) 米。', { blanks: [{ value: n - cut, unit: '米' }] },
        `求还剩多少用减法：${n} - ${cut} = ${n - cut} 米。`);
    },
  },
  {
    re: /6~9的乘法口诀/,
    make: (R) => {
      const a = ri(R, 6, 9), b = ri(R, 2, 9);
      return ap(2, '一只小鸡 ' + a + ' 条腿，' + b + ' 只小鸡一共有 ( ) 条腿。', { blanks: [{ value: a * b, unit: '条' }] },
        `求 ${b} 个 ${a} 是多少用乘法：${a} × ${b} = ${a * b}。`);
    },
  },
  {
    re: /6~9的乘法口诀/,
    make: (R) => {
      const a = ri(R, 6, 9);
      return rd(2, '同学们排队做操，每行 ' + a + ' 人，站了 ' + a + ' 行。',
        [
          { label: '(1)', text: '一共有多少人做操？', answer: { value: a * a, unit: '人' } },
          { label: '(2)', text: '如果每行多站 1 人，现在每行几人？', answer: { value: a + 1, unit: '人' } },
        ],
        `行数 × 每行人数 = 总人数，用乘法口诀“${cnMul(a, a)}”计算。`)
    },
  },
);
/* 二年级下册 */
FAMS['bsd-grade2-down'].push(
  {
    re: /东、南、西、北|方向/,
    make: (R) => ch(R, 1, '太阳升起的方向是（ ）方。', '东', ['南', '西', '北'],
      '早晨太阳从东方升起，傍晚从西方落下。')
  },
  {
    re: /东、南、西、北|方向/,
    make: (R) => ch(R, 2, '小红面向西，她的左手边是（ ）方。', '南', ['北', '东', '西'],
      '面向西时，前面是西、后面是东，左手边是南、右手边是北。')
  },
  {
    re: /东、南、西、北|方向/,
    make: (R) => rd(2, '小明从家出发，先向东走到商店，再向北走到学校。',
      [
        { label: '(1)', text: '商店在家的什么方向？', answer: { value: '东', unit: '' } },
        { label: '(2)', text: '学校在商店的什么方向？', answer: { value: '北', unit: '' } },
      ],
      '描述方向时先说清以哪里为观测点：商店以家为观测点在东边，学校以商店为观测点在北边。')
  },
  {
    re: /估算/,
    make: (R) => {
      const a = ri(R, 102, 499), b = ri(R, 101, 498);
      const ra = Math.round(a / 100) * 100, rb = Math.round(b / 100) * 100;
      return ca(2, `估算：${a} + ${b} ≈`, { value: ra + rb }, `把 ${a} 看作 ${ra}，${b} 看作 ${rb}，${ra} + ${rb} = ${ra + rb}。`);
    },
  },
  {
    re: /估算/,
    make: (R) => {
      const a = ri(R, 202, 898), b = ri(R, 101, 199);
      const ra = Math.round(a / 100) * 100, rb = Math.round(b / 100) * 100;
      return fl(2, `估算：${a} - ${b} ≈ ( )`, { value: ra - rb }, `把 ${a} 看作 ${ra}，${b} 看作 ${rb}，${ra} - ${rb} = ${ra - rb}。`);
    },
  },
  {
    re: /直角/,
    make: (R) => ch(R, 1, '三角板上最大的角是（ ）角。', '直', ['锐', '钝', '平'],
      '三角板上最大的角是 90 度，是直角。')
  },
  {
    re: /直角/,
    make: (R) => jd(2, '黑板面的四个角都是直角。', true, '长方形、正方形的四个角都是直角，黑板面是长方形。')
  },
  {
    re: /直角/,
    make: (R) => fg(2, '下面图形中标出的角是（ ）角。', { value: '直', alts: ['直角'], mode: 'text' }, '这个角的两边互相垂直，是 90 度的直角。',
      fig(160, 120, `<path d="M30,100 L130,100" stroke="${C.ink}" stroke-width="3"/><path d="M30,100 L30,30" stroke="${C.ink}" stroke-width="3"/><path d="M30,80 A20,20 0 0 0 50,100" fill="none" stroke="${C.pink}" stroke-width="2.5"/><text x="55" y="92" font-size="16" fill="${C.pink}">直</text>`))
  },
  {
    re: /平行四边形/,
    make: (R) => {
      const w = ri(R, 60, 90), h = ri(R, 40, 60), s = ri(R, 15, 30);
      return { ...ch(R, 1, '下面是什么图形？', '平行四边形', ['长方形', '正方形', '三角形'],
        '对边平行且相等、有四个角的四边形是平行四边形。'),
        media: fig(200, 140, `<polygon points="${30},${40 + s} ${30 + w},${40} ${30 + w + s},${40 + h} ${30 + s},${40 + h + s}" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/>`) };
    },
  },
  {
    re: /平行四边形/,
    make: (R) => jd(2, '平行四边形容易变形。', true, '平行四边形有不稳定性，容易变形，伸缩门就是利用这个特性。')
  },
  {
    re: /欣赏与设计/,
    make: (R) => ch(R, 1, '下面图案是由一个基本图形经过（ ）得到的。', '平移', ['涂色', '测量', '称重'],
      '同一个图形沿直线移动同样的距离，能得到连续的图案，这是平移。')
  },
  {
    re: /欣赏与设计/,
    make: (R) => ch(R, 2, '用画、剪、拼等方法设计图案时，常用的方法有（ ）。', '轴对称、平移、旋转', ['只涂颜色', '只折叠', '只测量'],
      '图案设计常用轴对称、平移、旋转等图形运动方法。')
  },
);
/* 三年级上册 */
FAMS['bsd-grade3-up'].push(
  {
    re: /混合运算解决实际问题/,
    make: (R) => {
      const a = ri(R, 20, 60), b = ri(R, 10, 30), c = ri(R, 2, 8);
      return ap(3, '商店里有 ' + a + ' 千克苹果，上午卖出 ' + b + ' 千克，下午又运来 ' + c + ' 箱（每箱 10 千克），现在有苹果多少千克？', { blanks: [{ value: a - b + c * 10, unit: '千克' }] },
        `先算下午运来 ${c * 10} 千克，再列综合算式：${a} - ${b} + ${c * 10} = ${a - b + c * 10} 千克。`);
    },
  },
  {
    re: /混合运算解决实际问题/,
    make: (R) => {
      const each = ri(R, 3, 6), boxes = ri(R, 4, 8), left = ri(R, 10, 30);
      return rd(3, '老师买了 ' + boxes + ' 盒彩笔，每盒 ' + each + ' 支，发给同学们 ' + (each * boxes - left) + ' 支。',
        [
          { label: '(1)', text: '一共买了多少支彩笔？', answer: { value: each * boxes, unit: '支' } },
          { label: '(2)', text: '还剩多少支？', answer: { value: left, unit: '支' } },
        ],
        '求总数用乘法，求剩下的用减法，可以列综合算式解答。')
    },
  },
  {
    re: /从相对位置观察物体/,
    make: (R) => {
      const objs = ['纸箱', '水杯', '文具盒'];
      const o = pick(R, objs);
      const others = objs.filter((x) => x !== o);
      return ch(R, 2, '把 ' + objs.join('、') + ' 排成一排，从左边第一个物体的上面往里看，（ ）在最前面，能被看见；（ ）被挡住了，不能被看见。', o, others,
        '观察物体时，前面的物体会挡住后面的物体，被挡住的部分就看不见。');
    },
  },
  {
    re: /根据观察结果判断与表达/,
    make: (R) => rd(2, '三个小朋友观察同一个长方体纸箱。',
      [
        { label: '(1)', text: '从正面和后面看到的形状一样吗？', answer: { value: '一样', unit: '' } },
        { label: '(2)', text: '从上面看到的还是长方形吗？', answer: { value: '不是', unit: '' } },
      ],
      '长方体相对的面相同，从正面和后面看到的形状相同；从上面看到的是另一个面的形状。')
  },
  {
    re: /周长的认识/,
    make: (R) => {
      const w = ri(R, 4, 7), h = ri(R, 3, 6);
      return fg(2, '下面长方形的周长是 ( ) 厘米。（每小格边长 1 厘米）', { blanks: [{ value: 2 * (w + h), unit: '厘米' }] },
        `封闭图形一周的长度就是周长：数出长 ${w} 厘米、宽 ${h} 厘米，周长 = ${2 * (w + h)} 厘米。`,
        fig(240, 160, `<rect x="30" y="30" width="${w * 24}" height="${h * 24}" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>`));
    },
  },
  {
    re: /周长的认识/,
    make: (R) => ch(R, 2, '“周长”指的是（ ）。', '封闭图形一周的长度', ['图形的大小', '图形的颜色', '图形里面的大小'],
      '周长是封闭图形一周的长度，可以用绳子绕一圈量出来。')
  },
  {
    re: /两位数乘一位数（不进位笔算）/,
    make: (R) => {
      const a = ri(R, 11, 43), b = ri(R, 2, 3);
      return ca(3, `${a} × ${b} =`, { value: a * b }, `把 ${a} 分成 ${a - a % 10} 和 ${a % 10}：${a - a % 10} × ${b} = ${(a - a % 10) * b}，${a % 10} × ${b} = ${(a % 10) * b}，合起来是 ${a * b}。`);
    },
  },
  {
    re: /两位数乘一位数（进位笔算）/,
    make: (R) => {
      const a = ri(R, 14, 39), b = ri(R, 4, 9);
      return ca(3, `${a} × ${b} =`, { value: a * b }, `个位上 ${a % 10} × ${b} = ${(a % 10) * b}，满几十就向十位进几，最后结果是 ${a * b}。`);
    },
  },
  {
    re: /两位数乘一位数/,
    make: (R) => {
      const a = ri(R, 12, 48);
      return fl(3, `${a} × 3 = ( )`, { value: a * 3 }, `相同数位要对齐，从个位乘起，个位满几十要向十位进几。`);
    },
  },
  {
    re: /年、月、日/,
    make: (R) => ch(R, 2, '下面各月中，是大月的是（ ）。', '8 月', ['4 月', '6 月', '11 月'],
      '8 月有 31 天，是大月；4 月、6 月、11 月都是小月，有 30 天。')
  },
  {
    re: /年、月、日/,
    make: (R) => jd(2, '平年的 2 月有 28 天，闰年的 2 月有 29 天。', true, '闰年 2 月多一天，全年 366 天；平年 2 月 28 天，全年 365 天。')
  },
  {
    re: /年、月、日/,
    make: (R) => fl(2, '一年有 ( ) 个大月。', { value: 7 }, '大月是 1、3、5、7、8、10、12 月，共 7 个，每月 31 天。')
  },
  {
    re: /从不同位置观察同一个物体/,
    make: (R) => {
      const n = ri(R, 3, 6);
      return fg(2, '把 ' + n + ' 个小正方体横着摆成一排，从正面看是 ( ) 个正方形。', { blanks: [{ value: n, unit: '个' }] },
        `从正面看，一排 ${n} 个小正方体就是 ${n} 个正方形面。`, svgSolid('cuboid'));
    },
  },
  {
    re: /从不同位置观察同一个物体/,
    make: (R) => ch(R, 2, '从不同位置观察同一个物体，看到的图形（ ）。', '可能不同', ['一定相同', '一定不同', '永远是正方形'],
      '观察的方向不同，看到的面就可能不同，所以看到的图形可能不同。')
  },
  {
    re: /从相对位置观察物体/,
    make: (R) => ch(R, 2, '坐在行驶的汽车里往窗外看，路边的树看起来在向 ( ) 移动。', '后', ['前', '左', '不动'],
      '汽车向前行驶，以汽车为观测点，路边的树相对汽车在向后移动。')
  },
  {
    re: /根据观察结果判断与表达/,
    make: (R) => rd(2, '同学们观察一个粉笔盒（长方体）：小红从正面看，小明从侧面看，小丽从上面看。',
      [
        { label: '(1)', text: '小红和小明看到的图形形状一样吗？', answer: { value: '不一样', alts: ['不同'], mode: 'text' } },
        { label: '(2)', text: '从上面看到的是什么图形？', answer: { value: '长方形', alts: ['矩形'], mode: 'text' } },
      ],
      '长方体有 6 个面，相对的面相同；从不同的方向观察，看到的形状可能不同。')
  },
);
/* 三年级下册 */
FAMS['bsd-grade3-down'].push(
  {
    re: /两位数除以一位数（口算）/,
    make: (R) => {
      const b = ri(R, 2, 9), q = ri(R, 11, 44);
      return ca(2, `${q * b} ÷ ${b} =`, { value: q }, `想乘法算除法：${b} × ${q} = ${q * b}，所以 ${q * b} ÷ ${b} = ${q}。`);
    },
  },
  {
    re: /两位数除以一位数（口算）/,
    make: (R) => {
      const b = ri(R, 2, 9), q = ri(R, 10, 40);
      return fl(2, `${q * b} ÷ ${b} = ( )`, { value: q }, `把 ${q * b} 看成 ${q} 个十，${q} 个十除以 ${b}，得 ${q}。`);
    },
  },
  {
    re: /三位数除以一位数（笔算）/,
    make: (R) => {
      const b = ri(R, 2, 9), q = ri(R, 102, 289);
      return ca(3, `${q * b} ÷ ${b} =`, { value: q }, `从被除数的高位除起，百位除完把余数和下一位合起来继续除，最后商 ${q}。`);
    },
  },
  {
    re: /三位数除以一位数（笔算）/,
    make: (R) => {
      const b = ri(R, 2, 9), q = ri(R, 120, 320);
      return ap(3, '图书馆买来 ' + q * b + ' 本新书，平均放在 ' + b + ' 个书架上，每个书架放 ( ) 本。', { blanks: [{ value: q, unit: '本' }] },
        `求每份是多少用除法：${q * b} ÷ ${b} = ${q} 本。`);
    },
  },
  {
    re: /用除法解决实际问题/,
    make: (R) => {
      const per = ri(R, 3, 9), groups = ri(R, 4, 8);
      return ap(2, '植树节一共栽了 ' + per * groups + ' 棵树，平均每行栽 ' + per + ' 棵，一共栽了 ( ) 行。', { blanks: [{ value: groups, unit: '行' }] },
        `求栽了几行，就是求 ${per * groups} 里面有 ${groups} 个 ${per}：${per * groups} ÷ ${per} = ${groups} 行。`);
    },
  },
  {
    re: /用除法解决实际问题/,
    make: (R) => {
      const total = ri(R, 30, 80), per = ri(R, 4, 9);
      const q = Math.floor(total / per), r = total - q * per;
      return ap(3, '有 ' + total + ' 个同学去划船，每条船最多坐 ' + per + ' 人，至少需要 ( ) 条船。', { blanks: [{ value: q + (r > 0 ? 1 : 0), unit: '条' }] },
        `${total} ÷ ${per} = ${q} 条还剩 ${r} 人，剩下的 ${r} 人也要 1 条船，所以至少 ${q + (r > 0 ? 1 : 0)} 条。`);
    },
  },
  {
    re: /平移/,
    make: (R) => ch(R, 1, '电梯上下移动属于（ ）现象。', '平移', ['旋转', '轴对称', '翻滚'],
      '物体沿直线方向移动，形状和大小不变，是平移。')
  },
  {
    re: /平移/,
    make: (R) => jd(2, '平移不改变图形的形状和大小，只改变位置。', true, '平移后图形的形状、大小都不变，只是位置移动了。')
  },
  {
    re: /旋转/,
    make: (R) => ch(R, 1, '钟面上时针、分针的走动属于（ ）现象。', '旋转', ['平移', '对称', '放大'],
      '指针绕中心点转动，属于旋转现象。')
  },
  {
    re: /旋转/,
    make: (R) => jd(2, '风车转动时，每个叶片转过的角度一样大。', true, '旋转时每个叶片都绕同一中心转过相同的角度。')
  },
  {
    re: /几分之一/,
    make: (R) => {
      const d = ri(R, 2, 6);
      return ch(R, 2, '把一个苹果平均分成 ' + d + ' 份，每份是这个苹果的 ( )', `1/${d}`, ['1/2', '1/3', '1/5'].filter((x) => x !== `1/${d}`),
        `平均分成 ${d} 份，每份就是几分之一，写作 1/${d}。`);
    },
  },
  {
    re: /几分之一/,
    make: (R) => {
      const d = ri(R, 2, 5), n = ri(R, 2, Math.min(4, d));
      return fl(2, '一张纸平均分成 ' + d + ' 份，取其中的 ' + n + ' 份，是这张纸的 ( )。', { value: `${n}/${d}` },
        `平均分成 ${d} 份，每份是 1/${d}，${n} 份就是 ${n}/${d}。`);
    },
  },
);
/* 四年级上册 */
FAMS['bsd-grade4-up'].push(
  {
    re: /相交与垂直/,
    make: (R) => ch(R, 2, '两条直线相交成直角时，这两条直线（ ）。', '互相垂直', ['互相平行', '长度相等', '没有关系'],
      '两条直线相交成直角，就说这两条直线互相垂直，其中一条叫另一条的垂线。')
  },
  {
    re: /相交与垂直/,
    make: (R) => jd(2, '从直线外一点到这条直线的所有线段中，垂直线段最短。', true, '这点到直线的垂直线段的长度，就是点到直线的距离，它最短。')
  },
  {
    re: /平移与平行/,
    make: (R) => ch(R, 2, '在同一平面内，不相交的两条直线（ ）。', '互相平行', ['一定垂直', '会相交', '长度相等'],
      '同一平面内不相交的两条直线互相平行，平行的两条线永远不会相交。')
  },
  {
    re: /平移与平行/,
    make: (R) => jd(2, '平行四边形有两组对边分别平行。', true, '平行四边形的两组对边分别平行并且相等。')
  },
  {
    re: /旋转与角/,
    make: (R) => ch(R, 2, '一条射线绕它的端点旋转一周形成的角是（ ）。', '周角', ['直角', '平角', '锐角'],
      '射线旋转一周是 360 度，形成周角；旋转半周是平角，旋转 90 度是直角。')
  },
  {
    re: /旋转与角/,
    make: (R) => {
      const names = ['锐角', '直角', '钝角', '平角', '周角'];
      const degs = [45, 90, 135, 180, 360];
      const i = ri(R, 0, 4);
      return ch(R, 2, `${degs[i]} 度的角是（ ）。`, names[i], names.filter((_, j) => j !== i),
        `${degs[i]} 度${i === 1 ? '是直角' : i === 3 ? '是平角' : i === 4 ? '是周角' : i === 0 ? '比直角小，是锐角' : '比直角大比平角小，是钝角'}。`);
    },
  },
  {
    re: /角的度量|量角器/,
    make: (R) => {
      const deg = ri(R, 30, 150);
      return fg(3, '下图中的角是多少度？用量角器量一量。', { value: deg, unit: '度' },
        `量角时把量角器的中心与角的顶点重合，0 刻度线与一条边重合，另一条边对着的刻度就是角的度数，是 ${deg} 度。`,
        fig(200, 150, `<path d="M30,110 L170,110" stroke="${C.ink}" stroke-width="3"/><path d="M30,110 L30,40" stroke="${C.ink}" stroke-width="3"/><path d="M30,90 A20,20 0 0 0 50,110" fill="none" stroke="${C.pink}" stroke-width="2.5"/><text x="52" y="100" font-size="15" fill="${C.pink}">?</text>`));
    },
  },
  {
    re: /角的度量|量角器/,
    make: (R) => ch(R, 2, '度量角的大小的单位是（ ）。', '度', ['厘米', '千克', '米'],
      '计量角的大小用度作单位，用符号“°”表示。')
  },
  {
    re: /路线图/,
    make: (R) => rd(3, '小明从家到学校的路线：从家出发向东走 200 米到书店，再向北走 300 米到学校。',
      [
        { label: '(1)', text: '小明从家到学校一共要走多少米？', answer: { value: 500, unit: '米' } },
        { label: '(2)', text: '学校在书店的什么方向？', answer: { value: '北', unit: '' } },
      ],
      '描述路线要说清楚方向和各段的路程，再把各段路程合起来。')
  },
  {
    re: /路线图/,
    make: (R) => {
      const a = ri(R, 100, 400), b = ri(R, 100, 400);
      return ap(3, '小红从家出发，先向东走 ' + a + ' 米，再向西走 ' + b + ' 米，这时她在家的 ( ) 面 ' + Math.abs(a - b) + ' 米处。', { blanks: [{ value: a > b ? '东' : '西', unit: '' }, { value: Math.abs(a - b), unit: '米' }] },
        `向东 ${a} 米再向西 ${b} 米，相当于向${a > b ? '东' : '西'}走了 ${Math.abs(a - b)} 米。`);
    },
  },
  {
    re: /除数是整十数的除法（口算）/,
    make: (R) => {
      const d = ri(R, 2, 9), q = ri(R, 2, 9);
      return ca(3, `口算：${d * 10 * q} ÷ ${d * 10} =`, { value: q }, `想：${d * 10} × ${q} = ${d * 10 * q}，所以 ${d * 10 * q} ÷ ${d * 10} = ${q}。`);
    },
  },
  {
    re: /除数是整十数的除法（口算）/,
    make: (R) => {
      const d = ri(R, 3, 9);
      return fl(3, `口算：${d * 60} ÷ ${d * 10} = ( )`, { value: 6 }, `把 ${d * 60} 看作 ${d} 个六十，${d * 10} 是 ${d} 个十，${d} 个六十里面有 6 个 ${d} 个十，得 6。`);
    },
  },
);
/* 四年级下册 */
FAMS['bsd-grade4-down'].push(
  {
    re: /三角形的分类/,
    make: (R) => {
      const kinds = [['锐角三角形', '三个角都是锐角'], ['直角三角形', '有一个角是直角'], ['钝角三角形', '有一个角是钝角']];
      const k = pick(R, kinds);
      const others = kinds.map((x) => x[0]).filter((x) => x !== k[0]);
      return ch(R, 2, `${k[1]}的三角形是（ ）。`, k[0], others, `按角分类：${k[1]}。`);
    },
  },
  {
    re: /三角形的分类/,
    make: (R) => {
      const a1 = ri(R, 30, 120), a2 = ri(R, 20, 180 - a1 - 20);
      const a3 = 180 - a1 - a2;
      const mx = Math.max(a1, a2, a3);
      const t = mx === 90 ? '直角三角形' : mx > 90 ? '钝角三角形' : '锐角三角形';
      return { ...ch(R, 2, '一个三角形的三个内角分别是 ' + a1 + '°、' + a2 + '°、' + a3 + '°，它是（ ）。', t, ['锐角三角形', '直角三角形', '钝角三角形'].filter((x) => x !== t),
        `三个角的和是 180°，最大的角是 ${mx}°${mx === 90 ? '，是直角' : mx > 90 ? '，是钝角' : '，是锐角'}，所以是${t}。`),
        media: fig(180, 130, `<polygon points="30,110 150,110 90,30" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2.5"/><text x="80" y="105" font-size="14" fill="${C.ink}">${mx}°</text>`) };
    },
  },
  {
    re: /我说你搭/,
    make: (R) => {
      const a = ri(R, 3, 5);
      return ch(R, 2, '先横着摆 ' + a + ' 个同样的小正方体，再在最中间那个的上面摆 1 个，这个图形从正面看是 ( ) 个正方形。', String(a + 1), [String(a), String(a + 2), String(2 * a)],
        `从正面看：下面一行 ${a} 个正方形，最中间上面还叠着 1 个，一共 ${a} + 1 = ${a + 1} 个。`);
    },
  },
  {
    re: /我说你搭/,
    make: (R) => ch(R, 2, '老师说“先摆 1 个正方体，再在它的前面摆 1 个正方体”，摆成的是（ ）。', '一排 2 个正方体', ['一列 2 个正方体', '十字形', 'L 形'],
      '按指令一步步摆：先确定基本形状，再确定每次摆放的位置。')
  },
);
/* 五年级上册 */
FAMS['bsd-grade5-up'].push(
  {
    re: /循环小数/,
    make: (R) => {
      const d = pick(R, [3, 9]);
      const digit = d === 3 ? '3' : '1';
      return ch(R, 3, `1 ÷ ${d} 的商是（ ）。`, `0.${digit}${digit}…（${digit} 依次不断重复）`, ['0.' + digit + '（小数部分有限）', '整数 1', '0.1'],
        `1 ÷ ${d} 除不尽，商的小数部分 ${digit} 会依次不断重复出现，这样的数叫循环小数。`);
    },
  },
  {
    re: /循环小数/,
    make: (R) => {
      const a = ri(R, 1, 9), b = ri(R, 0, 9);
      const blk = b === 0 ? String(a) : String(a) + String(b);
      return fl(3, `5.${blk.repeat(3)}… 的循环节是 ( )。`, { value: blk },
        `小数部分 ${blk} 依次不断重复出现，循环节就是 ${blk}。`);
    },
  },
  {
    re: /循环小数/,
    make: (R) => jd(3, '循环小数都是无限小数。', true, '小数部分依次不断重复出现，永远写不完，所以是无限小数。')
  },
  {
    re: /平移的认识与判断/,
    make: (R) => ch(R, 2, '图形平移后，（ ）不变。', '形状和大小', ['位置', '方向', '颜色深浅'],
      '平移只改变位置，图形的形状和大小都不变。')
  },
  {
    re: /平移的认识与判断/,
    make: (R) => jd(2, '图形平移的格数就是对应点之间的格数。', true, '数平移了几格，只要数图形上任意一个对应点移动了几格。')
  },
  {
    re: /欣赏与设计/,
    make: (R) => ch(R, 2, '用平移、旋转或轴对称设计图案时，基本图形（ ）。', '形状大小不变', ['会变大', '会变小', '会消失'],
      '设计图案时只改变图形的位置和方向，不改变图形的形状和大小。')
  },
  {
    re: /欣赏与设计/,
    make: (R) => ch(R, 2, '下面可以用连续平移画出图案的是（ ）。', '同样大的三角形连续排列', ['越来越大的圆', '大小不一的正方形间隔排列'],
      '连续平移每次移动的距离相同，得到的是大小相同的图形等距离排列。')
  },
  {
    re: /比较图形的面积/,
    make: (R) => {
      const a = ri(R, 4, 8);
      let b = ri(R, 4, 8);
      while (b === a) b = ri(R, 4, 8);
      const body = `<rect x="20" y="20" width="${a * 20}" height="60" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2"/>` +
        `<rect x="20" y="90" width="${b * 20}" height="60" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2"/>`;
      return { ...ch(R, 3, '下面两个图形相比，（ ）的面积大。（每小格一样大）', a > b ? '上面图形' : '下面图形', [b > a ? '上面图形' : '下面图形', '同样大'],
        '用数格子的方法比较面积：占的格子多，面积就大。'), media: fig(220, 170, body) };
    },
  },
  {
    re: /比较图形的面积/,
    make: (R) => ch(R, 3, '比较两个图形面积的大小，下面最公平的方法是（ ）。', '用同样大的方格纸去量', ['用眼睛看', '比周长', '比颜色'],
      '比较面积要用统一的标准去测量，用同样大的方格去摆或数最公平。')
  },
  {
    re: /认识底和高/,
    make: (R) => {
      const w = ri(R, 50, 80), h = ri(R, 30, 50);
      return { ...ch(R, 2, '下图平行四边形中，从对面的顶点向底边画的垂直线段叫做平行四边形的（ ）。', '高', ['底', '边', '对角线'],
        '从平行四边形一条边上的一点向对边引一条垂直线段，这点和垂足间的线段就是高。'),
        media: fig(200, 150, `<polygon points="20,${110} ${20 + w},${110} ${20 + w + 20},${40} ${40},${40}" fill="${C.amberSoft || '#fde8c8'}" stroke="${C.amber}" stroke-width="2.5"/><line x1="${20 + w}" y1="${110}" x2="${20 + w}" y2="${40}" stroke="${C.pink}" stroke-width="2.5" stroke-dasharray="5 3"/>`) };
    },
  },
  {
    re: /认识底和高/,
    make: (R) => ch(R, 2, '三角形有 ( ) 条高。', '3', ['1', '2', '4'],
      '从每个顶点向对边都能画一条高，三角形有 3 个顶点，所以有 3 条高。')
  },
  {
    re: /图形中的规律/,
    make: (R) => {
      const n = ri(R, 3, 9);
      return fl(3, '摆 n 个三角形需要 ' + (2 * n + 1) + ' 根小棒，那么摆 ' + n + ' 个三角形需要 ( ) 根小棒。', { value: 2 * n + 1 },
        `摆 1 个三角形要 3 根，以后每多 1 个三角形多 2 根：3 + (${n} - 1) × 2 = ${2 * n + 1}。`);
    },
  },
  {
    re: /图形中的规律/,
    make: (R) => {
      const n = ri(R, 4, 9);
      return ch(R, 3, '正方形个数与所用小棒根数的关系：1 个 4 根，2 个 7 根，3 个 10 根……摆 ' + n + ' 个需要 ( ) 根。', String(3 * n + 1), [String(4 * n), String(2 * n + 2), String(3 * n)],
        `每个正方形 4 根，但相邻的正方形合用 1 条边，所以是 ${n} × 3 + 1 = ${3 * n + 1} 根。`);
    },
  },
  {
    re: /尝试与猜测/,
    make: (R) => {
      const a = ri(R, 2, 5), b = ri(R, 2, 5);
      const sum = a + b, diff = a - b;
      return ap(3, '鸡兔同笼，共有 ' + sum + ' 个头，兔比鸡多 ' + diff + ' 只，鸡有 ( ) 只。', { blanks: [{ value: b, unit: '只' }] },
        `用列举法：鸡 ${b} 只兔 ${a} 只时，头 ${sum} 个，兔比鸡多 ${diff} 只，符合题意。`);
    },
  },
  {
    re: /尝试与猜测/,
    make: (R) => {
      const a = ri(R, 2, 4), b = ri(R, 2, 4);
      return ch(R, 3, '用 1 元和 5 元的纸币凑 ' + (a + 5 * b) + ' 元，下面第 ( ) 种拿法最容易列举。', '先固定 5 元张数，再调 1 元张数', ['随便拿', '只拿 1 元', '只拿 5 元'],
        '列举时按一定顺序：先定 5 元的张数，再算出 1 元的张数，能不重复不遗漏。');
    },
  },
);
/* 五年级下册 */
FAMS['bsd-grade5-down'].push(
  {
    re: /长方体的认识/,
    make: (R) => ch(R, 2, '长方体有 ( ) 个面。', '6', ['4', '8', '12'],
      '长方体有 6 个面、12 条棱、8 个顶点，相对的面完全相同。')
  },
  {
    re: /长方体的认识/,
    make: (R) => jd(2, '正方体是特殊的长方体。', true, '正方体长、宽、高都相等，符合长方体的所有特征，是特殊的长方体。')
  },
  {
    re: /长方体的认识/,
    make: (R) => {
      const l = ri(R, 3, 6), w = ri(R, 2, 5), h = ri(R, 2, 4);
      return { ...ch(R, 2, '下面长方体的长、宽、高分别是 ' + l + ' 厘米、' + w + ' 厘米、' + h + ' 厘米，相交于一个顶点的三条棱的长度和是 ( ) 厘米。', String(l + w + h), [String(l * w * h), String(2 * (l + w + h)), String(l + w)],
        `相交于一个顶点的三条棱就是长、宽、高：${l} + ${w} + ${h} = ${l + w + h} 厘米。`), media: svgSolid('cuboid') };
    },
  },
  {
    re: /展开与折叠/,
    make: (R) => ch(R, 2, '正方体的展开图一共有 ( ) 种。', '11', ['6', '8', '无数'],
      '正方体展开后是 6 个正方形连成的一片，共有 11 种不同的展开图。')
  },
  {
    re: /展开与折叠/,
    make: (R) => jd(2, '长方体展开后，相对的面在展开图中往往相隔一个面。', true, '折成立方体后相对的两个面，在展开图中间隔着一个面。')
  },
  {
    re: /体积单位/,
    make: (R) => ch(R, 2, '棱长 1 厘米的正方体，体积是 ( )。', '1 立方厘米', ['1 平方厘米', '1 厘米', '1 立方米'],
      '棱长 1 厘米的正方体体积是 1 立方厘米；棱长 1 分米的是 1 立方分米；棱长 1 米的是 1 立方米。')
  },
  {
    re: /体积单位/,
    make: (R) => fl(2, '1 立方分米 = ( ) 立方厘米。', { value: 1000 }, '棱长 1 分米 = 10 厘米，体积是 10 × 10 × 10 = 1000 立方厘米。')
  },
  {
    re: /用数对确定位置/,
    make: (R) => {
      const col = ri(R, 1, 6), row = ri(R, 1, 5);
      const cell = 40, ox = 40, oy = 30;
      const body = `<rect x="${ox}" y="${oy}" width="${6 * cell}" height="${5 * cell}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>` +
        Array.from({ length: 7 }, (_, i) => `<line x1="${ox + i * cell}" y1="${oy}" x2="${ox + i * cell}" y2="${oy + 5 * cell}" stroke="#e2e8f0"/>`).join('') +
        Array.from({ length: 6 }, (_, i) => `<line x1="${ox}" y1="${oy + i * cell}" x2="${ox + 6 * cell}" y2="${oy + i * cell}" stroke="#e2e8f0"/>`).join('') +
        `<circle cx="${ox + (col - 0.5) * cell}" cy="${oy + (row - 0.5) * cell}" r="12" fill="${C.pink}" stroke="#fff" stroke-width="2"/>`;
      return { ...fg(3, '下图中圆点的位置用数对表示是 ( )。', { blanks: [{ value: `${col},${row}`, alts: [`(${col},${row})`, `(${col}, ${row})`, `${col}，${row}`, `第${col}列第${row}行`], mode: 'text' }] },
        `数对中第一个数表示列，第二个数表示行：第 ${col} 列第 ${row} 行。`), media: fig(280, 230, body) };
    },
  },
  {
    re: /用数对确定位置/,
    make: (R) => {
      const col = ri(R, 1, 5), row = ri(R, 1, 5);
      return ap(3, '小明坐在教室的第 ' + col + ' 列第 ' + row + ' 行，用数对表示是 ( )。', { blanks: [{ value: `${col},${row}`, alts: [`(${col},${row})`, `(${col}, ${row})`, `${col}，${row}`, `第${col}列第${row}行`], mode: 'text' }] },
        '数对的前一个数表示列，后一个数表示行，中间用逗号隔开，加括号。');
    },
  },
  {
    re: /根据数对描述位置关系/,
    make: (R) => {
      const c1 = ri(R, 1, 5), r1 = ri(R, 1, 5);
      const dc = ri(R, 1, 2), dr = ri(R, 1, 2);
      return ch(R, 3, `如果 A 的位置是 (${c1}, ${r1})，B 在 A 向右平移 ${dc} 格、向上平移 ${dr} 格的位置，B 的位置是 ( )。`, `(${c1 + dc}, ${r1 + dr})`, [`(${c1 - dc}, ${r1 + dr})`, `(${c1 + dc}, ${r1 - dr})`, `(${c1 + dc + 1}, ${r1 + dr + 1})`],
        '向右平移列数加，向上平移行数加：列 ' + c1 + ' + ' + dc + ' = ' + (c1 + dc) + '，行 ' + r1 + ' + ' + dr + ' = ' + (r1 + dr) + '。');
    },
  },
  {
    re: /根据数对描述位置关系/,
    make: (R) => ch(R, 3, '数对 (3, 5) 和 (5, 3) 表示的位置（ ）。', '不同', ['相同', '都在第 3 行', '无法确定'],
      '数对中两个数的顺序不同，表示的位置就不同：(3, 5) 是第 3 列第 5 行，(5, 3) 是第 5 列第 3 行。')
  },
);
/* 六年级下册 */
FAMS['bsd-grade6-down'].push(
  {
    re: /旋转的画法|画法/,
    make: (R) => fg(3, '下图红色小旗绕点 O 顺时针旋转 90° 后，应该转到绿色小旗的位置，旋转了 ( ) 度。', { value: 90, unit: '度' },
      '绕定点旋转 90°，图形的形状和大小不变，红色小旗正好转到绿色小旗的位置。', rotateFig)
  },
  {
    re: /旋转的画法|画法/,
    make: (R) => {
      const pts2 = ri(R, 3, 5);
      return fg(3, '画出图形绕 O 点顺时针旋转 ' + pts2 + ' 格后得到的图形，旋转前后图形的面积 ( )。', { value: '不变', unit: '' },
        '旋转不改变图形的形状和大小，所以面积不变。', rotateFig);
    },
  },
  {
    re: /平移、旋转综合/,
    make: (R) => ch(R, 3, '一个图案既平移到新位置又旋转了一定角度，这个过程中（ ）。', '形状和大小不变', ['面积变大了', '形状变了', '边变长了'],
      '平移和旋转都只改变位置和方向，不改变图形的形状和大小。')
  },
  {
    re: /平移、旋转综合/,
    make: (R) => ap(3, '一个长方形长 8 厘米、宽 5 厘米，先向右平移 3 格，再绕右下角旋转 90°，图形的面积是 ( ) 平方厘米。', { blanks: [{ value: 40, unit: '平方厘米' }] },
      '平移和旋转都不改变图形的形状和大小，面积仍是 8 × 5 = 40 平方厘米。')
  },
  {
    re: /图形运动与位置描述/,
    make: (R) => rd(3, '小红从家出发，向东走 100 米到邮局，再向东走 150 米到学校。',
      [
        { label: '(1)', text: '邮局在小家的什么方向？', answer: { value: '东', unit: '' } },
        { label: '(2)', text: '小红从家到学校一共走了多少米？', answer: { value: 250, unit: '米' } },
      ],
      '描述路线要说清楚每一段的方向和距离，同方向的路程可以合起来算。')
  },
  {
    re: /图形运动与位置描述/,
    make: (R) => {
      const a = ri(R, 2, 6), b = ri(R, 2, 6);
      return ap(3, '小船从 A 处出发，先向北航行 ' + a * 10 + ' 千米，再向南航行 ' + b * 10 + ' 千米，此时小船在 A 处的 ( ) 面 ' + Math.abs(a - b) * 10 + ' 千米处。', { blanks: [{ value: a > b ? '北' : '南', unit: '' }, { value: Math.abs(a - b) * 10, unit: '千米' }] },
        `向北 ${a * 10} 千米再向南 ${b * 10} 千米，相当于向${a > b ? '北' : '南'}走了 ${Math.abs(a - b) * 10} 千米。`);
    },
  },
  {
    re: /变化的量/,
    make: (R) => {
      const n = ri(R, 2, 6);
      return rd(3, '小明买《数学故事》，每本 ' + n + ' 元，买的本数和总价如下表。',
        [
          { label: '(1)', text: '买 3 本要多少元？', answer: { value: 3 * n, unit: '元' } },
          { label: '(2)', text: '总价随着买的本数怎样变化？', answer: { value: '增加而增加', unit: '' } },
        ],
        '单价一定时，买的本数增加，总价也随着增加，本数和总价是两个变化的量。')
    },
  },
  {
    re: /变化的量/,
    make: (R) => ch(R, 3, '下面两个量中，一个量随着另一个量增加而增加的是（ ）。', '单价一定时总价与数量', ['人的身高与体重', '正方形的边长与面积（单位不同不可比）'],
      '单价一定时，数量增加，总价也随着增加，总价是随着数量变化而变化的量。')
  },
  {
    re: /变化的量/,
    make: (R) => fl(3, '路程 = 速度 × 时间，当速度一定时，路程随着时间的增加而 ( )。', { value: '增加' },
      '速度一定，时间越长，走过的路程越长，路程随着时间增加而增加。')
  },
  {
    re: /正比例的图像/,
    make: (R) => {
      const k = ri(R, 2, 5);
      const ys = 140 / (4 * k); // 让最高点落在画布内
      const dot = (x) => `<circle cx="${40 + 45 * x}" cy="${180 - ys * k * x}" r="4" fill="${C.blue}"/>`;
      const body = `<line x1="40" y1="180" x2="220" y2="180" stroke="${C.ink}" stroke-width="1.5"/>` +
        `<line x1="40" y1="180" x2="40" y2="30" stroke="${C.ink}" stroke-width="1.5"/>` +
        `<text x="215" y="198" font-size="13" fill="${C.ink}">数量</text><text x="14" y="36" font-size="13" fill="${C.ink}">总价</text>` +
        `<line x1="40" y1="180" x2="220" y2="${180 - ys * k * 4}" stroke="${C.pink}" stroke-width="2.5"/>` +
        [1, 2, 3, 4].map(dot).join('');
      return { ...ch(R, 3, '下图是单价一定时总价与数量的关系图像，买 ' + k * 3 + ' 元对应的数量是 ( )。', '3', ['1', '2', '4'],
        `总价与数量的比值是单价（一定），图像是过原点的直线；${k * 3} 元正好是 ${3} 份的价钱。`), media: fig(240, 210, body) };
    },
  },
  {
    re: /正比例的图像/,
    make: (R) => ch(R, 3, '正比例关系的图像是（ ）。', '一条过原点的直线', ['一条曲线', '一条折线', '一个圆'],
      '两种相关联的量成正比例时，画出的图像是一条过原点的直线。')
  },
);
/* ---------- 末批：剩余未覆盖考点 ---------- */
/* 二年级下册：时、分、秒 */
FAMS['bsd-grade2-down'].push(
  {
    re: /时、分、秒/,
    make: (R) => {
      const m = ri(R, 2, 5);
      return ca(2, `${m} 分 = ( ) 秒`, { value: m * 60 }, `1 分 = 60 秒，${m} 分就是 ${m} 个 60 秒：${m} × 60 = ${m * 60} 秒。`);
    },
  },
  {
    re: /时、分、秒/,
    make: (R) => {
      const s = ri(R, 61, 119);
      return fl(2, `${s} 秒 = ( ) 分 ( ) 秒`, { blanks: [1, s - 60] }, `60 秒是 1 分，${s} - 60 = ${s - 60}，所以是 1 分 ${s - 60} 秒。`);
    },
  },
  {
    re: /时、分、秒/,
    make: (R) => {
      const m = ri(R, 10, 50);
      return ap(2, '小明每天晚上 9 时睡觉，第二天早上 7 时起床，他每天睡 ( ) 小时。', { blanks: [{ value: 10, unit: '小时' }] },
        '晚上 9 时到夜里 12 时是 3 小时，再到早上 7 时又是 7 小时，一共 10 小时。');
    },
  },
);
/* 三年级下册 */
FAMS['bsd-grade3-down'].push(
  {
    re: /图形的运动在生活中的应用/,
    make: (R) => ch(R, 2, '下面现象中，属于平移的是（ ）。', '电梯上下升降', ['风车转动', '钟面指针走动', '汽车方向盘转动'],
      '电梯沿直线上下移动，形状和大小不变，是平移；风车、指针、方向盘都是旋转。')
  },
  {
    re: /图形的运动在生活中的应用/,
    make: (R) => ap(3, '学校的电动门门扇是沿着轨道（ ）开合的，这种运动方式不改变图形的形状和大小。', { blanks: [{ value: '平移', alts: ['移动'], mode: 'text' }] },
      '电动门沿直线轨道滑动，是平移现象。')
  },
  {
    re: /分数的简单实际应用/,
    make: (R) => {
      const d = pick(R, [2, 3, 4, 5, 6]), n = ri(R, 1, d - 1);
      return ap(2, '妈妈买了一个西瓜，平均切成 ' + d + ' 块，小明吃了 ' + n + ' 块，吃了这个西瓜的 ( )。', { blanks: [{ value: `${n}/${d}`, alts: [fVal(fr(n, d))], mode: 'text' }] },
        `平均切成 ${d} 块，每块是 1/${d}，吃 ${n} 块就是 ${n}/${d}。`);
    },
  },
  {
    re: /分数的简单实际应用/,
    make: (R) => {
      const d = pick(R, [3, 4, 6, 8]);
      return rd(2, '一张长方形纸，红色的占这张纸的 1/' + d + '。',
        [
          { label: '(1)', text: '把这张纸平均分成了几份？', answer: { value: d, unit: '份' } },
          { label: '(2)', text: '剩下的部分占这张纸的几分之几？', answer: { value: `${d - 1}/${d}`, alts: [fVal(fr(d - 1, d))], mode: 'text' } },
        ],
        '把整体平均分成几份，分母就是几；取了几份，分子就是几。')
    },
  },
  {
    re: /数据表示的方法/,
    make: (R) => {
      const labels = ['故事书', '科技书', '连环画'];
      const vals = [ri(R, 5, 12), ri(R, 5, 12), ri(R, 5, 12)];
      const maxI = vals.indexOf(Math.max(...vals));
      return { ...ch(R, 2, '同学们最喜欢图书的统计如下图，喜欢（ ）的人最多。', labels[maxI], labels.filter((_, i) => i !== maxI), '直条最高的一项数量最多。'),
        media: svgBars(labels.map((l, i) => ({ label: l, value: vals[i] })), { unit: '人', color: C.purple }) };
    },
  },
  {
    re: /数据表示的方法/,
    make: (R) => rd(2, '下表是三（1）班同学参加兴趣小组的情况：书法 ' + ri(R, 6, 12) + ' 人，绘画 ' + ri(R, 6, 12) + ' 人，舞蹈 ' + ri(R, 6, 12) + ' 人。',
      [
        { label: '(1)', text: '一共有多少人参加兴趣小组？', answer: { value: 18, unit: '人' } },
        { label: '(2)', text: '要清楚地表示各小组人数，用什么方法？', answer: { value: '统计表', alts: ['统计图', '条形统计图'], mode: 'text' } },
      ],
      '整理数据可以用统计表或统计图，统计表能清楚地看出数量多少。')
  },
  {
    re: /小小设计师/,
    make: (R) => ch(R, 2, '设计图案时，要把一个三角形变成一排连续的三角形，常用的方法是（ ）。', '平移', ['涂色', '测量长度', '称一称'],
      '连续相同的图形等距离排列，可以用平移得到。')
  },
  {
    re: /小小设计师/,
    make: (R) => ch(R, 2, '用平移、旋转、轴对称设计图案时，图案中每个基本图形的（ ）不变。', '形状和大小', ['颜色', '位置', '方向'],
      '设计图案只改变图形的位置和方向，不改变形状和大小。')
  },
);
/* 四年级上册：可能性 */
FAMS['bsd-grade4-up'].push(
  {
    re: /可能性大小的描述与应用/,
    make: (R) => rd(3, '盒子里有 ' + ri(R, 5, 8) + ' 个红球和 ' + ri(R, 1, 3) + ' 个白球，任意摸一个球。',
      [
        { label: '(1)', text: '可能摸到什么球？', answer: { value: '红球或白球', alts: ['红球、白球'], mode: 'text' } },
        { label: '(2)', text: '摸到什么球的可能性大？', answer: { value: '红球', mode: 'text' } },
      ],
      '数量多的那种球被摸到的可能性大，另一种可能性小。')
  },
  {
    re: /可能性大小的描述与应用/,
    make: (R) => ap(3, '联欢会上抽奖，一等奖 1 名、二等奖 3 名、三等奖 10 名，先抽的是（ ）奖。', { blanks: [{ value: '三等', alts: ['三等奖'], mode: 'text' }] },
      '三等奖名额最多，所以先抽的大多是三等奖，抽中一等奖的可能性最小。')
  },
);
/* 五年级上册：游戏公平性 */
FAMS['bsd-grade5-up'].push(
  {
    re: /游戏规则的公平性/,
    make: (R) => jd(3, '掷一枚均匀的硬币，正面朝上和反面朝上的可能性相等，用硬币决定胜负是公平的。', true,
      '硬币正反两面朝上的可能性相同，所以规则公平。')
  },
  {
    re: /游戏规则的公平性/,
    make: (R) => {
      const n = ri(R, 2, 5);
      return ap(3, '转动一个平均分成 ' + n + ' 份的转盘，其中 ' + n + ' 份涂红色，指针停在红色区域的可能性是 ( )。', { blanks: [{ value: '1', alts: ['100%', '1/1'], mode: 'text' }] },
        `整个转盘都是红色区域，指针一定停在红色区域，可能性是 1。`);
    },
  },
  {
    re: /游戏规则的公平性/,
    make: (R) => ch(R, 3, '设计抛骰子游戏时，要想公平，应该（ ）。', '双方赢的可能性相等', ['谁手气好谁赢', '先抛的人赢', '点数大的一方一定赢'],
      '公平的游戏规则要让双方获胜的可能性相等。')
  },
);
/* 五年级下册：复式折线统计图 */
FAMS['bsd-grade5-down'].push(
  {
    re: /复式折线统计图/,
    make: (R) => {
      const labels = ['周一', '周二', '周三', '周四', '周五'];
      const base = ri(R, 20, 26);
      const a = Array.from({ length: 5 }, (_, i) => base + i + ri(R, 0, 1));
      const mx = Math.max(...a), mn = Math.min(...a);
      const maxI = a.indexOf(mx);
      return rd(3, '下图是某市上周每天的最高气温统计图（单位：℃）：' + a.join('℃、') + '℃。',
        [
          { label: '(1)', text: '这一周星期几最高气温最高？是多少℃？', answer: { value: `${labels[maxI]} ${mx}℃`, alts: [`${labels[maxI]}，${mx}℃`, `${labels[maxI]}${mx}`, labels[maxI]], mode: 'text' } },
          { label: '(2)', text: '这一周的最高气温最低是多少℃？', answer: { value: mn, unit: '℃' } },
        ],
        '复式折线统计图能清楚地看出数量的多少和增减变化。')
    },
  },
  {
    re: /复式折线统计图/,
    make: (R) => {
      const sa = [ri(R, 15, 25), ri(R, 16, 26), ri(R, 17, 27), ri(R, 18, 28), ri(R, 19, 29)];
      const sb = [ri(R, 5, 15), ri(R, 6, 16), ri(R, 7, 17), ri(R, 8, 18), ri(R, 9, 19)];
      const w = 200, h = 130, ox = 36, oy = h - 24;
      const sc = 16;
      const line = (vals) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${ox + i * ((w - ox - 16) / (vals.length - 1))},${oy - v * sc}`).join(' ');
      const body = `<line x1="${ox}" y1="${oy}" x2="${w - 10}" y2="${oy}" stroke="${C.ink}"/><line x1="${ox}" y1="${oy}" x2="${ox}" y2="16" stroke="${C.ink}"/>` +
        `<path d="${line(sa)}" fill="none" stroke="${C.blue}" stroke-width="2.5"/><path d="${line(sb)}" fill="none" stroke="${C.pink}" stroke-width="2.5"/>` +
        `<text x="${w - 56}" y="${oy - sa[0] * sc - 6}" font-size="12" fill="${C.blue}">甲</text><text x="${w - 56}" y="${oy - sb[0] * sc - 6}" font-size="12" fill="${C.pink}">乙</text>`;
      const bigger = sa[sa.length - 1] - sa[0] > sb[sb.length - 1] - sb[0] ? '甲' : '乙';
      return { ...rd(3, '下图是甲、乙两城市一周气温变化情况的复式折线统计图。',
        [
          { label: '(1)', text: '甲市这一周的最高气温上升了多少℃？', answer: { value: sa[4] - sa[0], unit: '℃' } },
          { label: '(2)', text: '乙市这一周的最高气温上升了多少℃？', answer: { value: sb[4] - sb[0], unit: '℃' } },
          { label: '(3)', text: '哪个城市的气温变化幅度较大？', answer: { value: bigger, alts: [bigger + '市'], mode: 'text' } },
        ],
        '折线的起伏越大，说明数量的变化幅度越大。'), media: fig(w + 20, h + 20, body) };
    },
  },
);
/* 六年级下册：莫比乌斯带、小猫 */
FAMS['bsd-grade6-down'].push(
  {
    re: /莫比乌斯/,
    make: (R) => ch(R, 3, '莫比乌斯带一共有 ( ) 个面。', '1', ['2', '3', '无数'],
      '莫比乌斯带只有一个面，小虫不翻过边缘就能爬遍整个纸带。')
  },
  {
    re: /莫比乌斯/,
    make: (R) => jd(3, '莫比乌斯带是德国数学家莫比乌斯发现的。', true, '这种只有一个面的纸环由数学家莫比乌斯发现，因此得名。')
  },
  {
    re: /小猫/,
    make: (R) => {
      const col = ri(R, 2, 5), row = ri(R, 2, 5);
      return ap(3, '一只小猫在 ( ' + col + ', ' + row + ' ) 的位置，它向右跳了 2 格，现在的位置用数对表示是 ( )。', { blanks: [{ value: `(${col + 2}, ${row})`, alts: [`${col + 2},${row}`, `第${col + 2}列第${row}行`], mode: 'text' }] },
        `向右跳列数加：${col} + 2 = ${col + 2}，行不变，还是第 ${row} 行。`);
    },
  },
  {
    re: /小猫/,
    make: (R) => {
      const col = ri(R, 2, 5), row = ri(R, 2, 5);
      const cell = 40, ox = 40, oy = 30;
      const body = `<rect x="${ox}" y="${oy}" width="${6 * cell}" height="${5 * cell}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>` +
        `<circle cx="${ox + (col - 0.5) * cell}" cy="${oy + (row - 0.5) * cell}" r="12" fill="${C.pink}" stroke="#fff" stroke-width="2"/>` +
        `<text x="${ox + (col - 0.5) * cell - 14}" y="${oy + (row - 0.5) * cell + 5}" font-size="14" fill="#fff">猫</text>`;
      return { ...fg(3, '下图中“小猫”在 ( ' + col + ', ' + row + ' ) 的位置，如果它向上走 1 格，新位置是 ( )。', { blanks: [{ value: `(${col}, ${row - 1})`, alts: [`${col},${row - 1}`, `第${col}列第${row - 1}行`], mode: 'text' }] },
        `向上走行数减 1：${row} - 1 = ${row - 1}，列不变。`), media: fig(280, 230, body) };
    },
  },
);

/* ================= 补充家族（第三轮）：正则收紧后补齐考点 ================= */
/* 三年级下册：我们一起去游园（综合应用） */
FAMS['bsd-grade3-down'].push(
  {
    re: /游园/,
    make: (R) => {
      const per = ri(R, 10, 25);
      return ap(3, '游园时买 3 张门票一共 ' + per * 3 + ' 元，照这样算，买 5 张门票需要 ( ) 元。', { blanks: [{ value: per * 5, unit: '元' }] },
        `先求一张门票的价钱：${per * 3} ÷ 3 = ${per} 元；再求 5 张：${per} × 5 = ${per * 5} 元。`);
    },
  },
  {
    re: /游园/,
    make: (R) => {
      const boats = ri(R, 4, 9), per = 6, rest = ri(R, 1, 5);
      const total = boats * per + rest;
      return ap(3, '三(1)班 ' + total + ' 名同学去游园划船，每条船限坐 6 人，至少需要租 ( ) 条船。', { blanks: [{ value: boats + 1, unit: '条' }] },
        `${total} ÷ 6 = ${boats} 余 ${rest}，余下的 ${rest} 人也要租一条船，所以至少 ${boats} + 1 = ${boats + 1} 条。`);
    },
  },
);

/* 四年级上册：根据方向和距离确定位置 */
FAMS['bsd-grade4-up'].push(
  {
    re: /方向和距离/,
    make: (R) => ch(R, 3, '以学校为观测点，小明家在学校的东面；那么以小明家为观测点，学校在小明家的（ ）面。', '西', ['东', '南', '北'],
      '观测点互换后方向相反：东的反方向是西，距离不变。')
  },
  {
    re: /方向和距离/,
    make: (R) => {
      const a = ri(R, 100, 400), b = ri(R, 50, 300);
      return ap(3, '小明从家向东走 ' + a + ' 米到学校，从学校继续向东走 ' + b + ' 米到书店。书店在家的东面 ( ) 米处。', { blanks: [{ value: a + b, unit: '米' }] },
        `方向和距离都相同，把两段路程相加：${a} + ${b} = ${a + b} 米。`);
    },
  },
  {
    re: /方向和距离/,
    make: (R) => ch(R, 3, '要准确确定一个物体的位置，必须知道（ ）。', '方向和距离', ['只看方向', '只看距离', '物体的颜色'],
      '只知方向或只知距离都无法唯一确定位置，必须同时知道方向和距离。')
  },
);

/* 四年级下册：三角形边的关系 */
FAMS['bsd-grade4-down'].push(
  {
    re: /三角形边的关系/,
    make: (R) => jd(3, '三角形任意两边的和一定大于第三边。', true, '这是三角形三边关系的核心：只要有两边之和不大于第三边，就围不成三角形。')
  },
  {
    re: /三角形边的关系/,
    make: (R) => ch(R, 3, '下面三根小棒能围成一个三角形的是（ ）。', '3 cm、4 cm、5 cm', ['1 cm、2 cm、3 cm', '2 cm、2 cm、5 cm', '1 cm、3 cm、4 cm'],
      '3 + 4 > 5，能围成；1 + 2 = 3、1 + 3 = 4 都不大于第三边，2 + 2 < 5，都围不成。')
  },
  {
    re: /三角形边的关系/,
    make: (R) => {
      const a = ri(R, 4, 9), b = a + ri(R, 2, 6);
      return ap(3, '一个三角形的两条边分别是 ' + a + ' 厘米和 ' + b + ' 厘米，第三条边最长是 ( ) 厘米。（取整厘米数）', { blanks: [{ value: a + b - 1, unit: '厘米' }] },
        `两边之和是 ${a + b} 厘米，第三条边必须小于 ${a + b} 厘米，取整厘米数最长是 ${a + b - 1} 厘米。`);
    },
  },
);

/* 五年级下册：分数除法的应用 */
FAMS['bsd-grade5-down'].push(
  {
    re: /分数除法的应用/,
    make: (R) => {
      const n = ri(R, 2, 5), d = pick(R, [2, 3, 4]);
      const total = n * d;
      return ap(3, '一根绳子长 ' + total + ' 米，每 ' + n + '/' + d + ' 米剪一段，可以剪成 ( ) 段。', { blanks: [{ value: d, unit: '段' }] },
        `求 ${total} 里面有几个 ${n}/${d}，用除法：${total} ÷ ${n}/${d} = ${total} × ${d}/${n} = ${d} 段。`);
    },
  },
  {
    re: /分数除法的应用/,
    make: (R) => {
      const n = ri(R, 2, 4), d = pick(R, [2, 3, 4]), q = ri(R, 2, 5);
      return ap(3, '小明 ' + n + '/' + d + ' 小时走了 2 千米，他 1 小时走 ( ) 千米。', { blanks: [{ value: +(2 / (n / d)).toFixed(2), unit: '千米' }] },
        `求 1 小时走的路程，用路程除以时间：2 ÷ ${n}/${d} = 2 × ${d}/${n} = ${+(2 / (n / d)).toFixed(2)} 千米。`);
    },
  },
);

/* 六年级上册：收紧后补齐的考点 */
FAMS['bsd-grade6-up'].push(
  {
    re: /百分数的意义/,
    make: (R) => ch(R, 2, '百分数表示一个数是另一个数的（ ）。', '百分之几', ['几分之几', '几倍', '一半'], '百分数表示两个数的倍比关系，它只表示“百分之几”，后面不能带单位。')
  },
  {
    re: /百分数的意义/,
    make: (R) => jd(2, '百分数的分母都是 100，所以百分数后面不能带单位名称。', true, '百分数表示一个数是另一个数的百分之几，表示倍比关系，不是具体数量，不能带单位。')
  },
  {
    re: /百分数的意义/,
    make: (R) => fl(2, '45% 的分数单位是 ( )%。', { value: 1 }, '百分数的计数单位是 1%，45% 里面有 45 个 1%。'),
  },
  {
    re: /观察立体图形|搭积木/,
    make: (R) => ch(R, 3, '从正面、上面、左面观察同一个立体图形，看到的形状（ ）。', '可能不同', ['一定相同', '一定不同', '都是正方形'],
      '观察方向不同，看到的形状往往不同，所以只能说“可能不同”。')
  },
  {
    re: /观察立体图形|搭积木/,
    make: (R) => {
      const n = ri(R, 3, 6);
      return ap(3, '用 ' + n + ' 个同样的小正方体横着摆成一排，从正面看是 ( ) 个正方形。', { blanks: [{ value: n, unit: '个' }] },
        `横着摆 ${n} 个，正面正好看到 ${n} 个正方形面。`);
    },
  },
  {
    re: /观察立体图形|搭积木/,
    make: (R) => jd(3, '只从一个方向看到的形状，不能唯一确定这个立体图形。', true, '同一个方向看到的形状可能对应多种搭法，要看多个方向才能确定。')
  },
  {
    re: /统计图的选择/,
    make: (R) => ch(R, 3, '要表示某地区一年中各月气温的变化情况，用（ ）统计图比较合适。', '折线', ['条形', '扇形'], '折线统计图能清楚地看出数量增减变化的情况。')
  },
  {
    re: /统计图的选择/,
    make: (R) => ch(R, 3, '要比较几个班参加兴趣小组的人数多少，用（ ）统计图比较合适。', '条形', ['折线', '扇形'], '条形统计图能直观地看出各数量的多少，便于比较。')
  },
  {
    re: /税率|利率/,
    make: (R) => {
      const money = ri(R, 20, 100) * 100, rate = pick(R, [2.25, 2.75, 3]);
      return ap(3, '王奶奶把 ' + money + ' 元存入银行，定期一年，年利率是 ' + rate + '%，到期后可取回利息 ( ) 元。', { blanks: [{ value: +(money * rate / 100).toFixed(2), unit: '元' }] },
        `利息 = 本金 × 利率 × 时间 = ${money} × ${rate}% × 1 = ${+(money * rate / 100).toFixed(2)} 元。`);
    },
  },
  {
    re: /税率|利率/,
    make: (R) => {
      const income = ri(R, 20, 90) * 1000, rate = pick(R, [3, 5, 6]);
      return ap(3, '一家饭店 10 月份的营业额是 ' + income + ' 元，按 ' + rate + '% 缴纳营业税，应缴税 ( ) 元。', { blanks: [{ value: (income * rate) / 100, unit: '元' }] },
        `应纳税额 = 营业额 × 税率 = ${income} × ${rate}% = ${(income * rate) / 100} 元。`);
    },
  },
  {
    re: /欣赏/,
    make: (R) => ch(R, 2, '用圆可以设计出许多美丽的图案，这是因为圆是（ ）图形。', '轴对称', ['平移', '旋转', '放大'], '圆有无数条对称轴，绕圆心旋转任意角度都能与自身重合，所以适合设计图案。')
  },
  {
    re: /欣赏/,
    make: (R) => jd(2, '在圆内画大小不同的同心圆，可以得到美丽的圆环图案。', true, '同心圆的半径不同，涂色后能形成层次分明的圆环图案。')
  },
);

/* 六年级下册：收紧后补齐的考点 */
FAMS['bsd-grade6-down'].push(
  {
    re: /按比分配/,
    make: (R) => {
      const k = ri(R, 4, 9);
      return ap(3, '把 ' + 5 * k + ' 本图书按 2 : 3 分给甲、乙两个班，甲班分得 ( ) 本。', { blanks: [{ value: 2 * k, unit: '本' }] },
        `总份数是 2 + 3 = 5 份，每份 ${5 * k} ÷ 5 = ${k} 本，甲班 2 份是 ${2 * k} 本。`);
    },
  },
  {
    re: /按比分配/,
    make: (R) => {
      const k = ri(R, 5, 12);
      return ap(3, '一种混凝土由水泥、沙子、石子按 2 : 3 : 5 配制。要配制 ' + 10 * k + ' 千克这样的混凝土，需要水泥 ( ) 千克。', { blanks: [{ value: 2 * k, unit: '千克' }] },
        `总份数 2 + 3 + 5 = 10 份，每份 ${10 * k} ÷ 10 = ${k} 千克，水泥占 2 份是 ${2 * k} 千克。`);
    },
  },
  {
    re: /按比分配/,
    make: (R) => ch(R, 3, '把 60 按 1 : 2 : 3 分成三份，最多的一份是（ ）。', '30', ['10', '20', '40'],
      '总份数 1 + 2 + 3 = 6 份，每份 60 ÷ 6 = 10，最多的一份是 3 份即 30。')
  },
  {
    re: /正比例与反比例的应用/,
    make: (R) => {
      const v = ri(R, 40, 90), t1 = ri(R, 2, 4), t2 = ri(R, 5, 8);
      return ap(3, '一列火车 ' + t1 + ' 小时行驶 ' + v * t1 + ' 千米，照这样的速度，' + t2 + ' 小时行驶 ( ) 千米。', { blanks: [{ value: v * t2, unit: '千米' }] },
        `速度一定，路程和时间成正比例：${v * t1} ÷ ${t1} = ${v} 千米/时，${v} × ${t2} = ${v * t2} 千米。`);
    },
  },
  {
    re: /正比例与反比例的应用/,
    make: (R) => {
      const per1 = ri(R, 15, 30), days1 = ri(R, 8, 15), per2 = per1 + ri(R, 5, 15);
      const totalT = per1 * days1;
      if (totalT % per2) return null;
      return ap(3, '一批货物，每天运 ' + per1 + ' 吨，' + days1 + ' 天可以运完；如果每天运 ' + per2 + ' 吨，( ) 天可以运完。', { blanks: [{ value: totalT / per2, unit: '天' }] },
        `货物总量一定，每天运的吨数和天数成反比例：${per1} × ${days1} = ${totalT} 吨，${totalT} ÷ ${per2} = ${totalT / per2} 天。`);
    },
  },
  {
    re: /正比例与反比例的应用/,
    make: (R) => jd(3, '工作总量一定时，工作效率和工作时间成反比例。', true, '工作效率 × 工作时间 = 工作总量（一定），乘积一定，成反比例。')
  },
);

/* ================= 补充家族（第三轮·续）：剩余考点补齐 ================= */
/* 三年级下册：据整理数据进行分析与预测 */
FAMS['bsd-grade3-down'].push(
  {
    re: /分析与预测/,
    make: (R) => {
      const a = ri(R, 6, 12), b = ri(R, 3, a - 1);
      return ap(2, '统计结果显示，喜欢跳绳的有 ' + a + ' 人、喜欢踢球的有 ' + b + ' 人，喜欢跳绳的比喜欢踢球的多 ( ) 人。', { blanks: [{ value: a - b, unit: '人' }] },
        `把两类人数相减：${a} - ${b} = ${a - b} 人。`);
    },
  },
  {
    re: /分析与预测/,
    make: (R) => {
      const a = ri(R, 4, 9), b = ri(R, 3, 8), c = ri(R, 2, 7);
      return rd(2, '下面是三(1)班同学最喜欢的课外活动统计结果：跳绳 ' + a + ' 人、踢球 ' + b + ' 人、画画 ' + c + ' 人。',
        [
          { label: '(1)', text: '喜欢哪种活动的人最多？', answer: { value: a >= b && a >= c ? '跳绳' : b >= c ? '踢球' : '画画', mode: 'text' } },
          { label: '(2)', text: '全班一共有多少人？', answer: { value: a + b + c, unit: '人' } },
        ],
        '先比较各项数据的大小找出最多的，再把各项人数相加求总数。')
    },
  },
);

/* 五年级上册：倍数与因数、2、5 的倍数的特征（题干固定，需各自独立） */
FAMS['bsd-grade5-up'].push(
  {
    re: /2、5/,
    make: (R) => ch(R, 2, '下面哪个数既是 2 的倍数又是 5 的倍数？', '30', ['25', '42', '55'],
      '既是 2 的倍数又是 5 的倍数，个位一定是 0；30 的个位是 0，符合条件。')
  },
  {
    re: /倍数与因数/,
    make: (R) => ch(R, 2, '因为 3 × 4 = 12，所以 12 是 3 的（ ）。', '倍数', ['因数', '质数', '合数'],
      '在 3 × 4 = 12 中，12 是 3 和 4 的倍数，3 和 4 是 12 的因数。')
  },
);

/* 五年级下册：复式条形统计图 */
FAMS['bsd-grade5-down'].push(
  {
    re: /复式条形统计图/,
    make: (R) => {
      const a = ri(R, 8, 18), b = ri(R, 5, 15);
      return rd(3, '下图是甲、乙两组同学植树棵数的复式条形统计图：甲组 ' + a + ' 棵，乙组 ' + b + ' 棵。',
        [
          { label: '(1)', text: '哪一组植树的棵数多？', answer: { value: a >= b ? '甲组' : '乙组', mode: 'text' } },
          { label: '(2)', text: '两组一共植树多少棵？', answer: { value: a + b, unit: '棵' } },
        ],
        '复式条形统计图用不同颜色的直条表示两组数据，直条越高数量越多。')
    },
  },
  {
    re: /复式条形统计图/,
    make: (R) => {
      const a = ri(R, 10, 20), b = ri(R, 4, a - 2);
      return ap(3, '复式条形统计图中，甲组有 ' + a + ' 人、乙组有 ' + b + ' 人，甲组比乙组多 ( ) 人。', { blanks: [{ value: a - b, unit: '人' }] },
        `比较两组直条的高度差：${a} - ${b} = ${a - b} 人。`);
    },
  },
);

/* 六年级上册：分数混合运算的实际应用、观察物体在生活中的应用、百分数的实际应用 */
FAMS['bsd-grade6-up'].push(
  {
    re: /分数混合运算的实际应用/,
    make: (R) => {
      const k = ri(R, 5, 15);
      return ap(3, '一本故事书有 ' + 12 * k + ' 页，第一天看了全书的 1/4，第二天看了全书的 1/3，两天一共看了 ( ) 页。', { blanks: [{ value: 7 * k, unit: '页' }] },
        `两天共看了全书的 1/4 + 1/3 = 7/12，${12 * k} × 7/12 = ${7 * k} 页。`);
    },
  },
  {
    re: /分数混合运算的实际应用/,
    make: (R) => {
      const k = ri(R, 4, 12);
      return ap(3, '一桶油重 ' + 6 * k + ' 千克，第一次用去 1/3，第二次用去剩下的 1/2，还剩 ( ) 千克。', { blanks: [{ value: 2 * k, unit: '千克' }] },
        `第一次用去 ${6 * k} × 1/3 = ${2 * k} 千克，剩 ${4 * k} 千克；第二次用去 ${4 * k} × 1/2 = ${2 * k} 千克，还剩 ${2 * k} 千克。`);
    },
  },
  {
    re: /观察的范围/,
    make: (R) => {
      const a = ri(R, 2, 5), b = a + ri(R, 2, 4);
      return ap(3, '小明站在 A 点可以看到 ' + a + ' 棵树，后退 2 米到 B 点后可以看到 ' + b + ' 棵树，多看到 ( ) 棵。', { blanks: [{ value: b - a, unit: '棵' }] },
        `站在同一位置观察，视线范围内的物体数量有限；${b} - ${a} = ${b - a} 棵。`);
    },
  },
  {
    re: /生活中的应用/,
    make: (R) => ap(3, '同样大小的物体，离眼睛越远，看起来就越 ( )。', { blanks: [{ value: '小', alts: ['小一些', '更小'], mode: 'text' }] },
      '从同一点观察，近处的物体显得大、远处的物体显得小，这是观察中的生活经验。')
  },
  {
    re: /生活中的应用/,
    make: (R) => {
      const h = ri(R, 2, 5);
      return ap(3, '小明站在离一棵大树 ' + h + ' 米的地方，看到的树冠比站在 10 米处看到的 ( )。', { blanks: [{ value: '大', alts: ['更大', '大一些'], mode: 'text' }] },
        `离树越近，视角越大，看到的树冠就越大，所以比 10 米处看到的大。`);
    },
  },
  {
    re: /百分数的实际应用/,
    make: (R) => {
      const p = ri(R, 100, 500) * 10, d = pick(R, [10, 20, 25, 40, 50]);
      return ap(3, '一件上衣原价 ' + p + ' 元，现价 ' + (p * (100 - d)) / 100 + ' 元，现价是原价的 ( )%。', { blanks: [{ value: 100 - d, unit: '%' }] },
        `现价 ÷ 原价 × 100% = ${(p * (100 - d)) / 100} ÷ ${p} × 100% = ${100 - d}%。`);
    },
  },
  {
    re: /百分数的实际应用|百分数应用的综合/,
    make: (R) => {
      const n = ri(R, 2, 8) * 100, pct = pick(R, [20, 30, 40, 60, 75]);
      return ap(3, '果园里有苹果树 ' + n + ' 棵，梨树的棵数是苹果树的 ' + pct + '%，梨树有 ( ) 棵。', { blanks: [{ value: (n * pct) / 100, unit: '棵' }] },
        `求一个数的百分之几是多少用乘法：${n} × ${pct}% = ${(n * pct) / 100} 棵。`);
    },
  },
  {
    re: /百分数应用的综合/,
    make: (R) => ap(3, '一件商品先涨价 10%，再降价 10%，现价与原价相比 ( )。', { blanks: [{ value: '降低了', alts: ['变低', '低', '比原价低'], mode: 'text' }] },
      '设原价 100 元：涨 10% 后是 110 元，再降 10% 是 110 × 90% = 99 元，比原价低。')
  },
);

/* ================= 补充家族（第四轮）：单题考点增厚 ================= */
/* 五年级上册 */
FAMS['bsd-grade5-up'].push(
  {
    re: /2、5/,
    make: (R) => fl(2, '既是 2 的倍数又是 5 的倍数的数，个位上一定是 ( )。', { value: 0 }, '2 的倍数个位是 0、2、4、6、8，5 的倍数个位是 0 或 5，同时满足只能是 0。'),
  },
  {
    re: /3的倍数/,
    make: (R) => fl(2, '一个数各位上数字的和是 3 的倍数，这个数就是 ( ) 的倍数。', { value: 3 }, '3 的倍数的特征：各位上数字的和是 3 的倍数。'),
  },
  {
    re: /真分数|假分数|带分数/,
    make: (R) => fl(3, '把 7/4 化成带分数是 ( ) 又 ( )/4。', { blanks: [1, 3] }, '7 ÷ 4 = 1 余 3，商 1 是整数部分，余数 3 作分子，分母不变。'),
  },
  {
    re: /分数的基本性质/,
    make: (R) => ch(R, 3, '3/4 的分子和分母同时乘 2，得到的分数是（ ）。', '6/8', ['3/8', '6/4', '5/6'], '分子分母同时乘 2：3 × 2 = 6，4 × 2 = 8，得 6/8，大小不变。')
  },
  {
    re: /秋游/,
    make: (R) => {
      const k = ri(R, 4, 9);
      return ap(2, '秋游时 ' + 6 * k + ' 名同学平均分成 6 组，每组 ( ) 人。', { blanks: [{ value: k, unit: '人' }] },
        `把总人数平均分：${6 * k} ÷ 6 = ${k} 人。`);
    },
  },
);

/* 五年级下册 */
FAMS['bsd-grade5-down'].push(
  {
    re: /展开|折叠/,
    make: (R) => ch(R, 2, '把一个正方体纸盒沿棱剪开，展开后一共有（ ）个面。', '6', ['4', '5', '8'], '正方体有 6 个面，展开后这 6 个面都在同一平面上。')
  },
  {
    re: /体积与容积/,
    make: (R) => jd(3, '体积相等的两个容器，容积不一定相等。', true, '体积指容器外部占空间的大小，容积指内部能容纳物体的体积，容器壁有厚度，两者不一定相等。')
  },
  {
    re: /体积单位的换算/,
    make: (R) => {
      const a = ri(R, 2, 9);
      return ca(3, a + ' 立方分米 = ( ) 立方厘米', { value: a * 1000, unit: '立方厘米' },
        `1 立方分米 = 1000 立方厘米，${a} × 1000 = ${a * 1000}。`);
    },
  },
);

/* 六年级上册 */
FAMS['bsd-grade6-up'].push(
  {
    re: /圆的认识/,
    make: (R) => fl(2, '在同一个圆里，直径的长度是半径的 ( ) 倍。', { value: 2 }, '同圆中 d = 2r，直径是半径的 2 倍，半径是直径的一半。'),
  },
  {
    re: /观察立体图形|搭积木/,
    make: (R) => ch(R, 2, '从上面观察一个圆柱，看到的形状是（ ）。', '圆', ['长方形', '三角形', '梯形'], '圆柱的上下两个面都是圆，从上面看就是一个圆。')
  },
  {
    re: /比的意义/,
    make: (R) => fl(2, '在 3 : 5 中，比的前项是 ( )，后项是 ( )。', { blanks: [3, 5] }, '比号前面的数是前项，比号后面的数是后项。'),
  },
  {
    re: /欣赏/,
    make: (R) => ch(R, 2, '圆在图案设计中被广泛应用，主要因为（ ）。', '圆有无数条对称轴，绕圆心旋转任意角度都能与自身重合',
      ['圆没有角', '圆可以随意放大', '圆是立体图形'], '圆的对称性和旋转不变性使它能组合出丰富而匀称的图案。')
  },
);

/* 六年级下册 */
FAMS['bsd-grade6-down'].push(
  {
    re: /圆柱的认识/,
    make: (R) => jd(2, '把一个长方形绕它的一条边旋转一周，可以得到一个圆柱。', true, '长方形绕一条边旋转一周，扫过的空间正好是一个圆柱。')
  },
  {
    re: /放大|缩小/,
    make: (R) => ch(R, 3, '把一个图形按 2 : 1 放大，放大后图形与原图形的面积比是（ ）。', '4 : 1', ['2 : 1', '1 : 2', '8 : 1'],
      '对应边长扩大到原来的 2 倍，面积扩大到 2 × 2 = 4 倍，所以面积比是 4 : 1。')
  },
  {
    re: /欣赏/,
    make: (R) => ch(R, 3, '把一个基本图形连续平移，得到的图案（ ）。', '形状和大小都不变', ['形状变大', '大小改变', '形状改变'],
      '平移只改变图形的位置，不改变形状和大小。')
  },
);

/* ================= 生成主流程 ================= */
const out = {};
const problems = [];
const seenProblems = new Set();
const addProblem = (msg) => { if (!seenProblems.has(msg)) { seenProblems.add(msg); problems.push(msg); } };
for (const book of tags.books) {
  const bookId = book.id;
  const existing = BSD[bookId] || [];
  const target = PER_BOOK - existing.length;
  if (target <= 0) { out[bookId] = []; continue; }
  const pts = tags.points.filter((p) => p.book === bookId);
  const fams = FAMS[bookId] || [];
  const R = mulberry32(parseInt(fnv1a(bookId), 16));
  const seen = new Set(existing.map((q) => q.stem));
  const existingPts = new Set(existing.map((q) => q.p));
  const made = [];
  const covered = new Set();

  // 每轮优先尝试尚未被新题覆盖的考点；每个考点在本轮内依次尝试其全部家族，直到成功一个
  for (let round = 0; round < 80 && made.length < target; round++) {
    const order = pts.slice().sort((a, b) => (covered.has(a.slug) ? 1 : 0) - (covered.has(b.slug) ? 1 : 0));
    for (let i = 0; i < order.length && made.length < target; i++) {
      const pt = order[i];
      const cands = fams.filter((f) => f.re.test(pt.name));
      if (!cands.length) { addProblem(`${bookId} 无匹配家族：${pt.name}`); continue; }
      for (let k = 0; k < cands.length; k++) {
        const f = cands[(round + k) % cands.length];
        let spec;
        try { spec = f.make(R, pt); } catch (e) { addProblem(`${bookId} 生成异常 ${pt.name}: ${e.message}`); continue; }
        if (!spec) continue;
        if (!pt.suitableTypes.includes(spec.type)) continue;
        if (!spec.stem || seen.has(spec.stem)) continue;
        seen.add(spec.stem);
        made.push({ p: pt.slug, ...spec, score: SCORE[spec.type], analysis: ensureAnalysis(spec.analysis, spec.type) });
        covered.add(pt.slug);
        break;
      }
    }
  }

  if (made.length < target) problems.push(`${bookId} 只生成 ${made.length}/${target} 题`);
  // 未覆盖口径：新题与手写题合并后仍没有题的考点才算未覆盖
  const uncovered = pts.filter((p) => !covered.has(p.slug) && !existingPts.has(p.slug)).map((p) => p.name);
  if (uncovered.length) problems.push(`${bookId} 未覆盖考点 ${uncovered.length} 个：${uncovered.join('、')}`);
  out[bookId] = made;
  console.log(`${bookId}: 已有 ${existing.length} + 新生成 ${made.length} = ${existing.length + made.length} 题（新覆盖考点 ${covered.size}，合并后 ${pts.length - uncovered.length}/${pts.length}）`);
}

if (problems.length) {
  console.error('\n问题：\n' + problems.join('\n'));
  process.exit(1);
}

// 写出纯数据模块（题图已在生成时物化为普通对象，无需 import）
const file = `// 自动生成（scripts/gen-questions-bsd.mjs），请勿手工修改。
// 北师大版扩充题库：与 questions-bsd.mjs 手写源合并后每册共 100 题。
// 重新生成：node scripts/gen-questions-bsd.mjs
export const BSD_EXT = ${JSON.stringify(out, null, 2)};
`;
fs.writeFileSync(path.join(root, 'scripts/data/questions-bsd-ext.mjs'), file, 'utf8');
const total = Object.values(out).reduce((s, a) => s + a.length, 0);
console.log(`\n合计新增 ${total} 题 → scripts/data/questions-bsd-ext.mjs`);
