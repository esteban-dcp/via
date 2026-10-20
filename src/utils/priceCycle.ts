/** Próximo ajuste mensual de precios (día 12). */
export const nextPriceChange = (now: Date = new Date()) => {
  const next = new Date(now.getFullYear(), now.getMonth(), 12);
  if (now.getDate() >= 12) next.setMonth(next.getMonth() + 1);
  const days = Math.ceil((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  return { date: next, days };
};
