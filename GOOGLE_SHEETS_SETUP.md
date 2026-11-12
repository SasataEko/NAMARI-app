# Google Sheets + Apps Script 数据收集原型

## 当前状态

网页提交、确认回执、最新汇总、失败队列及Apps Script服务端均已实现。默认仍为本地模式，直到你部署脚本并填入Web App URL。

目标表格：使用研究者本人拥有、共享权限为受限的Google表格。

该链接目前无法通过我的读取工具访问；没有读取其中原有数据，也没有声称已完成账户授权或线上部署。脚本初始化只新增Raw/Audit/_Identities工作表，不删除已有页。

## 1. 保持表格私有

1. 打开上述表格；如果它不是你的表格，先复制为自己拥有的表格。
2. 点击「共享」，把「常规访问权限」设为「受限」。只保留你及确实需要管理原始数据的研究者。
3. 不要发布到网络，不要设为知道链接的任何人可查看。隐藏工作表不能代替访问权限。

## 2. 安装与授权 Apps Script

1. 在表格菜单打开「扩展程序 → Apps Script」。
2. 把本项目 apps-script/Code.gs 全文复制到编辑器的 Code.gs。
3. 新增一个脚本文件「Levels」，把 apps-script/Levels.gs 全文复制进去。这是当前关卡及版本白名单，不含回答或私密凭据。
4. 打开左侧「项目设置 → 脚本属性」，添加：
   - SPREADSHEET_ID：你的表格URL中 /d/ 与 /edit 之间的ID
   - MIN_AGGREGATE_COUNT：3（可提高，不允许低于3）
5. 保存，选择函数 setup_，点击「运行」。由你本人选择Google账户并授权访问表格；如提示未验证，只在确认代码属于自己且已检查的前提下继续授权你自己的项目。不要授权来历不明的脚本。
6. 确认表格出现Raw、Audit和_Identities三张表。setup_自动生成SERVER_PEPPER，留在脚本属性中，不复制给网页、不提交GitHub。
7. 如需显式设置V8及权限，可在项目设置显示appsscript.json，使用本项目同名文件。默认绑定表格项目使用V8亦可。

## 3. 部署 Web App

1. Apps Script右上角「部署 → 新建部署」，类型选择「Web应用」。
2. 执行身份：**我（你的Google账户）**。
3. 有权访问：**任何人**，包括不登录Google的访客；不是“任何拥有Google账户的人”。
4. 点击部署并完成必要授权，复制以 /exec 结尾的Web App URL，不使用 /dev 测试地址。
5. 如果组织账户不允许匿名Web应用，这种公开GitHub Pages方案不能直接使用；不要通过公开原始表格来绕过限制。

## 4. 配置游戏并发布

编辑 public/content/collection.json：

```json
{
  "enabled": true,
  "endpoint": "https://script.google.com/macros/s/你的部署ID/exec",
  "timeoutMs": 30000
}
```

这是公开的提交接口URL，不是秘密凭据。浏览器只保存每个匿名参与者自己的随机participantKey；服务端仅保存其HMAC摘要。Google OAuth token、服务账户JSON、SERVER_PEPPER和任何私钥不得写入仓库或网页。

将修改commit/push，等待现有GitHub Pages构建完成。pnpm run build现在会先生成关卡版本清单，再打包网页。若只需重新生成，运行 pnpm run manifest。

每次修改录音、普通字形、Pattern或关卡定义后，重新构建，再将新 apps-script/Levels.gs 同步到Apps Script并部署新版本。版本由关卡内容及相关素材内容哈希生成；即使同路径覆盖SVG也会换版本，避免混合研究数据。更新现有部署请用「管理部署 → 编辑 → 新版本」，可保留同一个exec URL。

## 5. 验证线上跨域（必须在你部署后执行）

打开：
https://sasataeko.github.io/NAMARI-app/?collection-check=1

点击「测试跨域提交、回执与汇总」。成功应显示三个阶段都完成：

1. GitHub Pages向Apps Script发送text/plain普通POST，不触发自定义header的预检。
2. 通过独立JSONP只读请求确认submissionId已在Audit落盘。**fetch的opaque响应绝不作为成功依据。**
3. 再请求最新汇总；读取不到回执或汇总时，界面分别说明未确认或统计读取失败。

诊断记录始终为test并带diagnostic=true，保留在Raw/Audit供核对，服务端排除它，不进入研究统计。可删除这条Raw测试行。

再到真实游戏完成一个词，确认Raw出现一条回答。提交同一词第二次，Raw参与者人数不能增加，Audit新增历史提交。切换test/research会进入独立数据集。

建议用三个独立浏览器配置/测试设备模拟三位参与者，每次真实播放录音后完成作答；少于3名符合规则参与者不显示具体均值。不要用开发者工具复制原始参与者凭据给别人。

断网测试：先加载关卡，再断开网络提交。页面必须显示“端末已保存／Google Sheets未确认”，而非成功。恢复网络后点「保存を確認・再送」或重新打开关卡点「未送信の回答を再送」；成功后Raw仍只有一条该参与者/题目记录，队列应清空。

## 表格内容与删除

- **Raw**：每个studyMode + participantId + recordingId + levelId + levelVersion仅一条当前回答。重答更新本人的当前行；服务器校验参与者凭据，不能仅提供别人的participantId就覆盖。
- **Audit**：所有已接受提交的历史记录。相同submissionId的网络重试不重复追加。
- **_Identities**：匿名ID及凭据的HMAC摘要，普通玩家没有读取接口。

Raw列包含提交ID、服务端接收时间、匿名参与者、模式、录音ID、关卡ID与版本、假名noticed、Pattern、音高、拍长、附加拍、是否播放、作答时长、质量标记和完整研究数据JSON。完整JSON还保存累计播放时间、播放次数、是否播完、是否跳过等。凭据本身不写入Raw/Audit。

**在Raw里删除整条记录，下一次汇总会立刻排除它**，不依赖缓存，也不会从Audit自动恢复。Audit是历史存档，不参与汇总；只删Audit不会改变群体均值。如要彻底移除某位参与者的数据，按匿名ID在Raw和Audit分别删除，是否保留身份摘要由你决定。删除后若参与者主动提交新的回答，将按新提交计入；旧submissionId重试不恢复已删除行。

修改Raw的noticed_json/pattern_json/pitch_json/beats_json/blanks_json、audio_played和response_ms列也会影响下一次汇总；不要修改表头顺序。其他原始字段位于payload_json，手工编辑需保持合法JSON。未知版本、不合法结构及不符合固定纳入规则的行不会纳入。

## 汇总与访问边界

- 普通玩家只获得聚合数值和无内容的提交回执。没有读取Raw/Audit、任意行修改或删除的API。
- 允许玩家持自己的浏览器凭据更新自己的当前回答；这不等于授予表格编辑权限。原始历史保留于Audit。
- JSONP只用于返回汇总及随机提交ID的接收状态，不返回原始回答、匿名ID、凭据或行号，不通过GET修改数据。
- 服务端按白名单验证关卡/录音/版本/Pattern，重新计算质量标记，不相信客户端发来的quality_flag或纳入规则。当前阈值沿用1.5秒作答、0.5秒有效播放、对照题排除等；diagnostic另行排除。与多数人不同不是剔除理由。
- 同一模式/版本的所有合格回答取均值，包含玩家本人；云端不接受按某个参与者任意排除再查询，减少通过差分查询推断个人答案。最小3人仅是基础小样本保护，不是差分隐私保证。
- 匿名凭据依赖本浏览器存储；清除存储、更换浏览器会产生新参与者，原型无法阻止一个人故意注册多个匿名身份。公开匿名接口也不能可靠防刷或抵抗配额滥用。正式大规模研究应增加受控参与码、限流或可信后端。
- Apps Script及Sheets有执行时间/配额限制，适合小规模原型，不作高并发或无条件可用性承诺。

## 已完成与待完成的验证

已完成：服务端本地VM测试覆盖去重/更新、幂等、参与者凭据、模式及版本隔离、删除Raw后即时重算、低样本隐藏、原始API拒绝、诊断排除。浏览器采用三个本机不同来源端口模拟GitHub Pages、Apps Script及重定向后的Googleusercontent，检查无CORS响应头时的POST+JSONP及失败重试。

**尚未完成：真实Apps Script授权部署、真实Google重定向/账户策略及GitHub Pages来源的端到端测试。** 只有部署URL配置并在上面的线上诊断页通过后，才可宣称真实链路验证完成。不能用本地模拟测试冒充线上成功。

## 官方依据

- Apps Script Web Apps：https://developers.google.com/apps-script/guides/web
- Content Service（重定向、JSONP与只读非敏感结果）：https://developers.google.com/apps-script/guides/content
- LockService：https://developers.google.com/apps-script/reference/lock/lock-service
- Script Properties：https://developers.google.com/apps-script/guides/properties

## 实际部署进展

已由研究者提供Web App exec地址并启用网页配置。本地网页与真实Google Apps Script的POST、回执与最新汇总实测成功，诊断不纳入人数、队列为0。GitHub Pages实际来源验证结果见开发日志。表格ID与服务端凭据由研究者在Script Properties管理，不写在公开部署指南中。
