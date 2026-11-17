# アプリを足す

1. `apps/<id>/index.html` を置く。`/apps/<id>/` で開く。一覧へ戻るリンクは `../`。
2. サムネイルは `apps/<id>/thumbnail.webp` に置く。
   - 形式は WebP。比率はカードと同じ 16:10。
   - 幅はカードの表示幅の約2倍。目安は 800×500 px。
   - 品質を調整して 100KB 以下にする。
3. `apps/index.html` の `ul.apps` に `li` を1つ足す。`img` の `src` にサムネイルのパスを書き、`alt`、`width="800"`、`height="500"`、`loading="lazy"` を付ける。画像がないときは `span.thumb` を空にする。空だと「サムネイル」と出る。
