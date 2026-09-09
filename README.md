# Unite Calculator

ポケモンユナイト向けの計算・比較ツールです。ビルド工程を持たない静的サイトなので、`index.html` と各アセットをそのまま GitHub Pages へ配信できます。

上部の「BGM OFF」を押すとBGMをループ再生し、「BGM ON」で停止できます。初期音量は20%で、変更した音量はブラウザに保存されます。画面を切り替えても再生は続きますが、ページを開いた直後は自動再生しません。音源は `index.html` の `bgmAudio` に指定した外部MP3 URLから読み込みます。

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
    bgm.css                BGM操作と音量調整の表示
    responsive.css         画面幅別の調整
  js/
    config.js              データ参照先・定数・共有状態
    patch-translations.js  バランス調整の確認済み日本語訳
    ui.js                  翻訳、共通UI、ナビゲーション
    calculator-core.js     選択値、技データ、計算の共通基盤
    damage-ranking.js      ダメージ・回復ランキング
    slow-ranking.js        減速ランキング
    acceleration-ranking.js 加速ランキング
    support-calculators.js シールド・回復・メダルUI
    calculations.js        ステータス補正と最終計算・描画
    feedback.js            フィードバック内容の生成
    events.js              DOMイベントの接続
    bgm.js                 BGM再生・停止と音量設定の保存
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

更新後は `npm test` を実行し、JSON形式・アセット参照・バランス調整の日本語表示と、4種類のランキングの回帰テストを確認してください。回帰テストは同梱データから実際の計算関数を動かし、効果の対象・強化前後・回数・減衰・計算結果を検証します。ゲームデータの更新で期待値が変わる場合は、変更後の式や仕様を確認してからテストの期待値も更新してください。

バランス調整の取得元データは検証用にそのまま保持しますが、画面の本文やツールチップには英語の原文を表示しません。定型的な数式は `ui.js` で日本語化し、個別の説明・条件・補足は `patch-translations.js` の `PATCH_TEXT_JA`、技名の別表記は `PATCH_NAMES_JA` に登録します。キーには、Markdownを除去した原文（複数行をまとめる場合は空白で連結した原文）を使います。

訳文では、数値・対象・発動条件・不確かな情報を保持し、取得元の感想や予測は「取得元の解説」などとして変更内容と区別してください。未対応の文言は画面で日本語訳の確認中と表示され、テストが該当箇所を報告します。訳文を追加してテストを通してから公開してください。
