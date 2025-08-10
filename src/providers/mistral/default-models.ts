export const defaultMistralAiModels: string[] = [
  "mistral-medium-latest",
  "magistral-medium-latest",
  "magistral-small-latest",
  "mistral-large-latest",
  "pixtral-large-latest",
  "mistral-moderation-latest",
  "ministral-3b-latest",
  "ministral-8b-latest",
  "open-mistral-nemo",
  "mistral-small-latest",
  "devstral-small-latest",
  "devstral-medium-latest",
  "mistral-saba-latest",
  "codestral-latest",
  "mistral-ocr-latest",
  "voxtral-small-latest",
  "voxtral-mini-latest",
];

export const defaultMistralAiEmbeddingModels: {
  model: string;
  dimensions: number;
}[] = [
  {
    model: "mistral-embed",
    dimensions: 1024,
  },
];
