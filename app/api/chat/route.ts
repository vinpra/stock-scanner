export async function POST(req: Request) {
  try {
    const { message } = await req.json();

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
      return Response.json({
        reply: `OpenAI error: ${data.error?.message || "unknown error"}`,
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    return Response.json({
      reply: reply || "Empty response from AI",
    });
  } catch (err: any) {
    return Response.json({
      reply: "Server error: " + err.message,
    });
  }
}