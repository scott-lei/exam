# 升级执行日志（UPGRADE-LOG）

> 本文件记录小学在线考试系统逐项升级过程中每一步的基线与验收结果。
> 每完成一张「提示词卡」，在下方追加一行。回滚时以 `git tag` 和 `git log` 为准。

## 验收口径说明
- **selftest 列**：`node scripts/selftest.mjs` 的「通过 / 失败」项数。失败数必须为 0，否则本步视为未通过。
- **verify-assets 列**：`node scripts/verify-assets.mjs` 的「资源引用 + 字体 / 缺失」项数。缺失数必须为 0，否则本步视为未通过。
- **提交列**：本步对应的 git 提交短哈希或 tag。
- **备注列**：本步做了什么、是否有遗留问题、是否需人工核对。

## 基线记录

| 卡 | 日期 | 提交 | selftest | verify-assets | 备注 |
|----|------|------|----------|----------------|------|
| 0  | 2026-10-17 | v0-baseline | 通过 248 / 失败 0 | 135 引用 + 20 字体 / 缺失 0 | 建立安全网：git init + 基线快照 + 打 v0-baseline 标签。未修改任何业务代码。后续任一卡失败时 `git reset --hard v0-baseline` 即可回退。 |
| 1  | 2026-10-17 | v1-print | 通过 248 / 失败 0 | 160 引用 + 20 字体 / 缺失 0 | 诉求④：新增独立打印页。新增 print.html / js/ui/paper-print.js / js/pages/page-print.js；改 page-builder.js（打印试卷→student、新增打印答案 answer / 打印教师版 teacher 三按钮，写入 math_exam_print_job）与 css/print.css（仅追加 pp-* 规则）。Node 实测：学生版 DOM 对全部 9 种题型（含 figure-interactive/draw/reading）均不包含答案与解析文本；答案页含全部答案+解析，bare=1 仅答案；教师版含分页符。回滚：`git revert <本提交>` 或 `git reset --hard v0-baseline`。 |
| 2  | 2026-10-17 | v2-slug | 通过 248 / 失败 0 | 160 引用 + 20 字体 / 缺失 0 | 稳定 ID 第一步（不改主键）。仅改两个构建脚本 + 其产物：build-tags.mjs 为 378 考点 / 100 知识点生成语义化 slug（`rj-<册>-<领域>-<拼音首字母+关键数字>`，冲突追加 -2/-3），并将时间戳字段 generatedAt 改为基于内容确定性的 buildHash；build-questions.mjs 为 153 题写入 slug（由考点 slug + 三位序号派生）与 contentHash（stem+answer 的 FNV-1a）。拼音用内置 369 字字典（零三方依赖），覆盖 curriculum 全部汉字。验收：连跑两次构建 git diff 为空（字节级一致，已用 sha256 三次比对确认）；slug 全局唯一（378/100/153 均无重复）；selftest 248/0。**关键：本步确保以后切换主键 / 教材版本时有可靠的 slug 迁移依据，且构建可重复、无噪声 diff。** 回滚：`git checkout -- data/ scripts/` 或 `git reset --hard v1-print`。 |
