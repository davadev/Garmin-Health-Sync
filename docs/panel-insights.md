# Health panel: interpretations under the light bulb

Every card of the health panel has a light bulb button. It opens two blocks:

1. **What your data suggests** (framed box, headline in the accent colour): why the value is where it is and what can move it, or, when the value is good and the data allows a guess, what probably made it good. Each line has a coloured edge: orange for something to look at, green for something that is going well.
2. **The general explanation** (plain, muted text below the box): what the card shows and how it is calculated.

The interpretation is deliberately kept under the light bulb so the cards stay uncluttered. What each card shows, which decision it helps with and how it is calculated and drawn is in [panel-cards.md](panel-cards.md); this page documents the interpretations and the formulas they rest on.

## Principles

- **Rule based and local.** Every text comes from a fixed rule over the daily notes in the vault. Nothing is sent anywhere and nothing is generated.
- **Data first.** A rule fires on the person's own numbers: their 30 day range, last night's sleep, the load of the last week, yesterday's steps. The text names those numbers where it helps ("you went to bed 1 h 10 min later than usual").
- **Numbers on the card, advice under the light bulb.** A card shows what was measured and the numbers to hit (steps to the zone, minutes a day, tonight's sleep target) in one row style: a muted label and a value on the right, neutral in colour, green only when something is reached (zone done, goal reached) and amber for a warning. Recommendations and explanations ("ease off", "take the stairs") never sit on the card; they live in this file and under the light bulb. Trend lines stay on the card.
- **No generic tips.** There is no "avoid alcohol before bed" or "drink more water". A tip only appears when the data points to it, and it is the lever that the data points to (an earlier bedtime when the hours were lost at the start of the night, sleeping to the usual time when the alarm was early, and so on).
- **Honest about what is not explained.** When no rule finds a cause, the text says so (`unexplained`) and points to the trend instead of inventing one.
- **Never a diagnosis.** Wrist data are estimates and the studies describe groups of people. Every interpretation box ends with a note saying so, and illness-related texts say "worth watching" and "if you feel unwell", not more.
- **At most 3 lines per card**, in the order the rules are listed in the code (`src/panel/insights/`).

## The Today card

The Today card is a rule of thumb taken from the original concept, **not a validated score**. It is not calibrated against Garmin's readiness (which is shown next to it when the watch provides it).

- **Score (0 to 100):** 60 + t x (10 x z(HRV) - 7 x z(resting heart rate) - 4 x sleep debt in hours (at most 3) + 0.25 x (body battery peak - usual peak, between -8 and +8)). A day with nothing unusual scores 60, so an ordinary day is moderate, not tired. The z values are held between -2 and 2 (HRV and resting heart rate move together, so a far-out pair is one signal counted twice) and use the user's own 30 day range. **HRV is judged on the 7-night average, not on one night:** z(HRV) is 2 x z7, where z7 is the distance of the geometric mean of the last 7 nights (the shown night included) from the baseline mean in standard deviations of ln(HRV), so a distance of 0.5 standard deviations (the smallest worthwhile change, see "Where the numbers come from") counts as 1 and moves the score by 10. With fewer than 4 of the 7 nights, or without a baseline of 14 nights, it falls back to the shown night against the 30 day range; a missing body battery leaves its term out. `t` is the trust in that range: the days with both HRV and resting heart rate divided by 21, at most 1, so a young range (a new watch, or a new account) pulls the score towards 60 instead of swinging it. The sleep debt is counted against the sleep the person usually gets (the median of the last 28 nights, kept between an hour under the need and the need; see the Sleep card), not against the general need, which would charge a short sleeper the same debt every day. `t` counts the days of the last 30 on which HRV *and* resting heart rate were both measured, so two ranges that cover different weeks (a watch that changed in between) do not add up to one. Without HRV, resting heart rate or the sleep debt there is no own score; neither is there one with fewer than 5 such days, nor without last night's sleep (a missing night would count as no debt and raise the score). When some of the last 7 nights have no sleep data the debt is a lower bound, which the card says ("The sleep debt rests on 5 of 7 nights ..."). The weights are a judgment call, not fitted to Garmin's readiness.
- **Bands:** 0-29 poor, 30-49 low, 50-69 moderate, 70-89 high, 90-100 prime.
- **Flags:** HRV low (the 7-night average more than 0.5 standard deviations below the baseline, or the shown night more than 2 standard deviations below the 30 day range when no hard session explains it; with fewer than 4 nights of the week, the shown night more than 1 standard deviation below), resting heart rate high (not raised the morning after a hard session), sleep debt (against the usual sleep) above 2 hours, body battery peak more than 15 below usual, stress more than 10 above the 7 day average, breathing more than 1.5 standard deviations up, SpO2 below 94 percent, load ratio above 1.5.
- **Verdict:** rest (day off, walk and mobility) for 3 or more flags, raised breathing together with a high resting heart rate, or band poor or low once the range rests on 21 days (before that a low band alone gives "go easy"); train hard for band high or better with no flag; train as planned for band high or better with one flag or band moderate with none; go easy (zone 2) otherwise. **The morning after a hard session** the verdict is at most "go easy" (a rest verdict stays), and the night's low HRV and raised resting heart rate are not flagged. A hard session is one of yesterday that is not a recovery session and whose intensity is known (heart rate with a birth year, or at least 10 earlier sessions) with an intensity step of 3 or more, or a load (minutes times the intensity factor) of 70 or more. Without a known intensity the minutes alone do not make a session hard. The threshold is a starting value, not a validated one.

## How to add or change an interpretation

1. Add the id to `INSIGHTS` in `src/panel/insights/registry.ts` (card, kind) and the rule in the matching file next to it.
2. Add the text `insight_<id>` to all six language files in `src/i18n/` (the translation gate and placeholder test enforce this).
3. Add a section with this exact heading `### <id>` to this file with **Trigger**, **Basis** and **References** (a link to the study, or `none` and why). `tests/panelInsightsDocs.test.ts` fails when an id has no section, a section has no id or a section lacks one of the three lines.
4. Test the trigger and the neighbouring case where it must not fire.

## Where the numbers come from

- *Usual range*: the mean and standard deviation of the 30 days before the shown day, from 5 days of data on. From 8 values on, a value more than 5 robust spreads from the median (1.4826 times the median absolute deviation, but at least the floor below) is left out of the mean and the spread, unless that would leave out a quarter or more of the values (then the days are of two kinds, for example before and after a new watch, and none is an outlier): one sensor error or one day of fever would otherwise widen the range for a month. The trend line stays a plain mean of the last 7 days against the 7 before, and the 14 bars show every value, so a freak value stays visible there. Sleep stages count only nights with more than 0 minutes of the stage (a watch that does not record a stage sends 0, which is no reading). A number typed into a text property ("8000") is read as the number. (standard deviation floors: HRV 2 ms, resting heart rate 1.5 bpm, SpO2 0.7 percent, breathing 0.4 per minute, stress 5, steps 500, body battery peak 5).
- *HRV week (HRV card and Today card)*: the 14 bars are the last 14 nights; the line is the rolling average of 7 nights (geometric mean, that is the mean of ln(HRV), shown back in ms), drawn from 3 nights of the 7 and judged by Today from 4. The usual range for a week is the baseline mean plus or minus half a standard deviation (the smallest worthwhile change). The baseline is ln(HRV) of the up to 60 nights before the 7 of the week (from 14 nights on, with the same outlier rule as the usual range), so a low week cannot pull down the range it is compared with; the spread is at least 0.04 (about 4 percent of the level). Nights without a value are left out, never counted as low; a run of 3 or more is drawn as a dashed box. The use of a 7 day rolling mean of ln RMSSD against a smallest worthwhile change follows Plews et al. 2012 and Javaloyes et al. 2019; three valid nights a week give a weekly mean that tracks the full week (Plews et al. 2014, *Int J Sports Physiol Perform* 9:783-790, not linked because the page was not opened). Today asks for 4 because overnight values are noisier than the morning readings of those studies. **Limits:** the studies are in athletes with morning RMSSD, Garmin sends an overnight average; reviews find the benefit of HRV-guided training small and not clear, and the best baseline is still debated. The numbers are starting values, not validated thresholds.
- *Load ratio*: the last 7 days over the weekly average of the last 28 days, each session weighted by its intensity (see the Load balance card). Without a birth year the intensity is where the session's average heart rate ranks among the last 90 sessions, counting half of the sessions with exactly the same heart rate, so a session that equals all the others is a middle one, not the hardest. The average is taken over the days of the 28 that have a note or history record, so a history that is only two or three weeks old is not divided by four weeks; with fewer than 14 such days no ratio is shown.
- *Sleep need and debt*: 7 hours (8 for ages 14 to 17 and 9 for ages 10 to 13 when a birth year is set); debt is the shortfall summed over the last 7 nights.
- *Tonight's aim and the debt on the card*: the Sleep card does not ask for more than a person's life allows. With at least 3 earlier nights before the coming weekday (up to the last 8), the aim is the upper quarter of those nights, held between the need minus 1 hour (6 hours for an adult, 7 for ages 14 to 17, 8 for ages 10 to 13) and the need, plus a quarter of the debt (at most 30 minutes), rounded up to 15 minutes. Without that pattern it stays the need plus a quarter of the debt (at most 1 hour). The debt on the card is counted against what the person usually sleeps: the median of the last 28 nights (from 10 nights on), held between the same floor and the need; the interpretations above still count against the general need. The floor is a plausibility limit chosen so the card never presents a very short night as a goal; it is not a validated threshold.
- *Bedtime and wake-up*: from the optional metrics `sleep_start` and `sleep_end` (at least 3 nights).

## References

Only sources that were looked up when this file was written are listed. Where a rule rests on plausibility or on the user's own arithmetic, it says `none` and why.

- **statpearls**: Patel AK, Reddy V, Shumway KR, Araujo JF. *Physiology, Sleep Stages*. StatPearls. [https://www.ncbi.nlm.nih.gov/books/NBK526132/](https://www.ncbi.nlm.nih.gov/books/NBK526132/)
- **kredlow**: Kredlow MA, Capozzoli MC, Hearon BA, Calkins AW, Otto MW. The effects of physical activity on sleep: a meta-analytic review. *J Behav Med* 2015;38:427-449. [https://pubmed.ncbi.nlm.nih.gov/25596964/](https://pubmed.ncbi.nlm.nih.gov/25596964/)
- **windred**: Windred DP et al. Sleep regularity is a stronger predictor of mortality risk than sleep duration: a prospective cohort study. *SLEEP* 2024;47(1). [https://www.ukbiobank.ac.uk/publications/sleep-regularity-is-a-stronger-predictor-of-mortality-risk-than-sleep-duration-a-prospective-cohort-study/](https://www.ukbiobank.ac.uk/publications/sleep-regularity-is-a-stronger-predictor-of-mortality-risk-than-sleep-duration-a-prospective-cohort-study/)
- **kitamura**: Kitamura S et al. Estimating individual optimal sleep duration and potential sleep debt. *Sci Rep* 2016;6:35812. [https://doi.org/10.1038/srep35812](https://doi.org/10.1038/srep35812)
- **vandongen**: Van Dongen HPA, Maislin G, Mullington JM, Dinges DF. The cumulative cost of additional wakefulness. *Sleep* 2003;26:117-126. [https://pubmed.ncbi.nlm.nih.gov/12683469/](https://pubmed.ncbi.nlm.nih.gov/12683469/)
- **plews**: Plews DJ, Laursen PB, Kilding AE, Buchheit M. Heart rate variability in elite triathletes, is variation in variability the key to effective training? A case comparison. *Eur J Appl Physiol* 2012;112:3729-3741. [https://pubmed.ncbi.nlm.nih.gov/22367011/](https://pubmed.ncbi.nlm.nih.gov/22367011/)
- **javaloyes**: Javaloyes A et al. Training prescription guided by heart-rate variability in cycling. *Int J Sports Physiol Perform* 2019. [https://dspace.umh.es/handle/11000/30650](https://dspace.umh.es/handle/11000/30650)
- **buchheit**: Buchheit M. Monitoring training status with HR measures: do all roads lead to Rome? *Front Physiol* 2014;5:73. [https://doi.org/10.3389/fphys.2014.00073](https://doi.org/10.3389/fphys.2014.00073)
- **mishra**: Mishra T et al. Pre-symptomatic detection of COVID-19 from smartwatch data. *Nat Biomed Eng* 2020;4:1208-1220. [https://doi.org/10.1038/s41551-020-00640-6](https://doi.org/10.1038/s41551-020-00640-6)
- **natarajan**: Natarajan A, Su HW, Heneghan C. Assessment of physiological signs associated with COVID-19 measured using wearable devices. *npj Digit Med* 2020;3:156. [https://doi.org/10.1038/s41746-020-00363-7](https://doi.org/10.1038/s41746-020-00363-7)
- **kim**: Kim HG, Cheon EJ, Bai DS, Lee YH, Koo BH. Stress and heart rate variability: a meta-analysis and review of the literature. *Psychiatry Investig* 2018;15:235-245. [https://pubmed.ncbi.nlm.nih.gov/29486547/](https://pubmed.ncbi.nlm.nih.gov/29486547/)
- **zaccaro**: Zaccaro A et al. How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. *Front Hum Neurosci* 2018;12:353. [https://doi.org/10.3389/fnhum.2018.00353](https://doi.org/10.3389/fnhum.2018.00353)
- **reimers**: Reimers AK, Knapp G, Reimers CD. Effects of exercise on the resting heart rate: a systematic review and meta-analysis of interventional studies. *J Clin Med* 2018;7:503. [https://doi.org/10.3390/jcm7120503](https://doi.org/10.3390/jcm7120503)
- **akerstedt**: Åkerstedt T. Psychosocial stress and impaired sleep. *Scand J Work Environ Health* 2006;32:493-501. [https://doi.org/10.5271/sjweh.1054](https://doi.org/10.5271/sjweh.1054)
- **gabbett**: Gabbett TJ. The training-injury prevention paradox: should athletes be training smarter and harder? *Br J Sports Med* 2016;50:273-280. [https://doi.org/10.1136/bjsports-2015-095788](https://doi.org/10.1136/bjsports-2015-095788)
- **seiler**: Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? *Int J Sports Physiol Perform* 2010;5:276-291. [https://pubmed.ncbi.nlm.nih.gov/20861519/](https://pubmed.ncbi.nlm.nih.gov/20861519/)
- **bacon**: Bacon AP, Carter RE, Ogle EA, Joyner MJ. VO2max trainability and high intensity interval training in humans: a meta-analysis. *PLoS One* 2013;8:e73182. [https://pubmed.ncbi.nlm.nih.gov/24066036/](https://pubmed.ncbi.nlm.nih.gov/24066036/)
- **milanovic**: Milanović Z, Sporiš G, Weston M. Effectiveness of high-intensity interval training (HIT) and continuous endurance training for VO2max improvements. *Sports Med* 2015;45:1469-1481. [https://doi.org/10.1007/s40279-015-0365-0](https://doi.org/10.1007/s40279-015-0365-0)
- **paluch**: Paluch AE et al. Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts. *Lancet Public Health* 2022;7:e219-e228. [https://doi.org/10.1016/S2468-2667(21)00302-9](https://doi.org/10.1016/S2468-2667(21)00302-9)
- **who**: Bull FC et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. *Br J Sports Med* 2020;54:1451-1462. [https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/)
- **orsama**: Orsama AL et al. Weight rhythms: weight increases during weekends and decreases during weekdays. *Obes Facts* 2014;7:36-47. [https://pubmed.ncbi.nlm.nih.gov/24504358/](https://pubmed.ncbi.nlm.nih.gov/24504358/)
- **fda**: U.S. Food and Drug Administration. *Pulse oximeters* (accuracy and limitations; use readings as estimates and follow trends). [https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters)
- **watso**: Watso JC, Farquhar WB. Hydration status and cardiovascular function. *Nutrients* 2019;11:1866. [https://doi.org/10.3390/nu11081866](https://doi.org/10.3390/nu11081866)
- **sawka**: Sawka MN et al. American College of Sports Medicine position stand. Exercise and fluid replacement. *Med Sci Sports Exerc* 2007;39:377-390. [https://pubmed.ncbi.nlm.nih.gov/17277604/](https://pubmed.ncbi.nlm.nih.gov/17277604/)
- **garmin**: Garmin. *Body Battery energy monitoring* (heart rate variability, stress, sleep and activity; sleep charges, stress and strenuous activity drain). [https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

See also: [panel-cards.md](panel-cards.md) (what each card shows and how it is calculated), [metrics.md](metrics.md), [settings.md](settings.md), [troubleshooting.md](troubleshooting.md#the-side-panel).

## Interpretations

### today_flag_hrv

- **Card:** today
- **Trigger:** HRV is below the usual: the 7-night average more than 0.5 standard deviations under the baseline is shown as today_week_low; this plain sentence is for a single night more than 2 standard deviations below the 30 day range with no hard session, or, with fewer than 4 nights in the week, more than 1 standard deviation below.
- **Text (English):** HRV is below your usual range.
- **Basis:** Part of the Today verdict. HRV is one of the heart rate measures that follow training status.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### today_hard_session

- **Card:** today
- **Trigger:** Yesterday held a session that is not a recovery session, whose intensity is known and is step 3 or more, or whose load is 70 or more.
- **Text (English):** Yesterday's session was hard. A lower HRV and a higher resting heart rate this morning are expected after hard effort, so they are not counted against you. An easy day lets your body catch up.
- **Basis:** HRV and resting heart rate follow training load, and a hard session lowers HRV and lifts resting heart rate the next morning; interpreting them needs that context. The thresholds are a plausibility choice, not validated.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### today_week_low

- **Card:** today
- **Trigger:** At least 4 of the last 7 nights have an HRV and their geometric mean is more than 0.5 standard deviations (of ln HRV) below the mean of the nights before that week.
- **Text (English):** Your HRV averaged {avg} ms over the last {n} nights, below your usual range for a week. One night can dip, but a whole week points to a lasting load, so keep the next days easy.
- **Basis:** A 7-night rolling average of HRV that falls under the smallest worthwhile change below the person's own baseline is the criterion used in HRV-guided training to lower intensity; one night is noisier than the week. It is a signal, not a diagnosis.
- **References:** [plews](https://pubmed.ncbi.nlm.nih.gov/22367011/); [javaloyes](https://dspace.umh.es/handle/11000/30650)

### today_flag_rhr

- **Card:** today
- **Trigger:** Resting heart rate is more than 1 standard deviation above its 30 day mean.
- **Text (English):** Resting heart rate is above your usual.
- **Basis:** Part of the Today verdict; resting heart rate follows training status and strain.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### today_flag_sleep

- **Card:** today
- **Trigger:** The sleep debt of the last 7 nights is more than 2 hours.
- **Text (English):** Your sleep debt over the last 7 nights is {debt}.
- **Basis:** Part of the Today verdict; arithmetic on the user's own sleep and need.
- **References:** [kitamura](https://doi.org/10.1038/srep35812)

### today_flag_battery

- **Card:** today
- **Trigger:** The body battery peak is more than 15 below the usual peak of the last 30 days.
- **Text (English):** Your body battery peaked {gap} points below your usual.
- **Basis:** Part of the Today verdict; Garmin describes the battery as reflecting recovery, stress and sleep.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

### today_flag_stress

- **Card:** today
- **Trigger:** The stress level is more than 10 above the average of the 7 days before.
- **Text (English):** Your stress level is above your 7-day average.
- **Basis:** Part of the Today verdict; stress is derived from heart rate variability.
- **References:** [kim](https://pubmed.ncbi.nlm.nih.gov/29486547/)

### today_flag_breathing

- **Card:** today
- **Trigger:** The breathing rate is more than 1.5 standard deviations above its 30 day mean.
- **Text (English):** Your breathing rate is above your usual.
- **Basis:** Part of the Today verdict; raised respiration is part of the illness pattern in wearable studies.
- **References:** [natarajan](https://doi.org/10.1038/s41746-020-00363-7)

### today_flag_spo2

- **Card:** today
- **Trigger:** SpO2 is below 94 percent.
- **Text (English):** Blood oxygen was below 94 percent.
- **Basis:** Part of the Today verdict; a low value is a reason to watch, and the FDA advises judging by trends.
- **References:** [fda](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters)

### today_flag_load

- **Card:** today
- **Trigger:** The load ratio (7 days over the 28 day weekly average) is above 1.5.
- **Text (English):** Your training load of the last 7 days is {pct} percent above your usual.
- **Basis:** Part of the Today verdict; large spikes in load relative to the usual load were linked to more injuries.
- **References:** [gabbett](https://doi.org/10.1136/bjsports-2015-095788)

### today_no_flags

- **Card:** today
- **Trigger:** The Today score exists and none of the eight flags applies.
- **Text (English):** Nothing stands out. Your HRV, resting heart rate, sleep and your other data are in their usual range.
- **Basis:** Positive confirmation.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### unexplained

- **Card:** any
- **Trigger:** Shown when a value is outside the usual range (HRV low, resting heart rate high, REM low, awake time high, body battery peak low) and none of the specific reasons below applies.
- **Text (English):** Nothing else in your data explains it. Single days vary, so look at the trend over several days before changing anything.
- **Basis:** An honest answer: the other data the plugin has does not explain the change. Single days vary a lot, so the text points to the trend instead of inventing a cause.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### history_top

- **Card:** any
- **Trigger:** The metric of the card (HRV, resting heart rate, SpO₂, stress, body battery peak, steps) has at least 180 earlier days, and the shown day beats at least 90 percent of them in the better direction (higher HRV, lower resting heart rate or stress). A day in progress is not ranked for steps, stress and the body battery peak. Added only while the card shows fewer than three interpretations.
- **Text (English):** One of your best days: better than {pct}% of your {n} days since {since}.
- **Basis:** The rank of the value among all of the person's own earlier days (the values below it plus half of those equal to it), see [personal-best.md](personal-best.md). It compares the person with themselves only.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### history_bottom

- **Card:** any
- **Trigger:** Same days and metrics as `history_top`, and the shown day beats at most 10 percent of the earlier days in the better direction.
- **Text (English):** One of your weaker days: better than only {pct}% of your {n} days since {since}. A single day says little, so look at how the days around it went.
- **Basis:** The same rank among the person's own earlier days; the text says that one day is no verdict and points to the days around it.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### hrv_low_load

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation below its 30 day mean and the load balance ratio (last 7 days over the 28 day weekly average) is above 1.3.
- **Text (English):** Your training of the last 7 days is {pct} percent above your usual load. HRV commonly dips after a spike in load and returns within a few easier days, so keep the next days light.
- **Basis:** HRV reflects autonomic recovery and responds to training load; interpreting it needs the training context.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073); [gabbett](https://doi.org/10.1136/bjsports-2015-095788)

### hrv_low_hard_session

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation below its 30 day mean and yesterday held a hard session (see today_hard_session). It comes before the other reasons.
- **Text (English):** Yesterday's hard session explains a low night. HRV commonly dips for a day or two after hard effort and returns with an easier day.
- **Basis:** HRV reflects autonomic recovery and drops after hard training, so a low night right after one is expected.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### hrv_low_sleep

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation low and the sleep debt of the last 7 nights is at least 2 hours (needs 5 nights of sleep data).
- **Text (English):** You slept {debt} less than your need of {need} hours over the last 7 nights. The sleep shortfall is the most direct thing to fix: aim for your need again for a few nights.
- **Basis:** The sleep shortfall is the lever the user controls. No study is cited for the HRV link itself; the text only points to the shortfall as the first thing to fix, and the debt dynamics are from the references.
- **References:** [kitamura](https://doi.org/10.1038/srep35812); [vandongen](https://pubmed.ncbi.nlm.nih.gov/12683469/)

### hrv_low_stress

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation low and the stress level of the day is more than 1 standard deviation above its 30 day mean.
- **Text (English):** Your stress level today is above your usual, and HRV drops when stress is high. A few minutes of slow breathing, about 6 breaths a minute, raises HRV in the short term.
- **Basis:** HRV changes with stress in most studies (review); slow breathing around 6 breaths a minute raises HRV in the short term (systematic review).
- **References:** [kim](https://pubmed.ncbi.nlm.nih.gov/29486547/); [zaccaro](https://doi.org/10.3389/fnhum.2018.00353)

### hrv_low_illness

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation low and resting heart rate or breathing rate is more than 1 standard deviation above its 30 day mean.
- **Text (English):** HRV is low while your resting heart rate is up. That pattern often shows when the body is under strain or fighting an infection. If you feel unwell, take a day off and watch the next mornings.
- **Basis:** Raised resting heart rate with lowered HRV is the pattern wearable studies found around the onset of infection. It is a signal to watch, not a diagnosis.
- **References:** [mishra](https://doi.org/10.1038/s41551-020-00640-6); [natarajan](https://doi.org/10.1038/s41746-020-00363-7); [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### hrv_low_hydration

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation below its 30 day mean and the logged water of the day before is under 75% of that day's goal (or of the 7-day average intake when no goal is logged).
- **Text (English):** Yesterday you logged less than three quarters of your usual water. Too little fluid can raise heart rate and lower HRV, so drink well today and compare tomorrow morning.
- **Basis:** Reduced body water raises heart rate and lowers stroke volume, and reviews link hydration status to cardiovascular function. It is offered as one possible cause next to the others, and the intake is only what the person logged.
- **References:** [watso](https://doi.org/10.3390/nu11081866)

### hrv_low_streak

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation below its 30 day mean on the shown night and on at least one night right before it (each night against the 30 days before it), and none of the other low-HRV reasons applies: no load spike, no sleep debt of 2 hours or more, no stress above the usual, no raised resting heart rate or breathing. The same sentence also shows as a warning line on the card.
- **Text (English):** HRV has been below your usual range for {n} nights in a row, and your training, sleep and stress do not explain it. A lasting unexplained drop can come before an infection or mean the body is run down. Watch how you feel over the next days; if you have symptoms, take it easy.
- **Basis:** A single low night is noise; a drop that lasts several nights below the person's own range, with training, sleep and stress ruled out, is what wearable studies saw before infections, and sustained HRV declines are used in athlete monitoring as a sign of accumulated fatigue. It is a signal to watch, not a diagnosis.
- **References:** [natarajan](https://doi.org/10.1038/s41746-020-00363-7); [mishra](https://doi.org/10.1038/s41551-020-00640-6); [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### hrv_high_light_load

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation above its 30 day mean and the load ratio is below 1.0.
- **Text (English):** Your training of the last 7 days is {pct} percent below your usual load. HRV tends to rise when load eases, so this fits a well recovered body.
- **Basis:** HRV tends to rise when training load eases; the text only says this fits a well recovered body.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### hrv_in_range

- **Card:** hrv
- **Trigger:** HRV is within 1 standard deviation of its 30 day mean.
- **Text (English):** Within your usual range: your recovery looks as usual.
- **Basis:** Positive confirmation relative to the person's own range.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### rhr_high_load

- **Card:** resting_hr
- **Trigger:** Resting heart rate is more than 1 standard deviation above its 30 day mean and the load ratio is above 1.3.
- **Text (English):** Your training of the last 7 days is {pct} percent above your usual load. Resting heart rate often rises after heavy training and falls again with easier days.
- **Basis:** Resting heart rate is one of the measures that follows training status; interpret it with the training context.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### rhr_high_sleep

- **Card:** resting_hr
- **Trigger:** Resting heart rate is more than 1 standard deviation above its mean and the sleep debt of the last 7 nights is at least 2 hours.
- **Text (English):** You slept {debt} less than your need over the last 7 nights. A sleep shortfall is a common reason for a higher resting heart rate; catching up over a few nights helps.
- **Basis:** Plausible and common, but no study is cited; the text offers the sleep shortfall as the first lever.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### rhr_high_illness

- **Card:** resting_hr
- **Trigger:** Resting heart rate is more than 1 standard deviation above its mean and HRV is more than 1 standard deviation below, or the breathing rate is more than 1 standard deviation above.
- **Text (English):** A higher resting heart rate together with a lower HRV or faster breathing often marks the start of an illness. If you feel unwell, take a day off and watch the next mornings.
- **Basis:** Elevated resting heart rate with changes in HRV and respiration is the pattern seen around illness onset in wearable data.
- **References:** [mishra](https://doi.org/10.1038/s41551-020-00640-6); [natarajan](https://doi.org/10.1038/s41746-020-00363-7)

### rhr_high_hard_session

- **Card:** resting_hr
- **Trigger:** Resting heart rate is more than 1 standard deviation above its 30 day mean and yesterday held a hard session (see today_hard_session). It comes before the other reasons.
- **Text (English):** Your resting heart rate is up the morning after a hard session, which is normal. It usually settles within a day or two of easier training.
- **Basis:** Resting heart rate follows training status and rises after hard effort; interpreting it needs the training context.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### rhr_high_hydration

- **Card:** resting_hr
- **Trigger:** Resting heart rate is more than 1 standard deviation above its 30 day mean and the logged water of the day before is under 75% of that day's goal (or of the 7-day average intake when no goal is logged).
- **Text (English):** Yesterday you logged less than three quarters of your usual water. When the body is short of fluid the heart beats faster to keep blood pressure up, which can lift the resting heart rate. Drink well today and compare tomorrow morning.
- **Basis:** Reduced body water makes the heart beat faster to hold blood pressure, which can lift the resting heart rate. It is one possible cause next to the others, and the intake is only what the person logged.
- **References:** [watso](https://doi.org/10.3390/nu11081866)

### rhr_low_fitness

- **Card:** resting_hr
- **Trigger:** Resting heart rate is more than 1 standard deviation below its 30 day mean.
- **Text (English):** Lower than usual: resting heart rate falls with regular endurance training and good recovery.
- **Basis:** Endurance training lowers resting heart rate in controlled trials.
- **References:** [reimers](https://doi.org/10.3390/jcm7120503)

### rhr_in_range

- **Card:** resting_hr
- **Trigger:** Resting heart rate is within 1 standard deviation of its 30 day mean.
- **Text (English):** Within your usual range.
- **Basis:** Positive confirmation relative to the person's own range.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### spo2_low_repeated

- **Card:** spo2
- **Trigger:** At least 3 of the last 7 nights (the shown night included) have an average SpO2 below 92 percent.
- **Text (English):** {n} of the last 7 nights were below 92 percent. Wrist sensors are estimates, but repeated low nights are worth mentioning to a doctor, especially with snoring or daytime tiredness.
- **Basis:** Wrist sensors are estimates and the FDA advises judging pulse oximetry by trends over time; repeated low nights are a reason to talk to a doctor. This is not a diagnosis.
- **References:** [fda](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters)

### spo2_low_with_breathing

- **Card:** spo2
- **Trigger:** SpO2 is below 94 percent or more than 1 standard deviation below its mean, and the breathing rate is more than 1 standard deviation above its mean.
- **Text (English):** Your breathing rate is up as well. A cold or a blocked nose can lower oxygen and raise breathing at night; watch how you feel over the next days.
- **Basis:** Plausible common cause (a cold or congestion); no study cited. Worded as something to watch.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### spo2_low_single

- **Card:** spo2
- **Trigger:** SpO2 is below 94 percent or more than 1 standard deviation below its mean, and neither of the other SpO2 texts applies.
- **Text (English):** One low night is often down to sensor fit or sleeping position. Judge it by the trend over several nights, not by a single value.
- **Basis:** Sensor fit and position affect readings; the FDA advises using readings as estimates and following trends.
- **References:** [fda](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters)

### spo2_ok

- **Card:** spo2
- **Trigger:** SpO2 is 95 percent or higher and not more than 1 standard deviation below its mean.
- **Text (English):** A healthy sleeper usually sits between 95 and 100 percent. Yours does.
- **Basis:** The usual range for healthy sleepers; general reference value.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### breathing_up_illness

- **Card:** respiration_rate
- **Trigger:** The breathing rate is more than 1 standard deviation above its mean, or at least 1.5 breaths a minute above it, and resting heart rate is more than 1 standard deviation above its mean.
- **Text (English):** Breathing rate and resting heart rate are both up. This pair is an early sign of illness in studies of wearables; if you feel unwell, take a day off.
- **Basis:** Raised respiration together with raised resting heart rate is part of the illness pattern in wearable studies.
- **References:** [natarajan](https://doi.org/10.1038/s41746-020-00363-7); [mishra](https://doi.org/10.1038/s41551-020-00640-6)

### breathing_up_alone

- **Card:** respiration_rate
- **Trigger:** The breathing rate is raised as above but resting heart rate is not.
- **Text (English):** A raised breathing rate on its own is a weak signal. Watch it for a few nights together with your resting heart rate before drawing conclusions.
- **Basis:** A raised breathing rate alone is a weak signal; the text asks to watch it with resting heart rate.
- **References:** [natarajan](https://doi.org/10.1038/s41746-020-00363-7)

### breathing_ok

- **Card:** respiration_rate
- **Trigger:** The breathing rate is within 1 standard deviation of its mean and less than 1.5 breaths a minute above it.
- **Text (English):** Within your usual range.
- **Basis:** Positive confirmation relative to the person's own range.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### sleep_short_late_bed

- **Card:** sleep
- **Trigger:** The night is more than 30 minutes shorter than the need, a bedtime and wake-up time exist for at least 3 of the last 7 nights, and last night's bedtime is at least 30 minutes later than the average bedtime.
- **Text (English):** You went to bed {late} later than usual ({bed}), which cost the hours. Your usual bedtime would have given you about {gain} more.
- **Basis:** Arithmetic on the user's own times: the hours were lost at the start of the night.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### sleep_short_early_wake

- **Card:** sleep
- **Trigger:** The night is more than 30 minutes shorter than the need and the wake-up was at least 30 minutes earlier than the average wake-up time.
- **Text (English):** You got up {early} earlier than your usual {wake}. Sleeping to your usual time would have added it back, and REM sleep, which is concentrated in the last hours of the night, would have benefited most.
- **Basis:** REM periods lengthen toward the morning, so an early alarm costs REM first.
- **References:** [statpearls](https://www.ncbi.nlm.nih.gov/books/NBK526132/)

### sleep_short_average

- **Card:** sleep
- **Trigger:** The average of the last 7 nights (at least 5 with data) is at least 20 minutes below the need.
- **Text (English):** On average you sleep {avg}, which is {gap} short of your {need} hours. An earlier bedtime is usually easier to keep than a later alarm.
- **Basis:** Arithmetic on the user's own data; an earlier bedtime is offered as the usual practical route.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### sleep_debt_high

- **Card:** sleep
- **Trigger:** The sleep debt of the last 7 nights is at least 3 hours.
- **Text (English):** Against the general need your sleep debt is {debt}. It takes several nights to pay back; adding 30 to 60 minutes each night works better than one very long sleep.
- **Basis:** Debt is recovered over several nights; in a laboratory study 1 hour of debt took about 4 days to recover. Chronic restriction accumulates deficits that people often do not notice.
- **References:** [kitamura](https://doi.org/10.1038/srep35812); [vandongen](https://pubmed.ncbi.nlm.nih.gov/12683469/)

### sleep_irregular

- **Card:** sleep
- **Trigger:** The standard deviation of bedtime or wake-up time over the last 7 nights (at least 3 with times) is at least 60 minutes.
- **Text (English):** Your bed or wake-up time varies by about {sd} minutes. Regular sleep times are linked to lower health risk independent of how long you sleep; try to keep both within 30 minutes.
- **Basis:** Sleep regularity predicted mortality at least as well as duration in a large cohort.
- **References:** [windred](https://www.ukbiobank.ac.uk/publications/sleep-regularity-is-a-stronger-predictor-of-mortality-risk-than-sleep-duration-a-prospective-cohort-study/)

### sleep_regular_good

- **Card:** sleep
- **Trigger:** The night reached the need, the sleep debt is below 1 hour and both the bedtime and wake-up standard deviations are below 30 minutes.
- **Text (English):** You reached your need and your times are regular (about ±{sd} minutes). Regular timing is linked to lower health risk independent of duration.
- **Basis:** Same study as above, positive direction.
- **References:** [windred](https://www.ukbiobank.ac.uk/publications/sleep-regularity-is-a-stronger-predictor-of-mortality-risk-than-sleep-duration-a-prospective-cohort-study/)

### sleep_enough_good

- **Card:** sleep
- **Trigger:** The night reached the need, the sleep debt is below 1 hour and the times are not regular enough for the previous text.
- **Text (English):** You reached your need with {sleep} and your sleep debt is small. Your habits of the last nights are working.
- **Basis:** Positive confirmation relative to the user's need.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### deep_low_inactive

- **Card:** stages
- **Trigger:** Deep sleep is more than 1 standard deviation below its 30 day mean and yesterday's steps were more than 0.5 standard deviations below their mean.
- **Text (English):** Yesterday you took fewer steps than usual. Daytime activity is linked to more deep sleep the next night; a longer walk or a session earlier in the day is the most direct lever.
- **Basis:** Acute exercise produced a small increase in slow-wave sleep in a meta-analysis. Daytime activity is a lever the user controls.
- **References:** [kredlow](https://pubmed.ncbi.nlm.nih.gov/25596964/)

### deep_low_fragmented

- **Card:** stages
- **Trigger:** Deep sleep is more than 1 standard deviation low and awake time more than 1 standard deviation high.
- **Text (English):** You were awake more than usual, which interrupts deep sleep. Look at what disturbed the night: noise, a warm room, stress or breathing.
- **Basis:** Stress and disturbed sleep go with shorter, fragmented sleep and possibly less deep sleep.
- **References:** [akerstedt](https://doi.org/10.5271/sjweh.1054)

### deep_low_timing

- **Card:** stages
- **Trigger:** Deep sleep is more than 1 standard deviation low and neither of the two texts above applies.
- **Text (English):** Deep sleep happens mostly in the first half of the night and depends on how long you were awake and how active you were. A regular bedtime and an active day are the levers you control.
- **Basis:** Slow-wave sleep dominates the first part of the night, so it depends on how long the person was awake and on the regularity of the bedtime.
- **References:** [statpearls](https://www.ncbi.nlm.nih.gov/books/NBK526132/); [kredlow](https://pubmed.ncbi.nlm.nih.gov/25596964/)

### rem_low_early_wake

- **Card:** stages
- **Trigger:** REM is more than 1 standard deviation low and the wake-up was at least 20 minutes earlier than the average.
- **Text (English):** You got up {early} earlier than your usual {wake}. REM periods get longer toward the morning, so a shortened morning costs REM first. Sleeping to your usual time, or going to bed earlier, gives it back.
- **Basis:** REM periods get longer toward the morning, so a shortened morning cuts REM first.
- **References:** [statpearls](https://www.ncbi.nlm.nih.gov/books/NBK526132/)

### rem_low_short_night

- **Card:** stages
- **Trigger:** REM is more than 1 standard deviation low, the wake-up was not early, and the night was more than 45 minutes shorter than the need.
- **Text (English):** A short night costs REM first, because REM periods get longer toward the morning. Going to bed about {gap} earlier, or sleeping later in the morning, is the direct fix.
- **Basis:** Same physiology: a short night loses the REM-rich last hours first.
- **References:** [statpearls](https://www.ncbi.nlm.nih.gov/books/NBK526132/)

### awake_high_stress

- **Card:** stages
- **Trigger:** Awake time is more than 1 standard deviation high and the stress level of the day is more than 1 standard deviation above its mean.
- **Text (English):** Your stress level was above your usual. Stress is linked to shorter and more fragmented sleep; a few minutes of slow breathing before bed lowers arousal.
- **Basis:** Stress goes with shorter and more fragmented sleep; slow breathing lowers arousal.
- **References:** [akerstedt](https://doi.org/10.5271/sjweh.1054); [zaccaro](https://doi.org/10.3389/fnhum.2018.00353)

### awake_high_breathing

- **Card:** stages
- **Trigger:** Awake time is more than 1 standard deviation high and the breathing rate is more than 1 standard deviation high or SpO2 is more than 1 standard deviation low.
- **Text (English):** Breathing was off as well. Frequent short wake-ups can come from breathing disturbances; if this repeats together with snoring, mention it to a doctor.
- **Basis:** Plausible link to breathing disturbances; worded as a reason to mention repeated cases to a doctor. No study cited.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### stages_deep_active

- **Card:** stages
- **Trigger:** Deep sleep is more than 1 standard deviation above its mean and yesterday's steps were more than 0.5 standard deviations above their mean.
- **Text (English):** More deep sleep than usual after a day with more steps than usual: activity and deep sleep go together.
- **Basis:** Acute exercise produced a small increase in slow-wave sleep in a meta-analysis.
- **References:** [kredlow](https://pubmed.ncbi.nlm.nih.gov/25596964/)

### stages_typical

- **Card:** stages
- **Trigger:** All four stages are within their usual range and none of the other stage texts applies.
- **Text (English):** Deep, REM, light and awake time are all in your usual range.
- **Basis:** Positive confirmation relative to the person's own amounts.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### battery_low_sleep

- **Card:** battery
- **Trigger:** The body battery peak is more than 10 below the usual peak and last night was more than 45 minutes shorter than the need.
- **Text (English):** Body battery recharges mainly during sleep, and you slept {sleep}, which is short of your need. That limits how high it gets.
- **Basis:** Garmin states that sleep charges the body battery.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

### battery_low_stress

- **Card:** battery
- **Trigger:** The peak is more than 10 below the usual peak and yesterday's stress level was more than 1 standard deviation above its mean.
- **Text (English):** Yesterday's stress was above your usual. Stress drains the battery, which leaves less to recharge overnight.
- **Basis:** Garmin states that stress drains the body battery.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

### battery_low_load

- **Card:** battery
- **Trigger:** The peak is more than 10 below the usual peak and the load ratio is above 1.3.
- **Text (English):** Your training load is high. Hard training drains the battery faster, so it needs more sleep and easier days to refill.
- **Basis:** Garmin states that strenuous activity drains the body battery.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

### battery_recharge_good

- **Card:** battery
- **Trigger:** The overnight charge is at least 5 above the usual charge and the night was within 15 minutes of the need or longer.
- **Text (English):** A good overnight recharge after {sleep} of sleep.
- **Basis:** Garmin states that sleep charges the body battery.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

### stress_more_stressed

- **Card:** stress
- **Trigger:** Both the stress minutes (`stress_high`, medium and high stress) and the recovery minutes (`recovery_high`, rest) of the day are synced and the stress minutes are higher.
- **Text (English):** More of the day was spent stressed ({stressed}) than recovering ({recovering}). A few minutes of slow breathing, about 6 breaths a minute, lower arousal in the short term.
- **Basis:** Slow breathing around 6 breaths a minute raises HRV and eases arousal in the short term.
- **References:** [zaccaro](https://doi.org/10.3389/fnhum.2018.00353)

### stress_high_sleep

- **Card:** stress
- **Trigger:** The stress level is above 50 and the night was more than 60 minutes shorter than the need.
- **Text (English):** You slept {sleep}, which is short of your need. Stress is read from heart rate variability, which also reflects how well you recovered, so a short night lifts it.
- **Basis:** Garmin derives stress from heart rate variability, which also reflects recovery.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/); [kim](https://pubmed.ncbi.nlm.nih.gov/29486547/)

### stress_high_week

- **Card:** stress
- **Trigger:** The stress level is above 50 and more than 10 above the average of the 7 days before.
- **Text (English):** Above your 7-day average of {week}. If it stays up for days, a few minutes of slow breathing, about 6 breaths a minute, can lower it.
- **Basis:** Slow breathing around 6 breaths a minute raises HRV and eases arousal in the short term.
- **References:** [zaccaro](https://doi.org/10.3389/fnhum.2018.00353)

### stress_calm

- **Card:** stress
- **Trigger:** The stress level is 25 or lower (Garmin's rest band).
- **Text (English):** A calm level.
- **Basis:** Positive confirmation.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### hydration_goal_good

- **Card:** hydration
- **Trigger:** The logged water of the day is at or above the goal of the day.
- **Text (English):** You reached your water goal for the day.
- **Basis:** Positive confirmation of the user's own goal.
- **References:** none (the rule is arithmetic on the user's own data).

### hydration_on_pace

- **Card:** hydration
- **Trigger:** The shown day is today, the goal is not reached yet, and the intake is not behind the pace (see hydration_behind_pace).
- **Text (English):** You are on pace for your water goal today.
- **Basis:** Positive confirmation: the intake follows the goal spread over the waking day (7:00 to 22:00).
- **References:** none (the rule is arithmetic on the user's own data).

### hydration_behind_pace

- **Card:** hydration
- **Trigger:** The shown day is today, it is 12:00 or later, and the intake is under 70% of the goal multiplied by the part of the waking day (7:00 to 22:00) that has passed.
- **Text (English):** You are behind your pace for today: about {ml} ml, or {glasses} glasses of 250 ml, are left to your goal. Spreading them over the next hours is easier than catching up in the evening.
- **Basis:** Drinking spread over the day is easier than catching up late; the amount left and the glasses (250 ml) are arithmetic on the user's own goal. The 70% margin only keeps a slightly late day from being flagged.
- **References:** none (the pace is the card's own arithmetic, see the card explanation).

### hydration_below_goal

- **Card:** hydration
- **Trigger:** The shown day is a past day and the logged water is under the goal.
- **Text (English):** You logged {pct}% of your water goal.
- **Basis:** States how much of the goal was logged; it may also be a missing log.
- **References:** none (the rule is arithmetic on the user's own data).

### hydration_low_streak

- **Card:** hydration
- **Trigger:** At least 3 of the 5 days before the shown day are under 75% of their goal (or of the 7-day average intake when no goal is logged).
- **Text (English):** {n} of the last 5 days were below three quarters of your water goal or usual intake. Only logged drinks count, so a low value can also mean a missing log.
- **Basis:** A repeated shortfall is a pattern, a single dry day is not. It is worded as something to check, because only logged drinks count.
- **References:** none (the rule is arithmetic on the user's own data).

### hydration_training_day

- **Card:** hydration
- **Trigger:** The shown day has at least 45 minutes of training (recovery sessions left out) and the logged water is under the goal of the day.
- **Text (English):** You trained {min} minutes on this day. Sweat takes fluid with it, and how much varies a lot from person to person, so treat your goal as the minimum today and drink more, starting well before the next session.
- **Basis:** Sweat takes fluid with it, sweat rates differ widely between people, and the position stand asks for individual fluid plans that start before the activity. The text gives no amount, because the user's own sweat loss is not known.
- **References:** [sawka](https://pubmed.ncbi.nlm.nih.gov/17277604/)

### hydration_weekday_low

- **Card:** hydration
- **Trigger:** The weekday of the shown day averages at most 75% of the logged water of the other days over the last 26 weeks (at least 8 such weekdays and 60 other days with a value).
- **Text (English):** On {day}s you usually log {avg} ml, {pct} percent less than on your other days. Keep a glass within reach on these days.
- **Basis:** A habit of the user's own data, as for the steps of a quiet weekday.
- **References:** none (the rule is arithmetic on the user's own data).

### steps_below_streak

- **Card:** steps
- **Trigger:** Steps are below the top of the zone and at least 3 of the 5 days before were more than 0.5 standard deviations below their 30 day mean.
- **Text (English):** {n} of the last 5 days were quieter than usual. In a pooled analysis of 15 cohorts, more daily steps went with lower mortality, so a short walk today keeps your zone within reach.
- **Basis:** In a pooled analysis of 15 cohorts, more daily steps went with lower all-cause mortality. Population-level association.
- **References:** [paluch](https://doi.org/10.1016/S2468-2667(21)00302-9)

### steps_to_go

- **Card:** steps
- **Trigger:** The shown day is today, the steps so far are below the usual (the 7 day average, from 5 days), and neither the quiet stretch (`steps_below_streak`) nor the weekday pattern (`steps_weekday_low`) applies.
- **Text (English):** {left} more steps, about {min} minutes of walking, reach your usual {base}. The day is not over yet.
- **Basis:** The steps still missing to the person's own usual, with walking time at 100 steps a minute (the card's own assumption); numbers from the user's own data, no claim.
- **References:** none (the user's own usual, no study cited)

### steps_zone_good

- **Card:** steps
- **Trigger:** Steps are at or above the top of the zone (7 day average plus 10 percent).
- **Text (English):** Above your zone. In a pooled analysis of 15 cohorts, more daily steps went with lower mortality.
- **Basis:** Same pooled analysis, positive direction.
- **References:** [paluch](https://doi.org/10.1016/S2468-2667(21)00302-9)

### intensity_behind

- **Card:** intensity
- **Trigger:** The week has days left and minutes still missing to the goal.
- **Text (English):** To reach the goal you need about {perDay} minutes a day over the {days} days left. Brisk walking counts as moderate, and spreading it across days works as well as one long session.
- **Basis:** The WHO guideline counts moderate activity such as brisk walking and allows spreading it across the week.
- **References:** [who](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/)

### intensity_goal_good

- **Card:** intensity
- **Trigger:** The weekly goal is reached.
- **Text (English):** You reached the weekly goal. For adults the guideline gives 150 to 300 minutes, and more brings further benefits.
- **Basis:** The WHO guideline recommends 150 to 300 minutes of moderate activity for adults, with additional benefits beyond.
- **References:** [who](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/)

### vo2_down_volume

- **Card:** vo2
- **Trigger:** The VO2 max trend is falling and the training minutes of the last 28 days are at least 20 percent below the 28 days before.
- **Text (English):** Your training minutes fell {pct} percent against the 4 weeks before. This estimate follows how regularly and how hard you train; one or two sessions a week at zone 4 or 5 are what raises it in trials.
- **Basis:** Interval training raises VO2 max in controlled trials; the estimate follows training regularity and intensity.
- **References:** [bacon](https://pubmed.ncbi.nlm.nih.gov/24066036/); [milanovic](https://doi.org/10.1007/s40279-015-0365-0)

### vo2_down_other

- **Card:** vo2
- **Trigger:** The VO2 max trend is falling and the training volume did not fall by 20 percent.
- **Text (English):** Your training volume did not fall, so heat, hills or too few runs with a good heart rate signal may play a part. Judge it over weeks. One or two hard sessions a week are what raises it in trials.
- **Basis:** Same literature; other factors (heat, terrain, heart rate signal quality) affect Garmin's estimate. No study cited for those.
- **References:** [bacon](https://pubmed.ncbi.nlm.nih.gov/24066036/); [milanovic](https://doi.org/10.1007/s40279-015-0365-0)

### vo2_up_good

- **Card:** vo2
- **Trigger:** The VO2 max trend is rising.
- **Text (English):** Rising: this estimate follows regular training, and it is the weeks of consistent work that move it.
- **Basis:** Regular training raises VO2 max.
- **References:** [bacon](https://pubmed.ncbi.nlm.nih.gov/24066036/)

### body_fast

- **Card:** body
- **Trigger:** The weight changes by more than 1 percent of the 7 day mean per week over the last 28 days.
- **Text (English):** Faster than 1 percent of your weight a week. Weight swings from day to day with water, meals and the day of the week; weigh at the same time and judge the 7-day mean.
- **Basis:** Body weight fluctuates from day to day and with the weekday; a 7 day mean smooths it.
- **References:** [orsama](https://pubmed.ncbi.nlm.nih.gov/24504358/)

### body_stable

- **Card:** body
- **Trigger:** At least 3 readings in the last 14 days and no fast change.
- **Text (English):** Your weight is steady within normal swings.
- **Basis:** Positive confirmation.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### load_overreach

- **Card:** load
- **Trigger:** The 7 day over 28 day weekly average load ratio is 1.5 or higher.
- **Text (English):** Your last 7 days are {pct} percent above your usual weekly load. Sharp rises relative to what you are used to are linked to more injuries; keep two easy days and do not add more this week.
- **Basis:** Large spikes in load relative to the load the athlete is used to were linked to more injuries. The acute to chronic ratio is debated; the plugin uses it as a guide, not a threshold for harm.
- **References:** [gabbett](https://doi.org/10.1136/bjsports-2015-095788)

### load_strain

- **Card:** load
- **Trigger:** The ratio is between 1.3 and 1.5.
- **Text (English):** Your last 7 days are {pct} percent above your usual weekly load. Hold steady for a few days so your body can catch up.
- **Basis:** Same source, milder.
- **References:** [gabbett](https://doi.org/10.1136/bjsports-2015-095788)

### load_detrain

- **Card:** load
- **Trigger:** The ratio is below 0.8.
- **Text (English):** Your last 7 days are {pct} percent below your usual weekly load. Fine for a planned lighter week; otherwise add one session and build gradually.
- **Basis:** Describes a lighter week; no claim beyond arithmetic.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### load_maintain

- **Card:** load
- **Trigger:** The ratio is between 0.8 and 1.0.
- **Text (English):** A little below your usual weekly load. Fine as a steady week; if you want to build, add one session and raise load gradually.
- **Basis:** Arithmetic on the user's own load; no claim beyond it.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### load_build

- **Card:** load
- **Trigger:** The ratio is between 1.0 and 1.3.
- **Text (English):** A gradual build on what you are used to, the range in which training builds fitness with a lower injury risk.
- **Basis:** A gradual build relative to the usual load was the range associated with lower injury risk.
- **References:** [gabbett](https://doi.org/10.1136/bjsports-2015-095788)

### weekly_over_cap

- **Card:** weekly
- **Trigger:** The minutes of the week are above the cap (10 percent above the average of the previous weeks).
- **Text (English):** You are {pct} percent above your average of the previous weeks. Keep the remaining days easy; big jumps relative to what you are used to carry more risk.
- **Basis:** Large jumps relative to the usual load carry more risk; the 10 percent figure is a common guideline, not a proven threshold.
- **References:** [gabbett](https://doi.org/10.1136/bjsports-2015-095788)

### weekly_on_track

- **Card:** weekly
- **Trigger:** The minutes of the week are between 80 percent of the cap and the cap.
- **Text (English):** On track for a gradual increase over your usual week.
- **Basis:** Positive confirmation.
- **References:** none (the rule is arithmetic on the user's own data or a plausibility statement worded as something to watch).

### sessions_all_hard

- **Card:** sessions
- **Trigger:** A birth year is set, the last 7 days have at least 3 sessions with a heart rate, at least 3 are in zone 4 or 5 and none in zones 0 to 2.
- **Text (English):** {n} sessions this week were hard (zone 4 or 5) and none easy. Endurance athletes typically train about 80 percent of their sessions at low intensity, which lets the hard ones work.
- **Basis:** Descriptive studies of endurance athletes find about 80 percent of sessions at low intensity.
- **References:** [seiler](https://pubmed.ncbi.nlm.nih.gov/20861519/)

### sessions_mostly_easy

- **Card:** sessions
- **Trigger:** A birth year is set, at least 3 sessions in 7 days, at least 60 percent in zones 0 to 2 and at least one in zone 4 or 5.
- **Text (English):** {pct} percent of your sessions this week were easy, with some hard work in between. That mix is close to what endurance athletes typically do.
- **Basis:** Same review.
- **References:** [seiler](https://pubmed.ncbi.nlm.nih.gov/20861519/)

### hrv_high_rested

- **Card:** hrv
- **Trigger:** HRV is more than 1 standard deviation above its 30 day mean and the training load is not below the usual (otherwise `hrv_high_light_load` explains it).
- **Text (English):** Above your usual range and nothing in your data points to strain: your body looks well recovered today.
- **Basis:** A high HRV with no sign of strain is the pattern wearable-based training monitoring reads as good recovery; it is a signal about today, not a diagnosis.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### hrv_trend_down

- **Card:** hrv
- **Trigger:** There are 60 days of HRV in the last year, each of the last 90 days and the 90 days before has at least 20 values, and the average of the last 90 days is lower than the earlier one by at least half the standard deviation of the year (at least 1 ms).
- **Text (English):** Your HRV of the last 90 days averages {recent} ms, {delta} ms below the 90 days before. A lasting shift says more than a single day: compare it with your training and sleep over the same weeks.
- **Basis:** A lasting change of the average matters more than one day; half a standard deviation is the "smallest worthwhile change" used in HRV monitoring. The text only asks the user to compare with training and sleep.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### hrv_trend_up

- **Card:** hrv
- **Trigger:** The same comparison as `hrv_trend_down`, with the average of the last 90 days higher than the earlier one by at least half the standard deviation of the year.
- **Text (English):** Your HRV of the last 90 days averages {recent} ms, {delta} ms above the 90 days before: your recovery has improved over months.
- **Basis:** Same basis as `hrv_trend_down`; a higher HRV average over months goes with better recovery and fitness.
- **References:** [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### rhr_trend_up

- **Card:** resting_hr
- **Trigger:** There are 60 days of resting heart rate in the last year, each of the last 90 days and the 90 days before has at least 20 values, and the average of the last 90 days is higher than the earlier one by at least half the standard deviation of the year (at least 0.75 bpm).
- **Text (English):** Your resting heart rate of the last 90 days averages {recent} bpm, {delta} bpm above the 90 days before. A lasting rise can follow heavy training, less sleep or lost fitness: check what changed in those weeks.
- **Basis:** Endurance training lowers resting heart rate and a lasting rise follows more load, less recovery or lost fitness; the text only names these and asks what changed.
- **References:** [reimers](https://doi.org/10.3390/jcm7120503); [buchheit](https://doi.org/10.3389/fphys.2014.00073)

### rhr_trend_down

- **Card:** resting_hr
- **Trigger:** The same comparison as `rhr_trend_up`, with the average of the last 90 days lower than the earlier one by at least half the standard deviation of the year.
- **Text (English):** Your resting heart rate of the last 90 days averages {recent} bpm, {delta} bpm below the 90 days before, which usually goes with improving fitness.
- **Basis:** Exercise training lowers resting heart rate in a meta-analysis of interventional studies.
- **References:** [reimers](https://doi.org/10.3390/jcm7120503)

### spo2_usual

- **Card:** spo2
- **Trigger:** A reading of 94 up to but not including 95 percent that is not low against the 30 day range.
- **Text (English):** Just under 95 percent but within your usual range. Wrist readings vary by a point or two between nights.
- **Basis:** Wrist pulse oximeters are estimates that vary by a point or two; the text asks for the trend, not a single value.
- **References:** [fda](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters)

### breathing_low

- **Card:** respiration_rate
- **Trigger:** Breathing rate is more than 1 standard deviation below its 30 day mean.
- **Text (English):** Lower than usual. In studies of illness it is a raised rate that stands out, so a low one is no cause for concern.
- **Basis:** In the wearable studies of illness the signal is a raised breathing rate, so a lower one is not read as a warning.
- **References:** [natarajan](https://doi.org/10.1038/s41746-020-00363-7)

### lifestyle_hrv_up

- **Card:** habits
- **Trigger:** A habit of the lifestyle log has at least 8 nights after days with it and 8 after days logged as "no" within the last 90 days, and the HRV of the nights after it is higher by a clear margin: Welch's t at least 2.5 and a difference of at least 0.3 of the usual spread.
- **Text (English):** After {habit} your HRV is {diff} ms higher than after days without it ({n} days against {m}).
- **Basis:** Each night's HRV is taken as the difference to its own 28-day usual, so a slow rise or fall in fitness does not look like an effect of the habit. Days without an entry are left out, because a missing entry does not say that the habit was not done. A correlation in the user's own data, not proof of cause.
- **References:** none (the rule is arithmetic on the user's own data; Welch's t-test for two groups of unequal spread).

### lifestyle_hrv_down

- **Card:** habits
- **Trigger:** As above, with the HRV of the nights after the habit lower by a clear margin.
- **Text (English):** After {habit} your HRV is {diff} ms lower than after days without it ({n} days against {m}).
- **Basis:** As above. Worded as a pattern to look at, because other things on the same days (training, sleep, illness) can play a part.
- **References:** none (the rule is arithmetic on the user's own data).

### lifestyle_rhr_down

- **Card:** habits
- **Trigger:** As above, with the resting heart rate of the nights after the habit lower by a clear margin.
- **Text (English):** After {habit} your resting heart rate is {diff} bpm lower than after days without it ({n} days against {m}).
- **Basis:** As above; a lower resting heart rate goes with better recovery.
- **References:** none (the rule is arithmetic on the user's own data).

### lifestyle_rhr_up

- **Card:** habits
- **Trigger:** As above, with the resting heart rate of the nights after the habit higher by a clear margin.
- **Text (English):** After {habit} your resting heart rate is {diff} bpm higher than after days without it ({n} days against {m}).
- **Basis:** As above. Worded as a pattern to look at, not as a cause.
- **References:** none (the rule is arithmetic on the user's own data).

### lifestyle_hrv_dose_up

- **Card:** habits
- **Trigger:** A counted habit has at least 14 nights with an entry in the last 90 days, at least 3 different amounts, and the HRV of the night after rises with the amount: rank correlation of at least 0.3 and its t at least 2.5.
- **Text (English):** The more {habit} you log, the higher your HRV on the night after: about {diff} ms more for each additional one ({n} days).
- **Basis:** For a habit counted per day (cups, drinks) that has no days without it, the two groups of the other statements cannot be compared. The amount on day D is set against the night after it (D+1), taken as the difference to its own 28-day usual, with Spearman's rank correlation (counts are skewed and small); the size is the plain slope per one more. Days without an entry are left out. A correlation in the user's own data, not proof of cause.
- **References:** none (the rule is arithmetic on the user's own data; Spearman's rank correlation).

### lifestyle_hrv_dose_down

- **Card:** habits
- **Trigger:** A counted habit has at least 14 nights with an entry in the last 90 days, at least 3 different amounts, and the HRV of the night after falls with the amount: rank correlation of at most -0.3 and its t at most -2.5.
- **Text (English):** The more {habit} you log, the lower your HRV on the night after: about {diff} ms less for each additional one ({n} days).
- **Basis:** For a habit counted per day (cups, drinks) that has no days without it, the two groups of the other statements cannot be compared. The amount on day D is set against the night after it (D+1), taken as the difference to its own 28-day usual, with Spearman's rank correlation (counts are skewed and small); the size is the plain slope per one more. Days without an entry are left out. A correlation in the user's own data, not proof of cause.
- **References:** none (the rule is arithmetic on the user's own data; Spearman's rank correlation).

### lifestyle_rhr_dose_down

- **Card:** habits
- **Trigger:** A counted habit has at least 14 nights with an entry in the last 90 days, at least 3 different amounts, and the resting heart rate of the night after falls with the amount: rank correlation of at most -0.3 and its t at most -2.5.
- **Text (English):** The more {habit} you log, the lower your resting heart rate on the night after: about {diff} bpm less for each additional one ({n} days).
- **Basis:** For a habit counted per day (cups, drinks) that has no days without it, the two groups of the other statements cannot be compared. The amount on day D is set against the night after it (D+1), taken as the difference to its own 28-day usual, with Spearman's rank correlation (counts are skewed and small); the size is the plain slope per one more. Days without an entry are left out. A correlation in the user's own data, not proof of cause.
- **References:** none (the rule is arithmetic on the user's own data; Spearman's rank correlation).

### lifestyle_rhr_dose_up

- **Card:** habits
- **Trigger:** A counted habit has at least 14 nights with an entry in the last 90 days, at least 3 different amounts, and the resting heart rate of the night after rises with the amount: rank correlation of at least 0.3 and its t at least 2.5.
- **Text (English):** The more {habit} you log, the higher your resting heart rate on the night after: about {diff} bpm more for each additional one ({n} days).
- **Basis:** For a habit counted per day (cups, drinks) that has no days without it, the two groups of the other statements cannot be compared. The amount on day D is set against the night after it (D+1), taken as the difference to its own 28-day usual, with Spearman's rank correlation (counts are skewed and small); the size is the plain slope per one more. Days without an entry are left out. A correlation in the user's own data, not proof of cause.
- **References:** none (the rule is arithmetic on the user's own data; Spearman's rank correlation).

### lifestyle_no_days

- **Card:** habits
- **Trigger:** A yes or no habit has at least 8 days logged with it and fewer than 3 days logged as "no" within the last 90 days (a counted habit is compared by amount instead).
- **Text (English):** {habit}: only {n} days logged as no so far. Log a no on the days you skip it, so the nights after it can be compared.
- **Basis:** A comparison needs days with and days without the habit. Days without an entry are not counted as "no", because a missing entry does not say that the habit was not done, so the other half has to be logged.
- **References:** none (a rule about what the comparison needs).

### sleep_short_plain

- **Card:** sleep
- **Trigger:** Last night is more than 30 minutes short of the need and no other sleep interpretation applies.
- **Text (English):** Last night was {gap} short of your {need} hours. Tonight's aim on the card is a realistic step towards it.
- **Basis:** Arithmetic on the need; no study is cited. It points to the aim on the card instead of repeating advice.
- **References:** none (a difference between last night and the sleep need, nothing more)

### battery_usual

- **Card:** battery
- **Trigger:** The Body Battery peak is within 10 of the usual peak and no other battery interpretation applies.
- **Text (English):** Your peak of {peak} is in line with your usual ({usual}): the night recharged you as usual.
- **Basis:** Body Battery follows sleep, stress and activity; a peak in the usual range says the night recharged as usual.
- **References:** [garmin](https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/)

### stress_above_week

- **Card:** stress
- **Trigger:** The stress level is above 25 up to 50 (Garmin's low band) and more than 10 above the average of the 7 days before.
- **Text (English):** A level of {level} is {delta} above your 7-day average of {week}, still in the low band. One busier day is common; a few in a row are worth a look.
- **Basis:** A comparison of today with the person's own week, which closes the gap between `stress_usual` (not more than 10 above) and `stress_high_week` (above 50). No cause is named, because none is in the data.
- **References:** none (a comparison with the user's own average, no health claim)

### stress_high_usual

- **Card:** stress
- **Trigger:** The stress level is above 50 (medium or high), not more than 10 above the average of the 7 days before, and neither `stress_high_sleep` nor `stress_high_week` applies.
- **Text (English):** A level of {level} is high, but in line with your own week (average {week}): the last days were this stressed too.
- **Basis:** A comparison of today with the person's own week. It states that a high level is nothing new for the person; no cause is named, because none is in the data.
- **References:** none (a comparison with the user's own average, no health claim)

### stress_usual

- **Card:** stress
- **Trigger:** The stress level is above 25 up to 50, not more than 10 above the 7 day average, and no other stress interpretation applies.
- **Text (English):** A level of {level} is in line with your week (average {week}).
- **Basis:** A comparison of today with the person's own week.
- **References:** none (a comparison with the user's own average, no health claim)

### steps_in_zone

- **Card:** steps
- **Trigger:** Steps are at or above the usual daily steps (7 day average) but below 10 percent above it.
- **Text (English):** At your usual level of about {base} steps a day.
- **Basis:** A statement of where the day is against the person's own usual; it adds no health claim.
- **References:** none (a comparison with the user's own usual)

### steps_weekday_low

- **Card:** steps
- **Trigger:** The day is below the usual steps, there are at least 8 earlier days of this weekday and 60 other days in the last 26 weeks, and this weekday averages 75 percent or less of the other days. The weekday name is written in the language of the plugin.
- **Text (English):** On {day}s you usually walk {avg} steps, {pct} percent fewer than on your other days. A short walk on these days evens out your week.
- **Basis:** More daily steps go with lower mortality in a pooled analysis of 15 cohorts; the pattern itself is the user's own data.
- **References:** [paluch](https://doi.org/10.1016/S2468-2667(21)00302-9)

### floors_to_go

- **Card:** floors
- **Trigger:** The shown day is today, the floors so far are below the usual (the zone), and the 3-of-5 quiet stretch of `floors_below_streak` does not apply.
- **Text (English):** {left} more floors reach the start of your usual {low}–{high}. The day is not over yet.
- **Basis:** The floors still missing to the start of the person's own usual range, from the 7 day average; only numbers from the user's own data, no claim.
- **References:** none (the user's own usual range, no study cited)

### floors_zone_good

- **Card:** floors
- **Trigger:** Floors are at or above the 7 day average and above zero.
- **Text (English):** At or above your usual number of floors.
- **Basis:** A statement of where the day is against the person's own usual; it adds no health claim.
- **References:** none (a comparison with the user's own usual)

### floors_below_streak

- **Card:** floors
- **Trigger:** At least 3 of the 5 days before the shown day had fewer than 80 percent of the usual floors and the shown day is below the usual.
- **Text (English):** {n} of the last 5 days were below your usual floors. A flight of stairs instead of the lift brings today's count back into your zone.
- **Basis:** The data show a quiet stretch; stairs instead of the lift is a small step that matches it and is not a medical claim.
- **References:** none (the user's own quiet stretch, no study cited)

### vo2_steady

- **Card:** vo2
- **Trigger:** The VO2 max estimate changed by less than the steady margin over 12 weeks and there are training minutes in the last 28 days; the text gives the weekly average.
- **Text (English):** Steady over the last 12 weeks, with about {min} training minutes a week: your training holds your fitness where it is.
- **Basis:** The estimate follows regular training; steady with steady training means the training holds fitness.
- **References:** [bacon](https://pubmed.ncbi.nlm.nih.gov/24066036/)

### weekly_room

- **Card:** weekly
- **Trigger:** The shown day is today, the week is under its limit (10 percent above the average of the previous weeks) and days are left; the text gives the minutes left and per day including today.
- **Text (English):** {left} minutes to your limit this week: about {perDay} minutes on each of the {days} days left, if you want to use the room.
- **Basis:** Arithmetic on the limit that the card draws; the limit is a common rule of thumb, not a validated threshold.
- **References:** none (the limit is the card's rule of thumb, see the card explanation)

### sessions_balanced

- **Card:** sessions
- **Trigger:** At least 3 sessions with a heart rate in the last 7 days, at least one easy (zone 1 or 2) and one hard (zone 4 or 5), and not mostly easy.
- **Text (English):** Your last 7 days mix {easy} easy and {hard} hard sessions: a balance that gives the hard ones room to work.
- **Basis:** Endurance athletes train most sessions easy with some hard ones between.
- **References:** [seiler](https://pubmed.ncbi.nlm.nih.gov/20861519/)
