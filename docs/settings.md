# Settings

All settings are under **Settings → Community plugins → Garmin Health Sync**. This page lists every one of them and points to the page that explains it further.

## Connection

- **Garmin Connect:** sign in with your Garmin email and password (and the verification code if you use two-step verification), or **Sign in via browser** if Garmin blocks that attempt. **Logout** clears the sign-in tokens on this device. Tokens are kept in Obsidian's secret storage and are not synced to your other devices, so each device signs in separately. See [Signing in in the README](../README.md#signing-in) and [Troubleshooting](troubleshooting.md#signing-in).
- **Server region:** choose China if your account is registered at garmin.cn.
- **Copy diagnostics:** copies technical details of the last sync for a bug report: per endpoint the HTTP status, size, timing and the **structure** of Garmin's answer (field names and types such as `totalSteps: int`, never values; a key that is not a plain field name, such as an id, is not printed), and which metrics the mapper filled. No password, tokens, account data or health values. The structure shows what your watch really sends, so a mapper can be written against it. Run a sync first; without one it says "no sync run since the plugin started".

## Syncing

- **Auto-sync health data:** on startup, when you open today's or yesterday's daily note and when you return to the app, the plugin syncs the last 7 days. It waits while a backfill runs. See [Auto-sync](../README.md#auto-sync).
- **Days without a daily note:** what happens to a day that has no daily note, in the auto-sync and the backfill: **Create the note**, **Keep in history files** (no note is made, the day goes into the [history notes](history.md)), or **Skip the day** (the day is not fetched; auto-sync waits until a real note exists).
- **Commands** (Command Palette): **Sync current note**, **Backfill health data**, **Show the progress of the running backfill** (only while one runs), **Import history from daily notes**, **Open health panel**, **Show what's new** and the browser sign-in. The backfill is described in [history.md](history.md#backfill).

## Notes and properties

- **Daily notes path** and **Daily note format:** where your daily notes live and how they are named, in [moment.js](https://momentjs.com/docs/#/displaying/format/) syntax; they are filled in from Periodic Notes or the core Daily Notes plugin when those are set up. See [Where notes are stored](../README.md#where-notes-are-stored).
- **New note template:** the content a new daily note starts with (empty for a blank note).
- **Property prefix:** writes every property with the prefix `ohs_`. See [metrics.md](metrics.md).
- **Workout location:** adds the place name of your first GPS workout, found by sending its coordinates to Nominatim (OpenStreetMap). See [Data & Privacy](../README.md#data--privacy).
- **Machine-readable trainings:** adds the structured `trainings` list for Dataview. See [Trainings in the README](../README.md#trainings-optional-machine-readable).
- **Properties of daily notes:** leave as they are, fold the properties block when a note opens, hide the properties the sync wrote (the panel shows them), or both. Nothing is deleted from a note. See [NOTICE.md](../NOTICE.md) for the plugins this was inspired by.
- **Unit system:** metric or imperial for distance and weight.
- **Language:** the plugin language (English, German, Spanish, French, Japanese, Chinese); it follows your Obsidian language until you choose one.

## A second device

With no saved settings (a fresh install) the plugin looks through the properties of your daily notes once: when they hold Garmin data it switches on the metrics it finds, follows the `ohs_` prefix and the units of the notes, reads the lifestyle log when habits are there and switches the side panel on, so the panel shows the data without a sign-in. See [troubleshooting.md](troubleshooting.md#the-side-panel).

## Metrics

- **Standard metrics** (steps, sleep duration, sleep score, resting heart rate, HRV, stress) are on by default.
- **Lifestyle log (habits)** reads the habits you log in Garmin Connect; all habits you log are written to your notes and kept in the history (see [the lifestyle log](metrics.md#lifestyle-log-habits)); the Habits card has its own switch under **Health side panel**.
- **Additional metrics** are off by default; each has a switch. The full list with formats and the cards that use each is in [metrics.md](metrics.md).

## Side panel

- **Show the health panel:** adds the panel to the right sidebar; it reads your daily notes and never changes them. Open it from the ribbon icon or the command **Open health panel**: asking for it switches it on, there is nothing to turn on first, and this switch turns it off again.
- **Cards by data:** on a fresh install the panel leaves out a card that has nothing to show (no value of its metrics in the last 90 days, no workout, no habit) until it has data. A card you switch on stays, one you switch off stays off, and a setup that was saved before this keeps every card it had.
- **Birth year:** only the year. It gives heart rate zones for sessions, age-based sleep need and activity goals.
- **One switch per card:** each says which metrics the card needs and which only add detail. The Readiness switch cannot be turned on when your notes have plenty of other data but neither resting heart rate with sleep nor Garmin's readiness (the description says so); a watch without HRV still gets a reduced Readiness score. What each card shows and how it is calculated: [panel-cards.md](panel-cards.md); what the light bulb says: [panel-insights.md](panel-insights.md).

See also: [metrics](metrics.md), [history notes](history.md), [troubleshooting](troubleshooting.md), [the README](../README.md).
