// Thresholds used by the risk engine. [n] = source number in research/RESEARCH.md and on the poster.

/** Days in the personal baseline. Our tunable design choice, not sourced (RESEARCH.md §4). */
export const BASELINE_DAYS = 28

/** Flag a metric when |z| >= this. Our tunable design choice, not sourced (RESEARCH.md §4). */
export const Z_FLAG = 2

/** ACWR windows in days: 7-day acute vs 28-day chronic rolling average. Gabbett 2016 [14]. */
export const ACWR_ACUTE_DAYS = 7
export const ACWR_CHRONIC_DAYS = 28

/** ACWR "sweet spot" lower and upper bound (0.8–1.3). Gabbett 2016 [14]. */
export const ACWR_SWEET_LOW = 0.8
export const ACWR_SWEET_HIGH = 1.3

/** ACWR "danger zone" starts here (>= 1.5). Gabbett 2016 [14]. Contested: Impellizzeri 2020 [15]. */
export const ACWR_DANGER = 1.5

/** Timed Up and Go in seconds: ">= 12 seconds … is at risk for falling". CDC STEADI TUG form [17]. */
export const TUG_RISK_SECONDS = 12

/** Walking speed drop that triggers, in baseline SDs (older adult). Our design choice, as Z_FLAG. */
export const WALKING_SPEED_DROP_SD = 2

/** Fall escalation: watch waits ~1 min for the wearer to respond. Apple Fall Detection [12]. */
export const FALL_RESPONSE_SECONDS = 60

/** Fall escalation: then a 30 s countdown before the emergency call. Apple Fall Detection [12]. */
export const FALL_COUNTDOWN_SECONDS = 30

/** Check-in lexicon score at or below this counts as negative sentiment. Our design choice. */
export const NEGATIVE_SENTIMENT_MAX = -2

/** Check-in lexicon score at or above this counts as positive sentiment. Our design choice. */
export const POSITIVE_SENTIMENT_MIN = 1
