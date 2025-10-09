/**
 * Ollama Provider Implementation
 *
 * Implements Ollama provider following AI SDK provider pattern
 * Wraps Ollama REST API with proper error handling and timeout support
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  OllamaConnection,
} from "./types";
import { ConfigurationError } from "./config";

export class OllamaProvider implements LLMProvider {
  public readonly name = "ollama";
  private connection: OllamaConnection;
  private timeout: number;

  constructor(
    baseUrl: string = "http://localhost:11434",
    model: string = "llama2",
    timeout: number = 5000,
  ) {
    this.connection = {
      baseUrl,
      model,
      isConnected: false,
      lastChecked: new Date(),
    };
    this.timeout = timeout;
  }

  setModel(model: string): void {
    this.connection.model = model;
  }

  getModel(): string {
    return this.connection.model;
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.connection.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
      }

      return [];
    } catch {
      return [];
    }
  }

  async validateModel(model: string): Promise<boolean> {
    const availableModels = await this.getAvailableModels();
    return availableModels.includes(model);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.connection.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.ok) {
        this.connection.isConnected = true;
        this.connection.lastChecked = new Date();
        this.connection.error = undefined;
        return true;
      }

      this.connection.isConnected = false;
      this.connection.error = `HTTP ${response.status}: ${response.statusText}`;
      return false;
    } catch (error) {
      this.connection.isConnected = false;
      this.connection.error =
        error instanceof Error ? error.message : "Unknown error";
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    if (!this.connection.isConnected) {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new ConfigurationError(
          `Ollama is not available at ${this.connection.baseUrl}. ${this.connection.error || "Please ensure Ollama is running."}`,
          "OLLAMA_CONNECTION_FAILED",
        );
      }
    }

    try {
      const ollamaRequest = {
        model: request.model || this.connection.model,
        messages: request.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 1000,
        },
      };

      const response = await fetch(`${this.connection.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ollamaRequest),
        signal: AbortSignal.timeout(request.timeout || this.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) {
          const availableModels = await this.getAvailableModels();
          throw new ConfigurationError(
            `Model "${ollamaRequest.model}" not found. Available models: ${availableModels.join(", ")}`,
            "OLLAMA_MODEL_NOT_FOUND",
          );
        }
        throw new ConfigurationError(
          `Ollama request failed: ${response.status} ${response.statusText}`,
          "OLLAMA_REQUEST_FAILED",
        );
      }

      const data = await response.json();

      return {
        messages: [
          ...request.messages,
          {
            role: "assistant",
            content: data.message?.content || "",
            id: data.message?.id || Date.now().toString(),
          },
        ],
        provider: this.name,
        model: ollamaRequest.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ConfigurationError(
          `Ollama request timed out after ${request.timeout || this.timeout}ms. Consider increasing OLLAMA_TIMEOUT for slower machines.`,
          "OLLAMA_TIMEOUT",
        );
      }

      throw new ConfigurationError(
        `Ollama request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "OLLAMA_REQUEST_ERROR",
      );
    }
  }

  getConnectionStatus(): OllamaConnection {
    return { ...this.connection };
  }
}
