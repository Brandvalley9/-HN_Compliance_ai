import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/**
 * AI Compliance Reasoning Endpoint
 *
 * Receives:
 * - campaign: Campaign details
 * - submittedContentText: The UGC content or video transcript text
 * - deterministicFindings: The deterministic rule engine findings (Pass/Fail/Flag)
 * - matchedRegulatoryEntries: Regulatory knowledge entries retrieved from Step 4
 *
 * Calls Gemini API with structured context and strict schema enforcement.
 * Parses, validates, and returns the verified JSON response.
 */
app.post("/api/compliance/reasoning", async (req, res) => {
  try {
    const {
      campaign,
      submittedContentText,
      deterministicFindings = [],
      matchedRegulatoryEntries = [],
    } = req.body;

    if (!campaign) {
      return res.status(400).json({ error: "Missing required 'campaign' object." });
    }

    if (!submittedContentText || typeof submittedContentText !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'submittedContentText'." });
    }

    // Prepare list of allowed regulatory references for citation verification
    const allowedRegulatoryRefs: string[] = [];
    matchedRegulatoryEntries.forEach((entry: any) => {
      const refFormatted = `${entry.source} ${entry.sectionRef}`.trim();
      allowedRegulatoryRefs.push(refFormatted);
      if (entry.sectionRef) allowedRegulatoryRefs.push(entry.sectionRef.trim());
      if (entry.source) allowedRegulatoryRefs.push(entry.source.trim());
    });

    const ai = getGeminiClient();

    // Construct detailed system instruction and structured prompt
    const systemInstruction = `You are the Lead Advertising Compliance Reasoning Engine for HypeNex Compliance Intelligence.
Your task is to review creator-submitted marketing content for regulatory compliance, brand guideline conformity, and truth in advertising.

You will be provided with:
1. Campaign Details (brand brief, approved claims, prohibited claims, required disclosures, product type, target audience).
2. Submitted Content Text (creator draft, post captions, or audio/video transcript).
3. Deterministic Rule Findings (the programmatic checks already executed for keyword matches, missing hashtags, etc.).
4. Matched Regulatory Entries (authoritative regulatory rules provided from our curated regulatory database).

CRITICAL GROUNDING MANDATE:
- You must ONLY cite regulatory references that were ACTUALLY PROVIDED in the "Matched Regulatory Entries" section.
- NEVER invent, extrapolate, hallucinate, or cite external regulations or codes (such as FDA 21 CFR, GDPR, HIPAA, or uncited FTC sections) unless they appear verbatim in the provided Matched Regulatory Entries list.
- If an issue is purely a brand brief or campaign guideline breach (e.g. prohibited claim) with no matching statute provided, leave "regulatory_references" as an empty array [] or cite the exact provided regulatory section if one directly applies.
- For each issue:
  * "severity": must be strictly "LOW", "MEDIUM", or "HIGH".
  * "category": a concise categorization, e.g., "Misleading Claim", "Missing Disclosure", "Prohibited Guarantee", "Health Substantiation", "Audience Risk".
  * "finding": clear, factual explanation of the violation or compliance risk.
  * "evidence": verbatim quote or exact excerpt from the submitted content text that constitutes the issue.
  * "regulatory_references": array of strings citing only the provided regulations.
  * "suggested_fix": actionable revision guidance for the creator to achieve full compliance while preserving authentic UGC tone.
  * "confidence": a float between 0.0 and 1.0 indicating your certainty.
- "overall_status":
  * "RED": Severe statutory violation, illegal claims, completely missing mandatory legal disclosures, or major consumer detriment.
  * "AMBER": Borderline ambiguity, questionable substantiation, awkward disclosure placement, or soft brand guideline deviations.
  * "GREEN": Fully compliant or negligible minor issues.
- "human_review_required": boolean indicating whether a compliance officer must manually verify before release. Must be true for any RED status or AMBER with low confidence.`;

    const prompt = `--- 1. CAMPAIGN DETAILS ---
Name: ${campaign.name || "Untitled Campaign"}
Product Type: ${campaign.productType || "General"}
Product Description: ${campaign.productDescription || "N/A"}
Target Audience: ${campaign.targetAudience || "N/A"}
Approved Claims: ${JSON.stringify(campaign.approvedClaims || [])}
Prohibited Claims: ${JSON.stringify(campaign.prohibitedClaims || [])}
Required Disclosures: ${JSON.stringify(campaign.requiredDisclosures || [])}
Campaign Instructions: ${campaign.instructions || "N/A"}
Target Platforms: ${JSON.stringify(campaign.platforms || [])}

--- 2. SUBMITTED CONTENT TEXT ---
"""
${submittedContentText}
"""

--- 3. DETERMINISTIC RULE FINDINGS (From Step 3 Rule Engine) ---
${
  deterministicFindings.length === 0
    ? "No deterministic rule failures detected."
    : JSON.stringify(deterministicFindings, null, 2)
}

--- 4. MATCHED REGULATORY ENTRIES (From Step 4 Curated Knowledge Base) ---
${
  matchedRegulatoryEntries.length === 0
    ? "No regulatory entries were matched for this campaign context."
    : matchedRegulatoryEntries
        .map(
          (e: any, i: number) =>
            `[Entry ${i + 1}]
- Source: ${e.source}
- Section Reference: ${e.sectionRef}
- Document: ${e.documentName || "N/A"}
- Summary: ${e.summary}
- Matched Topic Tags: ${(e.matchedTopicTags || []).join(", ")}
- Statute URL: ${e.sourceUrl || "N/A"}`
        )
        .join("\n\n")
}

REMINDER: Only cite regulatory references from the entries above. Return a valid JSON object matching the requested schema.`;

    // Generate content with resilient fallback across models on transient upstream 503 overload errors
    let responseText: string | undefined;
    const modelsToTry = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.1, // Low temperature for deterministic, rigorous compliance evaluation
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overall_status: {
                    type: Type.STRING,
                    enum: ["GREEN", "AMBER", "RED"],
                    description: "Overall compliance status indicator.",
                  },
                  human_review_required: {
                    type: Type.BOOLEAN,
                    description: "Whether a human compliance reviewer must inspect this content.",
                  },
                  issues: {
                    type: Type.ARRAY,
                    description: "List of identified compliance findings and risks.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        severity: {
                          type: Type.STRING,
                          enum: ["LOW", "MEDIUM", "HIGH"],
                          description: "Severity level of the compliance issue.",
                        },
                        category: {
                          type: Type.STRING,
                          enum: [
                            "Prohibited & Unsubstantiated Claim",
                            "Missing Mandatory Disclosure",
                            "Platform Format & Placement",
                            "General Compliance"
                          ],
                          description: "Issue category, e.g. Misleading Claim, Missing Disclosure.",
                        },
                        finding: {
                          type: Type.STRING,
                          description: "Detailed description of the finding.",
                        },
                        evidence: {
                          type: Type.STRING,
                          description: "Exact text excerpt from the submission illustrating the issue.",
                        },
                        regulatory_references: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Citations to provided matched regulatory rules only.",
                        },
                        suggested_fix: {
                          type: Type.STRING,
                          description: "Constructive fix recommendation for the creator.",
                        },
                        confidence: {
                          type: Type.NUMBER,
                          description: "Confidence score between 0.0 and 1.0.",
                        },
                      },
                      required: [
                        "severity",
                        "category",
                        "finding",
                        "evidence",
                        "regulatory_references",
                        "suggested_fix",
                        "confidence",
                      ],
                    },
                  },
                },
                required: ["overall_status", "human_review_required", "issues"],
              },
            },
          });

          responseText = response.text;
          if (responseText) break;
        } catch (genErr: any) {
          lastError = genErr;
          console.log(`[Gemini Info] Attempt ${attempt} on model ${modelName} returned:`, genErr?.message || genErr);
          // If it's a 503 high demand, break out of inner retry to switch immediately to alternative model
          const errMsg = String(genErr?.message || "");
          if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE")) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
      if (responseText) break;
    }

    // Fallback if upstream Gemini API infrastructure is temporarily overloaded (503)
    if (!responseText) {
      console.log("[Gemini Fallback] Upstream Gemini API temporarily unavailable. Synthesizing grounded reasoning analysis from deterministic rule findings & matched regulatory statutes.");

      const fallbackIssues: any[] = [];
      let calculatedStatus: "GREEN" | "AMBER" | "RED" = "GREEN";

      // 1. Convert failed deterministic findings into high-fidelity issues with grounded citations
      for (const df of deterministicFindings) {
        if (df.status === "FAIL") {
          const isProhibited = df.ruleCategory === "prohibited_claim";
          const severity = isProhibited ? "HIGH" : "MEDIUM";
          if (severity === "HIGH") calculatedStatus = "RED";
          else if (calculatedStatus !== "RED") calculatedStatus = "AMBER";

          // Ground citation strictly to provided matched regulatory entries
          const matchedCitations: string[] = [];
          if (matchedRegulatoryEntries && matchedRegulatoryEntries.length > 0) {
            for (const r of matchedRegulatoryEntries) {
              if (
                (isProhibited && r.matchedTopicTags?.some((t: string) => t.includes("misleading") || t.includes("substantiation") || t.includes("health"))) ||
                (!isProhibited && r.matchedTopicTags?.some((t: string) => t.includes("disclosure")))
              ) {
                matchedCitations.push(`${r.source} ${r.sectionRef}`.trim());
              }
            }
            // If none matched, cite first relevant provided rule if available
            if (matchedCitations.length === 0 && matchedRegulatoryEntries[0]) {
              matchedCitations.push(`${matchedRegulatoryEntries[0].source} ${matchedRegulatoryEntries[0].sectionRef}`.trim());
            }
          }

          fallbackIssues.push({
            severity,
            category: isProhibited ? "Prohibited & Unsubstantiated Claim" : "Missing Mandatory Disclosure",
            finding: df.message,
            evidence: df.matchedText || (submittedContentText ? submittedContentText.substring(0, 50) : ""),
            regulatory_references: Array.from(new Set(matchedCitations)),
            suggested_fix: isProhibited
              ? `Remove absolute or prohibited claim "${df.matchedText || ""}" and replace with approved campaign benefit claim.`
              : `Ensure the required disclosure "${df.ruleDefinition || ""}" is prominently placed above the fold in the caption.`,
            confidence: 0.95,
          });
        }
      }

      const synthesizedResult = {
        overall_status: calculatedStatus,
        human_review_required: calculatedStatus !== "GREEN",
        issues: fallbackIssues,
      };

      return res.json({
        success: true,
        data: synthesizedResult,
        warning: "Temporary upstream Gemini overload (503). Report generated via deterministic rules grounded in matched regulatory entries.",
      });
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", responseText);
      throw new Error("Gemini returned invalid JSON structure.");
    }

    // Strict validation of the required shape
    const validStatuses = ["GREEN", "AMBER", "RED"];
    if (!validStatuses.includes(parsed.overall_status)) {
      parsed.overall_status = "AMBER";
    }

    if (typeof parsed.human_review_required !== "boolean") {
      parsed.human_review_required = parsed.overall_status !== "GREEN";
    }

    if (!Array.isArray(parsed.issues)) {
      parsed.issues = [];
    }

    // Validate and clean each issue
    const validSeverities = ["LOW", "MEDIUM", "HIGH"];
    parsed.issues = parsed.issues.map((issue: any) => {
      const severity = validSeverities.includes(issue.severity) ? issue.severity : "MEDIUM";
      const category = typeof issue.category === "string" ? issue.category.trim() : "General Compliance";
      const finding = typeof issue.finding === "string" ? issue.finding.trim() : "Compliance observation";
      const evidence = typeof issue.evidence === "string" ? issue.evidence.trim() : "";
      const suggested_fix = typeof issue.suggested_fix === "string" ? issue.suggested_fix.trim() : "Review and align with campaign guidelines.";
      const confidence = typeof issue.confidence === "number" && !isNaN(issue.confidence)
        ? Math.max(0, Math.min(1, issue.confidence))
        : 0.85;

      // Filter regulatory references to ensure grounding:
      // Must only contain references that exist in matchedRegulatoryEntries or are directly derived from them
      let rawRefs: string[] = Array.isArray(issue.regulatory_references) ? issue.regulatory_references : [];
      let sanitizedRefs: string[] = [];

      if (matchedRegulatoryEntries.length === 0) {
        // No regulatory entries provided, so model must not invent any
        sanitizedRefs = [];
      } else {
        rawRefs.forEach(ref => {
          if (typeof ref !== "string") return;
          const trimmed = ref.trim();
          if (!trimmed) return;

          // Check if it matches any provided source or sectionRef
          const isGrounded = matchedRegulatoryEntries.some((e: any) => {
            const combined = `${e.source} ${e.sectionRef}`.toLowerCase();
            const sourceLow = (e.source || "").toLowerCase();
            const refLow = (e.sectionRef || "").toLowerCase();
            const tLow = trimmed.toLowerCase();
            return (
              combined.includes(tLow) ||
              tLow.includes(sourceLow) ||
              tLow.includes(refLow) ||
              (e.documentName && tLow.includes(e.documentName.toLowerCase()))
            );
          });

          if (isGrounded) {
            sanitizedRefs.push(trimmed);
          }
        });
      }

      return {
        severity,
        category,
        finding,
        evidence,
        regulatory_references: sanitizedRefs,
        suggested_fix,
        confidence,
      };
    });

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Compliance reasoning error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal compliance reasoning error.",
    });
  }
});

// Follow-up chat endpoint scoped strictly to an individual submission result
app.post("/api/compliance/chat", async (req, res) => {
  try {
    const {
      campaign,
      submittedContentText,
      complianceResult,
      matchedRegulatoryEntries = [],
      conversationHistory = [],
      userMessage
    } = req.body;

    if (!campaign || !submittedContentText || !userMessage) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: campaign, submittedContentText, or userMessage."
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are the HypeNex Creator Compliance Assistant.
You are having a follow-up conversation with a content creator strictly about their specific draft submission and the compliance evaluation results that were just generated.

Context provided to you:
1. Campaign Brief: product type, approved claims, prohibited claims, mandatory disclosures, and instructions.
2. The Creator's Submitted Draft Text.
3. The Compliance Evaluation Results: overall status (${complianceResult?.overall_status || 'UNKNOWN'}), issues found, and suggested fixes.
4. Curated Regulatory Entries matched for this campaign.

YOUR STRICT RULES:
- Ground all explanations strictly in the provided campaign guardrails and matched regulatory entries.
- NEVER invent, fabricate, or cite external regulations not included in the matched entries.
- If asked "why is this flagged" or similar, explain clearly, kindly, and in plain language why the phrase or omission violates the specific campaign brief or regulatory rule (e.g. CAP, ASA, FTC).
- If asked for an "alternative phrasing" or "rewrite", provide 1 to 2 high-converting, punchy UGC script alternatives that preserve creator voice while being 100% compliant (incorporating required disclosures and approved claims without prohibited terms).
- Keep answers concise, actionable, creator-friendly, and polite. Avoid legalistic jargon where simple words work.`;

    const promptContext = `--- CAMPAIGN BRIEF ---
Name: ${campaign.name} (${campaign.productType})
Approved Claims: ${JSON.stringify(campaign.approvedClaims || [])}
Prohibited Claims: ${JSON.stringify(campaign.prohibitedClaims || [])}
Required Disclosures: ${JSON.stringify(campaign.requiredDisclosures || [])}

--- CREATOR SUBMITTED DRAFT ---
"""
${submittedContentText}
"""

--- COMPLIANCE EVALUATION RESULT ---
Overall Status: ${complianceResult?.overall_status || 'N/A'}
Issues Flagged: ${JSON.stringify(complianceResult?.issues || [], null, 2)}

--- MATCHED REGULATORY CONTEXT ---
${(matchedRegulatoryEntries || []).map((e: any) => `- [${e.source} ${e.sectionRef}]: ${e.summary}`).join("\n") || "Standard advertising truth in marketing rules."}

--- CONVERSATION HISTORY ---
${(conversationHistory || []).map((msg: any) => `${msg.role === 'user' ? 'Creator' : 'Assistant'}: ${msg.content}`).join("\n")}

--- NEW CREATOR QUESTION ---
Creator: ${userMessage}

Respond helpfully as the Creator Compliance Assistant. If you provide an alternative phrasing or rewrite, highlight it clearly so the creator can easily copy it or use it for their revised draft.`;

    let replyText = "";
    const modelsToTry = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptContext,
          config: {
            systemInstruction,
            temperature: 0.3,
          }
        });
        replyText = response.text || "";
        if (replyText) break;
      } catch (err: any) {
        console.log(`[Chat Gemini Info] Call on ${modelName} returned:`, err?.message || err);
      }
    }

    if (!replyText) {
      // Graceful contextual fallback if API is temporarily unresponsive
      const lower = userMessage.toLowerCase();
      if (lower.includes("alternative") || lower.includes("rephrase") || lower.includes("rewrite")) {
        const approvedClaim = campaign.approvedClaims?.[0] || "fits easily into my everyday routine";
        const disclosures = (campaign.requiredDisclosures || ["#ad"]).join(" ");
        replyText = `Here is a compliant alternative phrasing you can use:

"I've been loving the ${campaign.name}! What stands out most is how it ${approvedClaim.toLowerCase()}. Check out the link in my bio to try it out! ${disclosures}"

This version keeps your natural voice while ensuring all mandatory disclosures are visible and replacing unverified claims with approved benefits.`;
      } else if (lower.includes("why") || lower.includes("flag")) {
        const firstIssue = complianceResult?.issues?.[0];
        if (firstIssue) {
          replyText = `This was flagged under ${firstIssue.category}: "${firstIssue.finding}". 
Specifically, advertising rules prohibit claims like "${firstIssue.evidence}" unless backed by clinical trials or statutory approvals. You can resolve this by using approved claims from your brief instead.`;
        } else {
          replyText = `Your draft was evaluated against mandatory disclosures (${campaign.requiredDisclosures?.join(', ')}) and prohibited claims. Anything promising absolute cures or missing required tags gets flagged to protect you and the brand.`;
        }
      } else {
        replyText = `I'm here to help you get your draft to a 100% GREEN status! You can ask me why any specific word was flagged, or ask for compliant alternative phrasings that match your tone.`;
      }
    }

    return res.json({
      success: true,
      reply: replyText
    });
  } catch (error: any) {
    console.error("Compliance chat error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal chat error."
    });
  }
});

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HypeNex server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
