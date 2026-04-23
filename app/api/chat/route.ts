import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required", reply: null },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a trading assistant.",
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await res.json();

    console.log("OPENAI RAW RESPONSE:", JSON.stringify(data, null, 2));

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `OpenAI error: ${data.error?.message || "unknown error"}`,
          reply: null,
        },
        { status: res.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content;

    return NextResponse.json({
      reply: reply || "Empty response from AI",
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json(
      {
        error: "Server error: " + err.message,
        reply: null,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return NextResponse.json(
    {
      error: "Use POST with { message: 'your question' } to chat with AI",
      reply: null,
    },
    { status: 405 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "POST, OPTIONS",
    },
  });
}