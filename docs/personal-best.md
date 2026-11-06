# Personal best

Some cards of the [side panel](panel-cards.md) show a small green diamond on their bar. It marks what you average on your best days, so you see what is reasonably possible for you. The diamond has no label; hold the pointer over it (or let a screen reader read the bar) for the number, and open the light bulb for the same number in words.

The cards with a diamond: HRV, resting heart rate, SpO₂, stress, body battery and steps. The ring on the bar is the shown day, the diamond is your best.

## What a best day is

A best day is a day on which **all** of your metrics were good together, not a day on which one of them was great:

1. Each value of HRV, resting heart rate, stress, sleep score, body battery peak, SpO₂ and steps is ranked among all of your own earlier days that have the metric (0 to 1, in the better direction: higher HRV, lower resting heart rate and stress).
2. A day counts only if it has at least three of these metrics.
3. The score of a day is half the average of its ranks and half its **weakest** rank. A night of the best sleep after a stressful day with a high resting heart rate scores low, because the weakest metric pulls the day down; only days that were good everywhere score high.

## The marker of one metric

For one metric the search runs over the days that have that metric (and at least two others), and the marker is the typical value of the metric on the best of them: the middle value (median) over 5 percent of those days, at least 5 and at most 30. The middle value, not the mean, so a single sensor spike among the best days does not move it.

- A metric you have for years (stress from the first watch) is searched in all those years.
- A metric you have only since a new watch (HRV for three weeks) is searched in those weeks only, so the diamond is based on what you can show with the device you wear now. The other metrics of those days are still ranked against all of your history.
- On a bar where a value that is too high is also flagged (HRV), the diamond stops at the upper edge of your usual range: further out the track is orange or red, which would read as a warning. The number in the tooltip is always the real one.
- With fewer than 14 such days, no diamond is shown.
- Only days before the shown day are used, so looking at an old day shows what you knew then.

All history notes are read for this, not only the last year ([history](history.md)).

## Rank among all your days

The light bulb also says where the shown day stands among all of your days ("Better than 64% of your 1,540 days with data since 2022-03"), from 180 days of data on. A day in the best or weakest tenth gets an interpretation of its own (`history_top`, `history_bottom` in [panel-insights.md](panel-insights.md)). Steps, the body battery peak and the stress of a day that is not over are not ranked, because they are still changing.

This compares you with yourself only. It is no medical statement and no goal: a best day is a reference, not a target to hit every day.

See also: [the cards that show it](panel-cards.md), [the interpretations under the light bulb](panel-insights.md), [the history notes](history.md), [the README](../README.md).
