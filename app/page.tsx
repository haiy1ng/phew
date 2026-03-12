"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { CleanupPlan, CleanupTask } from "@/lib/cleanup";

type TaskWithProgress = CleanupTask & { done: boolean };

const FOCUS_OPTIONS = [
  { value: "desk", label: "Desk / Work setup" },
  { value: "bedroom", label: "Bedroom corner" },
  { value: "kitchen", label: "Kitchen counter" },
  { value: "living-room", label: "Living room" },
  { value: "other", label: "Other" }
];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image."));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to process image."));
    reader.readAsDataURL(file);
  });
}

function formatMinutes(value: number): string {
  return `${value} min`;
}

function isCleanupPlan(value: unknown): value is CleanupPlan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.sceneSummary === "string" &&
    typeof obj.encouragement === "string" &&
    typeof obj.cleanImageUrl === "string" &&
    typeof obj.isMock === "boolean" &&
    Array.isArray(obj.tasks)
  );
}

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [focus, setFocus] = useState("desk");
  const [beforeImageUrl, setBeforeImageUrl] = useState("");
  const [planMeta, setPlanMeta] = useState<Omit<CleanupPlan, "tasks"> | null>(null);
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const completed = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const earnedPoints = useMemo(
    () => tasks.filter((task) => task.done).reduce((sum, task) => sum + task.rewardPoints, 0),
    [tasks]
  );
  const totalPoints = useMemo(
    () => tasks.reduce((sum, task) => sum + task.rewardPoints, 0),
    [tasks]
  );

  const handleGenerate = async () => {
    if (!selectedFile) {
      setErrorMessage("Upload a photo first.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const imageDataUrl = await fileToDataUrl(selectedFile);
      setBeforeImageUrl(imageDataUrl);

      const response = await fetch("/api/cleanup-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageDataUrl, focus })
      });

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Could not generate plan.";
        throw new Error(message);
      }

      if (!isCleanupPlan(payload)) {
        throw new Error("AI response format was invalid.");
      }

      setPlanMeta({
        sceneSummary: payload.sceneSummary,
        encouragement: payload.encouragement,
        cleanImageUrl: payload.cleanImageUrl,
        isMock: payload.isMock
      });

      setTasks(payload.tasks.map((task) => ({ ...task, done: false })));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              done: !task.done
            }
          : task
      )
    );
  };

  return (
    <main>
      <section className="hero">
        <span className="badge">MVP · Motivation-first</span>
        <h1>Turn mess into a step-by-step cleanup game.</h1>
        <p>
          Upload one photo, see your AI tidy vision, and get small tasks you can complete without
          feeling overwhelmed.
        </p>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>1) Upload + generate</h2>
          <p>Pick a messy area. We will generate a clean target image and a short action plan.</p>

          <div className="controls">
            <div>
              <label htmlFor="photo">Mess photo</label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <label htmlFor="focus">Space type</label>
              <select
                id="focus"
                value={focus}
                onChange={(event) => setFocus(event.currentTarget.value)}
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: "0.8rem" }}>
            <button onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating your cleanup plan..." : "Generate tidy version + task cards"}
            </button>
          </div>

          {errorMessage && <p className="notice">{errorMessage}</p>}
          {planMeta?.isMock && (
            <p className="notice">
              Running in fallback mode. Add `OPENAI_API_KEY` in `.env.local` for real AI image and
              task generation.
            </p>
          )}
        </section>

        <section className="panel">
          <h2>2) Progress + momentum</h2>
          <p>{planMeta?.encouragement ?? "Finish one card, then the next. No overthinking."}</p>

          <div className="stats">
            <span className="stat-chip">Completed: {completed}/{tasks.length || 0}</span>
            <span className="stat-chip">XP: {earnedPoints}/{totalPoints}</span>
            <span className="stat-chip">Progress: {completionRate}%</span>
          </div>

          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${completionRate}%` }} />
          </div>

          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-item">
                <input
                  aria-label={`Mark ${task.title} done`}
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                />
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.instructions}</p>
                  <div className="task-meta">
                    {formatMinutes(task.estimatedMinutes)} · +{task.rewardPoints} XP
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {planMeta && (
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>3) Before vs target</h2>
          <p>{planMeta.sceneSummary}</p>

          <div className="result-grid">
            <article className="preview">
              <h3>Before</h3>
              <Image
                src={beforeImageUrl}
                alt="User uploaded messy space"
                width={1200}
                height={800}
                unoptimized
              />
            </article>

            <article className="preview">
              <h3>AI clean vision</h3>
              <Image
                src={planMeta.cleanImageUrl}
                alt="AI generated clean version"
                width={1200}
                height={800}
                unoptimized
              />
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
