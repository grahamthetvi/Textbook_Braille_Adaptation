/** Dispatch a batch transcription to Gemini, Claude, OpenAI, or Ollama. */

import { transcribeBatch as transcribeAnthropic } from "./anthropic.js";
import { transcribeBatch as transcribeGemini } from "./gemini.js";
import { DEFAULT_MODEL, OLLAMA_SENTINEL, providerForModel } from "./models.js";
import { DEFAULT_OLLAMA_MODEL, transcribeBatch as transcribeOllama } from "./ollama.js";
import { transcribeBatch as transcribeOpenAI } from "./openai.js";

export async function transcribeBatch(options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const provider = options.provider || providerForModel(model);
  if (provider === "anthropic") {
    return transcribeAnthropic(options);
  }
  if (provider === "openai") {
    return transcribeOpenAI(options);
  }
  if (provider === "ollama") {
    const ollamaModel =
      options.ollamaModel || (model === OLLAMA_SENTINEL ? DEFAULT_OLLAMA_MODEL : model);
    return transcribeOllama({
      ...options,
      model: ollamaModel,
    });
  }
  return transcribeGemini(options);
}
