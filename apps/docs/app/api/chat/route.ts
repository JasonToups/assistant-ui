import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { ProviderFactory } from "../../../lib/providers";
import {
  InvalidConfigurationError,
  ProviderUnavailableError,
} from "../../../lib/providers/errors";

export const maxDuration = 30;

// Initialize provider factory (singleton pattern)
let providerFactory: ProviderFactory | null = null;

async function getProviderFactory(): Promise<ProviderFactory> {
  if (!providerFactory) {
    providerFactory = new ProviderFactory();
  }
  return providerFactory;
}

export async function POST(req: Request) {
  const { messages, tools, provider, model, timeout } = await req.json();

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

  try {
    const factory = await getProviderFactory();

    // Check if we should use Ollama provider
    const availableProviders = await factory.getAvailableProviders();

    // Check if no providers are available
    if (availableProviders.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No LLM providers configured. Please set either OLLAMA_API_URL or OPENAI_API_KEY in your .env file.",
          code: "NO_PROVIDERS_CONFIGURED",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const shouldUseOllama =
      provider === "ollama" ||
      (!provider &&
        availableProviders.includes("ollama") &&
        !availableProviders.includes("openai")) ||
      (provider === "auto" && availableProviders.includes("ollama"));

    if (shouldUseOllama && availableProviders.includes("ollama")) {
      // Use Ollama provider for local development
      const llmRequest = {
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          id: msg.id,
        })),
        provider: "ollama",
        model: model || undefined,
        maxTokens: 1200,
        temperature: 0.7,
        timeout: timeout || undefined,
      };

      const response = await factory.generateText(llmRequest);

      // Convert Ollama response to AI SDK compatible format
      const lastMessage = response.messages[response.messages.length - 1];
      const content = lastMessage?.content || "";

      // Create a simple streaming response that matches AI SDK format
      const stream = new ReadableStream({
        start(controller) {
          // Send text deltas to match AI SDK format
          const encoder = new TextEncoder();

          // Send the complete text as a single delta for now
          const chunk = JSON.stringify({
            type: "text-delta",
            textDelta: content,
          });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));

          // Send finish message
          const finishChunk = JSON.stringify({
            type: "finish",
            finishReason: "stop",
          });
          controller.enqueue(encoder.encode(`data: ${finishChunk}\n\n`));

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Fallback to OpenAI using existing AI SDK
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
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof InvalidConfigurationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: "INVALID_CONFIGURATION",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (error instanceof ProviderUnavailableError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: "PROVIDER_UNAVAILABLE",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
