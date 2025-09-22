/**
 * Provider Test Server Setup
 *
 * Configures and manages the test server for provider verification,
 * integrating with the existing application structure.
 */

import type { Application } from 'express';
import { getProviderConfig } from '../utils/provider-config';
import { checkUrlAccessible } from '../utils/test-helpers';

export interface ProviderServer {
  /** Start the provider server */
  start(): Promise<void>;
  /** Stop the provider server */
  stop(): Promise<void>;
  /** Get the server URL */
  getUrl(): string;
  /** Check if server is running */
  isRunning(): Promise<boolean>;
}

/**
 * Creates a provider server instance for testing
 *
 * TODO: Auth team - implement this to start your actual application server
 * or create a lightweight test server that handles the auth endpoints.
 *
 * Example implementation approaches:
 * 1. Start the full Next.js application in test mode
 * 2. Create an Express server with just the auth routes
 * 3. Use the existing development server if available
 */
export function createProviderServer(): ProviderServer {
  const config = getProviderConfig();
  let server: any = null;
  let isServerRunning = false;

  return {
    async start(): Promise<void> {
      if (isServerRunning) {
        return;
      }

      // TODO: Auth team - implement server startup logic
      // This could be:
      // 1. Starting Next.js app: `next start` or programmatic startup
      // 2. Starting Express server with auth routes
      // 3. Using existing development server
      //
      // Example for Express server:
      // ```typescript
      // const express = require('express');
      // const app = express();
      //
      // // Add your auth route handlers here
      // app.use('/api/auth', authHandlers);
      //
      // server = app.listen(config.providerPort);
      // ```

      console.log(`[ProviderServer] TODO: Start server on ${config.providerBaseUrl}`);

      // For now, assume server is running externally
      // Remove this and implement actual startup logic
      const isAccessible = await checkUrlAccessible(config.providerBaseUrl);
      if (!isAccessible) {
        console.warn(
          `[ProviderServer] Provider server not accessible at ${config.providerBaseUrl}. ` +
          'Contract tests will likely fail. Please implement server startup logic in createProviderServer()'
        );
        // Don't throw error for now to prevent hanging, just warn
      }

      isServerRunning = true;
    },

    async stop(): Promise<void> {
      if (!isServerRunning) {
        return;
      }

      // TODO: Auth team - implement server shutdown logic
      // Example:
      // ```typescript
      // if (server) {
      //   await new Promise<void>((resolve) => {
      //     server.close(() => resolve());
      //   });
      //   server = null;
      // }
      // ```

      console.log('[ProviderServer] TODO: Stop server');
      isServerRunning = false;
    },

    getUrl(): string {
      return config.providerBaseUrl;
    },

    async isRunning(): Promise<boolean> {
      if (!isServerRunning) {
        return false;
      }

      return checkUrlAccessible(config.providerBaseUrl);
    },
  };
}

/**
 * Provider server lifecycle management for tests
 */
export class ProviderServerManager {
  private server: ProviderServer;
  private startupTimeout: number;

  constructor(server?: ProviderServer) {
    this.server = server || createProviderServer();
    this.startupTimeout = getProviderConfig().timeouts.setup;
  }

  /**
   * Ensures the provider server is running before tests
   */
  async ensureRunning(): Promise<void> {
    const isRunning = await this.server.isRunning();
    if (isRunning) {
      console.log('[ProviderServerManager] Server already running');
      return;
    }

    console.log('[ProviderServerManager] Starting provider server...');

    const startPromise = this.server.start();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Server startup timeout after ${this.startupTimeout}ms`)),
        this.startupTimeout
      );
    });

    await Promise.race([startPromise, timeoutPromise]);

    // Verify server is accessible
    const isAccessible = await this.server.isRunning();
    if (!isAccessible) {
      throw new Error('Server started but is not accessible');
    }

    console.log(`[ProviderServerManager] Server running at ${this.server.getUrl()}`);
  }

  /**
   * Stops the provider server after tests
   */
  async shutdown(): Promise<void> {
    try {
      await this.server.stop();
      console.log('[ProviderServerManager] Server stopped');
    } catch (error) {
      console.error('[ProviderServerManager] Error stopping server:', error);
    }
  }

  /**
   * Gets the server URL
   */
  getServerUrl(): string {
    return this.server.getUrl();
  }
}

/**
 * Creates a provider server manager instance
 */
export function createProviderServerManager(): ProviderServerManager {
  return new ProviderServerManager();
}
