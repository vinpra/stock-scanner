export function normalizeQuote(symbol: string, data: any) {
  const price = data.c;
  const prevClose = data.pc;

  if (!price || !prevClose) return null;

  const changePercent = ((price - prevClose) / prevClose) * 100;

  return {
    symbol,
    price,
    prevClose,
    changePercent: Number(changePercent.toFixed(2)),
  };
}