import Anthropic from "@anthropic-ai/sdk";
import { config } from "../common/config";
import { DEFAULT_MODEL } from "./claude-scorer";

let cached: Anthropic | null | undefined;

/** Anahtar tanımlıysa paylaşılan Claude istemcisi, değilse null (yerel yöntemler devreye girer). */
export function anthropic() {
  if (cached === undefined) cached = config().ANTHROPIC_API_KEY ? new Anthropic({ apiKey: config().ANTHROPIC_API_KEY, maxRetries: 2 }) : null;
  return cached;
}

export function aiModel() {
  return config().ANTHROPIC_MODEL || DEFAULT_MODEL;
}
