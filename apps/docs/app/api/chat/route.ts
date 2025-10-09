import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, tools } = await req.json();

  // Check rate limit if configured
  if (process.env["KV_REST_API_URL"] && process.env["KV_REST_API_TOKEN"]) {
    const { kv } = await import("@vercel/kv");
    const { Ratelimit } = await import("@upstash/ratelimit");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.fixedWindow(5, "30s"),
    });

    const ip = req.headers.get("x-forwarded-for") ?? "ip";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: convertToModelMessages(messages),
    maxOutputTokens: 1200,
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(tools),
    },
    onError: console.error,
  });

  return result.toUIMessageStreamResponse();
}
