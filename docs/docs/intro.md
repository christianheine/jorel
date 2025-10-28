---
sidebar_position: 2
---

# Introduction

While generating basic responses with the available LLM provider libraries is usually very straightforward, 
things can quickly become more involved once you want to be able to easily switch between models of different providers, 
or if you want to give the LLM access to tools or grounding documents. And once you start considering agents, 
you're usually left with either limited setups (e.g. OpenAI's Swarm) or very complicated frameworks (e.g., LangChain).

JorEl aims to abstract away this complexity, for both use-cases, like generating a response from an LLM as either text or JSON, or setting up a task for one or more agents.

There are three aspects to JorEl:

1. The top layer is the JorEl class, which is what you'll usually interact with. It provides simple methods to generate text, JSON or streams of text. It also supports tools and grounding documents,
   so it should already be sufficient for many agent-like use-cases.
2. The next layer is JorEl's core layer, where is manages providers and models, and also the core methods to generate responses. Here you still pass arrays of messages, but all in a unified message
   format. Even this layer is usually not interacted with directly, as the top layer abstracts it away.
3. At the lowest level is the provider layer. Providers essentially map each LLM providers unique message structure and API into a unified one. Usually, you won't have to interact with this layer
   directly, but it's there if you need it (e.g. to register custom providers that JorEl doesn't support yet).

The best starting point are probably the `text` , `json` and `stream` methods, which are the easiest ways to generate responses. The [Quick Start](/docs/quick-start) guide will show you how to use these
methods.

For more advanced task setups, you can use the `team` methods like `team.addAgent` or `team.createTask` , which allow you to specify tasks for agents and delegates. Each agent can have its own tools
and grounding documents, and you can also specify other agents that they can transfer the conversation to, or that they can delegate sub-tasks to.
