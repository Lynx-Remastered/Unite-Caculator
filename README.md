# Unite Calculator

ポケモンユナイト向けの計算・比較ツールです。ビルド工程を持たない静的サイトなので、`index.html` と各アセットをそのまま GitHub Pages へ配信できます。

## ローカル確認

JSON を `fetch` するため、`index.html` を直接開かずローカルサーバー経由で確認します。

```powershell
npm.cmd start
```

ブラウザで `http://localhost:8000` を開いてください。macOS/Linuxでは `npm start` でも実行できます。

変更後の静的チェックは次のコマンドで実行できます。

```powershell
npm test
```

## 構成

```text
index.html                 画面のHTMLと初回テーマ適用
assets/
  css/
    base.css               色・テーマ・全体の基本スタイル
    layout.css             ナビゲーションと画面レイアウト
    controls.css           入力欄・技選択などの共通部品
    results.css            計算結果と補正表
    rankings.css           各ランキング画面
    emblems.css            サポートメダル編集UI
    dialogs.css            読み込み表示とフィードバック画面
    responsive.css         画面幅別の調整
  js/
    config.js              データ参照先・定数・共有状態
    ui.js                  翻訳、共通UI、ナビゲーション
    calculator-core.js     選択値、技データ、計算の共通基盤
    damage-ranking.js      ダメージ・回復ランキング
    slow-ranking.js        減速ランキング
    acceleration-ranking.js 加速ランキング
    support-calculators.js シールド・回復・メダルUI
    calculations.js        ステータス補正と最終計算・描画
    feedback.js            フィードバック内容の生成
    events.js              DOMイベントの接続
    bootstrap.js           JSON読込とアプリ起動
data/                      アプリが参照するJSONデータ
scripts/                   ローカル配信・データ更新・静的検証
```

CSS と JavaScript は `index.html` の記載順で読み込まれます。CSS のカスケードと、従来のグローバルスコープにある関数間の依存を保つため、ファイルを追加・移動するときは読み込み順も確認してください。`bootstrap.js` は常に最後に読み込みます。

## データ更新

```powershell
node scripts/update_unitedb_data.js
node scripts/update_patch_notes.js
node scripts/update_wiki_move_descriptions_ja.mjs
```

更新後は `npm test` を実行し、JSON形式とアセット参照を確認してください。
