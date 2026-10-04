# Do You Have? Match

小学4年生の外国語活動「Do you have a ...?」で使う、対面会話のためのカードゲームです。アプリには自分の持ち物だけが表示されます。相手の持ち物は、実際に質問して確かめます。

## ルール

1. 4枚のアイテムと位置を覚えて **I'm ready!** を押します。
2. **START** でタイマーを始め、相手に英語で質問します。
3. 相手が持っていたアイテムの位置を思い出してカードを開きます。間違えて閉じると **+5秒** です。
4. 同じ相手と3枚以上一致したら **MATCH!**。相手を変えるときは **NEXT PERSON** を押します。タイマーは続きます。

配布は5種類（pencil, pen, ruler, eraser, glue）から4種類を選び、位置を混ぜます。任意の2人に必ず3種類以上の共通アイテムがあります。端末間の通信、ログイン、ネット接続はゲーム中に不要です。

## Web版

公開URL: https://ryonma-git.github.io/DoYouHave-Match/

ローカルではリポジトリのルートで `python3 -m http.server 8000 --directory docs` を実行し、`http://localhost:8000/` を開きます。静的ファイルのみで動作します。

## Swift版

`swift/DoYouHaveMatch.xcodeproj` をXcodeで開き、iPadシミュレータまたはiPadで実行します。iPadOS 16以上を対象とします。Xcodeプロジェクトの再生成には `cd swift && xcodegen generate` を使用します。実機では開発用署名の設定が必要です。

## テスト

`npm test` でWebのゲームロジックを確認します。Swift版とWeb版は同じ5種類のアイテム、状態遷移、+5秒、3枚MATCHを実装しています。

## 構成

- `swift/`: SwiftUI iPadアプリ、ゲームモデル、Xcodeプロジェクト
- `docs/`: GitHub Pages向け静的Web版
- `tests/`: Webゲームロジックのテスト
- GitHub Pagesは `main` ブランチの `/docs` から公開

授業前に、学校のiPadで公開URLを開き、横向き表示とタッチ操作を確認してください。ネットが使えない場合は、Swift版を事前にインストールしておく必要があります。
