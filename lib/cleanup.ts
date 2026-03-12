export type CleanupTask = {
  id: string;
  title: string;
  instructions: string;
  estimatedMinutes: number;
  rewardPoints: number;
};

export type CleanupPlan = {
  sceneSummary: string;
  encouragement: string;
  cleanImageUrl: string;
  tasks: CleanupTask[];
  isMock: boolean;
};

const FALLBACK_TASKS: CleanupTask[] = [
  {
    id: "1",
    title: "Clear all visible trash",
    instructions:
      "Throw away wrappers, receipts, and disposable items first. Use one bag so this step finishes quickly.",
    estimatedMinutes: 4,
    rewardPoints: 10
  },
  {
    id: "2",
    title: "Group similar items",
    instructions:
      "Create short-lived piles: electronics, papers, stationery, and personal items. Do not organize deeply yet.",
    estimatedMinutes: 6,
    rewardPoints: 15
  },
  {
    id: "3",
    title: "Reset the main surface",
    instructions:
      "Leave only the essentials on your main desk surface. Move everything else to the grouped piles.",
    estimatedMinutes: 7,
    rewardPoints: 20
  },
  {
    id: "4",
    title: "Quick wipe and polish",
    instructions:
      "Wipe the cleared surfaces with a cloth. Start from the back corners and move forward.",
    estimatedMinutes: 5,
    rewardPoints: 15
  },
  {
    id: "5",
    title: "Set a 2-minute maintenance rule",
    instructions:
      "Put one recurring item (like cables or papers) into a dedicated container so daily reset is easy.",
    estimatedMinutes: 2,
    rewardPoints: 10
  }
];

export function getMockPlan(imageDataUrl: string): CleanupPlan {
  return {
    sceneSummary:
      "The space has useful items mixed with temporary clutter. A short staged reset will make it look noticeably cleaner.",
    encouragement:
      "Small wins first. Finish one card at a time and watch your progress bar move.",
    cleanImageUrl: imageDataUrl,
    tasks: FALLBACK_TASKS,
    isMock: true
  };
}

export function normalizeTasks(rawTasks: unknown): CleanupTask[] {
  if (!Array.isArray(rawTasks)) {
    return FALLBACK_TASKS;
  }

  const normalized = rawTasks
    .map((task, index) => {
      if (!task || typeof task !== "object") {
        return null;
      }

      const obj = task as Record<string, unknown>;
      const title =
        typeof obj.title === "string" && obj.title.trim().length > 0
          ? obj.title.trim()
          : `Step ${index + 1}`;

      const instructions =
        typeof obj.instructions === "string" && obj.instructions.trim().length > 0
          ? obj.instructions.trim()
          : "Do this step in one focused burst.";

      const estimatedMinutes =
        typeof obj.estimatedMinutes === "number" && Number.isFinite(obj.estimatedMinutes)
          ? Math.max(1, Math.min(20, Math.round(obj.estimatedMinutes)))
          : 5;

      const rewardPoints =
        typeof obj.rewardPoints === "number" && Number.isFinite(obj.rewardPoints)
          ? Math.max(5, Math.min(50, Math.round(obj.rewardPoints)))
          : Math.max(5, estimatedMinutes * 3);

      return {
        id: String(index + 1),
        title,
        instructions,
        estimatedMinutes,
        rewardPoints
      } satisfies CleanupTask;
    })
    .filter((task): task is CleanupTask => task !== null)
    .slice(0, 8);

  if (normalized.length === 0) {
    return FALLBACK_TASKS;
  }

  return normalized;
}

export function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const asRecord = payload as Record<string, unknown>;

  if (typeof asRecord.output_text === "string") {
    return asRecord.output_text;
  }

  const output = asRecord.output;
  if (!Array.isArray(output)) {
    return "";
  }

  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const piece of content) {
      if (!piece || typeof piece !== "object") {
        continue;
      }

      const maybeText = (piece as Record<string, unknown>).text;
      if (typeof maybeText === "string") {
        parts.push(maybeText);
      }
    }
  }

  return parts.join("\n").trim();
}

export function safeParseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
