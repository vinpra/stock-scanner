"use client";

import { useState } from "react";
import ChartCard from "@/components/ChartCard";

type Stock = {
  symbol: string;
  price: number;
  open: number;
  changePercent: number;
  volume: number;
  signal: string;
};

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selected, setSelected] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // 🔥 CORE SCANNER LOGIC
  const fetchMomentum = async () => {
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      const res = await fetch(
        `/api/premarket?date=${today}`
      );

      const data = await res.json();

      const processed = (data.data || []).map((s: any) => {
        const changePercent =
          s.open > 0 ? ((s.price - s.open) / s.open) * 100 : 0;

        let signal = "👀 WATCH";

        if (changePercent > 5 && s.volume > 1000000) {
          signal = "🚀 BREAKOUT";
        } else if (changePercent > 2 && s.volume > 500000) {
          signal = "🔥 MOMENTUM";
        } else if (changePercent < -2) {
          signal = "🔻 FADE";
        }

        return {
          symbol: s.symbol,
          price: s.price,
          open: s.open,
          changePercent: Number(changePercent.toFixed(2)),
          volume: s.volume,
          signal,
        };
      });

      const sorted = processed.sort(
        (a: any, b: any) =>
          Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );

      setStocks(sorted);
      setHasScanned(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const financeLink = (symbol: string) =>
    `https://www.google.com/finance/quote/${symbol}:NASDAQ`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <div className="px-6 py-5 border-b bg-white flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">📊 Open Momentum Scanner</h1>
          <p className="text-sm text-slate-500">
            Real-time breakout detection after market open
          </p>
        </div>

        <button
          onClick={fetchMomentum}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl"
        >
          {loading ? "Scanning..." : "Scan Market"}
        </button>
      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-[2.5fr_1fr] gap-6 p-6">

        {/* LEFT: TABLE + RESULTS */}
        <div className="space-y-6">

          {!hasScanned && (
            <div className="p-10 border rounded-2xl text-center text-slate-500 bg-white">
              Click <b>Scan Market</b> to detect real momentum stocks after open
            </div>
          )}

          {hasScanned && (
            <div className="bg-white border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-left">Price</th>
                    <th className="p-3 text-left">Open</th>
                    <th className="p-3 text-left">Change %</th>
                    <th className="p-3 text-left">Volume</th>
                    <th className="p-3 text-left">Signal</th>
                    <th className="p-3 text-left">Link</th>
                  </tr>
                </thead>

                <tbody>
                  {stocks.map((s) => (
                    <tr
                      key={s.symbol}
                      onClick={() => setSelected(s.symbol)}
                      className="border-t hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="p-3 font-medium">{s.symbol}</td>
                      <td className="p-3">${s.price}</td>
                      <td className="p-3">${s.open}</td>

                      <td
                        className={`p-3 ${
                          s.changePercent > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {s.changePercent}%
                      </td>

                      <td className="p-3">{s.volume}</td>

                      <td className="p-3 font-semibold">
                        {s.signal}
                      </td>

                      <td className="p-3">
                        <a
                          href={financeLink(s.symbol)}
                          target="_blank"
                          className="text-blue-600"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CHART */}
          {hasScanned && (
            <div className="bg-white border rounded-2xl p-4">
              <ChartCard symbol={selected} />
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">

          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-2">📌 Strategy</h3>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>🚀 Breakout = strong + volume spike</li>
              <li>🔥 Momentum = continuation move</li>
              <li>🔻 Fade = reversal risk</li>
              <li>👀 Watch = no edge yet</li>
            </ul>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-2">⚡ Focus Rule</h3>
            <p className="text-sm text-slate-500">
              Only trade top 3 strongest momentum stocks. Ignore noise.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}