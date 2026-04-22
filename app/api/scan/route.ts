import { evaluateStock } from "@/lib/signalEngine";

export async function POST(req: Request) {
  const apiKey = process.env.FINNHUB_API_KEY;

  const body = await req.json();
  const tickers = body.tickers
    .split(",")
    .map((t: string) => t.trim().toUpperCase())
    .filter(Boolean);

  const results = [];

  for (const symbol of tickers) {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );

    const data = await res.json();

    const stock = {
      symbol,
      price: data.c,
      prevClose: data.pc,
      changePercent: ((data.c - data.pc) / data.pc) * 100,
      volume: data.v ?? 0,
    };

    results.push(evaluateStock(stock));
  }

  return Response.json({
    data: results.sort((a, b) => b.score - a.score),
  });
}