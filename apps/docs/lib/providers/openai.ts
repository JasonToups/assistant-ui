/**
 * OpenAI Provider Abstraction
 *
 * Creates OpenAI provider abstraction following same pattern as Ollama
 * OpenAI provider follows consistent interface with Ollama provider
 */

import type { LLMProvider, LLMRequest, LLMResponse } from "./types";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ProviderUnavailableError } from "./errors";

export class OpenAIProvider implements LLMProvider {
  public readonly name = "openai";
  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(
    apiKey: string,
    model: string = "gpt-4o-mini",
    timeout: number = 30000,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple validation - check if API key is properly formatted
      if (!this.apiKey || !this.apiKey.startsWith("sk-")) {
        return false;
      }

      // We could add a more comprehensive health check here
      // by making a small API call, but for now we'll assume
      // the key format validation is sufficient
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    if (!(await this.isAvailable())) {
      throw new ProviderUnavailableError(
        "openai",
        "OpenAI API key is not configured or invalid. Please set OPENAI_API_KEY environment variable.",
      );
    }

    try {
      const result = await generateText({
        model: openai(this.model, {
          apiKey: this.apiKey,
        }),
        messages: request.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        maxTokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        abortSignal: AbortSignal.timeout(request.timeout || this.timeout),
      });

      return {
        messages: [
          ...request.messages,
          {
            role: "assistant",
            content: result.text,
            id: Date.now().toString(),
          },
        ],
        provider: this.name,
        model: this.model,
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ProviderUnavailableError(
          "openai",
          `OpenAI request timed out after ${request.timeout || this.timeout}ms`,
        );
      }

      throw new ProviderUnavailableError(
        "openai",
        `OpenAI request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  getConfiguration(): { model: string; timeout: number } {
    return {
      model: this.model,
      timeout: this.timeout,
    };
  }
}
