
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");

const modeButtons = document.querySelectorAll(".mode");
const selectedMode = document.getElementById("selectedMode");

const newChatButton = document.getElementById("newChatButton");
const suggestions = document.querySelectorAll(".suggestion");

const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("modelInput");

const saveKeyButton = document.getElementById("saveKeyButton");
const removeKeyButton = document.getElementById("removeKeyButton");
const saveModelButton = document.getElementById("saveModelButton");
const settingsStatus = document.getElementById("settingsStatus");

let currentMode = "full";
let isSending = false;

const modeNames = {
    full: "Full analysis",
    lexical: "Lexical analysis",
    syntactic: "Syntax analysis",
    rhetorical: "Rhetorical analysis",
    formatting: "Formatting analysis"
};

// SETTINGS

apiKeyInput.value = sessionStorage.getItem("nova_api_key") || "";

modelInput.value =
    localStorage.getItem("nova_model") ||
    "baidu/ernie-5.5-flash-preview:free";

function updateSettingsStatus(message) {
    settingsStatus.textContent = message;
}

saveKeyButton.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
        updateSettingsStatus("Please enter an API key.");
        return;
    }

    sessionStorage.setItem("nova_api_key", key);
    updateSettingsStatus("Your API key is saved for this browser tab.");
});

removeKeyButton.addEventListener("click", () => {
    sessionStorage.removeItem("nova_api_key");
    apiKeyInput.value = "";
    updateSettingsStatus("Custom API key removed. The server default will be used if configured.");
});

saveModelButton.addEventListener("click", () => {
    const model = modelInput.value.trim();

    if (!model) {
        updateSettingsStatus("Please enter a model name.");
        return;
    }

    localStorage.setItem("nova_model", model);
    updateSettingsStatus("AI model saved.");
});

// CHAT HISTORY

function saveHistory() {
    const history = [];

    document.querySelectorAll(".message").forEach(message => {
        const content = message.querySelector(".message-content");

        if (content) {
            history.push({
                sender: message.classList.contains("user") ? "user" : "ai",
                text: content.textContent
            });
        }
    });

    localStorage.setItem("nova_chat_history", JSON.stringify(history));
}

function addMessage(sender, text) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;

    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = sender === "user" ? "YOU" : "NOVA";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = text;

    message.appendChild(label);
    message.appendChild(content);

    chatMessages.appendChild(message);

    const conversation = document.getElementById("conversation");
    conversation.scrollTop = conversation.scrollHeight;

    return content;
}

function loadHistory() {
    try {
        const history = JSON.parse(
            localStorage.getItem || "[]"
        );

        if (!Array.isArray(history)) return;

        if (history.length > 0) {
            welcome.style.display = "none";

            history.forEach(item => {
                if (
                    (item.sender === "user" || item.sender === "ai") &&
                    typeof item.text === "string"
                ) {
                    addMessage(item.sender, item.text);
                }
            });
        }
    } catch (error) {
        console.error("Chat history error:", error);
        localStorage.removeItem("nova_chat_history");
    }
}

// ANALYSIS MODES

modeButtons.forEach(button => {
    button.addEventListener("click", () => {
        modeButtons.forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        currentMode = button.dataset.mode;
        selectedMode.textContent = modeNames[currentMode];
    });
});

// SUGGESTIONS

suggestions.forEach(button => {
    button.addEventListener("click", () => {
        messageInput.value = button.dataset.prompt + "\n\n";
        messageInput.focus();
    });
});

// NEW CHAT

newChatButton.addEventListener("click", () => {
    if (isSending) return;

    chatMessages.innerHTML = "";
    localStorage.removeItem("nova_chat_history");

    welcome.style.display = "block";
    messageInput.value = "";
    messageInput.focus();
});

// SEND MESSAGE

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSending) return;

    const message = messageInput.value.trim();

    if (!message) return;

    isSending = true;

    welcome.style.display = "none";

    addMessage("user", message);
    saveHistory();

    messageInput.value = "";

    sendButton.disabled = true;
    sendButton.textContent = "...";

    const loadingContent = addMessage(
        "ai",
        "Analyzing your text..."
    );

    saveHistory();

    let analysisRequest = message;

    if (currentMode !== "full") {
        analysisRequest =
            `Focus your analysis on ${modeNames[currentMode]}. ` +
            `Follow the required evaluation format.\n\n${message}`;
    }

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: analysisRequest,
                apiKey: sessionStorage.getItem("nova_api_key") || "",
                model: localStorage.getItem("nova_model") || ""
            })
        });

        const rawResponse = await response.text();

        let data;

        try {
            data = JSON.parse(rawResponse);
        } catch {
            throw new Error(
                "The server returned a webpage instead of JSON. Check your Render deployment and API URL."
            );
        }

        if (!response.ok) {
            throw new Error(data.error || "AI request failed.");
        }

        if (!data.reply) {
            throw new Error("The AI returned an empty response.");
        }

        loadingContent.textContent = data.reply;

    } catch (error) {
        loadingContent.textContent =
            "Unable to complete analysis: " + error.message;

        console.error("NOVA error:", error);

    } finally {
        saveHistory();

        isSending = false;
        sendButton.disabled = false;
        sendButton.textContent = "↑";

        messageInput.focus();
    }
});

// RESTORE HISTORY

loadHistory();

console.log("NOVA STUDIO READY");
