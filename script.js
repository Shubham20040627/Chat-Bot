/* script.js */

// ============================================
// ============================================
// Configuration
// ============================================
// API Key is now handled on the backend!

// ============================================
// DOM Elements
// ============================================
// ============================================
// DOM Elements
// ============================================
const chatMessages = document.getElementById('chatMessages');
const userInput = document.querySelector('.input-wrapper input');
const sendBtn = document.querySelector('.send-btn');
const logoutBtn = document.getElementById('logoutBtn');
const newChatBtn = document.getElementById('newChatBtn');
const sessionList = document.getElementById('sessionList');
const attachBtn = document.getElementById('attachBtn');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

// Logout Logic
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // tailored for this app
        window.location.href = 'signin.html';
    });
}

// ============================================
// State
// ============================================
let isThinking = false;
let currentModel = 'gemini-pro'; // Default fallback
let currentSessionId = null;
let currentBase64Image = null; // Store image data before sending

// ============================================
// Functions
// ============================================

/**
 * Creates a new chat session
 */
async function startNewChat() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const session = await res.json();
        currentSessionId = session._id;

        // Clear UI
        chatMessages.innerHTML = '';
        addMessage(`Hi! I'm FitBot 🏋️. I'm here to help you crush your fitness goals! Ask me for a workout plan or diet tips.`, 'bot');

        // Reload list
        await loadSessionList();
    } catch (e) {
        console.error("Failed to start new chat", e);
    }
}

/**
 * Loads the list of past sessions
 */
async function loadSessionList() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const sessions = await res.json();

        sessionList.innerHTML = '';
        sessions.forEach(session => {
            const div = document.createElement('div');
            div.className = `session-item ${session._id === currentSessionId ? 'active' : ''}`;

            // Title Span
            const titleSpan = document.createElement('span');
            titleSpan.textContent = session.title;
            titleSpan.onclick = () => loadSession(session._id);

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-session-btn';
            deleteBtn.innerHTML = '&times;'; // X icon
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent ensuring session load
                deleteSession(session._id);
            };

            div.appendChild(titleSpan);
            div.appendChild(deleteBtn);
            sessionList.appendChild(div);
        });

        // If no session is selected yet, select the most recent one
        if (!currentSessionId && sessions.length > 0) {
            loadSession(sessions[0]._id);
        } else if (sessions.length === 0) {
            // No sessions at all? Create one automatically
            startNewChat();
        }
    } catch (e) {
        console.error("Failed to load sessions", e);
    }
}

/**
 * Deletes a session
 */
async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // If we deleted the active session, clear ID
        if (currentSessionId === sessionId) {
            currentSessionId = null;
            chatMessages.innerHTML = ''; // Clear view
        }

        await loadSessionList(); // Refresh list
    } catch (e) {
        console.error("Failed to delete session", e);
    }
}

/**
 * Loads a specific session's history
 */
async function loadSession(sessionId) {
    currentSessionId = sessionId;
    chatMessages.innerHTML = ''; // Clear current view

    // Update active class in sidebar
    document.querySelectorAll('.session-item').forEach(item => item.classList.remove('active'));
    // We re-render list to update active class or just manually toggle? Re-render is safer but slower. 
    // Let's just re-fetch list is better for synchronization
    await loadSessionList();

    // Fetch messages
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await res.json();

        history.forEach(msg => {
            addMessage(msg.message, msg.sender, msg.image);
        });

        if (history.length === 0) {
            addMessage(`Hi! I'm FitBot 🏋️. Ready for a new workout?`, 'bot');
        }
    } catch (e) {
        console.error("Failed to load history", e);
    }
}

/**
 * Creates and appends a message to the chat container.
 * @param {string} text - The message content.
 * @param {string} type - 'user' or 'bot'.
 * @param {string} imageUrl - Optional image Base64 data.
 */
function addMessage(text, type, imageUrl = null) {
    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${type}`;

    // Avatar SVG
    const botAvatarHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" class="bot-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor"/>
            </svg>
        </div>`;

    const messageContentHTML = `
        <div class="message-content">
            ${imageUrl ? `<img src="${imageUrl}" class="chat-image" alt="Uploaded Image">` : ''}
            ${type === 'bot' ? parseMarkdown(text) : `<p>${text}</p>`}
            <span class="timestamp">${getCurrentTime()}</span>
        </div>`;

    if (type === 'bot') {
        messageGroup.innerHTML = botAvatarHTML + messageContentHTML;
    } else {
        messageGroup.innerHTML = messageContentHTML;
    }

    chatMessages.appendChild(messageGroup);
    scrollToBottom();
}

/**
 * Parses simple Markdown (Bold, Italic, Lists) into HTML.
 * @param {string} text - The raw text with markdown symbols.
 * @returns {string} - The HTML formatted string.
 */
function parseMarkdown(text) {
    let html = text;

    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Headers (### Header)
    html = html.replace(/### (.*?)\n/g, '<h3>$1</h3>');

    // Unordered Lists (* item) - handle multi-line lists
    const lines = html.split('\n');
    let inList = false;
    let newLines = [];

    lines.forEach(line => {
        if (line.trim().startsWith('* ')) {
            if (!inList) {
                newLines.push('<ul>');
                inList = true;
            }
            newLines.push(`<li>${line.trim().substring(2)}</li>`);
        } else {
            if (inList) {
                newLines.push('</ul>');
                inList = false;
            }
            // Normal paragraphs (only if non-empty)
            if (line.trim().length > 0) {
                newLines.push(`<p>${line}</p>`);
            }
        }
    });

    if (inList) newLines.push('</ul>');

    return newLines.join('');
}

/**
 * Shows the typing indicator.
 */
function showLoading() {
    const loadingGroup = document.createElement('div');
    loadingGroup.className = 'message-group bot typing-indicator-group';
    loadingGroup.innerHTML = `
        <div class="message-avatar">
           <svg viewBox="0 0 24 24" fill="none" class="bot-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor"/>
            </svg>
        </div>
        <div class="message-content typing">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatMessages.appendChild(loadingGroup);
    scrollToBottom();
    return loadingGroup;
}

/**
 * AUTO-DISCOVERY: Finds a working model for this API key.
 */
async function findBestModel() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return; // Cannot fetch models if not logged in (protected route)

        // Fetch from OUR backend now, not Google directly
        const response = await fetch('/api/chat/models', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.models) {
            // Find the first model that supports generateContent
            const model = data.models.find(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent') &&
                (m.name.includes('gemini') || m.name.includes('flash') || m.name.includes('pro'))
            );
            if (model) {
                // model.name comes in like "models/gemini-1.5-flash"
                // Our API call expects just the full URL or correct path
                currentModel = model.name.replace('models/', '');
                console.log("Auto-selected model:", currentModel);
                return;
            }
        }
    } catch (e) {
        console.error("Model discovery failed, using default:", e);
    }
}

/**
 * Calls the API to get a response.
 */
async function generateResponse(prompt, imageBase64 = null) {
    if (isThinking) return;
    isThinking = true;

    const loadingElement = showLoading();

    try {
        // Send to OUR Backend (which talks to Google and saves to DB)
        const token = localStorage.getItem('token');
        if (!token) {
            addMessage("Error: You are not logged in.", 'bot');
            return;
        }

        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: prompt,
                sessionId: currentSessionId,
                image: imageBase64
            })
        });

        const data = await response.json();

        if (loadingElement) loadingElement.remove();

        if (!response.ok) {
            throw new Error(data.message || 'Server Error');
        }

        // Backend returns { reply: "..." }
        if (data.reply) {
            addMessage(data.reply, 'bot');
        } else {
            addMessage("I'm not sure what to say.", 'bot');
        }

    } catch (error) {
        if (loadingElement) loadingElement.remove();
        console.error('Error:', error);
        addMessage("Sorry, I encountered an error connecting to the server.", 'bot');
    } finally {
        isThinking = false;
    }
}




function handleSend() {
    const text = userInput.value.trim();
    if (!text && !currentBase64Image) return;
    if (isThinking) return;
    
    // Store image locally before clearing
    const imageToSend = currentBase64Image;
    
    addMessage(text || 'Sent an image', 'user', imageToSend);
    userInput.value = '';
    
    // Clear the image preview state immediately after sending
    clearImagePreview();

    generateResponse(text, imageToSend);
}

// --- Image Attachment Handling ---
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentBase64Image = e.target.result;
        imagePreview.src = currentBase64Image;
        imagePreviewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function clearImagePreview() {
    currentBase64Image = null;
    imageInput.value = ''; // clear file input
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
}

if (attachBtn && imageInput) {
    attachBtn.addEventListener('click', () => {
        imageInput.click();
    });
}
if (imageInput) {
    imageInput.addEventListener('change', handleImageSelect);
}
if (removeImageBtn) {
    removeImageBtn.addEventListener('click', clearImagePreview);
}
// ---------------------------------

function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event Listeners
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });
newChatBtn.addEventListener('click', startNewChat);

// Initialization
window.addEventListener('load', async () => {
    // Load Sessions (which will auto-load the most recent chat)
    await loadSessionList();
});
