const chatSidebar = document.getElementById('chatSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarClose = document.getElementById('sidebarClose');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const sidebarChats = document.getElementById('sidebarChats');
const newChatBtn = document.getElementById('newChatBtn');
const messagesContainer = document.getElementById('messagesContainer');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const modelDropdown = document.getElementById('modelDropdown');
const modelDropdownBtn = document.getElementById('modelDropdownBtn');
const modelDropdownMenu = document.getElementById('modelDropdownMenu');
const modelSelectedText = document.getElementById('modelSelectedText');
const chatTitle = document.getElementById('chatTitle');
const userAvatarInput = document.getElementById('userAvatar');

let currentChatId = null;
let messages = [];
let isLoading = false;
let stopGeneration = false;

// User avatar URL
const USER_AVATAR = userAvatarInput ? userAvatarInput.value : '/static/images/default-avatar.svg';

// Model dropdown
if (modelDropdownBtn && modelDropdownMenu) {
    modelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!modelDropdown.contains(e.target)) {
            modelDropdown.classList.remove('open');
        }
    });

    modelDropdownMenu.querySelectorAll('.model-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const value = item.dataset.value;
            const name = item.querySelector('strong').textContent;
            modelSelect.value = value;
            modelSelectedText.textContent = name;
            modelDropdownMenu.querySelectorAll('.model-dropdown-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            modelDropdown.classList.remove('open');
        });
    });
}

// Clear all history
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete ALL chat history? This cannot be undone.')) return;
        try {
            const res = await fetch('/api/chats/clear', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                currentChatId = null;
                messages = [];
                renderMessages();
                if (chatTitle) chatTitle.textContent = 'New Chat';
                loadChats();
            }
        } catch (e) {
            console.error('Failed to clear history', e);
        }
    });
}

function openSidebar() {
    chatSidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    chatSidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

async function loadChats() {
    try {
        const res = await fetch('/api/chats');
        const chats = await res.json();
        renderChats(chats);
    } catch (e) {
        console.error('Failed to load chats', e);
    }
}

function renderChats(chats) {
    if (!sidebarChats) return;
    sidebarChats.innerHTML = '';

    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
        item.dataset.id = chat.id;
        item.innerHTML = `
      <span class="chat-item-title">${escapeHtml(chat.title)}</span>
      <div class="chat-item-actions">
        <button class="chat-item-btn delete-btn" data-id="${chat.id}" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
        item.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            selectChat(chat.id);
        });
        sidebarChats.appendChild(item);
    });

    sidebarChats.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            await deleteChat(id);
        });
    });
}

async function selectChat(chatId) {
    currentChatId = chatId;
    closeSidebar();

    try {
        const res = await fetch(`/api/chats/${chatId}/messages`);
        const msgs = await res.json();
        messages = msgs.map(m => ({ role: m.role, content: m.content }));
        renderMessages();

        // Update active in sidebar
        document.querySelectorAll('.chat-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.id) === chatId);
        });

        // Update title
        const activeItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (activeItem && chatTitle) {
            chatTitle.textContent = activeItem.querySelector('.chat-item-title').textContent;
        }
    } catch (e) {
        console.error('Failed to load messages', e);
    }
}

async function deleteChat(chatId) {
    if (!confirm('Delete this chat?')) return;
    try {
        await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
        if (currentChatId === chatId) {
            currentChatId = null;
            messages = [];
            renderMessages();
            if (chatTitle) chatTitle.textContent = 'New Chat';
        }
        loadChats();
    } catch (e) {
        console.error('Failed to delete chat', e);
    }
}

function createNewChat() {
    currentChatId = null;
    messages = [];
    renderMessages();
    if (chatTitle) chatTitle.textContent = 'New Chat';
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    closeSidebar();
}

if (newChatBtn) newChatBtn.addEventListener('click', createNewChat);

function isImageUrl(text) {
    if (!text || typeof text !== 'string') return false;
    return /^https?:\/\/.*\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(text.trim()) ||
        /^https?:\/\/.*\/image\/.*$/i.test(text.trim());
}

function renderImageBubble(url) {
    return `
        <div class="image-bubble">
            <img src="${escapeHtml(url)}" alt="Generated image" loading="lazy" onload="scrollToBottom()">
            <a href="${escapeHtml(url)}" download class="image-download-btn" target="_blank">
                <i class="fa-solid fa-download"></i> Download
            </a>
        </div>
    `;
}

function renderMessages() {
    if (!messagesContainer) return;

    if (messages.length === 0) {
        messagesContainer.innerHTML = `
      <div class="welcome-screen">
        <h2>How can I help you today?</h2>
        <p>Start a conversation with the AI assistant</p>
      </div>
    `;
        return;
    }

    messagesContainer.innerHTML = '';

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;

        const avatar = msg.role === 'user'
            ? `<img src="${USER_AVATAR}" class="message-avatar" alt="user">`
            : `<div class="message-avatar bot">AI</div>`;

        let content;
        if (msg.role === 'assistant' && isImageUrl(msg.content)) {
            content = renderImageBubble(msg.content);
        } else {
            content = formatMessageContent(msg.content);
        }

        div.innerHTML = `
      ${avatar}
      <div class="message-content">
        <div class="message-bubble">${content}</div>
      </div>
    `;
        messagesContainer.appendChild(div);
    });

    messagesContainer.querySelectorAll('pre code').forEach(block => {
        if (window.hljs) hljs.highlightElement(block);
    });

    scrollToBottom();
}

function formatMessageContent(text) {
    let html = escapeHtml(text);

    // Extract code blocks first
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'plaintext';
        const cleanCode = code.trim();
        const idx = codeBlocks.length;

        if (language === 'chem') {
            // Chemical reaction — no copy button, special styling
            codeBlocks.push(`<div class="chem-block-wrapper">
                <div class="chem-block">${cleanCode}</div>
            </div>`);
        } else {
            codeBlocks.push(`<div class="code-block-wrapper">
                <button class="code-copy-btn" onclick="window.copyCode(this)" title="Copy">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
                <pre><code class="language-${language}">${cleanCode}</code></pre>
            </div>`);
        }
        return `<!--CODE_BLOCK_${idx}-->`;
    });

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Restore code blocks
    codeBlocks.forEach((block, idx) => {
        html = html.replace(`<!--CODE_BLOCK_${idx}-->`, block);
    });

    return html;
}

window.copyCode = function (btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper.querySelector('code');
    navigator.clipboard.writeText(code.textContent).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            btn.classList.remove('copied');
        }, 2000);
    });
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shouldAutoScroll() {
    const container = document.getElementById('chatMessages');
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container && shouldAutoScroll()) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isLoading) return;

    stopGeneration = false;
    messages.push({ role: 'user', content: text });
    chatInput.value = '';
    chatInput.style.height = 'auto';
    renderMessages();
    setLoading(true);

    // Show typing indicator
    showTypingIndicator();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                chat_id: currentChatId,
                model: modelSelect ? modelSelect.value : 'gpt-4o-mini',
            }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Check if user stopped generation during API call
        if (stopGeneration) {
            removeTypingIndicator();
            appendSystemMessage('Generation stopped');
            return;
        }

        // Remove typing indicator
        removeTypingIndicator();

        // Check if response is an image
        if (data.image_url) {
            messages.push({ role: 'assistant', content: data.image_url });
            renderMessages();
        } else {
            await typeOutResponse(data.reply);
        }

        if (data.chat_id && !currentChatId) {
            currentChatId = data.chat_id;
            loadChats();
        }
    } catch (err) {
        removeTypingIndicator();
        console.error(err);
        appendError('Error: ' + err.message);
    } finally {
        setLoading(false);
        stopGeneration = false;
    }
}

function showTypingIndicator() {
    if (!messagesContainer) return;
    // Remove welcome screen if present
    const welcome = messagesContainer.querySelector('.welcome-screen');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = 'message assistant typing-message';
    div.innerHTML = `
        <div class="message-avatar bot">AI</div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span>●</span><span>●</span><span>●</span>
                </div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = messagesContainer.querySelector('.typing-message');
    if (typing) typing.remove();
}

async function typeOutResponse(text) {
    messages.push({ role: 'assistant', content: '' });
    const msgIndex = messages.length - 1;

    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
        <div class="message-avatar bot">AI</div>
        <div class="message-content">
            <div class="message-bubble"></div>
        </div>
    `;
    messagesContainer.appendChild(div);
    const bubble = div.querySelector('.message-bubble');

    // Type character by character
    const chars = text.split('');
    let currentText = '';
    for (let i = 0; i < chars.length; i++) {
        if (stopGeneration) {
            // Stop typing, leave what was already typed
            break;
        }
        currentText += chars[i];
        messages[msgIndex].content = currentText;
        bubble.innerHTML = formatMessageContent(currentText);
        if (window.hljs) {
            bubble.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        }
        scrollToBottom();
        await sleep(8);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
    <div class="message-avatar bot">AI</div>
    <div class="message-content">
      <div class="message-bubble" style="color: var(--text-muted); font-style: italic;">${escapeHtml(text)}</div>
    </div>
  `;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

function appendError(text) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
    <div class="message-avatar bot">!</div>
    <div class="message-content">
      <div class="message-bubble" style="color: var(--accent-red);">${escapeHtml(text)}</div>
    </div>
  `;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

function setLoading(loading) {
    isLoading = loading;
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = loading
            ? '<i class="fa-solid fa-square"></i>'
            : '<i class="fa-solid fa-paper-plane"></i>';
        sendBtn.classList.toggle('stop-btn', loading);
    }
}

if (sendBtn) {
    sendBtn.addEventListener('click', () => {
        if (isLoading) {
            stopGeneration = true;
        } else {
            sendMessage();
        }
    });
}

if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
    });
}

loadChats();
