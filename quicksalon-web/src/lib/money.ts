export const DEFAULT_CURRENCY = 'GHS'

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY) {
  return `${currency} ${amount.toFixed(2)}`
}