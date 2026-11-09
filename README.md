**English** · [Deutsch](README.de.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md)

# Garmin Health Sync

**A companion for your daily notes.** Garmin Health Sync brings the numbers that matter from your Garmin watch into your Obsidian daily notes, and, if you like, shows how you are doing against your own normal. It is not a copy of Garmin Connect: the aim is to help you make the right decisions for the day.

**Two ways to use it**

- **Keep it simple.** Sign in and switch on the metrics you want. They are written into your daily notes as properties you can query with Dataview, and the evaluation is yours.
- **Add visuals next to your notes.** Switch on the **Side panel** in the settings for cards on readiness, recovery, sleep, energy, movement and training, set against your own usual range. The light bulb on each card says what your data suggests today. [What every card shows and how it is worked out](docs/panel-cards.md).

<p>
<img src="docs/screenshots/panel-today.png" width="280" alt="Readiness and recovery cards">
<img src="docs/screenshots/panel-insights.png" width="280" alt="What your data suggests under the light bulb">
<img src="docs/screenshots/panel-today-dark.png" width="280" alt="The same cards in a dark theme">
</p>

> **Works on desktop and mobile** (Windows, macOS, Linux, iOS, Android). This plugin uses Garmin Connect's internal API — there is no official third-party API available. You sign in with your Garmin email and password (plus the verification code if you use two-step verification). If Garmin blocks that attempt, an alternative browser sign-in is available.

## Documentation

- [Settings](docs/settings.md) — every setting
- [Metrics](docs/metrics.md) — every property written to your notes
- [Side panel cards](docs/panel-cards.md) — what each card shows, which daily decision it helps with and how it is calculated
- [Interpretations under the light bulb](docs/panel-insights.md) — when each statement appears and what it rests on
- [History notes and backfill](docs/history.md) — how the history is kept and built
- [Personal best](docs/personal-best.md) — how the best-day marker and the rank among all your days are worked out
- [Troubleshooting](docs/troubleshooting.md) — sign-in, missing metrics, the panel, notes and backfill
- [Changelog](CHANGELOG.md) — what changed in each release

## Features

- **Auto-sync on startup** — checks the last 7 days and fills in any missing health data
- **Wait-for-note mode** — optionally let auto-sync wait until another tool (Templater, Calendar, an external sync) creates the daily note, instead of creating it itself
- **Manual sync** — sync any open Daily Note via command palette
- **Backfill** — bulk-sync a date range (e.g. the last 3 months)
- **30+ metrics** — steps, sleep score, HRV, stress, body battery, SpO2, weight, and more
- **Activity tracking** — each workout appears as a human-readable summary
- **Workout location** — reverse-geocoded place name from your first GPS activity
- **Smart detection** — automatically picks up your Daily Notes path and format from Periodic Notes or the core Daily Notes plugin
- **Subdirectory support** — finds existing Daily Notes in nested folders (e.g. `Journal/2024-07/`), and creates date-based subfolders when the filename format contains `/` (e.g. `YYYY/YYYY-MM-DD` → `Journal/2026/2026-08-04.md`)
- **Language auto-detection** — UI language is set from your Obsidian language (EN, DE, ZH, JA, ES, FR)
- **Optional structured data** — machine-readable `trainings` field for advanced Dataview queries
- **Property prefix** — optionally adds an `ohs_` prefix to all frontmatter properties to avoid naming conflicts with other plugins
- **Lifestyle log (habits)** — optionally sync the habits you log in Garmin Connect (yes or no, or a count such as cups of coffee) as `lifestyle_<name>` properties; the Habits card in the side panel shows each habit and, once there is enough data, how your HRV and resting heart rate look on the night after it
- **Health side panel** — optional right sidebar with cards for recovery, sleep, energy, movement, fitness and training, set against your own usual range; tap the light bulb on a card for what your data suggests and how it is worked out; turn it on under **Settings → Garmin Health Sync → Side panel**; the HRV and resting heart rate cards show the last 14 days with their 7-day average against your typical week, and Readiness judges HRV on that week and explains the morning after a hard session
- **History notes** — optionally keep every fetched day in small monthly markdown notes, so the panel also works for days without a daily note and the data syncs with your vault
- **Properties of daily notes** — fold the properties block when a note opens, or hide the Garmin properties the panel already shows

## Frontmatter Output

### Metrics

```yaml
---
steps: 15185
resting_hr: 69
sleep_score: 81
sleep_duration: 7h 43min
hrv: 39
stress: 30
vo2_max: 48
workout_location: Bad Honnef, Germany
---
```

**Body battery:** `body_battery` is Garmin's *charged* value, the sum of all body battery gains over the day (mostly the overnight recharge), not the current level. Enable `body_battery_min` and `body_battery_max` for the lowest and highest level of the day, which is what the Garmin app shows in its history.

### Activities

Each workout is written as a frontmatter key with a summary string:

```yaml
---
hiking: 8.2 km · 157min · Ø105 bpm · 696 kcal
e_bike: 22.1 km · 65min · Ø112 bpm · 420 kcal
---
```

Only days with actual workouts get activity keys. The plugin never touches your note content — it only adds or updates frontmatter properties.

### Trainings (optional, machine-readable)

Enable "Machine-readable trainings" in settings to add a structured `trainings` field for Dataview queries:

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

## Requirements

- **Obsidian** on Windows, macOS, Linux, iOS or Android
- **Garmin account** with access to Garmin Connect
- **Daily Notes** or **Periodic Notes** plugin enabled (or configure the path manually in settings)

## Installation

### From Community Plugins (recommended)

1. Open Obsidian Settings → Community Plugins → Browse
2. Search for "Garmin Health Sync"
3. Install and enable the plugin
4. Log in to Garmin Connect in the plugin settings

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/davadev/Garmin-Health-Sync/releases)
2. Create a folder `.obsidian/plugins/garmin-health-sync/` in your vault
3. Copy both files into that folder
4. Enable the plugin in Settings → Community Plugins

## Usage

### Signing in

Open the plugin settings and select **Garmin Connect**, then enter your Garmin email and password (and the verification code if you use two-step verification). The same sign-in works on desktop and mobile.

Garmin may limit repeated sign-in attempts from one device; the plugin then shows a countdown before you can try again. If sign-in is blocked, use **Use browser login** instead: you sign in on Garmin's page in your browser, copy the page text that contains `ST-…` and tap the clipboard button in the plugin (or paste it into the field). Once signed in, the plugin renews the connection by itself, so you rarely need to sign in again.

### Where notes are stored

The **daily notes path** is the folder, the **daily note format** is the filename in [moment.js](https://momentjs.com/docs/#/displaying/format/) syntax — the same convention as the core Daily Notes plugin. The format itself may contain `/` to nest notes into date-based subfolders, and square brackets keep text literal:

| Path | Format | Result |
| --- | --- | --- |
| `Journal` | `YYYY-MM-DD` | `Journal/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM-DD` | `Journal/2026/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM/YYYY-MM-DD` | `Journal/2026/2026-08/2026-08-04.md` |
| `Journal` | `YYYY-MM-DD [Workout]` | `Journal/2026-08-04 Workout.md` |

Missing subfolders are created automatically.

### Auto-sync

On every Obsidian startup, the plugin checks the last 7 days and fills in any missing health data automatically. No action needed. By default it creates a daily note when one is missing.

If another tool owns your daily notes (Templater, the Calendar plugin, an external sync), set **Days without a daily note** in the settings to **Skip the day**. Auto-sync then waits until a real (non-empty) daily note exists and syncs the moment it appears — empty 0-byte placeholders are ignored. With **Keep in history files** the plugin creates no note for a day without one and stores the day in the history notes instead (see below). A manual sync always writes to the note you have open.

### Manual sync

Open a Daily Note and run **Garmin Health Sync: Sync current note** from the Command Palette (Cmd/Ctrl+P).

### Backfill historical data

Have years of Garmin data? **Backfill health data** fetches any range of days:

1. Open the Command Palette (Cmd/Ctrl+P) and search for **"Backfill health data"**
2. Pick a start and end date, or switch on **Until my data starts** to go back up to five years and stop when your data begins
3. Choose what happens to days without a daily note (**Days without a daily note**): create the note, keep the day in history files, or skip it
4. Switch on **Fetch complete days again** to overwrite days that are already there

The days are fetched newest first, with the rate limiting Garmin needs. A notice at the top shows the day, how many days are done and the time left, with a **Stop** button, and on a desktop the status bar shows the percentage. If you click the notice away, the command **Show the progress of the running backfill** (listed only while one runs) or a click on the status bar item brings it back. Only one backfill runs at a time. A stopped or interrupted backfill goes on after a restart, from where it stopped. Garmin failures are retried, and a day that an earlier backfill fetched (with all your enabled metrics) is skipped, except the last 3 days, which may still change.

### Health side panel

Open it from the ribbon icon or the command **Open health panel**; asking for it switches it on, there is nothing to turn on first (**Side panel** in the settings turns it off again). The cards compare today with your own usual range (the last 30 days) and never change your notes. Tap the date to pick a day, use the arrows to move by a day, and the pencil button to arrange the cards by dragging. Every card has a switch in the settings that also says which metrics to enable for it. Tap the light bulb on a card for **What your data suggests** (reasons and what helps, taken from your own data) and **How to read this**. The panel is not medical advice. Adding your birth year (only the year) in the settings gives heart rate zones and age-based goals. See [what every card shows and how it is worked out](docs/panel-cards.md).

<p>
<img src="docs/screenshots/panel-hydration.png" width="280" alt="Hydration card with its explanations">
<img src="docs/screenshots/panel-sleep.png" width="280" alt="Sleep and sleep stages">
<img src="docs/screenshots/panel-energy.png" width="280" alt="Body battery, stress and hydration">
<img src="docs/screenshots/panel-training.png" width="280" alt="Steps, load balance, weekly load and sessions">
</p>

### History notes

With **Days without a daily note** set to **Keep in history files**, every fetched day is also stored in small monthly notes (`Garmin history/Garmin history 2026-10.md`, one line per day) in your daily notes folder. They are plain markdown, so they sync with your vault, and the panel reads them for days that have no note. The command **Import history from daily notes** copies the Garmin values of your existing notes into them. The backfill can fill them back to the start of your data in one go (**Until my data starts**). If you change your daily notes folder, the history notes move along with it.

### Properties of daily notes

The setting **Properties of daily notes** can fold the properties block of a daily note when it opens, hide the properties the plugin wrote (the panel shows them), or both. Nothing is deleted from a note. Folding and hiding follow the ideas of the community plugins [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) and [Extended Properties](https://obsidian.md/plugins?id=extended-properties); see Credits.

## Activity Key Normalization

Garmin's `typeKey` values are normalized to cleaner canonical keys:

| Provider Key | Canonical Key | Category |
|---|---|---|
| `e_bike_fitness` | `e_bike` | cycling |
| `e_bike_mountain` | `e_mtb` | cycling |
| `resort_skiing_snowboarding` | `skiing` | winter |
| `backcountry_skiing_snowboarding` | `backcountry_skiing` | winter |
| `stand_up_paddleboarding` | `sup` | water |
| `fitness_equipment` | `gym_equipment` | gym |

All other Garmin keys pass through unchanged (e.g. `hiking`, `running`, `cycling`, `swimming`, `strength_training`, `yoga`, ...).

### Activity Categories

Each activity is assigned a category:

| Category | Examples |
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
| `recovery` | breathwork, meditation, stretching, mobility (left out of the load) |
| `other` | golf, multi_sport, triathlon |

Newer sports carry a suffix from Garmin (`kayaking_v2`, `skate_skiing_ws`); it is dropped for the name and the category, so they count like the plain sport. Sessions are shown with the sport's name in your plugin language; a sport that is not listed here is shown as readable text and counts as `other`. The weekly load card tracks the distance of running, cycling, walking, outdoor sports and swimming.

## Data & Privacy

This plugin makes network requests to two external services:

- **Garmin Connect** — you enter your email and password (and a verification code if required) in the plugin. They are sent only to Garmin's sign-in servers (`sso.garmin.com`, or `sso.garmin.cn` for China) and are never stored or logged by the plugin. After sign-in the plugin keeps Garmin sign-in tokens in Obsidian's secret storage, which stays on the device, so they are not synced to other devices or included in vault backups and Git. Only if secret storage is unavailable or rejects the write does the plugin fall back to keeping them in `data.json`. Treat these tokens like a login: their lifetime is controlled by Garmin. Each device signs in separately. If Garmin blocks or rate-limits the sign-in, a browser sign-in is offered (you sign in on Garmin's own page in your browser and paste the one-time ticket back). The public OAuth client keys needed for sign-in are fetched from `thegarth.s3.amazonaws.com` (with bundled fallback keys if that host is unreachable). Using **Logout** clears the stored tokens on this device.
- **Nominatim (OpenStreetMap)** — if the "Workout location" feature is enabled, the GPS coordinates of your first activity are sent to `nominatim.openstreetmap.org` for reverse geocoding. You can disable this in settings under *Workout location*.

No data is sent to any other server.

**History notes:** the optional history notes contain your health values and live in your vault like your daily notes. The plugin makes no extra network requests for them.

**Vault access:** the plugin lists the files of your vault (`vault.getMarkdownFiles`) to find your daily notes and its own history notes by their path and date-based name, and to tell the side panel which days have data. It reads the properties and contents only of the notes it recognises as daily notes or history notes, and writes only to those, to the plugin's backup of a broken note and to its history folder. File names and note contents never leave your device.

**Clipboard:** The plugin only uses the clipboard when you click a button, never in the background. **Use browser login** reads it once, when you click **Sign in from clipboard**, to pick up the one-time login ticket you copied from your browser. It writes to it when you click to copy the sign-in link, or **Copy diagnostics** (in the settings and in the sign-in window). Diagnostics contain no password, tokens, account data or health values, only technical details of the last sign-in or sync: data type names, HTTP status codes, response sizes, timings and the structure of Garmin's answers (field names and types, never values).

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## Credits

Originally created by [fcandi](https://github.com/fcandi). Maintained and developed further by [davadev](https://github.com/davadev).

The handling of properties in daily notes (folding the properties block, hiding the properties the side panel shows) was inspired by the community plugins [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) by Tommy Bergeron and [Extended Properties](https://obsidian.md/plugins?id=extended-properties) by electroluminescent (both MIT licensed). No code was copied; see [NOTICE.md](NOTICE.md).
