# The cards of the health side panel

What each card shows, which daily decision it helps with, how its numbers are worked out and how they are drawn. The panel is a **journal companion**: it sits next to your daily note and answers "how am I today, compared with my own normal, and what is a sensible thing to do with the day?". It is not a copy of Garmin Connect, never changes your notes and is not medical advice.

The light bulb on every card opens two boxes: **What your data suggests** (at most 3 short statements, each with its trigger and source in [panel-insights.md](panel-insights.md)) and **How to read this**. A tip appears only when your own data points to it.

## Principles

- **Your own normal.** Almost every card compares today with *your* last days, not with a population table. The usual range is the mean and standard deviation (sd) of the 30 days before the shown day, with a floor on the sd so a very stable person does not get a razor-thin band. From 8 values on, a value far from the rest (more than 5 robust spreads from the median) is left out, unless that would be a quarter or more of the values (two kinds of days, such as before and after a new watch, are kept), so one sensor error does not stretch the range for a month. The shown day never counts into its own range.
- **Cards come with data.** On a fresh install a card with nothing to show is left out until a value of its metrics, a workout or a habit is in the last 90 days; settings saved before keep every card. The switch of a card in the settings overrides this.
- **Thin data is said, not hidden.** A card that has too little data shows what it needs ("Unlocks after 5 days of data · 3 so far") instead of a number. A range from 5 to 20 days is drawn but marked "Early estimate": a new watch or a new account has a young range, and the card says so. Cards that need a metric you have not switched on say which one under **Settings → Garmin Health Sync → Side panel**.
- **Numbers on the card, advice under the light bulb.** The card shows the number and where it sits; what to do about it is in the bulb.
- **Colour means one thing.** Green is inside your usual or a reached target, amber and orange a warning, red far outside. Where no direction is good or bad (weight, stress level, load) the marker stays neutral.
- **The shown day.** Tap the date to pick a day or use the arrows. For today the day is not over, so cards that measure a whole day (steps, floors, hydration) say "so far" and do not warn about a short day.
- **Birth year (optional).** Only the year. It gives heart rate zones (Tanaka: 208 − 0.7 × age), age-based sleep need (9 h for ages 10 to 13, 8 h for 14 to 17, 7 h for adults) and the 420 minute weekly activity goal for under 18s.
- **Trend line.** Cards with a daily value show 14 tiny bars and "↑ +3 ms vs the week before": the mean of the last 7 days against the 7 before, shown with at least 4 values in each week. Within 2 % it reads "steady". It is neutral in colour, because up is not always good.
- **The year view.** With at least 60 days of values in the last 365, the bulb also lists the year's average and range, and the last 90 days against the 90 before once each has 20 values (history notes feed it, see [history.md](history.md)).

## The cards

In panel order. "Needs" names the metrics to switch on in the settings (every metric is described in [metrics.md](metrics.md), every setting in [settings.md](settings.md)); **extra** ones are optional and add detail or hints. The Load, Weekly load and Sessions cards use the workouts that are always synced.

### today
- **What it shows:** your readiness for today as a score from 0 to 100 with its band (poor, low, moderate, high, prime), a verdict (train hard, train as planned, go easy, day off), Garmin's own readiness next to it when the watch provides it, and a note when the score rests on a young range.
- **Decision it supports:** whether to do the hard session you planned, keep the plan, go easy or take a day off, based on how recovered you are against your own normal.
- **How it is calculated:** 60 + t × (10 × z(HRV) − 7 × z(resting heart rate) − 4 × sleep debt in hours (at most 3) + 0.25 × body battery peak gap (between −8 and +8)). A day with nothing unusual scores 60. The z values are held between −2 and 2 and use the 30 day range; `t` is the days on which HRV and resting heart rate were both measured, divided by 21 (at most 1), so a young range pulls the score toward 60. The sleep debt is counted against your usual sleep. There is no score with fewer than 5 such days or without last night's sleep, and a note says when the debt rests on fewer than 7 nights. Bands: 0 to 29 poor, 30 to 49 low, 50 to 69 moderate, 70 to 89 high, 90 and above prime. Eight flags (HRV low, resting heart rate high, sleep debt over 2 hours, battery peak 15 or more below usual, stress 10 above the week, breathing 1.5 sd up, SpO2 below 94 %, load ratio above 1.5) set the verdict together with the band; three flags or raised breathing with a high resting heart rate mean a day off. Full formulas: [panel-insights.md](panel-insights.md#the-today-card). It needs HRV, resting heart rate and sleep for the day and 5 days of range; until then Garmin's own readiness is shown, or the card says what it waits for.
- **How it is drawn:** the verdict in large type on a card edge tinted by it, a bar from red to cyan split at 30, 50, 70 and 90 with a ring at your score, and Garmin's number as a quiet row underneath.
- **Needs:** `hrv`, `resting_hr`, `sleep_duration`; extra: `body_battery_max`, `training_readiness`, `spo2`, `respiration_rate`, `stress`.
- **Light bulb:** one statement per flag that is raised, or that nothing stands out (`today_flag_*`, `today_no_flags`).

### hrv
- **What it shows:** last night's heart rate variability against your usual range.
- **Decision it supports:** HRV is the clearest signal of recovery. Inside your range you can train as planned; clearly below it, especially for several days, is a reason to hold back.
- **How it is calculated:** the mean ± sd of the 30 days before (sd floor 2 ms), from 5 days; reliable from 21. The dot is amber from 1 to 2 sd away (either side), red beyond 2. A streak of low nights is called out on the card.
- **How it is drawn:** a bar that fades from green inside the range through orange at 2 sd to red at 3 sd (both ends are bad), a dot at today's value, dashed ticks with the numbers at the range's edges, the trend line below. A small green diamond on the bar marks what you average on your best days ([personal best](personal-best.md)).
- **Needs:** `hrv`; extra: `hydration_ml` (unlocks a hydration hint when HRV is low).
- **Light bulb:** possible reasons for a low night (load, sleep, stress, illness pattern, hydration, streak) or what a high one means (`hrv_*`).

### resting_hr
- **What it shows:** your resting heart rate against your usual range.
- **Decision it supports:** a resting heart rate well above your normal comes with stress, poor sleep, illness or fatigue; a lower one is normally fine.
- **How it is calculated:** mean ± sd of the 30 days before (sd floor 1.5 bpm). Only a high value is flagged: amber at more than 1 sd or 3 bpm above, red at more than 2 sd or 5 bpm above.
- **How it is drawn:** the same range bar, but only the high end turns orange and red; a low value stays green. A small green diamond on the bar marks what you average on your best days ([personal best](personal-best.md)).
- **Needs:** `resting_hr`; extra: `hydration_ml`.
- **Light bulb:** `rhr_*` (load, sleep, illness pattern, hydration, fitness, trend).

### spo2
- **What it shows:** your overnight blood oxygen (SpO₂) against your usual, as a half-width card with a status word.
- **Decision it supports:** a repeated low reading, especially with raised breathing, is worth watching; altitude lowers it.
- **How it is calculated:** mean ± sd of 30 days (sd floor 0.7 %). Below 90 % is red whatever your history says, below 94 % amber, otherwise 1 sd below is amber and 2 sd red.
- **How it is drawn:** a compact range bar (only the low end is bad) and the word "in range", "high" or "low". A small green diamond on the bar marks what you average on your best days ([personal best](personal-best.md)).
- **Needs:** `spo2`.
- **Light bulb:** `spo2_*`.

### respiration_rate
- **What it shows:** your breathing rate during sleep against your usual (card title Breathing, half width).
- **Decision it supports:** about 1.5 breaths a minute above your usual can be an early sign of illness or strain, particularly with a raised resting heart rate.
- **How it is calculated:** mean ± sd of 30 days (sd floor 0.4 per minute). Amber beyond 1 sd or 1.5 above the mean, red beyond 2 sd either way.
- **How it is drawn:** a compact range bar with a dot and the word "in range", "high" or "low".
- **Needs:** `respiration_rate`.
- **Light bulb:** `breathing_*`.

### habits
- **What it shows:** the habits you log in Garmin Connect (the lifestyle log), one compact row per habit: its name with what the shown day has (a tick for yes, a cross for no, "×5" for a counted habit), how the last 7 days stand (a yes or no habit: "4 of 7 days"; a counted habit: the mean a day with an arrow when it is clearly above or below the 4 weeks before) and the run of days with it. Under it the last 14 days: dots for a yes or no habit, small columns of the amount for a counted habit. Once there are enough days, two bars show how the night after the habit looks: HRV and resting pulse; until then a thin bar shows how close the comparison is. The light bulb lists, per habit, the numbers behind it (days logged, with the habit, as no; for a counted habit the mean and total of the last 7 days and the mean of the 4 weeks before) and what a comparison still needs.
- **Decision it supports:** which of your own habits go with a better or worse night, so you can repeat the first and think twice about the second. It is a pattern in your own data, not proof that a habit causes it.
- **How it is calculated:** a habit on day D is compared with the HRV and the resting heart rate of day D+1, the night after it, each against your own usual value (mean of the 28 days before that night, from 7 days; outliers trimmed as in the other cards). Over the last 90 days the nights after days with the habit (above 0) are set against the nights after days you logged "no". A counted habit (cups of coffee) that has no days without it is compared by amount instead: from 14 nights with an entry and at least 3 different amounts, the rank correlation of the amount with the night after it must reach 0.3 with the same t of 2.5; the bar then shows the change per one more (for example "-0.8 ms per extra"). Under each bar a small line says how many nights it rests on, and "not clear yet" while the difference is within your normal day-to-day swing (grey bar): read a grey bar as a lean, not as a finding. Days without an entry are left out: a missing entry does not say that the habit was not done. A difference is shown from 8 days on each side; it counts as a pattern when Welch's t is at least 2.5 (stricter than the usual 2, because several habits and two measures are tested at once) and the difference is at least 0.3 of your usual spread. The shown day's own habits are not counted yet, because their night has not happened. A habit drops off the card by itself: when Garmin no longer lists it (Garmin lists every habit that is set up in the app on every day, touched or not, so a habit you deleted or replaced there stops being listed), or when it has no entry in the last 30 days.
- **How it is drawn:** per habit two bars from a middle line: right is a better night (higher HRV, lower resting heart rate), green for a clear pattern, orange for a clearly worse one, grey when the difference is not clear. Dots: filled in the accent colour for yes, a ring for "no", a tiny faint dot for not logged.
- **Hiding a habit:** the eye button on a row hides that habit (for a habit you track differently now, or do not want to see). It moves to a small square at the bottom of the card, filled in the accent colour when the shown day has a yes, a ring for a no, dashed for not logged; a tap on the square shows the habit again. Each square carries the first letter of the habit's first word (two or three letters only for habits that would otherwise read alike, such as Coffees and Cold showers: COF, COL), and the full name is its label. A hidden habit stays out of the light bulb. The choice is made in the card and kept by the plugin; there is no setting for it.
- **Needs:** `lifestyle_log`; extra: `hrv`, `resting_hr` (without them a habit shows only its strip and counts).
- **Light bulb:** `lifestyle_*` (HRV higher or lower, resting heart rate lower or higher after a habit; shown in one folded section per habit, closed until you open it; each holds that habit's patterns, its counts and the hint when a habit is only ever logged as yes. A small dot on the heading is orange when the habit has something to watch and green when its nights are better).

### sleep
- **What it shows:** last night's sleep, the last 7 nights as columns, the sleep debt, and a suggested sleep for tonight.
- **Decision it supports:** how early to go to bed tonight.
- **How it is calculated:** the need is 7 hours (8 for ages 14 to 17 and 9 for ages 10 to 13 with a birth year). With at least 10 of the last 28 nights, the reference is their median kept between the need minus 1 hour and the need; the debt on the card is the shortfall against that reference over the last 7 nights (shown from 5 nights). Tonight's aim: with at least 3 earlier nights before the same coming weekday, the upper quarter of the last 8 of them, held between the floor and the need, plus a quarter of the debt (at most 30 minutes); otherwise the need plus a quarter of the debt (at most 1 hour); rounded to 15 minutes. Bedtime and wake-up are used from 3 nights with times.
- **How it is drawn:** one column per night. With times, a bar starts at bedtime and lasts as long as you slept, with dotted lines at your usual bedtime and wake-up (a bar that starts below the first line is a late night, one that ends above the second a short one); without times, bars from zero. The score, debt and tonight's aim sit as numbers around them.
- **Needs:** `sleep_duration`; extra: `sleep_score`, `sleep_start`, `sleep_end` (unlock the timeline).
- **Light bulb:** `sleep_*` (short night, late bed, early wake, debt, irregular, regular).

### stages
- **What it shows:** the night's deep, REM, light and awake time.
- **Decision it supports:** whether a poor night was short or fragmented, and what in the day before might explain it.
- **How it is calculated:** each stage in minutes against the mean ± sd of 14 or more earlier nights that had the stage (a stage of 0 minutes is a watch that did not record it, and is no reading); a difference of more than 1 sd is shown in minutes. Only deep or REM too low, or awake too high, get a tip. All four stages must be present.
- **How it is drawn:** a stacked bar of the four stages and one row each with a track from 0 to twice your usual and a white tick at your usual amount.
- **Needs:** `sleep_deep`, `sleep_rem`, `sleep_light`, `sleep_awake`.
- **Light bulb:** `deep_*`, `rem_*`, `awake_*`, `stages_*`.

### battery
- **What it shows:** your body battery peak today, the lowest value, the overnight recharge and where your daily peaks usually fall.
- **Decision it supports:** how much energy you have to spend, and whether a low peak followed a short night, a stressful day or hard training.
- **How it is calculated:** the usual peak is the mean of the daily peaks of the last 30 days and the usual range their lowest and highest, from 5 days (marked early below 14). The recharge is compared with the 30 day mean of the overnight charge.
- **How it is drawn:** two bars on the same 0 to 100 scale: the top one shows where your peaks fell with a tick at the average, the bottom one today from its lowest to its highest value. A small green diamond on the bar marks what you average on your best days ([personal best](personal-best.md)).
- **Needs:** `body_battery_max`; extra: `body_battery_min`, `body_battery`.
- **Light bulb:** `battery_*`.

### stress
- **What it shows:** the day's average stress level (Garmin's 0 to 100 from heart rate variability) with its band, your 7 day average, and the minutes stressed against the minutes recovering.
- **Decision it supports:** a day that is more stressed than usual is a reason to protect sleep and recovery; a calm one is room for effort.
- **How it is calculated:** bands rest (up to 25), low (to 50), medium (to 75), high (to 100). The marker for the week is the mean of the 7 days before, from 5 days. The usual split is stressed minutes (medium and high) as a share of stressed plus recovering minutes, averaged over the 7 days before, from 5 days of both.
- **How it is drawn:** a gradient bar with a dot at today's level and a tick at the week's average; below it a two-colour bar of stressed and recovering minutes with a tick where your usual split lies. A small green diamond on the bar marks what you average on your best days ([personal best](personal-best.md)).
- **Needs:** `stress`; extra: `stress_high`, `recovery_high` (unlock the split).
- **Light bulb:** `stress_*`.

### hydration
- **What it shows:** the water you logged for the day against your goal, in litres and glasses.
- **Decision it supports:** whether to drink more now, spread over the day, particularly on a training day. Only drinks you log count, so a day without a log shows no reading.
- **How it is calculated:** the goal is the one Garmin holds for the day or, without one, the mean goal of the 7 days before (a goal or average of 0 is no goal); the usual intake is the mean logged intake of the 7 days before, from 3 days. For today a pace is worked out by spreading the goal over the waking day (7:00 to 22:00).
- **How it is drawn:** a bar of the intake with a tick and label at the goal (or at the usual intake when there is no goal), and a foot line of what is left in litres and glasses of 250 ml.
- **Needs:** `hydration_ml`; extra: `hydration_goal_ml`.
- **Light bulb:** `hydration_*` (on pace, behind, below goal, low streak, training day, weekday low). Intake also adds a possible cause to low HRV and high resting heart rate.

### steps
- **What it shows:** steps so far with distance, active calories, total calories and yesterday as small chips.
- **Decision it supports:** whether a short walk is still worth it today.
- **How it is calculated:** your zone is the mean of the 7 days before up to 10 % above it, from 5 days. Being above the zone is never a warning. Walking time assumes 100 steps a minute.
- **How it is drawn:** a bar from 0 to 1.6 times your usual with the zone marked and a dot that is green inside or above and amber below; a foot line of the steps and minutes to the top of the zone. A small green diamond on the bar marks what you average on your best days ([personal best](personal-best.md)).
- **Needs:** `steps`; extra: `distance_km`, `calories_active`, `calories_total`.
- **Light bulb:** `steps_*` (zone reached, below the usual for days, a quiet weekday, and on today how many steps and minutes of walking are left to the usual).

### intensity
- **What it shows:** the week's intensity minutes by day against the weekly goal.
- **Decision it supports:** how much activity is still needed, per day, to reach the week's goal.
- **How it is calculated:** the goal is 150 minutes a week (the usual health guideline; 420 for under 18s), or a little above your own average of the previous weeks (rounded up to 5 minutes) when you regularly do more. Garmin counts vigorous minutes twice. The remaining minutes are divided over the days still to come.
- **How it is drawn:** seven day columns (Monday to Sunday) with a line at the daily amount needed; future days stay empty.
- **Needs:** `intensity_min`.
- **Light bulb:** `intensity_*`.

### floors
- **What it shows:** floors climbed so far.
- **Decision it supports:** whether taking the stairs once or twice more reaches your usual.
- **How it is calculated:** like steps: the zone is the mean of the 7 days before (from 5 days) up to 10 % above it, in whole floors. No zone when the average is zero.
- **How it is drawn:** one block per floor, filled up to today and shaded up to the top of the zone.
- **Needs:** `floors`.
- **Light bulb:** `floors_*` (zone reached, below the usual for days, and on today how many floors are left to the start of the usual range).

### vo2
- **What it shows:** Garmin's estimate of cardio fitness (VO2 max) and how it moved over 12 weeks.
- **Decision it supports:** whether training is building fitness or it has stalled.
- **How it is calculated:** the latest value of each of the last 12 weeks; the change is the slope over those weeks. A change under 0.3 counts as steady. It needs 3 weeks with a value and a value from the last 28 days.
- **How it is drawn:** 12 weekly bars and an arrow with the change.
- **Needs:** `vo2_max`.
- **Light bulb:** `vo2_*` (falling with less training or for other reasons, rising, steady).

### body
- **What it shows:** your weight (average of the last 7 days), body fat when synced and the weekly change.
- **Decision it supports:** whether weight is moving faster than is sensible, without judging the direction.
- **How it is calculated:** the average of the readings of the last 7 days; the change per week is the slope of the last 28 days, shown with 3 readings in 14 days and readings at least a week apart. Notes in pounds and history records in kilograms are brought to the unit of the latest reading. A change faster than 1 % of the body weight per week is flagged.
- **How it is drawn:** a dot for each daily reading of the last 28 days in a neutral colour, because without a goal no direction is good or bad.
- **Needs:** `weight_kg`; extra: `body_fat_pct`.
- **Light bulb:** `body_*`.

### load
- **What it shows:** the load balance: the last 7 days of training against your weekly average of the last 28 days, with Garmin's own training status as a label.
- **Decision it supports:** whether you are building, maintaining, straining or detraining, so the next session can be adjusted.
- **How it is calculated:** each session is its minutes times a factor for how hard it was (0.6 to 1.4): with a birth year from the heart rate zone of its average, otherwise from where its heart rate ranks among your last 90 sessions (needs 10 with a heart rate; sessions with exactly the same heart rate count half, so a session that equals all the others is a middle one). Recovery sessions (breathwork, meditation, stretching, mobility) are left out. The ratio is the 7 day load over the average week of the days of the 28 that have a note or record; at least 14 such days and one previous complete week are needed. Zones: under 0.8 detrain, to 1.0 maintain, to 1.3 build, to 1.5 strain, above overreach.
- **How it is drawn:** a bar from 0.5 to 1.8 with a neutral dot at your ratio and the five zone names under it, the current one emphasised.
- **Needs:** workouts (always synced); extra: `training_status`.
- **Light bulb:** `load_*`.

### weekly
- **What it shows:** this week's training minutes, and the week's distance for running, cycling, walking, outdoor sports and swimming, against your usual week.
- **Decision it supports:** how much more you can add this week without raising training too fast.
- **How it is calculated:** the usual week is the average of up to 4 previous complete weeks with at least 4 days of notes; the limit is 10 % above it, a common ceiling for how fast to raise training. Recovery sessions are left out.
- **How it is drawn:** per measure a bar with a grey tick at the usual week and a red tick at the limit; minutes beyond the limit turn orange.
- **Needs:** workouts (always synced).
- **Light bulb:** `weekly_*`.

### sessions
- **What it shows:** the day's training sessions with their type (named in your language), time, distance, average heart rate and calories, and the place of the first GPS workout.
- **Decision it supports:** how hard the day was, to balance the next days.
- **How it is calculated:** with a birth year the border and a zone bar show the heart rate zone of the session's average (below 50 % of the estimated maximum, then zones 1 to 5 in steps of 10 %); otherwise how its heart rate ranks among your last sessions (blue easy to red hard, from 10 sessions with a heart rate). Several sessions of one type on a day are merged.
- **How it is drawn:** one tile per session with a coloured border; recovery sessions have a dashed border.
- **Needs:** workouts (always synced).
- **Light bulb:** `sessions_*` (all hard, mostly easy, balanced).

See also: [the interpretations under the light bulb](panel-insights.md), [the metrics](metrics.md), [the settings](settings.md), [the history notes](history.md), [troubleshooting](troubleshooting.md), [the README](../README.md).
