import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "JorEl",
  tagline: "The easiest way to use LLMs - from simple text generation to advanced agent systems",
  favicon: "img/favicon.ico",

  url: "https://christianheine.github.io",
  baseUrl: "/jorel/",

  // GitHub pages deployment config.
  organizationName: "christianheine",
  projectName: "jorel",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // image: "img/social-card.jpg",
    navbar: {
      title: "JorEl",
      // logo: {
      //   alt: "JorEl Logo",
      //   src: "img/logo.svg",
      // },
      items: [
        {
          to: "docs/quick-start",
          position: "left",
          label: "Quick Start",
          activeBasePath: "docs/quick-start",
        },
        {
          to: "docs/intro",
          position: "left",
          label: "Intro",
          activeBasePath: "docs/intro",
        },
        {
          to: "docs/basic-usage/installation",
          position: "left",
          label: "Basic Usage",
          activeBasePath: "docs/basic-usage",
        },
        {
          to: "docs/agents/intro",
          position: "left",
          label: "Agents",
          activeBasePath: "docs/agents",
        },
        {
          href: "https://github.com/christianheine/jorel",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} - Christian Heine`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
