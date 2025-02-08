import { validateAgentCoreMessageTemplate, validateAgentDelegateTemplate, validateAgentName } from "./utils";
import { CreateLlmDocument, LlmDocument, LlmDocumentCollection, LlmTool } from "../index";
import { Nullable } from "../shared";
import { JorElAgentManager } from "../jorel/jorel.team";

/**
 * Agent-specific error
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentName: string,
  ) {
    super(`Agent ${agentName}: ${message}`);
  }
}

export interface LlmAgentDefinition {
  name: string;
  description: string;
  systemMessageTemplate: string;
  delegateTemplate?: string;
  documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection;
  model?: string;
  allowedTools?: string[];
  canDelegateTo?: string[];
  canTransferTo?: string[];
  responseType?: "text" | "json";
  temperature?: number;
}

/**
 * Represents an agent that can process requests, consider documents,
 * delegate to other agents, and use tools.
 */
export class LlmAgent {
  public readonly name: string;
  public description: string;
  public model: Nullable<string>;
  public systemMessageTemplate: string;
  public delegateTemplate: string;
  public documents: LlmDocumentCollection;
  public responseType: "text" | "json";
  public temperature: number;
  /** @internal */
  private readonly _allowedTools: Set<string>;
  /** @internal */
  private readonly _allowedDelegateAgentNames: Set<string>;
  /** @internal */
  private readonly _allowedTransferAgentsNames: Set<string>;
  /** @internal */
  private readonly jorEl: JorElAgentManager;

  /**
   * Creates a new LLM Agent
   * @param agentDefinition - The configuration for this agent
   * @param jorEl - The agent manager instance
   * @throws {AgentError} If the agent configuration is invalid
   */
  constructor(agentDefinition: LlmAgentDefinition, jorEl: JorElAgentManager) {
    if (!agentDefinition) throw new Error("Agent definition is required");
    if (!jorEl) throw new Error("JorElAgentManager instance is required");

    this.name = validateAgentName(agentDefinition.name);
    this.description = agentDefinition.description;
    this.model = agentDefinition.model ?? null;
    this.systemMessageTemplate = validateAgentCoreMessageTemplate(agentDefinition.systemMessageTemplate);
    this.documents =
      agentDefinition.documents instanceof LlmDocumentCollection
        ? agentDefinition.documents
        : new LlmDocumentCollection(agentDefinition.documents);
    this._allowedTools = agentDefinition.allowedTools ? new Set(agentDefinition.allowedTools) : new Set();
    this._allowedDelegateAgentNames = agentDefinition.canDelegateTo
      ? new Set(agentDefinition.canDelegateTo)
      : new Set();
    this._allowedTransferAgentsNames = agentDefinition.canTransferTo
      ? new Set(agentDefinition.canTransferTo)
      : new Set();
    this.delegateTemplate = agentDefinition.delegateTemplate
      ? validateAgentDelegateTemplate(agentDefinition.delegateTemplate)
      : `<Agent name="{{name}}">{{description}}</Agent>`;
    this.responseType = agentDefinition.responseType ?? "text";
    this.temperature = agentDefinition.temperature ?? 0;
    this.jorEl = jorEl;
  }

  /**
   * Get the list of tools that this agent can use
   */
  get allowedToolNames(): string[] {
    return Array.from(this._allowedTools);
  }

  /**
   * Get the list of agent names that this agent can delegate to
   */
  get allowedDelegateNames(): string[] {
    return Array.from(this._allowedDelegateAgentNames);
  }

  /**
   * Get the list of agent names that this agent can transfer to
   */
  get allowedTransferAgentNames(): string[] {
    return Array.from(this._allowedTransferAgentsNames);
  }

  /**
   * Get the list of tools that this agent can use
   */
  get availableTools(): LlmTool[] {
    return this.allowedToolNames.map((toolName) => {
      const tool = this.jorEl.tools.getTool(toolName);
      if (!tool) {
        throw new AgentError(`Tool with name ${toolName} does not exist`, this.name);
      }
      return tool;
    });
  }

  /**
   * Get the list of delegates that this agent can delegate to
   */
  get availableDelegateAgents(): LlmAgent[] {
    return this.allowedDelegateNames.map((agentName) => {
      const delegate = this.jorEl.getAgent(agentName);
      if (!delegate) {
        throw new AgentError(`Delegate agent with name ${agentName} does not exist`, this.name);
      }
      return delegate;
    });
  }

  /**
   * Get the list of transfer agents that this agent can transfer to
   */
  get availableTransferAgents(): LlmAgent[] {
    return this.allowedTransferAgentNames.map((agentName) => {
      const transferAgent = this.jorEl.getAgent(agentName);
      if (!transferAgent) {
        throw new AgentError(`Transfer agent with name ${agentName} does not exist`, this.name);
      }
      return transferAgent;
    });
  }

  /**
   * Get the agent definition
   */
  get definition(): LlmAgentDefinition {
    return {
      name: this.name,
      description: this.description,
      model: this.model ?? undefined,
      systemMessageTemplate: this.systemMessageTemplate,
      delegateTemplate: this.delegateTemplate,
      allowedTools: this._allowedTools.size > 0 ? Array.from(this._allowedTools) : undefined,
      canDelegateTo: this._allowedDelegateAgentNames.size > 0 ? Array.from(this._allowedDelegateAgentNames) : undefined,
      canTransferTo:
        this._allowedTransferAgentsNames.size > 0 ? Array.from(this._allowedTransferAgentsNames) : undefined,
    };
  }

  /**
   * Get the system message for this agent with the delegates and documents filled in
   */
  get systemMessage(): string {
    return this.systemMessageTemplate
      .replace(
        "{{delegates}}",
        this.availableDelegateAgents.map((agent) => agent.systemMessageRepresentation).join("\n"),
      )
      .replace("{{documents}}", this.documents.systemMessageRepresentation);
  }

  /**
   * Representation of this agent to be used in other agents' system messages
   */
  get systemMessageRepresentation(): string {
    return this.delegateTemplate.replace("{{name}}", this.name).replace("{{description}}", this.description);
  }

  /**
   * Get a delegate agent by name
   * @param agentName
   * @param type
   */
  getDelegate(agentName: string, type: "delegate" | "transfer" = "delegate"): LlmAgent {
    this.validateDelegation(agentName, type);
    const agent = this.jorEl.getAgent(agentName);
    if (!agent) {
      throw new AgentError(`Unable to find ${type} agent with name ${agentName}`, this.name);
    }
    return agent;
  }

  /**
   * Add an agent that this agent can delegate to
   * @param agent
   * @param type
   */
  addDelegate(agent: LlmAgent | LlmAgentDefinition | string, type: "delegate" | "transfer" = "delegate"): LlmAgent {
    const agentName = typeof agent === "string" ? agent : agent.name;
    if (this.name === agentName) throw new Error("An agent cannot delegate to itself");
    let registeredAgent = this.jorEl.getAgent(agentName);
    if (!registeredAgent) {
      if (typeof agent === "string") {
        throw new AgentError(`Unable to add delegate. Agent with name ${agentName} does not exist`, this.name);
      }
      registeredAgent = this.jorEl.addAgent(agent);
    }
    if (type === "delegate") {
      if (registeredAgent.allowedDelegateNames.includes(this.name)) {
        // Currently only checks for direct circular delegation
        throw new Error(`Circular delegation detected between ${this.name} and ${registeredAgent.name}`);
      }
      if (!this._allowedDelegateAgentNames.has(agentName)) {
        this._allowedDelegateAgentNames.add(agentName);
      }
    }
    if (type === "transfer") {
      if (!this._allowedTransferAgentsNames.has(agentName)) {
        this._allowedTransferAgentsNames.add(agentName);
      }
    }
    return registeredAgent;
  }

  /**
   * Remove an agent from the list of agents that this agent can delegate to
   * @param agent
   */
  removeDelegate(agent: LlmAgent | string): void {
    const agentName = typeof agent === "string" ? agent : agent.name;
    if (this._allowedDelegateAgentNames.has(agentName)) {
      this._allowedDelegateAgentNames.delete(agentName);
    }
  }

  /**
   * Add a tool that this agent can use. If the tool does not exist, it will be registered
   * @param tool
   */
  addToolAccess(tool: LlmTool | string): void {
    const toolName = typeof tool === "string" ? tool : tool.name;
    if (!this.jorEl.tools.getTool(toolName)) {
      if (typeof tool === "string") {
        throw new AgentError(`Unable to add tool. Tool with name ${toolName} does not exist`, this.name);
      }
      this.jorEl.tools.registerTool(tool);
    }
    if (!this._allowedTools.has(toolName)) {
      this._allowedTools.add(toolName);
    }
  }

  /**
   * Remove a tool from the list of tools that this agent can use
   * @param tool
   */
  removeToolAccess(tool: LlmTool | string): void {
    const toolName = typeof tool === "string" ? tool : tool.name;
    if (this._allowedTools.has(toolName)) {
      this._allowedTools.delete(toolName);
    }
  }

  /**
   * Set this agent as the default agent for the team
   */
  setAsDefault(): void {
    this.jorEl.defaultAgentId = this.name;
  }

  /**
   * Validate that the agent can delegate to the target agent
   * @param targetAgentName
   * @param type
   * @throws {AgentError} If the target agent name is empty, the agent is trying to delegate to itself, or the agent is not allowed to delegate to the target agent
   * @internal
   */
  private validateDelegation(targetAgentName: string, type: "delegate" | "transfer"): void {
    if (!targetAgentName) {
      throw new AgentError("target agent name cannot be empty", this.name);
    }

    if (targetAgentName === this.name) {
      throw new AgentError(`cannot ${type} to itself`, this.name);
    }

    const allowed = type === "delegate" ? this._allowedDelegateAgentNames : this._allowedTransferAgentsNames;

    if (!allowed.has(targetAgentName)) {
      throw new AgentError(`not allowed to ${type} to ${targetAgentName}`, this.name);
    }
  }
}
