import { WATCHLIST } from "@/lib/watchlist";
import { normalizeQuote } from "@/lib/normalize";
import { computeSignal } from "@/lib/signals";

export async function GET() {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;

    const results: any[] = [];

    for (const symbol of WATCHLIST) {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );

      const data = await res.json();

      const normalized = normalizeQuote(symbol, data);
      if (!normalized) continue;

      const volume = data.v || 0;

      const signalData = computeSignal(
        normalized.changePercent,
        volume
      );

      results.push({
        ...normalized,
        volume,
        ...signalData,
      });
    }

    results.sort((a, b) => b.score - a.score);

    return Response.json({
      updatedAt: new Date().toISOString(),
      count: results.length,
      data: results.slice(0, 10),
    });
  } catch (err) {
    return Response.json({
      error: "Scanner failed",
      details: String(err),
    });
  }
}