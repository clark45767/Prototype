
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `
You are NOVA Studio, an AI writing analysis assistant.

Your purpose is to examine writing for possible signs of AI-generated text.

For full analysis, evaluate:
1. Lexical choices
2. Sentence structure and syntax
3. Rhetorical stance
4. Surface formatting

Score each category from 0 to 5.
For each category, provide a short exact quote as evidence,
or write "None found" and score 0.

Provide:
- Overall verdict: AI-like, Human-like, or Inconclusive.
- Confidence: Low, Medium, or High.
- A clear explanation.

If the text contains fewer than 50 words,
explain that it is too short to evaluate reliably.

Never invent evidence.
Never claim that AI detection proves authorship.
A polished writing style alone does not prove AI generation.
and also make a Ai precantage likleyness
`;

const modeInstructions = {
    full: "Perform a complete analysis of all four categories.",
    lexical: "Focus on vocabulary, word choice, repetition, and phrasing.",
    syntactic: "Focus on sentence structure, syntax, and sentence variation.",
    rhetorical: "Focus on rhetorical stance, tone, and argument presentation.",
    formatting: "Focus on formatting, paragraph structure, and presentation."
};

app.get("/api/health", (req, res) => {
    res.json({
        status: "NOVA backend online",
        model: process.env.OPENROUTER_MODEL ||
            "baidu/ernie-5.5-flash-preview:free"
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message, apiKey, model, mode } = req.body || {};

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                error: "Please enter text to analyze."
            });
        }

        if (message.length > 15000) {
            return res.status(400).json({
                error: "Maximum text length is 15,000 characters."
            });
        }

        // Use visitor key if supplied, otherwise use Render's key.
        const key =
            typeof apiKey === "string" && apiKey.trim()
                ? apiKey.trim()
                : process.env.OPENROUTER_API_KEY;

        const selectedModel =
            typeof model === "string" && model.trim()
                ? model.trim()
                : process.env.OPENROUTER_MODEL ||
                "baidu/ernie-5.5-flash-preview:free";

        if (!key) {
            return res.status(500).json({
                error: "No API key found. Add one in API Settings or configure Render Environment."
            });
        }

        const selectedMode = modeInstructions[mode] ||
            modeInstructions.full;

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "X-OpenRouter-Title": "NOVA Studio"
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        {
                            role: "system",
                            content: SYSTEM_PROMPT + "\n\n" + selectedMode
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ]
                })
            }
        );

        const rawResponse = await response.text();

        let data;

        try {
            data = JSON.parse(rawResponse);
        } catch {
            console.error("Invalid OpenRouter response:", rawResponse.slice(0, 500));

            return res.status(502).json({
                error: "The AI provider returned an invalid response."
            });
        }

        if (!response.ok) {
            console.error("OpenRouter error:", data);

            return res.status(502).json({
                error: data.error?.message ||
                    "OpenRouter could not process your request."
            });
        }

        const reply = data.choices?.[0]?.message?.content;

        if (typeof reply !== "string" || !reply.trim()) {
            return res.status(502).json({
                error: "The AI returned an empty response."
            });
        }

        return res.json({ reply });

    } catch (error) {
        console.error("NOVA server error:", error);

        return res.status(500).json({
            error: "NOVA could not connect to the AI service. Check your server logs."
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
