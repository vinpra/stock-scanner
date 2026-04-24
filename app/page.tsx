"use client";

import { useEffect, useMemo, useState } from "react";
import ChartCard from "@/components/ChartCard";

type Stock = {
  symbol: string;
  price: number;
  open: number;
  gapPercent: number;
  volume: number;
  vwap: number;
  vwapDist: number;
  score: number;
  signal: string;
  stopLoss: number;
  takeProfit: number;
};

type NewsItem = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

type DetailTab = "chart" | "news";
type SortKey =
  | "symbol"
  | "price"
  | "gapPercent"
  | "vwapDist"
  | "volume"
  | "score"
  | "takeProfit";

const cardClasses =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5";

export default function HomePage() {
  const [scanner, setScanner] = useState<Stock[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("chart");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingScanner, setLoadingScanner] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [layoutMode, setLayoutMode] = useState<"grid" | "card">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const formatNumber = (value: number | string | undefined, digits = 2) => {
    if (value == null || value === "") return "-";
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isNaN(numberValue) ? "-" : numberValue.toFixed(digits);
  };

  const loadScanner = async () => {
    setLoadingScanner(true);
    try {
      const res = await fetch("/api/scanner?topN=25");
      const data = await res.json();
      setScanner(data.data || []);
    } finally {
      setLoadingScanner(false);
    }
  };

  const loadNews = async (symbol: string) => {
    setLoadingNews(true);
    try {
      const res = await fetch(`/api/news?symbol=${symbol}`);
      const data = await res.json();
      setNews(data.data || []);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    loadScanner();
  }, []);

  useEffect(() => {
    if (detailTab === "news" && selected) {
      loadNews(selected);
    }
  }, [detailTab, selected]);

  const stats = useMemo(() => {
    const total = scanner.length;
    const avgScore = total
      ? Number(
          (
            scanner.reduce((sum, item) => sum + item.score, 0) / total
          ).toFixed(1)
        )
      : 0;
    const maxGap = total
      ? Math.max(...scanner.map((item) => item.gapPercent))
      : 0;
    const maxVolume = total
      ? Math.max(...scanner.map((item) => item.volume))
      : 0;

    return {
      total,
      avgScore,
      maxGap,
      maxVolume,
    };
  }, [scanner]);

  const sortedScanner = useMemo(() => {
    return [...scanner].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aNumber = Number(aValue ?? 0);
      const bNumber = Number(bValue ?? 0);

      return sortDirection === "asc" ? aNumber - bNumber : bNumber - aNumber;
    });
  }, [scanner, sortKey, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedScanner.length / pageSize));
  const pagedScanner = useMemo(
    () => sortedScanner.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedScanner, currentPage]
  );

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
      setCurrentPage(1);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const onRowClick = (symbol: string) => {
    setSelected(symbol);
    setDetailTab("chart");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Momentum dashboard
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Scanner overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Top momentum candidates across gap, VWAP, volume, and score.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={loadScanner}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Refresh scan
              </button>
              <a
                href="/api/scanner?topN=100"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open full scan
              </a>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <div className={cardClasses}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Summary
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Quick stats
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Scanned</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{stats.total}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Stocks
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avg score</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{stats.avgScore}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    Momentum
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Max gap</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{stats.maxGap}%</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                    Breakout
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Top volume</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{stats.maxVolume.toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                    Liquidity
                  </span>
                </div>
              </div>
            </div>

            <div className={cardClasses}>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Legend</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Breakout → VWAP + volume surge
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Momentum → continuation move
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Fade → VWAP rejection
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Score → institutional strength
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <section className={cardClasses}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Active scanner
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Momentum leaders
                  </h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    {loadingScanner ? "Refreshing..." : `${scanner.length} records`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLayoutMode("grid")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        layoutMode === "grid"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("card")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        layoutMode === "card"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Cards
                    </button>
                  </div>
                </div>
              </div>

              {layoutMode === "grid" ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th
                          onClick={() => handleSort("symbol")}
                          className="cursor-pointer px-4 py-3 font-medium"
                        >
                          Symbol{sortIndicator("symbol")}
                        </th>
                        <th
                          onClick={() => handleSort("price")}
                          className="cursor-pointer px-4 py-3 font-medium"
                        >
                          Price{sortIndicator("price")}
                        </th>
                        <th
                          onClick={() => handleSort("gapPercent")}
                          className="cursor-pointer px-4 py-3 font-medium"
                        >
                          Gap %{sortIndicator("gapPercent")}
                        </th>
                        <th
                          onClick={() => handleSort("vwapDist")}
                          className="cursor-pointer px-4 py-3 font-medium"
                        >
                          VWAP %{sortIndicator("vwapDist")}
                        </th>
                        <th
                          onClick={() => handleSort("score")}
                          className="cursor-pointer px-4 py-3 font-medium"
                        >
                          Score{sortIndicator("score")}
                        </th>
                        <th className="px-4 py-3 font-medium">Signal</th>
                        <th
                          onClick={() => handleSort("takeProfit")}
                          className="cursor-pointer px-4 py-3 font-medium"
                        >
                          Target{sortIndicator("takeProfit")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pagedScanner.map((stock) => (
                        <tr
                          key={stock.symbol}
                          onClick={() => onRowClick(stock.symbol)}
                          className={`cursor-pointer transition hover:bg-slate-50 ${
                            selected === stock.symbol ? "bg-slate-100" : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {stock.symbol}
                          </td>
                          <td className="px-4 py-4 text-slate-700">${formatNumber(stock.price)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatNumber(stock.gapPercent)}%</td>
                          <td className="px-4 py-4 text-slate-700">{formatNumber(stock.vwapDist)}%</td>
                          <td className="px-4 py-4 text-slate-700">{formatNumber(stock.score, 1)}</td>
                          <td className="px-4 py-4 text-slate-700">{stock.signal}</td>
                          <td className="px-4 py-4 text-emerald-600">
                            ${formatNumber(stock.takeProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pagedScanner.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => onRowClick(stock.symbol)}
                    className={`group rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                      selected === stock.symbol ? "border-slate-900 bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-slate-900">
                        {stock.symbol}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        {stock.signal}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Price</span>
                        <span className="font-semibold text-slate-900">${formatNumber(stock.price)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Gap %</span>
                        <span className="font-semibold text-slate-900">{formatNumber(stock.gapPercent)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>VWAP %</span>
                        <span className="font-semibold text-slate-900">{formatNumber(stock.vwapDist)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Score</span>
                        <span className="font-semibold text-slate-900">{formatNumber(stock.score, 1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Target</span>
                        <span className="font-semibold text-emerald-600">${formatNumber(stock.takeProfit)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-600">
                <p>
                  Showing {pagedScanner.length} of {sortedScanner.length} results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 rounded-full bg-slate-100">
                    Page {currentPage} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                    disabled={currentPage === pageCount}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>

            <section>
              <div className={cardClasses}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Detail Panel
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      {selected ? `${selected} overview` : "Select a ticker"}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailTab("chart")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        detailTab === "chart"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Chart
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("news")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        detailTab === "news"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      News
                    </button>
                  </div>
                </div>

                {!selected ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    Click a row from the scanner to open chart and news detail here.
                  </div>
                ) : detailTab === "chart" ? (
                  <div className="mt-6 h-[420px]">
                    <ChartCard symbol={selected} />
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {loadingNews ? (
                      <div className="text-sm text-slate-500">Loading latest news...</div>
                    ) : news.length === 0 ? (
                      <div className="rounded-3xl border border-slate-200 p-6 text-sm text-slate-500">
                        No recent news found for {selected}. Switch back to chart view or refresh the scanner.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {news.map((item) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-3xl border border-slate-200 p-4 transition hover:bg-slate-50"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <h3 className="text-base font-semibold text-slate-900">
                                {item.headline}
                              </h3>
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                {new Date(item.datetime * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {item.summary || item.source}
                            </p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
