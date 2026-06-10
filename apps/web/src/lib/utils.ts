export function formatEuros(cents: string | number): string {
  const amount = Number(cents) / 100;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function progressPercent(collected: string, goal: string): number {
  const pct = (Number(collected) / Number(goal)) * 100;
  return Math.min(Math.round(pct), 100);
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
