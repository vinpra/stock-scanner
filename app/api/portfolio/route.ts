import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getPortfolioKey, getSessionUser } from "@/lib/auth";

type PortfolioHolding = {
  id: string;
  symbol: string;
  purchasePrice: number;
  shares: number;
};

type PortfolioPayload = {
  holdings: PortfolioHolding[];
};

function isValidHolding(holding: PortfolioHolding) {
  return (
    typeof holding.id === "string" &&
    typeof holding.symbol === "string" &&
    typeof holding.purchasePrice === "number" &&
    typeof holding.shares === "number"
  );
}

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", holdings: [] },
      { status: 401 }
    );
  }

  const holdings =
    (await redis.get<PortfolioHolding[]>(getPortfolioKey(session.userId))) ?? [];

  return NextResponse.json({
    userId: session.userId,
    holdings,
  });
}

export async function POST(req: Request) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<PortfolioPayload>;
  const holdings = body.holdings;

  if (!Array.isArray(holdings) || !holdings.every(isValidHolding)) {
    return NextResponse.json(
      { error: "Invalid portfolio payload" },
      { status: 400 }
    );
  }

  await redis.set(getPortfolioKey(session.userId), holdings);

  return NextResponse.json({
    ok: true,
    userId: session.userId,
    holdings,
  });
}
