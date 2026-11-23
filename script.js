
document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");

    const chatArea =
        document.getElementById("chatMessages") ||
        document.getElementById("messages") ||
        document.querySelector(".chat-messages") ||
        document.querySelector(".messages");

    // Start every page visit with a fresh conversation.
    localStorage.removeItem("nova_chat_history");
    sessionStorage.removeItem("nova_chat_history");

    if (!chatForm || !messageInput || !chatArea) {
        console.error("NOVA: Required chat elements were not found.");
        return;
    }

    function addMessage(text, sender) {
        const message = document.createElement("div");

        message.className = `message ${sender}-message`;
        message.textContent = text;

        chatArea.appendChild(message);
        chatArea.scrollTop = chatArea.scrollHeight;

        return message;
    }

    async function sendMessage(event) {
        event.preventDefault();

        const message = messageInput.value.trim();

        if (!message) return;

        addMessage(message, "user");

        messageInput.value = "";
        messageInput.style.height = "auto";

        sendButton.disabled = true;
        sendButton.textContent = "Analyzing...";

        const loadingMessage = addMessage(
            "NOVA is analyzing your text...",
            "assistant"
        );

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Request failed.");
            }

            loadingMessage.textContent = data.reply;

        } catch (error) {
            loadingMessage.textContent =
                "Error: " + error.message;

            console.error("NOVA request error:", error);

        } finally {
            sendButton.disabled = false;
            sendButton.textContent = "Send";
            messageInput.focus();
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }

    chatForm.addEventListener("submit", sendMessage);

    // Automatically increase the typing box as needed.
    messageInput.addEventListener("input", () => {
        messageInput.style.height = "auto";
        messageInput.style.height =
            Math.min(messageInput.scrollHeight, 100) + "px";
    });

    // Enter sends; Shift + Enter creates a new line.
    messageInput.addEventListener("keydown", (event) => {
        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.isComposing
        ) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

    // Allow suggestion buttons to fill the typing box.
    document.querySelectorAll("[data-prompt]").forEach((button) => {
        button.addEventListener("click", () => {
            messageInput.value = button.dataset.prompt;
            messageInput.focus();
        });
    });

    messageInput.focus();
});
