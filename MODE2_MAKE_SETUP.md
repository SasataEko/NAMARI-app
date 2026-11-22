# Mode 2 共用编辑器与新群体统计

Mode 1 保持现有界面。Mode 2 与 Mode 3 共用 `src/modeThree.js`，Mode 3 的独立入口与作品保存保留。Mode 2 不再调用旧教程，かりきゅらむ使用原来的正式关卡 ID，作为普通第一关。

Mode 2 中选择 Pattern 的字形放大；焦点仅用下划线；每次操作随机旋转。アクセント支持 H/L 和最多两个有序重音；新增「ー」「ッ」与前一拍音高联动，支持拍减少和全部操作撤回。录音不因工具切换重新开始。

## 数据与部署

- 原有 Raw/Audit 列和历史数据不变，继续保留 test/research、录音/关卡版本、原始提交与 Audit。
- `payload_json` 增加 `interactionVersion: "mode2-make-v1"`、`emphasis`（如 `["base:0","long:0"]`，顺序代表最强/次强）、`glyphAngles`（±10°）、`backgroundAngles`（0～360°）。未被编辑的旧数据不补造重音。
- Apps Script 的 `Code.gs` 增加对扩展的调用；新增 `Mode2Visual.gs`，无需增加表格列。原有 Research.gs、Mode1.gs 等文件保留。
- 真实云端重音平均与 TOP3 需要更新 Apps Script 代码并重新部署 Web App；前端改动也需要推送 GitHub Pages。此轮没有代为部署或 push。
- 同步项目中最新 `Levels.gs`，避免服务端拒收新版素材/关卡版本。保留现有脚本属性、端点、参与者凭据与访问权限。
- 返回的汇总扩展为 `visualStatsVersion:1`、`emphasisCount`、`emphasisRates`、`longRates`、`commonExamples`；不返回参与者 ID 或原始记录。

## 统计口径

平均字形由各 Pattern 的选择率插值，普通字形颜色固定采用贴纸配色，不再由标记比例变红。清浊整图切换仍只显示一个完整字形，方向分布不通过重叠符号表现。

重音①与②分别计算选择比例，背景按比例连续改变大小、红色占比；高低独立取平均。旧数据未记录重音，不计入重音分母，页面显示有重音记录的回答数量。新增长音与促音按选择率显示相应宽度，极低比例保留最低可见尺寸，避免完全消失。

TOP3 是「Pattern + 高低 + 拍 + 追加拍 + 重音顺序」相同的常见完整组合，按回答次数排序，最多显示三个；不按随机装饰角度拆分，不当作正确答案。分母为同一模式、录音/关卡版本下符合既定纳入规则的全部回答；跳过不制作常见作品。少于三种就只显示实际存在的种数。

无云端统计时只显示明确标注的个人回答示例，不伪称其他人的平均或 TOP3。旧 Apps Script 没有返回扩展字段时会提示更新。

## 本地验证页面

`http://127.0.0.1:5173/NAMARI-app/tests/mode2-result-preview.html`

仅用于检查平均与 TOP3 排版，使用标明为架空的测试数据，不保存、不上传，不进入生产构建。正常预览仍从主界面进入 Mode 2。
