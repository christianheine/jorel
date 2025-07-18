export const defaultOpenAiModels: string[] = [
  "gpt-4.1-nano",
  "gpt-4.1-nano-2025-04-14",
  "gpt-4.1-mini",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1",
  "gpt-4.1-2025-04-14",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4o-mini-audio-preview",
  "gpt-4o-mini-audio-preview-2024-12-17",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4o",
  "gpt-4o-2024-05-13",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20",
  "gpt-4o-audio-preview",
  "gpt-4o-audio-preview-2024-10-01",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-3.5-turbo",
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-turbo-preview",
  "o3-mini-2025-01-31",
  "o3-mini",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini",
  "o1-mini-2024-09-12",
];

export const defaultOpenAiEmbeddingModels: {
  model: string;
  dimensions: number;
}[] = [
  { model: "text-embedding-3-small", dimensions: 1536 },
  { model: "text-embedding-3-large", dimensions: 3072 },
  { model: "text-embedding-ada-002", dimensions: 1536 },
];
