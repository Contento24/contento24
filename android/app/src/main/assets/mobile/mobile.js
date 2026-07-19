"use strict";

const SERVER_URL = "wss://l.867678.xyz/contento24/";
const MAX_MESSAGES = 200;
const clientId = `android_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;

const ui = {
  shell: document.getElementById("app-shell"),
  connection: document.getElementById("connection-pill"),
  refresh: document.getElementById("refresh-button"),
  connectionLabel: document.getElementById("connection-label"),
  online: document.getElementById("online-count"),
  transcript: document.getElementById("transcript"),
  empty: document.getElementById("empty-state"),
  typingRow: document.getElementById("typing-row"),
  typingLabel: document.getElementById("typing-label"),
  composer: document.getElementById("composer"),
  input: document.getElementById("message-input"),
  count: document.getElementById("character-count"),
  send: document.getElementById("send-button"),
  identityButton: document.getElementById("identity-button"),
  identityName: document.getElementById("identity-name"),
  identityAvatar: document.getElementById("identity-avatar"),
  sheet: document.getElementById("sheet-layer"),
  sheetBackdrop: document.getElementById("sheet-backdrop"),
  nicknameInput: document.getElementById("nickname-input"),
  nicknameCancel: document.getElementById("cancel-nickname"),
  nicknameSave: document.getElementById("save-nickname"),
  toast: document.getElementById("toast"),
};

let socket;
let reconnectTimer;
let reconnectAttempt = 0;
let typingTimer;
let typingActive = false;
let intentionalClose = false;
let toastTimer;
let nickname =
  localStorage.getItem("contento24.android.nickname") || "匿名迪克";

function updateViewport() {
  const viewport = window.visualViewport;
  const height = Math.max(
    240,
    Math.round(viewport ? viewport.height : window.innerHeight),
  );
  const offset = Math.max(0, Math.round(viewport ? viewport.offsetTop : 0));
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--app-offset", `${offset}px`);
  // Chromium may programmatically scroll an overflow-hidden app shell when the
  // IME focuses a field. Reset that internal scroll so only the transcript can
  // move and the composer stays attached to the keyboard edge.
  ui.shell.scrollTop = 0;

  if (document.activeElement === ui.input) {
    requestAnimationFrame(() => scrollToLatest(false));
  }
}

let viewportFrame;
function scheduleViewportUpdate() {
  cancelAnimationFrame(viewportFrame);
  viewportFrame = requestAnimationFrame(updateViewport);
}

window.addEventListener("resize", scheduleViewportUpdate);
window.visualViewport?.addEventListener("resize", scheduleViewportUpdate);
window.visualViewport?.addEventListener("scroll", scheduleViewportUpdate);
updateViewport();

function setIdentity(value) {
  nickname = value.trim().slice(0, 30) || "匿名迪克";
  localStorage.setItem("contento24.android.nickname", nickname);
  ui.identityName.textContent = nickname;
  ui.identityAvatar.textContent = Array.from(nickname)[0] || "匿";
}

function setConnection(state, label) {
  ui.connection.dataset.state = state;
  ui.connectionLabel.textContent = label;
  ui.send.disabled = state !== "online" || !ui.input.value.trim();
  if (state !== "online") {
    ui.online.textContent = "–";
    showTyping(0);
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("visible");
  toastTimer = setTimeout(() => ui.toast.classList.remove("visible"), 2200);
}

function connect() {
  clearTimeout(reconnectTimer);
  setConnection("connecting", reconnectAttempt ? "重新连接" : "正在连接");

  try {
    socket = new WebSocket(SERVER_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    const wasRetry = reconnectAttempt > 0;
    reconnectAttempt = 0;
    setConnection("online", "连接正常");
    if (wasRetry) showToast("已重新连接到 867678 服务器");
  });

  socket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (payload.type === "presence") {
      const count = Number.isInteger(payload.onlineCount)
        ? Math.max(0, payload.onlineCount)
        : 0;
      ui.online.textContent = String(count);
      return;
    }

    if (payload.type === "typing") {
      showTyping(payload.typingCount);
      return;
    }

    if (payload.type === "message") renderMessage(payload);
  });

  socket.addEventListener("error", () => setConnection("offline", "连接异常"));
  socket.addEventListener("close", () => {
    if (intentionalClose) return;
    setConnection("offline", "连接中断");
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  reconnectAttempt += 1;
  const delay = Math.min(12000, 2000 + reconnectAttempt * 1000);
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, delay);
}

function showTyping(value) {
  const count = Number.isInteger(value) ? Math.max(0, value) : 0;
  ui.typingLabel.textContent = count ? `${count} 人正在输入` : "";
  ui.typingRow.classList.toggle("visible", count > 0);
}

function sendTyping(active) {
  if (typingActive === active) return;
  typingActive = active;
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "typing", clientId, isTyping: active }));
  }
}

function platformName(key) {
  return (
    {
      android: "Android",
      ios: "iOS",
      macos: "macOS",
      windows: "Windows",
      linux: "Linux",
      chromeos: "ChromeOS",
    }[key] || "Web"
  );
}

function renderMessage(data) {
  if (typeof data.text !== "string" || !data.text.trim()) return;
  ui.empty?.remove();
  ui.empty = null;

  const own = data.clientId === clientId;
  const message = document.createElement("article");
  message.className = `message${own ? " own" : ""}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  const sender = document.createElement("strong");
  sender.textContent = `${String(data.nickname || "匿名迪克").slice(0, 30)}${own ? " · 我" : ""}`;
  const platform = document.createElement("span");
  platform.className = "platform";
  platform.textContent = platformName(data.system);
  const time = document.createElement("span");
  time.textContent = String(data.time || "");
  meta.append(sender, platform, time);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = data.text.slice(0, 2000);
  message.append(meta, bubble);
  ui.transcript.appendChild(message);

  while (ui.transcript.querySelectorAll(".message").length > MAX_MESSAGES) {
    ui.transcript.querySelector(".message")?.remove();
  }
  scrollToLatest(true);
}

function scrollToLatest(smooth) {
  ui.transcript.scrollTo({
    top: ui.transcript.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

function resizeComposer() {
  ui.input.style.height = "43px";
  ui.input.style.height = `${Math.min(104, Math.max(43, ui.input.scrollHeight))}px`;
  const length = ui.input.value.length;
  ui.count.textContent = `${length}/2000`;
  ui.composer.classList.toggle("has-text", length > 0);
  ui.send.disabled =
    socket?.readyState !== WebSocket.OPEN || !ui.input.value.trim();
}

function sendMessage() {
  const text = ui.input.value.trim();
  if (!text || socket?.readyState !== WebSocket.OPEN) {
    if (socket?.readyState !== WebSocket.OPEN)
      showToast("服务器尚未连接，请稍后再试");
    return;
  }

  clearTimeout(typingTimer);
  sendTyping(false);
  socket.send(JSON.stringify({ clientId, nickname, system: "android", text }));
  ui.input.value = "";
  resizeComposer();
  ui.send.classList.remove("sending");
  void ui.send.offsetWidth;
  ui.send.classList.add("sending");
  setTimeout(() => ui.send.classList.remove("sending"), 360);
}

ui.input.addEventListener("input", () => {
  resizeComposer();
  clearTimeout(typingTimer);
  if (!ui.input.value.trim()) {
    sendTyping(false);
    return;
  }
  sendTyping(true);
  typingTimer = setTimeout(() => sendTyping(false), 1500);
});

ui.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});

ui.input.addEventListener("focus", () => {
  document.body.classList.add("ime-open");
  setTimeout(() => {
    scheduleViewportUpdate();
    scrollToLatest(false);
  }, 120);
  setTimeout(() => {
    scheduleViewportUpdate();
    scrollToLatest(false);
  }, 360);
});

ui.input.addEventListener("blur", () => {
  document.body.classList.remove("ime-open");
  setTimeout(scheduleViewportUpdate, 80);
});

ui.send.addEventListener("click", sendMessage);

ui.refresh.addEventListener("click", () => {
  ui.refresh.disabled = true;
  ui.refresh.classList.add("refreshing");
  setConnection("connecting", "正在刷新");
  setTimeout(() => window.location.reload(), 180);
});

function openIdentitySheet() {
  ui.nicknameInput.value = nickname;
  ui.sheet.classList.add("open");
  ui.sheet.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    ui.nicknameInput.focus();
    ui.nicknameInput.setSelectionRange(
      ui.nicknameInput.value.length,
      ui.nicknameInput.value.length,
    );
  }, 260);
}

function closeIdentitySheet() {
  ui.nicknameInput.blur();
  ui.sheet.classList.remove("open");
  ui.sheet.setAttribute("aria-hidden", "true");
}

function saveIdentity() {
  setIdentity(ui.nicknameInput.value);
  closeIdentitySheet();
  showToast("昵称已更新");
}

ui.identityButton.addEventListener("click", openIdentitySheet);
ui.sheetBackdrop.addEventListener("click", closeIdentitySheet);
ui.nicknameCancel.addEventListener("click", closeIdentitySheet);
ui.nicknameSave.addEventListener("click", saveIdentity);
ui.nicknameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveIdentity();
  }
});

window.addEventListener("beforeunload", () => {
  intentionalClose = true;
  clearTimeout(reconnectTimer);
  clearTimeout(typingTimer);
  sendTyping(false);
  socket?.close();
});

setIdentity(nickname);
resizeComposer();
connect();
