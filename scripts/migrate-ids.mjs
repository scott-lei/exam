// 生成历史数据迁移映射表：旧序号主键（legacyId） -> 新 slug 主键（id）
//
// 输入：重建后的 data/tags.json（每个 point 含 legacyId / id）与
//       data/questions/*.json（每题含 legacyId / id）
// 输出：data/migrate-map.js —— window.MX.MIGRATE_MAP = { points:{旧:新}, questions:{旧:新} }
//
// 说明：卡 2 已为所有 point / question 写入 legacyId（旧序号主键），卡 3 又把这些字段的
// 主键切到 slug（id）。因此「旧 tags」已被折叠进同一份产物的 legacyId 字段中，
// 这里直接从新产物派生映射即可，无需再传入两份独立 tags。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'data/migrate-map.js');

const tags = JSON.parse(fs.readFileSync(path.join(root, 'data/tags.json'), 'utf8'));

const points = {};
tags.points.forEach((p) => {
  if (p.legacyId && p.id && p.legacyId !== p.id) points[p.legacyId] = p.id;
});

const questions = {};
const dir = path.join(root, 'data/questions');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const payload = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  payload.questions.forEach((q) => {
    if (q.legacyId && q.id && q.legacyId !== q.id) questions[q.legacyId] = q.id;
  });
}

const map = { points, questions };
const js = '/* 自动生成，请勿手工修改。源：scripts/migrate-ids.mjs（由卡 3 重建产物派生） */\n'
  + 'window.MX = window.MX || {};\n'
  + 'MX.MIGRATE_MAP = ' + JSON.stringify(map, null, 2) + ';\n';

fs.writeFileSync(outFile, js, 'utf8');

const pc = Object.keys(points).length, qc = Object.keys(questions).length;
console.log(`migrate-map.js 已生成：points 映射 ${pc} 条，questions 映射 ${qc} 条 -> ${outFile}`);
if (pc !== tags.points.length || qc !== tags.points.length * 0) {
  // 仅作信息提示：考点映射数应等于考点总数（每点都有 legacyId）
  if (pc !== tags.points.length) console.warn(`!! 警告：points 映射数(${pc}) 与考点总数(${tags.points.length}) 不一致`);
}
