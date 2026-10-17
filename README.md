# 小学数学在线考试平台

纯前端、无数据库、无后端的小学数学在线考试系统。**双击 `index.html` 即可运行**。

- 技术栈：HTML + CSS + 原生 JavaScript + JSON 数据 + localStorage
- 公式渲染：KaTeX（本地 vendor，离线可用）
- 图表：ECharts（本地 vendor，离线可用）
- 图形题：内联 SVG / Canvas 手绘
- 标签体系：12 册 → 4 知识领域 → 100 个二级知识点 → **378 个三级考点**
- 题型：8 大题型 + 1 个扩展题型（交互图形题）
- 题库：12 个分册文件，共 **153 道**示例题

---

## 一、快速开始

### 方式 A：双击运行（推荐，零依赖）

直接双击项目根目录下的 `index.html`，用 Chrome / Edge 打开即可。

- 页面使用**传统 `<script>` 标签**（非 ES Module），规避 `file://` 的跨域限制；
- 数据加载器 `js/core/loader.js` 会优先 `fetch` 原始 JSON，失败时自动回退到同目录的 `.js` 兜底文件（`data/tags.js`、`data/questions/*.js`），因此在 `file://` 下同样可以读取完整题库；
- 实测 Chrome 在 `file://` 下 `localStorage` 可正常读写并跨页面保持，所以**断点续考**在双击模式下也可用。

### 方式 B：本地服务器（可选）

```bash
node scripts/serve.mjs        # 默认 http://127.0.0.1:5180
```

用于需要在局域网 / 手机上预览，或希望走标准 HTTP 的场景。

---

## 二、目录结构

```
math-exam-platform/
├─ index.html                 首页：导航 / 快速入口 / 最近记录 / 学习统计
├─ paper-builder.html         组卷中心：标签树 / 组卷配置 / 试卷预览
├─ exam.html                  考试页：计时 / 答题 / 答题卡 / 交卷 / 断点续考
├─ report.html                成绩报告：总分 / 雷达图 / 柱状图 / 错题 / 趋势
├─ wrongbook.html             错题本：分组 / 重练 / 移除 / 筛选
├─ css/
│  ├─ base.css                设计变量、重置、排版、大字版
│  ├─ layout.css              容器 / 顶栏 / 页头 / 栅格 / 页脚 / 响应式
│  ├─ components.css          卡片 / 按钮 / 表单 / 表格 / 标签树 / 题目卡片 / 弹层
│  └─ print.css               打印样式（试卷、报告可另存为 PDF）
├─ data/
│  ├─ tags.json               ★ 四级标签体系（378 个三级考点）
│  ├─ tags.js                 tags.json 的 file:// 兜底副本（自动生成）
│  └─ questions/
│     ├─ grade1-up.json  … grade6-down.json    ★ 12 册题库（每册 ≥10 题）
│     └─ grade1-up.js    … grade6-down.js      file:// 兜底副本（自动生成）
├─ js/
│  ├─ core/                   业务内核（与 UI 解耦）
│  │  ├─ loader.js            数据加载：fetch → .js 兜底 → 二次 fetch
│  │  ├─ storage.js           本地存储层（可替换 driver）
│  │  ├─ tags.js              四级标签树的查询 / 过滤 / 搜索
│  │  ├─ bank.js              题库懒加载 + 运行时题目注册
│  │  ├─ grader.js            答案归一化 + 数值容差 / 单位容错 / 分数等价 + 阅卷引擎
│  │  ├─ plugins.js           题型插件注册表（9 种题型）
│  │  ├─ builder.js           组卷引擎（四种模式 + 可复现随机种子）
│  │  ├─ media.js             媒体渲染（svg / 交互 svg / image / audio / table）
│  │  └─ ai.js                AI 出题 / 讲题预留接口（含本地模板兜底）
│  ├─ ui/
│  │  ├─ math.js              KaTeX 封装（$…$、$$…$$、\(…\)、\[…\]）
│  │  ├─ toast.js             轻提示 / 确认框
│  │  ├─ charts.js            ECharts 封装（雷达 / 柱状 / 折线 / 环形 + 降级表格）
│  │  ├─ render.js            题目视图：题干、题图、答题区、判分样式、作图板
│  │  └─ shell.js             全站外壳：导航、设置抽屉、备份导入导出
│  └─ pages/                  5 个页面的页面逻辑
├─ scripts/                   构建与自检脚本（Node，仅开发期使用）
│  ├─ data/curriculum.mjs     课程知识体系源数据
│  ├─ data/svg.mjs            SVG 题图生成器
│  ├─ data/questions-*.mjs    分学段题库源数据
│  ├─ build-tags.mjs          生成 data/tags.json + tags.js
│  ├─ build-questions.mjs     生成 12 册题库 JSON + JS
│  ├─ fetch-fonts.mjs         下载 KaTeX 字体到 vendor
│  ├─ verify-assets.mjs       静态资源引用校验
│  ├─ selftest.mjs            端到端自检（数据 / 阅卷 / 组卷 / 存储 / 扩展）
│  └─ serve.mjs               可选本地服务器
└─ vendor/                    KaTeX 与 ECharts 本地副本（离线可用）
```

---

## 三、标签体系

四级结构：**年级（12 册）→ 知识领域（4）→ 二级知识点（100）→ 三级考点（378）**。

| 层级 | 数量 | 说明 |
| --- | --- | --- |
| 年级 | 12 | 一上 / 一下 / 二上 … 六下 |
| 知识领域 | 4 | 数与代数（248）、图形与几何（69）、统计与概率（20）、综合与实践（41） |
| 二级知识点 | 100 | 教材单元级，如「小数乘法」「长方体和正方体」 |
| 三级考点 | 378 | 微知识点，每册 23–38 个 |

每个三级考点的字段：

```json
{
  "id": "g5d-NA-03-02",
  "name": "异分母分数加减法",
  "type": "PROCEDURAL",
  "suitableTypes": ["calculation", "fill"],
  "difficultyRange": [3, 3],
  "extend": {
    "bloom": "应用与运算",
    "keywords": ["异分母", "分数加减法"],
    "weight": 3,
    "core": true,
    "termId": "grade5-down",
    "index": 213
  }
}
```

- `type`：`CONCEPTUAL` 概念性 / `PROCEDURAL` 程序性 / `REPRESENTATIONAL` 表征性
- `suitableTypes`：该考点适合的题型数组（组卷时会按此命中）
- `difficultyRange`：难度区间 `[min, max]`，取值 1–3
- `extend`：扩展字段（认知层级、关键词、权重、是否核心考点等，可自由追加）

考点 id 规则：`{册代号}-{领域}-{二级序号}-{三级序号}`，例如 `g4u-GG-05-03`。

---

## 四、题库

按册存储于 `data/questions/gradeN-up|down.json`。每道题：

| 字段 | 说明 |
| --- | --- |
| `id` | 题目主键，如 `g3u-Q005` |
| `grade` / `book` / `bookName` | 年级、册次 |
| `domain` / `domainName` | 知识领域 |
| `knowledge` / `knowledgeName` | 二级知识点 |
| `point` / `pointName` | 三级考点 |
| `topics` | 关联考点数组 |
| `type` | 题型 |
| `difficulty` | 难度 1–3 |
| `score` | 分值 |
| `stem` | 题干（支持 `$LaTeX$`） |
| `answer` | 答案对象（结构随题型变化，见下） |
| `options` | 选项数组（选择题） |
| `analysis` | 解析 |
| `tags` | 冗余标签数组（册 / 领域 / 知识点 / 考点） |
| `media` | 题图：`{ type: 'none'\|'svg'\|'svg-interactive'\|'image'\|'audio'\|'table', … }` |
| `extend` | 扩展字段（来源、是否自动阅卷、容差等） |

**12 册题量与题型分布（共 153 题）**

| 册 | 题量 | 册 | 题量 |
| --- | --- | --- | --- |
| 一上 | 12 | 四下 | 12 |
| 一下 | 11 | 五上 | 14 |
| 二上 | 12 | 五下 | 13 |
| 二下 | 12 | 六上 | 14 |
| 三上 | 12 | 六下 | 16 |
| 三下 | 12 | 四上 | 13 |

---

## 五、题型与自动阅卷（8 种内置 + 1 种扩展）

| 题型 | `type` | 作答形式 | 判定规则 |
| --- | --- | --- | --- |
| 选择题 | `choice` | 单选 / 多选 | 选项下标数组比对（顺序无关） |
| 填空题 | `fill` | 多空文本框 | 字符串匹配 + 多空独立判定 + 数值容差 + 单位容错 |
| 判断题 | `judge` | √ / × | 布尔比对 |
| 计算题 | `calculation` | 文本框 | 数值容差 + 分数等价（`5/7` = `10/14` = `0.714…`） |
| 应用题 | `application` | 多空文本框 | 多答案 / 多问分步给分 + 单位容错 |
| 阅读理解题 | `reading` | 子问题逐个作答 | 子问题逐个比对，按空计分 |
| 图形题 | `figure` | 文本框 | 图形测量 / 计算结果数值比对 |
| 作图题 | `draw` | Canvas 手绘 + 说明 | **人工阅卷**（展示评分要点） |
| （扩展）交互图形题 | `figure-interactive` | 点击图形区域 | 区域 id 数组比对，部分命中给部分分 |

**答案对象结构示例**

```jsonc
// 选择题
{ "index": [1] }                       // 或多选 { "index": [0, 2] }
// 判断题
{ "value": true }
// 填空题（多空，可带单位、别名、容差、集合/比例模式）
{ "blanks": [
    "2",
    { "value": "3×4", "alts": ["4×3"] },
    { "value": 18.84, "tolerance": 0.05, "unit": "厘米" },
    { "value": "2,11", "mode": "set" },      // 多答案集合比对
    { "value": "1:2",  "mode": "ratio" }     // 比例等价比对
] }
// 计算 / 应用 / 图形题
{ "value": 144, "unit": "元" }
{ "blanks": [{ "value": 7, "unit": "袋" }, { "value": 3, "unit": "个" }] }
// 阅读理解题
{ "subs": [ { "label": "(1)", "answer": { "value": 40, "unit": "平方厘米" } },
            { "label": "(2)", "answer": { "blanks": [12, 52] } } ] }
// 交互图形题
{ "regions": ["c1", "c2"] }
// 作图题
{ "manual": true, "rubric": "圆是曲线围成的封闭图形；正方形四边相等、四角都是直角。" }
```

**容错能力**（`js/core/grader.js`）

- 全角 / 半角、中英文标点、空白字符自动归一化（`６２０` → `620`）
- 单位容错：答案为 `13` 时，`13只`、`13 只` 均判对
- 百分号容错：`96%` ≈ `96`
- 分数等价：`3/4` = `0.75` = `6/8`
- 多答案集合比对：`2,11` = `11,2`
- 比例等价：`1:2` = `2:4` = `0.5:1`
- 数值容差：`{ value: 18.84, tolerance: 0.05 }`
- 别名答案：`{ value: "六十五", alts: ["65"] }`

---

## 六、组卷

支持四种模式：

| 模式 | `mode` | 适用场景 | 校验 |
| --- | --- | --- | --- |
| 单考点组题 | `single` | 一个三级考点集中突破 | 需且仅需选 1 个考点 |
| 多考点组题 | `multi` | 若干考点取并集 | ≥2 个考点 |
| 跨年级组题 | `cross` | 期末 / 总复习 | ≥2 个册次 |
| 题型优先组题 | `type` | 按题型比例出题 | ≥1 种题型 |

**标签组合逻辑**

```
年级 AND 领域 AND (考点A OR 考点B OR …) AND 题型匹配 AND 难度匹配
```

组卷参数：年级（多选）、领域、考点、题型比例、难度分布与权重、总分、题量、是否打乱题目 / 选项。
分值按难度权重自动配平，总分精确对齐；抽题使用可复现随机种子（`config.seed`），同一 seed 结果一致。

---

## 七、本地存储

| 键名 | 内容 |
| --- | --- |
| `math_exam_records` | 考试记录（含作答、逐题判分结果） |
| `math_exam_wrong` | 错题本（含错误次数、掌握状态） |
| `math_exam_progress_{examId}` | 答题进度（断点续考） |
| `math_exam_settings` | 用户设置 |
| `math_exam_history` | 历史成绩（趋势图数据源） |
| `math_exam_papers` | 保存的试卷 |
| `math_exam_current_paper` | 当前待考试卷 |

设置抽屉内提供 **导出备份 / 导入备份 / 清空全部数据**，方便迁移与清理。

---

## 八、UI 说明

- 主色调清新蓝（`--blue-500 #3b82f6`），卡片式布局，圆角 16–28px
- 响应式：≥1080px 三栏、860px 以下单栏并折叠导航、520px 以下移动端优化
- **低年级大字版**：顶栏 `Aa` 按钮或设置抽屉开关，字号 15.5px → 18.5px
- **打印支持**：试卷、成绩报告均可 `Ctrl+P` 打印 / 另存为 PDF；打印时自动展开全部题目与解析、隐藏交互控件
- 无障碍：语义化标签、`aria-modal`、`prefers-reduced-motion` 降级

---

## 九、扩展能力

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 题型插件式注册 | `MX.Plugins.register(def)` | 实现 `specs / grade / answerText` 即可参与组卷、作答与阅卷 |
| 标签可追加 | `data/tags.json` + `scripts/data/curriculum.mjs` | 追加考点后重跑 `build-tags.mjs` |
| 题库可扩展 | `data/questions/*.json` | 或运行时 `MX.Bank.registerQuestion(q, bookId)` |
| 存储可替换 | `MX.Storage.useDriver({ get, set, remove, keys })` | 可换成 IndexedDB / 云存储 |
| 媒体可扩展 | `MX.Media.register(type, renderer)` | 内置 svg / 交互 svg / image / audio / table |
| AI 出题预留 | `MX.AI.setProvider({ generate, explain })` | 未配置时降级为本地模板出题，保证链路可用 |

**接入 AI 出题示例**

```js
MX.AI.setProvider({
  name: 'my-llm',
  async generate({ point, pointName, type, difficulty, count }) {
    const res = await fetch('https://your-api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ point, pointName, type, difficulty, count })
    });
    return await res.json();   // 返回字段与 data/questions/*.json 中的 question 一致
  },
  async explain(question, userAnswer) {
    return '逐步讲解文本，支持 $LaTeX$';
  }
});
const qs = await MX.AI.generate({ pointId: 'g4u-NA-01-01', type: 'choice', count: 3 });
```

---

## 十、开发与自检

```bash
# 重新生成标签体系（378 个考点）
node scripts/build-tags.mjs

# 重新生成 12 册题库
node scripts/build-questions.mjs

# 校验静态资源引用完整性（含 KaTeX 字体）
node scripts/verify-assets.mjs

# 端到端自检：数据完整性 + 阅卷 + 组卷 + 存储 + 扩展能力（248 项断言）
node scripts/selftest.mjs
```

`selftest.mjs` 在 Node 中用 `vm` 构造最小浏览器环境加载 `js/core` 全部模块，逐题用标准答案验证满分、用空作答验证不得分，并覆盖容差 / 分数 / 集合 / 比例 / 单位等边界用例。

---

## 十一、已知边界

- 题库为**教学示例**（每册 10–16 题，共 153 题），覆盖全部 8 种题型，用于演示完整链路；实际教学使用建议按同一 JSON 结构批量扩充。
- 知识点按**人教版**教材单元组织（12 册 = 1–6 年级上下册）；如使用其他版本教材，可改 `scripts/data/curriculum.mjs` 后重跑构建脚本。
- 作图题依赖 Canvas `toDataURL` 保存图片，题量大且都作图时 localStorage 可能吃紧，页面会给出「进度保存失败」提示。
- 公式渲染依赖 KaTeX 本地字体（`vendor/katex/fonts/`，20 个 woff2）；若字体缺失会退化为 MathML / 纯文本，不影响功能。
