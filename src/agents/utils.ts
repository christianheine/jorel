export const validateAgentName = (name: string): string => {
  if (name.length < 3) {
    throw new Error("Agent name must be at least 3 characters long");
  }
  if (name.length > 50) {
    throw new Error("Agent name must not exceed 50 characters");
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error("Agent name must only contain lowercase letters, numbers, and underscores");
  }
  return name;
};

export const validateAgentCoreMessageTemplate = (template: string): string => {
  const _template = template.trim();
  if (_template.length < 1) {
    throw new Error("Agent core message template must not be empty");
  }
  return _template;
};

export const validateAgentDelegateTemplate = (template: string): string => {
  const _template = template.trim();
  if (_template.length < 1) {
    throw new Error("Agent delegate template must not be empty");
  }
  if (!_template.includes("{{name}}")) {
    throw new Error("Agent delegate template must include the {{name}} placeholder");
  }
  if (!_template.includes("{{description}}")) {
    throw new Error("Agent delegate template must include the {{description}} placeholder");
  }
  return _template;
};
