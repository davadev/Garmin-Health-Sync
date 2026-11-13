# Changelog

## 0.14.1-beta.2

Adds the "what's new" entry for 0.14.1 and merges the pending dev-dependency update (#183). Everything else is as in `0.14.1-beta.1`.

### Added

- A "what's new" entry for 0.14.1 (six languages) about the dependency security fixes.

## 0.14.1-beta.1

Security: clears all open Dependabot alerts. Development dependencies only; nothing changes in the shipped `main.js`.

### Changed

- Updated `happy-dom` to 21.0.4 and the lockfile entries `fast-uri`, `brace-expansion`, `picomatch` and `@humanfs/node` to their patched versions.
- Scoped `overrides` in `package.json` for `minimatch` 11.0.1, `ajv` 8.20.0 and `moment` 2.31.0 where the parent packages still pin vulnerable versions.
- `.npmrc`: `brace-expansion` is excluded from `min-release-age` so its fix (published days ago) can land.
- Dependabot: security updates arrive grouped in one pull request.

## 0.14.0

The release of the week. The HRV and resting heart rate cards show a week at a glance, and Readiness judges HRV on the 7-night average instead of one night. The thresholds are starting values (see `docs/panel-insights.md`, "Where the numbers come from"). The detail of every step is in the `0.14.0-beta.N` notes of the GitHub releases.

### Added

- **A week chart on the HRV and resting heart rate cards.** Under the range bar: the last 14 days as bars (the shown day solid), the 7-day average as a line, the "Typical week" as a green band (the mean of up to 60 days before the week, the week itself left out, plus or minus three quarters of a standard deviation, worked out on ln(value)) and one status row ("In / Below / Above your typical week") with the change of the 90 day average. Runs of 3 or more days without a value are drawn as dashed boxes and break the line; a missing night is never counted as low. The headline says what it is ("37 ms · Last night", "Today" for the resting heart rate); only an average above the typical week is coloured as a warning on the resting heart rate. The range bar keeps its range (the 30 days before, plus or minus one standard deviation) and now has a caption saying so.
- **Readiness says why.** The first interpretation shows under the score bar without opening the light bulb. New interpretations: `today_week_low`, `today_hard_session`, `hrv_low_hard_session`, `rhr_high_hard_session`, `today_no_hrv`, each with its section in `docs/panel-insights.md`.
- **Readiness for a watch that sends no HRV.** It uses resting heart rate, sleep and body battery (the resting heart rate carrying more weight), says the score is less reliable and never says "train hard". With HRV in the notes but not for last night there is still no score.
- **The Readiness switch follows the data.** When the daily notes have at least 14 days of other data but neither resting heart rate with sleep nor Garmin's readiness, the card cannot be switched on in **Settings → Garmin Health Sync → Side panel**; the description says why. A card already switched on can still be switched off.
- A "what's new" entry for 0.14.0 (six languages) with a small HRV week figure.

### Changed

- **Readiness judges HRV on the 7-night average** (from 4 of 7 nights; otherwise on last night as before) against the typical week. The HRV flag fires when the average is more than three quarters of a standard deviation low, or when last night alone is more than 2 standard deviations low and no hard session explains it.
- **The morning after a hard session** (a non-recovery session of yesterday with a known intensity: step 3 or more, or load 70 or more at step 2 or more) the night's low HRV and raised resting heart rate are not flagged and the verdict is at most "go easy". A rest verdict stays, and a raised resting heart rate with raised breathing (the sign of an illness) stays flagged.
- No readiness score without last night's HRV, as in 0.13.0.
- The HRV and resting heart rate cards no longer show the two-week trend line; the week chart replaces it.
- **Less work while an installer waits.** When the plugin is enabled while Obsidian is already running (BRAT, the community browser, an update), the startup work that does not need to hurry now starts 3 seconds later. At a normal Obsidian start nothing changes.
- The green band is a little more transparent on a light theme.

### Fixed

- **"How to read this" no longer folds itself while you read it.** The folded sections inside an open light bulb keep their state across a redraw of the panel.
- A long easy walk is no longer a "hard session".
- Docs and README brought up to date: the typical week, the resting heart rate chart, the score and the flags.

## 0.13.0

The release of the personal best. The detail of every step is in the `0.13.0-beta.N` notes of the GitHub releases.

### Added

- **Personal best marker.** A small dark green diamond (no text) on the bars of HRV, resting heart rate, SpO2, stress, body battery and steps shows what you average on your best days, so you see what is reasonably possible for you; the ring is the shown day. A best day is a day that was good on all metrics together (HRV, resting heart rate, stress, sleep score, body battery peak, SpO2, steps): its score is half the average rank and half the weakest rank among your own days, so one great value on an otherwise bad day does not count. The marker is the middle value (median) of the metric on the best 5 percent of those days (at least 5, at most 30), so one sensor spike cannot pull it up. A metric you have only since a new watch is searched in those weeks only (from 14 days), one you have for years in all of them. On the HRV bar the diamond stops at the upper edge of your usual range instead of sitting on the orange part of the track. How it works: `docs/personal-best.md`.
- **More under the light bulb.** Every card with a marker says where the shown day ranks among all your days ("Better than 64% of your 1,540 days with data since 2022-03", from 180 days on) and what your best days average, in a line with the diamond's colour on its edge. A day in your best or weakest tenth gets an interpretation of its own (`history_top`, `history_bottom`). Stress, body battery and floors now show the last year like the other cards. The stress, steps and body battery peak of a day that is not over are not ranked.
- A "what's new" entry for 0.13.0 (six languages) with a small HRV card that shows the diamond next to the ring of the day.

### Fixed

- **Backfilled history older than 400 days now reaches the panel.** The panel only read the history notes of the last 400 days, so years of backfill were never used; it now reads all of them.
- A stray note named like a history note for a year before 2000 ("Garmin history 0001-01") no longer makes the panel read thousands of empty months, which could freeze it.

### Changed

- Reading years of history stays quick in a large vault: the history notes are sorted into their months in one pass, and the oldest history month is looked up once and kept until a history note changes, instead of on every draw of the panel.

## 0.12.1

### Fixed

- The two CSS warnings of the Obsidian review ("Unexpected duplicate max-height" and "Unexpected duplicate border-top"): the fallbacks for older engines (`dvh` units and `color-mix`) now sit in `@supports` blocks instead of repeating the property. The look does not change.

### Changed

- The README (all six languages) states under Data & Privacy why the plugin lists the vault's files (`vault.getMarkdownFiles`): to find daily notes and its own history notes, never sending names or contents anywhere.

### Added

- A "what's new" entry for 0.12.1 (six languages) that names the two changes above. The 0.12.0 notes say the side panel switches itself on when opened and that a new install shows only the cards with data (the text still told to switch it on in the settings first).

### Internal

- `stylelint` now enforces `declaration-block-no-duplicate-properties`, and `check-release` fails if the rule is removed, so the warning cannot come back unnoticed.

## 0.12.0

The release of the health panel. The detail of every step is in the `0.12.0-beta.N` sections below.

### Added

- **Health panel** in the right sidebar (ribbon icon or **Open health panel**; opening it switches it on). It reads your daily notes and the history notes, follows the note you have open, steps through days and has a day picker, a sync button and a button to arrange the cards. 19 cards in sections Today, Recovery, Sleep, Energy, Movement, Fitness and Training: readiness verdict, HRV, resting heart rate, SpO2, breathing, habits, sleep and sleep stages with a timeline, body battery, stress, hydration, steps, intensity minutes, floors, VO2 max, body, load balance, weekly load and sessions (with heart rate zones from an optional birth year). Every card has a switch; a fresh install shows only the cards that have data, existing installs keep every card they had.
- **What your data suggests** under the light bulb of each card: interpretations that fire only on your own numbers, never generic advice, each documented in `docs/panel-insights.md`. "How to read this" explains the metric, and long-view numbers show the last year.
- **Lifestyle log (habits)**: the habits you log in Garmin Connect (yes or no, or a count such as coffee) are synced as `lifestyle_*` properties and shown in the Habits card, compared with the HRV and resting heart rate of the night after, against your own baseline, with an honest "not clear yet" while the data is thin. Habits can be hidden in the card; dropped habits disappear.
- **History notes** (monthly notes with one JSON line per day), **Build Garmin history**, **Import history from daily notes**, and one robust **Backfill health data** command with progress, resume after a restart and retry of failed days.
- New metrics: water intake and goal, bedtime and wake-up time, stress and recovery minutes. New setting **Days without a daily note** and **Properties of daily notes** (leave, fold, hide, or both). A birth year for heart rate zones.
- **A fresh install sets itself up from existing notes** (metrics, prefix, units, lifestyle log, panel) and follows the Daily Notes or Periodic Notes plugin when its folder or format changed.
- Copy diagnostics includes the shape of Garmin's answers and what the panel sees in the vault. Docs pages for metrics, panel cards, panel insights, settings, history and troubleshooting; README screenshots rendered from the real panel code; a "what's new" entry in six languages.

### Fixed

- Blood oxygen (SpO2) is written (the field name was wrong), a missing HRV night stays a gap, a failed endpoint no longer marks a day complete or logs you out, each request has its own timeout, and a backfill never loses days.
- Many robustness fixes of the panel's statistics (outliers, ties, zero values, units) and its drawing (redraw only for relevant notes, follows midnight).
- Mobile: the panel cannot scroll sideways, half-width cards stack on a narrow panel, labels survive a large Android font, touch targets, and "What's new" scrolls only vertically.

### Changed

- The sync leaves the frontmatter of your notes as you wrote it. Readiness is gentler with a young history. Three backfill commands became one.

### Internal

- Tests at 100 % coverage (statements, branches, functions, lines), contract tests against real Garmin answers, translation sync check, dead-code check, cloud-parity lint.

## 0.12.0-beta.97

### Changed

- **Asking for the side panel switches it on.** The ribbon icon and the command **Open health panel** no longer say "turn on the health panel in the settings first": they switch it on and open it. The switch in the settings is still there and turns the panel off again.
- **A fresh install shows only the cards that have data.** A card with nothing to show (no value of its metrics in the last 90 days, no workout, no habit) is left out until it has data; if no card has data, all are shown so the panel is never blank. A card you switch on in the settings stays, one you switch off stays off. **Settings saved before this beta keep every card they had** (nothing is switched off for existing users).

### Fixed

- **The panel could slide sideways on a phone.** Two half-width cards (SpO2 and breathing) needed 324 px next to each other, more than a 360 px phone has inside the panel, so a card head stuck out by up to 30 px. A panel narrower than two 190 px cards now stacks them, and the panel itself never scrolls sideways.
- **Android with a large font: labels ran into each other.** In the weekly card "limit 244" wrapped onto the line below and overlapped "Noch 184 Min."; in the load card the zone names "Belastung" and "Überlastung" ran together. The bar labels no longer wrap and the room under them grows with the font size, and the zone names keep the width they need. Checked in a headless browser at 320, 360 and 412 px with the normal and a 1.3 times larger font.

## 0.12.0-beta.96

### Fixed

- **The panel looked in an old folder after the daily notes plugin changed.** The plugin read the folder and format of the Daily Notes or Periodic Notes plugin once and kept them, so after you changed them there (or moved your notes) it went on looking in the old place and found no data. At every start the saved folder and format now follow the daily notes plugin when that one says something else and its daily notes are newer than the ones the saved setup finds. A saved setup whose notes are as new or newer stays, so a folder you set yourself is not overridden. A notice says when it follows.

## 0.12.0-beta.95

### Added

- **Copy diagnostics shows what the panel sees in the vault.** A last `notes:` line gives the panel switch, whether a daily note folder is set, the name format, how many daily notes were found (and the newest day), how many hold Garmin properties, and which of our own properties the newest of those holds. No note name and no value. It tells apart a wrong folder or format from notes without Garmin properties.
- **The panel says when it finds notes but no Garmin data.** One line with the number of notes and the newest day, instead of a card of "no reading" after another.

### Fixed

- **Two notes of one day no longer hide each other.** With notes now counted in any folder, an archive copy or a template named by date could replace the real note of that day in the panel. Their properties are merged: what one leaves blank the other fills in.

## 0.12.0-beta.94

### Fixed

- **A second device with daily notes in the vault root and another name format found no notes.** The format of the Daily Notes or Periodic Notes plugin was only taken over together with a folder, so with notes in the root (no folder) and a format such as `DD.MM.YYYY` the default `YYYY-MM-DD` stayed and nothing matched. An untouched format now follows the daily notes plugin; a format you changed stays.

### Added

- **The panel says when it finds no daily notes.** Instead of a card of "no reading" after another it shows one line: which name format (and folder) it looks for, and that both can be set in the plugin settings. It disappears as soon as a daily note or a day of the history is found.

## 0.12.0-beta.93

### Added

- **A fresh install on a second device sets itself up from the notes.** With no saved settings and a daily note that holds at least three Garmin properties (a blank property of a template does not count), the plugin switches on the metrics it finds, takes the `ohs_` prefix and miles or pounds from the notes (so a first sync does not write a second set of properties next to the first), reads the lifestyle log when habits are there, and switches the side panel on. A notice says so. Nothing is ever switched off, it looks once at startup and once more when Obsidian has indexed the vault, and it never runs again once settings are saved.
- **The Habits card works without a sign-in.** It names the habits from the `lifestyle_` properties of the notes and the history (a habit with an amount above 1 is a counted one) until a sync brings Garmin's own names; names from Garmin win.

## 0.12.0-beta.92

### Fixed

- **The panel found no daily notes while the daily note folder was empty in the settings.** On a second device (a desktop that got the notes through Obsidian Sync, where the plugin's own settings did not come along) the folder setting is empty, and a note such as `Daily/2026-10-29.md` was not recognised as the daily note of its day, so every card stayed empty although the properties were in the notes. The panel never needed a Garmin sign-in; it only reads the notes. With no folder set, a note named by date in any folder is now a daily note. With a folder set, only notes below it count, as before.

## 0.12.0-beta.91

### Fixed (final sweep of the lifestyle log)

- **A habit keeps its key when Garmin renames it or changes its language.** The key (`lifestyle_alcohol`) was made from the name on every sync, so a rename in the app, or an account language switch that translates the stock habits, started a new key and cut the history in two. The plugin now remembers Garmin's id of each habit and keeps the key it first gave it; the name shown follows Garmin. Habits seen before this beta get their id on the next sync (the key stays as it was while the name is unchanged).
- **Two habits that read the same get the same keys on every day.** The second one used to get its suffix by the order of the list, which could swap the two between days.
- **A dropped habit shows on the days before its last one.** A habit Garmin stopped listing was hidden on every day you looked at, also on the days when it was in use. It is now hidden from the day after its last listing.
- **The Habits card is faster with many habits.** The usual values of the nights are worked out once and shared by all habits, not once per habit.

### Docs

- README (six languages) has a Features line for the lifestyle log, and the troubleshooting page a section on habits (empty card, no bars, renamed habits, removed values, days from before).

## 0.12.0-beta.90

### Fixed

- **The What's new window scrolls only up and down.** An illustration in the notes was wider than the window on a phone (396 px content in a 234 to 324 px box), so the text could be dragged sideways and bounced. The illustrations now shrink to the window, long words wrap, the list indent is smaller, and the window is set to vertical scrolling only (no horizontal bar, no sideways swipe, no rubber band). Checked in a headless browser at 340, 390 and 430 px wide: the content width equals the window width.

## 0.12.0-beta.89

### Changed

- **A bar in the Habits card says how sure it is.** Under every HRV or resting pulse figure a small line shows how many nights it rests on, and for a grey bar "Not clear yet · 30 nights", so a grey figure such as "+1.4 bpm" is read as a lean within your normal swing, not as a finding. The text for a counted habit is "per extra" (it was "per +1") in all six languages.

## 0.12.0-beta.88

### Fixed

- **The habit sections under the light bulb are aligned and low.** The names were centred or pushed right depending on whether the heading had a dot, and a closed section kept a gap for its hidden content. Now every heading has a dot (grey when there is nothing to say), the name sits next to it, the arrow is at the right edge, and a thin line separates the sections. On phones the touch area stays 44 px, taken back with a negative margin so the heading is as low as on a desktop.

## 0.12.0-beta.87

### Added

- **A counted habit is compared by amount, so it can show a pattern sooner.** A habit like coffee that you log every day has no day without it, so the comparison of "with" and "without" never started. It now checks whether the night after changes with the amount (rank correlation of the cups of a day with the HRV or resting heart rate of the night after, against your own 4-week usual): from 14 nights with an entry and at least 3 different amounts, and only when the correlation is at least 0.3 with a t of 2.5. The bar shows the change for one more cup ("-0.8 ms per +1"), the light bulb has four new statements for it (all six languages), and the progress bar of a counted habit now fills towards 14 days. Yes or no habits and counted habits that do have days without them keep the comparison of the groups.

### Changed

- The hint "log a no on the days you skip it" is now only for yes or no habits; a counted habit does not need it.

## 0.12.0-beta.86

### Changed

- **The light bulb of the Habits card is one folded section per habit.** Under "What your data suggests" every habit is a closed heading with a small dot (orange: something to watch, green: better nights, none: nothing to say yet). Opening it shows that habit's patterns, its counts (days logged, the mean of a counted habit) and the hint when it has no "no" days. A card with many habits stays short until you open one. Hidden habits have no section.

## 0.12.0-beta.85

### Changed

- **The hide button is always at the right edge of its row**, also when a long habit name pushes the note onto a second line.
- **Hidden habits are told apart.** Each square carries the first letter of the habit's first word (L, M, V). Only habits whose letter another habit shares get two or three letters (COF and COL for Coffees and Cold showers). The full name is still the label of the square.

## 0.12.0-beta.84

### Added

- **Hide a habit in the Habits card.** An eye button on every row hides that habit. It becomes a small square at the bottom of the card: filled in the accent colour when the shown day has a yes, a ring for a no, dashed for not logged. A tap on the square shows the habit again. A hidden habit is also left out of the light bulb. The choice is made in the card; there is no setting for it.
- **What's new mentions the lifestyle log.** A new item in the 0.12.0 notes (all six languages) tells that the habits of Garmin Connect can be synced and shown in the new Habits card.

### Changed

- **More accent colour, three clearly different states.** Yes is a dot (or column) in the accent colour of the panel, no is an empty ring (a low grey column), not logged is a tiny faint dot (a hairline). The thin comparison bar uses the accent colour too. The legend now reads Yes, No, Not logged.

## 0.12.0-beta.83

### Changed

- **Habits card: less text, more picture.** The paragraph under every habit is gone. A counted habit (coffee) shows small columns of the amount of the last 14 days and the mean a day of the last 7 days (`Ø 3.4 a day`, with an arrow when it is clearly above or below the 4 weeks before). A yes or no habit shows "4 of 7 days" next to its dots. While a comparison with the night after cannot be made yet, a thin bar shows how close it is. The words (days logged, what the comparison needs, the mean and total) moved under the light bulb.

## 0.12.0-beta.82

### Fixed

- **A habit you dropped in Garmin Connect is gone from the Habits card.** Garmin lists every habit that is set up in the app on every day, touched or not. The plugin now remembers the latest day each habit was listed on, and a habit that is no longer listed (deleted or replaced in the app, for example because it is tracked differently now) is hidden at once, instead of staying for 30 days after its last entry. Habits from before this beta show all until the next sync fills in the date; the 30-day rule stays as well.

## 0.12.0-beta.81

### Changed

- **Habits card is compact.** One row per habit instead of tags plus a block per habit: its name with what the shown day has (✓, ✗, "×5" for a counted habit), how many days are logged, the run of days in a row, and the strip of the last 14 days. The two bars (HRV and resting pulse) appear once there are 8 days with and 8 days without the habit; until then one line says how far it is ("3 of 8 days with, 7 of 8 without").
- **Counts under the light bulb.** The light bulb lists the numbers behind every habit (days logged, with the habit, as no) and, for a counted habit, the average and total of the last 7 days.

### Added

- **A hint for a habit that is only ever logged as yes.** Garmin only has a "no" when you log one, and days without an entry are not counted as "no". When a habit has at least 8 days with it and fewer than 3 logged as no, the light bulb says to log a no on the days you skip it, so the nights after it can be compared.

## 0.12.0-beta.80

### Changed

- **Copy diagnostics shows the lifestyle answer two levels deeper.** A real report showed the structure of the entries (habit id, name, type, status, category, sleep-related flag) but cut the list under `details` at one field. The lifestyle shape now reaches the amounts, so the next report tells exactly how a counted habit (cups, drinks) is sent.

## 0.12.0-beta.79

### Added

- **Habits card.** Under Recovery: the habits you log in Garmin Connect as tags (tick, cross, "×2" for a counted habit), then per habit a strip of the last 14 days and how the night after it looks, as two bars (HRV and resting pulse; right is a better night). A habit on day D is compared with the HRV and resting heart rate of day D+1 against your own 4-week usual. Days without an entry are left out. A difference is only called a pattern from 8 days with and 8 days without the habit, Welch's t of at least 2.5 and a difference of at least 0.3 of your usual spread; otherwise it is shown in grey, and with too few days the card says what it needs. The light bulb names the three clearest patterns. The card has its own switch under **Health side panel**. See [the Habits card](docs/panel-cards.md#habits).

### Changed

- **One switch for the lifestyle log.** The per-habit switches of beta 78 are gone: with **Lifestyle log (habits)** on, every habit you log is written to the daily note as `lifestyle_<name>` and kept in the history notes. A habit you stop logging drops off the card after 30 days by itself.

## 0.12.0-beta.78

### Added

- **Lifestyle log (habits), first step.** A new switch **Lifestyle log (habits)** under **Additional metrics** (off by default) reads the habits you log in Garmin Connect, one more request per day. After a sync the habits are listed under the switch, each with its own switch, off until you choose it. Only a habit you switch on is written to the daily note as `lifestyle_<name>` (`1` or `0` for yes or no, the amount for a counted habit) and kept in the history notes. A habit you did not touch that day is not written at all, so an empty day is never read as "no". The names of the habits are kept in the plugin settings, see [Lifestyle log in metrics.md](docs/metrics.md#lifestyle-log-habits).
- **Copy diagnostics shows the structure of the lifestyle answer** (`lifestyle shape: ...`, field names and types, never a habit name or a value) and which habit keys were written. Garmin does not document this answer: please send a report from a day on which you logged something, then the habits card (comparing each habit with the HRV and resting heart rate of the night after it) is built on the real structure.

### Not yet

- The card and the comparison with HRV and resting heart rate come in the next beta; a mock-up is on the branch `mockup/habits-card`.

## 0.12.0-beta.77

### Fixed

- **The "How to read this" button was too high on phones.** Beta 67 gave it a 44 px minimum height for fingers, which made the box taller than in beta 63. It keeps the 44 px touch area, but the space is taken back with a negative margin over the card's own padding, so the box is as low as before. Desktop is unchanged.

## 0.12.0-beta.76

### Added

- **Sync button in the health panel.** A button with the sync symbol sits right of the pencil button in the top row and does the same as the command **Sync current note**: it syncs the open daily note, or yesterday when no daily note is open. Its label is the command's name in the plugin language.

## 0.12.0-beta.75

### Fixed

- **Blood oxygen (SpO2) could never be written.** The mapper read the field `averageSpo2`; the diagnostics of a real iPhone sync show Garmin sends `averageSpO2` (capital O). It now reads `averageSpO2`, then `avgSleepSpO2` (the night's own average), and keeps the earlier spellings. The SpO2 card and its readiness flag had no data from the sync before this. A day where Garmin sends only nulls (a watch that did not measure) still writes nothing.
- **Diagnostics are cut later:** each answer's structure is shown up to 6000 characters (was 1500), so the large daily summary and sleep answers are complete.

### Tests

- `tests/garmin-contract.test.ts` pins every mapper against the structure of real answers (field names and types copied from that report, values invented): daily summary, SpO2 with and without readings, water intake with and without a log, breathing, body battery, weight without a weigh-in, and sleep. New shapes from bug reports belong there.

## 0.12.0-beta.74

### Added

- **Copy diagnostics now includes the shape of Garmin's answers.** For each endpoint of the last sync the report lists the field names and types (`dailySummary shape: {totalSteps: int, averageStressLevel: float, ...}`, lists as `[n]` with the fields of their first elements, four levels deep, cut at 1500 characters), and the metrics each mapper filled (`mapper dailySummary: mapped 2 field(s): steps, resting_hr`). This shows exactly what a watch sends, including fields the plugin does not read yet, so a metric that is missing or wrong for a watch can be fixed without guessing. **Never values:** every number, text and id is reduced to its type, and a key that is not a plain field name (an id, a name, an address) is not printed. The report holds up to 140 lines (was 90). README (six languages), docs/settings.md and docs/troubleshooting.md describe it.

## 0.12.0-beta.73

### Added

- **New docs pages, all linked from the README and from each other:** `docs/metrics.md` (every property written to your notes: key, format, default, request group and the cards that use it), `docs/settings.md` (every setting and command), `docs/troubleshooting.md` (sign-in, a metric that is missing or starts late, the side panel, notes and files, backfill) and `docs/README.md` (the index). Every docs page ends with "See also" links, the README has a **Documentation** section in all six languages, and the README links point at the matching sections.
- **Tests keep the docs honest:** every relative link, image and heading anchor in the README files and the docs must resolve; `docs/metrics.md` must have a row for every metric (on or off by default as in the code, linked to the cards that use it); the README feature count cannot exceed the metrics in the code.

### Changed

- **README, six languages:** "30+ metrics" (it said 20+; there are 31), and the activity tables follow the code: `treadmill_running`, `indoor_running`, `virtual_ride`, `lap_swimming`, `paddling`, `indoor_cardio`, `triathlon`, the new `recovery` category (breathwork, meditation, stretching, mobility), the `_v2` and `_ws` suffixes, the names shown in your language and the weekly distance of swimming.
- **`docs/panel-cards.md`:** the Steps and Floors light bulb lines describe the to-go texts and no longer say "not shown for an unfinished day", which stopped being true in beta.72.
- **AGENTS.md and the docs-screenshots skill** state the docs rules: a card needs its section, a metric its row, a setting its line, links must resolve, the three hero images sit at the top of every README.

## 0.12.0-beta.72

### Fixed

- **Stress and Floors no longer open their light bulb to nothing.** Every state of the Stress card now gets a statement: a level above your 7-day average by more than 10 that is still in the low band ("A level of 38 is 10 above your 7-day average of 28, still in the low band ..."), and a high level that is in line with a high week ("A level of 55 is high, but in line with your own week ..."). On a day that is not over, the Floors and Steps cards say how many floors or steps (and minutes of walking) are left to the start of your usual range. Before, those states had no text.
- **Steps and Floors on today** get the quiet-stretch and weekday texts again. Beta.65 withheld them for an unfinished day, but those texts look at the days before, not at the partial day.
- Each new text is in six languages and documented in `docs/panel-insights.md` (trigger, basis, no study cited).

## 0.12.0-beta.71

### Fixed

- **A new watch no longer makes half the window "outliers".** The outlier rule of beta.69 left out values far from the median; with 15 days from the old watch and 15 from the new one, one of the two groups could have been dropped from the usual range. Now nothing is left out when that would be a quarter or more of the values, because then the days are of two kinds, not freak readings. A handful of freak values (up to a quarter) is still left out.
- **A frontmatter patch is checked before it is written.** The in-place change of beta.67 now has to read back as exactly the merged properties; otherwise (an alias whose anchor sat on the value that changes, an anchor that would point somewhere else) the block is written anew as before. A note with the same key twice is still left alone, backed up and reported.
- **A number typed into a text property** (`steps: "8000"`) is read as the number; text such as "62 ms" is still no value.
- **Ranking among no heart rates** gives the middle instead of NaN.
- **Activity names** of a key typed by hand ("Kayaking", "Mountain Biking") read like the key the sync writes.

### Tests

New regression tests for the boundaries of the outlier rule (exactly 5 spreads, identical values, a spread of 0, negative values, fewer than 8 values, a watch change), seeded random lists for the usual range, ties and rank bounds, exactly 5 days with both HRV and resting heart rate, stale pairs, frontmatter keys with duplicate lines, comments, tabs, Unicode, null values, type changes, regex characters and the prefix next to the plain key, backfill batches that fail in the middle of a run or at the change of the month, a stop during a write, and a failed endpoint together with fetching complete days again.

## 0.12.0-beta.70

### Added

- **A reference for every card:** `docs/panel-cards.md` says for each of the 18 cards what it shows, which daily decision it helps with, how it is calculated (windows, minimum days, thresholds), how it is drawn, which metrics it needs and which interpretations sit under its light bulb. A test keeps the page in step with the card registry. It is linked from the README and from `docs/panel-insights.md`.
- **What's new ends with "Coming soon":** the next big release will attempt to integrate the official Garmin API that was recently announced (all six languages).
- **Credits:** the README (all six languages) and the new `NOTICE.md` thank the community plugins Fold Properties By Default (Tommy Bergeron, MIT) and Extended Properties (electroluminescent, MIT) for the ideas behind **Properties of daily notes**. Their licences were checked: no code was copied, so the MIT notice requirement does not apply; the credit is given as thanks.

### Changed

- **The README states what the plugin is for:** a companion for your daily notes that helps you decide well for the day, not a copy of Garmin Connect, with two ways to use it (sign in and switch on the metrics you want, or add the side panel). The first screen shows the readiness cards, the light bulb and the dark theme; the other screenshots follow in the panel section.
- The translated READMEs gain the feature bullets they lacked (wait-for-note mode, property prefix); a test now compares their sections, bullets and images with the English README.
- docs/release-process.md: a release may end with a short "coming soon" item.

## 0.12.0-beta.69

### Fixed

- **The readiness score no longer rests on a gap that looks like a good day.** The days that make the usual range are now the days on which HRV and resting heart rate were both measured (before it was the smaller of the two counts, so a watch change could leave two ranges on different weeks that counted as one). There is no own score with fewer than 5 such days: before it came out as a neutral 60 with no range behind it. There is also none without last night's sleep, because the missing night counted as no sleep debt and raised the score; the card says it waits for the readings. When some of the last 7 nights have no sleep data the card now says "The sleep debt rests on 5 of 7 nights ... the score may be too high".
- **Sleep stages of 0 minutes** (a watch that does not record REM or awake time sends 0) no longer pull the usual amount toward 0, draw a deviation from it, or divide a bar by a usual of 0. A stage with no usual amount is drawn without the white tick.
- **Hydration** with a goal or usual intake of 0 (a goal of 0 from the history) is treated as no goal; the bar, the share and the foot line no longer divide by it.
- **Tied heart rates no longer inflate intensity.** Where a session's average heart rate ranks among the recent sessions counts half of the equal ones: a session that equals all the others is a middle one (before it ranked as the hardest, so a person who always trains at the same heart rate had every session at the top step and a load ratio that ignored real differences). With a birth year the heart rate zones are used as before.
- **One freak reading no longer distorts a usual range.** From 8 values on, a value more than 5 robust spreads (1.4826 times the median absolute deviation, at least the metric's floor) from the median is left out of the mean and the spread of the usual range and of the z-scores behind the interpretations. The trend line and its bars stay plain, so the value is still visible there.

## 0.12.0-beta.68

### Changed

- **The readiness score is less strict.** A day with nothing unusual now scores 60 (an ordinary day is moderate, not tired). HRV counts 10 and resting heart rate 7 per standard deviation, each held between -2 and 2 (the two move together, so a far-out pair was one signal counted twice), a sleep debt costs 4 points an hour for at most 3 hours, and the body battery term is limited to 8 points either way. While your usual range is young (fewer than 21 days of HRV and resting heart rate, for example with a new watch) all terms are scaled by how much of the range exists, so the score is pulled towards 60 instead of swinging: the same day that read 21 (poor) on 12 days of HRV now reads 42. The bands are poor under 30, low under 50, moderate under 70, high under 90, prime from 90, and the colours of the bar follow them.
- **Activity names in your language.** The sessions card shows about 70 sports by name in English, German, Spanish, French, Japanese and Chinese ("Laufband", "Kajakfahren"); a sport without a name of its own is shown as readable text, as before. Names with the suffix Garmin adds to newer sports (`kayaking_v2`, `skate_skiing_ws`) read like the plain sport.
- **More sports are classified.** Treadmill, indoor and street running, virtual rides, indoor cardio, stair climbing, paddling and the `_v2` and `_ws` variants now count as running, cycling, gym or water instead of "other", so their distance counts toward the weekly distance. Meditation, breathwork, stretching and mobility are recovery (left out of the load, as breathwork and meditation already were).
- **Weekly distance of swimming** is tracked next to running, cycling, walking and outdoor.
- What's new: a new item names the metrics that can be synced now (water intake and its goal, bedtime and wake-up time, stress and recovery minutes) and what they unlock.

## 0.12.0-beta.67

### Fixed

- **The sync leaves the frontmatter of your daily notes as you wrote it.** New values are added after your last property and a changed value is replaced on its own line, so comments, quoting, `[a, b]` lists and `[[links]]`, blank lines and the line endings of the note body stay as they are. Before, any change rewrote the whole block (comments gone, lists reflowed) and joined the body with one kind of line ending. A list or multi-line value that has to change (the training list) still rewrites the block, as before.
- **Android:** colours that mix with the theme (the card colour, the shades of the charts, the dotted night line) have plain fallbacks, so a card on an old Android WebView keeps its background instead of turning transparent; the date field no longer relies on `inset`; the text of the What's new window is limited to 60 % of the visible height, so the on-screen keyboard does not push its button off screen.
- **Rearranging cards on a phone:** the handle is a 44 px touch target, the list scrolls while a card is dragged to the top or bottom edge (a list longer than the screen could not be reached), and the "How to read this" line has a 44 px touch height.

## 0.12.0-beta.66

### Changed

- **The side panel no longer redraws for every note you edit.** It redraws only when a daily note or a history note changes, is renamed (from or to such a name) or is deleted. Before, typing in any note of a large vault rebuilt the index of the whole vault and redrew every card shortly after.
- **Less work per draw.** The cards of one draw share their signals (the sleep and load models were worked out once per card), the sessions of a day are read once until the notes change, the compiled date patterns of the daily note format are kept instead of being built for every note of the vault at every rebuild, and the history notes are looked up with one pass over the vault instead of one pass per month (14 for the panel, about 60 for a five year backfill).

## 0.12.0-beta.65

### Fixed

- **The load ratio no longer overstates a young history.** The weekly average of the last 28 days is taken over the days that have a note or history record, not always over four weeks, and no ratio is shown with fewer than 14 such days. Before, one or two weeks of data gave a ratio two to three times too high, which showed "Overreach", fired the load insights and raised the Today flag.
- **The panel follows the right day.** A panel left open overnight moves on at midnight when it shows today, and its date field closes to the new future days. Opening an ordinary note no longer jumps the panel back to today; only a daily note changes the shown day.
- **The panel draws again** after a restart when Obsidian has finished reading the notes' properties, and after a change of the daily notes folder or date format. A redraw keeps the scroll position, and a history note that changed no longer makes the panel flash empty while it is read again.
- **A blank property in a note** (left by a template) no longer hides the value of the history record of that day.
- **Steps and floors** with an average of zero (a watch that was off for the week) show no zone instead of "zone done", and sleep stages that add up to zero show no bars. A trend of two zero weeks reads as steady, not as a fall.
- **No "below your usual" insight for an unfinished day** on steps and floors, which compared half a day with whole days.
- **Weights in kilograms and pounds** (history records keep kilograms, notes may be in pounds) are brought to the unit of the latest reading before the weekly change is worked out, and a weekly change needs readings at least a week apart, so three weigh-ins in three days no longer read as a fast change.
- **Today card without today's readings** now says it waits for them once the usual range exists, instead of "Unlocks after 5 days · 12 so far".

## 0.12.0-beta.64

### Fixed

- **A backfill never loses days or marks days as done that are not stored.** The history days of a batch are marked as fetched only when the history file holds them; a file that cannot be written leaves the days unmarked and counts them as failed, so the next run fetches them. The place a run has reached is saved only after the pending days are in the files, so a phone that kills the app mid-run no longer leaves days that are marked done but missing.
- **A day with a failed endpoint is no longer marked complete.** When one request of a day fails (error or timeout) while the others work, the day is stored as it is but remembered as incomplete, and the next backfill fetches it again. A day an endpoint has no data for (404, empty answer, a watch without the feature) is still just a day without that value, never an error or a notice.
- **One endpoint that answers 401 or 403 no longer logs you out** while the other endpoints of the day work (a watch that does not offer a feature can answer that way). Only when nothing answers is the session treated as dead.
- **A request that never answers can no longer hold things up.** Each request of a day has its own 25 second limit (before one slow request failed all 30 seconds of the day), the token refresh has one so the sign-in state cannot stay at "refreshing", and the place name lookup gives up after 8 seconds instead of holding the note.
- **A missing night of HRV stays a gap.** The 7-day average is no longer written as the night's value, which hid that a new watch has HRV only since a few days and shifted the baseline. Stress of -1 or -2 (no reading) is no longer written as a level.
- **A daily note or history note that another writer created at the same moment** (Templater, a periodic notes plugin, another device) is written into instead of ending in an error and an hour of waiting. The same for the folders.
- **A backfill that was resumed after a restart takes the job stored then**, not the one from startup, so a run you started and finished in between is not started again. The auto-sync no longer starts in the moment a backfill starts, stops writing when the plugin is closed, and the sign-in notice is removed when the plugin is closed.
- **Coming back to the app on a phone catches up** with an auto-sync (a phone suspends the app, so nothing ran while it was away).
- A daily note whose frontmatter is broken is backed up once for the same content and the last five backups are kept, instead of one new file at every sync.

## 0.12.0-beta.63

### Changed

- **One backfill command instead of three.** **Backfill health data** now does what **Backfill health data again** and **Build Garmin history** did. Its dialog has the first and last day, **Until my data starts** (back up to five years, stopping where your data begins), the choice for days without a daily note for this run (create the note, keep in history files, skip), and **Fetch complete days again**. The two other commands are gone (they were never in a stable release). **Import history from daily notes** stays, because it makes no Garmin requests.
- **The backfill runs newest first, with the robust engine of the history build for every range:** failed days are retried after 30 and 60 seconds, repeated failures pause the run, a day that cannot be stored counts as failed and the run goes on, and the progress notice counts only the days that are really fetched, so "day 3 of 8" and the time left are true. The notice and the Stop button are the ones of the history build, in every language.
- **The progress command is listed only while a backfill runs.**
- **The auto-sync waits while a backfill runs** (before it only waited during a history build), so the two never fetch the same days.
- A saved unfinished backfill from beta.58 to beta.62 is read as before; it now also keeps the choice for days without a note and whether to go until the data starts.
- What's new: the commands list says what each command does, and the item about the backfill describes the single dialog. README and docs/history.md are rewritten for the one command.

## 0.12.0-beta.62

### Changed

- **What's new: the side panel figure shows two places.** The settings (the panel switch and the switch of a card, one of them off) sit in one frame and the panel with a real card in another, so it is clear that a card has to be switched on in the settings. The text says so too.

### Added

- **What's new: the backfill.** A new item with a figure of the progress notice (day, days done, time left, Stop button) and the status bar text, and what changed: the notice can be brought back, one backfill at a time, an unfinished backfill goes on after a restart, fetched days are skipped.
- **What's new: new commands.** A list of the commands that came since the last stable release (open the panel, build the history, import history from daily notes, backfill again, show the progress), named as in the command palette.

## 0.12.0-beta.61

### Added

- **The what's new window has pictures.** Each item of the 0.12.0 notes now shows a small figure drawn with the real side panel code and styles, so it follows your theme and language: the **Show the health panel** switch with a real HRV card, a card with its light bulb open and what your data suggests, the **Days without a daily note** setting with the history choice and a history file name, and the **Properties of daily notes** setting with a long list of properties against the short one that stays. `npm run screenshots -- whats-new` renders the window for review.

## 0.12.0-beta.60

### Added

- **Usual split on the Stress card.** A small vertical line on the bar of stressed against recovering minutes marks your usual split (average of the last 7 days, needs 5 days of both values), so a day can be read against your own norm.
- **Screenshots of the side panel in the README** (all six languages), rendered from the real panel code and the real stylesheet with synthetic data, in a light and a dark theme. `npm run screenshots` renews them, `npm run check:screenshots` verifies the scenes, and the new `docs-screenshots` skill describes the procedure.

### Changed

- **The what's new window** says more about the setting for days without a daily note (create the note, keep the day in monthly history files, or skip it) and about the setting that folds or hides the Garmin properties of a daily note.

## 0.12.0-beta.59

### Fixed

- **Hydration card chart.** The goal label wrapped ("goal 2.5" and "L" on two lines, over the line below), and the litre unit was set in lower case, which looked like a bar. The label stays on one line and litres keep their capital L.

### Added

- **More under the light bulb of Hydration.** The goal in glasses and your usual daily intake are listed. A day with 45 minutes of training or more that is still under the goal says to treat the goal as the minimum, and a weekday on which you usually log 25% less than on other days is named, as for the steps.
- **HRV and Resting heart rate list Water intake** as a metric that adds detail, so the settings tell you to turn it on to unlock the dry-day cause.

## 0.12.0-beta.58

### Added

- **The progress of a backfill can be brought back.** Clicking the notice dismisses it, but the run goes on. The new command **Show the progress of the running backfill** puts the notice back (also for **Build Garmin history**), and on a desktop a click on the status bar item ("Backfill 3/8") does the same. The backfill notice now has a **Stop** button like the history build.
- **A backfill goes on after a restart.** A backfill that was running when Obsidian closed is resumed about 10 seconds after the next start, from the day it had reached (the place is saved every 5 days), with its notice at the top again. Stopping it with the button, or letting it finish, ends it.

### Fixed

- **A second backfill could start while one was running** and fetched the days that overlap again. Now the second one is not started: the running one is shown instead. The same holds between a backfill and a history build.

## 0.12.0-beta.57

### Added

- **Hydration.** Two new extended metrics, **Water intake (ml)** and **Water intake goal (ml)**, are fetched from Garmin and written to the daily note and the history (Settings, Additional metrics, off by default). The side panel has a new **Hydration** card (Energy section, switchable and reorderable like the others): the day's water in litres, a bar against your goal (or your 7-day average without a goal), what is left in litres and 250 ml glasses, the 7-day trend and the year facts. Under the light bulb it says when the goal is reached, whether today is on pace for the goal spread over 7:00 to 22:00 (from noon), how much of the goal a past day reached, and when 3 of the last 5 days were dry.
- **Hydration next to other cards.** When yesterday's logged water was under 75% of its goal (or of your usual intake), the HRV card names it as one possible cause of a low HRV and the resting heart rate card of a high resting heart rate, next to the existing causes.
- Garmin's field names for the intake (`valueInML`, `goalInML`) could not be checked against documentation; the mapper reads both spellings and writes nothing when they are absent. The values stay in ml, also with imperial units.

## 0.12.0-beta.56

### Added

- The release notes window ("what's new") now has an entry for 0.12.0: the side panel, what your data suggests, the history notes and the properties setting.

### Changed

- The README in all six languages describes the side panel, the history notes, Build Garmin history, the days-without-a-note setting, the new backfill behaviour and the properties setting, and the privacy section mentions the history notes.

## 0.12.0-beta.55

### Changed

- **Readiness (Today card) is gentler with a young range and fairer to short sleepers.** While your usual range rests on fewer than 21 days of HRV and resting heart rate, those two terms of the score are scaled by days / 21, so a far-out value moves the score less (it said "poor" for a first-weeks reading while Garmin said 74), and a low band alone no longer says "day off": it says go easy until the range is reliable (raised breathing with a high resting heart rate, or three flags, still mean rest). The sleep debt in the score and the sleep flag is now counted against the sleep you usually get, not against the general 7 hours, so a short sleeper does not lose points every day. The formula is described in `docs/panel-insights.md`.

## 0.12.0-beta.54

### Added

- **Fold, and hide the Garmin properties**: a fourth choice for **Properties of daily notes** that does both. The Garmin rows are hidden and the remaining block is folded when the note opens (open it with the arrow next to the properties heading; a layout change does not close it again).

## 0.12.0-beta.53

### Changed

- **Hide the Garmin properties** now hides every property the sync wrote into the daily note, as long as the side panel is on: all Garmin values, every activity (also types the plugin does not know, such as "mobility"), the training list and the workout place. It no longer depends on which cards are switched on. What counts is read from the note itself, and is worked out again when a sync changes the note.

## 0.12.0-beta.52

### Fixed

- In a narrow side panel the edit button was pushed out of view and the date wrapped onto three lines. The cause was the invisible date field taking part in the layout of the row, because Obsidian styles every input; it is now taken out of it. The date also shortens (nowrap, ellipsis), the calendar icon goes in a narrow sidebar, and the arrows and the edit button always keep their place.

## 0.12.0-beta.51

### Changed

- The setting **Fold properties by default** is now **Properties of daily notes** with three choices: **Leave as they are**, **Fold them** (what the old switch did) or **Hide those shown in the panel**. Hiding takes the rows the side panel already draws (the metrics of the cards that are on, the activities and the training list) out of a daily note's properties block, so only your own properties stay; it does nothing while the panel is off and only touches daily notes. Nothing is deleted from a note: switch back and the rows are there. Your old switch is carried over (on becomes "Fold them").

## 0.12.0-beta.50

### Changed

- The day picker is easier to see and aligned: the date now sits in a bordered button with a calendar icon, centred between the arrows (it was at the left edge and a little too high).

## 0.12.0-beta.49

### Added

- **Every card now has something under its light bulb** when it has data. Before, several cards stayed silent in ordinary states. New lines, each from your own data: HRV above your range with no strain (recovered), SpO₂ just under 95 percent but usual, a low breathing rate (no cause for concern), a short night with no other reason (points to tonight's aim), a Body Battery peak in your usual range, a stress level in line with your week, steps at your usual level, floors (new: at or above your usual, or a quiet stretch), a steady VO₂ max with your training minutes per week, the room left to this week's limit per remaining day (today only), and a balanced mix of easy and hard sessions.
- **Long history, where it tells you something you can act on:**
  - HRV and resting heart rate: when the 90-day average differs from the 90 days before by at least half the spread of your year (the smallest worthwhile change of HRV monitoring), the card says so, with what to compare it with.
  - Steps: if this weekday is usually your quiet one (at least 8 such days and 60 other days in the last 26 weeks, 25 percent or more below your other days), the card says so with the weekday in your language, so you can plan a walk.
- All new texts are in the six languages (unreviewed by native speakers) and each has a section in `docs/panel-insights.md` with its trigger and basis.

## 0.12.0-beta.48

### Added

- **Day picker**: tap the date at the top of the panel to choose any past day in a calendar (the date field of your system, like the one in the backfill dialog). The arrows stay.
- **Arrange the cards**: a pencil button next to the arrows turns the cards into a list; drag a card by its handle (mouse or finger), or use the arrow keys on the handle, to move it. The button becomes a check mark to go back; **Reset order** restores the default. The order is saved in the plugin settings. A section header appears wherever the section changes, so a card moved away from its section gets the header of where it lands.

## 0.12.0-beta.47

### Fixed

- Weekly load: walking (and hiking and other outdoor activities) were missing next to running and cycling. Each sport with kilometres now has its own bar, in the order running, cycling, walking, outdoor.

## 0.12.0-beta.46

### Changed

- Backfill health data re-fetches the last **three** days again, as before beta.45 (beta.45 had raised it to seven by mistake). Older days that were already fetched are still skipped, and the force command is unchanged.

## 0.12.0-beta.45

### Added

- Command **Backfill health data again (ignore what is already fetched)**: the same range backfill, but every day is fetched again and its values are overwritten. Use it after a gap or a wrong value.

### Changed

- Backfill health data re-fetches only the last **seven** days (was three) because the watch may sync late; every older day that was already fetched is skipped. The history build remembers empty days from the same age on.

### Fixed

- Race conditions found in a review of the history features: a day is now marked as fetched in the backfill log only after it was stored (a failed write used to leave it marked, so the day would never have been retried); pressing **Stop** while a request was running no longer leaves the history build waiting out a retry or a pause of up to 30 minutes; opening **Build Garmin history** twice and starting both can no longer run two builds (the second used to take over the first one's Stop button); what the panel had read of a history note could stay out of date when the note changed during the read, and a history build could take days it already had for missing after its own save, so it fetched them again.

## 0.12.0-beta.44

### Changed

- If you change your daily notes folder (for example to a new year's subfolder), the history notes that stayed in the old place are moved into the `Garmin history` folder of the new daily notes folder before anything is fetched: when Obsidian has loaded, before a backfill or a history build, and before every write. The days in them count as fetched, so nothing is retrieved from Garmin a second time. A note whose place is already taken stays where it is and is merged when read; a `Garmin history` folder that is left empty is removed. No new setting.

## 0.12.0-beta.43

### Changed

- Backfill health data no longer fetches a day again that an earlier backfill already fetched with all the metrics you have enabled now (or that the history notes already hold). The notice counts only the days it will really fetch, and when nothing is left it says "every day in this range is already there". The last days (seven, since beta.45) are always fetched again, because Garmin may still change them. Days without data count as done; days that failed do not. Enabling another metric makes the earlier days fetch again for it. The plugin remembers this in its settings file (two small bookkeeping entries, no setting to change).

## 0.12.0-beta.42

### Added

- **Long view**: the HRV, resting heart rate, SpO2, breathing, sleep, steps and VO2 max cards show the last year under the light bulb (days with data, average, lowest, highest) and how the last 90 days compare with the 90 before, once there are 60 days of values. It uses the history notes, so it reaches back as far as your history does. The panel now reads the history notes of the last 400 days. The usual range of a card stays on the last 30 days, because a new watch measures differently from an old one.

### Changed

- Backfill health data: the notice also shows the time left ("Backfill running: day 2 of 8 (2026-10-23) · about 1 min left"), worked out from the wait Garmin needs between days.

## 0.12.0-beta.41

### Changed

- Backfill health data: the notice that stays on screen during the run now says where it is ("Backfill running: day 2 of 8 (2026-10-23)") instead of only "Starting backfill...". (Build Garmin history already had its own progress notice.)

## 0.12.0-beta.40

### Changed

- Sleep card: the sleep score next to the sleep time is now as bold and as dark as the time, in the same size, so it is easy to notice.

## 0.12.0-beta.39

### Added

- Command **Build Garmin history**: fetches your days from Garmin, newest first, back to a date you choose (default five years) into the history notes. The dialog shows how long it will take with your enabled metrics. Days that are already in the history are skipped, so a stopped or failed build continues where it left off; days without data are remembered, and the build ends where your data starts (120 days in a row without any).
- While it runs, a notice at the top shows the day, the days done and the time left, with a **Stop** button, and on a desktop the status bar shows the percentage. Failed days are retried; if Garmin keeps failing the build pauses (5, 10, 20, 30 minutes) and finally stops, keeping everything fetched. The auto-sync waits during a build, and requests to Garmin never overlap.

### Changed

- In a light theme the cards take a smaller hint of your accent colour, so they read greyer.

## 0.12.0-beta.38

### Added

- **History notes**: the plugin can keep every fetched day in small monthly notes (`Garmin history/Garmin history 2026-10.md`, one JSON line per day, inside your daily notes folder). They are plain markdown, so every sync tool carries them, and the side panel reads them for a day that has no daily note or a note without a value. See `docs/history.md`.
- Command **Import history from daily notes**: copies the Garmin values of your existing daily notes into the history, without any Garmin request.

### Changed

- The setting **Create daily note when missing** became **Days without a daily note** with three choices: create the note (as before), keep the day in the history files, or skip the day. Your old setting is carried over: on becomes "Create the note", off becomes "Skip the day". With "Skip the day" a manual backfill now fetches only days that already have a note (before, it created them). "Keep in history files" stores the day in the history and creates no note; days that have a note go to the note and to the history.

## 0.12.0-beta.37

### Changed

- Dark theme: the accent colour used in the panel (the left edge, bars and shades) is lifted to a lightness that stands out on a dark card, instead of using a dark accent as it is. Earlier nights in the sleep chart fade less.
- The card background now carries a hint of your accent colour: 5 percent in a light theme, 10 percent in a dark one, so the cards sit in the theme instead of beside it. The shades and the dot rings use the same card colour.

## 0.12.0-beta.36

### Changed

- Under the light bulb of every card, the general explanation (what the metric is and how it is worked out) now has its own container, "How to read this", like "What your data suggests". It is folded by default (tap the title to open it) and holds the disclaimer that used to sit under the other container.

## 0.12.0-beta.35

### Changed

- Weekly load: every bar now says what it measures. The top bar has its own heading, "Training time" with the minutes, like "Running" or "Cycling" with their distance below it. All bars are drawn by the same code, so cycling (or any other distance sport with logged kilometres) looks exactly like running.

## 0.12.0-beta.34

### Changed

- Under the light bulb, the card's own numbers (both sleep debts, the weekday pattern, bedtime and wake-up) now sit inside the "What your data suggests" box, right after the interpretations and above the note, instead of loose below it. The box also shows when a card has numbers but no interpretation.

## 0.12.0-beta.33

### Changed

- Weekly load, running and cycling rows: the bar is the same as the minutes bar above it, with the usual week and the limit labelled under their ticks ("usual 6.9", "limit 7.6") and the foot reading "Until the limit / 2.6 km left". The separate "Usual … · limit …" line is gone. A sport that was only started this week has no usual week yet, so it shows no ticks.

## 0.12.0-beta.32

### Fixed

- Sleep timeline: an axis end label (for example 06:00) no longer sits on top of the label of a usual time that is close to it (04:51). An end label is now left out when it is closer than 14 percent of the axis to a usual bedtime or wake-up time, so it works the same for a short and a tall axis.

## 0.12.0-beta.31

### Added

- Steps card: a fourth small tile, **Day before**, with the steps of the previous day and how far it was above or below your usual. An unfinished day now has a whole one beside it.

### Changed

- Weekly load is easier to read: one bar filled in a single colour with the minutes so far, the usual week (grey tick) and the limit (red tick) now labelled with their minutes ("Usual 210", "Limit 231"), and the minutes past the limit turning orange. The session-by-session intensity colouring is gone from this bar; the Sessions card still shows it.
- Weekly load wording: "Until the limit / 111 min left", "Over the limit", and the distance rows read "Usual 35 km · limit 38.5 km". The explanation under the light bulb is rewritten to match.

## 0.12.0-beta.30

### Changed

- Sleep timeline simplified: one bar per night, starting at bedtime and as long as the sleep. The faint "time in bed" part and the dashed box are gone. The two dotted lines at your usual bedtime and wake-up stay, so a bar that starts below the first line is a late night and one that ends above the second a short one. The light bulb explanation describes the chart this way.

## 0.12.0-beta.29

### Changed

- Sleep card is smaller: the weekday pattern ("Nights before Friday: ..."), the bedtime and wake-up averages and both sleep debts moved under the light bulb, in a short list between the interpretation and the general explanation. The card keeps the chart, one debt line, tonight's aim and the trend.
- The two sleep debts are told apart: under the light bulb, "Against the general need of 7 h: ..." (what the interpretations use) and "Against your usual 6 h: ..." (what the card line shows once your own history is long enough). The interpretation of a high debt now says it counts against the general need.
- Sleep timeline: two thin dotted lines through the bars mark your usual bedtime and wake-up time, with their times at the left edge. An end label of the axis that would sit on a line is left out, so the chart stays as clear as before.

## 0.12.0-beta.28

### Changed

- Sleep card, tonight's aim: when your life does not allow 7 hours, the card no longer asks for it every night. With at least 3 earlier nights before the coming weekday, the aim follows what that weekday usually brings (the upper end of up to the last 8 such nights) plus a quarter of the debt, at most half an hour. It never goes below an hour under the general need (6 h for an adult), so a very short night is not presented as a goal.
- Sleep card, debt: the debt is counted against what you usually sleep (the middle of your last 28 nights, kept between the floor and the need) when you have 10 nights of history, and the note says so ("against your usual 6 h"). A new line shows "Nights before Friday: you usually sleep ...". The light bulb explains the arithmetic. The interpretations still compare with the general need.

## 0.12.0-beta.27

### Changed

- The five effort levels (heart rate zones of a session, the sessions in the weekly load bar, the borders of the session cards) now use the colours of the load zones: grey, light green, green, orange, red, instead of blue, cyan, yellow, orange, red. One scale, the same everywhere.
- Steps: the marker is a dark ring instead of orange when you are below your usual, so it fits the accent coloured bar.
- Smaller colour clean-up: a lower value in the small stat tiles is orange instead of olive yellow, recovery sessions use a neutral dashed border and tag instead of purple, and "awake" in the sleep stages is grey.

## 0.12.0-beta.26

### Changed

- Stress and Body Battery use shades of your accent colour too: the four stress bands go from light (calm) to dark (high), the stressed/recovering split uses a dark and a light shade, and the Body Battery bar fills from light to full colour.
- All accent shades are derived from your accent colour with its lightness held between 0.5 and 0.72, so a very bright or very dark accent no longer makes bars or shade steps hard to tell apart on a light or dark theme. Obsidian versions without relative colour support use the accent unchanged.

## 0.12.0-beta.25

### Added

- New setting **Fold properties by default** (off by default): a daily note opens with its properties folded, so many synced metrics no longer push the text off the screen. Open them again with the arrow next to Properties; they stay open until you open the note again. It works like the plugin "Fold properties by default" (MIT, Tommy Bergeron) and only touches daily notes.

### Changed

- Steps, intensity minutes and floors use the accent colour like the other charts without a good or bad side.
- Load balance zones: Detrain is grey, Maintain light green, Build green, Strain orange, Overreach red.

## 0.12.0-beta.24

### Added

- HRV card: when HRV has been below your usual range for two or more nights in a row and your training, sleep and stress do not explain it, the card shows a warning line and the light bulb explains that such a lasting, unexplained drop can come before an infection or mean the body is run down. Low HRV together with faster breathing now also counts as a possible illness pattern, like a raised resting heart rate already did. Not a diagnosis; the sources are listed in `docs/panel-insights.md`.

### Changed

- Fewer colours: charts without a good or bad side (sleep bars, distance, weight dots, weekly bars, intensity minutes, stress recovery split) use your Obsidian accent colour, a little brighter. The sleep stages are shades of the accent colour from deep (darkest) to light. Green, orange and red remain only where they mean something.
- The sleep timeline is taller (168 px instead of 96 px), so differences in bedtime and wake-up time are easier to see.

## 0.12.0-beta.23

### Changed

- More space between the cards (24 px instead of 16 px, also between SpO₂ and Breathing); a section header now has 16 px to the cards under it and 32 px above, so each group still reads as a block.

## 0.12.0-beta.22

### Changed

- Every card has a 4 px edge on its left in your Obsidian accent colour, so the cards are easier to tell apart without adding colours. The Today card keeps its verdict colour (green, yellow, orange, red) on that edge.

## 0.12.0-beta.21

### Added

- **Today** card at the top of the panel: your own readiness score from 0 to 100 (poor, low, moderate, high, prime) and one verdict for the day: train hard, train as planned, go easy (zone 2) or a day off (walk and mobility). The score combines HRV and resting heart rate against your own usual, your sleep debt of the last 7 nights and your body battery peak; the verdict follows the score and eight flags (HRV low, resting heart rate high, sleep debt over 2 hours, low body battery peak, high stress, raised breathing, low blood oxygen, load spike). Garmin's own readiness is shown as a reference row when your watch provides it, and alone while your own score has too little data. It appears from 5 days of data and says so until 21 days.
- Under the light bulb the card lists the flags that shaped the verdict, each with the numbers, or says that nothing stands out.
- **This is a rule of thumb, not a validated score**: the formula is from the original concept and has not been calibrated against Garmin's readiness. The card, its explanation and `docs/panel-insights.md` say so.

### Changed

- More space between the cards (16 px instead of 12 px), with a section header sitting closer to its own cards than to the card above.

## 0.12.0-beta.20

### Changed

- **Darker text.** Titles, rows, notes, footers, labels on scales and the explanation now use the normal text colour instead of the muted grey; only units and the section headers stay muted. The weight of a line (bold value, normal label) carries the hierarchy instead of the grey.
- **Trend bars are readable**: muted grey bars with the latest day in the normal text colour, 4 px wide (they were a very light grey).
- **Light bulb:** 16 px with a normal 2 px stroke in the normal text colour, flush with the right edge of the card like the values below it. On a phone the 44 px touch target reaches into the empty space to its left instead of pushing the icon inwards.

## 0.12.0-beta.19

### Changed

- **Layout and formatting polish across all cards, no information changed.**
  - One text scale: the title and the lines of a card (rows, notes, footers) share one size, and numbers on scales, the trend and the explanation are one step smaller. Before, rows and notes on the same card used different sizes.
  - One bar thickness (8 px) for every bar: stages, weekly load, stress split, body battery.
  - The trend line is set apart from the card's content by a hairline and is lighter (thinner, softer bars).
  - The stressed/recovering labels are calm text with a coloured dot instead of bold coloured text.
  - Bars without numbers underneath no longer reserve room for them (the gap under the stress bar, load balance).
  - The light bulb is smaller and quieter (13 px, set on the icon itself so Obsidian's own icon size no longer overrides it); the touch target stays 44 px on a phone.

## 0.12.0-beta.18

### Added

- **Stress and recovery minutes** are back as two optional metrics, **Stress duration (min)** (`stress_high`, time in medium and high stress) and **Recovery duration (min)** (`recovery_high`, time at rest), read from the daily summary (issue #31). They are extended metrics, off by default. With both on, the Stress card shows a split bar of stressed against recovering time with both amounts, and when more of the day was stressed the light bulb suggests slow breathing. The field names (`mediumStressDuration`, `highStressDuration`, `restStressDuration`, in seconds) follow Garmin's daily summary but could not be checked against a real response here: after a sync, check that the values look plausible, otherwise send the output of **Copy sync diagnostics**.

### Changed

- The light bulb button is smaller, also on a phone (the touch target stays 44 px).

## 0.12.0-beta.17

### Changed

- The button that opens the interpretation and the explanation on each card is now a light bulb instead of an (i).

## 0.12.0-beta.16

### Changed

- **Cards show numbers; advice lives under (i).** The fixed tips on the cards are gone: the sleep stages tip ("Tonight … no alcohol"), the load balance suggestions ("Hold steady", "Ease off"), the cardio fitness tips and the body "on track / check hydration" lines, plus "take the stairs" on floors and "keep the remaining days easy" on weekly load. What they said is covered by the data-based interpretation under (i), which also gets one new text for the maintain zone of the load balance. The trend lines stay on the cards.
- Targets and quantities share one row style: a muted label and a neutral value on the right (sleep now reads "Tonight — Aim for 7 h" in the same style as the steps, floors and intensity rows). Green is reserved for something reached (zone done, goal reached) and amber for a warning, so "61 min left" no longer looks like good news.
- The resting heart rate explanation no longer lists alcohol among the possible causes.

## 0.12.0-beta.15

### Fixed

- The health panel now shows data that arrived while it was hidden as soon as it is visible again. Before, a sync that wrote today's note while the panel was hidden (for example a closed drawer on a phone) was only shown after switching to another sidebar tab and back; now opening the sidebar, resizing it or any layout change renders it.

## 0.12.0-beta.14

### Added

- **What your data suggests**, under the (i) of every card that can say something (HRV, resting heart rate, SpO₂, breathing, sleep, sleep stages, body battery, stress, steps, intensity minutes, cardio fitness, body, load balance, weekly load and sessions). It opens first, in a framed box with an accent headline, above the general explanation (which stays plain text). It says why the value is where it is and, if it is off, what the data points to as the lever, or, if it is good and the data allows a guess, what probably made it good. Examples: a short night with a bedtime 1 h 17 min later than usual ("your usual bedtime would have given you about 1 h 17 min more"), little REM after an earlier alarm than usual (REM concentrates in the last hours of the night), little deep sleep after a day with fewer steps than usual, a low HRV after a spike in training load, sleep debt, stress or together with a raised resting heart rate, a falling cardio fitness after fewer training minutes.
- Each line has a coloured edge (orange: something to look at, green: going well), at most 3 lines per card, and the box ends with a note that this is not a diagnosis. When no rule finds a cause the text says nothing else in your data explains it instead of inventing one.
- No generic advice: nothing like "no alcohol before bed" or "drink more water". A tip only appears when your own numbers point to it.
- Every interpretation is documented in `docs/panel-insights.md`: when exactly it fires, what it rests on and a link to the study it is based on (or why there is none). A test fails when a text is added without its documentation or translation.

## 0.12.0-beta.13

### Changed

- Every card switch under **Settings → Garmin Health Sync → Side panel** now says what the card needs and when it unlocks (for example "Needs HRV. Your usual range appears from 5 days of data and is reliable from 21."), lists by name the required metrics that are still off ("Turn on in the metric settings: …") and, separately, the metrics that only add detail ("Adds more detail when turned on: Bedtime, Wake-up time"). The list follows your language and unit system and updates when you toggle a metric.

## 0.12.0-beta.12

### Changed

- The **Birth year** (in **Settings → Garmin Health Sync → Side panel**) now makes more of the panel age-aware, and shows the estimated maximum heart rate right in the setting.
  - **Load balance and Weekly load** take how hard a session was from its heart rate zone, so intensity weights and segment colours work from the very first session instead of after 10 sessions with a heart rate.
  - **Intensity minutes**: for someone under 18 the weekly goal starts at 420 minutes (60 a day, the recommendation for children and teenagers) instead of 150; the goal still moves up when you regularly do more.
  - **Sleep**: the need is 8 hours for ages 14 to 17 and 9 hours for ages 10 to 13 (7 hours for adults, and without a birth year), and the debt, the tip for tonight, the 7 hour line and the dashed box in the timeline follow it.
- Other cards (HRV, resting heart rate, SpO₂, breathing, body battery, stress, steps) keep using your own history only, because personal baselines are better than age averages.

## 0.12.0-beta.11

### Added

- **Heart rate zones in Sessions.** A new setting **Birth year** under **Settings → Garmin Health Sync → Side panel** (only the year, optional; anything that is not a believable year is ignored). With it the plugin estimates your maximum heart rate (Tanaka: 208 − 0.7 × age) and every session shows its zone: the border colour, a "Zone 1 to 5" label (or "Below zone 1") and a five-part zone bar with the current zone highlighted. Zones are 50, 60, 70, 80 and 90 percent of the estimated maximum, and they come from the session's *average* heart rate, so a session with intervals can sit in a lower zone than its hardest minutes. Without a birth year the border keeps showing how hard the session was compared with your last 90 sessions, and the card suggests adding the year.

## 0.12.0-beta.10

### Added

- **Fitness and body** section with two cards.
  - **Cardio fitness (VO₂ max)**: the latest value of each of the last 12 weeks as bars, the change over those 12 weeks (from the slope; under 0.3 counts as steady) and a short suggestion. It needs 3 weeks with a value and a value from the last 28 days.
  - **Body**: your weight as the mean of the last 7 days, the last 28 days of readings as dots, the change per week and your body fat. Colours stay neutral because without a goal no direction is good or bad; a change faster than 1 percent of your weight a week is flagged. It needs 3 weight readings in the last 14 days and reads pounds from notes written with imperial units.

### Changed

- **Intensity minutes**: the weekly goal is still 150 minutes at least, but if you regularly do more it moves to a little above your own average of the previous weeks (10 percent above, in steps of 5 minutes, with no upper limit; for example about 380 for someone who averages 345). The card says when the goal was personalised.

## 0.12.0-beta.9

### Added

- **Sleep timeline.** Two new optional metrics, **Bedtime** (`sleep_start`) and **Wake-up time** (`sleep_end`), written as `HH:MM` (extended metrics, off by default; turn them on and backfill to fill earlier nights). With them on, the Sleep card draws one column per night on a clock: a faint bar from bedtime to getting up, a solid bar for the time asleep and a dashed box that is 7 hours long from bedtime, so a solid bar that stops above the box is a night with too little sleep. Underneath it shows your average bedtime and wake-up time and how much they vary (±minutes). Without the times the card keeps its bars of sleep duration against the 7 hour line.
- **Weekly distance** for running and cycling in the Weekly load card: this week's kilometres (miles with imperial units) against the average of your previous weeks and a cap 10 percent above it, with what is left to the cap.

### Changed

- **Body battery** now shows two clearly labelled bars on the same 0 to 100 scale: where your daily peaks of the last 30 days fell (with a tick at the average) and today's lowest to highest value.

## 0.12.0-beta.8

### Added

- **Training** section in the health panel, built from the activities in your daily notes (either the per-type lines like `running: 5 km · 46min · Ø142 bpm` or the machine-readable `trainings` list, per note, also mixed). Breathwork and meditation count as recovery and are left out of the load.
  - **Load balance**: your last 7 days against your weekly average of the last 28 days, each session weighted by how hard it was for you, on a five-zone bar (detrain, maintain, build, strain, overreach) with a suggestion. Garmin's own training status is shown as a small label only.
  - **Weekly load**: this week's minutes as a bar of sessions coloured by intensity, with your average of the previous weeks and a cap 10 percent above it, and how many minutes are left to the cap.
  - **Sessions**: the day's sessions with minutes, distance, heart rate, calories and the workout location; the border colour shows how hard a session was compared with your last 90 sessions (needs 10 sessions with a heart rate), recovery sessions are dashed.
- Load balance and weekly load need at least one previous week with notes and say "Based on N of 4 weeks" until four weeks are available.

### Fixed

- Intensity colours, zone labels and ticks no longer overlap.

## 0.12.0-beta.7

### Added

- A small **trend line** at the bottom of most cards: 14 tiny bars for the last two weeks and a sentence such as "↑ +3 ms vs the week before". It compares the last 7 days with the 7 days before and needs at least 4 days with a value in each week; a change under 2 percent counts as steady. It is deliberately neutral in colour, because up is not always good. Sleep stages and intensity minutes have none (a composition and a weekly plan).
- A switch per card under **Settings → Garmin Health Sync → Side panel**. Cards are on by default; a card whose metric is not synced says so in the settings. Switching a card off also removes its section header when it was the last one in the section.

### Fixed

- "No reading" no longer overflows the half-width SpO₂ and breathing cards.

## 0.12.0-beta.6

### Added

- **SpO₂** and **Breathing** cards side by side under Recovery, each with a compact colour scale and a status word (in range, low, high). SpO₂ is flagged below your usual range and always below 90 percent (amber under 94); breathing is flagged both ways, and 1.5 breaths a minute above your usual always counts.
- **Sleep stages** card: the night's mix of deep, REM, light and awake time as a bar, one row per stage with your usual amount as a tick and the deviation in minutes, and a tip for tonight when deep or REM is clearly low or awake time clearly high. It needs the four sleep stage metrics enabled in the sync settings.
- **Energy and stress** section: **Body battery** (the day's lowest to highest value on a 0 to 100 track, your usual peak, and the overnight recharge against your usual) and **Stress** (Garmin's four bands with your level and a marker for your 7-day average). The stress minutes split bar follows once the sync writes those values.

### Changed

- Values keep their sensible number of decimals (whole numbers for HRV, heart rate and SpO₂; one decimal for breathing). Small labels like "usual" and "low" are shown in lowercase.

## 0.12.0-beta.5

### Added

- **Movement** section in the health panel with three cards. **Steps**: your zone is your average of the last 7 days up to 10 percent above it, with a bar, the steps and walking minutes still missing, and distance, active and total calories (active calories with the difference to your usual). **Intensity minutes**: a bar per day Monday to Sunday against the weekly goal of 150 minutes, with the daily amount needed over the days still to come. **Floors**: blocks for the day with your zone outlined, and how many floors are left to reach it. Steps and floors need 5 of the last 7 days with data.

### Fixed

- The (i) button no longer overlaps the text and charts below it on a phone, and there is more room between the range labels and the note under a bar.

## 0.12.0-beta.4

### Changed

- Panel visuals follow the original concept more closely. HRV and resting heart rate show a colour scale (green in your usual range, orange then red further out; for resting heart rate only upwards) with a dot at the value and the edges of your usual range marked with their numbers. The value is bigger with a small muted unit.
- The Sleep card now has a bar per night for the last 7 nights against a dashed 7 hour line, with weekday initials; the sleep score sits next to the value.
- Cards are grouped under **Recovery** and **Sleep** headers.

## 0.12.0-beta.3

### Added

- **Sleep** card in the health panel: last night's sleep, your sleep debt over the last 7 nights against 7 hours, and a tip for tonight (7 hours plus a quarter of the debt, at most one extra hour, in 15 minute steps). It needs 5 nights with data; with fewer than 7 it says how many nights the debt is based on. The sleep score is shown when it is in the note.

### Changed

- Cards are more compact (the value sits in the title row) and the colour bar and dot are thicker.

## 0.12.0-beta.2

### Added

- **Resting heart rate** card in the health panel. It compares the day with your average of the 30 days before it, like the HRV card, and only a value above your usual is flagged (amber from one standard deviation or 3 bpm above, red from two or 5 bpm); a lower resting heart rate is never a warning.

### Changed

- The HRV card shows your usual range from 5 days of data instead of 21, with a warning that the range is an early estimate and likely inaccurate until 21 days are available. Below 5 days the card still says how many days are missing.

## 0.12.0-beta.1

### Added

- First preview of the **health panel**, a read-only panel in the right sidebar. It is off by default: turn it on under **Settings → Garmin Health Sync → Side panel**, then open it with the command **Open health panel** or the ribbon icon. It follows the daily note you have open (otherwise today) and has ‹ › buttons to step through days. It only reads your daily notes and never changes them; nothing is fetched from Garmin.
- The first card is **HRV**: the day's value against your own average of the 30 days before it, with an (i) explanation. The personal range unlocks once 21 of those days have a reading. More cards follow in later betas.
- All panel texts are in the six supported languages.

### Internal

- Day index built lazily from Obsidian's metadata cache, with a 300 ms debounce after note changes; the panel does no work while hidden.
- `localDateString` moved to `src/dates.ts`; the date-from-note logic moved from `main.ts` to `daily-note.ts`.

## 0.11.2

### Added

- A "what's new" window after an update, in all six languages. It shows once per device, not on a new install, and can be closed any normal way. The command **Show what's new** opens it again. There is no setting for it. This first one also recalls that 0.11.0 brought mobile compatibility, says that 0.11.1 and 0.11.2 focus on stability and groundwork for future features, and mentions the planned side panel with data visualisation (a one-off for this release).

### Fixed

- Activities with empty-string start coordinates are no longer read as the point (0, 0), so no pointless place lookup is sent (#25).
- Body Battery minimum and maximum no longer break on an absurdly large response (#29).
- The 30 second timeout of a data request is cleared as soon as the request has finished instead of lingering (#26; the timeout still does not feed the sign-in backoff).
- An internal sign-in error message is in English like the rest of the log (#28).

### Changed

- The README links the releases page of this repository (it pointed at the original repository) and credits the original author, fcandi, in all languages.

### Internal

- New CI check `check:i18n-sync`: a pull request that adds, rewords or removes an English text must do the same in the five other language files (an English-only typo fix declares itself with an `I18n-Unchanged: <key>` line in a commit message).
- ESLint 10 (the 9 line is end-of-life; rule counts unchanged at 174 configured, 141 enabled, 38 `obsidianmd/*`, 43 `@typescript-eslint/*`). `@eslint/js` stays on 9 because eslint-plugin-obsidianmd peers it.
- Dev tooling updated (obsidian 1.14.4 with its exact `@codemirror` peers, TypeScript 5.9, typescript-eslint 8.71, happy-dom 20.14.6 security fix, knip, jiti, tslib, globals 17) and GitHub Actions moved to checkout 7, setup-node 7, upload-artifact 7.0.2.

## 0.11.1

### Fixed

- Notes are written atomically: if you keep typing in an open daily note while it syncs, what you typed is kept (before, the sync could overwrite it with the version it had read a moment earlier).
- If the plugin fails to load, the real reason is shown in a notice (on iPhone Obsidian's own message says nothing), and a failing settings save at startup no longer stops the plugin from loading.
- Failures in background work (auto-sync, backfill, the sign-in button in the notice) are logged instead of being left as unhandled errors, which a phone can report as a plugin load failure.
- The "open in browser" button of the manual sign-in dialog opens the page in the window the dialog is in, also in a pop-out window.
- **Sync current note** now syncs the day of the note you have open also when your daily note name contains more than year, month and day (for example `2026-10-21 Wed` or `21 Oct 2026`). Before, it wrote yesterday's data into that note. Opening such a note also triggers the automatic sync again.
- Sleep and sleep phase durations no longer show "60min" (7h 59m 45s was written as "7h 60min"; it is now "8h 0min").
- Backfill now waits between days after a failed day too, so a single rate-limit error no longer makes the next days fail as well. Its dialog pre-fills today's and last week's date in your local time (it used UTC, so after midnight or in the evening it was off by a day).
- The copy-link button in the manual sign-in dialog no longer fails silently when the clipboard is blocked; it tells you.
- The "frontmatter is broken" notice is now shown in your language instead of always in German.
- Notes that start with a byte order mark (BOM) before the properties are recognised; a second properties block is no longer added above the mark.
- Workout locations keep Vietnamese and other Latin names whole ("Hà Nội" was written as "Hà").
- A value Garmin sends in an unexpected form (for example text where a number is expected) is no longer written into your note as "NaN"; it is skipped.
- Intensity minutes are counted when Garmin sends vigorous minutes but no moderate value.
- Settings no longer share their toggles and sync times with the built-in defaults (a latent bug that made behaviour depend on what ran before).

### Changed

- Removed the "Stress duration" and "Recovery duration" switches: they never wrote anything. They will return once they work (#31).

### Internal

- Test tooling (vitest with coverage, a mock of the Obsidian API), a dead-code check, CI on every pull request and on `main`, and stricter release guards: releases only from tags on `main` (stable also from a `release/*` branch), tests and coverage before any release is published, and a check that the version the store advertises always has a published stable release. The whole source is at 100 % coverage and CI fails below that.
- `styles.css` is linted like Obsidian's review does (no `!important`, no partially supported CSS features), in CI, in the release workflow and in the release check. Lint fails on warnings, and the release check refuses a plugin id that ends in "plugin".
- Removed code nothing called (an unused sign-in option, a heart rate helper, a state check, unreachable branches). The Garmin provider's nine request groups share one helper.
- Known limitations are tracked as issues #23 (closing marker with trailing space), #24 (token answer without access token), #25 (empty coordinates), #26 to #29.

## 0.11.0

### Added

- Mobile support (iOS and Android). The plugin now signs in with your Garmin email and password (plus a verification code if your account uses two-step verification) on every platform, without a browser. If Garmin blocks or rate-limits that attempt, a countdown shows when you can retry and a guided browser sign-in (sign in on Garmin's page, paste the one-time ticket back) is offered as a backup on every platform. A copyable diagnostics log (no password or tokens) helps with bug reports.
- New **Copy diagnostics** button in the settings: copies a short log of the last sync (per data type: HTTP status, response type and size, timing, error type) for bug reports. It contains no tokens, account data or health values.
- The sync log in **Copy diagnostics** now also shows, per data type, how many fields Garmin returned and which day it answered for, a short list of response headers (names, plus cache hints and cookie names, never cookie values), and how many fields each mapper filled. On mobile, when a sync finds no data, it also asks Garmin for the daily summary a few more times with one request detail changed each time and logs how the answers differ. This helps find platform-specific causes of empty results. It still contains no tokens, account data or health values.
- The sign-in and verification-code buttons now show "Please wait…" and are disabled while the request runs.

### Changed

- A sync that fails (token refresh, profile lookup, network error, timeout, or every request failing) now shows the sync error notice instead of "No health data available". The "no data" notice is kept for days Garmin really has no data for. If only some data types fail, the sync continues and the failures appear in the diagnostics.
- Garmin sign-in tokens are now stored in Obsidian's secret storage instead of `data.json`, so they are no longer synced to other devices or committed with the vault. Existing desktop sessions are moved over automatically on first start, with no new login. Each device signs in separately. Once a device has migrated, the synced `data.json` no longer holds the tokens, so devices still running an older plugin version are signed out.

### Fixed

- Running **Sync current note** (or Backfill for a single day) a second time for the same date repeated the first answer until Obsidian was restarted, so today's steps and other values stayed stale. Every sync now asks Garmin again.
- Backfill now keeps its result on screen for 10 seconds, reports how many days failed, hides the "Starting backfill..." notice when done, and tells you when sign-in is required instead of stopping silently.

## 0.10.4

### Added

- New optional metrics `body_battery_min` and `body_battery_max`: the lowest and highest body battery level of the day, taken from Garmin's level time series. This is what the Garmin app shows in its history. Off by default like the other extended metrics. (#10)

### Changed

- Diagnostics for empty mapper results (#8): when an endpoint returns data but the mapper produces nothing, the console now lists the top-level key names of the response (names only, no values). This makes an unexpected payload shape visible directly in a bug report.

- `body_battery` now reads only Garmin's `charged` field, the sum of all body battery gains over the day. The previous fallbacks to other fields (`bodyBatteryMostRecentValue`, `chargedValue`, ...) mixed a level with a daily sum and are gone: if `charged` is missing, the value is simply not written. The readme (all languages) now explains what the value means. (#10)

## 0.10.3

### Added

- New setting **Create daily note when missing**, on by default, which keeps the previous behaviour. Switched off, the background auto-sync stops creating daily notes on its own: it waits until a real daily note for that day exists and only then writes the health data into it. This is for setups where another tool owns note creation, such as a template plugin, the Calendar plugin, or notes arriving from another device through a sync plugin.
  - A waiting day costs no Garmin request and gets no cooldown. It syncs as soon as the note has content, whether the note is created with its content, filled in a second step by a template, or arrives through a vault sync.
  - Empty placeholder notes, for example the 0-byte file a click in the Calendar plugin creates, do not count as existing yet.
  - Manual **Sync current note** and **Backfill** are unaffected and still create notes, since they are explicit user actions.

### Fixed

- Daily notes whose filename format contains `/` (for example `YYYY/YYYY-MM-DD`, a common setting in the core Daily Notes plugin that this plugin adopts automatically) were written to the right subfolder but no longer recognised as daily notes: auto-sync did not trigger when opening them, and **Sync current note** silently fell back to yesterday's date instead of the date of the open note. The date is now recovered from the note path relative to the configured folder instead of from the filename alone. Formats without `/` keep matching at any depth below the configured folder, so existing setups are unaffected.
- The filename format now also understands moment's literal escapes, so a format like `YYYY-MM-DD [Workout]` is recognised as well. Repeated tokens must agree, so `YYYY/YYYY-MM-DD` no longer matches a note filed under the wrong year.

### Documentation

- The readme (all languages) documents how folder, filename format and date-based subfolders interact, including examples, and describes the new setting.

## 0.10.3-beta.3

### Fixed

- **Create daily note when missing** (off): the sync now also resumes when a note that was created empty later gets its content. Previously only the note's creation was watched, and an empty note is deliberately not accepted as existing — so the exact setups this setting is for (the Calendar plugin creating a placeholder, Templater filling it afterwards, a note arriving through vault sync in two steps) kept waiting until the next Obsidian start. The follow-up sync fires once per waiting day; editing an already synced note does not trigger anything.

### Internal

- The vault event handler for the wait-for-note mode no longer walks the vault. It compares paths instead of searching for the expected note, so unrelated file activity anywhere in the vault costs nothing.

## 0.10.3-beta.2

### Added

- New setting **Create daily note when missing** (on by default, which matches the previous behaviour). When switched off, the background auto-sync no longer creates daily notes on its own: it waits until a real daily note for that day exists and only then writes the health data into it. This is for setups where another tool owns note creation — a template plugin, the Calendar plugin, or notes arriving from another device via a sync plugin — and the plugin should not race it.
  - While waiting, the missing day costs no Garmin request and gets no cooldown; it is picked up the moment the note appears. Creating the note triggers the sync immediately, including notes that arrive through a vault sync from another device.
  - Empty placeholder notes (for example the 0-byte file a click in the Calendar plugin creates) do not count as existing yet — the sync keeps waiting until the note has content.
  - Manual **Sync current note** and **Backfill** are unaffected and still create notes, since they are explicit user actions.

## 0.10.3-beta.1

### Fixed

- Daily notes whose filename format contains `/` (e.g. `YYYY/YYYY-MM-DD`, a common setting in the core Daily Notes plugin that this plugin adopts automatically) were written to the right subfolder but no longer recognised as daily notes: auto-sync did not trigger when opening them, and **Sync current note** silently fell back to yesterday's date instead of the open note's date. The date is now recovered from the note path relative to the configured folder instead of from the filename alone. Formats without `/` keep matching at any depth below the configured folder, so existing setups are unaffected.
- The filename format now also understands moment's literal escapes, so a format like `YYYY-MM-DD [Workout]` is recognised as well. Repeated tokens must agree (`YYYY/YYYY-MM-DD` no longer matches a note filed under the wrong year).

### Documentation

- The readme (all languages) documents how folder, filename format and date-based subfolders interact, including examples.

## 0.10.2

### Internal

- Resolve the remaining review warnings, which came from type declarations the review environment does not install: the `moment` calls and the Electron `require` are now typed locally (no behavior change), and the TypeScript `lib` gained `DOM.Iterable`. Lint is verified clean even in a simulated review environment without the `moment` and `@types/node` packages.

## 0.10.1

### Internal

- Resolve all type-safety warnings from the community-directory review: the TypeScript `lib` setting now matches the APIs the code actually uses (`Object.entries`, `padStart`, named regex groups), which removes every `no-unsafe-*` finding; the session-expired notice uses Obsidian's `createEl` helpers instead of `document.createElement`; two redundant type assertions dropped. The local lint config now mirrors the review bot's type-aware rules so this class of finding is caught before release. No functional changes.

## 0.10.0

### Changed

- The settings tab now uses Obsidian's declarative settings API (`getSettingDefinitions()`), resolving the community-directory review warning about the deprecated imperative `display()` approach. Settings are unchanged in content; extended metrics moved from an inline collapsible section to a navigable sub-page, and plugin settings now appear in Obsidian's settings search.
- **Requires Obsidian 1.13.0 or newer.** Users on older Obsidian versions stay on 0.9.11.

## 0.9.11

### Internal

- Resolve a community-directory review finding: the manual-login ticket field now uses a translatable, sentence-case placeholder instead of a hardcoded one, removing a disallowed lint-rule exception. No change to how the login works.

## 0.9.10

A reliability release focused on the Garmin login.

### Added

- **Sign in via browser** — a guided login that completes the sign-in in your normal web browser and hands the result back to the plugin. Start it from the plugin settings, or let the plugin open it for you automatically when the in-app login window can't finish. After you sign in, **Sign in from clipboard** completes the login in one click — no copy-pasting of tokens.

### Fixed

- The Garmin login is much more robust (issue #6). The in-app login window now identifies as a normal desktop browser, keeps the sign-in in its own session, and reads the login ticket directly from the network — so it completes on setups where it previously stalled or jumped to an external browser. Where the embedded window still can't finish, the guided browser login takes over instead of failing.
- If the public OAuth key endpoint is blocked on your network, the plugin falls back to bundled keys instead of failing the login.
- Empty API responses (for example heart-rate variability on a day with no reading) no longer raise an error during sync.

## 0.9.10-beta.7

### Fixed

- Login (issue #6): capture the SSO service ticket at the network layer, not just
  via DOM/navigation events. The login window's session now watches
  `webRequest.onBeforeRedirect`/`onCompleted` for the `302 → /sso/embed?ticket=ST-…`
  and reads the ticket straight from the redirect — so it is captured even when the
  embedded window fires no `did-navigate` and even if the follow-up navigation
  escapes to the system browser. The same hook logs each `/sso/signin` request's
  HTTP status, which pins down whether the sign-in stalls on a capture problem or a
  Cloudflare block. Registration is guarded so it can never disturb the existing
  capture paths.

### Changed

- The guided browser login is now a clearly offered path rather than a dead end:
  the "Sign in via browser" button has an explanatory tooltip, and when the in-app
  sign-in produces no ticket the plugin shows a short notice before opening the
  guided browser login instead of popping the dialog wordlessly.

## 0.9.10-beta.6

### Fixed

- Login (issue #6): on setups where the embedded sign-in never hands the ticket
  to the login window (it stalls on the form or escapes to the system browser),
  the plugin could only fail. The login window now presents a stock desktop-Chrome
  User-Agent (no `obsidian`/`Electron` markers) and uses its own persistent
  session, so Garmin treats it like the regular browser in which the manual login
  already works. And if no ticket is captured, the plugin now automatically opens
  the guided browser login instead of reporting a bare failure.

### Added

- Manual login: a "Sign in from clipboard" button that reads the `ST-…` ticket
  (or the full result-page address) straight from the clipboard, so completing
  the guided browser login is a single click — no manual pasting.

## 0.9.10-beta.5

### Fixed

- Login (issue #6): for accounts where Garmin delivers the sign-in ticket by
  opening the service URL in a *new* window, Obsidian forwarded that open to the
  system browser and the one-time ticket was lost. The login window now
  intercepts the new-window hand-off at the Electron main-process level
  (`setWindowOpenHandler`), reads the ticket straight from the URL, and keeps it
  inside the plugin — so the login completes even if a browser window still
  briefly appears.
- Tolerate empty API responses (e.g. heart-rate variability on a day with no
  reading): an empty `200` body no longer raises a JSON parse error mid-fetch.

## 0.9.10-beta.4

### Fixed

- Two more ways the embedded login could escape to the system browser on
  credential submit (issue #6): a programmatic `form.submit()` carrying a
  `target` (fires no submit event, so the previous listener never saw it) and a
  `<base target>` default browsing context. The login window now strips every
  `target` attribute proactively (including dynamically added ones) and patches
  `form.submit()` directly.

### Internal

- The login window now logs all navigation events and in-page interception
  diagnostics (`GHS_DIAG`, ticket-redacted, no query strings) to the developer
  console, so bug reports can name the exact escape vector.

## 0.9.10-beta.3

### Added

- Manual login fallback (issue #6): if the embedded Garmin login window never
  completes the sign-in — it silently stalls on the form for some accounts, or
  escapes to the system browser — you can now finish the login yourself. The new
  **Manual login** button in settings (or the "Log in with service ticket" command)
  opens the Garmin sign-in page in your browser; after signing in you paste the
  resulting `ticket=ST-…` address back into the plugin and the regular token
  exchange takes over. Verified end-to-end by an affected tester (7/7 days synced).

### Fixed

- Login no longer fails on networks where AWS S3 is blocked (issue #6): the public
  OAuth consumer keys were fetched exclusively from a third-party S3 bucket, making
  it a single point of failure even when Garmin itself was reachable. The plugin
  now falls back to bundled keys (identical, long-stable values) whenever that
  fetch fails.

## 0.9.10-beta.2

### Fixed

- Garmin login could fail with the sign-in window stuck on the Sign In screen while
  the ticket page opened in your external browser instead (issue #6). Garmin
  sometimes completes the login in a new window, which Obsidian forwards to the
  system browser — out of the plugin's reach. The plugin now keeps that final step
  inside its own login window, picks the ticket up from Garmin's in-page success
  event as an additional path, and captures (then closes) any popup that still
  slips through.

## 0.9.10-beta.1

### Fixed

- Garmin login could fail right after entering your credentials, leaving you on a
  page showing `{serviceUrl: …, serviceTicket: 'ST-…'}` (issue #6). Your sign-in had
  actually succeeded — the plugin just didn't recognise the login ticket in that
  form. Ticket detection is now broader and re-checks on in-page navigations, so the
  login completes reliably.

### Internal

- Login logs now include the plugin version and a redacted diagnostic breadcrumb to
  make bug reports easier to act on.

## 0.9.9

Maintenance release. No functional changes — internal cleanups to comply with the Obsidian plugin guidelines.

### If you're updating from before 0.9.8

Carried over from 0.9.8: the plugin now signs in to Garmin with official sign-in tokens instead of a browser session, so your connection stays alive far longer and refreshes itself in the background. **You'll need to log in to Garmin once** after updating — after that it just keeps going. (Full details in the 0.9.8 notes below.)

### Changed

- Raised the minimum required Obsidian version to 1.5.4. The plugin already relied on APIs introduced in that version (`Vault.createFolder`), so this only makes the existing requirement explicit.
- Internal: use `activeDocument` and `window.setTimeout` instead of the global `document` / `setTimeout` for popout-window compatibility.

## 0.9.8

This update changes how the plugin signs in to Garmin. Instead of a browser session that quietly expired after a couple of hours, it now uses Garmin's official sign-in tokens — so your connection stays alive far longer and keeps refreshing itself in the background.

### What changed for you

- **You stay connected much longer.** The old browser session expired after a few hours, which is what caused the recurring "auto-sync paused" messages. Now you sign in once and the plugin quietly renews the connection on its own.
- **A one-time sign-in.** Because the sign-in method changed, you'll need to log in to Garmin once after installing this update. After that it just keeps going.
- **Clearer messages.** If Garmin ever genuinely needs you to sign in again, the plugin shows a clear message with a "Log in again" button instead of silently pausing.
- **Fewer false alarms.** Temporary Garmin or network hiccups no longer pause auto-sync — the plugin waits and retries on its own.

### Privacy note

To keep you signed in, the plugin stores Garmin sign-in tokens locally in Obsidian's plugin data. It does not store your Garmin password. Use **Logout** in the plugin settings to clear them on this device.

## 0.9.7

This update makes Garmin auto-sync more reliable when Garmin sessions expire or need to be refreshed.

### Improved

- Auto-sync now checks first whether there is actually anything to sync before touching the Garmin session. This avoids unnecessary login/session checks while everything is still in cooldown.
- If Garmin requires a fresh login, auto-sync now pauses with a clear persistent message and a direct "Log in again" button.
- Auto-sync no longer opens a surprise Garmin login window in the background while you are just opening a daily note.
- Saved Garmin browser sessions are restored more reliably, so you should need to log in less often.

### Fixed

- Fixed cases where expired Garmin cookies could make the plugin think the session was still fresh.
- Fixed a race condition during login that could incorrectly report a login timeout.
- Reduced false auto-sync pauses when only some Garmin endpoints temporarily reject a request.

### Privacy note

Garmin session cookies may be stored locally in Obsidian's plugin data so the plugin can restore your session. The plugin does not store your Garmin password. Use **Logout** in the plugin settings to clear the saved Garmin session on this device.
