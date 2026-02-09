/**
 * Format price in raw won (원) to human-readable Korean format.
 * e.g., 150000000 → "1.5억", 30000000 → "3천만", 500000 → "50만"
 */
export function formatPrice(price: number): string {
  if (price >= 100000000) {
    return `${(price / 100000000).toFixed(1)}억`;
  } else if (price >= 10000000) {
    return `${Math.round(price / 10000000)}천만`;
  } else if (price >= 10000) {
    return `${Math.round(price / 10000)}만`;
  }
  return price.toLocaleString();
}

/**
 * Format price in 만원 units to human-readable Korean format.
 * e.g., 15000 → "2억", 3000 → "3.0천만", 500 → "500만"
 */
export function formatPriceMan(price: number): string {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(1)}억`;
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(1)}천만`;
  }
  return `${price}만`;
}
