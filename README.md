# 小学数学在线考试平台

纯前端、无数据库、无后端的小学数学在线考试系统。**双击 `index.html` 即可运行**。

- 技术栈：HTML + CSS + 原生 JavaScript + JSON 数据 + localStorage
- 公式渲染：KaTeX（本地 vendor，离线可用）
- 图表：ECharts（本地 vendor，离线可用）
- 图形题：内联 SVG / Canvas 手绘
- 教材版本：内置**北师大版（默认）/ 人教版**双版本，顶栏「教材版本」下拉即时切换
- 标签体系：人教版 12 册 → 4 知识领域 → 100 个二级知识点 → **378 个三级考点**；北师大版 12 册 → 91 个二级知识点 → **342 个三级考点**
- 题型：8 大题型 + 1 个扩展题型（交互图形题）
- 题库：人教版 12 册共 **153 道**示例题；北师大版 12 册共 **1200 道**（每册 100 题，342 个考点全覆盖）

---

## 一、快速开始

### 方式 A：双击运行（推荐，零依赖）

直接双击项目根目录下的 `index.html`，用 Chrome / Edge 打开即可。

- 页面使用**传统 `<script>` 标签**（非 ES Module），规避 `file://` 的跨域限制；
- 数据加载器 `js/core/loader.js` 四级加载：`fetch` → 预注入 `.js` 取值 → 动态注入同名 `.js` → 再 `fetch`。两套版本的 `.js` 兜底副本已随仓库提供（`data/tags.js`、`data/tags-bsd.js`、`data/questions/*.js`、`data/questions-bsd/*.js`，共 24 个），因此 `file://` 下同样可读取完整题库；
- 实测 Chrome 在 `file://` 下 `localStorage` 可正常读写并跨页面保持，所以**断点续考**在双击模式下也可用。

### 方式 B：本地服务器（可选）

```bash
node scripts/serve.mjs        # 默认 http://127.0.0.1:5180
```

用于需要在局域网 / 手机上预览，或希望走标准 HTTP 的场景。

> 打印页 `print.html` 独立自足（不加载题库与迁移脚本），任何静态方式打开均可。

---

## 二、目录结构

```
math-exam-platform/
├─ index.html                 首页：导航 / 快速入口 / 最近记录 / 学习统计
├─ paper-builder.html         组卷中心：三步向导（场景 → 范围 → 规格）→ 试卷预览
├─ exam.html                  考试页：计时 / 答题 / 答题卡 / 交卷 / 断点续考
├─ report.html                成绩报告：总分 / 雷达图 / 柱状图 / 错题 / 趋势 / 主观题人工评分
├─ wrongbook.html             错题本：分组 / 重练 / 移除 / 筛选
├─ print.html                 打印页：学生版 / 教师版 / 答案页（经 math_exam_print_job 传入试卷）
├─ css/
│  ├─ base.css                设计变量、重置、排版、大字版
│  ├─ layout.css              容器 / 顶栏 / 页头 / 栅格 / 页脚 / 响应式
│  ├─ components.css          卡片 / 按钮 / 表单 / 表格 / 标签树 / 题目卡片 / 弹层
│  └─ print.css               打印样式（print.html 用 media=all，其余页面 media=print）
├─ data/
│  ├─ tags.json               ★ 人教版标签体系（378 个三级考点）
│  ├─ tags.js                 tags.json 的 file:// 兜底副本（自动生成）
│  ├─ tags-bsd.json           ★ 北师大版标签体系（342 个三级考点，默认版本）
│  ├─ tags-bsd.js             tags-bsd.json 的 file:// 兜底副本（自动生成）
│  ├─ migrate-map.js          legacyId → slug 迁移映射（window.MX.MIGRATE_MAP）
│  ├─ questions/              人教版题库（12 册，153 题）
│  │  ├─ grade1-up.json  … grade6-down.json    ★ 12 册题库（每册 ≥10 题）
│  │  └─ grade1-up.js    … grade6-down.js      file:// 兜底副本（自动生成）
│  └─ questions-bsd/          北师大版题库（bsd-grade1-up.json … grade6-down.json，12 册）
│     ├─ bsd-grade1-up.json …                  ★ 12 册各 100 题，共 1200 题
│     └─ bsd-grade1-up.js   …                  file:// 兜底副本（自动生成）
├─ js/
│  ├─ core/                   业务内核（与 UI 解耦）
│  │  ├─ loader.js            数据加载 + 教材版本（fetch → .js 兜底 → 二次 fetch）
│  │  ├─ storage.js           本地存储层（可替换 driver，v2 信封 + 容量管理）
│  │  ├─ tags.js              四级标签树的查询 / 过滤 / 搜索
│  │  ├─ bank.js              题库懒加载 + 运行时题目注册
│  │  ├─ grader.js            答案归一化 + 数值容差 / 单位容错 / 分数等价 + 阅卷引擎
│  │  ├─ plugins.js           题型插件注册表（9 种题型）
│  │  ├─ builder.js           组卷引擎（四种模式 + 可复现随机种子）
│  │  ├─ media.js             媒体渲染（svg / 交互 svg / image / audio / table）
│  │  ├─ ai.js                AI 出题 / 讲题预留接口（含本地模板兜底）
│  │  └─ migrate.js           历史数据自动迁移（页面加载执行一次，幂等）
│  ├─ ui/
│  │  ├─ math.js              KaTeX 封装（$…$、$$…$$、\(…\)、\[…\]）
│  │  ├─ toast.js             轻提示 / 确认框
│  │  ├─ charts.js            ECharts 封装（雷达 / 柱状 / 折线 / 环形 + 降级表格）
│  │  ├─ render.js            题目视图：题干、题图、答题区、判分样式、作图板
│  │  ├─ paper-print.js       打印渲染（学生 / 教师 / 答案三模式）
│  │  └─ shell.js             全站外壳：导航、设置抽屉、备份导入导出
│  └─ pages/                  6 个页面的页面逻辑
├─ scripts/                   构建与自检脚本（Node，仅开发期使用）
│  ├─ data/curriculum.mjs     人教版课程知识体系源数据
│  ├─ data/curriculum-bsd.mjs 北师大版课程知识体系源数据
│  ├─ data/svg.mjs            SVG 题图生成器
│  ├─ data/questions-*.mjs    分学段题库源数据（人教版 / 北师大版）
│  ├─ gen-questions-bsd.mjs   北师大版扩充题库生成器（家族确定性生成 → data/questions-bsd-ext.mjs）
│  ├─ build-tags.mjs          生成标签体系（VERSION=rj|bsd → tags.json / tags-bsd.json + .js 兜底）
│  ├─ build-questions.mjs     生成题库 JSON + JS（VERSION=rj|bsd → questions/ / questions-bsd/）
│  ├─ audit-bank.mjs          题库体检：题量 / 考点覆盖 / 问题清单（VERSION 同构建）
│  ├─ fam-map.mjs             家族映射诊断：列出某册「家族正则 → 命中考点」，查错配与覆盖缺口
│  ├─ fetch-fonts.mjs         下载 KaTeX 字体到 vendor
│  ├─ migrate-ids.mjs         生成 legacyId→slug 迁移映射（data/migrate-map.js）
│  ├─ verify-assets.mjs       静态资源引用校验
│  ├─ verify-grader.mjs       阅卷验收：标准答案全量试阅 + 反向答案抽查（双版本）
│  ├─ verify-migration.mjs    历史数据迁移验收
│  ├─ verify-wizard.mjs       组卷向导沙箱端到端验收
│  ├─ selftest.mjs            端到端自检（数据 / 阅卷 / 组卷 / 存储 / 扩展）
│  └─ serve.mjs               可选本地服务器
└─ vendor/                    KaTeX 与 ECharts 本地副本（离线可用）
```

---

## 三、标签体系与教材版本

### 双版本架构

| | 人教版（rj） | 北师大版（bsd，默认） |
|---|---|---|
| 标签文件 | `data/tags.json` | `data/tags-bsd.json` |
| 题库目录 | `data/questions/` | `data/questions-bsd/` |
| 存储键 | `math_exam_version`（localStorage，缺省 bsd） | 同左 |

- 顶栏「教材版本」下拉切换，600ms 后整页刷新；两套体系并存互不影响。
- 数据加载失败时提示「无法加载数据文件：url \n 请通过本地服务器打开，或确认 xxx.js 存在。」

### 四级结构

**年级（12 册）→ 知识领域（4）→ 二级知识点 → 三级考点**

| 层级 | 人教版 | 北师大版 |
| --- | --- | --- |
| 二级知识点 | 100 | 91 |
| 三级考点 | 378 | 342 |

领域分布：人教版 NA 248 / GG 69 / CP 41 / SP 20；北师大版 NA 207 / GG 93 / SP 21 / CP 21。

每个三级考点的字段：

```json
{
  "id": "rj-g5d-NA-25dbsdtz",
  "legacyId": "g5d-NA-03-02",
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

考点 id 为语义化 slug：`{版本}-{册代号}-{领域}-{拼音首字母+关键数字}`，人教版如 `rj-g4u-GG-jdflrjzjdjpjzj`、北师大版如 `bsd-b1u-NA-10ynsdssyydy`；序号式旧 id（如 `g4u-GG-05-03`）保留在 `legacyId` 字段，历史数据已一次性自动迁移。

---

## 四、题库

按册存储：人教版为 `data/questions/gradeN-up|down.json`，北师大版为 `data/questions-bsd/bsd-gradeN-up|down.json`（顶栏切换版本后按版本加载）。每道题：

| 字段 | 说明 |
| --- | --- |
| `id` | 题目主键（slug，`rj-` / `bsd-` 前缀），如 `rj-g3u-NA-mdrs-001` |
| `legacyId` | 序号式旧主键（如 `g3u-Q001`），供历史数据迁移映射 |
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

**人教版 12 册题量（共 153 题）**

| 册 | 题量 | 册 | 题量 |
| --- | --- | --- | --- |
| 一上 | 12 | 四下 | 12 |
| 一下 | 11 | 五上 | 14 |
| 二上 | 12 | 五下 | 13 |
| 二下 | 12 | 六上 | 14 |
| 三上 | 12 | 六下 | 16 |
| 三下 | 12 | 四上 | 13 |

题型分布：calculation 35 / choice 24 / application 23 / fill 16 / reading 15 / figure 12 / draw 12 / judge 10 / figure-interactive 6。

**北师大版 12 册题量（共 1200 题，每册 100 题）**

| 册 | 题量 | 册 | 题量 |
| --- | --- | --- | --- |
| 一上 | 100 | 一下 | 100 |
| 二上 | 100 | 二下 | 100 |
| 三上 | 100 | 三下 | 100 |
| 四上 | 100 | 四下 | 100 |
| 五上 | 100 | 五下 | 100 |
| 六上 | 100 | 六下 | 100 |

全部 342 个考点 100% 有题（每册 23–32 个考点），92 个二级知识点各 ≥6 题，可直接用于组卷。题目由 `scripts/gen-questions-bsd.mjs` 按「家族（考点正则 → 题规格）」确定性生成（mulberry32 + FNV-1a 播种，同参数重跑字节一致），再与手写源合并；生成后须通过四道验收闸 + 阅卷试跑。题型分布随册不同（计算/应用为主，含看图、阅读、作图与交互作图）。

---

## 五、题型与自动阅卷（8 种内置 + 1 种扩展）

| 题型 | `type` | 分值 | 作答形式 | 判定规则 |
| --- | --- | --- | --- | --- |
| 选择题 | `choice` | 2 | 单选 / 多选 | 选项下标数组比对（顺序无关） |
| 填空题 | `fill` | 2 | 多空文本框 | 字符串匹配 + 多空独立判定 + 数值容差 + 单位容错 |
| 判断题 | `judge` | 1 | √ / × | 布尔比对 |
| 计算题 | `calculation` | 4 | 文本框 | 数值容差 + 分数等价（`5/7` = `10/14` = `0.714…`） |
| 应用题 | `application` | 5 | 多空文本框 | 多答案 / 多问分步给分 + 单位容错 |
| 阅读理解题 | `reading` | 6 | 子问题逐个作答 | 子问题逐个比对，按空计分 |
| 图形题 | `figure` | 3 | 文本框 | 图形测量 / 计算结果数值比对 |
| 作图题 | `draw` | 4 | Canvas 手绘 + 说明 | **人工阅卷**：报告页显示「待评分」，评分抽屉按 0.5 分步进给分 + 备注，提交后即时重算总分 / 正确率并写回记录 |
| （扩展）交互图形题 | `figure-interactive` | 3 | 点击图形区域 | 区域 id 数组比对，部分命中给部分分 |

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

**阅卷口径**：`gradePaper` 的自动正确率 `accuracy = 答对数 / 客观题数`；人工题评分后，分母改为「客观题 + 已评人工题」，满分人工题计答对，未评题计入 `manualCount` 仍待评数。

---

## 六、组卷

**组卷中心（`paper-builder.html`）为三步向导**：

1. **Step0 选场景**：单元测验 / 期中期末 / 口算速练 / 错题重练（跳错题本）/ 整册综合 / 自定义；
2. **Step1 选范围**：年级（6 大按钮）→ 上册 / 下册 → 单元卡片多选（含「整册」），底部吸顶条实时显示「当前条件下可出 N 题」（调 `previewCount` 只算不抽，220ms 防抖）；
3. **Step2 定规格**：题量 10/15/20/25 + 难度（基础 [1,1] / 标准 [1,2] / 挑战 [2,3]）+ 打乱开关；高级设置默认折叠（总分 / 题型权重 / seed / 自动补齐）；
4. **Step3 预览**：可编辑标题与卷头信息，每题「换一题 / 锁定」，「整卷重抽」，三个打印按钮，开始考试，保存试卷。

题目不足时显示黄条说明「当前范围仅 N 道题，已自动加入同单元 / 同册的 M 道题」，并提供「不自动补齐 / 恢复自动补齐」开关；URL 兼容 `?book=` / `?point=` / `?quick=` 直达 Step3。

组卷引擎支持四种模式（向导中由范围选择经 `inferMode` 自动推断，不再手动选择）：

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

引擎规则（`js/core/builder.js`）：

- **分值配平**：按 SCORE_TABLE（choice 2 / fill 2 / judge 1 / calculation 4 / application 5 / figure 3 / reading 6 / draw 4 / figure-interactive 3）与难度权重自动配平，总分精确对齐；单题分值 ≤ 0.4×总分；
- **题量下限**：题量 < 5 自动降级为练习卷；
- **时长**：考试时长 = max(5, 题数×3) 分钟；
- **随机**：mulberry32 + FNV-1a 种子，同一 seed 结果一致；
- **autoRelax**：条件不足时四级放宽（降难度 → 扩单元 → 扩册 → 仅题型），并如实提示补题来源。

---

## 七、在线考试（`exam.html`）

- 从组卷结果或保存的试卷进入；计时、答题卡总览、逐题作答、进度保存（断点续考）
- 6 种答题区由 `js/ui/render.js` 统一渲染：单选、多空填空、判断、文本 + 图片上传、Canvas 作图、阅读多小题
- 考试中题图等媒体资源由 `js/core/media.js` 按 5 种类型（svg / 交互 svg / image / audio / table）渲染
- 交卷后进入阅卷：客观题即时出分，主观题标记待评并引导至报告页评分抽屉

---

## 八、成绩报告（`report.html`）

- 总分、得分率、逐题对错、难度星标、考点标签
- 图表（`js/ui/charts.js`）：雷达图（领域掌握）、柱状图（题型得分）、折线图（历史趋势）、环形图（题量分布）；ECharts 缺失时降级为纯数字
- **主观题人工评分抽屉**（卡 12）：对计算 / 应用 / 作图 / 阅读题逐题打分（0.5 分步进 + 备注）→ 保存 → 全卷分数与正确率口径自动重算 → 持久化到考试记录
- 答错题一键加入错题本

---

## 九、错题本（`wrongbook.html`）

- 自动收录考试错题；按题型 / 知识点筛选
- 错题重练：以错题范围直接发起组卷（向导 Step0 入口）
- 支持移除、清空，重练结果回写掌握情况

---

## 十、打印（`print.html` + `js/ui/paper-print.js`）

- 三种模式：学生版（`?mode=student`，默认）/ 教师版（`?mode=teacher`，含答案与解析）/ 答案版（`?mode=answer`，仅答案与解析）
- 学生版 DOM 结构上**不含**答案、解析、难度星、考点标签（非 CSS 隐藏，从结构上防窥）
- 填空处渲染为 4em 横线（`\underline{\quad}` 转换）
- `print.css` 在打印页使用 `media=all`，屏幕预览即打印效果；`?bare=1` 可去工具栏
- 打印任务经 `math_exam_print_job` 传入；`print.html` 自带 `pp-toolbar` 工具栏，不加载题库与迁移脚本
- 其余页面（exam / report / wrongbook / paper-builder / index）的 print.css 为 `media=print`，可直接 `Ctrl+P` 打印 / 另存为 PDF，打印时自动展开全部题目与解析、隐藏交互控件

---

## 十一、本地存储

| 键名 | 内容 |
| --- | --- |
| `math_exam_records` | 考试记录（含作答、逐题判分结果） |
| `math_exam_wrong` | 错题本（含错误次数、掌握状态） |
| `math_exam_progress_{examId}` | 答题进度（断点续考） |
| `math_exam_settings` | 用户设置 |
| `math_exam_history` | 历史成绩（趋势图数据源） |
| `math_exam_papers` | 保存的试卷 |
| `math_exam_current_paper` | 当前待考试卷 |
| `math_exam_version` | 教材版本 |
| `math_exam_backup_v2` | 迁移前快照 |
| `math_exam_migrated_v2` | 迁移幂等标记 |
| `math_exam_schema_version` | schema 版本 |

容量与迁移：

- 存储信封统一为 `{v:2, data}`；上限：records 200 条 / history 300 条 / papers 50 份，超出按策略淘汰旧数据
- `getUsage()` 超 3.5MB 告警；`clearOldRecords(180)` 清理 180 天前记录
- 保存的试卷瘦身：仅存 `questionIds` + `paperScores`，读取时经 `Bank.getMany` 回查拼装
- **历史数据迁移**：`data/migrate-map.js` + `js/core/migrate.js` 页面加载自动执行一次，深遍历同时改写值与对象键，迁移前自动快照到 `math_exam_backup_v2`，可重复执行（幂等）
- 设置抽屉内提供 **导出备份 / 导入备份 / 清空全部数据**，方便迁移与清理

---

## 十二、UI 说明

- 主色调清新蓝（`--blue-500 #3b82f6`），卡片式布局，圆角 16–28px
- 响应式：≥1080px 三栏、860px 以下单栏并折叠导航、520px 以下移动端优化（components 层另设 720px 档）
- **低年级大字版**：顶栏 `Aa` 按钮或设置抽屉开关，字号 15.5px → 18.5px
- 无障碍：语义化标签、`aria-modal`、`prefers-reduced-motion` 降级

---

## 十三、扩展能力

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 题型插件式注册 | `MX.Plugins.register(def)` | 实现 `specs / grade / answerText` 即可参与组卷、作答与阅卷 |
| 标签可追加 | `data/tags.json` + `scripts/data/curriculum.mjs`（北师大版对应 `data/tags-bsd.json` + `curriculum-bsd.mjs`） | 追加考点后重跑 `build-tags.mjs` |
| 题库可扩展 | `data/questions/*.json` | 或运行时 `MX.Bank.registerQuestion(q, bookId)` |
| 存储可替换 | `MX.Storage.useDriver({ get, set, remove, keys })` | 可换成 IndexedDB / 云存储 |
| 媒体可扩展 | `MX.Media.register(type, renderer)` | 内置 svg / 交互 svg / image / audio / table |
| AI 出题预留 | `MX.AI.setProvider({ generate, explain })` | 未配置时降级为本地模板出题，保证链路可用 |
| 教材版本扩展 | 仿 `data/tags-bsd.json` + `questions-bsd/` 增加新版本目录 | loader 与 Version 模块按同构约定接入 |

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
const qs = await MX.AI.generate({ pointId: 'rj-g4u-GG-jdflrjzjdjpjzj', type: 'choice', count: 3 });
```

---

## 十四、开发与自检

```bash
# 重新生成标签体系（人教版 378 个考点；VERSION=bsd 生成北师大版 342 个考点）
node scripts/build-tags.mjs

# 重新生成题库（人教版 12 册；VERSION=bsd 生成北师大版题库）
node scripts/build-questions.mjs

# 北师大版扩充题库：先跑生成器（产出 scripts/data/questions-bsd-ext.mjs），再构建
node scripts/gen-questions-bsd.mjs
VERSION=bsd node scripts/build-questions.mjs

# 题库体检：题量 / 考点覆盖 / 问题清单（VERSION 同构建脚本，默认 bsd）
node scripts/audit-bank.mjs

# 阅卷验收：标准答案必须满分、反向答案不得满分（VERSION=bsd|rj 可只跑单版本）
node scripts/verify-grader.mjs

# 家族映射诊断：列出某册「家族正则 → 命中考点」，排查考点错配
node scripts/fam-map.mjs bsd-grade6-up

# 校验静态资源引用完整性（含 KaTeX 字体）
node scripts/verify-assets.mjs

# 历史数据迁移验收（legacyId→slug）
node scripts/verify-migration.mjs

# 组卷向导沙箱端到端验收
node scripts/verify-wizard.mjs

# 端到端自检：数据完整性 + 阅卷 + 组卷 + 存储 + 扩展能力（317 项断言）
node scripts/selftest.mjs
```

`selftest.mjs` 在 Node 中用 `vm` 构造最小浏览器环境加载 `js/core` 全部模块，逐题用标准答案验证满分、用空作答验证不得分，并覆盖容差 / 分数 / 集合 / 比例 / 单位等边界用例。

`verify-assets.mjs` 当前结果：170 处资源引用 + 20 个 KaTeX 字体，缺失 0；`verify-migration.mjs` 26 项断言、`verify-wizard.mjs` 85 项断言均通过。

`verify-grader.mjs` 直接加载浏览器端的 `grader.js` + `plugins.js`，对两个版本逐题用「标准答案」试阅、再用「错误答案」反向抽查。当前结果：北师大版 1200 题标准答案满分 1197 / 作图转人工 3 / 异常 0，反向抽查 300 题误判 0；人教版 153 题满分 141 / 转人工 12 / 异常 0，反向抽查 141 题误判 0。`audit-bank.mjs` 结果为 1200 题 / 342 考点覆盖 100% / 册级缺口 0 / 知识点缺口 0 / 数据问题 0。

---

## 十五、已知边界

- 题库体量：人教版每册 10–16 题共 153 题（教学示例）；北师大版 12 册各 100 题共 **1200 题**，342 个考点全覆盖，可直接组卷。扩充题由生成器按「家族」产出，同参数重跑字节一致；个别考点题量偏少（1–2 题），按具体考点细筛时可选面较窄，按册 / 按二级知识点 / 按领域组卷不受影响。
- 已内置**北师大版（默认）/ 人教版**双教材版本（顶栏「教材版本」下拉即时切换）；北师大版目录为草案，仍需对照课本逐条核对（见 `UPGRADE-LOG.md` 卡 7 / 8 备注）。新增其他版本：仿 `scripts/data/curriculum-bsd.mjs` 增加课程源后重跑构建脚本。
- `index.html` 的 meta description 题量数字为人教版口径（378 个微知识点），而默认版本为北师大版（342），展示层未同步此数字。
- 作图题依赖 Canvas `toDataURL` 保存图片，题量大且都作图时 localStorage 可能吃紧，页面会给出「进度保存失败」提示；作图题为人工阅卷，需在报告页评分抽屉给分后总分才完整（卡 12）。
- 公式渲染依赖 KaTeX 本地字体（`vendor/katex/fonts/`，20 个 woff2）；若字体缺失会退化为 MathML / 纯文本，不影响功能。
