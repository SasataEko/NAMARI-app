# 体験後アンケート（2026-11-28-v1）

## 部署
本次需要更新 Apps Script。保留原部署 URL，在 Apps Script 中替换 Code.gs、Research.gs，新增 Surveys.gs；其他脚本保留。先以表格拥有者运行 setupSurveyExtension，只会创建独立 SurveyResponses，不修改原游戏表或旧 ChapterRatings、ExperienceFeedback、ResearchAudit 的表头。然后“部署 → 管理部署 → 编辑 → 新版本 → 部署”。前端也需要推送 GitHub Pages 才能在线生效。不要重新运行会改旧表头的 setup。

现有旧感想数据留在 ChapterRatings / ExperienceFeedback，不与新版本自动合并。新增问卷提交沿用 text/plain 无预检 POST，JSONP receipt 确认；不把 opaque 响应当作成功。研究同意、匿名身份凭证、test/research 隔离沿用既有系统。公开接口不提供问卷原始数据或删除入口。

## 触发规则
Mode1 各篇所有普通关卡均完成或主动查看参考答案后，点击继续进入对应一道篇章评价。主动查看答案仍按原来的放弃记录保存，不算答对。教程可跳过，不列入普通关卡的必需数；若该篇只有教程，则以教程完成为准。各篇按任意顺序均可，三个篇章完成后才出现 Mode1 综合三题。已经回答或本地跳过的问卷，在同次体验不重复出现。章节最后的按钮文案为“感想に回答する”。如果只跳到末关、其他关卡未完成，会返回该篇列表，不伪记整篇完成。

Mode2：src/data/surveyConfig.js 的 mode2RequiredLevels 当前为 3。完成并实际看到平均图形区域的三个不同关卡后，结果页显示问卷入口；点击“下一关/返回列表”也会先进入问卷。重玩同一关不累计，未查看结果不累计。平均图例为自己答案时照实记录无其他答案；无法确认旧服务端统计来源时为 null，不冒充有其他人的回答。

session_id 存在本地浏览器，刷新/重试不更新；同一匿名 ID、数据模式和问卷版本下 12 小时为一次体验（配置 sessionHours），超时开始新体验。测试/正式/qa-local 隔离。清除浏览器存储会丢失匿名身份与本地进度，应告知参与者不要清除。新问卷不追认历史测试游戏进度。

问卷取消“スキップ”，改为始终可用的下一篇继续按钮；发送成功不是进度条件。选择完整时继续按钮也会异步尝试保存，未回答则仅保留草稿。未默认选择任何项；正式页面Mode1每题需选1～5，Mode2每题需选1～5或“判断できない”。Mode1采用横排圆形选项，左侧“そう思わない”、右侧“そう思う”；历史cannot_judge记录保留，不转换为分数。自由记述始终可空。跳过用 unanswered + skipped，绝不变成 3。未提交的草稿只保存在设备，不冒充已收到的数据库回答。

## SurveyResponses 列
一行一个题目。response_id 为稳定的提交 UUID 加题目 ID，submission_id 为整份问卷的提交 UUID。
participant_id / session_id / mode / survey_type(chapter,overall) / chapter(vowelChallenge,accent,mora,not_applicable) / question_id / question_version / answer_value(数字1～5,cannot_judge,unanswered) / free_text / completed_level_count / timestamp / dataset_type(test,research) / response_status(answered,skipped,unanswered) / comparison_viewed / other_answers_available(true,false,空白未知) / app_version / consent_version / consented_at / payload_json。

综合问卷的 free_text 每题行重复保存，导出自由记述时按 submission_id 去重，不把同一段文本计算三次。Mode2 payload_json.comparison_views 另含每个已查看关卡的来源、时间和其他回答是否存在。timestamp 为客户端提交时刻，ResearchAudit.received_at 为服务器接收时刻。

服务端在已有身份、同意校验及脚本锁内，以 participant_id + dataset_type + session_id + mode + survey_type + chapter + question_version + question_id 去重；刷新、重复点击、网络重试不会增加同一题人数。ResearchAudit 保留已接受的原始请求，重复尝试不改写旧回答。断网保留固定提交 UUID 和填写内容，可重试；端末の再送キューにも保持されます。发送未获 receipt 时不会标成已确认。

## 分析
始终先筛选 dataset_type、mode、question_version，再按 question_id 分组；Mode1 与 Mode2 不合成综合分。
有效分数仅数字1～5，cannot_judge 和 unanswered 分开计数。有效人数为数值行数，选项比例以有效人数为分母。平均值 AVERAGE，中位数 MEDIAN；肯定率为 COUNTIF(分数范围,">=4") / COUNT(分数范围)。示例：COUNTIFS(M:M,"research",D:D,"mode1",G:G,"m1_notice",I:I,">=1",I:I,"<=5") 计算该题正式有效人数。不要将 skipped 或空白转换为 0/3。可按 B 列匿名 ID 与原游戏表关联，按 C 列区分体验。

## 提交示例
{schemaType:"study_event",event_type:"survey",id:"稳定UUID",participantId:"现有匿名UUID",studyMode:"test",gameMode:"mode2",session_id:"体验UUID",scope_id:"同体验UUID",survey_type:"overall",chapter:"not_applicable",question_version:"2026-11-28-v1",answers:[{question_id:"m2_express",answer_value:4},{question_id:"m2_diversity",answer_value:"cannot_judge"},{question_id:"m2_notice",answer_value:3}],free_text:"",completed_level_count:3,comparison_viewed:true,other_answers_available:false,response_status:"answered",submitted_at:"ISO时间",app_version:"2026.11.28-surveys-v1"}

research 开启条件仍为已审核研究说明、前后端明确启用、有效 consent_version 和 consented_at。推送 GitHub 不自动将 test 变成 research。研究者应在正式收集前确认问卷措辞、3关阈值、12小时体验界定和完整参与安排；变更问卷需新版本。当前モーラ实际使用追加长音/促音，提供题目仍按研究者原文保留“横幅や間隔”，请确认这一描述是否与最终界面一致。

验证不会向正式表插入虚构玩家。自动测试使用内存中的 Apps Script/Sheets；真实 Google Sheets 的写入验收需要拥有者部署新脚本之后再以 test 模式做一次真实提交。



## 本次验证记录
2026-11-28：175项自动测试全部通过，生产构建通过。包含Apps Script真实处理函数在内存Sheets中的逐题写入、test/research隔离、身份/同意、同ID重传与新ID同scope去重、表头保留、公开读取拒绝、cannot_judge/跳过区别、原游戏回归；包括前端no-cors POST + JSONP receipt 的确认与失败重试。浏览器1280×720及390×844实际检查五份问卷、无预选、选择、确认、跳过及感谢。新Sheets表尚待运行setupSurveyExtension创建，真实Web App尚待更新部署；没有用架空回答污染现有表。completed_level_count在Mode1排除tutorial-前缀教程。

本次主要文件：src/data/surveyConfig.js（题目/阈值）、src/data/surveySession.js（体验与草稿）、src/surveyUI.js及studyUI.css（界面）、src/main.js与modeTwoResult.js（触发）、modeOneStats.js与researchState.js（关卡体验关联）、studyEvents.js（稳定ID本地去重）、cloudCollection.js与Code.gs（仅汇总的其他回答可用标记）、Research.gs与Surveys.gs（独立表写入）；tests/surveys.test.js、appsScript.test.js、modeOneTransport.test.js（验证）。
