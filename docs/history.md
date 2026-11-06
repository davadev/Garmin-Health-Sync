# Garmin history notes

The side panel reads the daily notes. A day without a note (or a note without a value) can be filled from the **history notes**: one small markdown note per month, so the data survives on every device that syncs the vault.

## Where and what

- Folder `Garmin history` inside the daily notes folder (at the vault root when no daily notes folder is set). There is no path setting. The notes are found by name (`Garmin history YYYY-MM.md`) anywhere in the vault, so moving the folder breaks nothing. When the daily notes folder changes (a new year's subfolder, say), history notes that lie anywhere else are moved into the `Garmin history` folder of the current daily notes folder before anything is fetched, on startup, before a backfill or history build and before every write. A note whose place is already taken stays where it is and is merged when read. A `Garmin history` folder that is left empty is removed.
- Why markdown and not one JSON file: every sync tool carries markdown (Obsidian Sync does not sync `.json` unless "Sync all other types" is on), and one note per month keeps two devices from rewriting one big file.
- One line per day inside a fenced block: `2026-10-27 {"hrv":42,"sleep_duration":"6h 24min","steps":9100,"trainings":[...],"_m":["hrv","steps"]}`.
  - The values are the keys the sync writes into a daily note, without the `ohs_` prefix and always in metric units.
  - `trainings` is always kept, whatever the daily note setting says.
  - `_m` lists the metrics that were requested when the day was fetched (so a later backfill can tell which days lack a metric). Days copied from notes have none.
- The keys are sorted, so the same data always gives the same text. Lines that cannot be read (conflict markers, a line damaged by hand) are ignored, a date that appears twice is merged, and a sync conflict copy of a month is merged on read.

## When it is written

The setting **Days without a daily note** decides:

| Choice | A day without a note | A day with a note |
|---|---|---|
| Create the note (default) | the note is created, no history notes | the note is updated |
| Keep in history files | stored in the history, no note is created | the note is updated **and** the day is stored in the history |
| Skip the day | not fetched (auto-sync waits for the note) | the note is updated |

An older "create daily note when missing" switch is turned into this choice once: on becomes "Create the note", off becomes "Skip the day". With "Skip the day" a manual backfill now also fetches only days that have a note.

The command **Import history from daily notes** copies the Garmin values of the existing daily notes into the history without any Garmin request.

## How the panel uses it

`DayIndex` takes a value from the daily note first and falls back to the history record for the same day (key by key). Weeks count as having data when they have a note or a record. All history notes, from the oldest month to the shown day, are read when the panel is drawn and again when a history note changes: the [personal best](personal-best.md) and the rank among all your days need every year, not only the last one.

### The long view

With at least 60 days of values in the last year, the box under the light bulb of the HRV, resting heart rate, SpO2, breathing, sleep, stress, body battery, steps, floors and VO2 max cards adds a line with the year (days with data, average, lowest, highest) and, when each of the last 90 days and the 90 days before have at least 20 values, the average of both. These are plain figures from the data, not interpretations, so they have no text in `docs/panel-insights.md`. The usual range of a card still comes from the last 30 days only, because a new watch measures HRV and resting heart rate differently from an old one and a year-long baseline would mix the two.

## Backfill

The one command **Backfill health data** fetches any range of days, newest first. Its dialog asks for the first and last day, **Until my data starts** (go back up to five years and stop where the data starts), what to do with days without a note (the setting **Days without a daily note**, for this run only) and **Fetch complete days again** (overwrite days that are already there).

- Newest day first, so stopping early still leaves the most useful days. Only the metrics you have enabled are fetched, one request group per metric group and day, spaced by the recommended delay (about 3 s a day with the default metrics, about 10 s with all of them). The dialog shows the estimate before it starts.
- What a day is skipped for: the history notes already hold it with every enabled metric, or an earlier run fetched it with them (the fetch log in `data.json`). The last three days are always fetched again, because the watch may still sync them. **Fetch complete days again** ignores both.
- With **Skip the day** only days that have a note are fetched. With **Keep in history files** a day also goes into the history, and a note that exists is updated; with **Create the note** a missing note is made and no history file is written.
- A day without any data is remembered as empty in the history once it is older than three days (only when the history is kept). **Until my data starts** ends after data was found and 120 days in a row had none.
- A day that fails is retried after 30 s and 60 s. Three failed days in a row pause the run for 5 minutes, then 10, 20 and 30; after five pauses without a success it stops. A request for a new sign-in stops it at once. A day that could not be stored counts as failed and is left for the next run. Whatever was fetched is saved in every case.
- A day counts as fetched only when its data is in the files: history days are marked after the file holds them, and the saved place and the fetch log are written only after the pending days are saved (every five fetched days). When one request of a day failed (error or timeout) while the others worked, the day is stored but not marked complete, so the next run fetches it again. An endpoint that has no data (an old watch, a feature the watch does not have) is not a failure.
- A running backfill shows a notice at the top with the day, the days done, the time left and a **Stop** button, and on a desktop the percentage in the status bar. The notice can be clicked away; the command **Show the progress of the running backfill** (listed only while one runs) and a click on the status bar item bring it back.
- Only one backfill runs at a time (a second one shows the running one), and the auto-sync waits while it runs; requests to Garmin never overlap.
- The range that is left is saved every five fetched days. A backfill that was running when Obsidian closed goes on about ten seconds after the next start from where it stopped; stopping it or letting it finish ends it.

## Concurrency

All writes to the history notes go through one queue (a note is read, merged and written in one step, so two writers cannot lose each other's days), and all requests to Garmin go through one chain. What the panel has read of a month is thrown away when the note changes or is written to, and a read that was overtaken by such a change is not kept. A day counts as fetched in the backfill log only after it was stored.

See also: [the metrics that are stored](metrics.md), [the settings](settings.md) (**Days without a daily note**), [troubleshooting](troubleshooting.md#backfill), [how the panel uses the data](panel-cards.md), [the README](../README.md#backfill-historical-data).
