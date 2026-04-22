import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

/* ================================
   Types
================================ */
type RankRequest = {
  description: string;
  trade?: string;
  city?: string;
  urgency?: "emergency" | "soon" | "flexible";
};

type ContractorBase = {
  id: string;
  name: string;
  trade: string;
  city: string;
  experience: number;
  bio: string;
  photoUrl: string;
  portfolioCount: number;
  reviewCount: number;
  avgRating: number;
  reviews: { rating: number; text: string }[];
};

type RankedContractor = ContractorBase & {
  matchScore: number;
  reason: string;
  strengths: string[];
  risks: string[];
  recommendedJobTypes: string[];
};

/* ================================
   OpenAI Ranking Helper
================================ */
async function rankWithOpenAI(payload: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const systemPrompt = `
You are an AI contractor matching engine for a home repair marketplace.

Return JSON ONLY.
No markdown.
No commentary.

Rules:
- Match by meaning, not exact words
- Nearby cities are acceptable
- Trade names do not need to match exactly
- Only include contractors that reasonably fit the job
- Scores must be integers 0–100
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");

  return JSON.parse(content);
}

/* ================================
   POST Handler
================================ */
export async function POST(req: Request) {
  try {
    const decoded = await verifyAuthToken(req).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as RankRequest;

    if (!body?.description) {
      return NextResponse.json(
        { error: "Missing required field: description" },
        { status: 400 }
      );
    }

    /* ----------------------------
       1) Fetch contractors broadly
       (NO strict filtering)
    ----------------------------- */
    const snap = await getDocs(
      query(collection(db, "contractors"), limit(40))
    );

    const contractors: ContractorBase[] = await Promise.all(
      snap.docs.map(async (d) => {
        const c = d.data() as any;

        const reviewsSnap = await getDocs(
          query(
            collection(db, "contractors", d.id, "reviews"),
            orderBy("createdAt", "desc"),
            limit(6)
          )
        );

        const reviews = reviewsSnap.docs.map((r) => ({
          rating: Number(r.data()?.rating ?? 0),
          text: String(r.data()?.text ?? "").slice(0, 240),
        }));

        const ratings = reviews
          .map((r) => r.rating)
          .filter((n) => Number.isFinite(n));

        const avgRating =
          ratings.length === 0
            ? 0
            : Math.round(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
              ) / 10;

        return {
          id: d.id,
          name: c.name ?? "Unnamed",
          trade: c.trade ?? "",
          city: c.city ?? "",
          experience: Number(c.experience ?? 0),
          bio: c.bio ?? "",
          photoUrl: c.photoUrl ?? "",
          portfolioCount: Array.isArray(c.portfolio)
            ? c.portfolio.length
            : 0,
          reviewCount: reviews.length,
          avgRating,
          reviews,
        };
      })
    );

    if (contractors.length === 0) {
      return NextResponse.json({ ranked: [] });
    }

    /* ----------------------------
       2) AI Semantic Ranking
    ----------------------------- */
    const aiPayload = {
      job: {
        description: body.description,
        requested_trade: body.trade ?? "unspecified",
        city: body.city ?? "unspecified",
        urgency: body.urgency ?? "flexible",
      },
      instructions: [
        "Only return contractors who plausibly match the job",
        "Car mechanic ≈ automotive technician",
        "City does not need to match exactly",
        "Exclude weak or irrelevant matches",
      ],
      contractors,
      output_schema: {
        ranked: [
          {
            contractorId: "string",
            score: "number 0-100",
            reason: "string",
            strengths: ["string"],
            risks: ["string"],
            recommended_job_types: ["string"],
          },
        ],
      },
    };

    const ai = await rankWithOpenAI(aiPayload);
    const rankedRaw = Array.isArray(ai?.ranked) ? ai.ranked : [];

    /* ----------------------------
       3) Merge + sort results
    ----------------------------- */
    const map = new Map(contractors.map((c) => [c.id, c]));

    const ranked: RankedContractor[] = rankedRaw
      .map((r: any) => {
        const c = map.get(r.contractorId);
        if (!c) return null;

        return {
          ...c,
          matchScore: Number(r.score ?? 0),
          reason: String(r.reason ?? ""),
          strengths: Array.isArray(r.strengths) ? r.strengths : [],
          risks: Array.isArray(r.risks) ? r.risks : [],
          recommendedJobTypes: Array.isArray(r.recommended_job_types)
            ? r.recommended_job_types
            : [],
        };
      })
      .filter((c: RankedContractor | null): c is RankedContractor => c !== null)
      .sort(
        (a: RankedContractor, b: RankedContractor) =>
          b.matchScore - a.matchScore
      );

    return NextResponse.json({ ranked });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
