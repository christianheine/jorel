#!/usr/bin/env ts-node

import { readdirSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";

const buildContext = (base: string, include: (string | RegExp)[], exclude: (string | RegExp)[]) => {
  const tree: string[] = [];
  const contents: string[] = [];
  const excludedTree: {
    folder: string;
    files: number;
    folders: number;
  }[] = [];

  const walk = (dir: string) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name),
        rel = path.relative(base, p);
      if (d.isDirectory()) {
        if (!exclude.some((x) => (typeof x === "string" ? rel.includes(x) : x.test(rel)))) {
          tree.push(rel);
          walk(p);
        } else {
          const contents = readdirSync(p, { withFileTypes: true });
          excludedTree.push({
            folder: rel,
            files: contents.filter((x) => x.isFile()).length,
            folders: contents.filter((x) => x.isDirectory()).length,
          });
        }
      } else {
        if (include.some((x) => (typeof x === "string" ? d.name.endsWith(x) : x.test(d.name)))) {
          tree.push(rel);
          contents.push(`${rel}\n\`\`\`\n${readFileSync(p, "utf8")}\n\`\`\``);
        }
      }
    }
  };

  walk(base);

  return { tree, contents, excludedTree };
};

const folder = "src";
const includedFileTypes = [".ts"];
const excludedFolders = [
  "__tests__",
  "shared",
  "open-ai",
  "grok",
  "groq",
  "ollama",
  "anthropic",
  "google-vertex-ai",
  "media/utils",
];

console.log(`Building context for ${folder} with included file types ${includedFileTypes.join(", ")} and excluded folders ${excludedFolders.join(", ")}`);

const { tree, contents, excludedTree } = buildContext(folder, includedFileTypes, excludedFolders);

const context = `
# JorlEl codebase

## Folder Structure folder

/${folder}
${tree
  .map((x) => {
    const parts = x.split("/");
    const isFile = x.includes(".");
    return `${"  ".repeat(parts.length - 1)}- ${isFile ? "" : "/"}${parts[parts.length - 1]}`;
  })
  .join("\n")}
  
## Excluded folders
${excludedTree.map((x) => ` - ${x.folder} (Files: ${x.files}, folders: ${x.folders})`).join("\n")}

## Source code

${contents.join("\n\n")}
`;

const outFile = "source-code-context.md";

writeFileSync(outFile, context);

const numberOfLines = context.split("\n").length;

console.log(`Context written to ${outFile} (${numberOfLines} lines, ${context.length} characters)`);

console.log(`Total folders in scope: ${tree.length}`);
console.log(`Total files in scope: ${contents.length}`);
console.log(`Excluded folders: ${excludedTree.length}`);
