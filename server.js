import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Health check
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

function normalizeWord(w) {
  return w.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.post("/word", async (req, res) => {
  try {
    const {
      categoryPrompt,
      theme,
      imposterCount,
      avoidWords = [],
    } = req.body;

    const avoid = new Set(avoidWords.map(normalizeWord));

    const avoidBlock =
      avoidWords.length > 0
        ? `\nDo NOT use any of these words (or close variants): ${avoidWords
            .slice(-40)
            .join(", ")}.`
        : "";

    const themeBlock = theme
      ? `\nSTRICT THEME REQUIREMENT:
The chosen word MUST strongly belong to this theme: "${theme}".
If it does not clearly fit, choose a better word that does.`
      : "";

    const system = `You are a strict JSON-only assistant for a party word game.

You must respond with EXACTLY one JSON object and NO explanation:
{"word":"<word>","hints":["hint1","hint2",...]}

CRITICAL RULES (STRICTLY ENFORCED):

1. THEME IS MANDATORY (IF PROVIDED):
- If a theme is given, the word MUST clearly and strongly belong to that theme.
- If the word is even slightly unrelated, it is INVALID.
- If unsure, choose a more obvious word.

2. CATEGORY IS SECONDARY:
- Category is a loose guideline.
- If there is any conflict, ALWAYS prioritize the theme.

3. WORD RULES:
- One English or Hindi word (max two only if absolutely necessary)
- Must be commonly recognizable
- Must clearly match the theme if provided

4. HINT RULES:
- Exactly N hints
- Each hint is 1 word
- Must relate to the word
- Must NOT contain or reveal the word
- Must NOT be too obvious
- Should require thinking (not direct giveaway)

5. SELF-CHECK (VERY IMPORTANT):
Before finalizing your answer, ask yourself:
- Does this word clearly belong to the theme?
- Would most people associate this word with the theme immediately?

If NO → discard and choose a better word.

6. OUTPUT FORMAT:
- ONLY valid JSON
- No markdown
- No explanation

${avoidBlock}
${themeBlock}
`;

    const user = `Category: ${categoryPrompt}

${theme ? `Theme: ${theme}` : ""}

IMPORTANT:
- The word MUST strongly match the theme if provided.
- If the word does not clearly fit the theme, it is invalid.

Number of hints required (N): ${imposterCount}`;

    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            temperature: 0.85 + attempt * 0.05,
            max_tokens: 256,
          }),
        }
      );

      if (!response.ok) break;

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const parsed = extractJSON(text);

      if (parsed && parsed.word && parsed.hints) {
        if (!avoid.has(normalizeWord(parsed.word))) {
          return res.json(parsed);
        }
        if (attempt < maxAttempts - 1) continue;
        return res.json(parsed);
      }
    }

    return res.status(500).json({ error: "Failed to generate word" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});