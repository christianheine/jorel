# JorEl

JorEl is a lightweight, elegant wrapper for interacting with multiple large language models (LLMs) such as OpenAI, Anthropic, Google, Ollama, and more. Designed with simplicity and usability in mind, it provides a unified message format for interacting with different models while remaining lightweight compared to solutions like LangChain.

## Features
- **Unified Message Format**: Standardizes user, system, and assistant messages across LLMs.
- **Lightweight**: Minimal overhead with a focus on using official libraries wherever possible.
- **Flexible Usage**: Use either as a unified wrapper for various providers or directly within programs for streamlined access.
- **Clean API**: An elegant interface for managing providers, models, and generating responses.

## Installation
Install JorEl via npm:
```bash
npm install jorel
```

## Core Tenets
1. **Lightweight**: Avoid unnecessary complexity; focus on wrapping LLM APIs efficiently.
2. **Unified Input/Output**: Provide unified message formats for both inputs and outputs.
3. **Official Libraries First**: Prioritize official npm libraries (e.g., `openai`) for each provider.
4. **Clean API**: Ensure intuitive and maintainable interfaces for developers.

## Usage

### Basic Setup
```typescript
import { JorEl } from "jorel";

const jorel = new JorEl({
  openAI: {
    apiKey: "your-openai-api-key",
    defaultTemperature: 0.7,
  },
  systemMessage: "You are a helpful assistant.",
});
```

### Using Providers

#### List Registered Providers
```typescript
console.log(jorel.providers.list()); // ["openai"]
```

#### Register a Custom Provider
```typescript
jorel.providers.registerCustom("myProvider", myCustomProviderInstance);
```

#### Register OpenAI
```typescript
jorel.providers.registerOpenAi({
  apiKey: "your-openai-api-key",
  defaultTemperature: 0.7,
});
```

### Using Models

#### List Registered Models
```typescript
console.log(jorel.models.list());
```

#### Register a Model
```typescript
jorel.models.register({
  model: "my-custom-model",
  provider: "myProvider",
  setAsDefault: true,
});
```

#### Unregister a Model
```typescript
jorel.models.unregister("my-custom-model");
```

#### Set Default Model
```typescript
jorel.models.setDefault("gpt-4o");
```

### Generate Responses

#### Generate a Simple Response
```typescript
const response = await jorel.ask("What is the capital of France?");
console.log(response); // "Paris"
```

#### Generate a Response Stream
```typescript
for await (const chunk of jorel.stream("Tell me a story about a brave knight.")) {
  process.stdout.write(chunk);
}
```

#### Generate JSON Output
```typescript
jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snakeCase for attributes!";
const jsonResponse = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");
console.log(jsonResponse); // Returns { name: "John", age: 30, city: "Sydney" }
```

### Advanced Usage

#### Directly Use Providers
You can access providers directly for more control:
```typescript
import { OpenAIProvider } from "jorel/providers";

const openAiProvider = new OpenAIProvider({ apiKey: "your-api-key" });
const response = await openAiProvider.generateResponse("gpt-4", [
  { role: "user", content: "Hello, OpenAI!" },
]);
console.log(response.content);
```

## Roadmap
- [ ] Add support for more providers 
  - [ ] Ollama
  - [ ] Anthropic
  - [ ] Google
- [ ] Implement vision support (images in prompts)
- [ ] Increase test coverage

## Contributing
Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

## License
This project is licensed under the MIT License.

