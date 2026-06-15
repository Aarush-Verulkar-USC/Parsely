import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { Extraction } from "@/lib/types";
import {
  extractionWithConfidenceSchema,
  flattenConfidence,
} from "@/lib/extraction/schema";
import { SYSTEM_PROMPT } from "@/lib/extraction/prompt";

export interface OpenAIExtraction {
  data: Extraction;
  confidence: Record<string, number>;
}

function fileContentBlock(mimeType: string, bytes: Buffer) {
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  if (mimeType === "application/pdf") {
    return { type: "input_file" as const, filename: "invoice.pdf", file_data: dataUrl };
  }
  return { type: "input_image" as const, image_url: dataUrl, detail: "auto" as const };
}

export async function openaiExtraction(
  mimeType: string,
  bytes: Buffer,
  model: string,
): Promise<OpenAIExtraction> {
  const client = new OpenAI();

  const response = await client.responses.parse({
    model,
    instructions: SYSTEM_PROMPT,
    max_output_tokens: 16000,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Extract this invoice into the required schema." },
          fileContentBlock(mimeType, bytes),
        ],
      },
    ],
    text: { format: zodTextFormat(extractionWithConfidenceSchema, "extraction") },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error(
      `Extraction returned no parseable output (status: ${response.status})`,
    );
  }

  return { data: parsed.data, confidence: flattenConfidence(parsed.confidence) };
}
