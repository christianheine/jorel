export const defaultOpenAiModels: string[] = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-3.5-turbo",
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-turbo-preview",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20",
  "o1-preview",
  "o1-mini",
];

export const defaultOpenAiEmbeddingModels: {
  model: string;
  dimensions: number;
}[] = [
  { model: "text-embedding-3-small", dimensions: 1536 },
  { model: "text-embedding-3-large", dimensions: 3072 },
  { model: "text-embedding-ada-002", dimensions: 1536 },
];
