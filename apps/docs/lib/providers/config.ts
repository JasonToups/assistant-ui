/**
 * Environment Variable Validation and Configuration Loading
 *
 * Validates OLLAMA_API_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT with proper error messages
 */

import type { EnvironmentVariables, ProviderConfiguration } from "./types";

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function validateEnvironmentVariables(): EnvironmentVariables {
  const config: EnvironmentVariables = {
    OLLAMA_API_URL: process.env.OLLAMA_API_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    OLLAMA_TIMEOUT: process.env.OLLAMA_TIMEOUT
      ? parseInt(process.env.OLLAMA_TIMEOUT, 10)
      : undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Validate OLLAMA_API_URL if provided
  if (config.OLLAMA_API_URL) {
    try {
      new URL(config.OLLAMA_API_URL);
    } catch {
      throw new ConfigurationError(
        "Invalid OLLAMA_API_URL. Must be a valid URL (e.g., http://localhost:11434)",
        "INVALID_OLLAMA_URL",
      );
    }
  }

  // Validate OLLAMA_MODEL if provided
  if (config.OLLAMA_MODEL && config.OLLAMA_MODEL.trim() === "") {
    throw new ConfigurationError(
      "OLLAMA_MODEL cannot be empty. Provide a valid model name (e.g., llama2, codellama)",
      "INVALID_OLLAMA_MODEL",
    );
  }

  // Validate OLLAMA_TIMEOUT if provided
  if (config.OLLAMA_TIMEOUT !== undefined) {
    if (
      isNaN(config.OLLAMA_TIMEOUT) ||
      config.OLLAMA_TIMEOUT < 1000 ||
      config.OLLAMA_TIMEOUT > 60000
    ) {
      throw new ConfigurationError(
        "OLLAMA_TIMEOUT must be a number between 1000 and 60000 milliseconds",
        "INVALID_OLLAMA_TIMEOUT",
      );
    }
  }

  // Validate OPENAI_API_KEY format if provided
  if (config.OPENAI_API_KEY && !config.OPENAI_API_KEY.startsWith("sk-")) {
    throw new ConfigurationError(
      'OPENAI_API_KEY must start with "sk-". Get your API key from https://platform.openai.com/api-keys',
      "INVALID_OPENAI_KEY",
    );
  }

  return config;
}

export function createProviderConfigurations(
  env: EnvironmentVariables,
): ProviderConfiguration[] {
  const configurations: ProviderConfiguration[] = [];

  // OpenAI Configuration with enhanced settings
  if (env.OPENAI_API_KEY) {
    configurations.push({
      provider: "openai",
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      timeout: env.OPENAI_TIMEOUT || 30000,
      enabled: true,
    });
  }

  // Ollama Configuration with enhanced settings
  if (env.OLLAMA_API_URL) {
    configurations.push({
      provider: "ollama",
      apiUrl: env.OLLAMA_API_URL,
      model: env.OLLAMA_MODEL || "llama2",
      timeout: env.OLLAMA_TIMEOUT || 5000,
      enabled: true,
    });
  }

  return configurations;
}

export function getProviderSpecificConfig(
  provider: string,
  env: EnvironmentVariables,
): Record<string, unknown> {
  switch (provider) {
    case "openai":
      return {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        timeout: env.OPENAI_TIMEOUT || 30000,
        maxTokens: env.OPENAI_MAX_TOKENS || 1000,
        temperature: env.OPENAI_TEMPERATURE || 0.7,
      };
    case "ollama":
      return {
        apiUrl: env.OLLAMA_API_URL || "http://localhost:11434",
        model: env.OLLAMA_MODEL || "llama2",
        timeout: env.OLLAMA_TIMEOUT || 5000,
        maxTokens: env.OLLAMA_MAX_TOKENS || 1000,
        temperature: env.OLLAMA_TEMPERATURE || 0.7,
      };
    default:
      return {};
  }
}

export function validateProviderConfig(
  provider: string,
  config: Record<string, unknown>,
): boolean {
  switch (provider) {
    case "openai":
      return !!(
        config.apiKey &&
        typeof config.apiKey === "string" &&
        config.apiKey.startsWith("sk-")
      );
    case "ollama":
      try {
        if (config.apiUrl) {
          new URL(config.apiUrl as string);
        }
        return !!(config.model && typeof config.model === "string");
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function getDefaultConfiguration(): EnvironmentVariables {
  return {
    OLLAMA_API_URL: "http://localhost:11434",
    OLLAMA_MODEL: "llama2",
    OLLAMA_TIMEOUT: 5000,
    NODE_ENV: "development",
  };
}

export function isOllamaConfigured(env: EnvironmentVariables): boolean {
  return !!(env.OLLAMA_API_URL && env.OLLAMA_MODEL);
}

export function isOpenAIConfigured(env: EnvironmentVariables): boolean {
  return !!env.OPENAI_API_KEY;
}
