# OIDC Lab

日本語の解説を読みながら、OpenID Connect（OIDC）の認証リクエストを作成し、応答を確認するための学習・検証用ツールです。

HTML・CSS・JavaScriptのみで動作します。ビルドや専用のバックエンドは不要です。

> **現在は試作段階です。** 認証処理に既知の未修正事項があります。本番環境の認証クライアントとしては使用せず、テスト用のアプリとアカウントで検証してください。

## できること

- 日本語の説明を見ながら認証パラメータを入力
- 認証URLのプレビューとコピー
- PKCE（S256）のcode verifierとcode challengeの生成
- 認証サービスへのリダイレクト
- query／fragmentで返された認証応答の表示とstateの照合
- 戻り先URLを貼り付けて応答を解析
- ブラウザから認可コードをトークンへ交換
- ID Tokenのペイロードをデコードして表示

## ローカルで起動する

Python 3が使える環境では、次のコマンドで起動できます。

```bash
cd ~/git/oidclab
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで <http://localhost:8000/> を開きます。終了するときは、ターミナルで `Ctrl+C` を押してください。

`file://` でHTMLを直接開く方法は使用せず、localhostまたはHTTPSで配信してください。PKCEのハッシュ計算にはWeb Crypto APIを使用します。

## 認証を試す

1. 認証サービスで、テスト用の公開クライアント（Client Secretを使わないアプリ）を登録します。
2. このツールのURLを、許可するRedirect URIに登録します。ローカルの場合は `http://localhost:8000/` です。末尾のスラッシュも含めて一致させてください。
3. 認証サービスのAuthorize URIと、発行されたClient IDを入力します。
4. 最初は `response_type=code`、PKCE有効、`response_mode=query` で試します。Scopeには `openid` を含めます。
5. 「認証リクエストを送信」を押し、認証サービス側でログインします。
6. 同じタブでこのツールへ戻ると、応答とstateの照合結果が表示されます。
7. トークン交換を試す場合はToken URIを入力します。認証サービス側で、このツールのオリジンからのCORSアクセスが許可されている必要があります。

「サンプルを入力」で入るURLやClient IDは入力例です。実際の認証サービスの値へ変更してください。URLのコピーだけでは、応答照合に使う送信記録は作成されません。

## GitHub Pagesで公開する

このリポジトリの3ファイルをルートに置いたまま公開できます。

1. GitHubの **Settings → Pages** を開きます。
2. **Build and deployment → Source** を **Deploy from a branch** にします。
3. ブランチを `main`、フォルダを `/ (root)` にして保存します。
4. 配置完了後、Pages画面に表示されるURLへアクセスします。
5. **Enforce HTTPS** が有効なことを確認します。
6. 認証サービスのRedirect URIと、必要なCORS許可を公開先に合わせます。

このリポジトリの標準URLは `https://ryujisnote.github.io/oidclab/` です。独自ドメインを設定している場合は、Pages画面で最終的なURLを確認してください。

公開先を変更したら、フォームに保存済みのRedirect URIも確認してください。以前の値が残っている場合は手動で変更します。

独自ドメインの設定は [GitHubの公式手順](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) を参照してください。GitHub Pagesには、このツール独自の利用者認証やアクセス制限はありません。

## 制約とデータの扱い

- `form_post` は未対応です。queryまたはfragmentを使います。
- Client Secretを使うトークン交換には対応していません。
- ブラウザからの通信は、認証サービス側のCORS設定に制約されます。
- JWTはデコードのみです。署名・issuer・audience・有効期限は検証しません。画面上のstate／nonce照合だけでログインの正当性を判断しないでください。
- 入力設定、state、nonce、PKCE verifier、送信記録を、このタブのsessionStorageに保存します。
- アプリのコードは応答やトークンを永続保存しません。ただし、ブラウザのセッション復元などの挙動はアプリ側で制御していません。
- query方式の認証応答は、URLの一部としてホスティング先へ送られます。ホスティング先のログに残らないことは保証できません。
- トークン交換のリクエストは、入力したToken URIへブラウザから直接送信します。

## 既知の未修正事項

2026年10月28日時点で、以下の問題は未修正です。

- 連続した認証リクエストで、state・nonce・PKCE verifierが再利用されます。
- トークン交換直前に、有効期限と現在の送信記録との対応を十分に再確認していません。
- 応答URLの照合はoriginとpathnameのみで、Redirect URIの固定クエリまでは照合しません。
- 「応答を消去」は画面の応答を消しますが、sessionStorage内の送信記録やverifierは消しません。
- 画面内の「サーバーには保存しません」という説明は、ホスティング先のアクセスログまで含む保証ではありません。

この文書は問題を記録したもので、上記の修正を実装したものではありません。

## ファイル構成

| ファイル | 内容 |
| --- | --- |
| `index.html` | フォーム、使い方、認証応答の表示領域 |
| `style.css` | 配色とレスポンシブレイアウト |
| `app.js` | URL生成、PKCE、応答解析、トークン交換 |
| `README.md` | 使い方と現在の制約 |
| `LICENSE` | MITライセンス |

## 参考資料

[OIDC Debugger](https://oidcdebugger.com/) を参考に作成した独立した実装です。

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE — RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html)
- [OAuth 2.0 Security Best Current Practice — RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)

## ライセンス

[MIT License](LICENSE)。Copyright (c) 2026 Ryuji Coffee。
