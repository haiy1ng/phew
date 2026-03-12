import { NextRequest, NextResponse } from "next/server";
import {
  extractOutputText,
  getMockPlan,
  normalizeTasks,
  safeParseJsonObject,
  type CleanupPlan
} from "@/lib/cleanup";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const REASONING_MODEL = "gpt-4.1-mini";
const IMAGE_MODEL = "gpt-image-1";

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // Ignore parsing errors and use status text.
  }

  return `${response.status} ${response.statusText}`;
}

async function generateStructuredPlan(apiKey: string, imageDataUrl: string, focus: string) {
  const prompt = [
    "You are a practical home organization coach.",
    "Analyze the messy space image and create a manageable cleanup plan.",
    `The user selected focus type: ${focus}.`,
    "Return only JSON in this exact shape:",
    "{",
    '  "sceneSummary": "string",',
    '  "encouragement": "string",',
    '  "tasks": [',
    "    {",
    '      "title": "string",',
    '      "instructions": "string",',
    '      "estimatedMinutes": 1,',
    '      "rewardPoints": 5',
    "    }",
    "  ]",
    "}",
    "Task rules:",
    "- Create 5 to 8 tasks.",
    "- Each task should be one focused action and take 2 to 15 minutes.",
    "- Start with easiest visible wins, then move to deeper organization.",
    "- Keep instructions concrete and calming.",
    "- Reward points should scale with effort from 5 to 40."
  ].join("\n");

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: REASONING_MODEL,
      temperature: 0.3,
      max_output_tokens: 900,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Plan generation failed: ${await parseErrorMessage(response)}`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractOutputText(payload);
  const parsed = safeParseJsonObject(text);

  if (!parsed) {
    throw new Error("Could not parse AI cleanup plan response.");
  }

  return parsed;
}

async function generateCleanImage(apiKey: string, sceneSummary: string, focus: string): Promise<string> {
  const prompt = [
    "Create a photorealistic after-cleaning image of the same space from a similar camera angle.",
    "Keep the room type and core furniture layout consistent.",
    "Show neat, realistic organization and an uncluttered look.",
    `Space type: ${focus}.`,
    `Scene details to preserve: ${sceneSummary}`
  ].join(" ");

  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024"
    })
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${await parseErrorMessage(response)}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
  };

  const item = payload.data?.[0];
  if (!item) {
    throw new Error("Image generation returned empty output.");
  }

  if (typeof item.url === "string" && item.url.trim().length > 0) {
    return item.url;
  }

  if (typeof item.b64_json === "string" && item.b64_json.trim().length > 0) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  throw new Error("Image generation output format is not supported.");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    imageDataUrl?: string;
    focus?: string;
  };

  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const focus = typeof body.focus === "string" ? body.focus : "other";

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Invalid image. Please upload a valid photo file." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(getMockPlan(imageDataUrl));
  }

  try {
    const parsedPlan = await generateStructuredPlan(apiKey, imageDataUrl, focus);

    const sceneSummary =
      typeof parsedPlan.sceneSummary === "string" && parsedPlan.sceneSummary.trim().length > 0
        ? parsedPlan.sceneSummary.trim()
        : "The space can look cleaner quickly with a staged reset.";

    const encouragement =
      typeof parsedPlan.encouragement === "string" && parsedPlan.encouragement.trim().length > 0
        ? parsedPlan.encouragement.trim()
        : "Complete one small card at a time. Momentum beats perfection.";

    const tasks = normalizeTasks(parsedPlan.tasks);

    let cleanImageUrl = imageDataUrl;
    let isMock = false;

    try {
      cleanImageUrl = await generateCleanImage(apiKey, sceneSummary, focus);
    } catch {
      isMock = true;
    }

    const response: CleanupPlan = {
      sceneSummary,
      encouragement,
      cleanImageUrl,
      tasks,
      isMock
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("cleanup-plan-error", error);
    return NextResponse.json(getMockPlan(imageDataUrl));
  }
}
