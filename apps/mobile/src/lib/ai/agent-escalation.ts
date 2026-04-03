/**
 * Frustration-triggered agent escalation: heuristics, explicit-request suppression,
 * streak thresholds, cooldown, and structured client-side logging.
 */

export type EmotionScores = {
  frustration: number;
  anger: number;
};

export type EscalationAccumulator = {
  negativeStreak: number;
  neutralStreak: number;
  buttonVisible: boolean;
  lastNegativeAtMs: number | null;
  unlockedAtMs: number | null;
};

export function createEscalationAccumulator(): EscalationAccumulator {
  return {
    negativeStreak: 0,
    neutralStreak: 0,
    buttonVisible: false,
    lastNegativeAtMs: null,
    unlockedAtMs: null,
  };
}

/** User clearly asks for a human — never use this to show the agent button (per product rules). */
const EXPLICIT_AGENT_REGEXES: RegExp[] = [
  /\btalk to (an? )?(agent|human|person|representative|someone real)\b/i,
  /\b(speak|chat) with (an? )?(agent|human|person|representative)\b/i,
  /\bconnect me to (support|an agent|a human|someone)\b/i,
  /\b(get|put) me (a |)(human|agent|person|representative)\b/i,
  /\bhuman please\b/i,
  /\breal (person|human) please\b/i,
  /\blive (agent|person|human)\b/i,
  /\btransfer me to\b/i,
  /\bescalate (to |)(human|agent|support)\b/i,
  /\bspeak to (a |)(manager|supervisor)\b/i,
  /\b(customer service|support) (rep|representative)\b/i,
  /\bcan i (please )?(speak|talk) to someone\b/i,
  /\bactual (person|human)\b/i,
];

export function isExplicitAgentRequest(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  return EXPLICIT_AGENT_REGEXES.some((re) => re.test(t));
}

const STRONG_WORDS = [
  'useless',
  'stupid',
  'ridiculous',
  'garbage',
  'worst',
  'furious',
  'hate this',
  "doesn't work",
  'doesnt work',
  'not working',
  'still broken',
  'still not working',
  'nothing works',
  'waste of time',
  'incompetent',
  'terrible service',
];

const FRUSTRATION_WORDS = [
  'frustrated',
  'frustrating',
  'annoyed',
  'annoying',
  'fed up',
  'disappointed',
  'angry',
  'upset',
  'unacceptable',
  'why is this',
  'why wont',
  "why won't",
  'again and again',
  'still no',
  'no one helps',
  'nobody helps',
  'not helping',
  'same problem',
  'keeps failing',
  'keeps breaking',
];

export function heuristicEmotionScores(text: string): EmotionScores {
  const lower = text.toLowerCase();
  let frustration = 0;
  let anger = 0;

  for (const w of STRONG_WORDS) {
    if (lower.includes(w)) {
      anger = Math.max(anger, 0.72);
      frustration = Math.max(frustration, 0.55);
    }
  }
  for (const w of FRUSTRATION_WORDS) {
    if (lower.includes(w)) {
      frustration = Math.max(frustration, 0.48);
      anger = Math.max(anger, 0.35);
    }
  }

  if (/\b(this is )?broken\b/i.test(text)) frustration = Math.max(frustration, 0.5);
  if (/\bfix (this|it)\b/i.test(lower) && /[!?]{2,}/.test(text)) frustration = Math.max(frustration, 0.42);
  if (/[!?]{3,}/.test(text)) {
    frustration = Math.min(1, frustration + 0.12);
    anger = Math.min(1, anger + 0.1);
  }

  return {
    frustration: Math.min(1, frustration),
    anger: Math.min(1, anger),
  };
}

export function mergeEmotionScores(heuristic: EmotionScores, api: EmotionScores | null): EmotionScores {
  if (!api) return heuristic;
  return {
    frustration: Math.min(1, Math.max(heuristic.frustration, heuristic.frustration * 0.35 + api.frustration * 0.65)),
    anger: Math.min(1, Math.max(heuristic.anger, heuristic.anger * 0.35 + api.anger * 0.65)),
  };
}

function compositeIntensity(s: EmotionScores): number {
  return Math.max(s.frustration, s.anger) * 0.62 + Math.min(s.frustration, s.anger) * 0.38;
}

const STRONG_NEGATIVE_FLOOR = 0.38;
const NEUTRAL_CEILING = 0.24;
const SINGLE_MESSAGE_TRIGGER = 0.78;
const TWO_STREAK_COMPOSITE_MIN = 0.52;

const NEUTRAL_STREAK_TO_HIDE = 3;
const COOLDOWN_AFTER_NEGATIVE_MS = 90_000;

export type EscalationProcessResult = {
  accumulator: EscalationAccumulator;
  log?: Record<string, unknown>;
};

export function logAgentEscalation(event: string, payload: Record<string, unknown>) {
  console.info(`[agent-escalation] ${event}`, {
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

/**
 * Updates streaks and visibility after one user message (AI mode, text already trimmed).
 * `explicitBlocked` = phrase match or model flagged explicit human request.
 */
export function applyEscalationAfterUserMessage(
  acc: EscalationAccumulator,
  scores: EmotionScores,
  explicitBlocked: boolean,
): EscalationProcessResult {
  const composite = compositeIntensity(scores);
  const now = Date.now();

  if (explicitBlocked) {
    logAgentEscalation('suppressed_explicit_request', {
      frustration: scores.frustration,
      anger: scores.anger,
      composite,
      negativeStreak: acc.negativeStreak,
      buttonVisible: acc.buttonVisible,
    });
    acc.negativeStreak = 0;
    acc.neutralStreak = 0;
    return { accumulator: acc };
  }

  logAgentEscalation('emotion_scored', {
    frustration: scores.frustration,
    anger: scores.anger,
    composite,
    negativeStreakBefore: acc.negativeStreak,
    neutralStreakBefore: acc.neutralStreak,
    buttonVisible: acc.buttonVisible,
  });

  if (composite >= STRONG_NEGATIVE_FLOOR) {
    acc.negativeStreak += 1;
    acc.neutralStreak = 0;
    acc.lastNegativeAtMs = now;
  } else if (composite <= NEUTRAL_CEILING) {
    acc.neutralStreak += 1;
    acc.negativeStreak = 0;
  } else {
    acc.negativeStreak = Math.max(0, acc.negativeStreak - 1);
    acc.neutralStreak = 0;
  }

  if (!acc.buttonVisible) {
    let triggerReason: string | null = null;
    if (composite >= SINGLE_MESSAGE_TRIGGER) {
      triggerReason = 'high_intensity_single_message';
    } else if (acc.negativeStreak >= 3) {
      triggerReason = 'repeated_frustration_3plus';
    } else if (acc.negativeStreak >= 2 && composite >= TWO_STREAK_COMPOSITE_MIN) {
      triggerReason = 'two_negative_messages_with_tone';
    }

    if (triggerReason) {
      acc.buttonVisible = true;
      acc.unlockedAtMs = now;
      logAgentEscalation('escalation_available', {
        triggerReason,
        frustration: scores.frustration,
        anger: scores.anger,
        composite,
        negativeStreak: acc.negativeStreak,
        escalationAvailableAt: new Date(now).toISOString(),
      });
    }
  } else if (
    acc.neutralStreak >= NEUTRAL_STREAK_TO_HIDE &&
    acc.lastNegativeAtMs != null &&
    now - acc.lastNegativeAtMs >= COOLDOWN_AFTER_NEGATIVE_MS
  ) {
    logAgentEscalation('cooldown_hide_button', {
      neutralStreak: acc.neutralStreak,
      lastNegativeAt: new Date(acc.lastNegativeAtMs).toISOString(),
    });
    acc.buttonVisible = false;
    acc.neutralStreak = 0;
    acc.negativeStreak = 0;
    acc.unlockedAtMs = null;
  }

  return { accumulator: acc };
}
