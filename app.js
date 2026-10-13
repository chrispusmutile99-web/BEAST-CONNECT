"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const STORAGE_KEY = "beast_connect_demo_v1";
  const PREF_KEY = "beast_connect_preferences_v1";

  let account = null;
  let premium = false;
  let nextId = 100001;
  let toastTimer = null;
  let chatCount = 0;

  let preferences = {
    dark: true,
    notifications: true
  };

  try {
    preferences = {
      ...preferences,
      ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}")
    };
  } catch (_) {}

  function safeSave(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      showToast("Could not save. Check browser storage.");
      return false;
    }
  }

  function loadAccount() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.name && saved.id && saved.phone) {
        account = saved;
        premium = Boolean(saved.premium);
        const match = String(saved.id).match(/BST-(\d+)/);
        if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
      }
    } catch (_) {
      account = null;
    }
  }

  function saveAccount() {
    if (account) {
      account.premium = premium;
      safeSave(STORAGE_KEY, account);
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function normalizePhone(value) {
    let number = String(value || "").replace(/[\s()-]/g, "");
    if (number.startsWith("+254")) number = "0" + number.slice(4);
    else if (number.startsWith("254")) number = "0" + number.slice(3);
    return number;
  }

  function validKenyanPhone(value) {
    return /^(07|01)\d{8}$/.test(normalizePhone(value));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#overlay").classList.remove("show");
  }

  function openDrawer() {
    $("#drawer").classList.add("open");
    $("#overlay").classList.add("show");
  }

  function navigate(page) {
    const pages = ["welcome", "home", "chats", "calls", "connect", "premium", "profile", "settings", "notifications"];

    if (!account && page !== "welcome") {
      showToast("Create your demo account first.");
      page = "welcome";
    }

    if (!pages.includes(page)) page = "home";

    $$(".page").forEach((element) => element.classList.add("hidden"));
    const target = document.getElementById(page + "Page");
    if (target) target.classList.remove("hidden");

    $$(".bottom-nav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    closeDrawer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addNotification(title, message) {
    if (!preferences.notifications) return;
    const list = $("#notificationList");
    if (!list) return;

    const item = document.createElement("div");
    item.className = "notification-item";

    const icon = document.createElement("span");
    icon.textContent = "🦁";

    const content = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    const time = document.createElement("small");
    time.textContent = new Date().toLocaleString();

    content.append(heading, paragraph, time);
    item.append(icon, content);
    list.prepend(item);
  }

  function refreshAccountUI() {
    if (!account) return;

    $("#userGreeting").textContent = account.name.split(/\s+/)[0];
    $("#beastNumber").textContent = account.id;
    $("#accountName").textContent = account.name.toUpperCase();
    $("#drawerName").textContent = account.name;
    $("#drawerNumber").textContent = account.id;
    $("#profileName").textContent = account.name;
    $("#profilePhone").textContent = account.phone;
    $("#profileId").textContent = account.id;
    $("#profileIdDetail").textContent = account.id;
    $("#profilePlan").textContent = premium ? "Premium Demo" : "Free Demo";
    $("#drawerLogout").classList.remove("hidden");
    $("#welcomePage").classList.add("hidden");
  }

  function renderApp() {
    document.body.classList.toggle("light", !preferences.dark);
    $("#themeToggle").checked = Boolean(preferences.dark);
    $("#notificationsToggle").checked = Boolean(preferences.notifications);

    if (account) {
      refreshAccountUI();
      navigate("home");
    } else {
      $("#drawerLogout").classList.add("hidden");
      navigate("welcome");
    }
  }

  function logout() {
    account = null;
    premium = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    $("#registerForm").reset();
    renderApp();
    showToast("You have logged out of the demo.");
  }

  // Navigation
  $$(".bottom-nav button[data-page], .drawer button[data-page], [data-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const page = button.dataset.page;
      if (page) {
        event.preventDefault();
        navigate(page);
      }
    });
  });

  $("#menuBtn").addEventListener("click", openDrawer);
  $("#overlay").addEventListener("click", closeDrawer);
  $("#notificationBtn").addEventListener("click", () => navigate("notifications"));

  // Registration
  $("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("#fullName").value.trim();
    const phone = normalizePhone($("#phone").value);
    const pin = $("#pin").value;

    if (name.length < 2) {
      showToast("Please enter your full name.");
      return;
    }

    if (!validKenyanPhone(phone)) {
      showToast("Enter a valid Kenyan 07 or 01 phone number.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      showToast("Your demo PIN must contain 4 digits.");
      return;
    }

    if (!$("#agree").checked) {
      showToast("Please confirm that you understand this is a demo.");
      return;
    }

    // This is a local prototype ID, not a phone number.
    account = {
      name,
      phone,
      id: "BST-" + String(nextId++),
      createdAt: new Date().toISOString()
    };
    premium = false;

    if (!safeSave(STORAGE_KEY, account)) return;

    $("#registerForm").reset();
    refreshAccountUI();
    addNotification("Account created", "Your prototype BEAST ID is ready.");
    navigate("home");
    showToast("Welcome! Your BEAST ID is " + account.id);
  });

  // Copy demo ID
  $("#copyIdBtn").addEventListener("click", async () => {
    if (!account) return;

    try {
      await navigator.clipboard.writeText(account.id);
      showToast("BEAST ID copied.");
    } catch (_) {
      const temporary = document.createElement("textarea");
      temporary.value = account.id;
      document.body.appendChild(temporary);
      temporary.select();
      try {
        document.execCommand("copy");
        showToast("BEAST ID copied.");
      } catch (_) {
        showToast("Your BEAST ID is " + account.id);
      }
      temporary.remove();
    }
  });

  // Local demo chat
  function addChatBubble(message, type, sender) {
    const list = $("#chatMessages");
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + type;

    const label = document.createElement("small");
    label.textContent = sender;

    const text = document.createElement("p");
    text.textContent = message;

    bubble.append(label, text);
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
  }

  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const message = input.value.trim();
    if (!message) return;

    addChatBubble(message, "sent", account ? account.name : "YOU");
    input.value = "";
    chatCount++;

    setTimeout(() => {
      addChatBubble(
        "This is a local demo reply. Live BEAST-to-BEAST messaging needs a server and connected user accounts.",
        "received",
        "BEAST DEMO"
      );
    }, 500);
  });

  $("#startChatBtn").addEventListener("click", () => {
    const id = $("#recipientId").value.trim().toUpperCase();
    if (!id) {
      showToast("Enter a BEAST ID first.");
      return;
    }

    if (!/^BST-\d{6,}$/.test(id)) {
      showToast("Use the format BST-100002.");
      return;
    }

    navigate("chats");
    addChatBubble("Demo conversation opened with " + id + ". This does not contact a real user.", "received", "BEAST DEMO");
    showToast("Demo conversation ready.");
  });

  // Calling options
  function openCallOptions() {
    const target = $("#callId").value.trim();
    if (!target) {
      showToast("Enter a BEAST ID or phone number.");
      return;
    }

    const choice = window.confirm(
      "BEAST CONNECT CALL DEMO\n\nDestination: " + target +
      "\n\nOK = explore phone calling\nCancel = return\n\nBEAST-to-BEAST calls are not live yet."
    );

    if (choice && /^\+?[\d\s()-]{7,20}$/.test(target)) {
      window.location.href = "tel:" + target.replace(/[^\d+]/g, "");
    } else if (choice) {
      showToast("Live BEAST calling is not connected yet.");
    }
  }

  $("#startCallBtn").addEventListener("click", openCallOptions);
  $("#beastCallBtn").addEventListener("click", () => {
    navigate("calls");
    showToast("Enter a BEAST ID to explore the call demo.");
  });
  $("#videoCallBtn").addEventListener("click", () => {
    showToast("Video calling requires a live calling service.");
  });
  $("#phoneCallBtn").addEventListener("click", () => {
    const number = window.prompt("Enter the phone number you want to call:");
    if (number && /^\+?[\d\s()-]{7,20}$/.test(number)) {
      window.location.href = "tel:" + number.replace(/[^\d+]/g, "");
    } else if (number) {
      showToast("Please check the phone number.");
    }
  });

  // Web search
  $("#searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("#searchInput").value.trim();
    if (!query) return;
    window.open("https://www.google.com/search?q=" + encodeURIComponent(query), "_blank", "noopener,noreferrer");
  });

  // Premium demo
  $("#premiumBtn").addEventListener("click", () => {
    if (!account) {
      navigate("welcome");
      return;
    }

    const accepted = window.confirm(
      "BEAST PREMIUM DEMO\n\nPlanned price: KES 250 per month.\n\nNo payment will be taken. This only activates a local demo label."
    );

    if (!accepted) return;

    premium = true;
    saveAccount();
    refreshAccountUI();
    addNotification("Premium demo enabled", "No money was charged. This is a local prototype.");
    showToast("Premium demo enabled. No payment taken.");
  });

  // Settings
  $("#themeToggle").addEventListener("change", (event) => {
    preferences.dark = event.target.checked;
    document.body.classList.toggle("light", !preferences.dark);
    safeSave(PREF_KEY, preferences);
    showToast(preferences.dark ? "Dark theme enabled." : "Light theme enabled.");
  });

  $("#notificationsToggle").addEventListener("change", (event) => {
    preferences.notifications = event.target.checked;
    safeSave(PREF_KEY, preferences);
    showToast(preferences.notifications ? "Demo notifications enabled." : "Demo notifications disabled.");
  });

  $("#logoutBtn").addEventListener("click", logout);
  $("#settingsLogoutBtn").addEventListener("click", logout);
  $("#drawerLogout").addEventListener("click", logout);

  // Restore saved account on page load.
  loadAccount();
  renderApp();
});