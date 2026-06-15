import type { Extraction } from "@/lib/types";
import { anthropicExtraction } from "@/lib/extraction/anthropic";
import { openaiExtraction } from "@/lib/extraction/openai";
import { mockConfidence, mockExtraction } from "@/lib/extraction/mock";

export interface ExtractionResult {
  data: Extraction;
  modelName: string;
  confidence?: Record<string, number>;
}

type Provider = "anthropic" | "openai" | "mock";

function resolveProvider(): { provider: Provider; model: string } {
  const explicit = process.env.EXTRACTION_PROVIDER?.toLowerCase();
  let provider: Provider;
  if (explicit === "anthropic" || explicit === "openai" || explicit === "mock") {
    provider = explicit;
  } else if (process.env.ANTHROPIC_API_KEY) {
    provider = "anthropic";
  } else if (process.env.OPENAI_API_KEY) {
    provider = "openai";
  } else {
    provider = "mock";
  }

  const defaultModel = provider === "openai" ? "gpt-4o" : "claude-opus-4-8";
  const model = process.env.EXTRACTION_MODEL || defaultModel;
  return { provider, model };
}

export async function extractInvoice(
  mimeType: string,
  bytes: Buffer,
): Promise<ExtractionResult> {
  const { provider, model } = resolveProvider();

  if (provider === "mock") {
    return { data: mockExtraction(), modelName: "mock", confidence: mockConfidence() };
  }

  const { data, confidence } =
    provider === "openai"
      ? await openaiExtraction(mimeType, bytes, model)
      : await anthropicExtraction(mimeType, bytes, model);

  return { data, confidence, modelName: model };
}
