
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `
You are NOVA, an AI text detector.

Evaluate submitted writing for possible AI-generated patterns.

Score these categories from 0 to 5:
A. Lexical choices
B. Sentence structure
C. Rhetorical stance
D. Formatting

Provide exact quotes as evidence.
Never invent evidence.
If the text is under 50 words, say it is too short to evaluate reliably.

Give:
- Checklist evaluation
- Additional signals
- Holistic reading
- Reconciliation
- Verdict: AI-like, Human-like, or Inconclusive
- Confidence: Low, Medium, or High
- Two or three sentences of reasoning

AI detection cannot prove authorship.
Also give a percentasge on how likley it is Ai generated text
`;

app.get("/api/health", (req, res) => {
    res.json({ status: "NOVA backend online" });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message, apiKey, model } = req.body || {};

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                error: "Enter text to analyze."
            });
        }

        const key = apiKey?.trim() || process.env.OPENROUTER_API_KEY;

        if (!key) {
            return res.status(401).json({
                error: "Please enter your OpenRouter API key."
            });
        }

        const selectedModel =
            model?.trim() ||
            process.env.OPENROUTER_MODEL ||
            "baidu/ernie-5.5-flash-preview:free";

        const aiResponse = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "X-OpenRouter-Title": "NOVA Studio"
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: message }
                    ]
                })
            }
        );

        const result = await aiResponse.json();

        if (!aiResponse.ok) {
            return res.status(aiResponse.status).json({
                error: result.error?.message || "OpenRouter request failed."
            });
        }

        const reply = result.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(502).json({
                error: "The AI returned an empty response."
            });
        }

        res.json({ reply });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Backend error: " + error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`NOVA running at http://localhost:${PORT}`);
});
