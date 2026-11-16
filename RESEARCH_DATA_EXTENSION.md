# NAMARI 研究数据扩展与接续说明

更新：2026-11-16。当前为本地开发完成、等待审核和重新部署；research 默认关闭。没有执行线上表格初始化，没有改写原有表头或删除数据，没有将 test 转为 research。

## 先看实际核对结果

已只读核对现有 Google Sheet 的工作表和表头：Mode1Summary、Mode1Raw、Mode1Audit、Mode2Summary、Raw、Audit、_Identities、00_使用说明。代码与现有答题表对应。抽查的 payload 为 test；没有据此推断正式样本人数。

| 原有位置 | 已有内容 | 本次处理 |
| --- | --- | --- |
| Mode1Raw / Mode1Audit | participant_id、study_mode、recording_id、level_id、level_version、attempt_id、正误次数、完成、首次正误、主动不理解反馈；T列 payload_json | 原列结构保留，新增元数据只进 JSON |
| Raw / Audit | participant_id、study_mode、录音/关卡/版本、noticed/pattern/pitch/beats/blanks、播放及质量标记；P列 payload_json | 原列结构保留，新增元数据只进 JSON |
| 两种 Summary | 各自模式的答题汇总 | 不增加 Mode2 正确率，不用平均图形作标准答案 |
| _Identities | 匿名ID与端末凭据哈希 | 复用，不公开凭据或读取身份行 |

原有 payload 已包含 audioPlayCount、listenedMs；Mode1 还包含 cardViewCount、cardCloseCount、completionStatus、带位置/时间的 events。原先缺少同意、背景、独立章节评价、整体反馈、持久化教程版本、参考录音对比与逐目标分析。本次复用已有事件，只补元数据和分析提取。

## 新增工作表及字段

只有研究者主动运行 setupResearchExtension_ 后才会新增以下4表：

- Participants：participant_id、study_mode、consent_version、consented_at、consent_status、withdrawn_at、language_background、japanese_learning_experience、background_status、updated_at、app_version、payload_json。每个匿名参与者每种 study_mode 一行。
- ChapterRatings：submission_id、participant_id、study_mode、game_mode、chapter、visual_helpfulness、response_status、submitted_at、app_version、scope_id、consent_version、consented_at。五级评价独立保存；同一次弹窗 scope_id 的状态更新同一行，历史进 ResearchAudit。
- ExperienceFeedback：submission_id、participant_id、study_mode、feedback_text、response_status、submitted_at、app_version、scope_id、consent_version、consented_at。可选文本，最多2000字。
- ResearchAudit：submission_id、received_at、participant_id、study_mode、event_type、game_mode、chapter、response_status、app_version、payload_json。原始扩展事件历史追加保存；相同 submission_id 重试不重复追加。

response_status：unanswered＝表单已出现但未提交；skipped＝主动跳过；answered＝明确提交。未出现表单时没有对应事件，不能当成跳过。单个背景问题允许 null，且日语母语者可选 not_applicable。

研究者可主动运行 refreshResearchAnalysis_ 新建/刷新两个独立派生表：

- TrialAnalysis：答题身份与版本、audio_play_count、listened_ms、card_view_count、card_close_count、completion_status、tutorial_completed、tutorial_version、app_version、consent_version、consented_at、consent_verified、quality_flag_json、reference_audio_play_count、learner_audio_play_count、reference_comparison_used。
- TargetClickAnalysis：submission_id、participant_id、study_mode、recording_id、level_id、level_version、target_position（从0开始）、click_order（从1开始）、correct、relative_ms、review、first_identification、errors_preceding。保留每次点击，包括已解决字形的再查看；整关正确率不因再查看而增加。errors_preceding 只是之前的错误次数，不能归因给某个目标。

分析表只读取最新 Raw；各次修订仍在原 Audit。刷新会重建这两个派生表，不能在其中存放需要保留的手写批注。不可解析的历史 JSON 不进入派生表，分析时须核对行数并回看原始表。历史无同意的 research 不会自动补同意或纳入新版正式统计。本地均值也排除缺失同意元数据或在同意前开始的旧记录；有效性最终由服务端参与者状态核验。

## 答题 JSON 新增字段

原答题列不变。payload_json 新增：startedAt（Mode2补保存；Mode1已有）、app_version、consent_version、consented_at、tutorial_completed、tutorial_version、tutorial_status、reference_audio_play_count、learner_audio_play_count、reference_comparison_used、reference_before_visual_count、reference_after_visual_count、learner_before_visual_count、learner_after_visual_count。

learner_audio_play_count 直接复用 audioPlayCount；前/后以第一次实际视觉操作为界，不能解释为理解程度。教程未开始为 null/not_started，主动跳过为 false/skipped，完成为 true/completed；按模式、章节、教程版本区分。Mode1 events 的假名点击补 clickOrder、targetPosition、correct，保留 atMs；服务端重新判定参考分析。

## 参与者看到什么

- 正式模式开始前：研究说明 → 明确勾选同意 → 服务端确认同意已保存 → 可选背景问题。
- Mode1 篇章最后一题前进、Mode2 最后词语返回列表时：可选五级评价。
- 首页和 Mode2 列表的「体験を終えて感想を書く（任意）」：开放反馈。
- 设置 → 研究参加：查看说明、测试说明流程、测试评价与反馈、撤回。
- 设置内标明 test/端末のみ 的预览只写本浏览器，不发正式同意、不写线上表。一般 test 答题仍按原云端配置写入 test 数据。
- 有 referenceAudio 的题目增加「参照音声」和「学習者音声」。开发者关卡编辑支持可选参照音声上传；本次没有制作或冒充参照录音。

## 部署顺序（先保持 research 关闭）

1. 备份现有 Apps Script。保留原 SPREADSHEET_ID、SERVER_PEPPER、部署URL等配置，不重置匿名身份。Google Sheet 继续设为「受限」。
2. 更新 apps-script/Code.gs、Mode1.gs，新增 Research.gs；使用当前 Levels.gs / Mode1Levels.gs 白名单。不要重新运行会改写旧表头的 setup_。
3. 检查上述新增4表名称和字段后，由研究者执行 setupResearchExtension_。遇到已有同名表且表头不同会停止，不能覆盖。
4. Apps Script「管理部署」编辑现有 Web App，选择新版本，沿用执行身份和现有访问设置。前端提交仍用 text/plain 无预检POST，回执和聚合用 JSONP；opaque POST 本身不算成功。
5. 构建并更新 GitHub Pages。先用 test 完整验证答题、评价、反馈、重复提交和失败重试；检查 test 行和 ResearchAudit。当前线上旧部署不能认定已具备本次功能。
6. 确认后再运行 refreshResearchAnalysis_。刷新为手动操作，原答题表不会被重写。

## research 启用条件

必须由研究者与指导教授审核网页版说明。public/content/research-protocol.json 当前 research_enabled=false、approved=false、consent_version 为 draft；前端和服务端都有阻断。

审核后，前端文件填写最终 sections、retention、研究者联系方式、approved_by、ISO approved_at，改用正式 consent_version，并明确设置 approved=true、research_enabled=true。

后端 Script Properties 同时设置 RESEARCH_ENABLED=true、RESEARCH_PROTOCOL_APPROVED=true、RESEARCH_CONSENT_VERSION（与前端完全一致）、RESEARCH_APPROVED_AT。不得把测试配置当成审核结论。正式参与者须重新明确同意，后台核对参与者同意状态、版号、时间和答题开始时间；不能追认旧答题。关闭前端或后端开关均会拒绝新正式上传。

撤回先停止此端末的正式上传，之后发送撤回事件；服务端收到后排除该参与者正式聚合，保留原始记录。离线时不能保证服务端立即收到，需联系研究者或确认网络恢复后的重试；保存过的数据不会自动物理删除。原始数据、Audit和公表结果如何删除，必须按最终审核规则由研究者处理。

## PDF 来源与待确认事项

依据研究者提供的《研究についての説明.pdf》：研究者何 彦澤，指导教授山田 博之；联系邮箱已录入草稿。原文规定同意书和回答用纸十年后销毁；音声不自动销毁，但参与者可撤回使用或要求销毁。原实验为约30分钟录音和问卷。

原PDF写有伦理批准说明，但不能据此断定新增Web实验也在原批准范围内。仍需确认：Web操作/背景/自由反馈/同意记录的保存年限与起算日；退出和删除 Audit 的范围；已公开汇总的处理；一个人即可显示聚合图形的公开条件；邮箱和身份信息是否仍有效；新的所需时间与审批范围。没有把音声“不销毁”的规则扩展到所有新日志。

## 测试与限制

2026-11-16：57项相关自动测试全部通过。覆盖原两模式、SVG资产、数据隔离、同意阻断、旧研究记录不能追认、撤回、重复更新、Audit、评级范围、未答/跳过、自由文本公式防护、逐目标点击、教程元数据与参考播放计数。

浏览器实测：research 草稿复选框及提交禁用；test 本地说明可进入可选背景并跳过；本地评价4分可进入自由反馈，反馈可跳过。此次界面验证没有向真实Sheet写入记录。生产构建另见本次交付结果。

自动测试使用内存 Sheets/Apps Script 环境，不代表已验证新部署的真实授权、网络和跨域链路。正式上线前仍需研究者重新部署后，用 test 执行真实 GitHub Pages → Apps Script → Sheets → 回执/统计 验证。断网、未部署、回执拒绝时保留本地原始数据及待发送记录；新正式同意未经回执确认不开放研究。

## 给下一个聊天的接续提示

先读本文件和 public/content/research-protocol.json，再核对真实Sheet/部署版本。保持 test/research 严格分离，不修改历史数据或原表头，不将没有有效同意的历史 research 当成有效样本。关联用 participant_id、study_mode、recording_id、level_id、level_version；同一 scope 的评价状态修订查看 ResearchAudit。正确率、播放量、错误次数、主观评价分别分析，不能互相替代或推断教学效果。

核心文件：src/studyUI.js（表单）、src/data/researchState.js（同意和版本）、studyEvents.js（原始扩展事件）、participantIdentity.js（复用匿名ID）、cloudCollection.js（传输）、audioComparison.js（参照播放）、apps-script/Research.gs（新存储/分析）。接入修改位于 main.js、exploration.js、modeOne.js、modeOneLesson.js、modeOneStats.js、modeTwoGuide.js；开发编辑及资源接口仅追加可选参照录音字段。
