export interface OpenRouterConfig {
  useNativeSDK?: boolean;
  apiKey?: string;
  apiUrl?: string; // Only for legacy mode
  name?: string;
  maxRetries?: number;
  timeout?: number;
}
