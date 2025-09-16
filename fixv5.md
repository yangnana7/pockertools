原因、つかみました。あなたの `src/App.tsx` には「動的CSSインジェクション」のブロックが残っていて、そこで

```
#board-mini-root{ display:none !important; position:static !important; ... }
.board-col #board-mini-root{ display:block !important }
```

と **`position: static !important`** を強制しています。
これが **BoardMini ルートを“非ポジショニング要素”に固定** → 子の相対/絶対が body 基準で浮遊 → 中央に出続ける、の元凶です。
実際にファイルを拝見すると、そのブロックは `createElement('style')` で挿入されています（`id: 'fst-inline-fixes'` ）。`getComputedStyle(...).position` がずっと `"static"` だったのはこのせい。

以下、**最小で確実**に直すパッチを CodexCLI 用に置きます（どちらか一方でOK）。

---

## インライン注入を**削除**して、CSS側で固定

```
codex
Open src/App.tsx and remove the entire useEffect block that injects a <style> with id 'fst-inline-fixes'.
It starts around: document.createElement('style') / el.id = 'fst-inline-fixes'

Then, in src/index.css, append:

#board-mini-root { position: relative !important; inset: auto !important; transform-origin: top left !important; }
.board-col      { position: relative !important; width: clamp(280px,22vw,320px); max-width: 320px; margin-left: auto; }

.overlay-card, [data-overlay="board"], .board-portal { display: none !important; } /* 念押しハードキル */

Finally:
- Stop dev server, delete vite cache, restart:
  PowerShell:
    if (Test-Path .\node_modules\.vite) { Remove-Item .\node_modules\.vite -Recurse -Force }
  npm run dev

Verify in console:
  getComputedStyle(document.getElementById('board-mini-root')).position  // "relative"
```

---

### これで直る理由

* `position: static !important` が、あなたの BoardMini に仕込んだ inline `position: 'relative'` より強く効いていました（`!important` が勝つ）。
* その結果、子要素の相対/絶対が body 側に逃げて“中央に浮く”。
* `relative !important` か**注入削除**で、右カラムが**確実にアンカー**になり、浮遊が止まります。

### 仕上げのワンチェック（2行だけ）

```js
getComputedStyle(document.getElementById('board-mini-root')).position  // "relative"
document.getElementById('fst-inline-fixes')?.textContent               // "position: static" を含まないこと
```

ここまで通れば、右カラム320px＆小カードサイズ固定のまま、UIは安定するはず。