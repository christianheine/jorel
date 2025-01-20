---
sidebar_position: 1
---

# Installing JorEl

## Installation

Install JorEl using npm:

```bash
npm install jorel
```

Or using yarn:

```bash
yarn add jorel
```


## Import

You can then import JorEl in your project like this:

```typescript
import {JorEl} from "jorel";

const jorel = new JorEl({/* Configuration options */});
```

Usually, this is the only import you need to make, but there are additional classes (e.g. for documents, tools, etc.) that might be useful for more advanced use-cases.

JorEl is fully written in TypeScript, so it ships with its own type definitions.

## License

JorEl is licensed under the MIT License. You can find the full license text in the [LICENSE](https://github.com/christianheine/jorel/blob/master/LICENSE) file.