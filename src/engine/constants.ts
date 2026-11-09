// Thresholds used by the risk engine. [n] = source number in research/RESEARCH.md and on the poster.

/** Days in the personal baseline. Our tunable design choice, not sourced (RESEARCH.md §4). */
export const BASELINE_DAYS = 28

/** Flag a metric when |z| >= this. Our tunable design choice, not sourced (RESEARCH.md §4). */
export const Z_FLAG = 2

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
