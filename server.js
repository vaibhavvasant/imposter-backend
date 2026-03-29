import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post("/word", async (req, res) => {
  try {
    const { categoryPrompt, theme, imposterCount } = req.body;

    const system = `You are a strict JSON-only assistant for a party word game.
Respond with exactly one JSON object:
{"word":"<word>","hints":["hint1","hint2",...]}`;

    const user = `Category: ${categoryPrompt}
Theme: ${theme || "none"}
N: ${imposterCount}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch word" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));