export interface OpenAiToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIConfig {
  azure?: false;
  apiKey?: string;
  apiUrl?: string;
  name?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface OpenAiAzureConfig {
  azure: true;
  apiKey?: string;
  apiUrl?: string;
  apiVersion?: string;
  name?: string;
  maxRetries?: number;
  timeout?: number;
}
