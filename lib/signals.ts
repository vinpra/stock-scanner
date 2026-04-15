export function computeSignal(changePercent: number, volume: number) {
  const isBreakout = changePercent >= 5;
  const isStrong = changePercent >= 8;

  const score =
    changePercent * 2 +
    (isBreakout ? 5 : 0) +
    (isStrong ? 5 : 0) +
    (volume > 1000000 ? 3 : 0);

  const signal = isStrong
    ? "🚀 STRONG BREAKOUT"
    : isBreakout
      ? "🔥 MOMENTUM"
      : "👀 WATCH";

  return {
    isBreakout,
    signal,
    score: Number(score.toFixed(2)),
  };
}