# 标记与数据质量：本地版本

本说明取代REALTIME_MODE.md中旧v2存储及模拟群体数据的说明。新模式沿用原UI、SVG、LHH默认、音高与节拍、上下结果页；旧关卡不变。

## 如何使用

- 首页「挑战新模式」，录音说明下的「データモード」选择「開発试玩 / Test」或「正式テスト / Research」。默认test。切换模式会开始一个新作答，不保存尚未提交的草稿。
- 点击任何假名，假名变为红色（#e5235b），立即记录noticed=true，pattern=null，不变形；有已注册Pattern时可以选卡片变形。选「違いは感じるけれど、うまく言えない」或「どれも当てはまらない」均保留红色标记、pattern=null、普通字形。
- 再点当前假名取消标记并清空该字Pattern；点击其他字切换编辑，保留之前各字记录。Pattern可以反复改选。未注册Pattern不提供替代变形。
- 「目立った違いは感じなかった」清空标记并恢复默认音高和正常节拍，表示明确无差异；「あまり自信がない」保留当前操作并记录不确定。也可无任何变形直接提交或跳过。所有选项都不产生正确率。
- 个人结果在上，群体结果在下。群体只使用同模式、同录音、同纳入规则的其他匿名参与者的本地记录，不包括本人。没有数据会显示暂无他人回答，绝不补造人数。当前不再默认展示模拟群体数据。

## 原始记录

localStorage键：kotoba-exploration-raw-v3。每次提交追加一条原始记录，重复提交与被标记的回答都保留。旧v1/v2键保留但不参与v3统计。

| 字段 | 含义 |
| --- | --- |
| schemaVersion / id | 3 / 本次提交UUID |
| studyMode | test或research，严格隔离 |
| participantId | 浏览器生成的随机匿名UUID，同浏览器所有profile共用；不使用姓名或设备指纹 |
| levelId / recordingId | 题目ID / 稳定的录音版本ID；替换研究录音时必须换recordingId |
| profileId | 现有本地档案槽，与匿名参与者ID不同 |
| startedAt / createdAt / responseDurationMs | 开始、提交时间及作答耗时（毫秒） |
| noticed | 每个假名是否被注意到，布尔数组 |
| pattern | 每字的具体Pattern ID或null |
| markingReason | noticed_only / unclear / none_match / pattern / null |
| answerStatus | explored / no_difference / uncertain |
| pitch / beats / blanks | 高低数组、1或2拍数组、字间附加拍布尔数组 |
| features / intensity / touched | 兼容现有显示用字段；pattern为新版具体选择的权威字段 |
| skipped | 是否点击跳过，单独保存 |
| audioPlayed / audioCompleted / audioPlayCount / listenedMs | 是否播放、是否到结尾、播放次数、累计有效媒体进度毫秒数；拖动大幅跳转不算播放时长 |
| quality_flag | 检查标记数组，不触发删除原始数据 |
| qualityRulesVersion / qualityRulesSnapshot | 纳入规则版本与提交时完整规则快照 |
| qualityCheck | 正常对照或重复录音配置，普通题为null |
| referenceResponseId / repeatComparison | 重复录音对应的原记录，以及标记/Pattern/音高/拍/附加拍是否变化，仅重复题有此字段 |

## 纳入规则与去重

src/data/studyConfig.js中qualityRules为预设协议，正式收集前固定。调整规则应换version并开始新批次，不能保持同一版本事后改筛选条件。当前统计只纳入规则版本和完整快照均匹配的记录。历史记录不被重写。

默认规则：作答至少1500ms；已播放且有效媒体进度累计至少500ms；响应结构合法。invalid_response、audio_not_played、too_fast、insufficient_listening、control_trial不纳入。超过1小时标记long_response，但默认只提醒而不排除。默认纳入uncertain和skipped；合格跳过者仍按正常字形、默认アクセント和一拍且无附加拍计入，保持之前的规则。只因与多数人答案不同不会生成异常标记，也不会被排除。未播放或太快仍可提交并保留原始回答。

统计先为同模式、同匿名参与者、同录音选择最新提交，再检查是否纳入；最新提交不合格时，不自动回用较早的合格答案。正式记录重复提交只更新统计中的一条，不增加人数。重复质量题单独保留原始试次，不覆盖该录音普通题记录；默认不进入主统计。最终统计按匿名参与者再次去重。

平均结果：具体Pattern的人数比例驱动已有SVG插值；所有noticed=true的比例用字形颜色插值表达，包含pattern=null的仅标记回答，不生成新字形。音高、延长和附加拍仍按纳入者均值计算。个人字形颜色根据noticed取原始黑色或#e5235b；群体字形颜色根据全部noticedRates在两色之间插值，与Pattern选择率独立。多变体按比例混合现有轮廓，属于视觉插值而非声学测量。群体结果不是正确答案。

## 配置质量检查题

无需制作新录音。以下只是配置模板，不默认添加题目：

```js
// 在目标level上配置qualityCheck，或在studyConfig.qualityChecks中按level.id设置。
qualityCheck: { type: 'normal_control', expectedNoticed: false }
qualityCheck: { type: 'repeat', referenceRecordingId: 'kusuri-recording-v1' }
```

正常对照必须由研究者选定合适录音；系统不会把现有口音录音假称为正常对照。repeat题使用独立level.id，与原录音相同的recordingId；记录referenceResponseId及各类差异。尚无原参考回答时标记repeat_reference_missing。正常对照出现不同判断仅标记control_review；控制题默认整体不进入主统计，不给玩家判对错。题目列表可沿用现有关卡配置，未增加录音、评分或新的强制步骤。

## 本地版本边界与后端待办

- 所有原始数据和匿名ID仅存在当前浏览器/网站来源中；换浏览器、清除存储、更换设备会改变匿名ID。多人共用浏览器会被视为同一参与者；当前版本不能实现可靠的跨设备研究身份识别。
- 群体页只读当前浏览器记录并排除本人，因此通常没有其他人数据，这是正常状态，不是已连接云端。
- 正式多人部署还需要后端：稳定匿名会话或研究邀请码、服务器唯一约束(studyMode, participantId, recordingId)、追加原始修订及事务性更新、服务器重算标记与规则版本、跨设备汇总、备份和受控导出。前端标记和计时仅供基础质量复核，不能证明参与者真正听到了录音，也不能防止篡改。
- API衔接仍是saveExploration(record, level)与getExplorationAggregate(level, options)。原始数据可由研究者在浏览器开发工具的Local Storage查看/导出；尚未提供云端或一键导出界面。

## 验证

tests/explorationStore.test.js：匿名ID稳定、原始修订保留、模式隔离、重复去重、仅标记无虚构变形、最新不合格不回退、少数答案保留、规则快照、均值、跳过默认、重复控制记录与本人排除，共9项通过。生产构建通过。浏览器验证无Pattern字标记/说不清楚/取消、test↔research切换、无差异/不确定选择、录音播放和test提交及本地空结果页，控制台无错误。浏览器没有提交正式research测试记录。

最新视觉校正：已移除假名旁的红色标记点，原拍点保留。通过currentColor同时覆盖文本颜色与SVG path填充，Morph仍只更新d路径；取消后恢复原素材黑色#231815。新增测试覆盖100%标记、50%具体Pattern时两种比例独立。

最新UI：无差异/不确定的独立按钮已移除。无更改时提交显示「特に訛ってないよ」，有实际更改时显示「こう聞こえます」，answerStatus在提交时按当前状态记录no_difference或explored。历史uncertain记录仍兼容，数据规则不变。结果页仅以文字高低显示音高。个人始终黑色，群体才应用标记率颜色；群体ッ比例用14–30px大小表示，0%不显示。
