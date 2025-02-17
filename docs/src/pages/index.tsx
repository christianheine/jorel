import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--secondary", styles.heroBanner)}>
      <div className="container">
        <img src="./img/logo.svg" alt="JorEl Logo" className={styles.heroLogo} />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/quick-start">
            Quick start
          </Link>
        </div>
      </div>
    </header>
  );
}

function CodeExample({ title, description, code }) {
  return (
    <div className={styles.codeExample}>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
      <div className={styles.codeBlock}>
        <pre>
          <code className="language-typescript">{code}</code>
        </pre>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  const examples = [
    {
      title: "Simple Text Generation",
      description: "Generate text or json responses with just a few lines of code.",
      code: `import { JorEl } from 'jorel';

const jorEl = new JorEl({ openAI: true });

const response = await jorEl.text(
  "What are the three laws of robotics?"
);`,
    },
    {
      title: "Vision Capabilities",
      description: "Easily work with images in prompts.",
      code: `import { JorEl, ImageContent } from 'jorel';

const jorEl = new JorEl({ openAI: true });

// Load image from file or URL
const image = await ImageContent.fromFile("./photo.jpg");

const response = await jorEl.text([
  "What's in this image?", image
]);`,
    },
    {
      title: "Tool Integration",
      description: "Give your LLMs the ability to perform actions.",
      code: `import { JorEl } from 'jorel';
import { z } from 'zod';

const jorEl = new JorEl({ openAI: true });

const response = await jorEl.text(
  "Send a message to the team that JorEl was released",
  {
    tools: [{
      name: "send_slack_message",
      description: "Send a message to a Slack channel",
      params: z.object({
        channel: z.string(),
        message: z.string()
      }),
      executor: sendSlackMessage
    }]
  }
);`,
    },
    {
      title: "Intelligent Agents",
      description: "Create agents that can collaborate and delegate tasks.",
      code: `import { JorEl } from 'jorel';
import { z } from 'zod';

const jorEl = new JorEl({ openAI: true });

// Register tools
jorEl.team.addTools([
  {
    name: "search_docs",
    description: "Search for documentation",
    executor: searchDocs,
    params: z.object({
      query: z.string()
    }),
  },
]);

// Create main coordinator agent
const coordinator = jorEl.team.addAgent({
  name: "coordinator",
  description: "Coordinates between user and specialist agents",
  systemMessage: "You coordinate requests between users and specialists"
});

// Add specialist agents
coordinator.addDelegate({
  name: "researcher",
  description: "Researches technical topics in detail and returns a summary",
  tools: ["search_docs"]
});

// Create and execute a task
const task = await jorEl.team.createTask(
  "What are the latest news about JorEl?"
);

const result = await jorEl.team.executeTask(task, {
  limits: {
    maxIterations: 10,
    maxDelegations: 3
  }
});

// Coordinator will delegate as needed`,
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {examples.map((example, idx) => (
            <div key={idx} className={clsx("col col--6")}>
              <CodeExample {...example} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description="The easiest way to use LLMs - from simple text generation to advanced agent systems">
      <HomepageHeader />
      <main className="container">
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
