---
sidebar_position: 4
---

# Using Images

JorEl makes it easy to work with images when using vision-capable models. You can include images in your requests using the `ImageContent` class, which supports loading images from various sources.

## Quick Start

Here's a basic example of using images with JorEl:

```typescript
import { JorEl, ImageContent } from 'jorel';

const jorEl = new JorEl({
  openAI: true,  // Will use OPENAI_API_KEY environment variable
});

// Set a vision-capable model
jorEl.models.setDefault("gpt-4o");

// Load image from file
const image = await ImageContent.fromFile("./image.png");

// Ask about the image
const response = await jorEl.text([
  "What is in this image?",
  image
]);

console.log(response);
```

## Loading Images

The `ImageContent` class provides several methods to load images from different sources:

### From Local File

Takes a local file path to load an image from your filesystem.

```typescript
// Load from a local file path
const image = await ImageContent.fromFile("./path/to/image.jpg");
```

### From URL

Takes a URL to load an image from the web. By default, the image is downloaded, since most providers currently require this.

```typescript
// Load from a URL (downloads by default)
const image = await ImageContent.fromUrl("https://example.com/image.jpg");
```

If you don't want JorEl to download the image, you can pass `false` as the third argument. This is useful if you want to pass the image to a provider that supports passing images as links.

```typescript
// Load from URL without downloading (some providers may not support this)
const image = await ImageContent.fromUrl(
  "https://example.com/image.jpg",
  "image/jpeg",  // Optional MIME type
  false          // Don't download
);
```

### From Buffer

Takes a buffer to load an image from memory.

```typescript
// Load from a Buffer
const buffer = await fs.promises.readFile("./image.jpg");
const image = await ImageContent.fromBuffer(buffer);

// You can also specify the MIME type
const image = await ImageContent.fromBuffer(buffer, "image/jpeg");
```

### From Data URL

Takes a data URL to load an image from a string.

```typescript
// Load from a data URL
const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg...";
const image = ImageContent.fromDataUrl(dataUrl);
```

## Provider Support

Different LLM providers have different levels of support for images. Please refer to the model documentation on the provider's website for more information.

## Advanced Usage

### Multiple Images

You can include multiple images in a single request:

```typescript
const image1 = await ImageContent.fromFile("./image1.jpg");
const image2 = await ImageContent.fromFile("./image2.jpg");

const response = await jorEl.text([
  "Compare these two images.",
  image1,
  image2
]);
```

### With Tools and Documents

Images can be used alongside other JorEl features like tools and documents:

```typescript
const image = await ImageContent.fromFile("./product.jpg");

const response = await jorEl.text(
  [
    "What is the price of this product in USD and EUR?",
    image
  ],
  {
    tools: [{
      name: "convert_currency",
      description: "Convert USD to EUR",
      executor: async ({ usd }) => ({ eur: usd * 0.92 }),
      params: z.object({
        usd: z.number(),
      }),
    }],
    documents: [{
      title: "Exchange Rates",
      content: "Current USD to EUR rate: 0.92",
    }],
  }
);
```

### Converting Between Formats

The `ImageContent` class provides methods to convert between different formats:

```typescript
const image = await ImageContent.fromFile("./image.jpg");

// Convert to buffer
const { buffer, mimeType } = await image.toBuffer();

// Convert to base64
const { data, mimeType } = await image.toBase64();

// Convert to data URL
const dataUrl = await image.toDataUrl();

// Convert to message content (for provider APIs)
const messageContent = await image.toMessageContent();
```
