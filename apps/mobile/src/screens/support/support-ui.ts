export const SUPPORT_PRIMARY = '#4473C0';
/** Figma: dark navy titles / inactive tab labels */
export const SUPPORT_NAVY = '#1E3A5F';
/** Figma: active segment fill, accents */
export const SUPPORT_BLUE = '#2563EB';
export const SUPPORT_BG = '#F1F5F9';
export const SUPPORT_CARD = '#FFFFFF';
export const SUPPORT_TEXT = '#1E293B';
export const SUPPORT_MUTED = '#64748B';
export const SUPPORT_BORDER = '#E2E8F0';
/** Figma: thin light blue card outline */
export const SUPPORT_CARD_BORDER = '#BFDBFE';
/** Figma: footer action icons */
export const SUPPORT_ICON_BLUE = '#3B82F6';

export function shortTicketId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function formatTicketRelativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return '—';
  let sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 45) return 'Just now';
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))} min ago`;
  if (sec < 86400) return `${Math.max(1, Math.floor(sec / 3600))} hr ago`;
  const days = Math.floor(sec / 86400);
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} wk ago`;
  return new Date(iso).toLocaleDateString();
}

export function listCardSnippet(ticket: { id: string; subject: string | null }): string {
  const sid = shortTicketId(ticket.id);
  return `Your support ticket #${sid} has been updated. Pls review the new information.`;
}
