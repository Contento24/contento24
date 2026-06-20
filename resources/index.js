const myClientId =
  "client_" +
  Math.random().toString(36).substring(2, 15) +
  Date.now().toString(36);
const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";

let path = window.location.pathname;
if (!path.endsWith("/")) {
  path += "/";
}

let ws;
if (!window.location.host || window.location.host === "") {
  ws = new WebSocket(`ws://127.0.0.1:3000/`);
} else {
  ws = new WebSocket(`${protocol}${window.location.host}${path}`);
}

const chatbox = document.getElementById("chatbox");
const inputElement = document.getElementById("message");
const nicknameElement = document.getElementById("nickname");

inputElement.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    const isMe = data.clientId === myClientId;

    const rowClass = isMe ? "row-me" : "row-other";
    const displayName = isMe
      ? `${escapeHtml(data.nickname)} (我)`
      : escapeHtml(data.nickname);

    const row = document.createElement("div");
    row.className = `message-row ${rowClass}`;
    row.innerHTML = `
                <div class="message-meta">
                    <span class="message-user">${displayName}</span>
                    <span>${escapeHtml(data.time)}</span>
                    <span>${escapeHtml(data.ip)}</span>
                </div>
                <div class="message-card">
                    <div class="message-text">${escapeHtml(data.text)}</div>
                </div>
            `;

    chatbox.appendChild(row);
    chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: "smooth" });
  } catch (err) {
    console.error(err);
  }
};

window.send = function () {
  const text = inputElement.value.trim();
  const nickname = nicknameElement.value.trim() || "匿名迪克";

  if (text && ws.readyState === WebSocket.OPEN) {
    const payload = JSON.stringify({
      clientId: myClientId,
      nickname: nickname,
      text: text,
    });
    ws.send(payload);
    inputElement.value = "";
  }
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"']/g, function (s) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[s];
  });
}
ws.onerror = (err) => {
  console.error("WebSocket error", err);
};
ws.onclose = () => {
  console.log("Disconnected，3秒后重连...");
  setTimeout(initWebSocket, 3000);
};
