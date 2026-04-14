// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://jpjvexfldouobiiczhax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pB2UiR6VPGNwsbR4qhuC8g_9d88JO5E';
const SIM_API = SUPABASE_URL + '/functions/v1/sim-api/sim';

// ── State ─────────────────────────────────────────────────────────────────────

let profiles = [];
let conversations = [];
let selectedPsid = null;
let typingTimeout = null;
let newContactPlatform = 'instagram';
let newContactAvatarDataUrl = null;
let avatarUpdatePsid = null;
let realtimeChannel = null;

// Supabase client for Realtime subscriptions
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const [profilesRes, convsRes, configRes] = await Promise.all([
    fetch(SIM_API + '/profiles').then(r => r.json()),
    fetch(SIM_API + '/conversations').then(r => r.json()),
    fetch(SIM_API + '/config').then(r => r.json()),
  ]);

  profiles = profilesRes;
  conversations = convsRes;
  populateConfig(configRes);
  renderContacts();
  startRealtime();
}

// ── Supabase Realtime (replaces WebSocket) ───────────────────────────────────

function startRealtime() {
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
  }

  realtimeChannel = sb.channel('sim-updates')
    // New messages
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'sim_messages',
    }, (payload) => {
      const m = payload.new;
      const conv = conversations.find(c => c.id === m.conversation_id);
      if (!conv) {
        // New conversation — reload all
        refreshConversations();
        return;
      }

      // Check for existing (dedup)
      const existing = conv.messages.find(msg => msg.mid === m.mid);
      // Check for pending optimistic message
      const pending = !existing && conv.messages.find(msg =>
        msg.mid.startsWith('pending_') && (msg.text === m.text || (!msg.text && m.attachments))
      );

      if (pending) {
        pending.mid = m.mid;
        pending.timestamp = m.timestamp;
      } else if (!existing) {
        conv.messages.push({
          mid: m.mid, senderId: m.sender_id, text: m.text,
          attachments: m.attachments, timestamp: m.timestamp, isEcho: m.is_echo,
        });
      }

      conv.updatedTime = m.timestamp;
      if (selectedPsid === conv.participant?.psid) renderMessages();
      renderContacts();
    })
    // Conversation updates (read watermark, updated_time)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sim_conversations',
    }, (payload) => {
      const updated = payload.new;
      const conv = conversations.find(c => c.id === updated.id);
      if (conv) {
        conv.readWatermark = updated.read_watermark;
        conv.updatedTime = updated.updated_time;
        if (selectedPsid === conv.participant?.psid) renderMessages();
      }
    })
    // New conversations
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'sim_conversations',
    }, () => {
      refreshConversations();
    })
    // Profile changes (avatar updates)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sim_profiles',
    }, (payload) => {
      const p = payload.new;
      if (!p?.psid) return;

      const existing = profiles.find(pr => pr.psid === p.psid);
      if (existing) {
        existing.profilePic = p.profile_pic;
        existing.name = p.name;
        existing.firstName = p.first_name;
        existing.lastName = p.last_name;
      } else {
        profiles.push({
          psid: p.psid, firstName: p.first_name, lastName: p.last_name,
          name: p.name, platform: p.platform, profilePic: p.profile_pic,
          instagram: p.instagram,
        });
      }

      const conv = conversations.find(c => c.participant?.psid === p.psid);
      if (conv?.participant) {
        conv.participant.profilePic = p.profile_pic;
        conv.participant.name = p.name;
      }

      renderContacts();
      if (selectedPsid === p.psid) renderChatHeader();
    })
    .subscribe();
}

async function refreshConversations() {
  const [profilesRes, convsRes] = await Promise.all([
    fetch(SIM_API + '/profiles').then(r => r.json()),
    fetch(SIM_API + '/conversations').then(r => r.json()),
  ]);
  profiles = profilesRes;
  conversations = convsRes;
  renderContacts();
  if (selectedPsid) {
    renderChatHeader();
    renderMessages();
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

function renderContacts() {
  const el = document.getElementById('contacts');
  const igProfiles = profiles.filter(p => p.platform === 'instagram');
  const fbProfiles = profiles.filter(p => p.platform === 'messenger');

  el.innerHTML = `
    ${renderContactGroup('Instagram', 'ig', igProfiles)}
    ${renderContactGroup('Messenger', 'fb', fbProfiles)}
  `;
}

function renderContactGroup(label, platformClass, groupProfiles) {
  if (groupProfiles.length === 0) return '';

  const contacts = groupProfiles.map(p => {
    const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const active = selectedPsid === p.psid ? 'active' : '';
    const avatarContent = p.profilePic
      ? `<img src="${escapeHtml(p.profilePic)}" alt="${escapeHtml(initials)}" />`
      : initials;

    return `
      <div class="contact ${active}" onclick="selectContact('${p.psid}')">
        <div class="contact-avatar">${avatarContent}</div>
        <div class="contact-info">
          <div class="contact-name">${p.name}</div>
          <div class="contact-handle">${p.instagram || 'Messenger'}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="contacts-group">
      <div class="contacts-group-label">
        <span class="platform-dot ${platformClass}"></span>
        ${label}
      </div>
      ${contacts}
    </div>
  `;
}

function selectContact(psid) {
  selectedPsid = psid;
  renderContacts();
  renderChatHeader();
  renderMessages();

  document.getElementById('composer').style.display = 'flex';
  document.getElementById('chat-empty').style.display = 'none';
  document.getElementById('msg-input').focus();
}

// ── Chat Header ───────────────────────────────────────────────────────────────

function renderChatHeader() {
  const profile = profiles.find(p => p.psid === selectedPsid);
  if (!profile) return;

  const headerEl = document.getElementById('chat-header');
  headerEl.style.display = 'flex';

  const initials = profile.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const avatarEl = document.getElementById('chat-avatar');
  if (profile.profilePic) {
    avatarEl.innerHTML = `<img src="${escapeHtml(profile.profilePic)}" alt="${escapeHtml(initials)}" />`;
  } else {
    avatarEl.textContent = initials;
  }
  avatarEl.title = 'Click to change photo';
  avatarEl.onclick = () => {
    avatarUpdatePsid = selectedPsid;
    document.getElementById('avatar-update-input').click();
  };

  document.getElementById('chat-name').textContent = profile.name;

  const platformEl = document.getElementById('chat-platform');
  platformEl.textContent = profile.platform === 'instagram'
    ? `Instagram · ${profile.instagram}`
    : 'Facebook Messenger';
}

// ── Messages ──────────────────────────────────────────────────────────────────

function renderMessages() {
  const el = document.getElementById('chat-messages');
  const conv = conversations.find(c => c.participant?.psid === selectedPsid);

  if (!conv || conv.messages.length === 0) {
    el.innerHTML = '<div class="chat-empty">No messages yet — send one!</div>';
    return;
  }

  let lastSeenIndex = -1;
  if (conv.readWatermark) {
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (!conv.messages[i].isEcho && conv.messages[i].timestamp <= conv.readWatermark) {
        lastSeenIndex = i;
        break;
      }
    }
  }

  el.innerHTML = conv.messages.map((m, i) => {
    const isClient = !m.isEcho;
    const side = isClient ? 'client' : 'business';
    const time = formatTime(m.timestamp);
    const showSeen = isClient && i === lastSeenIndex;

    let content = '';
    if (m.text) content += `<div>${escapeHtml(m.text)}</div>`;
    if (m.attachments) {
      for (const att of m.attachments) {
        if (att.type === 'image' && att.payload?.url) {
          content += `<div class="msg-attachment"><img src="${escapeHtml(att.payload.url)}" /></div>`;
        }
      }
    }

    return `
      <div class="msg ${side}">
        ${content}
        <div class="msg-time">${time}${showSeen ? ' · <span class="msg-seen">Seen</span>' : ''}</div>
      </div>
    `;
  }).join('');

  el.scrollTop = el.scrollHeight;
}

// ── Send Message ──────────────────────────────────────────────────────────────

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text || !selectedPsid) return;

  input.value = '';

  // Optimistically add to local state
  const conv = conversations.find(c => c.participant?.psid === selectedPsid);
  if (conv) {
    conv.messages.push({
      mid: 'pending_' + Date.now(),
      senderId: selectedPsid,
      text,
      timestamp: Date.now(),
      isEcho: false,
    });
    conv.updatedTime = Date.now();
    renderMessages();
    renderContacts();
  }

  try {
    const res = await fetch(SIM_API + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psid: selectedPsid, text }),
    });
    const data = await res.json();

    if (conv && data.messageId) {
      const pending = conv.messages.find(m => m.mid.startsWith('pending_') && m.text === text);
      if (pending) pending.mid = data.messageId;
    }
  } catch (err) {
    console.error('Send failed:', err);
  }
}

// ── Attachments ───────────────────────────────────────────────────────────────

async function handleAttach(input) {
  const file = input.files[0];
  if (!file || !selectedPsid) return;
  input.value = '';

  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const attachments = [{ type: 'image', payload: { url: dataUrl } }];

  const conv = conversations.find(c => c.participant?.psid === selectedPsid);
  if (conv) {
    conv.messages.push({
      mid: 'pending_' + Date.now(),
      senderId: selectedPsid,
      text: null,
      attachments,
      timestamp: Date.now(),
      isEcho: false,
    });
    conv.updatedTime = Date.now();
    renderMessages();
  }

  try {
    const res = await fetch(SIM_API + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psid: selectedPsid, attachments }),
    });
    const data = await res.json();
    if (conv && data.messageId) {
      const pending = conv.messages.find(m => m.mid.startsWith('pending_') && !m.text && m.attachments);
      if (pending) pending.mid = data.messageId;
    }
  } catch (err) {
    console.error('Attach send failed:', err);
  }
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function showTyping() {
  const el = document.getElementById('typing-indicator');
  el.classList.add('visible');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(hideTyping, 5000);
  const messages = document.getElementById('chat-messages');
  messages.scrollTop = messages.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing-indicator').classList.remove('visible');
  clearTimeout(typingTimeout);
}

// ── Webhook Log ───────────────────────────────────────────────────────────────

function toggleWebhookPanel() {
  document.getElementById('webhook-panel').classList.toggle('collapsed');
}

function addWebhookLogEntry(entry) {
  if (!entry) return;
  const log = document.getElementById('webhook-log');
  const statusClass = entry.status && entry.status >= 200 && entry.status < 300 ? 'ok' : 'fail';
  const statusText = entry.status || 'ERR';
  const latency = entry.latencyMs != null ? `${entry.latencyMs}ms` : '—';

  let preview = '';
  const messaging = entry.payload?.entry?.[0]?.messaging?.[0];
  if (messaging?.message?.text) {
    preview = `"${messaging.message.text.slice(0, 60)}"`;
  } else if (messaging?.delivery) {
    preview = `delivery: ${messaging.delivery.mids?.[0] || '?'}`;
  } else if (messaging?.read) {
    preview = `read receipt`;
  }

  const html = `
    <div class="webhook-entry">
      <span class="method">POST</span>
      <span class="status ${statusClass}">${statusText}</span>
      <span class="latency">${latency}</span>
      <span class="preview">${escapeHtml(preview)}</span>
    </div>
  `;

  log.insertAdjacentHTML('afterbegin', html);
  while (log.children.length > 100) {
    log.removeChild(log.lastChild);
  }
}

// ── New Contact Modal ─────────────────────────────────────────────────────────

function toggleNewContact() {
  const modal = document.getElementById('new-contact-modal');
  modal.classList.toggle('hidden');
  if (!modal.classList.contains('hidden')) {
    newContactPlatform = 'instagram';
    newContactAvatarDataUrl = null;
    document.getElementById('nc-name').value = '';
    document.getElementById('nc-handle').value = '';
    const preview = document.getElementById('nc-avatar-preview');
    preview.textContent = '+';
    preview.style.backgroundImage = '';
    document.getElementById('nc-handle-field').style.display = 'block';
    document.getElementById('nc-ig-btn').classList.add('active');
    document.getElementById('nc-fb-btn').classList.remove('active');
    setTimeout(() => document.getElementById('nc-name').focus(), 50);
  }
}

function setNewContactPlatform(platform) {
  newContactPlatform = platform;
  document.getElementById('nc-ig-btn').classList.toggle('active', platform === 'instagram');
  document.getElementById('nc-fb-btn').classList.toggle('active', platform === 'messenger');
  document.getElementById('nc-handle-field').style.display = platform === 'instagram' ? 'block' : 'none';
}

function previewNewContactAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    newContactAvatarDataUrl = e.target.result;
    const preview = document.getElementById('nc-avatar-preview');
    preview.textContent = '';
    preview.style.backgroundImage = `url(${newContactAvatarDataUrl})`;
  };
  reader.readAsDataURL(file);
}

async function submitNewContact() {
  const name = document.getElementById('nc-name').value.trim();
  if (!name) { document.getElementById('nc-name').focus(); return; }

  let instagram = document.getElementById('nc-handle').value.trim();
  if (instagram && !instagram.startsWith('@')) instagram = '@' + instagram;

  const res = await fetch(SIM_API + '/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      platform: newContactPlatform,
      instagram: newContactPlatform === 'instagram' && instagram ? instagram : undefined,
      profilePic: newContactAvatarDataUrl,
    }),
  });

  const profile = await res.json();

  // Realtime will pick up the new profile + conversation inserts,
  // but we can select immediately for responsiveness
  toggleNewContact();

  // Wait briefly for Realtime to deliver the INSERT events
  setTimeout(() => {
    if (!profiles.find(p => p.psid === profile.psid)) {
      // Realtime hasn't fired yet — do a manual refresh
      refreshConversations().then(() => selectContact(profile.psid));
    } else {
      selectContact(profile.psid);
    }
  }, 500);
}

// ── Avatar Update (existing contacts) ────────────────────────────────────────

async function handleAvatarUpdate(input) {
  const file = input.files[0];
  if (!file || !avatarUpdatePsid) return;
  input.value = '';

  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  await fetch(SIM_API + '/contacts/' + avatarUpdatePsid + '/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });

  // Optimistic local update (Realtime will confirm)
  const p = profiles.find(p => p.psid === avatarUpdatePsid);
  if (p) p.profilePic = dataUrl;
  const c = conversations.find(c => c.participant?.psid === avatarUpdatePsid);
  if (c?.participant) c.participant.profilePic = dataUrl;

  renderContacts();
  renderChatHeader();
  avatarUpdatePsid = null;
}

// ── Config Modal ──────────────────────────────────────────────────────────────

function toggleConfig() {
  document.getElementById('config-modal').classList.toggle('hidden');
}

function populateConfig(cfg) {
  document.getElementById('cfg-webhook-url').value = cfg.webhookUrl || '';
  document.getElementById('cfg-verify-token').value = cfg.verifyToken || '';
  document.getElementById('cfg-app-secret').value = cfg.appSecret || '';
  document.getElementById('cfg-access-token').value = cfg.accessToken || '';
  document.getElementById('cfg-page-id').value = cfg.pageId || '';
  document.getElementById('cfg-ig-user-id').value = cfg.igUserId || '';
}

async function saveConfig() {
  const cfg = {
    webhookUrl: document.getElementById('cfg-webhook-url').value,
    verifyToken: document.getElementById('cfg-verify-token').value,
    appSecret: document.getElementById('cfg-app-secret').value,
    accessToken: document.getElementById('cfg-access-token').value,
    pageId: document.getElementById('cfg-page-id').value,
    igUserId: document.getElementById('cfg-ig-user-id').value,
  };

  await fetch(SIM_API + '/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });

  toggleConfig();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
