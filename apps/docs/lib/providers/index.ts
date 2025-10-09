/**
 * Provider Factory Implementation
 *
 * Creates provider factory with auto-selection logic and fallback handling
 * Factory selects Ollama when configured, falls back to OpenAI on failure
 */

import type { LLMProvider, LLMRequest, LLMResponse } from "./types";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import {
  validateEnvironmentVariables,
  createProviderConfigurations,
  isOllamaConfigured,
  isOpenAIConfigured,
} from "./config";
import {
  ProviderUnavailableError,
  InvalidConfigurationError,
  ERROR_CODES,
} from "./errors";

export class ProviderFactory {
  private providers: Map<string, LLMProvider> = new Map();
  private configurations: Array<{ provider: string; config: any }> = [];
  private initialized: boolean = false;

  constructor() {
    // Don't initialize here - wait for first use
  }

  private async initializeProviders(): Promise<void> {
    try {
      const env = validateEnvironmentVariables();
      const configs = createProviderConfigurations(env);

      // Initialize Ollama provider if configured
      if (isOllamaConfigured(env)) {
        const ollamaProvider = new OllamaProvider(
          env.OLLAMA_API_URL!,
          env.OLLAMA_MODEL!,
          env.OLLAMA_TIMEOUT || 5000,
        );

        // Check if Ollama is available
        const isAvailable = await ollamaProvider.isAvailable();
        if (isAvailable) {
          this.providers.set("ollama", ollamaProvider);
          this.configurations.push({
            provider: "ollama",
            config: { enabled: true },
          });
        } else {
          console.warn(
            "Ollama is configured but not available:",
            ollamaProvider.getConnectionStatus().error,
          );
        }
      }

      // Initialize OpenAI provider if configured
      if (isOpenAIConfigured(env)) {
        const openaiProvider = new OpenAIProvider(
          env.OPENAI_API_KEY!,
          "gpt-4o-mini",
          30000,
        );

        // Check if OpenAI is available
        const isAvailable = await openaiProvider.isAvailable();
        if (isAvailable) {
          this.providers.set("openai", openaiProvider);
          this.configurations.push({
            provider: "openai",
            config: { enabled: true },
          });
        } else {
          console.warn("OpenAI is configured but not available");
        }
      }

      if (this.providers.size === 0) {
        throw new InvalidConfigurationError(
          "No LLM providers are configured. Please set either OLLAMA_API_URL or OPENAI_API_KEY environment variables.",
        );
      }
    } catch (error) {
      throw new InvalidConfigurationError(
        `Failed to initialize providers: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    // Initialize providers if not already done
    if (!this.initialized) {
      await this.initializeProviders();
      this.initialized = true;
    }

    const preferredProvider = request.provider || "auto";

    if (preferredProvider === "auto") {
      return this.generateWithAutoSelection(request);
    }

    if (preferredProvider === "ollama") {
      return this.generateWithOllama(request);
    }

    if (preferredProvider === "openai") {
      return this.generateWithOpenAI(request);
    }

    throw new InvalidConfigurationError(
      `Unknown provider: ${preferredProvider}. Available providers: ${Array.from(this.providers.keys()).join(", ")}`,
    );
  }

  private async generateWithAutoSelection(
    request: LLMRequest,
  ): Promise<LLMResponse> {
    // Try Ollama first if available
    if (this.providers.has("ollama")) {
      try {
        return await this.generateWithOllama(request);
      } catch (error) {
        console.warn(
          "Ollama failed, falling back to OpenAI:",
          error instanceof Error ? error.message : "Unknown error",
        );

        // Fallback to OpenAI if available
        if (this.providers.has("openai")) {
          return await this.generateWithOpenAI(request);
        }

        throw error;
      }
    }

    // Fallback to OpenAI if Ollama not available
    if (this.providers.has("openai")) {
      return await this.generateWithOpenAI(request);
    }

    throw new ProviderUnavailableError(
      "auto",
      "No providers are available. Please check your configuration.",
    );
  }

  private async generateWithOllama(request: LLMRequest): Promise<LLMResponse> {
    const ollamaProvider = this.providers.get("ollama");
    if (!ollamaProvider) {
      throw new ProviderUnavailableError(
        "ollama",
        "Ollama is not configured or not available. Please check OLLAMA_API_URL and ensure Ollama is running.",
      );
    }

    return await ollamaProvider.generateText(request);
  }

  private async generateWithOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const openaiProvider = this.providers.get("openai");
    if (!openaiProvider) {
      throw new ProviderUnavailableError(
        "openai",
        "OpenAI is not configured. Please set OPENAI_API_KEY environment variable.",
      );
    }

    return await openaiProvider.generateText(request);
  }

  async getAvailableProviders(): Promise<string[]> {
    // Initialize providers if not already done
    if (!this.initialized) {
      await this.initializeProviders();
      this.initialized = true;
    }
    return Array.from(this.providers.keys());
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}
