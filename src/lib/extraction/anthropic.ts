import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import type { Extraction } from "@/lib/types";
import {
  extractionWithConfidenceSchema,
  flattenConfidence,
} from "@/lib/extraction/schema";
import { SYSTEM_PROMPT } from "@/lib/extraction/prompt";

function fileContentBlock(mimeType: string, bytes: Buffer) {
  const data = bytes.toString("base64");
  if (mimeType === "application/pdf") {
    return {
      type: "document" as const,
      source: { type: "base64" as const, media_type: "application/pdf" as const, data },
    };
  }
  return {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: mimeType as "image/png" | "image/jpeg" | "image/webp",
      data,
    },
  };
}

export interface AnthropicExtraction {
  data: Extraction;
  confidence: Record<string, number>;
}

export async function anthropicExtraction(
  mimeType: string,
  bytes: Buffer,
  model: string,
): Promise<AnthropicExtraction> {
  const client = new Anthropic();

  const message = await client.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          fileContentBlock(mimeType, bytes),
          { type: "text", text: "Extract this invoice into the required schema." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(extractionWithConfidenceSchema) },
  });

  if (!message.parsed_output) {
    throw new Error(
      `Extraction returned no parseable output (stop_reason: ${message.stop_reason})`,
    );
  }

  const { data, confidence } = message.parsed_output;
  return { data, confidence: flattenConfidence(confidence) };
}
