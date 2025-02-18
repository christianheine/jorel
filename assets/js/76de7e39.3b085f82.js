"use strict";(self.webpackChunkjorel_docs=self.webpackChunkjorel_docs||[]).push([[633],{6054:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>r,contentTitle:()=>l,default:()=>u,frontMatter:()=>i,metadata:()=>o,toc:()=>a});const o=JSON.parse('{"id":"basic-usage/documents","title":"Working with Documents","description":"JorEl allows you to provide context documents to inform the LLM\'s responses. Documents are structured pieces of information that can be referenced by the LLM during generation.","source":"@site/docs/basic-usage/documents.md","sourceDirName":"basic-usage","slug":"/basic-usage/documents","permalink":"/jorel/docs/basic-usage/documents","draft":false,"unlisted":false,"tags":[],"version":"current","sidebarPosition":5,"frontMatter":{"sidebar_position":5},"sidebar":"learn","previous":{"title":"Using Images","permalink":"/jorel/docs/basic-usage/images"},"next":{"title":"Using Tools","permalink":"/jorel/docs/basic-usage/tools"}}');var c=t(4848),s=t(8453);const i={sidebar_position:5},l="Working with Documents",r={},a=[{value:"Quick Start",id:"quick-start",level:2},{value:"Creating Documents",id:"creating-documents",level:2},{value:"Basic Document",id:"basic-document",level:3},{value:"Full Document",id:"full-document",level:3},{value:"Using the LlmDocument Class",id:"using-the-llmdocument-class",level:3},{value:"Document Collections",id:"document-collections",level:2},{value:"Basic Collection",id:"basic-collection",level:3},{value:"Using LlmDocumentCollection",id:"using-llmdocumentcollection",level:3},{value:"Document Formatting",id:"document-formatting",level:3},{value:"XML Format (Default)",id:"xml-format-default",level:4},{value:"JSON Format",id:"json-format",level:4},{value:"Custom Format",id:"custom-format",level:4},{value:"Advanced Usage",id:"advanced-usage",level:2},{value:"Managing Collections",id:"managing-collections",level:3},{value:"Custom System Messages",id:"custom-system-messages",level:3},{value:"With Tools and Images",id:"with-tools-and-images",level:3},{value:"Serialization",id:"serialization",level:3}];function d(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",header:"header",p:"p",pre:"pre",...(0,s.R)(),...e.components};return(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(n.header,{children:(0,c.jsx)(n.h1,{id:"working-with-documents",children:"Working with Documents"})}),"\n",(0,c.jsx)(n.p,{children:"JorEl allows you to provide context documents to inform the LLM's responses. Documents are structured pieces of information that can be referenced by the LLM during generation."}),"\n",(0,c.jsx)(n.h2,{id:"quick-start",children:"Quick Start"}),"\n",(0,c.jsx)(n.p,{children:"Here's a basic example of using documents with JorEl:"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'import { JorEl } from "jorel";\n\nconst jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY\n\n// Load document from local documentation files\nconst jorElIntro = await LlmDocument.fromFile("../../docs/docs/intro.md");\nconst jorElQuickStart = await LlmDocument.fromFile("../../docs/docs/quick-start.md");\n\n// Generate the response with the documents as context\nconst response = await jorEl.text("Describe the main features of JorEl.", {\n  documents: [jorElIntro, jorElQuickStart],\n  systemMessage: "Be succinct"\n});\n\nconsole.log(response);\n'})}),"\n",(0,c.jsx)(n.h2,{id:"creating-documents",children:"Creating Documents"}),"\n",(0,c.jsx)(n.h3,{id:"basic-document",children:"Basic Document"}),"\n",(0,c.jsxs)(n.p,{children:["The simplest way to create a document is to pass an object with ",(0,c.jsx)(n.code,{children:"title"})," and ",(0,c.jsx)(n.code,{children:"content"})," :"]}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const document = {\n  title: "Company Profile",\n  content: "Our company is a leading provider of...",\n};\n'})}),"\n",(0,c.jsx)(n.h3,{id:"full-document",children:"Full Document"}),"\n",(0,c.jsx)(n.p,{children:"Documents can include additional metadata:"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const document = {\n  id: "doc-001",           // Optional: Unique identifier\n  type: "article",         // Optional: Document type (default: "text")\n  title: "Company Profile",\n  content: "Our company is a leading provider of...",\n  source: "https://yourcompany.com",  // Optional: Source URL or reference\n  attributes: {            // Optional: Additional metadata\n    author: "John Doe",\n    date: "2024-03-20",\n    category: "business",\n  },\n};\n'})}),"\n",(0,c.jsx)(n.h3,{id:"using-the-llmdocument-class",children:"Using the LlmDocument Class"}),"\n",(0,c.jsxs)(n.p,{children:["For more control, you can use the ",(0,c.jsx)(n.code,{children:"LlmDocument"})," class directly:"]}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'import { LlmDocument } from \'jorel\';\n\n// Create using constructor\nconst doc1 = new LlmDocument({\n  title: "Company Profile",\n  content: "Our company makes...",\n});\n\n// Create using static text method\nconst doc2 = LlmDocument.text("doc-002", {\n  title: "Product Catalog",\n  content: "Our products...",\n});\n'})}),"\n",(0,c.jsx)(n.h2,{id:"document-collections",children:"Document Collections"}),"\n",(0,c.jsx)(n.p,{children:"Documents can be grouped into collections for better organization and control over how they're presented to the LLM."}),"\n",(0,c.jsx)(n.h3,{id:"basic-collection",children:"Basic Collection"}),"\n",(0,c.jsx)(n.p,{children:"The simplest way to use a collection is to pass an array of documents:"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.text("What products are available?", {\n  documents: [\n    {\n      title: "Product A",\n      content: "Description of product A...",\n    },\n    {\n      title: "Product B",\n      content: "Description of product B...",\n    },\n  ],\n});\n'})}),"\n",(0,c.jsx)(n.h3,{id:"using-llmdocumentcollection",children:"Using LlmDocumentCollection"}),"\n",(0,c.jsxs)(n.p,{children:["For more control over how documents are formatted, use the ",(0,c.jsx)(n.code,{children:"LlmDocumentCollection"})," class:"]}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'import { LlmDocumentCollection } from \'jorel\';\n\nconst collection = new LlmDocumentCollection([\n  {\n    title: "Product A",\n    content: "Description of product A...",\n  },\n  {\n    title: "Product B",\n    content: "Description of product B...",\n  },\n], {\n  documentToText: "xml", // Default format\n});\n'})}),"\n",(0,c.jsx)(n.h3,{id:"document-formatting",children:"Document Formatting"}),"\n",(0,c.jsx)(n.p,{children:"JorEl supports different formats for presenting documents to the LLM:"}),"\n",(0,c.jsx)(n.h4,{id:"xml-format-default",children:"XML Format (Default)"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const collection = new LlmDocumentCollection(documents, {\n  documentToText: "xml",\n});\n\n// Results in:\n// <Documents>\n//   <Document id="doc1" title="Product A">\n//     Description of product A...\n//   </Document>\n//   <Document id="doc2" title="Product B">\n//     Description of product B...\n//   </Document>\n// </Documents>\n'})}),"\n",(0,c.jsx)(n.h4,{id:"json-format",children:"JSON Format"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const collection = new LlmDocumentCollection(documents, {\n  documentToText: "json",\n});\n\n// Results in JSON representation of documents\n'})}),"\n",(0,c.jsx)(n.h4,{id:"custom-format",children:"Custom Format"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const collection = new LlmDocumentCollection(documents, {\n  documentToText: {\n    template: "Document {{id}}: {{title}}\\n{{content}}",\n    separator: "\\n---\\n",\n  },\n});\n\n// Results in:\n// Document 1: Product A\n// Description of product A...\n// ---\n// Document 2: Product B\n// Description of product B...\n'})}),"\n",(0,c.jsx)(n.h2,{id:"advanced-usage",children:"Advanced Usage"}),"\n",(0,c.jsx)(n.h3,{id:"managing-collections",children:"Managing Collections"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const collection = new LlmDocumentCollection();\n\n// Add documents\ncollection.add(new LlmDocument({\n  title: "Product A",\n  content: "Description...",\n}));\n\n// Get document by ID\nconst doc = collection.get("doc-001");\n\n// Remove document\ncollection.remove("doc-001");\n\n// Get all documents\nconst allDocs = collection.all;\n'})}),"\n",(0,c.jsx)(n.h3,{id:"custom-system-messages",children:"Custom System Messages"}),"\n",(0,c.jsx)(n.p,{children:"You can customize how documents are presented in the system message:"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.text("What products are available?", {\n  documents: collection,\n  documentSystemMessage: "Here are some relevant documents to consider: {{documents}}",\n});\n'})}),"\n",(0,c.jsx)(n.h3,{id:"with-tools-and-images",children:"With Tools and Images"}),"\n",(0,c.jsx)(n.p,{children:"Documents can be used alongside other JorEl features:"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:'const response = await jorEl.text(\n  ["What is the price of this product?", image],\n  {\n    documents: [{\n      title: "Price List",\n      content: "Product A: $100\\nProduct B: $200",\n    }],\n    tools: [{\n      name: "format_price",\n      description: "Format price in requested currency",\n      executor: formatPrice,\n      params: z.object({\n        amount: z.number(),\n        currency: z.string(),\n      }),\n    }],\n  }\n);\n'})}),"\n",(0,c.jsx)(n.h3,{id:"serialization",children:"Serialization"}),"\n",(0,c.jsx)(n.p,{children:"Documents and collections can be easily serialized:"}),"\n",(0,c.jsx)(n.pre,{children:(0,c.jsx)(n.code,{className:"language-typescript",children:"// Get document definition\nconst docDef = document.definition;\n\n// Get collection definition\nconst collectionDef = collection.definition;\n\n// Create from JSON\nconst newCollection = LlmDocumentCollection.fromJSON(collectionDef);\n"})})]})}function u(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,c.jsx)(n,{...e,children:(0,c.jsx)(d,{...e})}):d(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>i,x:()=>l});var o=t(6540);const c={},s=o.createContext(c);function i(e){const n=o.useContext(s);return o.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(c):e.components||c:i(e.components),o.createElement(s.Provider,{value:n},e.children)}}}]);