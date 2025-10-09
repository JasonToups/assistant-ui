/**
 * Provider Configuration Types
 *
 * TypeScript interfaces for provider configuration and Ollama connection
 * Based on data model entities: Provider Configuration, Ollama Connection, Environment Variables
 */

export type ProviderType = "openai" | "ollama" | "langgraph";

export interface ProviderConfiguration {
  provider: ProviderType;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  timeout?: number;
  enabled: boolean;
}

export interface OllamaConnection {
  baseUrl: string;
  model: string;
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
}

export interface EnvironmentVariables {
  OLLAMA_API_URL?: string;
  OLLAMA_MODEL?: string;
  OLLAMA_TIMEOUT?: number;
  OLLAMA_MAX_TOKENS?: number;
  OLLAMA_TEMPERATURE?: number;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_TIMEOUT?: number;
  OPENAI_MAX_TOKENS?: number;
  OPENAI_TEMPERATURE?: number;
  NODE_ENV?: string;
}

export interface LLMRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    id?: string;
  }>;
  tools?: Record<
    string,
    {
      description: string;
      parameters: Record<string, unknown>;
    }
  >;
  provider?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMResponse {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    id?: string;
  }>;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Provider interface for consistent implementation
export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateText(request: LLMRequest): Promise<LLMResponse>;
  healthCheck(): Promise<boolean>;
}
