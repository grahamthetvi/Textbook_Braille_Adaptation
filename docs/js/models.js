/** Model catalog, providers, and effort defaults for the web adapter. */

export const DEFAULT_MODEL = "gemini-3.8-flash";
export const CUSTOM_MODEL_VALUE = "__custom__";
export const OLLAMA_SENTINEL = "__ollama__";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const MAX_OUTPUT_TOKENS = 16384;

export const PROVIDERS = {
  gemini: {
    id: "gemini",
    effortValues: ["low", "medium", "high"],
    recommendedEffort: "medium",
  },
  anthropic: {
    id: "anthropic",
    effortValues: ["low", "medium", "high", "xhigh", "max"],
    recommendedEffort: "medium",
  },
  openai: {
    id: "openai",
    effortValues: ["none", "low", "medium", "high", "xhigh", "max"],
    recommendedEffort: "low",
  },
  ollama: {
    id: "ollama",
    effortValues: ["off", "on"],
    recommendedEffort: "off",
  },
};

export const MODEL_GROUPS = [
  {
    provider: "gemini",
    labelKey: "models.groupGemini",
    models: [
      { value: "gemini-3.8-flash", labelKey: "gemini.modelFlash38" },
      { value: "gemini-3.1-pro-preview", labelKey: "gemini.model31Pro" },
    ],
  },
  {
    provider: "anthropic",
    labelKey: "models.groupClaude",
    models: [
      { value: "claude-sonnet-5", labelKey: "claude.modelSonnet5" },
      { value: "claude-opus-5", labelKey: "claude.modelOpus5" },
    ],
  },
  {
    provider: "openai",
    labelKey: "models.groupOpenAI",
    models: [
      { value: "gpt-5.6-luna", labelKey: "openai.modelLuna" },
      { value: "gpt-5.6-terra", labelKey: "openai.modelTerra" },
      { value: "gpt-5.6-sol", labelKey: "openai.modelSol" },
    ],
  },
  {
    provider: "ollama",
    labelKey: "models.groupOllama",
    models: [{ value: OLLAMA_SENTINEL, labelKey: "ollama.localVision" }],
  },
];

const MODEL_PROVIDER = new Map();
for (const group of MODEL_GROUPS) {
  for (const model of group.models) {
    MODEL_PROVIDER.set(model.value, group.provider);
  }
}

export function providerForModel(model) {
  const id = String(model || "").trim();
  if (!id || id === CUSTOM_MODEL_VALUE) {
    return "gemini";
  }
  if (id === OLLAMA_SENTINEL) {
    return "ollama";
  }
  const mapped = MODEL_PROVIDER.get(id);
  if (mapped) {
    return mapped;
  }
  if (id.startsWith("claude-")) {
    return "anthropic";
  }
  if (id.startsWith("gpt-")) {
    return "openai";
  }
  return "gemini";
}

export function effortSpec(provider) {
  return PROVIDERS[provider] || PROVIDERS.gemini;
}

export function recommendedEffort(provider) {
  return effortSpec(provider).recommendedEffort;
}

export function isValidEffort(provider, effort) {
  return effortSpec(provider).effortValues.includes(String(effort || "").trim());
}

/** Keep the current effort when it is still valid for the next provider; otherwise use that provider's recommendation. */
export function effortAfterProviderChange(nextProvider, currentEffort) {
  if (isValidEffort(nextProvider, currentEffort)) {
    return String(currentEffort).trim();
  }
  return recommendedEffort(nextProvider);
}

export function normalizeEffort(provider, effort) {
  if (isValidEffort(provider, effort)) {
    return String(effort).trim();
  }
  return recommendedEffort(provider);
}
