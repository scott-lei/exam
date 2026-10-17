# 分步升级施工手册（提示词卡）

> 配套文档：`OPTIMIZATION-PLAN.md`（分析与方案）
> 用法：**一次只发一张卡**，发完等验收通过，再开新会话发下一张。
> 核心原则：每张卡小到「一个会话能做完、出问题能一键回滚」。

---

## 〇、使用方法（重要，先读这 10 行）

1. **新建会话**再发卡。不要在同一个会话里连发多张卡——上下文越滚越大，最容易卡死和跑偏。
2. 每张卡执行完，**先跑验收命令**；不通过就发「回滚卡」，别硬修。
3. 每张卡只有 3–6 个文件被改动，改完用 `git diff --stat` 看一眼，超过预期就是跑偏了。
4. 卡与卡之间**必须**提交一次 git（卡 0 已经建好仓库），提交信息写 `step-N: 说明`。
5. 数据类工作（教材、题库）**绝不能和代码改造混在同一张卡里**。
6. 我给你的 prompt 都写了「只读这些文件」，请保留这句——它决定 token 消耗。

### 每张卡开始前，先发这段「通用前缀」

```text
你正在维护 D:\WorkBuddy\exam-main —— 纯前端小学数学在线考试系统（file:// 双击可运行，
传统 script 标签，无构建工具、无后端、无 npm 依赖）。

本次只执行 UPGRADE-PLAYBOOK.md 的「卡 N」。硬性约束：
1. 只读/只改该卡列出的文件。禁止全仓库 grep / 遍历目录；需要定位时用精确 grep，
   不要把 20KB 以上的文件整份读进来（除非卡内说明必须）。
2. 保持 file:// 兼容：不得引入 ES Module、打包器、第三方 npm 包；不得修改 vendor/。
3. 动手前先用 3–6 行列出「要改的文件 + 改动要点」；高风险卡（卡 3、7、8）等我回复「继续」再动手。
4. 不要重写整份 CSS/HTML，只做增量修改；不要顺手重构无关代码。
5. 完成后必须跑卡内验收命令，把真实输出贴出来。没通过就停下来说明原因，不要继续下一步。
6. 不要主动读取 data/questions/*.json 全文（单册可达 30KB），需要统计时写脚本输出摘要。

开始前先确认：你要做的这张卡是什么，需要读哪几个文件。
```

---

## 一、施工卡总览

| 卡 | 目标 | 对应诉求 | 风险 | 预估 token |
| --- | --- | --- | --- | --- |
| 0 | 建立安全网（git + 基线） | — | 极低 | 5k |
| 1 | 打印与答案分离（独立 print.html） | ④ | 低 | 20k |
| 2 | 稳定 ID 第一步：加 slug 字段（不改主键） | ②③④ 地基 | 低 | 20k |
| 3 | 稳定 ID 第二步：切换主键 + 迁移脚本 | ② | **高** | 30k |
| 4 | 存储瘦身 + schemaVersion + 容量监控 | — | 中 | 20k |
| 5 | 组卷内核 API（预判/降级/换题/分组/分值表） | ③ | 中 | 25k |
| 6 | 组卷中心三步向导（重写页面） | ③ | 中 | 35k |
| 7 | 北师大版目录 A（一上~二下 4 册骨架） | ② | 高 | 30k |
| 8 | 北师大版目录 B（剩余 8 册 + 构建参数化 + 版本切换） | ② | 高 | 40k |
| 9 | 题库体检脚本 + 缺口表 | ① | 低 | 15k |
| 10 | 样板册 50 题（第 1 册，打通流水线） | ① | 中 | 40k |
| 11 | 批量扩题（每次 2 册，重复 5–6 次） | ① | 中 | 40k/次 |
| 12 | 作图题人工评分 | — | 中 | 25k |
| 13 | 报告增强 / PWA（可选） | — | 低 | 25k |

> 建议顺序：**0 → 1 →（2 → 3 → 4）→（5 → 6）→（7 → 8）→（9 → 10 → 11）×N → 12 → 13**
> 理由：打印是纯增量、零数据风险，先拿到正反馈；ID 改造必须在换教材**之前**完成，否则题库和教材要返工两遍。

---

## 卡 0：建立安全网

**目标**：让后面每一步都能一键回滚。

```text
任务：为 D:\WorkBuddy\exam-main 建立版本控制与基线，不改任何业务代码。

步骤：
1. git init（若已有则跳过）；确认 .gitignore 覆盖 node_modules / *.log / *.bak / _*.html。
2. git add -A && git commit -m "step-0: 基线快照（升级前）" && git tag v0-baseline
3. 跑一次基线检查并记录结果：
   node scripts/selftest.mjs
   node scripts/verify-assets.mjs
4. 把两项结果（通过项数、缺失项数）写进新建的 UPGRADE-LOG.md，格式：
   | 卡 | 日期 | 提交 | selftest | verify-assets | 备注 |
5. 新增 UPGRADE-LOG.md 并一起提交。

不要修改 README、不要动 data/、不要动 js/。
```

**验收**：`git log --oneline` 有 1 条提交、`git tag` 有 `v0-baseline`、`UPGRADE-LOG.md` 记下 **248 项通过 / 0 失败** 与 **135 引用 + 20 字体 / 缺失 0**（这是当前实测基线）。

**回滚**：无（本卡只加不改）。

---

## 卡 1：打印与答案分离（诉求 ④）

**目标**：新增一个**独立打印页**，彻底解决「打印出来的卷子带答案」。不动现有页面的渲染逻辑。

**为什么用独立页面**：现在的打印靠 `print.css` 隐藏交互控件，脆弱且改一处崩一处。独立 `print.html` 从 localStorage 取试卷、生成纯静态卷面、自动调起打印——屏幕排版与打印结果完全一致，且和主站零耦合。

```text
任务：新增独立打印页，实现「学生版 / 教师版 / 答案页」三种输出。

新增文件：
- print.html            纯静态壳（复制 paper-builder.html 的 head 与 script 清单，
                        末尾加 js/ui/paper-print.js 与 js/pages/page-print.js）
- js/ui/paper-print.js  卷面渲染器：MX.PaperPrint.render(paper, mode) -> HTML 字符串
- js/pages/page-print.js 读取 localStorage 的 math_exam_print_job，按 ?mode= 渲染，渲染后
                         await document.fonts.ready 再 window.print()

修改文件（只允许改这两处）：
- js/pages/page-builder.js：把「打印试卷」按钮改成写入 math_exam_print_job 后
  跳到 print.html?mode=student；旁边加一个「打印答案」按钮，跳 mode=answer。
- css/print.css：只追加规则，不删除现有规则。

卷面规格：
1. 卷头：试卷标题 / 学校·班级·姓名·学号 / 得分栏 / 时间与满分（用表格排版，打印对齐）。
2. 学生版：题干 + 选项 + 答题留白；【严禁出现】q-analysis、答案、难度星、考点标签。
   填空画固定宽度下划线（width: 4em 的 border-bottom），计算与应用题每题下方留 3 行横线，
   作图题留 5mm 浅灰网格背景块（用 repeating-linear-gradient，打印时保持浅灰）。
3. 教师版：学生版 + 卷末答案页（break-before: page）。
4. 答案页：只列「题号 + 答案 + 解析」，两栏（column-count:2；column-gap:8mm）；
   ?bare=1 时不输出解析，只输出答案。
5. 所有公式用 MX.Math.toHtml 渲染（已有 KaTeX 封装，别自己写）。
6. 不用 CSS 自动页码（Chrome 不支持 @page 的 counter(page)），改为卷尾标注「共 N 题」，
   并在打印提示里告诉用户「页码请在打印对话框勾选页眉页脚」。

验收（必须逐条执行并贴结果）：
- node scripts/verify-assets.mjs  → 新增的 3 个文件都被正确引用，缺失 0
- node scripts/selftest.mjs       → 仍为 248 通过 0 失败
- 手工：双击 paper-builder.html 生成一份 10 题试卷 → 打印学生版 → 浏览器打印预览里
  逐页确认【没有任何答案与解析文字】；再打印答案页，确认只有题号+答案+解析且另起一页。

禁止：不要把答案藏在 <details>、不要用 CSS 隐藏了事——答案文本必须根本不出现在学生版 DOM 里。
```

**验收清单**（人手看一遍）：打印预览无答案 / 答案页另起页 / 卷头字段完整 / 公式不是乱码。

**回滚**：`git reset --hard step-0`，或 `git revert` 该提交（本卡是纯新增，删除 3 个新文件即恢复）。

---

## 卡 2：稳定 ID 第一步——加 slug（不改主键）

**目标**：给考点和题目各加一个**语义化稳定 ID**，但**先不改现有主键**。这样后面切换主键时才有迁移依据。

```text
任务：为考点与题目增加 slug 字段，现有 id / qid 一律不动，保证 100% 向后兼容。

只改这两个构建脚本（以及它们生成的产物）：
1. scripts/build-tags.mjs
   - 为每个考点生成 slug：`${version||'rj'}-${book.code}-${domain}-${pinyinish(pointName)}`，
     中文字段请用「拼音首字母 + 关键数字」的确定性算法（不引入第三方库），
     冲突时追加 -2/-3；同一份 curriculum 必须每次生成同一 slug。
   - 写入 points[i].slug 与 knowledge[i].slug（知识点用单元序号 + 拼音）。
2. scripts/build-questions.mjs
   - 每题写入 slug：`${point.slug}-${String(i+1).padStart(3,'0')}`，
     并额外写 contentHash（对 stem+answer 做 FNV-1a 取 8 位十六进制）。
   - 【不要】改现有的 id 生成逻辑。

验收：
- node scripts/build-tags.mjs && node scripts/build-questions.mjs
- node scripts/selftest.mjs  → 必须仍是 248 通过 0 失败
- 写 5 行脚本抽查：slug 全局唯一（378 个考点无重复）、153 道题 slug 唯一、
  连跑两次构建 slug 完全一致（确定性）。

禁止：不要改动 id 格式、不要动 data/ 以外的任何 js/、不要重排 curriculum 的单元顺序。
```

**验收关键**：**连跑两次构建，`git diff` 必须为空**（保证确定性，否则以后每次构建都产生噪声 diff）。

**回滚**：`git checkout -- data/ scripts/`。

---

## 卡 3：稳定 ID 第二步——切换主键 + 迁移（高风险，需确认）

```text
任务：把考点与题目的主键从「序号式」切换为「slug 式」，并提供历史数据迁移。

前置：卡 2 已完成，slug 全局唯一且确定。

改动：
1. scripts/build-tags.mjs：point.id 改用 slug；原序号 id 保留到 point.legacyId。
2. scripts/build-questions.mjs：question.id 改用 slug；保留 legacyId；
   题库里的 p 字段改写为 point.slug。
3. 新增 scripts/migrate-ids.mjs：输入旧 tags/新 tags，输出 legacyId -> newId 的
   JSON 映射表（同时给题目映射）。
4. 新增 js/core/migrate.js：浏览器端一次性迁移，把 localStorage 中
   math_exam_records / math_exam_wrong / math_exam_progress_* / math_exam_papers
   里的 qid、point、book 引用按映射表重写，写 schemaVersion=2，迁移后置
   math_exam_migrated_v2=true，重复执行安全（幂等）。
5. index.html 在 shell.js 之后引入 migrate.js，并在 Shell.mount 前调用一次。

【可选，若你觉得风险大就跳过】不做自动迁移，改为检测到旧数据时提示
「检测到旧版数据，是否重新开始？」并提供导出备份按钮。二选一，你决定并说明理由。

验收：
- node scripts/selftest.mjs  → 248 通过 0 失败（若断言里写死了旧 id，按新 id 同步修改断言，
  并在 UPGRADE-LOG.md 记录改了哪几条断言）
- node scripts/verify-assets.mjs → 缺失 0
- 造一份「旧数据」样本（手工在 localStorage 写入 1 条记录 + 1 条错题），
  刷新页面后确认映射正确、且二次刷新不重复迁移。
- 双击 index.html → 首页、组卷、考试、报告、错题本 五个页面全部能打开、无 console 报错。
```

**验收关键**：五个页面都能开；错题本里点「重练」能正常出题（这一步最容易暴露 ID 断裂）。

**回滚**：`git reset --hard step-2`（数据文件回退 + 本地 localStorage 清理）。

---

## 卡 4：存储瘦身与版本化

```text
任务：修掉 localStorage 三个隐患：试卷全量存档、无版本号、无容量监控。

只改 js/core/storage.js（必要的话改 page-builder.js / page-wrongbook.js 各 2 行）：
1. savePaper 只存 { id, title, createdAt, count, totalScore, config, questionIds, paperScores }，
   不再存整卷 questions。getPaper(id) 时用 MX.Bank.getMany 回查题目重新拼装；
   兼容旧格式（检测到 paper.questions 就直接用）。
2. 所有 key 外层加版本号：写入 { v: 2, data: ... }，read() 里兼容旧裸 JSON 并自动升级。
3. 加 getUsage()：遍历自身 key、统计字节数并按大小排序；超过 3.5MB 时在 Shell 上提示
   「本地存储接近上限，建议导出备份后清理旧记录」。
4. 新增 clearOldRecords(days=180)：清理超期记录与已完成的 progress。

验收：
- node scripts/selftest.mjs → 248 通过 0 失败（存储层断言需要同步适配新结构）
- 生成并保存 3 份试卷，在 console 里跑 MX.Storage.getUsage()，单份试卷占用应 < 3KB。
- 旧格式数据（v 缺省）能被正确读取。
```

**回滚**：`git checkout -- js/core/storage.js` + 相关 2 行。

---

## 卡 5：组卷内核 API（先改引擎，再改界面）

```text
任务：为组卷引擎补齐 5 个能力，全部通过 Node 断言验证，先不碰任何页面。

只改 js/core/builder.js，并在 scripts/selftest.mjs 追加断言：
1. previewCount(config) -> { count, byType, shortage }：只算不抽，用于界面实时预判。
2. autoRelax 选项：当候选数 < 请求题量时，按「指定考点 → 同二级知识点 → 同册同领域 → 同册」
   逐级放宽，返回 relaxLevel 与说明文字，而不是静默出 1 题。
3. 分值规则修正：新增 SCORE_TABLE（choice 2 / fill 2 / judge 1 / calculation 4 /
   application 5 / figure 3 / reading 6 / draw 4 / figure-interactive 3），
   默认按题型表配分，totalScore 仅做等比缩放；单题分不得 > totalScore*0.4，
   单张试卷题量 < 5 时自动降级为「练习卷」并给出提示。
4. swapOne(paper, index, config) / lockQuestion：保持总分不变替换单题。
5. groupBy: 'type' 选项：输出 sections: [{ type, name, scorePer, questions }]，
   题号在组内重编号；不打乱大题顺序（按 choice→fill→judge→calculation→
   application→figure→reading→draw 固定序）。

验收：
- node scripts/selftest.mjs：现有 248 项全过，新增断言全部通过，
  至少覆盖：单考点只有 1 题时 previewCount 如实返回 1 且 shortage>0；
  autoRelax 能把 1 题放宽到 ≥6 题；1 题不再产出 100 分；swapOne 后总分不变。
- 不要改 page-builder.js（卡 6 统一改）。
```

**回滚**：`git checkout -- js/core/builder.js scripts/selftest.mjs`。

---

## 卡 6：组卷中心三步向导（诉求 ③）

```text
任务：重写组卷中心页面为三步向导，调用卡 5 的内核 API。

只改 js/pages/page-builder.js（基本重写）+ css/components.css（只追加向导相关样式）。
不要改 builder.js、不要改其他页面。

界面（小学老师/家长可用，不出现专业术语）：
Step0 场景卡：单元测验 / 期中期末 / 口算速练 / 错题重练 / 整册综合 / 自定义
Step1 范围：年级 6 个大按钮 → 上册/下册 → 单元卡片多选（含「整册」）→ 底部实时显示
          「当前条件下可出 34 题」
Step2 规格：题量 10/15/20/25 大按钮 + 难度 基础/标准/挑战 + 是否打乱；
          高级设置默认折叠（分值、题型权重、seed）
Step3 预览：卷头信息 + 可出题数 + 每题 [换一题][锁定] + [整卷重抽]
          + [打印学生版][打印教师版][打印答案页][开始考试]

交互硬要求：
1. 删除「四种模式」选择器与所有 "请恰好选择 1 个考点" 类硬校验；模式由选择自动推断。
2. 当题目不足时，用黄条说明「该考点仅 1 道题，已自动加入同单元的 5 道题」，
   并提供「不自动补齐」开关（调用 autoRelax:false）。
3. 所有可点击元素高度 ≥ 44px；术语替换：册次→上册/下册、考点→知识点。
4. 移动端单列、步骤条固定在顶部、可回退；键盘 Tab 顺序合理。
5. 保留 URL 参数兼容：?book= 与 ?point= 仍能直达并跳到 Step3。

验收：
- node scripts/verify-assets.mjs → 缺失 0
- 双击 paper-builder.html：① 三步内能出卷；② 选一个只有 1 道题的考点，观察是否自动补齐并提示；
  ③ 换一题后总分不变；④ 打印三个版本都能跳转 print.html 且正确。
- 用手机尺寸（375px）看一遍，无横向滚动条。
```

**回滚**：`git checkout -- js/pages/page-builder.js css/components.css`。

---

## 卡 7：北师大版目录 A（4 册骨架，需确认）

> ⚠️ 这张卡涉及教材内容，**必须人工核对**。我的输出只能作为草案。

```text
任务：新增北师大版课程目录骨架，只做一上~二下 4 册，不改人教版任何数据。

新增 scripts/data/curriculum-bsd.mjs，导出与 curriculum.mjs 完全相同的结构
（DOMAINS / BOOKS / units / points，字段一致），book id 用 bsd-grade1-up 形式，
code 用 b1u / b1d / b2u / b2d。

要求：
1. 每册 7–8 个单元，每个单元 3–5 个三级考点，考点带 type / suitableTypes / difficultyRange。
2. 「数学好玩」类综合实践单元映射到 CP 领域；「总复习」不建考点。
3. 每个考点额外写 sourceNote 字段，注明白北师大版单元名，便于人工核对。
4. 在文件顶部注释写明：本文件为草案，需以北师大版教材目录逐条核对后再用于生产。

【不要】修改 build-tags.mjs / build-questions.mjs / data/ 下任何文件。
【不要】生成 tags.json。

验收：
- node -e "import('./scripts/data/curriculum-bsd.mjs').then(m=>console.log(m.BOOKS.length,
  m.BOOKS.map(b=>b.units.length+':'+b.units.reduce((s,u)=>s+u.points.length,0)).join(' ')))"
- 输出应显示 4 册，每册单元数 7–8，考点数 23–38。
- 把 4 册的「单元清单」用表格贴出来给我核对，不要直接进入下一步。
```

**验收关键**：**你本人（或懂教材的人）对照北师大版课本目录核一遍**。核对通过才发卡 8。

---

## 卡 8：北师大版目录 B（剩余 8 册 + 构建参数化 + 版本切换）

```text
任务：补齐北师大版剩余 8 册，并让构建脚本支持多版本并行，不破坏人教版。

改动：
1. scripts/data/curriculum-bsd.mjs 追加三上~六下 8 册（规格同卡 7）。
2. scripts/build-tags.mjs：
   - 读环境变量 VERSION（rj|bsd，默认 rj），从对应源文件取 BOOKS；
   - 去掉「总数必须 378」「每册 23–38」的硬断言，改为可配置阈值（写入脚本顶部常量）；
   - 输出 data/tags.json（人教版，保持兼容）+ data/tags-bsd.json + 对应 .js 兜底。
3. scripts/build-questions.mjs：同样按 VERSION 分支，输出到 data/questions/ 与
   data/questions-bsd/。
4. js/core/tags.js 与 loader.js：按 MX.Version.current（localStorage 存，默认 bsd）
   选择加载哪份 tags；js/core/bank.js 同样按版本切换题库目录。
5. js/ui/shell.js：顶栏加「教材版本」下拉（北师大版 / 人教版），切换后提示刷新。

验收：
- VERSION=rj node scripts/build-tags.mjs && node scripts/build-questions.mjs
  → data/tags.json 与人教版原有内容一致（git diff 应只有 slug 等新增字段）
- VERSION=bsd node scripts/build-tags.mjs → 生成 tags-bsd.json，考点数打印出来
- node scripts/selftest.mjs → 仍需全过（若断言依赖固定 378，改成读实际值）
- 双击 index.html：切到北师大版，首页能显示 12 册；切回人教版，原有题库仍可组卷。
```

**回滚**：删 `curriculum-bsd.mjs` 与 `tags-bsd.*`，`git checkout -- scripts/ js/core/ js/ui/`。

---

## 卡 9：题库体检脚本 + 缺口表（诉求 ① 的前置）

```text
任务：新增 scripts/audit-bank.mjs，输出题量与覆盖体检报告，并生成「缺口表」。

要求：
1. 按册统计：题量、覆盖考点数/总考点数、每二级知识点题量、题型分布、难度分布。
2. 输出三张表到控制台 + 写入 data/audit-report.md：
   ① 册级汇总；② 每个二级知识点的题量缺口（目标 6 题，算出差几题）；
      ③ 问题清单（答案为空 / 解析 <20 字 / 题干重复 / 考点不存在）。
3. 阈值常量放脚本顶部：PER_BOOK_MIN=50、PER_KNOW_MIN=6、ANALYSIS_MIN=20。
4. 不达标时 process.exit(1)，达标时打印 OK。
5. 用 OPTIMIZATION-PLAN.md 附录 A 的脚本作为起点，按上面要求扩展。

验收：
- node scripts/audit-bank.mjs → 当前应报失败，并打印「一上缺 38 题」这类缺口；
- 把 `data/audit-report.md` 的前 30 行贴给我（我要用它规划扩题顺序）。
```

---

## 卡 10：样板册 50 题（打通生产流水线）

> 先做**一册**，把质量标准和流水线跑通，再批量。这是整份手册里最重要的一个「质量控制点」。

```text
任务：把「一上」（或北师大版一年级上册）从 12 题扩充到 50 题，作为样板册。

要求：
1. 严格沿用 data/questions/ 现有 JSON 结构（stem / options / answer / analysis /
   media / extend），p 字段用考点 slug。
2. 数量分配：选择 12 / 填空 10 / 判断 6 / 计算 8 / 应用 6 / 图形 4 / 阅读 2 / 作图 1 /
   交互图形 1；难度 1:2:3 = 15:20:15。
3. 覆盖：该册每个二级知识点 ≥ 6 题。
4. 每题必须有：可判定的答案、≥20 字解析、extend.source="自编"。
   计算题答案用数值 + 单位；应用题至少 2 道多问分步给分。
5. 低年级题干短、多用图（可用 scripts/data/svg.mjs 已有的生成器）、不出现超纲符号。
6. 写完后跑：node scripts/build-questions.mjs && node scripts/audit-bank.mjs
   && node scripts/selftest.mjs

注意：单册 50 题是较大的内容生成任务，请分批写入（每批 10–15 题），
每批写完先自检 JSON 合法性再继续，避免一次性大文件写入失败。
```

**验收**：`node scripts/audit-bank.mjs` 显示该册 50 题、知识点全部达标、0 个问题。

**你的动作**：**抽 10 题人眼验答案**。这批题的质量标准将复制到后面 11 册，别省这一步。

---

## 卡 11：批量扩题（重复执行，每次 2 册）

```text
任务：按卡 10 的标准，把 {册A} 与 {册B} 扩充到 50 题。

沿用卡 10 的全部要求（结构、配比、覆盖、答案可判定、解析 ≥20 字、extend.source="自编"）。
这两册的单元难度略高，注意：
- {册A} 的考点以 {补充说明} 为主，计算题注意竖式步骤在解析里写清；
- {册B} 出现 {易错点} ，至少 3 题专门考这个易错点。
分批写入（每批 10–15 题），每批后校验 JSON。

完成后跑三个脚本并贴结果：build-questions / audit-bank / selftest。
```

> 执行 5–6 次即可覆盖 12 册（每次改括号里的册名）。**每次都必须是新会话**，否则上下文会爆。

---

## 卡 12：作图题人工评分

```text
任务：补上「作图题待人工评阅但无法给分」的缺口。

只改 js/pages/page-report.js + css/components.css（追加样式）：
1. 报告页每条 manual 题显示「待评分」标记 + 「评分」按钮。
2. 点开抽屉：左边学生作图（base64 图）、右边评分要点（q.answer.rubric）、
   下方 0~满分 的分数选择按钮（按 0.5 分步进）+ 备注输入。
3. 提交后：重算该卷 earnedScore / accuracy / 各题型得分率，写回 records，
   并同步更新 history；已评分的题显示「已评分 X 分」。
4. 评分结果不重算已存档的 radar 数据时要标注「数据已更新，请刷新图表」。

验收：
- 用一份含作图题的卷子完整走一遍：交卷 → 报告显示待评 → 评分 → 总分变化正确
  → 刷新页面后分数仍在。
- node scripts/selftest.mjs 仍全过。
```

---

## 卡 13（可选）：报告增强 / PWA

```text
任务：二选一实施，不要同时做。

A. 报告增强：知识点掌握度分级（未掌握<60% / 待巩固 60–85% / 已掌握>85%）、
   与「自己最好成绩」对比、成绩单导出 CSV。
B. PWA：新增 manifest.json + sw.js（缓存 app shell 与 data/），
   让平板/手机上可通过静态托管打开并离线使用。注意 file:// 下 SW 不生效，
   需在 README 注明「PWA 仅在 http(s) 下可用」。

先告诉我你选 A 还是 B，以及理由。
```

---

## 二、辅助卡（随时可用）

### A. 体检卡（每次改完都跑）

```text
不改任何代码，只跑检查并汇报：
node scripts/selftest.mjs
node scripts/verify-assets.mjs
node scripts/audit-bank.mjs
git diff --stat
把四项结果贴出来，逐条说明是否通过。若 selftest 通过数从 248 变成了别的数字，
指出是新增断言还是回归。
```

### B. 回滚卡

```text
出问题了，需要回滚到上一张卡完成时的状态。
1. 先 git status / git diff --stat 告诉我当前改了什么。
2. 确认没有未提交的有价值改动后，git reset --hard <上一个 tag 或 step-N 提交>。
3. 跑 node scripts/selftest.mjs 确认基线恢复。
4. 在 UPGRADE-LOG.md 记录回滚原因。
不要顺手"修一下"，先回滚到干净状态。
```

### C. 故障排查卡

```text
页面出问题了，按下面顺序排查，不要一上来就改代码：
1. 打开 Chrome DevTools Console，把红色报错原文贴给我。
2. 检查 Network：是否有 404（尤其是 data/tags.json、data/questions/*.js）。
3. 若是 file:// 直开：确认没有用到 fetch/ES Module（会跨域失败）。
4. 若是数据问题：跑 node scripts/selftest.mjs 定位是数据还是 UI。
5. 若是 localStorage 脏数据：在 console 里执行
   Object.keys(localStorage).filter(k=>k.startsWith('math_exam')) 看有哪些 key，
   先导出备份再清。
```

### D. README 同步卡（每个里程碑结束时发一次）

```text
任务：把 README.md 更新到与当前实现一致，只改事实性内容，不重写结构。
需要更新：题库题量、教材版本说明、打印入口（print.html 三个模式）、
组卷方式（三步向导）、已知边界（去掉已修复的条目）。
改完 git diff README.md 给我看。
```

---

## 三、里程碑与验收闸门

| 里程碑 | 完成卡 | 通过闸门（必须全绿） |
| --- | --- | --- |
| M0 安全 | 0 | git 仓库 + tag + 基线 248/0 |
| M1 打印 | 1 | 学生版打印预览**零答案**；答案页独立 |
| M2 数据地基 | 2, 3, 4 | 五个页面可开；错题重练不断链；单份试卷 <3KB |
| M3 组卷体验 | 5, 6 | 三步出卷；1 题考点自动补齐；换题总分不变 |
| M4 教材版本 | 7, 8 | 12 册北师大目录核对通过；双版本可切换 |
| M5 题库 | 9, 10, 11×N | audit-bank 全绿：每册 ≥50、每知识点 ≥6、0 重复 |
| M6 闭环 | 12, 13 | 作图题可评分并持久化 |

---

## 四、红线清单（每张卡都适用）

1. **不引入构建工具 / npm 依赖 / ES Module** —— 一旦引入，`file://` 双击就废了，整个项目的最大优势就没了。
2. **不改 `vendor/`**。
3. **不一次性重写 600 题**：每张卡最多 2 册，单批写入 10–15 题。
4. **不在同一会话连开两张卡**。
5. **代码与数据不同卡**：改 `js/` 的卡不许碰 `data/questions/`；改题库的卡不许碰 `js/`。
6. **每张卡结束必须提交 git**，提交信息 `step-N: 说明`。
7. **任何一步 `selftest` 通过数下降，立即回滚**，不要边猜边修。
8. **教材内容必须人工核对**，模型输出只作草案。

---

## 五、马上可以开始

复制下面这段，作为第一张卡（卡 0）发送：

```text
你正在维护 D:\WorkBuddy\exam-main —— 纯前端小学数学在线考试系统（file:// 双击可运行，
传统 script 标签，无构建工具、无后端、无 npm 依赖）。

本次只执行 UPGRADE-PLAYBOOK.md 的「卡 0：建立安全网」。硬性约束：
只读/只改该卡列出的文件；保持 file:// 兼容；不改 vendor/；完成后跑验收命令并贴真实输出。

卡 0 内容：git init 并提交基线 tag v0-baseline，跑 selftest.mjs 与 verify-assets.mjs
记录基线数字到新建的 UPGRADE-LOG.md，然后一起提交。不要修改任何业务代码。
```
