
document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const chatArea = document.getElementById("chatMessages");
    const welcome = document.getElementById("welcome");

    const apiKeyInput = document.getElementById("apiKey");
    const modelInput = document.getElementById("modelInput");
    const settingsStatus = document.getElementById("settingsStatus");

    const saveKeyButton = document.getElementById("saveKeyButton");
    const removeKeyButton = document.getElementById("removeKeyButton");
    const saveModelButton = document.getElementById("saveModelButton");

    const selectedMode = document.getElementById("selectedMode");

    let currentMode = "full";
    const defaultModel = "baidu/ernie-5.5-flash-preview:free";

    if (!chatForm || !messageInput || !sendButton || !chatArea) {
        console.error("Capricorn: Chat elements are missing.");
        return;
    }

    // Load settings
    if (apiKeyInput) {
        apiKeyInput.value = sessionStorage.getItem("Capricorn_api_key") || "";
    }

    if (modelInput) {
        modelInput.value =
            localStorage.getItem("Capricorn_model") || defaultModel;
    }

    // Save API key for this browser tab only
    saveKeyButton?.addEventListener("click", () => {
        const key = apiKeyInput.value.trim();

        if (!key) {
            settingsStatus.textContent = "Please enter an API key.";
            return;
        }

        sessionStorage.setItem("Capricorn_api_key", key);
        settingsStatus.textContent = "API key saved for this tab.";
    });

    removeKeyButton?.addEventListener("click", () => {
        sessionStorage.removeItem("Capricorn_api_key");

        if (apiKeyInput) apiKeyInput.value = "";

        settingsStatus.textContent =
            "Saved API key removed. The server key may still be used.";
    });

    // Save selected model
    saveModelButton?.addEventListener("click", () => {
        const model = modelInput.value.trim();

        if (!model) {
            settingsStatus.textContent = "Please enter a model ID.";
            return;
        }

        localStorage.setItem("Capricorn_model", model);
        settingsStatus.textContent = "AI model saved.";
    });

    // Analysis modes
    const modeNames = {
        full: "Full analysis",
        lexical: "Lexical analysis",
        syntactic: "Syntax analysis",
        rhetorical: "Rhetorical analysis",
        formatting: "Formatting analysis"
    };

    document.querySelectorAll(".mode").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".mode").forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");
            currentMode = button.dataset.mode || "full";

            if (selectedMode) {
                selectedMode.textContent = modeNames[currentMode];
            }
        });
    });

    // Create chat messages with the correct CSS classes
    function addMessage(text, sender) {
        const message = document.createElement("div");
        message.className = sender === "user"
            ? "message user"
            : "message ai";

        const label = document.createElement("div");
        label.className = "message-label";
        label.textContent = sender === "user" ? "YOU" : "Capricorn";

        const content = document.createElement("div");
        content.className = "message-content";
        content.textContent = text;

        message.appendChild(label);
        message.appendChild(content);

        chatArea.appendChild(message);

        chatArea.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });

        return content;
    }

    // Send message
    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = messageInput.value.trim();

        if (!message || sendButton.disabled) return;

        if (welcome) welcome.style.display = "none";

        addMessage(message, "user");

        messageInput.value = "";
        messageInput.style.height = "auto";

        sendButton.disabled = true;
        sendButton.setAttribute("aria-label", "Analyzing");
        sendButton.textContent = "…";

        const replyElement = addMessage(
            "Capricorn is analyzing your text...",
            "ai"
        );

        try {
            const apiKey =
                sessionStorage.getItem("Capricorn_api_key") || "";

            const model =
                localStorage.getItem("Capricorn_model") || defaultModel;

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message,
                    apiKey,
                    model,
                    mode: currentMode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "AI request failed.");
            }

            replyElement.textContent = data.reply;

        } catch (error) {
            console.error("Capricorn error:", error);

            replyElement.textContent =
                "Capricorn encountered an error: " + error.message;

        } finally {
            sendButton.disabled = false;
            sendButton.textContent = "↑";
            sendButton.setAttribute("aria-label", "Send message");

            messageInput.focus();
        }
    });

    // Compact, automatically expanding typing box
    messageInput.addEventListener("input", () => {
        messageInput.style.height = "auto";
        messageInput.style.height =
            Math.min(messageInput.scrollHeight, 110) + "px";
    });

    // Enter sends; Shift + Enter creates a new line
    messageInput.addEventListener("keydown", event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.isComposing
        ) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

    // Suggestion buttons
    document.querySelectorAll(".suggestion").forEach(button => {
        button.addEventListener("click", () => {
            messageInput.value = button.dataset.prompt || "";
            messageInput.focus();
            messageInput.dispatchEvent(new Event("input"));
        });
    });

    // New analysis button
    document.getElementById("newChatButton")?.addEventListener("click", () => {
        chatArea.replaceChildren();

        if (welcome) welcome.style.display = "block";

        messageInput.value = "";
        messageInput.style.height = "auto";
        messageInput.focus();
    });

    sendButton.setAttribute("aria-label", "Send message");
});
