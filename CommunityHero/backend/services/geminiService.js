const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VALID_CATEGORIES = [
  "Electricity",
  "Water",
  "Mess Food",
  "Cleanliness",
  "Internet",
  "Other",
];

/**
 * Uses Gemini to analyze a submitted community issue AND check whether it
 * duplicates one of the provided candidate issues — all in a single API call.
 *
 * @param {string} title
 * @param {string} description
 * @param {Array<{id: string, title: string, description: string}>} candidates
 *        Existing OPEN issues (same category, same hostel, recent) to
 *        compare against. Keep this list short (<=10) to keep the prompt
 *        cheap and fast.
 *
 * Returns { aiCategory, aiSummary, aiPriority, duplicateOfId } and never
 * throws — on any failure it falls back to safe defaults so issue creation
 * is never blocked by an AI/network problem.
 */
async function analyzeIssue(title, description, candidates = []) {
  const fallback = {
    aiCategory: null,
    aiSummary: null,
    aiPriority: "Medium",
    duplicateOfId: null,
  };

  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — skipping AI analysis");
    return fallback;
  }

  try {
    const candidateBlock = candidates.length
      ? candidates
          .map(
            (c, i) =>
              `${i + 1}. id="${c.id}" title="${c.title}" description="${c.description}"`
          )
          .join("\n")
      : "(no existing open issues to compare against)";

    const prompt = `You are an assistant for a community issue-reporting app.

NEW ISSUE:
Title: ${title}
Description: ${description}

EXISTING OPEN ISSUES IN THE SAME CATEGORY AND HOSTEL (recent, unresolved):
${candidateBlock}

Do four things:
1. Pick the single best category for the NEW issue from exactly this list: ${VALID_CATEGORIES.join(", ")}.
2. Write a one-sentence (max 20 words) neutral summary of the NEW issue.
3. Rate urgency of the NEW issue as exactly one of: Low, Medium, High.
4. Decide if the NEW issue describes the SAME real-world physical problem as
   one of the EXISTING OPEN ISSUES listed above (wording does not need to
   match, meaning does). If yes, set "duplicateOfId" to that issue's exact
   id string. If no clear match, set "duplicateOfId" to null. Only mark as
   duplicate if you are reasonably confident it is the same underlying
   problem, not just the same category.

Respond with ONLY raw JSON, no markdown, in this exact shape:
{"category": "...", "summary": "...", "priority": "...", "duplicateOfId": "..." or null}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    console.log("[Gemini] raw response text:", text);
    if (!text) return fallback;

    const parsed = JSON.parse(text);
    console.log("[Gemini] parsed JSON:", parsed);

    const category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : null;

    const priority = ["Low", "Medium", "High"].includes(parsed.priority)
      ? parsed.priority
      : "Medium";

    // Only trust duplicateOfId if it exactly matches a real candidate we sent.
    // This prevents the model from ever inventing/hallucinating an id.
    const candidateIds = new Set(candidates.map((c) => c.id));
    const duplicateOfId =
      typeof parsed.duplicateOfId === "string" && candidateIds.has(parsed.duplicateOfId)
        ? parsed.duplicateOfId
        : null;

    return {
      aiCategory: category,
      aiSummary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 200) : null,
      aiPriority: priority,
      duplicateOfId,
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error.message);
    return fallback;
  }
}

module.exports = { analyzeIssue, VALID_CATEGORIES };