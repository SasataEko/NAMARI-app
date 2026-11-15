// Owner-only helper. Adds a first-page guide; never changes research data or sharing.
// Copy this file into the existing bound Apps Script project and run installResearchGuide_ once.
// This private function does not require a new Web App deployment.
function installResearchGuide_(){
 var ss=spreadsheet_(),name='00_使用说明',sheet=ss.getSheetByName(name);
 if(sheet&&sheet.getLastRow()>0){ss.setActiveSheet(sheet);ss.moveActiveSheet(1);return '说明页已存在，保留原内容并移到第一位。';}
 if(!sheet)sheet=ss.insertSheet(name);
 var rows=[
  [
    "研究数据使用说明｜先看这里",
    "",
    ""
  ],
  [
    "要做什么",
    "去哪里 / 重点列",
    "说明"
  ],
  [
    "一、先区分模式和数据用途",
    "",
    ""
  ],
  [
    "test 与 research",
    "两张原始表都是 D study_mode",
    "お試し = test，研究参加 = research。选择会随本次回答上传；不是按本地/GitHub网址、语言档案或是否真实玩家自动判断。"
  ],
  [
    "正式收集前",
    "游戏中的「データモード」",
    "开始回答前选择「研究参加」。历史 test 不会自动转成 research，也不要改成正式数据来凑样本。"
  ],
  [
    "Mode1 与 Mode2",
    "Mode1Raw / Raw",
    "Mode1 是找特征的闯关；Mode2 是表达听感。两模式独立统计，test/research 再分别统计。"
  ],
  [
    "先看总体",
    "Mode1Summary / Mode2Summary",
    "每行对应一种 study_mode、录音、题目和版本。只含符合当前纳入规则的数据；旧版本和未登记DIY可能不在当前汇总中。"
  ],
  [
    "二、查看 Mode1",
    "",
    ""
  ],
  [
    "Mode1 汇总",
    "Mode1Summary：A 数据用途；E 人数；F 通关数；G 通关率",
    "再看 J 错误总次数、K 正确率、L 首次正确率、M 主动说不懂的人数。人数按每题计，不能跨题直接相加当总受试者人数。"
  ],
  [
    "Mode1 当前回答",
    "Mode1Raw：D study_mode；U word；V chapter",
    "先按 test/research、题目和版本筛选。该表是一位参与者对同一录音/题目/版本的最新回答，不是每点击一次就一行。"
  ],
  [
    "通关与作答",
    "Mode1Raw：I completed；J correct_count；K error_count；L attempt_count；M accuracy",
    "M 是正确次数 ÷ 有效作答次数，0.5 = 50%。重看已答对文字不计作答；答错后再次点击仍计一次。"
  ],
  [
    "首次是否答对",
    "Mode1Raw：N first_attempt_correct",
    "TRUE = 本次挑战首次作答正确。与反复尝试后通关是两个不同指标。"
  ],
  [
    "看不懂的反馈",
    "Mode1Raw：O feedback_unclear；P feedback_clicked_at",
    "只有主动点击「この訛りがようわかんない」才记录 TRUE。空白表示未反馈，不能当作已经理解。关闭卡片不会提交此反馈。"
  ],
  [
    "录音、时间、质量",
    "Mode1Raw：Q audio_played；R response_ms；S quality_flag_json",
    "Q 看是否播放；R 单位毫秒，5000 = 5秒；S 看质量标记。没有标准答案的题，正确率和错误次数为空，不是0。"
  ],
  [
    "追溯一次挑战",
    "Mode1Raw / Mode1Audit：C participant_id；F level_id；G level_version；H attempt_id；T payload_json",
    "C 是浏览器匿名ID；H 是本次挑战ID；T 是完整记录。Audit 同一 H 可能有成绩和后续反馈等多个版本，不要逐行当作新玩家。"
  ],
  [
    "三、查看 Mode2",
    "",
    ""
  ],
  [
    "Mode2 汇总",
    "Mode2Summary：A 数据用途；E 人数；F 完成；G 跳过；H 完成率",
    "Mode2 不设正确率。完整听感分布需要从 Raw 分析，不把群体平均当成标准答案。"
  ],
  [
    "Mode2 听感选择",
    "Raw：H noticed_json；I pattern_json；J pitch_json；K beats_json；L blanks_json",
    "依照假名顺序保存：H 是否标记；I 具体Pattern；J 高低；K 每拍长度；L 字间附加拍。标记但没选Pattern也有效。"
  ],
  [
    "Mode2 质量与原文",
    "Raw：D study_mode；M audio_played；N response_ms；O quality_flag_json；P payload_json；Q game_mode；R completed",
    "O 是质量标记；P 是完整回答；Q 标明 mode2。R 只是是否完成/跳过，不代表答对/答错。"
  ],
  [
    "为什么原始行数比汇总人数多",
    "quality_flag_json 与 payload_json",
    "未播放、听得太短、作答太快、诊断记录、未登记DIY等按既定规则处理。原始记录保留，不按是否与多数人一致来删。"
  ],
  [
    "四、删除、恢复与刷新",
    "",
    ""
  ],
  [
    "只让记录退出当前统计",
    "先备份，再在 Mode1Raw / Raw 中删除对应整条数据行",
    "可以直接操作。先筛选并核对 study_mode、participant_id、recording_id、level_id、level_version。保留第1行表头和全部列名。"
  ],
  [
    "不要只改这些地方",
    "Summary 数字；quality_flag_json；单个成绩列",
    "Summary 会重算；仅改单个指标、质量标记或 test/research 单元格可能与完整JSON不一致。不要用它们伪造修正或排除。"
  ],
  [
    "删除 Raw 不等于彻底清除",
    "Mode1Audit / Audit 仍有历史",
    "当前汇总不从 Audit 自动恢复；未来分析也不能把删掉的记录重新从 Audit 算进去。建议另记删除日期、ID范围和原因。此教程没有替你删除任何记录。"
  ],
  [
    "需要彻底清除某人的数据",
    "先确认范围，再处理 Raw、Audit 和浏览器待发队列",
    "这是另一种操作。新的回答或未接收的待发记录仍可能写入；不要为了清数据而删除 _Identities 或修改 SERVER_PEPPER。"
  ],
  [
    "删行后更新显示",
    "Apps Script：refreshMode1Summary_ / refreshMode2Summary_",
    "游戏下次读取统计或有新提交时会重算。表内 Summary 想立即更新，就手动运行相应函数；不必重新部署。"
  ],
  [
    "备份与维护",
    "研究者的受限 Google 表格",
    "删除前用「文件 → 下载」备份，或保留受限副本。不要改 Raw/Audit 的表名、表头和列顺序；_Identities 由程序维护。"
  ],
  [
    "五、新窗口继续分析",
    "",
    ""
  ],
  [
    "交给新聊天",
    "项目根目录：研究数据分析衔接.md",
    "告诉助手先读该文档和当前 Apps Script，再确认研究问题、数据范围与纳入规则。可以提供受限连接或导出的数据，不能只给Summary就推断所有听感。"
  ],
  [
    "分析时先说清",
    "Mode1或Mode2；research或test；题目/录音/版本；时间范围",
    "一般先分析 research。跨版本、跨模式、反复挑战、质量排除和删除记录都要明确口径，不能直接把全部行混起来。"
  ],
  [
    "匿名ID的边界",
    "participant_id 是浏览器标识，不是实名账号",
    "同一浏览器切换中/日档案仍可能是同一个匿名ID；换设备或清存储可能产生新ID。母语/实验分组目前未写入云端，不能从ID推断。"
  ],
  [
    "版本与来源",
    "说明更新：2026-11-15",
    "依据项目当前 Code.gs、Mode1.gs、关卡清单和客户端保存逻辑编写。正式分析时以实际数据表头及当时规则为准。"
  ]
];
 sheet.getRange(1,1,rows.length,3).setValues(rows).setWrap(true).setVerticalAlignment('top').setFontFamily('Arial').setFontSize(11).setFontColor('#191919').setBackground('#ffffff');
 sheet.setColumnWidth(1,190);sheet.setColumnWidth(2,340);sheet.setColumnWidth(3,690);sheet.setFrozenRows(2);
 sheet.getRange(1,1,1,3).merge().setBackground('#ffffff').setFontColor('#191919').setFontSize(18).setFontWeight('bold');
 sheet.getRange(2,1,1,3).setBackground('#e5e5e5').setFontWeight('bold');
 rows.forEach(function(row,i){if(i>1&&!row[1]&&!row[2])sheet.getRange(i+1,1,1,3).merge().setBackground('#f2f2f2').setFontWeight('bold').setFontSize(12);});
 sheet.autoResizeRows(1,rows.length);sheet.setRowHeight(1,46);sheet.setRowHeight(2,30);
 ss.setActiveSheet(sheet);ss.moveActiveSheet(1);SpreadsheetApp.flush();return '已在第一个工作表创建使用说明，没有修改原始数据。';
}
