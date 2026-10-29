/** Round a finite monetary value to the application's two decimal places. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const absolute = Math.abs(value);
  const rounded = Math.round((absolute + Number.EPSILON * Math.max(1, absolute)) * 100) / 100;
  return rounded === 0 ? 0 : Math.sign(value) * rounded;
}

export function nonNegativeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function discountPercent(value: unknown): number {
  return Math.min(100, nonNegativeNumber(value));
}
