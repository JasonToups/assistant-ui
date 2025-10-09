/**
 * Provider Interface Standardization
 *
 * Defines common provider interface ensuring consistency across all providers
 * All providers implement same interface with consistent method signatures
 */

import type { LLMProvider, LLMRequest, LLMResponse } from "./types";

/**
 * Standard provider interface that all LLM providers must implement
 */
export interface StandardLLMProvider extends LLMProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Check if the provider is available and properly configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate text response from the provider
   */
  generateText(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Perform health check on the provider
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get provider-specific configuration
   */
  getConfiguration?(): Record<string, unknown>;
}

/**
 * Provider factory interface for creating and managing providers
 */
export interface ProviderFactoryInterface {
  /**
   * Generate text using the best available provider
   */
  generateText(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[];

  /**
   * Perform health check on all providers
   */
  healthCheck(): Promise<Record<string, boolean>>;

  /**
   * Get provider by name
   */
  getProvider(name: string): StandardLLMProvider | undefined;
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Provider selection strategy
 */
export type ProviderSelectionStrategy =
  | "auto"
  | "ollama"
  | "openai"
  | "langgraph";

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  provider: string;
  isHealthy: boolean;
  lastChecked: Date;
  error?: string;
}

/**
 * Provider metrics interface
 */
export interface ProviderMetrics {
  provider: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastUsed: Date;
}

/**
 * Provider registry interface for managing multiple providers
 */
export interface ProviderRegistry {
  /**
   * Register a new provider
   */
  register(provider: StandardLLMProvider): void;

  /**
   * Unregister a provider
   */
  unregister(name: string): void;

  /**
   * Get provider by name
   */
  get(name: string): StandardLLMProvider | undefined;

  /**
   * Get all registered providers
   */
  getAll(): StandardLLMProvider[];

  /**
   * Get available providers
   */
  getAvailable(): Promise<StandardLLMProvider[]>;
}

/**
 * Provider validation interface
 */
export interface ProviderValidator {
  /**
   * Validate provider configuration
   */
  validate(config: Record<string, unknown>): Promise<boolean>;

  /**
   * Get validation errors
   */
  getErrors(): string[];
}

/**
 * Provider error interface
 */
export interface ProviderError extends Error {
  code: string;
  provider: string;
  details?: Record<string, unknown>;
}

/**
 * Provider request context
 */
export interface ProviderRequestContext {
  requestId: string;
  timestamp: Date;
  provider: string;
  model?: string;
  timeout?: number;
}

/**
 * Provider response context
 */
export interface ProviderResponseContext {
  requestId: string;
  timestamp: Date;
  provider: string;
  model: string;
  duration: number;
  tokensUsed: number;
}
