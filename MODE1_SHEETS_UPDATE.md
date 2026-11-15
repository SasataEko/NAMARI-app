# Mode1／Mode2 Google Sheets 统计更新

这次沿用原来的表格和 /exec 地址，不另建数据库。

## Google 端需要做的更新

1. 在原 Apps Script 项目中，用本地 apps-script/Code.gs 替换 Code.gs。
2. 新建名为 Mode1.gs 的脚本文件，复制本地 apps-script/Mode1.gs 的完整内容。
3. 用本地 apps-script/Levels.gs 替换 Levels.gs；新版文件同时含 LEVEL_MANIFEST 和 MODE1_MANIFEST。
4. 运行 setup_ 一次。会保留原始数据，补充表头并创建 Mode1Raw、Mode1Audit、Mode1Summary、Mode2Summary。脚本属性中的表格 ID 与 SERVER_PEPPER 保持原值，不要重新生成参与者凭据密钥。
5. 在“部署 → 管理部署”编辑现有 Web App 部署，选择“新版本”后部署。仅保存代码不会更新 /exec 对外运行版本。继续以你本人执行，保持表格共享为受限、Web App 可匿名访问。
6. 发布网页的新代码和生成的两个关卡清单。更新前若出现待发记录，部署完成后可以在游戏中点击“未送信の記録を再送”。

## 各工作表用途

- Raw / Audit：现有 Mode2 原始回答／历史版本，继续保存假名标记、Pattern、音高与节拍。旧记录视为 Mode2，保留不删除。新增 game_mode 与 completed 等列；正确率和错误次数为空。
- Mode1Raw：Mode1 当前回答。同一匿名参与者、test/research、录音、题目、版本只保留一条当前记录；重复挑战或补充反馈更新该行，不重复增加人数。
- Mode1Audit：Mode1 每个已接收版本，含 attempt_id。完成挑战与之后主动反馈是同一 attempt_id 的不同提交版本；按提交 ID 去重。研究者分析历次挑战时，应按 attempt_id 取最新版本，不能把每条 Audit 行当成一个新玩家。
- Mode1Summary：符合预设纳入规则的 Mode1 分题／版本汇总。
- Mode2Summary：Mode2 的人数、完成／跳过数量与完成率；不提供正确率。
- _Identities：沿用原有匿名参与者凭据校验，不对玩家开放。

## Mode1 字段与口径

- gameMode：mode1；studyMode：test 或 research，两者分开。
- attemptId：本次挑战 ID；重开关卡生成新 ID。
- completed / completionStatus：完成或中途离开。
- events：作答序列与相对时间；不是卡片点击日志。
- attemptCount：有效作答次数。选文字题中，重看已答对文字不算作答；答错的文字再次点击仍计一次错误。
- correctCount / errorCount：有效作答中的正确／错误次数。
- accuracy：correctCount ÷ attemptCount，范围 0～1。汇总使用所有合格参与者正确次数之和 ÷ 作答次数之和。
- firstAttemptCorrect / firstAttemptAccuracy：首次作答是否正确／首次正确的人数比例。
- feedbackUnclear：未主动反馈为 null；只有点击“この訛りがようわかんない”才为 true。未点击不代表“理解了”。
- feedbackClickedAt / feedbackSource：主动点击时间及 feedback_button 来源。每次挑战最多点击一次。
- audioPlayed / listenedMs / responseDurationMs：录音播放与作答耗时；totalDurationMs 另含后续看卡片的时间。
- quality_flag / qualityRulesVersion / qualityRulesSnapshot：可配置的质量检查标记及规则版本。

玩家关闭或重看卡片不会提交“不太懂”。正常通关成绩可以自动提交；主动反馈随后更新同一条当前回答。原先 kotoba-mode1-unclear-v1 的试玩记录保留在本机，但不自动继承到新的挑战。

没有标准答案的旧内置アクセント／拍题只记录完成情况，正确率、错误次数为 null。Mode2 是听感表达，不把群体平均结果作为正确答案。

## 规则、DIY 与删除记录

Mode1 纳入规则位于 Mode1.gs 的 MODE1_RULES_，Mode2 仍使用 Code.gs 的 RULES_。正式收集前固定规则；变更规则时提升版本。原始回答保留，异常标记不按少数意见判定。

尚未登记到 MODE1_MANIFEST 的浏览器 DIY 题也可保存原始记录，但带 unverified_definition 标记，默认不进入正式汇总。题目需由研究者确认正解与录音版本并登记后再用于正式测试。打开本地项目文件夹进行未发布预览时，仍停用云端发送。

群体接口仅返回汇总和匿名回执，不返回原始行、参与者 ID、事件序列或删除接口。公开汇总仍有至少3名合格参与者门槛，表格中的私人汇总不受这个门槛限制。

删除对应 Raw 行后，下一次读取汇总会以当前 Raw 重算，Audit 不会自动恢复删除行。私人 Summary 表在提交或读取统计时刷新；手动删行后若要立即更新表内显示，可在 Apps Script 运行 refreshMode1Summary_ 或 refreshMode2Summary_。这些函数不会对外开放原始数据。

本次已在本地与 Apps Script 模拟环境测试；Google 线上部署需按上面的步骤完成后再验证。
