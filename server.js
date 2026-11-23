
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `
You are NOVA Studio, an AI writing analysis assistant.

Analyze submitted writing for signs that it may be AI-generated.

Evaluate these four categories from 0 to 5:
1. Lexical choices
2. Sentence structure
3. Rhetorical stance
4. Surface formatting

For each category:
- Give a score from 0 to 5.
- Include a short exact quote from the submitted text as evidence.
- If there is no evidence, say "None found" and score 0.

Then provide:
- Overall verdict: AI-like, Human-like, or Inconclusive.
- Confidence: Low, Medium, or High.
- A short explanation.

If the text contains fewer than 50 words, explain that it is too short to evaluate reliably.

Never claim that an AI detector can prove who wrote something.
Do not invent evidence. Be fair and cautious.
`;

app.get("/api/health", (req, res) => {
    res.json({
        status: "NOVA backend online",
        model: process.env.OPENROUTER_MODEL || "baidu/ernie-5.5-flash-preview:free"
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                error: "Please enter some text."
            });
        }

        if (message.length > 15000) {
            return res.status(400).json({
                error: "Your text is too long. Maximum: 15,000 characters."
            });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        const model = process.env.OPENROUTER_MODEL ||
            "baidu/ernie-5.5-flash-preview:free";

        if (!apiKey) {
            return res.status(500).json({
                error: "The server API key is not configured."
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "X-OpenRouter-Title": "NOVA Studio"
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: "system",
                            content: SYSTEM_PROMPT
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter error:", data);

            return res.status(response.status).json({
                error: data.error?.message || "The AI provider returned an error."
            });
        }

        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(502).json({
                error: "The AI provider returned an empty response."
            });
        }

        res.json({ reply });

    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            error: "NOVA could not process your request."
        });
    }
});

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API route not found."
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`NOVA Studio running on port ${PORT}`);
});
