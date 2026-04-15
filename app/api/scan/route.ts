export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  const symbols = ["BBAI", "ACHR", "SOFI", "OPEN", "MVST"];

  const results = [];

  for (const symbol of symbols) {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );

    const data = await res.json();

    const price = data.c;
    const prevClose = data.pc;

    if (!price || !prevClose) continue;

    const changePercent = ((price - prevClose) / prevClose) * 100;

    results.push({
      symbol,
      price,
      changePercent: Number(changePercent.toFixed(2)),
    });
  }

  return Response.json(results);
}
