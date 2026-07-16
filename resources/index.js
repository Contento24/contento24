const myClientId =
  "client_" +
  Math.random().toString(36).substring(2, 15) +
  Date.now().toString(36);

const chatbox = document.getElementById("chatbox");
const inputElement = document.getElementById("message");
const nicknameElement = document.getElementById("nickname");
const statusElement = document.getElementById("connection-status");
const sendButton = document.getElementById("send-button");

let ws;
let reconnectTimer;

function getWebSocketUrl() {
  if (!window.location.host) return "ws://127.0.0.1:3000/";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const pathname = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${protocol}//${window.location.host}${pathname}`;
}

function setConnectionStatus(text, connected) {
  statusElement.textContent = text;
  statusElement.dataset.connected = String(connected);
  sendButton.disabled = !connected;
}

function initWebSocket() {
  clearTimeout(reconnectTimer);
  setConnectionStatus("Connecting…", false);
  ws = new WebSocket(getWebSocketUrl());

  ws.onopen = () => setConnectionStatus("Connected", true);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const isMe = data.clientId === myClientId;
      const row = document.createElement("div");
      row.className = `message-row ${isMe ? "row-me" : "row-other"}`;

      const meta = document.createElement("div");
      meta.className = "message-meta";

      const user = document.createElement("span");
      user.className = "message-user";
      user.textContent = `${data.nickname}${isMe ? " (我)" : ""}`;

      const time = document.createElement("span");
      time.textContent = data.time;

      const card = document.createElement("div");
      card.className = "message-card";
      const messageText = document.createElement("div");
      messageText.className = "message-text";
      messageText.textContent = data.text;

      meta.append(user, time);
      card.appendChild(messageText);
      row.append(meta, card);
      chatbox.appendChild(row);
      chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: "smooth" });
    } catch (err) {
      console.error("Invalid server message", err);
    }
  };

  ws.onerror = (err) => console.error("WebSocket error", err);
  ws.onclose = () => {
    setConnectionStatus("Disconnected, retry after 3 seconds...", false);
    reconnectTimer = setTimeout(initWebSocket, 3000);
  };
}

function send() {
  const text = inputElement.value.trim();
  const nickname = nicknameElement.value.trim() || "匿名迪克";

  if (text && ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ clientId: myClientId, nickname, text }));
    inputElement.value = "";
  }
}

inputElement.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
});
sendButton.addEventListener("click", send);

initWebSocket();
