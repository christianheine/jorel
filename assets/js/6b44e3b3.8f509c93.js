"use strict";(self.webpackChunkjorel_docs=self.webpackChunkjorel_docs||[]).push([[134],{3323:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>c,contentTitle:()=>i,default:()=>h,frontMatter:()=>a,metadata:()=>t,toc:()=>l});const t=JSON.parse('{"id":"basic-usage/generating-responses","title":"Generating responses","description":"JorEl provides several methods for generating responses from LLMs. Let\'s explore each one.","source":"@site/docs/basic-usage/generating-responses.md","sourceDirName":"basic-usage","slug":"/basic-usage/generating-responses","permalink":"/jorel/docs/basic-usage/generating-responses","draft":false,"unlisted":false,"tags":[],"version":"current","sidebarPosition":3,"frontMatter":{"sidebar_position":3},"sidebar":"learn","previous":{"title":"Initialization","permalink":"/jorel/docs/basic-usage/initialization"},"next":{"title":"Using Images","permalink":"/jorel/docs/basic-usage/images"}}');var o=s(4848),r=s(8453);const a={sidebar_position:3},i="Generating responses",c={},l=[{value:"Generating text responses",id:"generating-text-responses",level:2},{value:"Basic usage",id:"basic-usage",level:3},{value:"Customizing responses",id:"customizing-responses",level:3},{value:"Retrieving metadata",id:"retrieving-metadata",level:3},{value:"Generating JSON responses",id:"generating-json-responses",level:2},{value:"Streaming text responses",id:"streaming-text-responses",level:2},{value:"Working with images",id:"working-with-images",level:2},{value:"Working with documents",id:"working-with-documents",level:2},{value:"Working with tools",id:"working-with-tools",level:2},{value:"Configuration options",id:"configuration-options",level:2},{value:"Advanced methods",id:"advanced-methods",level:2},{value:"The <code>generate</code> method",id:"the-generate-method",level:3},{value:"The <code>generateContentStream</code> method",id:"the-generatecontentstream-method",level:3}];function d(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",p:"p",pre:"pre",...(0,r.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(n.header,{children:(0,o.jsx)(n.h1,{id:"generating-responses",children:"Generating responses"})}),"\n",(0,o.jsx)(n.p,{children:"JorEl provides several methods for generating responses from LLMs. Let's explore each one."}),"\n",(0,o.jsx)(n.h2,{id:"generating-text-responses",children:"Generating text responses"}),"\n",(0,o.jsxs)(n.p,{children:["The ",(0,o.jsx)(n.code,{children:"ask"})," method is the simplest way to get responses from an LLM. It returns the response as a string."]}),"\n",(0,o.jsx)(n.h3,{id:"basic-usage",children:"Basic usage"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const jorEl = new JorEl({\n  openAI: true, // Will use OPENAI_API_KEY environment variable\n});\n\nconst response = await jorEl.ask("What is the capital of France?");\nconsole.log(response);\n// Paris is the capital of France.\n'})}),"\n",(0,o.jsx)(n.h3,{id:"customizing-responses",children:"Customizing responses"}),"\n",(0,o.jsx)(n.p,{children:"You can customize the behavior for each individual request as well:"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.ask("What is the capital of France?", {\n  model: "gpt-4",                           // Specify model\n  temperature: 0,                           // Control randomness\n  systemMessage: "Answer concisely",        // Override system message\n});\nconsole.log(response);\n// Paris\n'})}),"\n",(0,o.jsx)(n.p,{children:"See below for more details on all available configuration options."}),"\n",(0,o.jsx)(n.h3,{id:"retrieving-metadata",children:"Retrieving metadata"}),"\n",(0,o.jsxs)(n.p,{children:["To get additional information about the request and response, you can pass ",(0,o.jsx)(n.code,{children:"true"})," as the third argument to the ",(0,o.jsx)(n.code,{children:"ask"})," method:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:"const {response, meta} = await jorEl.ask(\n  \"What is the capital of France?\",\n  { model: \"gpt-4\" },\n  true // Include metadata\n);\n\nconsole.log(meta);\n// {\n//   model: 'gpt-4',\n//   provider: 'openai',\n//   durationMs: 730,\n//   inputTokens: 26,\n//   outputTokens: 16,\n// }\n"})}),"\n",(0,o.jsx)(n.h2,{id:"generating-json-responses",children:"Generating JSON responses"}),"\n",(0,o.jsxs)(n.p,{children:["The ",(0,o.jsx)(n.code,{children:"json"})," method ensures the response is formatted as a JSON object:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'// Optional: Set a system message that encourages JSON formatting\njorEl.systemMessage = "Format everything as a JSON object. Use snakeCase for attributes.";\n\nconst response = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");\nconsole.log(response);\n// {\n//   "first_name": "John",\n//   "age": 30,\n//   "city": "Sydney"\n// }\n'})}),"\n",(0,o.jsxs)(n.p,{children:["It supports all the same configuration options as ",(0,o.jsx)(n.code,{children:"ask"})," , and you can also get metadata from ",(0,o.jsx)(n.code,{children:"json"})," :"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const {response, meta} = await jorEl.json(\n  "Format this: Name = John, Age = 30",\n  { temperature: 0 },\n  true // Include metadata\n);\n'})}),"\n",(0,o.jsx)(n.h2,{id:"streaming-text-responses",children:"Streaming text responses"}),"\n",(0,o.jsxs)(n.p,{children:["The ",(0,o.jsx)(n.code,{children:"stream"})," method allows you to receive response chunks as they're generated:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const stream = jorEl.stream("Generate a short story about a cat.");\n\nfor await (const chunk of stream) {\n  process.stdout.write(chunk); // Print each chunk as it arrives\n}\n'})}),"\n",(0,o.jsx)(n.h2,{id:"working-with-images",children:"Working with images"}),"\n",(0,o.jsxs)(n.p,{children:["When using vision-capable models, you can include images in your requests. The easiest way to do this is to use the ",(0,o.jsx)(n.code,{children:"ImageContent"})," class, which allows instantiating an image from a variety of sources like local files, urls, or buffers."]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'import { ImageContent } from \'jorel\';\n\n// Load image from file\nconst image = await ImageContent.fromFile("./image.png");\n\n// Pass image along with the question\nconst response = await jorEl.ask([\n  "What is in this image?",\n  image\n]);\n'})}),"\n",(0,o.jsx)(n.p,{children:"Note: Make sure to use a vision-capable model when working with images. You can set this using:"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'jorEl.models.setDefault("gpt-4-vision-preview"); // For OpenAI\n// or\njorEl.models.setDefault("claude-3-sonnet-20240229"); // For Anthropic\n'})}),"\n",(0,o.jsx)(n.h2,{id:"working-with-documents",children:"Working with documents"}),"\n",(0,o.jsx)(n.p,{children:"You can provide context documents to inform the LLM's responses. While you could also just pass documents into the system or user message, documents provide a more structured way to pass on information."}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.ask("What is the best company for sustainable packaging?", {\n  documents: [\n    {\n      title: "Company Profile",\n      content: "PackMojo is a leading provider of custom printed packaging solutions. " +\n        "They offer sustainable packaging options including biodegradable materials.",\n      source: "https://packmojo.com",\n    },\n  ]\n});\n'})}),"\n",(0,o.jsxs)(n.p,{children:["You can also customize how documents are presented to the LLM using ",(0,o.jsx)(n.code,{children:"documentSystemMessage"})," :"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'jorEl.documentSystemMessage = "Here are some relevant documents to consider: {{documents}}";\n// Or per request:\nconst response = await jorEl.ask("What is the best company...?", {\n  documents: [...],\n  documentSystemMessage: "Reference these sources: {{documents}}"\n});\n'})}),"\n",(0,o.jsxs)(n.p,{children:["For more details on working with documents, see the ",(0,o.jsx)(n.a,{href:"/jorel/docs/basic-usage/documents",children:"Documents section"}),"."]}),"\n",(0,o.jsx)(n.h2,{id:"working-with-tools",children:"Working with tools"}),"\n",(0,o.jsx)(n.p,{children:"Tools allow the LLM to perform actions or retrieve information during the conversation:"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'import { z } from "zod";\n\nconst response = await jorEl.ask("What\'s the weather in Sydney?", {\n  tools: [{\n    name: "get_weather",\n    description: "Get the current weather for a city",\n    executor: async ({ city }) => {\n      // Simulate weather API call\n      return { temperature: 22, conditions: "sunny" };\n    },\n    params: z.object({\n      city: z.string(),\n    }),\n  }]\n});\n'})}),"\n",(0,o.jsx)(n.p,{children:"Tools can also be used with streaming responses:"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const stream = jorEl.stream("What\'s the weather like in Sydney and Melbourne?", {\n  tools: [{\n    name: "get_weather",\n    description: "Get the current weather for a city",\n    executor: async ({ city }) => {\n      // Simulate weather API call\n      return { temperature: Math.round(20 + Math.random() * 5), conditions: "sunny" };\n    },\n    params: z.object({\n      city: z.string(),\n    }),\n  }]\n});\n\nfor await (const chunk of stream) {\n  process.stdout.write(chunk);\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["For more complex tool usage, including chaining tools and handling errors, see the ",(0,o.jsx)(n.a,{href:"/jorel/docs/basic-usage/tools",children:"Tools section"}),"."]}),"\n",(0,o.jsx)(n.h2,{id:"configuration-options",children:"Configuration options"}),"\n",(0,o.jsxs)(n.p,{children:["When using ",(0,o.jsx)(n.code,{children:"ask"})," , ",(0,o.jsx)(n.code,{children:"json"})," , or ",(0,o.jsx)(n.code,{children:"stream"})," , you can pass a configuration object with the following options:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'interface GenerationConfig {\n  // Model selection\n  model?: string;                    // Specific model to use (e.g., "gpt-4", "claude-3-opus")\n  \n  // Message configuration\n  systemMessage?: string;            // Override the default system message\n  documentSystemMessage?: string;    // Override how documents are presented\n  \n  // Generation parameters\n  temperature?: number;              // Controls randomness (0-1, default varies by provider)\n  \n  // Context\n  documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection;  // Reference documents\n  \n  // Tool configuration\n  tools?: LlmToolKit;               // Tools the LLM can use\n  toolChoice?: "none" | "auto" | "required" | string;  // How tools should be used\n  maxAttempts?: number;             // Maximum attempts for tool execution\n  context?: LLmToolContextSegment;  // Context available to tools (will be pass as second argument to executor, not visible or controllable by the LLM)\n  secureContext?: LLmToolContextSegment;  // Secure context for tools (will be pass as third argument to executor, and will not be included in logs)\n}\n'})}),"\n",(0,o.jsx)(n.p,{children:"Example using multiple configuration options:"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.ask("What\'s the weather like in Sydney?", {\n  model: "gpt-4",\n  temperature: 0.7,\n  systemMessage: "You are a weather expert. Be precise but conversational.",\n  tools: [{\n    name: "get_weather",\n    description: "Get weather data",\n    executor: getWeather,\n    params: weatherSchema\n  }],\n  maxAttempts: 2\n});\n'})}),"\n",(0,o.jsx)(n.h2,{id:"advanced-methods",children:"Advanced methods"}),"\n",(0,o.jsxs)(n.h3,{id:"the-generate-method",children:["The ",(0,o.jsx)(n.code,{children:"generate"})," method"]}),"\n",(0,o.jsxs)(n.p,{children:["The ",(0,o.jsx)(n.code,{children:"generate"})," method gives you more control by working directly with message arrays:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.generate([\n  { role: "system", content: "You are a helpful assistant." },\n  { role: "user", content: "What is the capital of France?" }\n], {\n  model: "gpt-4",\n  temperature: 0\n});\n\nconsole.log(response.content);    // The response text\nconsole.log(response.meta);       // Metadata about the generation\n'})}),"\n",(0,o.jsxs)(n.h3,{id:"the-generatecontentstream-method",children:["The ",(0,o.jsx)(n.code,{children:"generateContentStream"})," method"]}),"\n",(0,o.jsxs)(n.p,{children:["Similar to ",(0,o.jsx)(n.code,{children:"stream"})," , but works with message arrays and provides more detailed chunks:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-typescript",children:'const stream = jorEl.generateContentStream([\n  { role: "system", content: "You are a helpful assistant." },\n  { role: "user", content: "What is the capital of France?" }\n]);\n\nfor await (const chunk of stream) {\n  if (chunk.type === "chunk") {\n    process.stdout.write(chunk.content);\n  } else if (chunk.type === "response") {\n    console.log("\\nMetadata:", chunk.meta);\n  }\n}\n'})})]})}function h(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,o.jsx)(n,{...e,children:(0,o.jsx)(d,{...e})}):d(e)}},8453:(e,n,s)=>{s.d(n,{R:()=>a,x:()=>i});var t=s(6540);const o={},r=t.createContext(o);function a(e){const n=t.useContext(r);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function i(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:a(e.components),t.createElement(r.Provider,{value:n},e.children)}}}]);