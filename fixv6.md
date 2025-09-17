修正対象リポジトリの `fst-drill` フォルダは Vite+React 製の簡易アプリでした。`src/index.css` にカラーテーマやレイアウトの大部分が記述されており、`--bg` や `--panel` 等の CSS 変数でダークテーマを定義しているものの、一部の要素には `rgba(255,255,255,0.1)` などの半透明白が直接指定されているため、スクリーンショットのようにコンテンツ部だけが白く浮いてしまいます。質問カードや回答ボタンのレイアウトも grid の最小幅が狭すぎるため、4択ボタンが縦長に並んでしまい UI が崩れています。TypeScript 側は React フックを素直に使っており、致命的なバグは見当たりませんでした。

### バグ状況の確認

* `src/index.css` の `.panel` や `.card` の背景色に `rgba(255,255,255,0.1〜0.08)` が指定されている。のように背景が白っぽく目立っておりダークテーマと調和していません。
* `.grid` クラスで `grid-template-columns:repeat(auto-fit,minmax(160px,1fr))` としているため、回答ボタンが細長く縦方向に並んでしまい、ボード画像と重なって崩れています。
* ボードプレビューを右上に固定するために `.qwrap .board-col` を `position:absolute` で配置していますが、幅指定（max-width:320px）などが重複しており、小さな画面では隠れてしまいます。
* 統計表示パネルやタイマーのフォントサイズ・色が背景と近く読みづらい箇所があります。

### UI 全体の改善案（CodexCLI への指示書）

以下の内容を `fst-drill/src/index.css` に対して反映すると、全体的に統一感のあるダークテーマになり、レイアウト崩れも解消できます。

1. **カラーバリエーションの統一**
   ルート変数で定義済みの `--panel` や `--bg` を活用し、半透明白を直接指定している部分を置き換えます。具体的には次のように変更します。

   ```css
   /* 質問・回答カード全体の背景 */
   .panel {
     /* 既存：background: rgba(255,255,255,0.1); */
     background: var(--panel);
     border-radius: 16px;
     border: 1px solid rgba(255,255,255,0.05);
   }

   .card {
     /* 既存：background: rgba(255,255,255,0.04); */
     background: var(--panel);
     border: 1px solid rgba(255,255,255,0.08);
     border-radius: 14px;
     margin: 12px 0;
   }

   /* 回答ボタン */
   .opt {
     background: rgba(255,255,255,0.03); /* 透過度を落として背景とのコントラストを確保 */
     border: 1px solid rgba(255,255,255,0.08);
     border-radius: 10px;
     transition: background-color 0.2s ease;
   }
   .opt:hover:not(.disabled) {
     background: rgba(34,197,94,0.15); /* ホバー時にアクセント色の薄い背景 */
   }
   ```

2. **レイアウト崩れの修正**
   回答ボタンが一列に伸びないよう `grid-template-columns` の最小値を広げます。またボードプレビューが絶対位置で狭い画面に隠れないようにします。

   ```css
   /* 質問と選択肢エリア */
   .grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* 160px → 200px に拡大 */
     gap: 12px;
     margin-top: 16px;
   }

   /* 右のボードプレビューのレイアウト改善 */
   .qwrap .board-col {
     position: static;      /* 絶対位置指定を外す */
     width: auto;
     max-width: 320px;
     margin-left: auto;
   }
   @media (max-width: 1024px) {
     .qwrap {
       flex-direction: column;
     }
     .qwrap .board-col {
       margin: 0 auto;
       max-width: 280px;
     }
   }
   ```

3. **文字の可読性向上**
   タイマーや統計表示など、背景色とのコントラストが低い部分はフォントサイズと色を調整します。

   ```css
   .timer {
     font-size: 32px;
     color: var(--text);
   }
   .stats {
     font-size: 14px;
     color: var(--muted);
   }
   ```

4. **長文の折り返し対応**
   日本語で長い説明文が含まれるため、テキストがはみ出さないようにします。

   ```css
   .question,
   .stats,
   .opt {
     word-break: break-word;
     overflow-wrap: anywhere;
   }
   ```

5. **アクセシビリティ向上**
   押下可能なボタンにはカーソルスタイルやフォーカスリングを追加します。

   ```css
   .btn, .opt {
     cursor: pointer;
   }
   .opt:focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
   }
   ```

上記の変更によって、白いカードが悪目立ちする問題と回答ボタンのレイアウト崩れが解消し、全体の色調が暗色系で統一されます。`main.tsx` や `App.tsx` に大きなロジックバグは見られなかったため、CSS の改善が UI 崩れの主な対策となります。これらの変更を CodexCLI で適用して再ビルドし、ブラウザで確認してみてください。
