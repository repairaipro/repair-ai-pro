import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import type { JobStatus } from "@/types/firestore";

const KNOWN_STATUSES = new Set<string>([
  "draft","triaged","matched","accepted","in_progress","completed","confirmed",
  "open","claimed","contacted","inspection_scheduled","quote_proposed",
  "approved","verified","closed","cancelled",
]);

function toJobStatus(value: unknown, fallback: JobStatus = "triaged"): JobStatus {
  return typeof value === "string" && KNOWN_STATUSES.has(value)
    ? (value as JobStatus)
    : fallback;
}

type OrchestratorDecision = {
  summary: string; // 1-2 lines
  next_status?: JobStatus; // optional
  recommended_actions: Array<{
    title: string; // short button label
    action: string; // machine action name
    payload?: any;
  }>;
  risks: string[];
  questions_to_confirm: string[];
};

// --- OpenAI helper (server-only) ---
async function orchestrateWithOpenAI(payload: any): Promise<OrchestratorDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const system = `
You are an AI Job Orchestrator for a home repair marketplace.
You must return JSON only that matches this exact shape:

{
  "summary": string,
  "next_status": string | null,
  "recommended_actions": [{"title": string, "action": string, "payload": object|null}],
  "risks": string[],
  "questions_to_confirm": string[]
}

Rules:
- Be practical and brief.
- Next status should only move forward, never backward.
- If uncertain, set next_status to null and ask questions.
- Use recommended_actions to suggest platform steps (schedule_inspection, propose_quote, approve_quote, start_work, mark_complete, verify, close) or guidance steps (request_photos, ask_question).
- Never invent facts. Use only the provided job + messages + attachments.
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${t}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return JSON.parse(content);
}

// Optional: forward-only guard so AI can’t skip backwards
const STATUS_ORDER: JobStatus[] = [
  "draft",
  "triaged",
  "matched",
  "contacted",
  "inspection_scheduled",
  "quote_proposed",
  "approved",
  "in_progress",
  "completed",
  "verified",
  "closed",
];

function canMoveForward(current: JobStatus, next: JobStatus) {
  const a = STATUS_ORDER.indexOf(current);
  const b = STATUS_ORDER.indexOf(next);
  if (a === -1 || b === -1) return true; // unknown statuses: don't hard block
  return b >= a;
}

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json().catch(() => ({}));
    const autoApply = Boolean(body?.autoApply); // if true, it will update status

    // 1) Load job
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const job = { id: jobSnap.id, ...(jobSnap.data() as any) };

    // 2) Load last messages
    const msgQ = query(
      collection(db, "jobs", jobId, "messages"),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    const msgSnap = await getDocs(msgQ);
    const messages = msgSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .reverse(); // chronological for readability

    // 3) Load attachments (optional)
    const attQ = query(
      collection(db, "jobs", jobId, "attachments"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const attSnap = await getDocs(attQ);
    const attachments = attSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    // 4) Ask AI for decision
    const aiPayload = {
      job: {
        id: job.id,
        description: job.description,
        trade: job.trade ?? null,
        location: job.location ?? null,
        status: job.status ?? null,
        claimedBy: job.claimedBy ?? null,
        aiDetectedTrade: job.aiDetectedTrade ?? null,
        aiSeverity: job.aiSeverity ?? null,
        aiSummary: job.aiSummary ?? null,
      },
      messages: messages.map((m: any) => ({
        kind: m.kind ?? (m.senderId ? "user" : "system"),
        senderId: m.senderId ?? null,
        text: String(m.text ?? "").slice(0, 800),
        createdAt: m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : null,
      })),
      attachments: attachments.map((a: any) => ({
        type: a.type ?? null,
        url: a.url ?? null,
        createdAt: a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : null,
      })),
      platform_goal:
        "Move the job forward safely with clear next steps, prevent confusion, and keep everything on-platform.",
    };

    const decision = await orchestrateWithOpenAI(aiPayload);

    // 5) Guard status move (forward-only)
    const currentStatus = toJobStatus(job.status);
    const proposedNext = decision?.next_status
      ? toJobStatus(decision.next_status)
      : null;

    let appliedStatus: JobStatus | null = null;

    if (autoApply && proposedNext) {
      if (!canMoveForward(currentStatus, proposedNext)) {
        // refuse backward move
        appliedStatus = null;
      } else {
        await updateDoc(jobRef, {
          status: proposedNext,
          updatedAt: serverTimestamp(),
          aiOrchestrator: {
            lastRunAt: serverTimestamp(),
            summary: decision.summary ?? "",
            nextStatus: proposedNext,
            risks: Array.isArray(decision.risks) ? decision.risks : [],
            questions: Array.isArray(decision.questions_to_confirm)
              ? decision.questions_to_confirm
              : [],
            actions: Array.isArray(decision.recommended_actions)
              ? decision.recommended_actions
              : [],
          },
        });
        appliedStatus = proposedNext;

        // Write a system message for audit trail
        await addDoc(collection(db, "jobs", jobId, "messages"), {
          text: `🤖 AI Orchestrator updated job status: ${currentStatus} → ${proposedNext}.`,
          kind: "system",
          createdAt: serverTimestamp(),
        });
      }
    } else {
      // store suggestion only (no status change)
      await updateDoc(jobRef, {
        updatedAt: serverTimestamp(),
        aiOrchestrator: {
          lastRunAt: serverTimestamp(),
          summary: decision.summary ?? "",
          nextStatus: proposedNext,
          risks: Array.isArray(decision.risks) ? decision.risks : [],
          questions: Array.isArray(decision.questions_to_confirm)
            ? decision.questions_to_confirm
            : [],
          actions: Array.isArray(decision.recommended_actions)
            ? decision.recommended_actions
            : [],
        },
      });

      await addDoc(collection(db, "jobs", jobId, "messages"), {
        text: `🤖 AI Orchestrator suggestion: ${decision.summary ?? "Next steps available."}`,
        kind: "system",
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      currentStatus,
      proposedNextStatus: proposedNext,
      appliedStatus,
      decision,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Orchestrator failed" },
      { status: 500 }
    );
  }
}
