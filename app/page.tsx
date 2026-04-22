"use client";

import { useEffect, useState } from "react";
import ChartCard from "@/components/ChartCard";
import { computeSignal } from "@/lib/signals";

type Stock = {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
};

export default function Home() {
  const [tickersInput, setTickersInput] = useState(
    "AAPL,TSLA,NVDA,AMD,PLTR"
  );
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selected, setSelected] = useState("AAPL");

  const fetchData = async (tickers: string) => {
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });

      const data = await res.json();
      setStocks(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData(tickersInput);
  }, []);

  const financeLink = (symbol: string) =>
    `https://www.google.com/finance/quote/${symbol}:NASDAQ`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 w-72 border-r border-slate-200 bg-slate-50/95 px-6 py-8 backdrop-blur-xl">
        <div className="mb-10">
          <span className="inline-flex items-center justify-center rounded-3xl bg-slate-200/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-sky-600/90">
            Market Scanner
          </span>
          <h1 className="mt-8 text-3xl font-semibold text-slate-900">Stock Dashboard</h1>
          <p className="mt-3 text-sm text-slate-600">
            Real-time scanner and market insights in one workspace.
          </p>
        </div>

        <nav className="space-y-3 text-sm text-slate-600">
          <button className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-left text-slate-900 transition hover:border-sky-500/50 hover:bg-slate-100">
            <span>📈 Dashboard</span>
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-600">Active</span>
          </button>
          <button className="block w-full rounded-2xl px-4 py-3 text-left transition hover:bg-slate-100/80 hover:text-slate-900">
            � Chat
          </button>
        </nav>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-100/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tips</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="font-medium text-slate-900">🚀 Breakout</p>
              <p className="mt-1 text-slate-500">Resistance break and volume confirmation.</p>
            </li>
            <li className="rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="font-medium text-slate-900">🔥 Momentum</p>
              <p className="mt-1 text-slate-500">Strong intraday move with heavy buying.</p>
            </li>
            <li className="rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="font-medium text-slate-900">⚡ Volume Spike</p>
              <p className="mt-1 text-slate-500">Wider participation from market players.</p>
            </li>
            <li className="rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="font-medium text-slate-900">👀 Watchlist</p>
              <p className="mt-1 text-slate-500">Key symbols to monitor for setups.</p>
            </li>
          </ul>
        </div>
      </aside>

      <main className="ml-72 px-6 py-8 xl:px-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-600/80">Dashboard</p>
            <h2 className="mt-2 text-4xl font-semibold text-slate-900">Market Overview</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={tickersInput}
              onChange={(e) => setTickersInput(e.target.value)}
              placeholder="AAPL, TSLA, NVDA..."
              className="min-w-[260px] rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />

            <button
              onClick={() => fetchData(tickersInput)}
              className="rounded-3xl bg-sky-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              Scan
            </button>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[2.5fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/95 p-6 shadow-[0_18px_80px_-40px_rgba(15,23,42,0.8)]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Market Scanner</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Tick the symbols and review price action, momentum, and volume.
                  </p>
                </div>
                <span className="rounded-2xl bg-slate-200/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">
                  Live
                </span>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/90">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                  <thead className="bg-slate-50/90 text-slate-600">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold uppercase tracking-[0.2em]">Symbol</th>
                      <th className="px-4 py-4 text-left font-semibold uppercase tracking-[0.2em]">Price</th>
                      <th className="px-4 py-4 text-left font-semibold uppercase tracking-[0.2em]">Change</th>
                      <th className="px-4 py-4 text-left font-semibold uppercase tracking-[0.2em]">Signal</th>
                      <th className="px-4 py-4 text-left font-semibold uppercase tracking-[0.2em]">Volume</th>
                      <th className="px-4 py-4 text-left font-semibold uppercase tracking-[0.2em]">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-slate-50/90">
                    {stocks.map((stock) => {
                      const signal = computeSignal(stock.changePercent, stock.volume);
                      return (
                        <tr
                          key={stock.symbol}
                          onClick={() => setSelected(stock.symbol)}
                          className={`transition hover:bg-slate-100/80 ${
                            selected === stock.symbol ? "bg-slate-100/80" : "bg-transparent"
                          }`}
                        >
                          <td className="px-4 py-4 font-medium text-slate-900">{stock.symbol}</td>
                          <td className="px-4 py-4">${stock.price}</td>
                          <td
                            className={`px-4 py-4 ${
                              stock.changePercent > 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {stock.changePercent}%
                          </td>
                          <td className="px-4 py-4 text-slate-900">{signal.signal}</td>
                          <td className="px-4 py-4">{stock.volume}</td>
                          <td className="px-4 py-4">
                            <a
                              href={financeLink(stock.symbol)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 transition hover:text-sky-500"
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/95 p-6 shadow-[0_18px_80px_-40px_rgba(15,23,42,0.8)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Performance</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selected}</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600">
                  Live
                </span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
                <ChartCard symbol={selected} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
