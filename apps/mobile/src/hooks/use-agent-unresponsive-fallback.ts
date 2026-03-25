import { useEffect, useMemo, useState } from 'react';

export type FallbackMessageLike = {
  sender_id: string;
  sent_at: string;
  content?: string | null;
};

export type UseAgentUnresponsiveFallbackArgs<T extends FallbackMessageLike> = {
  enabled: boolean;
  userId: string | null;
  messages: T[];
  inactivityMs?: number;
};

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function useAgentUnresponsiveFallback<T extends FallbackMessageLike>({
  enabled,
  userId,
  messages,
  inactivityMs = 15 * 60 * 1000,
}: UseAgentUnresponsiveFallbackArgs<T>) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [available, setAvailable] = useState(false);

  const lastUserMessage = useMemo(() => {
    if (!enabled || !userId) return null;

    let latest: T | null = null;
    let latestMs: number | null = null;

    for (const m of messages) {
      if (m.sender_id !== userId) continue;
      const ms = toMs(m.sent_at);
      if (ms === null) continue;
      if (latestMs === null || ms > latestMs) {
        latestMs = ms;
        latest = m;
      }
    }

    return latest;
  }, [enabled, userId, messages]);

  const lastIncomingAgentMessage = useMemo(() => {
    if (!enabled || !userId) return null;

    // We treat any non-user message with non-empty content as an "agent response".
    let latest: T | null = null;
    let latestMs: number | null = null;

    for (const m of messages) {
      if (m.sender_id === userId) continue;
      const content = (m.content ?? '').toString().trim();
      if (!content) continue;
      const ms = toMs(m.sent_at);
      if (ms === null) continue;
      if (latestMs === null || ms > latestMs) {
        latestMs = ms;
        latest = m;
      }
    }

    return latest;
  }, [enabled, userId, messages]);

  const lastUserMessageAtMs = useMemo(() => toMs(lastUserMessage?.sent_at), [lastUserMessage]);

  useEffect(() => {
    if (!enabled || !userId || !lastUserMessageAtMs) {
      setSecondsLeft(null);
      setAvailable(false);
      return;
    }

    const lastAgentAtMs = toMs(lastIncomingAgentMessage?.sent_at);
    const hasAgentRepliedAfterLastUser =
      lastAgentAtMs !== null && lastAgentAtMs > (lastUserMessageAtMs ?? 0);

    if (hasAgentRepliedAfterLastUser) {
      setSecondsLeft(null);
      setAvailable(false);
      return;
    }

    const computeAndSet = () => {
      const now = Date.now();
      const elapsed = now - lastUserMessageAtMs;
      const remainingMs = inactivityMs - elapsed;

      if (remainingMs <= 0) {
        setSecondsLeft(0);
        setAvailable(true);
        return;
      }

      setSecondsLeft(Math.ceil(remainingMs / 1000));
      setAvailable(false);
    };

    computeAndSet();
    const interval = setInterval(computeAndSet, 1000);

    return () => clearInterval(interval);
  }, [enabled, userId, lastUserMessageAtMs, lastIncomingAgentMessage, inactivityMs]);

  return {
    available,
    secondsLeft,
    lastUserMessageAtIso: lastUserMessage?.sent_at ?? null,
  };
}

