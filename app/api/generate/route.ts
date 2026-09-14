import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Mode = "tailor" | "improve" | "build";

const OUTPUT_SHAPE = `Return ONLY valid JSON (no markdown code fences) with EXACTLY this shape:
{
  "resume": "string — the full resume in clean Markdown, ready to paste",
  "coverLetter": "string — plain text, use \\n for line breaks, max ~250 words",
  "linkedinAbout": "string — a first-person LinkedIn 'About' section, 90-150 words",
  "matchBefore": number,  // integer 0-100 (see instructions per mode)
  "matchAfter": number,   // integer 0-100, must be >= matchBefore, never 100
  "keywords": [ { "term": "string", "before": boolean, "after": boolean } ],  // 8-12 items
  "emphasis": ["string"], // 3-5 specific things THIS candidate should emphasize for THIS role
  "interviewPrep": {
    "talkingPoints": ["string"],   // 3-5 concrete stories/wins from their background to bring up
    "technical": ["string"],       // 3-5 likely technical topics/questions to prepare ([] if a non-technical role)
    "behavioral": ["string"],      // 3-5 likely behavioral questions + the angle to answer them
    "questionsToAsk": ["string"]   // 2-3 smart questions for the candidate to ask the interviewer
  },
  "matchNotes": "string — 2-3 short plain-text lines explaining the fit"
}`;

const RULES = `STRICT RULES:
- Never invent jobs, employers, degrees, certifications, dates, or metrics the candidate did not provide.
- Only set a keyword "after": true if it is genuinely supported by the candidate's real background. Do not fake skills.
- interviewPrep.talkingPoints must be grounded in the candidate's REAL background.
- matchAfter should be high but realistic (typically 82-95) and never 100.
- Quantify achievements only using numbers the candidate actually gave.`;

function buildPrompt(mode: Mode, body: Record<string, string>) {
  const jd = (body.jobDescription || "").slice(0, 6000);
  const resume = (body.resume || "").slice(0, 8000);
  const profile = (body.profile || "").slice(0, 6000);
  const targetRole = (body.targetRole || "").slice(0, 200);

  if (mode === "improve") {
    return {
      system: `You are an expert resume writer, ATS specialist, and interview coach. The candidate has a resume but NO specific job posting. Improve it to be ATS-friendly and recruiter-ready for their target role: rewrite weak bullets into quantified, action-led achievements, add the skills/keywords most expected for this kind of role (only those the candidate plausibly has), and fix structure. Also write a general cover letter, a LinkedIn About, what to emphasize, and interview prep for this kind of role.
For scoring: matchBefore = how ATS-ready/keyword-rich the ORIGINAL resume is (0-100). matchAfter = after your rewrite. keywords = the most important skills for the target role, marking before/after presence.
${RULES}
${OUTPUT_SHAPE}`,
      user: `TARGET ROLE (may be blank): ${targetRole}\n\nCURRENT RESUME:\n${resume}`,
    };
  }

  if (mode === "build") {
    return {
      system: `You are an expert resume writer and interview coach helping someone create their FIRST resume (student / recent grad / career starter, little or no formal experience). Build a strong, honest, modern resume from the profile — lead with education, projects, internships, volunteer work, coursework, transferable skills. Also write a cover letter, a LinkedIn About, what to emphasize, and entry-level interview prep.
For scoring: matchBefore = 0 (no prior resume). matchAfter = how strong/complete the new resume is for the target role (0-100). keywords = key skills for the target role (before:false, after:true only where genuinely supported).
${RULES}
${OUTPUT_SHAPE}`,
      user: `TARGET ROLE (may be blank): ${targetRole}\n\nCANDIDATE PROFILE:\n${profile}`,
    };
  }

  return {
    system: `You are an expert career coach, resume writer, ATS specialist, and interview coach. Given a JOB DESCRIPTION and the candidate's CURRENT RESUME, tailor the resume tightly to the job (mirror key keywords, lead with relevant quantified impact, ATS-friendly). Also write a compelling cover letter for this role, a LinkedIn About, what the candidate should EMPHASIZE for this specific job, and concrete INTERVIEW PREP for this exact role (technical topics if applicable, likely behavioral questions, talking points grounded in their real background, and smart questions to ask).
For scoring: matchBefore = % of the job's important keywords/requirements genuinely present in the ORIGINAL resume (0-100). matchAfter = after tailoring. keywords = the 8-12 most important keywords/requirements from the JD, each marked present-before / present-after.
${RULES}
${OUTPUT_SHAPE}`,
    user: `JOB DESCRIPTION:\n${jd}\n\nCURRENT RESUME:\n${resume}`,
  };
}

function strArr(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max) : [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: Mode = (["tailor", "improve", "build"].includes(body.mode) ? body.mode : "tailor") as Mode;

    if (mode === "tailor" && (!body.jobDescription || !body.resume || body.jobDescription.length < 30 || body.resume.length < 30)) {
      return NextResponse.json({ error: "Paste a fuller job description and resume." }, { status: 400 });
    }
    if (mode === "improve" && (!body.resume || body.resume.length < 30)) {
      return NextResponse.json({ error: "Paste your current resume." }, { status: 400 });
    }
    if (mode === "build" && (!body.profile || body.profile.length < 20)) {
      return NextResponse.json({ error: "Tell us a bit more about yourself first." }, { status: 400 });
    }

    const { system, user } = buildPrompt(mode, body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let p: Record<string, unknown>;
    try {
      p = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Generation failed, please retry." }, { status: 502 });
    }

    if (!p.resume || !p.coverLetter) {
      return NextResponse.json({ error: "Generation incomplete, please retry." }, { status: 502 });
    }

    const clamp = (n: unknown, dft: number) => {
      const v = Math.round(Number(n));
      return Number.isFinite(v) ? Math.max(0, Math.min(99, v)) : dft;
    };
    const before = clamp(p.matchBefore, mode === "build" ? 0 : 35);
    let after = clamp(p.matchAfter, 90);
    if (after <= before) after = Math.min(95, before + 25);

    const keywords = Array.isArray(p.keywords)
      ? (p.keywords as Record<string, unknown>[])
          .filter((k) => k && typeof k.term === "string")
          .slice(0, 12)
          .map((k) => ({ term: String(k.term), before: !!k.before, after: !!k.after }))
      : [];

    const ip = (p.interviewPrep || {}) as Record<string, unknown>;
    const interviewPrep = {
      talkingPoints: strArr(ip.talkingPoints, 6),
      technical: strArr(ip.technical, 6),
      behavioral: strArr(ip.behavioral, 6),
      questionsToAsk: strArr(ip.questionsToAsk, 4),
    };

    return NextResponse.json({
      mode,
      resume: String(p.resume),
      coverLetter: String(p.coverLetter),
      linkedinAbout: typeof p.linkedinAbout === "string" ? p.linkedinAbout : "",
      matchBefore: before,
      matchAfter: after,
      keywords,
      emphasis: strArr(p.emphasis, 6),
      interviewPrep,
      matchNotes: typeof p.matchNotes === "string" ? p.matchNotes : "",
    });
  } catch (err) {
    console.error("generate error", err);
    return NextResponse.json({ error: "Server error. Check your OpenAI key/credits." }, { status: 500 });
  }
}
