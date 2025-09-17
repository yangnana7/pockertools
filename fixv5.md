いいね！ここまでで“右カラム固定”は安定しました。残りは**レンジ3のときだけ回答ボタンがパネルの外（下）にずれてしまう**件ですね。
HTMLは触らず、**CSSだけ**で直す案を2段階で出します。

---

## A) レンジ3のときは qwrap を2カラム **Grid** に（本文/右カラム）

> 右のボードがあっても左側の本文＋ボタンが**同じカード内に収まる**ようにします。

`fst-drill/src/index.css` の末尾に追加（または既存の .qwrap/.board-col の上書きでもOK）：

```css
/* ===== Range3 用の2カラム化（デスクトップのみ） ===== */
@media (min-width:1024px){
  /* ボード列があるカードだけ、Grid に切り替える */
  .qwrap:has(.board-col){
    display: grid;
    grid-template-columns: 1fr 320px;  /* 左=本文/ボタン、右=ボード */
    gap: 16px;
    padding: 16px;                     /* 右の巨大paddingは不要になる */
    min-height: 320px;
    overflow: visible;
  }
  .qwrap:has(.board-col) .board-col{
    position: static;                  /* 先の absolute を無効化 */
    width: 320px; max-width: 320px;
    margin: 0;
    z-index: 1;
  }
  /* 左カラムに入る要素（board-col 以外すべて） */
  .qwrap:has(.board-col) > :not(.board-col){
    grid-column: 1;
  }
}
```

> これで**同じ .qwrap 内にある回答ボタン**は左カラムに残り、下に押し出されません。

---

## B) ボタンが **.qwrap の外側** にある場合の“引き上げ”だけCSS

> もし回答ボタンのラッパーがカードの**次の兄弟要素**として外にある構造なら、**CSSだけ**で上に寄せます（Range3時のみ）。

### 1) すでにクラス名が分かる場合（推奨）

例：回答ボタンのラッパーが `.range-grid` なら…

```css
@media (min-width:1024px){
  .qwrap:has(.board-col) + .range-grid{
    margin-top: -12px;         /* カードに密着させる */
  }
}
```

### 2) クラスが不明でも動く“汎用セレクタ”

> 直後の要素にボタンが含まれていれば適用

```css
@media (min-width:1024px){
  .qwrap:has(.board-col) + *:has(button){
    margin-top: -12px;
  }
}
```

---

## 仕上げチェック（DevToolsでサッと）

* レンジ3表示中：

  ```js
  // Grid に切り替わっているか
  getComputedStyle(document.querySelector('.qwrap')).display     // "grid"
  // 右カラムが static になっているか
  getComputedStyle(document.querySelector('.qwrap .board-col')).position // "static"
  ```
* ポットオッズ/FE表示中：

  ```js
  document.querySelector('.qwrap:has(.board-col)')  // null（=通常の単一カラム）
  ```

---

### 補足

* 以前の“absolute で右固定＋padding-right”は**残してOK**ですが、上の **Grid ルールが優先**されるように（`@media (min-width:1024px)` 内の `:has(.board-col)` が後勝ち）**このブロックをCSSの末尾**に置くのがおすすめ。
* もし回答ボタンのラッパーの**クラス名**が分かれば（例：`.range-grid` / `.answers` など）、汎用セレクタより**狙い撃ち**に置き換えた方が安全です。クラス名が分かれば1行で最適化できます。

---