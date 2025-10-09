/**
 * Provider Health Check System
 *
 * Implements health check system for provider availability and connection status
 * System can check provider availability and connection status before requests
 */

import type {
  StandardLLMProvider,
  ProviderHealthStatus,
  ProviderMetrics,
} from "./interfaces";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import {
  validateEnvironmentVariables,
  createProviderConfigurations,
} from "./config";

export class HealthCheckSystem {
  private healthStatus: Map<string, ProviderHealthStatus> = new Map();
  private metrics: Map<string, ProviderMetrics> = new Map();
  private providers: Map<string, StandardLLMProvider> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number;

  constructor(checkIntervalMs: number = 30000) {
    this.checkIntervalMs = checkIntervalMs;
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      const env = validateEnvironmentVariables();
      const configs = createProviderConfigurations(env);

      for (const config of configs) {
        let provider: StandardLLMProvider;

        switch (config.provider) {
          case "ollama":
            provider = new OllamaProvider(
              config.apiUrl!,
              config.model!,
              config.timeout!,
            );
            break;
          case "openai":
            provider = new OpenAIProvider(
              config.apiKey!,
              config.model!,
              config.timeout!,
            );
            break;
          default:
            continue;
        }

        this.providers.set(config.provider, provider);
        this.initializeHealthStatus(config.provider);
        this.initializeMetrics(config.provider);
      }
    } catch (error) {
      console.error("Failed to initialize providers for health check:", error);
    }
  }

  private initializeHealthStatus(providerName: string): void {
    this.healthStatus.set(providerName, {
      provider: providerName,
      isHealthy: false,
      lastChecked: new Date(),
    });
  }

  private initializeMetrics(providerName: string): void {
    this.metrics.set(providerName, {
      provider: providerName,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastUsed: new Date(),
    });
  }

  async startHealthChecks(): Promise<void> {
    if (this.checkInterval) {
      return; // Already running
    }

    // Perform initial health check
    await this.performHealthCheck();

    // Set up periodic health checks
    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.checkIntervalMs);
  }

  stopHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async performHealthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        const startTime = Date.now();
        const isHealthy = await provider.healthCheck();
        const duration = Date.now() - startTime;

        const healthStatus = this.healthStatus.get(name);
        if (healthStatus) {
          healthStatus.isHealthy = isHealthy;
          healthStatus.lastChecked = new Date();
          healthStatus.error = isHealthy ? undefined : "Health check failed";
        }

        results[name] = isHealthy;
      } catch (error) {
        const healthStatus = this.healthStatus.get(name);
        if (healthStatus) {
          healthStatus.isHealthy = false;
          healthStatus.lastChecked = new Date();
          healthStatus.error =
            error instanceof Error ? error.message : "Unknown error";
        }

        results[name] = false;
      }
    }

    return results;
  }

  async checkProviderHealth(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return false;
    }

    try {
      const isHealthy = await provider.healthCheck();

      const healthStatus = this.healthStatus.get(providerName);
      if (healthStatus) {
        healthStatus.isHealthy = isHealthy;
        healthStatus.lastChecked = new Date();
        healthStatus.error = isHealthy
          ? undefined
          : "Provider health check failed";
      }

      return isHealthy;
    } catch (error) {
      const healthStatus = this.healthStatus.get(providerName);
      if (healthStatus) {
        healthStatus.isHealthy = false;
        healthStatus.lastChecked = new Date();
        healthStatus.error =
          error instanceof Error ? error.message : "Unknown error";
      }

      return false;
    }
  }

  getHealthStatus(
    providerName?: string,
  ): ProviderHealthStatus | Record<string, ProviderHealthStatus> {
    if (providerName) {
      return (
        this.healthStatus.get(providerName) || {
          provider: providerName,
          isHealthy: false,
          lastChecked: new Date(),
          error: "Provider not found",
        }
      );
    }

    return Object.fromEntries(this.healthStatus);
  }

  getMetrics(
    providerName?: string,
  ): ProviderMetrics | Record<string, ProviderMetrics> {
    if (providerName) {
      return (
        this.metrics.get(providerName) || {
          provider: providerName,
          requestCount: 0,
          successCount: 0,
          errorCount: 0,
          averageResponseTime: 0,
          lastUsed: new Date(),
        }
      );
    }

    return Object.fromEntries(this.metrics);
  }

  recordRequest(
    providerName: string,
    success: boolean,
    responseTime: number,
  ): void {
    const metrics = this.metrics.get(providerName);
    if (!metrics) {
      return;
    }

    metrics.requestCount++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // Update average response time
    const totalTime =
      metrics.averageResponseTime * (metrics.requestCount - 1) + responseTime;
    metrics.averageResponseTime = totalTime / metrics.requestCount;
    metrics.lastUsed = new Date();
  }

  getHealthyProviders(): string[] {
    return Array.from(this.healthStatus.entries())
      .filter(([_, status]) => status.isHealthy)
      .map(([name, _]) => name);
  }

  getUnhealthyProviders(): string[] {
    return Array.from(this.healthStatus.entries())
      .filter(([_, status]) => !status.isHealthy)
      .map(([name, _]) => name);
  }

  isProviderHealthy(providerName: string): boolean {
    const status = this.healthStatus.get(providerName);
    return status?.isHealthy || false;
  }

  getProviderError(providerName: string): string | undefined {
    const status = this.healthStatus.get(providerName);
    return status?.error;
  }
}
