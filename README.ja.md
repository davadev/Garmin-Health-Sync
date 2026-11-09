[English](README.md) · [Deutsch](README.de.md) · [中文](README.zh.md) · **日本語** · [Español](README.es.md) · [Français](README.fr.md)

# Garmin Health Sync

**デイリーノートの相棒。** Garmin Health Sync は、Garmin ウォッチの大切な数値を Obsidian のデイリーノートに取り込み、必要に応じて、あなた自身の普段の状態と比べた今日の調子を表示します。Garmin Connect のコピーではありません。目的は、その日の判断を的確に行う手助けをすることです。

**2つの使い方**

- **シンプルに使う。** サインインして、必要な指標をオンにします。指標は Dataview で検索できるプロパティとしてデイリーノートに書き込まれ、評価はあなた自身が行います。
- **ノートの隣にビジュアルを加える。** 設定で**サイドパネル**をオンにすると、コンディション、回復、睡眠、エネルギー、活動、トレーニングのカードが、あなた自身の普段の範囲と比べて表示されます。各カードの電球は、今日のデータが示すことを教えてくれます。[各カードの内容と計算方法](docs/panel-cards.md)。

<p>
<img src="docs/screenshots/panel-today.png" width="280" alt="コンディションと回復のカード">
<img src="docs/screenshots/panel-insights.png" width="280" alt="電球の下に表示される、データが示すこと">
<img src="docs/screenshots/panel-today-dark.png" width="280" alt="ダークテーマでの同じカード">
</p>

> **デスクトップとモバイルで動作します**（Windows、macOS、Linux、iOS、Android）。このプラグインは Garmin Connect の内部APIを使用します。公式のサードパーティAPIはありません。Garmin のメールアドレスとパスワード（2段階認証を使っている場合は確認コードも）でサインインします。Garmin がその試行をブロックした場合は、ブラウザでのサインインを代替手段として利用できます。

## ドキュメント

- [設定](docs/settings.md) — すべての設定
- [指標](docs/metrics.md) — ノートに書き込まれるすべてのプロパティ
- [サイドパネルのカード](docs/panel-cards.md) — 各カードが示すこと、どの日々の判断に役立つか、計算方法
- [電球の下の解釈](docs/panel-insights.md) — 各メッセージが表示される条件とその根拠
- [履歴ノートとバックフィル](docs/history.md) — 履歴の保持と構築の方法
- [自己ベスト](docs/personal-best.md) — ベストな日の目印と全期間の中での順位の求め方
- [トラブルシューティング](docs/troubleshooting.md) — サインイン、欠けている指標、パネル、ノート、バックフィル
- [変更履歴](CHANGELOG.md) — 各リリースでの変更点

## 機能

- **起動時の自動同期** — 過去7日間をチェックし、欠落している健康データを補完
- **ノート待機モード** — 自動同期が、デイリーノートを自分で作成せず、他のツール（Templater、Calendar、外部同期）が作成するのを待つように設定できます
- **手動同期** — コマンドパレットから開いている Daily Note を同期
- **バックフィル** — 日付範囲の一括同期（例：過去3ヶ月分）
- **30以上の指標** — 歩数、睡眠スコア、HRV、ストレス、Body Battery、SpO2、体重など
- **アクティビティ追跡** — 各ワークアウトが読みやすいサマリーとして表示
- **ワークアウトの場所** — 最初の GPS アクティビティから逆ジオコーディングで取得した地名
- **スマート検出** — Periodic Notes または内蔵の Daily Notes プラグインから Daily Notes のパスとフォーマットを自動検出
- **サブディレクトリ対応** — ネストされたフォルダ内の既存 Daily Notes を検索（例：`Journal/2024-07/`）。ファイル名形式に `/` を含めると日付ごとのサブフォルダを作成（例：`YYYY/YYYY-MM-DD` → `Journal/2026/2026-08-04.md`）
- **言語自動検出** — UI 言語は Obsidian の言語設定に基づいて自動設定（EN、DE、ZH、JA、ES、FR）
- **オプションの構造化データ** — 高度な Dataview クエリ用の機械可読 `trainings` フィールド
- **プロパティのプレフィックス** — 他のプラグインとの名前の衝突を避けるため、すべての frontmatter プロパティに `ohs_` プレフィックスを付けられます（オプション）
- **ライフスタイルログ（習慣）** — Garmin Connectに記録した習慣（はい／いいえ、またはコーヒーの杯数のような回数）を `lifestyle_<名前>` プロパティとして任意で同期します。サイドパネルの「習慣」カードは各習慣を表示し、十分なデータがあれば、その翌夜のHRVと安静時心拍数の様子も示します
- **ヘルスサイドパネル** — 回復・睡眠・エネルギー・活動・体力・トレーニングのカードを、あなた自身の普段の範囲と比べて表示する右サイドバー（オプション）。カードの電球をタップすると、データが示すことと計算方法が分かります。**設定 → Garmin Health Sync → サイドパネル**で有効にします。HRVと安静時心拍数のカードは直近14日と7日平均を普段の週と比べて表示し、コンディションはその週でHRVを判断して、きついトレーニングの翌朝を説明します
- **履歴ノート** — 取得した各日を月ごとの小さな Markdown ノートに保存できます（オプション）。デイリーノートがない日でもパネルが動作し、データは Vault と一緒に同期されます
- **デイリーノートのプロパティ** — ノートを開くときにプロパティブロックを折りたたむか、パネルがすでに表示している Garmin のプロパティを隠します

## Frontmatter 出力

### 指標

```yaml
---
steps: 15185
resting_hr: 69
sleep_score: 81
sleep_duration: 7h 43min
hrv: 39
stress: 30
vo2_max: 48
workout_location: Bad Honnef, Deutschland
---
```

**ボディバッテリー:** `body_battery` は Garmin の *charged* 値で、その日のボディバッテリー増加分の合計（主に睡眠中の回復）であり、現在のレベルではありません。その日の最低値と最高値（Garmin アプリの履歴に表示される値）が必要な場合は `body_battery_min` と `body_battery_max` を有効にしてください。

### アクティビティ

各ワークアウトはサマリー文字列を持つ frontmatter キーとして記録されます：

```yaml
---
hiking: 8.2 km · 157min · Ø105 bpm · 696 kcal
e_bike: 22.1 km · 65min · Ø112 bpm · 420 kcal
---
```

実際にワークアウトがあった日のみアクティビティキーが追加されます。プラグインはノートの既存コンテンツを上書きしません。

### トレーニング（オプション、機械可読）

設定で「機械可読トレーニング」を有効にすると、Dataview クエリ用の構造化 `trainings` フィールドが追加されます：

```yaml
---
trainings:
  - type: hiking
    category: outdoor
    distance_km: 8.2
    duration_min: 157
    avg_hr: 105
    calories: 696
  - type: e_bike
    category: cycling
    distance_km: 22.1
    duration_min: 65
    avg_hr: 112
    calories: 420
---
```

## 要件

- **Obsidian**（Windows、macOS、Linux、iOS、Android）
- Garmin Connect にアクセスできる **Garmin アカウント**
- **Daily Notes** または **Periodic Notes** プラグインが有効（または設定でパスを手動指定）

## インストール

### Community Plugins から（推奨）

1. Obsidian 設定 → Community Plugins → ブラウズ を開く
2. "Garmin Health Sync" を検索
3. プラグインをインストールして有効化
4. プラグイン設定で Garmin Connect にログイン

### 手動インストール

1. [最新リリース](https://github.com/davadev/Garmin-Health-Sync/releases)から `main.js` と `manifest.json` をダウンロード
2. Vault 内に `.obsidian/plugins/garmin-health-sync/` フォルダを作成
3. 両方のファイルをそのフォルダにコピー
4. 設定 → Community Plugins でプラグインを有効化

## 使い方

### サインイン

プラグインの設定を開き、**Garmin Connect** を選んで、Garmin のメールアドレスとパスワード（2段階認証を使っている場合は確認コードも）を入力します。デスクトップでもモバイルでも同じ方法でサインインできます。

Garmin は同じデバイスからの繰り返しのサインイン試行を制限することがあります。その場合、プラグインは次に試せるまでのカウントダウンを表示します。サインインがブロックされたときは、代わりに**ブラウザでサインイン**を使ってください。ブラウザで Garmin のページにサインインし、`ST-…` を含むページのテキストをコピーして、プラグインのクリップボードボタンをタップします（入力欄に貼り付けることもできます）。一度サインインすれば、プラグインが自動で接続を更新するため、再サインインが必要になることはほとんどありません。

### ノートの保存場所

**デイリーノートのパス**がフォルダ、**デイリーノートの形式**が [moment.js](https://momentjs.com/docs/#/displaying/format/) 構文によるファイル名で、標準の Daily Notes プラグインと同じ規則です。形式自体に `/` を含めると日付ごとのサブフォルダに配置でき、角かっこ内の文字列はそのまま使われます:

| パス | 形式 | 結果 |
| --- | --- | --- |
| `Journal` | `YYYY-MM-DD` | `Journal/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM-DD` | `Journal/2026/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM/YYYY-MM-DD` | `Journal/2026/2026-08/2026-08-04.md` |
| `Journal` | `YYYY-MM-DD [Workout]` | `Journal/2026-08-04 Workout.md` |

存在しないサブフォルダは自動的に作成されます。

### 自動同期

Obsidian 起動時に、プラグインが過去7日間をチェックし、欠落している健康データを自動で補完します。操作は不要です。既定では、デイリーノートが無い場合は自動的に作成します。

他のツールがデイリーノートを管理している場合（Templater、Calendar プラグイン、外部同期など）は、設定の **デイリーノートがない日** を **その日をスキップ** にしてください。自動同期は実体のある（空でない）デイリーノートが存在するまで待機し、現れた時点で同期します。0 バイトの空のプレースホルダーは無視されます。**履歴ファイルに保存** にすると、ノートがない日にはノートを作成せず、その日を履歴ノートに保存します（下記参照）。手動同期は常に開いているノートに書き込みます。

### 手動同期

Daily Note を開き、コマンドパレット（Cmd/Ctrl+P）から **Garmin Health Sync: Sync current note** を実行します。

### 過去データのバックフィル

Garminの数年分のデータがありますか？ **ヘルスデータをバックフィル**で任意の期間を取得できます。

1. コマンドパレット（Cmd/Ctrl+P）を開き、**「ヘルスデータをバックフィル」**を検索
2. 開始日と終了日を選ぶか、**データの始まりまで**をオンにして最大5年前までさかのぼり、データが始まったところで止める
3. デイリーノートがない日の扱い（**デイリーノートがない日**）を選ぶ：ノートを作成、履歴ファイルに保存、またはスキップ
4. **完全な日ももう一度取得**をオンにすると、すでにある日を上書き

日付は新しい日から順に、Garminが必要とするレート制限を守って取得されます。画面上部の通知に日付、完了した日数、残り時間と**停止**ボタンが表示され、デスクトップではステータスバーにパーセントも出ます。通知をクリックで消した場合は、コマンド**実行中のバックフィルの進捗を表示**（実行中のみ表示）またはステータスバーのクリックで戻せます。バックフィルは同時に1つだけ実行されます。停止または中断したバックフィルは、再起動後に続きから再開します。Garminの失敗は再試行され、以前のバックフィルが有効なすべての指標で取得済みの日は、まだ変わる可能性のある直近3日を除いてスキップされます。

### ヘルスサイドパネル

リボンのアイコンまたはコマンド **ヘルスパネルを開く** で開きます。開くと自動でオンになり、事前の設定は不要です（設定の **サイドパネル** でオフにできます）。カードは今日をあなた自身の普段の範囲（過去30日）と比べ、ノートを変更することはありません。日付をタップして日を選び、矢印で1日ずつ移動し、鉛筆ボタンでカードをドラッグして並べ替えられます。各カードには設定にスイッチがあり、そのカードに必要な指標も表示されます。カードの電球をタップすると、**データから分かること**（あなた自身のデータに基づく理由と対策）と **見方** が表示されます。パネルは医療上のアドバイスではありません。設定で生年（年のみ）を入力すると、心拍ゾーンと年齢に応じた目標が使えます。 [各カードの内容と計算方法](docs/panel-cards.md)も参照してください。

<p>
<img src="docs/screenshots/panel-hydration.png" width="280" alt="解説付きの水分補給カード">
<img src="docs/screenshots/panel-sleep.png" width="280" alt="睡眠と睡眠ステージ">
<img src="docs/screenshots/panel-energy.png" width="280" alt="ボディバッテリー、ストレス、水分補給">
<img src="docs/screenshots/panel-training.png" width="280" alt="歩数、負荷バランス、週間負荷、セッション">
</p>

### 履歴ノート

**デイリーノートがない日**を**履歴ファイルに保存**にすると、取得した各日がデイリーノートのフォルダ内の月ごとの小さなノート（`Garmin history/Garmin history 2026-10.md`、1日1行）にも保存されます。通常のMarkdownなのでVaultと一緒に同期され、ノートのない日はパネルがそれを読みます。コマンド**デイリーノートから履歴を取り込む**は、既存のノートのGarmin値をそこにコピーします。バックフィルは、データの始まりまで一度に埋めることもできます（**データの始まりまで**）。デイリーノートのフォルダを変えると、履歴ノートも一緒に移動します。

### デイリーノートのプロパティ

**デイリーノートのプロパティ** の設定では、デイリーノートを開くときにプロパティブロックを折りたたむ、プラグインが書き込んだプロパティ（パネルが表示します）を隠す、またはその両方を選べます。ノートから何も削除されません。 折りたたみと非表示は、コミュニティプラグイン [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) と [Extended Properties](https://obsidian.md/plugins?id=extended-properties) の考え方に沿っています。クレジットを参照してください。

## アクティビティキーの正規化

Garmin の `typeKey` 値はより簡潔な正規キーに変換されます：

| プロバイダーキー | 正規キー | カテゴリ |
|---|---|---|
| `e_bike_fitness` | `e_bike` | cycling |
| `e_bike_mountain` | `e_mtb` | cycling |
| `resort_skiing_snowboarding` | `skiing` | winter |
| `backcountry_skiing_snowboarding` | `backcountry_skiing` | winter |
| `stand_up_paddleboarding` | `sup` | water |
| `fitness_equipment` | `gym_equipment` | gym |

その他の Garmin キーはそのまま使用されます（例：`hiking`、`running`、`cycling`、`swimming`、`strength_training`、`yoga` など）。

### アクティビティカテゴリ

各アクティビティにはカテゴリが割り当てられます：

| カテゴリ | 例 |
|---|---|
| `cycling` | cycling, e_bike, e_mtb, mountain_biking, indoor_cycling, road_biking, virtual_ride |
| `running` | running, trail_running, treadmill_running, indoor_running, ultra_run |
| `walking` | walking, indoor_walking |
| `outdoor` | hiking, mountaineering, rock_climbing, bouldering |
| `swimming` | swimming, lap_swimming, pool_swimming, open_water_swimming |
| `winter` | skiing, backcountry_skiing, cross_country_skiing, snowboarding |
| `water` | sup, rowing, kayaking, paddling, surfing, sailing |
| `gym` | strength_training, gym_equipment, elliptical, yoga, pilates, hiit, indoor_cardio |
| `racket` | tennis, badminton, squash, table_tennis, pickleball |
| `team` | soccer, basketball, volleyball, rugby |
| `recovery` | breathwork, meditation, stretching, mobility（負荷には含めません） |
| `other` | golf, multi_sport, triathlon |

新しいスポーツには Garmin が付けるサフィックス（`kayaking_v2`、`skate_skiing_ws`）が付きます。名前とカテゴリではサフィックスを無視するため、通常のスポーツと同じに扱われます。セッションにはプラグインの言語でスポーツ名が表示されます。ここに載っていないスポーツは読みやすい文字で表示され、`other` として扱われます。週間負荷カードは、ランニング、サイクリング、ウォーキング、アウトドア、水泳の距離を追跡します。

## データとプライバシー

このプラグインは、2つの外部サービスへネットワークリクエストを行います。

- **Garmin Connect** — プラグインにメールアドレスとパスワード（必要な場合は確認コードも）を入力します。これらは Garmin のサインインサーバー（`sso.garmin.com`、中国向けは `sso.garmin.cn`）にのみ送信され、プラグインが保存したりログに記録したりすることはありません。サインイン後、プラグインは Garmin のサインイントークンを Obsidian のシークレットストレージに保存します。これはデバイス内に留まるため、他のデバイスへの同期や、Vault のバックアップ・Git への混入は起こりません。シークレットストレージが利用できない場合や書き込みが拒否された場合に限り、`data.json` に保存します。これらのトークンはログイン情報と同様に扱ってください。有効期間は Garmin が管理します。各デバイスで個別にサインインします。Garmin がサインインをブロックまたは制限した場合は、ブラウザでのサインインが提示されます（ブラウザで Garmin のページにサインインし、1回限りのチケットを貼り付けます）。サインインに必要な公開 OAuth クライアントキーは `thegarth.s3.amazonaws.com` から取得します（このホストに接続できない場合は同梱のフォールバックキーを使用）。**ログアウト**でこのデバイスに保存されたトークンを削除します。
- **Nominatim (OpenStreetMap)** — **ワークアウト場所**機能が有効な場合、最初のアクティビティのGPS座標が逆ジオコーディングのために `nominatim.openstreetmap.org` に送信されます。設定の **ワークアウト場所** で無効にできます。

その他のサーバーにデータは送信されません。

**履歴ノート：** オプションの履歴ノートにはあなたの健康値が含まれ、デイリーノートと同様に Vault 内にあります。そのためにプラグインが追加のネットワークリクエストを行うことはありません。

**Vault へのアクセス：** プラグインは Vault のファイル一覧（`vault.getMarkdownFiles`）を取得し、パスと日付ベースの名前からデイリーノートと自身の履歴ノートを見つけ、どの日にデータがあるかをサイドパネルに伝えます。プロパティと内容を読むのは、デイリーノートまたは履歴ノートと認識したノートだけで、書き込むのもそれらと、壊れたノートのバックアップ、履歴フォルダだけです。ファイル名やノートの内容がお使いの端末の外に出ることはありません。

**クリップボード：** プラグインがクリップボードを使うのは、ボタンをタップしたときだけで、バックグラウンドでは使いません。**ブラウザでサインイン**は、**クリップボードからログイン**をタップしたときに1回だけ読み取り、ブラウザでコピーした1回限りのサインインチケットを取得します。サインインリンクをコピーするとき、または**診断情報をコピー**（設定とサインイン画面）をタップしたときに書き込みます。診断にはパスワード、トークン、アカウント情報、健康データの値は含まれず、直近のサインインまたは同期の技術情報（データ種別名、HTTP ステータスコード、応答サイズ、所要時間、Garmin の応答の構造＝フィールド名と型のみで、値は含みません）のみが含まれます。

## 開発

```bash
npm install
npm run dev    # ウォッチモード
npm run build  # プロダクションビルド
```

## クレジット

[fcandi](https://github.com/fcandi) が作成したプラグインです。現在は [davadev](https://github.com/davadev) がメンテナンスと開発を行っています。

デイリーノートのプロパティの扱い（プロパティブロックの折りたたみ、サイドパネルが表示するプロパティの非表示）は、Tommy Bergeron さんのコミュニティプラグイン [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) と、electroluminescent さんの [Extended Properties](https://obsidian.md/plugins?id=extended-properties) に着想を得ています（どちらも MIT ライセンス）。コードはコピーしていません。[NOTICE.md](NOTICE.md) を参照してください。
