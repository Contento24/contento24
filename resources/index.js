const myClientId =
  "client_" +
  Math.random().toString(36).substring(2, 15) +
  Date.now().toString(36);

const chatbox = document.getElementById("chatbox");
const chatContainer = document.getElementById("chat-container");
const chatEmptyState = document.getElementById("chat-empty-state");
const inputElement = document.getElementById("message");
const nicknameElement = document.getElementById("nickname");
const nicknameEditor = document.getElementById("nickname-editor");
const nicknameToggle = document.getElementById("nickname-toggle");
const statusElement = document.getElementById("connection-status");
const statusTextElement = document.getElementById("connection-status-text");
const onlineCountElement = document.getElementById("online-count");
const typingIndicator = document.getElementById("typing-indicator");
const typingText = document.getElementById("typing-text");
const sendButton = document.getElementById("send-button");
const welcomeScreen = document.getElementById("welcome-screen");
const welcomeWidget = document.getElementById("welcome-widget");
const welcomePrefix = document.getElementById("welcome-prefix");
const welcomeBrand = document.getElementById("welcome-brand");
const welcomeSuffix = document.getElementById("welcome-suffix");

const welcomeTranslations = [
  { prefix: "", suffix: "へようこそ", position: "before", lang: "ja" },
];

async function refreshWelcomeText(translation) {
  if (!welcomeWidget?.isConnected) return;

  const whiteParts = [welcomePrefix, welcomeSuffix];
  const outgoingAnimations = whiteParts.map((element) =>
    element.animate(
      [
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        {
          opacity: 0.08,
          transform: "translateY(-4px)",
          filter: "blur(3.5px)",
        },
      ],
      {
        duration: 230,
        easing: "cubic-bezier(0.4, 0, 0.6, 1)",
        fill: "forwards",
      },
    ),
  );
  await Promise.allSettled(
    outgoingAnimations.map((animation) => animation.finished),
  );

  const oldBrandPosition = welcomeBrand.getBoundingClientRect();
  welcomePrefix.textContent = translation.prefix;
  welcomeSuffix.textContent = translation.suffix;
  welcomeWidget.dataset.brandPosition = translation.position;
  welcomeWidget.lang = translation.lang;
  const newBrandPosition = welcomeBrand.getBoundingClientRect();
  const movement = oldBrandPosition.left - newBrandPosition.left;
  const overshoot = movement === 0 ? 0 : movement > 0 ? -1.2 : 1.2;
  outgoingAnimations.forEach((animation) => animation.cancel());

  welcomeBrand.animate(
    [
      { transform: `translateX(${movement}px)`, filter: "blur(0)" },
      {
        offset: 0.44,
        transform: `translateX(${movement * 0.28}px)`,
        filter: "blur(1.4px)",
      },
      {
        offset: 0.8,
        transform: `translateX(${overshoot}px)`,
        filter: "blur(0)",
      },
      { transform: "translateX(0)", filter: "blur(0)" },
    ],
    { duration: 980, easing: "cubic-bezier(0.2, 0.9, 0.25, 1)" },
  );

  whiteParts.forEach((element) => {
    element.animate(
      [
        {
          opacity: 0.08,
          transform: "translateY(5px)",
          filter: "blur(4px)",
        },
        {
          offset: 0.64,
          opacity: 1,
          transform: "translateY(-0.5px)",
          filter: "blur(0)",
        },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      { duration: 680, easing: "cubic-bezier(0.2, 0.9, 0.25, 1)" },
    );
  });
}

async function runWelcomeFinale() {
  if (!welcomeWidget?.isConnected) return;

  const visibleWhiteParts = [welcomePrefix, welcomeSuffix].filter((element) =>
    element.textContent.trim(),
  );
  const whiteExitAnimations = visibleWhiteParts.map((element) =>
    element.animate(
      [
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        {
          opacity: 0,
          transform: "translateY(-5px)",
          filter: "blur(6px)",
        },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.4, 0, 0.6, 1)",
        fill: "forwards",
      },
    ),
  );
  await Promise.allSettled(
    whiteExitAnimations.map((animation) => animation.finished),
  );

  const oldBrandPosition = welcomeBrand.getBoundingClientRect();
  welcomePrefix.textContent = "";
  welcomeSuffix.textContent = "";
  const centeredBrandPosition = welcomeBrand.getBoundingClientRect();
  const movement = oldBrandPosition.left - centeredBrandPosition.left;
  whiteExitAnimations.forEach((animation) => animation.cancel());

  const centeringAnimation = welcomeBrand.animate(
    [
      { transform: `translateX(${movement}px)`, filter: "blur(0)" },
      {
        offset: 0.52,
        transform: `translateX(${movement * 0.24}px)`,
        filter: "blur(1.2px)",
      },
      { transform: "translateX(0)", filter: "blur(0)" },
    ],
    { duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
  await Promise.allSettled([centeringAnimation.finished]);

  if (welcomeWidget.isConnected) welcomeWidget.classList.add("is-finalizing");
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  welcomeTranslations.forEach((translation, index) => {
    setTimeout(() => refreshWelcomeText(translation), (index + 1) * 1400);
  });
  setTimeout(runWelcomeFinale, 2650);
}

welcomeScreen?.addEventListener("animationend", (event) => {
  if (event.target === welcomeScreen) welcomeScreen.remove();
});

let ws;
let reconnectTimer;
let sendGlowTimer;
let typingIdleTimer;
let isTyping = false;
let isComposing = false;

function setNicknameEditorOpen(open) {
  nicknameEditor.classList.toggle("is-open", open);
  nicknameToggle.setAttribute("aria-expanded", String(open));
  nicknameToggle.title = open ? "收起昵称编辑" : "编辑昵称";

  if (open) {
    requestAnimationFrame(() => {
      nicknameElement.focus();
      nicknameElement.select();
    });
  }
}

function revealFirstMessage() {
  if (!chatContainer.classList.contains("is-empty")) return;
  chatEmptyState.classList.add("is-leaving");
  chatContainer.classList.remove("is-empty");
  setTimeout(() => chatEmptyState.remove(), 380);
}

nicknameToggle.addEventListener("click", () => {
  setNicknameEditorOpen(!nicknameEditor.classList.contains("is-open"));
});
nicknameElement.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNicknameEditorOpen(false);
    nicknameToggle.focus();
  }
});
document.addEventListener("pointerdown", (event) => {
  if (
    nicknameEditor.classList.contains("is-open") &&
    !nicknameEditor.contains(event.target)
  ) {
    setNicknameEditorOpen(false);
  }
});

const systemDetails = {
  windows: {
    name: "Windows",
    icon: '<svg viewBox="0 0 24 24"><path d="M2 3.4 11 2.2v9.3H2V3.4Zm10 8.1V2l10-1.4v10.9H12ZM2 12.5h9v9.3l-9-1.2v-8.1Zm10 0h10v10.9L12 22v-9.5Z"/></svg>',
  },
  macos: {
    name: "macOS",
    icon: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" fill="#78c7ff"/><path d="M12 2h5a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5h-5V2Z" fill="#d9f0ff"/><path d="M12 2c.1 3.4-1.6 5.3-3 7.2-.7.9-1.1 1.9-1 3" fill="none" stroke="#173b63" stroke-width="1.25"/><path d="M7.1 9.2v1.5M16.8 9.2v1.5M6.8 15.1c1.2 2 3 2.9 5.2 2.9s4-.9 5.2-2.9" fill="none" stroke="#173b63" stroke-linecap="round" stroke-width="1.25"/></svg>',
  },
  ios: {
    name: "iOS",
    icon: '<svg viewBox="0 0 24 28"><path d="M16.7 13.5c0-3 2.5-4.4 2.6-4.5-1.4-2.1-3.6-2.3-4.4-2.3-1.9-.2-3.7 1.1-4.6 1.1-1 0-2.4-1.1-4-1.1-2.1 0-4 1.2-5.1 3.1-2.2 3.8-.6 9.4 1.6 12.5 1.1 1.5 2.3 3.2 4 3.1 1.6-.1 2.2-1 4.2-1s2.5 1 4.2.9c1.7 0 2.8-1.5 3.8-3 1.2-1.8 1.7-3.5 1.7-3.6-.1 0-3.4-1.3-3.4-5.2ZM13.7 4.7c.9-1.1 1.5-2.6 1.3-4.1-1.3.1-2.8.9-3.7 2-.8.9-1.5 2.4-1.3 3.8 1.4.1 2.8-.7 3.7-1.7Z"/></svg>',
  },
  android: {
    name: "Android",
    icon: '<svg viewBox="0 0 24 24"><path d="m7.2 5.4-1.4-2a.7.7 0 0 1 1.1-.8l1.5 2.1A8.6 8.6 0 0 1 12 4c1.3 0 2.5.3 3.6.7l1.5-2.1a.7.7 0 0 1 1.1.8l-1.4 2A7.4 7.4 0 0 1 20 11H4a7.4 7.4 0 0 1 3.2-5.6ZM8 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM4 12h16v6a2 2 0 0 1-2 2h-1v2a1 1 0 0 1-2 0v-2H9v2a1 1 0 0 1-2 0v-2H6a2 2 0 0 1-2-2v-6Z"/></svg>',
  },
  linux: {
    name: "Linux",
    icon: '<svg viewBox="0 0 24 24"><path d="M12 1.5c-3 0-4.2 2.7-4 5.4-1.8 1.7-3 4.4-3 7.3 0 2.1.8 3.2 2 3.7-.7.8-1.5 1.5-2.4 2.1-.5.4-.2 1.2.4 1.2 1.8 0 3.3-.4 4.4-1.2.8.5 1.7.7 2.6.7s1.8-.2 2.6-.7c1.1.8 2.6 1.2 4.4 1.2.6 0 .9-.8.4-1.2-.9-.6-1.7-1.3-2.4-2.1 1.2-.5 2-1.6 2-3.7 0-2.9-1.2-5.6-3-7.3.2-2.7-1-5.4-4-5.4Z"/><ellipse cx="12" cy="14" rx="4.5" ry="5.2" fill="#f8fafc"/><circle cx="10" cy="6" r="1" fill="#f8fafc"/><circle cx="14" cy="6" r="1" fill="#f8fafc"/><path d="m9.7 8.2 2.3-1 2.3 1-2.3 1.6-2.3-1.6Z" fill="#fbbf24"/></svg>',
  },
  chromeos: {
    name: "ChromeOS",
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ef4444"/><path d="M12 12 4.3 20.2A10 10 0 0 1 2.6 8h9.4Z" fill="#22c55e"/><path d="M12 12h9.4a10 10 0 0 1-17.1 8.2Z" fill="#facc15"/><circle cx="12" cy="12" r="4.2" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.3"/></svg>',
  },
  unknown: {
    name: "未知系统",
    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>',
  },
};

function detectSystem() {
  const userAgentDataPlatform = navigator.userAgentData?.platform || "";
  const source = `${userAgentDataPlatform} ${navigator.platform || ""} ${navigator.userAgent || ""}`;

  if (/CrOS/i.test(source)) return "chromeos";
  if (/Android/i.test(source)) return "android";
  if (/iPhone|iPad|iPod/i.test(source)) return "ios";
  if (/Mac/i.test(source) && navigator.maxTouchPoints > 1) return "ios";
  if (/Win/i.test(source)) return "windows";
  if (/Mac/i.test(source)) return "macos";
  if (/Linux|X11/i.test(source)) return "linux";
  return "unknown";
}

const currentSystem = detectSystem();

function getWebSocketUrl() {
  if (!window.location.host) return "ws://127.0.0.1:3000/";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const pathname = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${protocol}//${window.location.host}${pathname}`;
}

function setConnectionStatus(text, connected) {
  statusElement.setAttribute("aria-label", text);
  statusElement.title = text;
  statusTextElement.textContent = text;
  statusElement.dataset.connected = String(connected);
  if (!connected) {
    onlineCountElement.textContent = "–";
    onlineCountElement.title = "连接后显示在线人数";
    setTypingCount(0);
  }
  sendButton.disabled = !connected;
}

function setTypingCount(count) {
  const safeCount = Number.isInteger(count) && count > 0 ? count : 0;
  typingText.textContent = safeCount > 0 ? `${safeCount} 人正在输入` : "";
  typingIndicator.classList.toggle("is-visible", safeCount > 0);
}

function sendTypingState(nextState) {
  if (isTyping === nextState) return;
  isTyping = nextState;
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "typing",
        clientId: myClientId,
        isTyping: nextState,
      }),
    );
  }
}

function setOnlineCount(count) {
  const safeCount = Number.isInteger(count) && count >= 0 ? count : 0;
  onlineCountElement.textContent = String(safeCount);
  onlineCountElement.title = `${safeCount} 人在线`;
  onlineCountElement.classList.remove("count-updated");
  void onlineCountElement.offsetWidth;
  onlineCountElement.classList.add("count-updated");
}

function initWebSocket() {
  clearTimeout(reconnectTimer);
  setConnectionStatus("正在连接…", false);
  ws = new WebSocket(getWebSocketUrl());

  ws.onopen = () => setConnectionStatus("已连接", true);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "presence") {
        setOnlineCount(data.onlineCount);
        return;
      }
      if (data.type === "typing") {
        setTypingCount(data.typingCount);
        return;
      }

      revealFirstMessage();

      const isMe = data.clientId === myClientId;
      const row = document.createElement("div");
      row.className = `message-row ${isMe ? "row-me" : "row-other"}`;

      const meta = document.createElement("div");
      meta.className = "message-meta";

      const user = document.createElement("span");
      user.className = "message-user";
      user.textContent = `${data.nickname}${isMe ? " (我)" : ""}`;

      const identity = document.createElement("div");
      identity.className = "message-identity";

      const systemKey = systemDetails[data.system] ? data.system : "unknown";
      const systemInfo = systemDetails[systemKey];
      const system = document.createElement("span");
      system.className = `message-system system-${systemKey}`;

      const systemIcon = document.createElement("span");
      systemIcon.className = "system-icon";
      systemIcon.setAttribute("aria-hidden", "true");
      systemIcon.innerHTML = systemInfo.icon;

      const systemName = document.createElement("span");
      systemName.textContent = systemInfo.name;
      system.append(systemIcon, systemName);
      identity.append(user, system);

      const time = document.createElement("span");
      time.textContent = data.time;

      const card = document.createElement("div");
      card.className = "message-card";
      const messageText = document.createElement("div");
      messageText.className = "message-text";
      messageText.textContent = data.text;

      meta.append(identity, time);
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
    clearTimeout(typingIdleTimer);
    isTyping = false;
    setConnectionStatus("失去连接，将在3秒钟后重试...", false);
    reconnectTimer = setTimeout(initWebSocket, 3000);
  };
}

const destructionEgg = {
  prompt: "root@contento24",
  lineDelay: 460,
  revealDelay: 3100,
  theme: "green",
  environment: "UNI RECOVERY ENVIRONMENT",
  status: "SECURE",
  mark: "24",
  kicker: "OPERATION COMPLETE",
  headline: "Nice try.",
  body: "消息本就阅后即逝。<br />你删了个寂寞。",
  messages: [
    "[  OK  ] Elevated privileges granted.",
    "[  OK  ] Locating persistent chat history...",
    "[ WARN ] No persistent records found.",
    "[  OK  ] Purging 0 archived messages.",
    "[  OK  ] Clearing imaginary cache... 100%",
    "[ DONE ] Nothing was destroyed.",
  ],
};

const easterEggProfiles = new Map([
  ["sudo rm -rf /*", destructionEgg],
  ["rm -rf /*", destructionEgg],
  ["rm -rf /", destructionEgg],
  [
    "BAM",
    {
      variant: "quarantine",
      lineDelay: 300,
      theme: "red",
      environment: "CONTENT QUARANTINE",
      status: "BLOCKED",
      mark: "!",
      kicker: "CONTENT REJECTED",
      headline: "到此为止。",
      body: "BAM 与心雨相关内容不受欢迎，<br />晦气不应该出现在 Contento24 中。",
      messages: [
        "[ SCAN ] Unwelcome keyword detected.",
        "[ HOLD ] Message transmission suspended.",
        "[  OK  ] No content was broadcast.",
        "[  OK  ] Conversation atmosphere preserved.",
        "[ DONE ] Input moved to quarantine.",
      ],
    },
  ],
  [
    ":(){ :|:& };:",
    {
      variant: "panic",
      lineDelay: 300,
      theme: "red",
      environment: "PROCESS CONTAINMENT UNIT",
      status: "ISOLATED",
      mark: ":&",
      kicker: "FORK BOMB CONTAINED",
      headline: "Nice fork.",
      body: "无限递归已被关进 /dev/null。<br />CPU 松了一口气。",
      messages: [
        "[ WARN ] Recursive function signature detected.",
        "[  OK  ] Cgroup containment enabled.",
        "[  OK  ] Process limit set to: absolutely not.",
        "[  OK  ] Forks redirected to /dev/null.",
        "[  OK  ] Load average restored to 0.24.",
        "[ DONE ] Timeline preserved.",
      ],
    },
  ],
  [
    "sudo apt install girlfriend",
    {
      variant: "apt",
      theme: "amber",
      environment: "APT PACKAGE MANAGER",
      status: "ONLINE",
      mark: "404",
      kicker: "PACKAGE RESOLUTION FAILED",
      headline: "Unable to locate package.",
      body: "也许先试试 sudo apt update？<br />但仓库里大概还是没有。",
      messages: [
        "Reading package lists... Done",
        "Building dependency tree... Done",
        "Reading state information... Done",
        "E: Unable to locate package girlfriend",
        "[ HINT ] Check your social repositories.",
        "[ DONE ] 0 newly installed, 0 removed.",
      ],
    },
  ],
  [
    "sudo apt update",
    {
      variant: "apt",
      theme: "amber",
      environment: "APT SOURCE REFRESH",
      status: "UP TO DATE",
      mark: "APT",
      kicker: "PACKAGE LISTS UPDATED",
      headline: "All repositories refreshed.",
      body: "软件源已经是最新的。<br />只有聊天记录依然拒绝持久化。",
      messages: [
        "Hit:1 https://repo.contento24.local stable InRelease",
        "Get:2 https://mirrors.uni.chat ephemeral/main amd64 Packages",
        "Hit:3 https://archive.linux.org penguin InRelease",
        "Fetched 24.0 kB in 0s (∞ kB/s)",
        "Reading package lists... Done",
        "All packages are up to date.",
      ],
    },
  ],
  [
    "pacman -Syu",
    {
      variant: "arch",
      lineDelay: 360,
      theme: "blue",
      environment: "ARCH ROLLING RELEASE",
      status: "BLEEDING EDGE",
      mark: "A",
      kicker: "FULL SYSTEM UPGRADE",
      headline: "btw, I use Arch.",
      body: "系统已滚到最新。<br />没有任何东西坏掉——暂时。",
      messages: [
        ":: Synchronizing package databases...",
        " core is up to date",
        " extra is up to date",
        ":: Starting full system upgrade...",
        "warning: contento24 is newer than the mirror",
        "[ DONE ] There is nothing to do.",
      ],
    },
  ],
  [
    "brew update",
    {
      variant: "brew",
      theme: "amber",
      environment: "HOMEBREW UPDATE SERVICE",
      status: "POURED",
      mark: "🍺",
      kicker: "HOMEBREW UPDATED",
      headline: "Already up-to-date.",
      body: "酒已经是最新的。<br />消息仍然只供应到刷新之前。",
      messages: [
        "==> Updating Homebrew...",
        "Updated 2 taps (homebrew/core and contento24/tap).",
        "==> New Formulae",
        "ephemeral-chat    midnight-glass",
        "==> Outdated Formulae",
        "persistent-history",
      ],
    },
  ],
  [
    "brew upgrade",
    {
      variant: "brew",
      theme: "amber",
      environment: "HOMEBREW CELLAR",
      status: "LATEST",
      mark: "↑",
      kicker: "UPGRADE COMPLETE",
      headline: "Everything has been poured.",
      body: "所有配方都升级完成。<br />旧消息则被留在了上一杯里。",
      messages: [
        "==> Upgrading 2 outdated packages:",
        "contento24 23.9 -> 24.0",
        "websocket 8.20 -> 8.24",
        "==> Pouring contento24--24.0.arm64.bottle.tar.gz",
        "🍺  /opt/homebrew/Cellar/contento24/24.0",
        "==> Running `brew cleanup contento24`...",
      ],
    },
  ],
  [
    "brew doctor",
    {
      variant: "doctor",
      lineDelay: 520,
      theme: "cyan",
      environment: "HOMEBREW DIAGNOSTICS",
      status: "HEALTHY",
      mark: "+",
      kicker: "DIAGNOSTICS COMPLETE",
      headline: "Your system is ready to brew.",
      body: "没有发现严重问题。<br />除了你似乎还在寻找已经消失的消息。",
      messages: [
        "Please note that these warnings are just used to help Homebrew maintainers",
        "diagnose issues if you file one.",
        "Checking taps... OK",
        "Checking Cellar permissions... OK",
        "Checking ephemeral message cache... empty",
        "Your system is ready to brew.",
      ],
    },
  ],
  [
    "brew list",
    {
      variant: "cellar",
      theme: "blue",
      environment: "HOMEBREW CELLAR INDEX",
      status: "5 KEGS",
      mark: "//",
      kicker: "INSTALLED FORMULAE",
      headline: "A very small cellar.",
      body: "这里只有聊天需要的配方。<br />没有任何聊天记录桶装保存。",
      messages: [
        "contento24",
        "ephemeral-chat",
        "midnight-glass",
        "pingfang-semibold",
        "websocket",
        "[ DONE ] 5 formulae listed.",
      ],
    },
  ],
  [
    "brew install contento24",
    {
      variant: "brew",
      theme: "purple",
      environment: "HOMEBREW INSTALLER",
      status: "KEGGED",
      mark: "24",
      kicker: "INSTALLATION COMPLETE",
      headline: "Uni Contento24 installed.",
      body: "安装成功，但无需启动。<br />你已经身处 Contento24 之中。",
      messages: [
        "==> Fetching contento24",
        "==> Downloading contento24--24.0.arm64.bottle.tar.gz",
        "==> Pouring contento24--24.0.arm64.bottle.tar.gz",
        "==> Caveats: messages vanish after refresh",
        "🍺  /opt/homebrew/Cellar/contento24/24.0: 24 files",
        "==> Installation successful!",
      ],
    },
  ],
  [
    "neofetch",
    {
      variant: "fetch",
      lineDelay: 180,
      theme: "cyan",
      environment: "CONTENTOOS SYSTEM INFO",
      status: "TTY24",
      mark: "UNI",
      kicker: "SYSTEM INFORMATION",
      headline: "ContentoOS 24",
      body: "OS: ContentoOS 24<br />Uptime: until refresh<br />Messages: ephemeral",
      messages: [
        "user@contento24",
        "-----------------",
        "OS: ContentoOS 24 x86_64",
        "Shell: websocket 8.21.1",
        "Theme: Midnight Glass",
        "Memory: 0 archived messages",
      ],
    },
  ],
  [
    "fastfetch",
    {
      variant: "fetch fast",
      lineDelay: 90,
      theme: "blue",
      environment: "CONTENTOOS FASTFETCH",
      status: "6ms",
      mark: "C24",
      kicker: "SYSTEM SNAPSHOT",
      headline: "Fast enough?",
      body: "系统信息已在眨眼前读取完毕。<br />缓存：没有，聊天记录也是。",
      messages: [
        "contento@uni",
        "-------------",
        "OS: ContentoOS 24 (Ephemeral)",
        "Host: Uni Contento24 WebSocket",
        "Kernel: 24.0.0-vanish",
        "Uptime: one refresh",
      ],
    },
  ],
  [
    "uname -a",
    {
      variant: "kernel",
      lineDelay: 240,
      theme: "cyan",
      environment: "KERNEL IDENTITY SERVICE",
      status: "GNU/LINUX",
      mark: "🐧",
      kicker: "KERNEL REPLIED",
      headline: "Yes, it runs Linux.",
      body: "内核知道你是谁。<br />但刷新之后，它会假装没见过你。",
      messages: [
        "Linux contento24 24.0.0-vanish #1 SMP PREEMPT_DYNAMIC",
        "Uni ContentoOS GNU/Linux x86_64",
        "Build: ephemeral-messages@midnight-glass",
        "Hostname: contento24.local",
        "Session lifetime: until refresh",
        "[ DONE ] Kernel identity confirmed.",
      ],
    },
  ],
  [
    "sl",
    {
      variant: "train",
      lineDelay: 220,
      theme: "amber",
      environment: "STEAM LOCOMOTIVE SERVICE",
      status: "DELAYED",
      mark: "SL",
      kicker: "TYPO DETECTED",
      headline: "你是不是想输入 ls？",
      body: "火车已经开走了。<br />下次手速慢一点。",
      messages: [
        "      ====        ________                ___________",
        "  _D _|  |_______/        \\__I_I_____===__|_________|",
        "   |(_)---  |   H\\________/ |   |        =|___ ___|",
        "   /     |  |   H  |  |     |   |         ||_| |_||",
        "  |      |  |   H  |__--------------------| [___] |",
        "[ DONE ] Choo choo.",
      ],
    },
  ],
  [
    "ls",
    {
      variant: "files",
      lineDelay: 180,
      theme: "cyan",
      environment: "CONTENTO24 FILE SYSTEM",
      status: "READ ONLY",
      mark: "~/",
      kicker: "DIRECTORY LISTING",
      headline: "这里空得很干净。",
      body: "聊天记录不住在磁盘里。<br />刷新之后，连目录都不记得你。",
      messages: [
        "drwxr-xr-x  1 user user  24 Jul 16  contento24/",
        "-rw-------  1 user user   0 Jul 16  chat_history",
        "lrwxrwxrwx  1 user user   9 Jul 16  memories -> /dev/null",
        "-rwxr-xr-x  1 user user  24 Jul 16  welcome.sh",
        "-rw-r--r--  1 user user  42 Jul 16  README.md",
        "[ DONE ] 0 persistent messages found.",
      ],
    },
  ],
  [
    "sudo make me a sandwich",
    {
      variant: "sandwich",
      lineDelay: 430,
      theme: "purple",
      environment: "SUDO POLICY SERVICE",
      status: "AUTHORIZED",
      mark: "🥪",
      kicker: "PRIVILEGES ACCEPTED",
      headline: "Okay.",
      body: "权限验证通过。<br />这是你的三明治。",
      messages: [
        "[sudo] password for user: ********",
        "Checking /etc/sudoers...",
        "User may run sandwich commands.",
        "Slicing dependencies...",
        "Installing lettuce and cheese...",
        "[ DONE ] Sandwich created successfully.",
      ],
    },
  ],
]);

function send() {
  const text = inputElement.value.trim();
  const nickname = nicknameElement.value.trim() || "匿名迪克";

  if (text && ws?.readyState === WebSocket.OPEN) {
    clearTimeout(typingIdleTimer);
    sendTypingState(false);

    if (easterEggProfiles.has(text)) {
      inputElement.value = "";
      triggerEasterEgg(text);
      return;
    }

    clearTimeout(sendGlowTimer);
    sendButton.classList.remove("is-sending");
    void sendButton.offsetWidth;
    sendButton.classList.add("is-sending");
    sendGlowTimer = setTimeout(() => {
      sendButton.classList.remove("is-sending");
    }, 900);

    ws.send(
      JSON.stringify({
        clientId: myClientId,
        nickname,
        system: currentSystem,
        text,
      }),
    );
    inputElement.value = "";
  }
}

let easterEggActive = false;

function triggerEasterEgg(command) {
  if (easterEggActive) return;
  const profile = easterEggProfiles.get(command);
  if (!profile) return;
  easterEggActive = true;

  const overlay = document.createElement("section");
  const variants = profile.variant
    ? profile.variant
        .split(" ")
        .map((variant) => `variant-${variant}`)
        .join(" ")
    : "variant-destruction";
  overlay.className = `easter-egg theme-${profile.theme} ${variants}`;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Uni Contento24 彩蛋");

  const terminal = document.createElement("div");
  terminal.className = "easter-terminal";
  terminal.innerHTML = `
    <div class="easter-terminal-bar">
      <span class="terminal-lights" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>${profile.environment}</span>
      <span class="terminal-secure">${profile.status}</span>
    </div>
    <div class="easter-terminal-body">
      <div class="easter-command"><span>${profile.prompt || "user@contento24"}</span>:~% ${command}<i class="terminal-cursor" aria-hidden="true"></i></div>
      <div class="easter-log" id="easter-log" aria-live="polite"></div>
      <div class="easter-result" id="easter-result">
        <div class="easter-mark" aria-hidden="true">${profile.mark}</div>
        <p class="easter-kicker">${profile.kicker}</p>
        <h1>${profile.headline}</h1>
        <p>${profile.body}</p>
        <button type="button" id="easter-return">${profile.actionLabel || "返回聊天室"}</button>
      </div>
    </div>
  `;
  overlay.appendChild(terminal);
  document.body.appendChild(overlay);
  document.body.classList.add("easter-egg-open");
  requestAnimationFrame(() => overlay.classList.add("is-active"));

  const log = terminal.querySelector("#easter-log");
  const result = terminal.querySelector("#easter-result");
  const returnButton = terminal.querySelector("#easter-return");
  const lineDelay = profile.lineDelay || 420;
  const messages = profile.messages.map((message, index) => [
    240 + index * lineDelay,
    message,
  ]);
  const timers = messages.map(([delay, message]) =>
    setTimeout(() => {
      const line = document.createElement("div");
      line.textContent = message;
      log.appendChild(line);
    }, delay),
  );

  const revealDelay =
    profile.revealDelay || 520 + profile.messages.length * lineDelay;
  const revealTimer = setTimeout(() => {
    terminal.classList.add("is-complete");
    result.classList.add("is-visible");
    returnButton.focus();
  }, revealDelay);
  timers.push(revealTimer);

  function closeEasterEgg() {
    timers.forEach(clearTimeout);
    document.removeEventListener("keydown", handleEasterKeydown);
    overlay.classList.remove("is-active");
    document.body.classList.remove("easter-egg-open");
    setTimeout(() => overlay.remove(), 620);
    easterEggActive = false;
    inputElement.focus();
  }

  function handleEasterKeydown(event) {
    if (event.key === "Escape") closeEasterEgg();
  }

  returnButton.addEventListener("click", closeEasterEgg);
  document.addEventListener("keydown", handleEasterKeydown);
}

inputElement.addEventListener("compositionstart", () => {
  isComposing = true;
});
inputElement.addEventListener("compositionend", () => {
  setTimeout(() => {
    isComposing = false;
  }, 0);
});
inputElement.addEventListener("keydown", (event) => {
  if (event.isComposing || isComposing || event.keyCode === 229) return;

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
});
inputElement.addEventListener("input", () => {
  clearTimeout(typingIdleTimer);
  if (!inputElement.value.trim()) {
    sendTypingState(false);
    return;
  }

  sendTypingState(true);
  typingIdleTimer = setTimeout(() => sendTypingState(false), 1500);
});
sendButton.addEventListener("click", send);

initWebSocket();
