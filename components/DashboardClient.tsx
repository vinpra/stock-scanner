"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  entry: number;
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

type PortfolioHolding = {
  id: string;
  symbol: string;
  purchasePrice: number;
  shares: number;
};

type DetailTab = "chart" | "news";
type SortKey =
  | "symbol"
  | "price"
  | "gapPercent"
  | "volume"
  | "score"
  | "entry"
  | "stopLoss"
  | "takeProfit";

const cardClasses =
  "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5";

export default function DashboardClient({ userId }: { userId: string }) {
  const didLoadInitialData = useRef(false);
  const lastNewsSymbol = useRef<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
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
  const [searchTicker, setSearchTicker] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({
    symbol: "",
    purchasePrice: "",
    shares: "",
  });
  const pageSize = 10;

  const formatNumber = (value: number | string | undefined, digits = 2) => {
    if (value == null || value === "") return "-";
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isNaN(numberValue) ? "-" : numberValue.toFixed(digits);
  };

  const loadScanner = async (symbol?: string) => {
    setLoadingScanner(true);
    try {
      const url = symbol
        ? `/api/scanner?symbol=${encodeURIComponent(symbol)}`
        : "/api/scanner?topN=25";
      const res = await fetch(url);
      const data = await res.json();
      setScanner(data.data || []);
      if (symbol && data.data && data.data.length > 0) {
        setSelected(symbol);
      }
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

  const loadPortfolio = async () => {
    setPortfolioLoading(true);
    try {
      const res = await fetch("/api/portfolio");

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json();
      setPortfolio(data.holdings || []);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const savePortfolio = async (holdings: PortfolioHolding[]) => {
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ holdings }),
    });

    if (res.status === 401) {
      window.location.assign("/login");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  useEffect(() => {
    if (didLoadInitialData.current) {
      return;
    }

    didLoadInitialData.current = true;
    void loadScanner();
    void loadPortfolio();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncLayout = (matches: boolean) => {
      setIsDesktop(matches);
      setLayoutMode((current) => (matches ? current : "card"));
    };

    syncLayout(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncLayout(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (detailTab !== "news" || !selected) {
      return;
    }

    if (lastNewsSymbol.current === selected) {
      return;
    }

    lastNewsSymbol.current = selected;
    void loadNews(selected);
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

    return { total, avgScore, maxGap, maxVolume };
  }, [scanner]);

  const scannerBySymbol = useMemo(() => {
    return scanner.reduce<Record<string, Stock>>((acc, item) => {
      acc[item.symbol] = item;
      return acc;
    }, {});
  }, [scanner]);

  const portfolioStats = useMemo(() => {
    const totalShares = portfolio.reduce((sum, item) => sum + item.shares, 0);
    const totalCost = portfolio.reduce(
      (sum, item) => sum + item.purchasePrice * item.shares,
      0
    );
    const marketValue = portfolio.reduce((sum, item) => {
      const livePrice = scannerBySymbol[item.symbol]?.price ?? item.purchasePrice;
      return sum + livePrice * item.shares;
    }, 0);

    return {
      positions: portfolio.length,
      totalShares,
      totalCost,
      marketValue,
      pnl: marketValue - totalCost,
    };
  }, [portfolio, scannerBySymbol]);

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
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pagedScanner = useMemo(
    () =>
      sortedScanner.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize
      ),
    [safeCurrentPage, sortedScanner]
  );

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
    return sortDirection === "asc" ? " ^" : " v";
  };

  const onRowClick = (symbol: string) => {
    setSelected(symbol);
    setDetailTab("chart");
    if (lastNewsSymbol.current !== symbol) {
      setNews([]);
    }
  };

  const addPortfolioHolding = () => {
    const symbol = portfolioForm.symbol.trim().toUpperCase();
    const purchasePrice = Number(portfolioForm.purchasePrice);
    const shares = Number(portfolioForm.shares);

    if (!symbol || purchasePrice <= 0 || shares <= 0) {
      return;
    }

    const nextId = `${symbol}-${purchasePrice}-${shares}-${portfolio.length + 1}`;
    const nextHoldings = [
      { id: nextId, symbol, purchasePrice, shares },
      ...portfolio,
    ];

    setPortfolio(nextHoldings);
    void savePortfolio(nextHoldings);
    setPortfolioForm({ symbol: "", purchasePrice: "", shares: "" });
  };

  const removePortfolioHolding = (id: string) => {
    const nextHoldings = portfolio.filter((holding) => holding.id !== id);
    setPortfolio(nextHoldings);
    void savePortfolio(nextHoldings);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Momentum dashboard
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Scanner overview
              </h1>
              <p className="mt-2 text-sm text-slate-500">Signed in as {userId}</p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => loadScanner()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Refresh scan
              </button>
              <a
                href="/api/scanner?topN=100"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open full scan
              </a>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className={cardClasses}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Portfolio
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    Current holdings
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {portfolioStats.positions} positions
                </span>
              </div>



              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Total cost
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    ${formatNumber(portfolioStats.totalCost)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Market value
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    ${formatNumber(portfolioStats.marketValue)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    PnL
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      portfolioStats.pnl >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    ${formatNumber(portfolioStats.pnl)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Shares
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatNumber(portfolioStats.totalShares, 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="grid gap-2 sm:grid-cols-[0.9fr_1fr_1fr_auto]">
                  <input
                    type="text"
                    value={portfolioForm.symbol}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Ticker"
                    className="min-h-11 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={portfolioForm.purchasePrice}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        purchasePrice: e.target.value,
                      }))
                    }
                    placeholder="Buy price"
                    className="min-h-11 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={portfolioForm.shares}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        shares: e.target.value,
                      }))
                    }
                    placeholder="Shares"
                    className="min-h-11 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={addPortfolioHolding}
                    className="min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {portfolioLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                    Loading saved holdings...
                  </div>
                ) : portfolio.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                    No saved holdings yet. Add holdings manually and they will be
                    stored in Redis for this account.
                  </div>
                ) : (
                  portfolio.map((holding) => {
                    const livePrice =
                      scannerBySymbol[holding.symbol]?.price ?? holding.purchasePrice;
                    const pnl =
                      (livePrice - holding.purchasePrice) * holding.shares;

                    return (
                      <div
                        key={holding.id}
                        className="rounded-2xl border border-slate-200 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {holding.symbol}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatNumber(holding.shares, 0)} shares at $
                              {formatNumber(holding.purchasePrice)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePortfolioHolding(holding.id)}
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-rose-500"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-slate-500">
                            Live ${formatNumber(livePrice)}
                          </span>
                          <span
                            className={
                              pnl >= 0
                                ? "font-semibold text-emerald-600"
                                : "font-semibold text-rose-600"
                            }
                          >
                            ${formatNumber(pnl)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <details className={`${cardClasses} group`} open={isDesktop}>
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Summary
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    Quick stats
                  </h2>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 group-open:rotate-180">
                  More
                </span>
              </summary>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Scanned
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.total}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Stocks
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Avg score
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.avgScore}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    Momentum
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Max gap
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.maxGap}%
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                    Breakout
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Top volume
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.maxVolume.toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                    Liquidity
                  </span>
                </div>
              </div>
            </details>

            <details className={`${cardClasses} group`} open={isDesktop}>
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Legend
                </p>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 group-open:rotate-180">
                  More
                </span>
              </summary>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Breakout -&gt; VWAP + volume surge
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Momentum -&gt; continuation move
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Fade -&gt; VWAP rejection
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Score -&gt; institutional strength
                </div>
              </div>
            </details>
          </aside>

          <main className="space-y-6">
            <section className={cardClasses}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Active scanner
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Momentum leaders
                  </h2>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <input
                    type="text"
                    value={searchTicker}
                    onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchTicker.trim()) {
                        loadScanner(searchTicker.trim());
                        setSearchTicker("");
                      }
                    }}
                    placeholder="Search ticker..."
                    className="min-h-11 rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {isDesktop ? (
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
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Mobile card view
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    {loadingScanner ? "Refreshing..." : `${scanner.length} records`}
                  </div>
                  {!isDesktop ? (
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Tap card for chart and news
                    </p>
                  ) : null}
                </div>
              </div>

              {layoutMode === "grid" && isDesktop ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th onClick={() => handleSort("symbol")} className="cursor-pointer px-4 py-3 font-medium">Symbol{sortIndicator("symbol")}</th>
                        <th onClick={() => handleSort("price")} className="cursor-pointer px-4 py-3 font-medium">Price{sortIndicator("price")}</th>
                        <th onClick={() => handleSort("gapPercent")} className="cursor-pointer px-4 py-3 font-medium">Gap %{sortIndicator("gapPercent")}</th>
                        <th onClick={() => handleSort("score")} className="cursor-pointer px-4 py-3 font-medium">Score{sortIndicator("score")}</th>
                        <th onClick={() => handleSort("entry")} className="cursor-pointer px-4 py-3 font-medium">Entry{sortIndicator("entry")}</th>
                        <th onClick={() => handleSort("stopLoss")} className="cursor-pointer px-4 py-3 font-medium">Stop Loss{sortIndicator("stopLoss")}</th>
                        <th onClick={() => handleSort("takeProfit")} className="cursor-pointer px-4 py-3 font-medium">Take Profit{sortIndicator("takeProfit")}</th>
                        <th className="px-4 py-3 font-medium">Signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pagedScanner.map((stock) => (
                        <tr
                          key={stock.symbol}
                          onClick={() => onRowClick(stock.symbol)}
                          className={`cursor-pointer transition hover:bg-slate-50 ${selected === stock.symbol ? "bg-slate-100" : "bg-white"}`}
                        >
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            <a
                              href={`https://www.google.com/finance/quote/${stock.symbol}:NASDAQ`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="transition hover:text-slate-600 hover:underline"
                            >
                              {stock.symbol}
                            </a>
                          </td>
                          <td className="px-4 py-4 text-slate-700">${formatNumber(stock.price)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatNumber(stock.gapPercent)}%</td>
                          <td className="px-4 py-4 text-slate-700">{formatNumber(stock.score, 1)}</td>
                          <td className="px-4 py-4 text-slate-700">${formatNumber(stock.entry)}</td>
                          <td className="px-4 py-4 text-rose-600">${formatNumber(stock.stopLoss)}</td>
                          <td className="px-4 py-4 text-emerald-600">${formatNumber(stock.takeProfit)}</td>
                          <td className="px-4 py-4 text-slate-700">{stock.signal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedScanner.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => onRowClick(stock.symbol)}
                      className={`group rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                        selected === stock.symbol ? "border-slate-900 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold text-slate-900">{stock.symbol}</span>
                        <span className="text-sm font-medium text-slate-500">{stock.signal}</span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between"><span>Price</span><span className="font-semibold text-slate-900">${formatNumber(stock.price)}</span></div>
                        <div className="flex items-center justify-between"><span>Gap %</span><span className="font-semibold text-slate-900">{formatNumber(stock.gapPercent)}%</span></div>
                        <div className="flex items-center justify-between"><span>Score</span><span className="font-semibold text-slate-900">{formatNumber(stock.score, 1)}</span></div>
                        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Entry</p>
                            <p className="mt-1 font-semibold text-slate-900">${formatNumber(stock.entry)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Stop</p>
                            <p className="mt-1 font-semibold text-rose-600">${formatNumber(stock.stopLoss)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Target</p>
                            <p className="mt-1 font-semibold text-emerald-600">${formatNumber(stock.takeProfit)}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <p>Showing {pagedScanner.length} of {sortedScanner.length} results</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="rounded-full bg-slate-100 px-3 py-2">Page {safeCurrentPage} / {pageCount}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                    disabled={safeCurrentPage === pageCount}
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
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${detailTab === "chart" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      Chart
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("news")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${detailTab === "news" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
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
                  <div className="mt-6 h-[320px] sm:h-[420px]">
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
                              <h3 className="text-base font-semibold text-slate-900">{item.headline}</h3>
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
