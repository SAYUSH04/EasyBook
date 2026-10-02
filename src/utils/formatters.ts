export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr;
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'PUBLISHED':
    case 'APPROVED':
    case 'CHECKED_IN':
    case 'RE_ENTERED':
    case 'VALID':
    case 'PRESENT':
      return { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-700/50' };
    case 'PENDING':
    case 'WAITLISTED':
    case 'REGISTRATION_OPEN':
    case 'ONGOING':
      return { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-700/50' };
    case 'DRAFT':
    case 'NOT_CHECKED_IN':
      return { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700' };
    case 'CHECKED_OUT':
      return { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-700/50' };
    case 'REJECTED':
    case 'CANCELLED':
    case 'REVOKED':
    case 'ABSENT':
      return { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-700/50' };
    case 'COMPLETED':
      return { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-700/50' };
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }
}
