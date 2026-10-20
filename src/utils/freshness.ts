export type FreshnessTier = 'super' | 'current' | 'outdated' | 'unknown';

export type Freshness = {
  tier: FreshnessTier;
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  icon: 'flash' | 'checkmark-circle' | 'time' | 'help-circle';
};

/** Los combustibles en Ecuador cambian de precio el día 12 de cada mes. */
const PRICE_CHANGE_DAY = 12;

/** Inicio del ciclo vigente: el 12 más reciente que no sea futuro. */
const cycleStart = (now: Date) => {
  const start = new Date(now.getFullYear(), now.getMonth(), PRICE_CHANGE_DAY);
  if (now < start) start.setMonth(start.getMonth() - 1);
  return start;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function getFreshness(priceDate?: string | null, now: Date = new Date()): Freshness {
  if (!priceDate) {
    return { tier: 'unknown', label: 'Sin reportes', variant: 'neutral', icon: 'help-circle' };
  }
  const date = new Date(priceDate);
  if (Number.isNaN(date.getTime())) {
    return { tier: 'unknown', label: 'Sin reportes', variant: 'neutral', icon: 'help-circle' };
  }
  const start = cycleStart(now);
  if (date < start) {
    return { tier: 'outdated', label: 'Desactualizado', variant: 'danger', icon: 'time' };
  }
  if (sameDay(date, start)) {
    return { tier: 'super', label: 'Súper fresco', variant: 'success', icon: 'flash' };
  }
  return { tier: 'current', label: 'Precio actualizado', variant: 'success', icon: 'checkmark-circle' };
}

export const monthlyFreshnessLabel = (priceDate?: string) => getFreshness(priceDate).label;
export const monthlyFreshnessVariant = (priceDate?: string) => {
  const v = getFreshness(priceDate).variant;
  return v === 'neutral' ? 'warning' : v;
};
export const monthlyFreshnessIcon = (priceDate?: string) => getFreshness(priceDate).icon;
