import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function decimalToCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export function formatDate(ms: number | null | undefined): string {
  if (!ms) return '—';
  return format(new Date(ms), 'MMM d, yyyy');
}

export function formatDateTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  return format(new Date(ms), 'MMM d, yyyy h:mm a');
}

export function formatRelative(ms: number | null | undefined): string {
  if (!ms) return '—';
  return formatDistanceToNow(new Date(ms), { addSuffix: true });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
