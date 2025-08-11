#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmDocument } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Load documents from local documentation files
  const jorElIntro = await LlmDocument.fromFile("../../docs/docs/intro.md");
  const jorElQuickStart = await LlmDocument.fromFile("../../docs/docs/quick-start.md");

  // Generate the response
  const { response, meta } = await jorEl.text(
    "Write a high-level social media marketing approach for making JorEl known to other developers",
    {
      model: "o3-mini",
      documents: [jorElIntro, jorElQuickStart],
    },
    true, // Include metadata
  );

  console.log(response);
  // Below is a high-level social media marketing approach designed to introduce JorEl—your unified interface for
  // multiple LLM providers—to the developer community:
  //
  // 1. Define Your Messaging and Value Proposition
  //  - Emphasize the unique value of JorEl: a streamlined API that abstracts model and provider complexity,
  //    letting developers quickly switch between various LLMs and integrate tools, documents, and agents.
  //  - Highlight practical benefits (e.g., rapid prototyping, simplified integrations) and use cases,
  //    such as generating text, JSON responses, and working with agents and tools.
  //  - Clearly articulate “JorEl saves you time and removes headache points that arise when juggling
  //    multiple language model providers.”
  //
  // 2. Create Developer-Centric Content
  //  - Blog Posts & Technical Articles: Publish posts that explain how to install, configure, and use JorEl.
  //    Use code snippets and examples (as seen in the quick start and intro documents)
  //    to illustrate real-world applications.
  //  - Video Tutorials & Webinars: Develop short tutorial videos or live sessions demonstrating setup,
  //    using the text/json/stream methods, and integrating with agent workflows.
  //  - Case Studies and Demos: Share use cases that highlight how JorEl can simplify complex projects—such
  //    as handling multiple provider APIs or delegating tasks among agents.
  //
  // 3. Build a Content Calendar for Social Platforms
  //  - Twitter & LinkedIn:
  //   - Post regular short tips, code snippets, and success stories.
  //   - Use engaging threads to tell the story behind JorEl’s problem-solving benefits.
  //   - Leverage hashtags like #LLM, #MachineLearning, #APIDevelopment, and #DeveloperTools.
  //  - Developer Communities (Reddit, Dev.to, Hacker News):
  //   - Share article links, tutorials, and demo videos in relevant subreddits
  //     (e.g., r/MachineLearning, r/javascript) and community forums.
  //   - Engage in discussions about rapid development and integration challenges, positioning JorEl as a solution.
  //
  // 4. Engage with Influencers and Key Communities
  //  - Collaborate with developer influencers, content creators, and tech bloggers who specialize in AI,
  //    chatbot development, or API integrations.
  //  - Sponsor or participate in virtual meetups, hackathons, and conferences where you could demo JorEl’s
  //    capabilities—focusing on both the technical and the productivity-moving aspects.
  //  - Participate in and contribute to open source projects and developer forums where discussions
  //    of language models are active.
  //
  // 5. Leverage Developer-Focused Platforms and Repositories
  //  - Showcase JorEl on GitHub: maintain a well-documented repository with clear instructions,
  //    examples (like the quick start guide), and a roadmap.
  //  - Create a dedicated developer landing page that includes code examples, integration guides,
  //    and links to further tutorials and documentation.
  //  - Engage on platforms like StackOverflow or Discord/Slack developer communities by answering
  //    questions and providing expert guidance relating to the LLM ecosystem.
  //
  // 6. Monitor, Engage, and Iterate
  //  - Track social media metrics (engagement, shares, clicks) to gauge which messages resonate most.
  //  - Solicit feedback from early adopters by hosting live Q&A sessions or surveys to refine messaging.
  //  - Adjust your approach based on community feedback and usage trends to improve future campaigns.
  //
  // By combining clear, technically focused messaging with engaging content and active community participation,
  // you can build awareness and credibility for JorEl among developers.
  // This approach not only spreads the word but also drives adoption by demonstrating
  // how JorEl simplifies complex tasks in today’s multi-provider LLM landscape.

  console.log(meta);
  // {
  //  model: 'o3-mini',
  //  provider: 'openai',
  //  durationMs: 56589,
  //  inputTokens: 2660,
  //  outputTokens: 1129
  // }
};

void main();
