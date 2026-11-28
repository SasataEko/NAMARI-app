# Mode1 アクセント初期表示（2026-11-28）

正常な読み方（normalAccent）と研究者の録音分析の正解（pattern）を分けました。patternは変更していません。
src/data/accentBaseline.js を参照。各問題のnormalAccent / defaultAccent指定があれば語彙の参照値より優先します。

| 単語 | 初期表示 | 参照 |
|---|---|---|
| からだ | LHH | 国際交流基金『まるごと』初級1語彙索引、平板 |
| くすり | LHH | 同上、平板 |
| ぱいろっと | HLLLL | NHK2016に基づく研究の表6で1型優先（3型も収録） |
| きんめだる | LHHLL | 国際交流基金『まるごと』初級2語彙索引、きんメ￢ダル |
| とおりみち | LHHLL（暫定） | 辞書の検索結果に出た3型を仮設定。一次アクセント資料で確認未完了、reviewRequired=true |

出典：
- 国際交流基金『まるごと』初級1：https://marugoto.jpf.go.jp/assets/docs/download/elementary1_a/MarugotoElementary1ActivitiesVocabularyIndex2_CNT.pdf
- 初級2（アクセント記号を保持した版）：https://www.marugoto.org/assets/docs/download/elementary2_c/MarugotoElementary2CompetencesVocabularyIndex_IT.pdf
- 外来語アクセントの辞書異形を掲載した論文、表6：https://journal.kci.go.kr/JJC/archive/articlePdf?artiId=ART002501066
- とおりみちの暫定検索表示：https://www.romajidesu.com/vi/dictionary/meaning-of-とおり.html
- とおりみちは確定値として正式研究に使う前に資料で照合してください。見つからなかった出典を確認済みとは扱っていません。

ぱいろっとの3型は、通常はLHHLLに相当します。ただし本ゲームでは既存の仕様に従い促音「っ」を前の「ろ」と連動させるため、別案を表示するとLHHHLになります。初期値はこの問題を避ける1型HLLLLを採用しました。これは唯一の標準という意味ではありません。

必要変更数は、正常値と録音分析で高低が違う、独立に操作可能な文字数です。「っ」「ー」の自動連動分は二重に数えません。各拍の全体照合による正解判定は従来どおりです。normalAccent不明の新規問題はLHH…を暫定表示するため、正式に使う前にnormalAccentを指定してください。

感想は送信成功が進行条件ではありません。「アクセント篇に挑戦する」などの継続ボタンは送信中/失敗時にも利用できます。選択済みなら送信を試みつつ進行し、未回答は草稿として残します。送信済みとは誤表示せず、既存の同じUUIDの再送キューを維持します。スキップボタンはなくしました。