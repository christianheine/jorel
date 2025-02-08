export const defaultMistralAiModels: string[] = [
  "mistral-large-latest",
  "pixtral-large-latest",
  "ministral-3b-latest",
  "ministral-8b-latest",
  "codestral-latest",
];

export const defaultMistralAiEmbeddingModels: {
  model: string;
  dimensions: number;
}[] = [{
  model: "mistral-embed",
  dimensions: 1024,
}];
