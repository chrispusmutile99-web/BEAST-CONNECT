(() => {
  'use strict';

  const STORE_KEY = 'beast_connect_prototype_v1';
  const THEME_KEY = 'beast_connect_theme_v1';

  const $ = (id) => document.getElementById(id);

  let toastTimer;
  let state = loadState();

  /* =========================
     DEFAULT STATE
  ========================= */

  function loadState() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORE_KEY) || 'null'
      );

      if (saved && typeof saved === 'object') {
        return {
          user: saved.user || null,
          premiumUntil: saved.premiumUntil || null,

          messages: Array.isArray(saved.messages)
            ? saved.messages
            : [],

          notifications: Array.isArray(saved.notifications)
            ? saved.notifications
            : [],

          profile: saved.profile || {
            whatsapp: '',
            instagram: '',
            facebook: '',
            tiktok: '',
            isPublic: false
          },

          nextNumber: Number(saved.nextNumber) || 100001,

          notificationEnabled:
            saved.notificationEnabled !== false
        };
      }
    } catch (error) {
      console.warn('Could not load saved BEAST data.');
    }

    return {
      user: null,
      premiumUntil: null,
      messages: [],
      notifications: [],

      profile: {
        whatsapp: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        isPublic: false
      },

      nextNumber: 100001,
      notificationEnabled: true
    };
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      showToast(
        'Could not save data. Check browser storage.'
      );
    }
  }

  /* =========================
     NOTIFICATIONS AND TOASTS
  ========================= */

  function showToast(message) {
    const toast = $('toast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  function addNotification(title, message) {
    state.notifications.unshift({
      id: Date.now(),
      title,
      message,
      createdAt: new Date().toISOString()
    });

    state.notifications = state.notifications.slice(0, 40);

    saveState();
    renderNotifications();

    if (state.notificationEnabled && $('notificationDot')) {
      $('notificationDot').classList.remove('hidden');
    }
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function safeText(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
    );
  }

  /* =========================
     KENYAN PHONE NUMBERS
  ========================= */

  function normalizePhone(value) {
    let phone = String(value || '')
      .replace(/[\s()-]/g, '');

    if (phone.startsWith('+254')) {
      phone = '0' + phone.slice(4);
    } else if (phone.startsWith('254')) {
      phone = '0' + phone.slice(3);
    }

    return phone;
  }

  function validKenyanPhone(value) {
    return /^(07|01)\d{8}$/.test(
      normalizePhone(value)
    );
  }

  function internationalPhone(value) {
    const phone = normalizePhone(value);

    if (validKenyanPhone(phone)) {
      return '+254' + phone.slice(1);
    }

    return value;
  }

  function beastNumber() {
    return state.user
      ? state.user.beastNumber
      : '';
  }

  /* =========================
     NAVIGATION
  ========================= */

  function navigate(screenId) {
    if (!$('' + screenId)) return;

    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.toggle(
        'active',
        screen.id === screenId
      );
    });

    document.querySelectorAll('.bottom-nav button').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.screen === screenId
      );
    });

    closeDrawer();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    if (screenId === 'profile') {
      renderProfile();
    }

    if (screenId === 'premium') {
      renderPremium();
    }

    if (screenId === 'notifications') {
      renderNotifications();
    }
  }

  function openDrawer() {
    $('drawer')?.classList.add('open');
    $('drawerBackdrop')?.classList.add('open');
  }

  function closeDrawer() {
    $('drawer')?.classList.remove('open');
    $('drawerBackdrop')?.classList.remove('open');
  }

  /* =========================
     REGISTRATION
  ========================= */

  function register() {
    const name = $('registerName').value.trim();

    const phone = normalizePhone(
      $('registerPhone').value
    );

    const pin = $('registerPin').value.trim();

    if (name.length < 2) {
      showToast('Enter your name to continue.');
      return;
    }

    if (!validKenyanPhone(phone)) {
      showToast(
        'Enter a valid Kenyan number, e.g. 0712345678 or +254712345678.'
      );
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      showToast('Create a 4-digit demo PIN.');
      return;
    }

    /*
      DEMO NUMBER GENERATION

      This counter is stored locally on this device.
      A production system needs a secure server-side
      number generator to prevent duplicate numbers
      between different users and devices.
    */

    const number =
      'BST-' + String(state.nextNumber).padStart(6, '0');

    state.nextNumber += 1;

    state.user = {
      name,
      phone,
      pin,
      beastNumber: number,
      createdAt: new Date().toISOString()
    };

    state.messages = [];

    saveState();

    addNotification(
      'Welcome to BEAST Connect',
      'Your digital BEAST number ' +
        number +
        ' has been created on this device.'
    );

    updateIdentity();
    navigate('home');

    showToast('Your BEAST number is ready! 🦁');
  }

  function updateIdentity() {
    if (!state.user) return;

    const first = state.user.name.split(/\s+/)[0];

    if ($('greeting')) {
      $('greeting').textContent =
        'Welcome, ' + first + ' 👋';
    }

    if ($('homeBeastNumber')) {
      $('homeBeastNumber').textContent =
        state.user.beastNumber;
    }

    if ($('homeUserName')) {
      $('homeUserName').textContent =
        state.user.name;
    }

    if ($('homeAvatar')) {
      $('homeAvatar').textContent =
        first.charAt(0).toUpperCase();
    }

    if ($('profileAvatar')) {
      $('profileAvatar').textContent =
        first.charAt(0).toUpperCase();
    }

    if ($('drawerIdentity')) {
      $('drawerIdentity').textContent =
        state.user.beastNumber;
    }

    if ($('profileName')) {
      $('profileName').textContent =
        state.user.name;
    }

    if ($('profilePhone')) {
      $('profilePhone').textContent =
        internationalPhone(state.user.phone);
    }

    if ($('profileBeastNumber')) {
      $('profileBeastNumber').textContent =
        state.user.beastNumber;
    }

    if ($('profileBigAvatar')) {
      $('profileBigAvatar').textContent =
        first.charAt(0).toUpperCase();
    }

    renderPremium();
  }

  function continueToProfile() {
    if (!state.user) {
      showToast(
        'Create your BEAST profile first on this device.'
      );
      return;
    }

    updateIdentity();
    navigate('home');

    showToast(
      'Welcome back, ' +
      state.user.name.split(/\s+/)[0] +
      '!'
    );
  }

  /* =========================
     COPY BEAST NUMBER
  ========================= */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);

      showToast('Copied: ' + text);
    } catch (error) {
      const element = document.createElement('textarea');

      element.value = text;

      document.body.appendChild(element);

      element.select();

      try {
        document.execCommand('copy');
        showToast('Copied: ' + text);
      } catch (copyError) {
        showToast('Your BEAST number: ' + text);
      }

      element.remove();
    }
  }

  /* =========================
     CONTACT SEARCH
  ========================= */

  function searchContact() {
    const query = $('contactSearch').value.trim();

    if (!query) {
      showToast(
        'Enter a BEAST number or display name.'
      );
      return;
    }

    const result = $('contactSearchResult');

    result.classList.remove('hidden');

    if (
      state.user &&
      query.toLowerCase() ===
      state.user.beastNumber.toLowerCase()
    ) {
      result.innerHTML =
        '<strong>' +
        safeText(state.user.name) +
        '</strong><br>' +
        '<span class="muted">' +
        safeText(state.user.beastNumber) +
        ' · This is your own profile.</span>';

      return;
    }

    result.innerHTML =
      '<strong>No public contact found in this demo.</strong><br>' +
      '<span class="muted">' +
      'Searching for other users requires a shared, secure backend.' +
      '</span>';
  }

  /* =========================
     BEAST CHAT
  ========================= */

  function renderMessages() {
    const windowElement = $('chatWindow');

    if (!windowElement) return;

    if (!state.messages.length) {
      windowElement.innerHTML =
        '<div class="chat-empty">' +
        'Your conversations will appear here.<br>' +
        '<small>Real-time messaging is not connected yet.</small>' +
        '</div>';

      return;
    }

    windowElement.innerHTML = state.messages
      .map(message => {
        return (
          '<div class="chat-bubble ' +
          (message.mine ? 'mine' : '') +
          '">' +
          safeText(message.text) +
          '<small>' +
          safeText(message.author) +
          ' · ' +
          safeText(formatDate(message.at)) +
          '</small>' +
          '</div>'
        );
      })
      .join('');

    windowElement.scrollTop =
      windowElement.scrollHeight;
  }

  function sendDemoMessage(event) {
    event.preventDefault();

    const input = $('chatMessage');
    const text = input.value.trim();

    if (!text) return;

    if (!state.user) {
      showToast(
        'Create your BEAST profile first.'
      );
      return;
    }

    state.messages.push({
      text,
      author: state.user.name,
      mine: true,
      at: new Date().toISOString()
    });

    state.messages = state.messages.slice(-100);

    saveState();

    input.value = '';

    renderMessages();
  }

  /* =========================
     VOICE AND VIDEO CALLS
  ========================= */

  function startCall(type) {
    const number = $('callNumber').value.trim();

    const box = $('callStatus');

    box.classList.remove('hidden');

    if (!number) {
      box.textContent =
        'Enter the contact’s BEAST number first.';

      return;
    }

    box.textContent =
      (type === 'video' ? 'Video' : 'Voice') +
      ' call to ' +
      number +
      ' is a demonstration only. Real calling requires a secure calling service and backend.';

    showToast(
      'Calling is not connected yet.'
    );
  }

  /* =========================
     GOOGLE SEARCH
  ========================= */

  function searchGoogle() {
    const input = $('webSearch');

    const query = input.value.trim();

    const url = query
      ? 'https://www.google.com/search?q=' +
        encodeURIComponent(query)
      : 'https://www.google.com/';

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }

  /* =========================
     PREMIUM SUBSCRIPTION
  ========================= */

  function isPremium() {
    return (
      !!state.premiumUntil &&
      Date.now() <
      new Date(state.premiumUntil).getTime()
    );
  }

  function activatePremium() {
    if (!state.user) {
      showToast(
        'Create your BEAST profile before activating Premium.'
      );

      navigate('welcome');

      return;
    }

    /*
      DEMO ONLY

      This activates a local demonstration subscription.
      No real payment is collected here.

      Production activation must happen only after
      a payment provider confirms the KES 250 payment.
    */

    const until = new Date();

    until.setDate(until.getDate() + 30);

    state.premiumUntil = until.toISOString();

    saveState();

    addNotification(
      'Premium demo activated',
      'Your local prototype Premium status is active for 30 days. No payment was taken.'
    );

    renderPremium();

    showToast(
      'Demo Premium activated for 30 days!'
    );
  }

  function renderPremium() {
    const status = $('subscriptionStatus');
    const button = $('subscribeBtn');

    if (!status || !button) return;

    if (isPremium()) {
      status.textContent =
        'Premium demo active until ' +
        formatDate(state.premiumUntil);

      status.classList.add('active');

      button.textContent =
        'Premium demo active ✓';

      button.disabled = true;

      button.style.opacity = '.7';
    } else {
      status.textContent =
        'Free plan · Premium not active';

      status.classList.remove('active');

      button.textContent =
        'Activate demo Premium — KES 250';

      button.disabled = false;

      button.style.opacity = '1';
    }
  }

  /* =========================
     SOCIAL PROFILE
  ========================= */

  function renderProfile() {
    if (!state.user) return;

    const profile = state.profile || {};

    $('profileWhatsapp').value =
      profile.whatsapp || '';

    $('profileInstagram').value =
      profile.instagram || '';

    $('profileFacebook').value =
      profile.facebook || '';

    $('profileTiktok').value =
      profile.tiktok || '';

    $('publicProfileToggle').checked =
      !!profile.isPublic;

    $('settingsPublicToggle')
      .classList.toggle(
        'on',
        !!profile.isPublic
      );

    $('settingsPublicToggle')
      .setAttribute(
        'aria-pressed',
        String(!!profile.isPublic)
      );

    $('publicProfileResult')
      .classList.add('hidden');
  }

  function validOptionalUrl(value) {
    if (!value.trim()) return true;

    try {
      const url = new URL(value);

      return (
        url.protocol === 'https:' ||
        url.protocol === 'http:'
      );
    } catch (error) {
      return false;
    }
  }

  function saveProfile() {
    const profile = {
      whatsapp: $('profileWhatsapp').value.trim(),
      instagram: $('profileInstagram').value.trim(),
      facebook: $('profileFacebook').value.trim(),
      tiktok: $('profileTiktok').value.trim(),
      isPublic: $('publicProfileToggle').checked
    };

    const links = [
      profile.whatsapp,
      profile.instagram,
      profile.facebook,
      profile.tiktok
    ];

    if (!links.every(validOptionalUrl)) {
      showToast(
        'Use a full link starting with https:// for each social profile.'
      );

      return;
    }

    state.profile = profile;

    saveState();

    $('settingsPublicToggle')
      .classList.toggle(
        'on',
        profile.isPublic
      );

    $('settingsPublicToggle')
      .setAttribute(
        'aria-pressed',
        String(profile.isPublic)
      );

    const box = $('publicProfileResult');

    box.classList.remove('hidden');

    const socialLinks = [
      ['WhatsApp', profile.whatsapp],
      ['Instagram', profile.instagram],
      ['Facebook', profile.facebook],
      ['TikTok', profile.tiktok]
    ].filter(item => item[1]);

    box.innerHTML =
      '<strong>Profile saved on this device.</strong><br>' +
      (
        profile.isPublic
          ? 'Public profile links are enabled in this demo.'
          : 'Your links are saved but marked private.'
      ) +
      (
        socialLinks.length
          ? '<br>' +
            socialLinks
              .map(item =>
                safeText(item[0]) +
                ': ' +
                safeText(item[1])
              )
              .join('<br>')
          : '<br>No social links added yet.'
      );

    showToast('Profile settings saved.');
  }

  function setProfilePublic(enabled) {
    state.profile.isPublic = enabled;

    saveState();

    $('publicProfileToggle').checked = enabled;

    showToast(
      enabled
        ? 'Public profile links enabled in this demo.'
        : 'Public profile links disabled.'
    );
  }

  /* =========================
     NOTIFICATION HISTORY
  ========================= */

  function renderNotifications() {
    const list = $('notificationList');

    if (!list) return;

    if (!state.notifications.length) {
      list.innerHTML =
        '<div class="empty-state">' +
        'You’re all caught up.' +
        '</div>';

      return;
    }

    list.innerHTML = state.notifications
      .map(notification => {
        return (
          '<div class="setting-row">' +
          '<div>' +
          '<strong>' +
          safeText(notification.title) +
          '</strong>' +
          '<small>' +
          safeText(notification.message) +
          '<br>' +
          safeText(
            formatDate(notification.createdAt)
          ) +
          '</small>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  /* =========================
     SETTINGS
  ========================= */

  function toggleSwitch(button, callback) {
    button.classList.toggle('on');

    const enabled =
      button.classList.contains('on');

    button.setAttribute(
      'aria-pressed',
      String(enabled)
    );

    if (callback) {
      callback(enabled);
    }
  }

  function applyTheme(light) {
    document.documentElement.dataset.theme =
      light ? 'light' : 'dark';

    $('themeToggle')?.classList.toggle(
      'on',
      light
    );

    $('themeToggle')?.setAttribute(
      'aria-pressed',
      String(light)
    );

    try {
      localStorage.setItem(
        THEME_KEY,
        light ? 'light' : 'dark'
      );
    } catch (error) {
      // Theme can still work for this page session.
    }
  }

  /* =========================
     RESET LOCAL DEMO
  ========================= */

  function logout() {
    const confirmed = confirm(
      'Reset this local BEAST Connect demo on this device? Your demo profile and messages will be removed.'
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem(STORE_KEY);
    } catch (error) {
      // Continue resetting the page.
    }

    state = {
      user: null,
      premiumUntil: null,
      messages: [],
      notifications: [],

      profile: {
        whatsapp: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        isPublic: false
      },

      nextNumber: 100001,
      notificationEnabled: true
    };

    if ($('registerName')) {
      $('registerName').value = '';
    }

    if ($('registerPhone')) {
      $('registerPhone').value = '';
    }

    if ($('registerPin')) {
      $('registerPin').value = '';
    }

    renderMessages();
    renderNotifications();
    renderPremium();

    closeDrawer();
    navigate('welcome');

    showToast('Local demo reset.');
  }

  /* =========================
     EVENT LISTENERS
  ========================= */

  $('menuBtn').addEventListener(
    'click',
    openDrawer
  );

  $('drawerBackdrop').addEventListener(
    'click',
    closeDrawer
  );

  document.querySelectorAll('[data-screen]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => navigate(button.dataset.screen)
      );
    });

  document.querySelectorAll('[data-go]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => navigate(button.dataset.go)
      );
    });

  $('registerBtn').addEventListener(
    'click',
    register
  );

  $('continueBtn').addEventListener(
    'click',
    continueToProfile
  );

  $('copyNumberBtn').addEventListener(
    'click',
    () => {
      if (state.user) {
        copyText(state.user.beastNumber);
      }
    }
  );

  $('copyProfileNumber').addEventListener(
    'click',
    () => {
      if (state.user) {
        copyText(state.user.beastNumber);
      }
    }
  );

  $('searchContactBtn').addEventListener(
    'click',
    searchContact
  );

  $('contactSearch').addEventListener(
    'keydown',
    event => {
      if (event.key === 'Enter') {
        searchContact();
      }
    }
  );

  $('chatForm').addEventListener(
    'submit',
    sendDemoMessage
  );

  $('voiceCallBtn').addEventListener(
    'click',
    () => startCall('voice')
  );

  $('videoCallBtn').addEventListener(
    'click',
    () => startCall('video')
  );

  $('googleSearchBtn').addEventListener(
    'click',
    searchGoogle
  );

  $('webSearch').addEventListener(
    'keydown',
    event => {
      if (event.key === 'Enter') {
        searchGoogle();
      }
    }
  );

  $('subscribeBtn').addEventListener(
    'click',
    activatePremium
  );

  $('saveProfileBtn').addEventListener(
    'click',
    saveProfile
  );

  $('publicProfileToggle').addEventListener(
    'change',
    event => {
      state.profile.isPublic =
        event.target.checked;

      saveState();

      $('settingsPublicToggle')
        .classList.toggle(
          'on',
          event.target.checked
        );

      $('settingsPublicToggle')
        .setAttribute(
          'aria-pressed',
          String(event.target.checked)
        );
    }
  );

  $('themeToggle').addEventListener(
    'click',
    () => {
      toggleSwitch(
        $('themeToggle'),
        applyTheme
      );
    }
  );

  $('notificationsToggle').addEventListener(
    'click',
    () => {
      toggleSwitch(
        $('notificationsToggle'),
        enabled => {
          state.notificationEnabled = enabled;

          saveState();

          showToast(
            enabled
              ? 'Notifications enabled.'
              : 'Notifications muted.'
          );
        }
      );
    }
  );

  $('settingsPublicToggle').addEventListener(
    'click',
    () => {
      toggleSwitch(
        $('settingsPublicToggle'),
        setProfilePublic
      );
    }
  );

  $('notificationBtn').addEventListener(
    'click',
    () => {
      $('notificationDot')
        .classList.add('hidden');

      navigate('notifications');
    }
  );

  $('logoutBtn').addEventListener(
    'click',
    logout
  );

  /* =========================
     INITIALIZE APP
  ========================= */

  try {
    applyTheme(
      localStorage.getItem(THEME_KEY) === 'light'
    );
  } catch (error) {
    applyTheme(false);
  }

  $('notificationsToggle')
    .classList.toggle(
      'on',
      state.notificationEnabled
    );

  $('notificationsToggle')
    .setAttribute(
      'aria-pressed',
      String(state.notificationEnabled)
    );

  renderMessages();
  renderNotifications();
  renderPremium();

  if (state.user) {
    updateIdentity();
    navigate('home');

    if (state.notifications.length) {
      $('notificationDot')
        .classList.remove('hidden');
    }
  }
})();
