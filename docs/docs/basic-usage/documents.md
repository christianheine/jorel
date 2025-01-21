---
sidebar_position: 5
---

# Working with Documents

JorEl allows you to provide context documents to inform the LLM's responses. Documents are structured pieces of information that can be referenced by the LLM during generation.

## Quick Start

Here's a basic example of using documents with JorEl:

```typescript
import { JorEl } from 'jorel';

const jorEl = new JorEl({
  openAI: true,
});

const response = await jorEl.ask(
  "What is the best company for sustainable packaging?",
  {
    documents: [{
      title: "Company Profile",
      content: "PackMojo is a leading provider of custom printed packaging solutions. " +
        "They offer sustainable packaging options including biodegradable materials.",
      source: "https://packmojo.com",
    }],
  }
);

console.log(response);
```

## Creating Documents

### Basic Document

The simplest way to create a document is to pass an object with `title` and `content` :

```typescript
const document = {
  title: "Company Profile",
  content: "PackMojo is a leading provider...",
};
```

### Full Document

Documents can include additional metadata:

```typescript
const document = {
  id: "doc-001",           // Optional: Unique identifier
  type: "article",         // Optional: Document type (default: "text")
  title: "Company Profile",
  content: "PackMojo is...",
  source: "https://packmojo.com",  // Optional: Source URL or reference
  attributes: {            // Optional: Additional metadata
    author: "John Doe",
    date: "2024-03-20",
    category: "business",
  },
};
```

### Using the LlmDocument Class

For more control, you can use the `LlmDocument` class directly:

```typescript
import { LlmDocument } from 'jorel';

// Create using constructor
const doc1 = new LlmDocument({
  title: "Company Profile",
  content: "PackMojo is...",
});

// Create using static text method
const doc2 = LlmDocument.text("doc-002", {
  title: "Product Catalog",
  content: "Our sustainable products...",
});
```

## Document Collections

Documents can be grouped into collections for better organization and control over how they're presented to the LLM.

### Basic Collection

The simplest way to use a collection is to pass an array of documents:

```typescript
const response = await jorEl.ask("What products are available?", {
  documents: [
    {
      title: "Product A",
      content: "Description of product A...",
    },
    {
      title: "Product B",
      content: "Description of product B...",
    },
  ],
});
```

### Using LlmDocumentCollection

For more control over how documents are formatted, use the `LlmDocumentCollection` class:

```typescript
import { LlmDocumentCollection } from 'jorel';

const collection = new LlmDocumentCollection([
  {
    title: "Product A",
    content: "Description of product A...",
  },
  {
    title: "Product B",
    content: "Description of product B...",
  },
], {
  documentToText: "xml", // Default format
});
```

### Document Formatting

JorEl supports different formats for presenting documents to the LLM:

#### XML Format (Default)

```typescript
const collection = new LlmDocumentCollection(documents, {
  documentToText: "xml",
});

// Results in:
// <Documents>
//   <Document id="doc1" title="Product A">
//     Description of product A...
//   </Document>
//   <Document id="doc2" title="Product B">
//     Description of product B...
//   </Document>
// </Documents>
```

#### JSON Format

```typescript
const collection = new LlmDocumentCollection(documents, {
  documentToText: "json",
});

// Results in JSON representation of documents
```

#### Custom Format

```typescript
const collection = new LlmDocumentCollection(documents, {
  documentToText: {
    template: "Document {{id}}: {{title}}\n{{content}}",
    separator: "\n---\n",
  },
});

// Results in:
// Document 1: Product A
// Description of product A...
// ---
// Document 2: Product B
// Description of product B...
```

## Advanced Usage

### Managing Collections

```typescript
const collection = new LlmDocumentCollection();

// Add documents
collection.add(new LlmDocument({
  title: "Product A",
  content: "Description...",
}));

// Get document by ID
const doc = collection.get("doc-001");

// Remove document
collection.remove("doc-001");

// Get all documents
const allDocs = collection.all;
```

### Custom System Messages

You can customize how documents are presented in the system message:

```typescript
const response = await jorEl.ask("What products are available?", {
  documents: collection,
  documentSystemMessage: "Here are some relevant documents to consider: {{documents}}",
});
```

### With Tools and Images

Documents can be used alongside other JorEl features:

```typescript
const response = await jorEl.ask(
  ["What is the price of this product?", image],
  {
    documents: [{
      title: "Price List",
      content: "Product A: $100\nProduct B: $200",
    }],
    tools: [{
      name: "format_price",
      description: "Format price in requested currency",
      executor: formatPrice,
      params: z.object({
        amount: z.number(),
        currency: z.string(),
      }),
    }],
  }
);
```

### Serialization

Documents and collections can be easily serialized:

```typescript
// Get document definition
const docDef = document.definition;

// Get collection definition
const collectionDef = collection.definition;

// Create from JSON
const newCollection = LlmDocumentCollection.fromJSON(collectionDef);
```
