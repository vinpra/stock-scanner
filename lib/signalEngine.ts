export type Stock = {
  symbol: string;
  price: number;
  prevClose: number;
  changePercent: number;
  volume: number;
};

export function evaluateStock(s: Stock) {
  let score = 0;

  let signal: string = "WATCH";
  let isBreakout = false;

  // 1. Momentum strength
  if (s.changePercent >= 10) score += 40;
  else if (s.changePercent >= 5) score += 25;
  else if (s.changePercent >= 2) score += 10;

  // 2. Above previous close
  if (s.price > s.prevClose) score += 10;

  // 3. Volume placeholder (will improve later)
  if (s.volume > 1_000_000) score += 20;

  // 4. Signal logic
  if (score >= 70) {
    signal = "🚀 BREAKOUT";
    isBreakout = true;
  } else if (score >= 40) {
    signal = "🔥 MOMENTUM";
  } else {
    signal = "⚠️ WEAK";
  }

  return {
    ...s,
    score,
    signal,
    isBreakout,
  };
}