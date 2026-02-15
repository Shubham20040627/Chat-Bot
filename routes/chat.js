const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Chat = require('../models/Chat');
// fetch is global in Node v18+

// GET /api/chat/history - Get messages for a specific session
router.get('/history', protect, async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            // Optional: fallback to just listing most recent if no session provided?
            // Or return error. For now, let's return error if client expects session.
            return res.status(400).json({ message: 'Session ID required' });
        }

        const chats = await Chat.find({ session: sessionId }).sort({ timestamp: 1 });
        res.json(chats);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /api/chat/models - Get available models (Proxied)
router.get('/models', protect, async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const BASE_URL = `https://generativelanguage.googleapis.com/v1beta`;

        const response = await fetch(`${BASE_URL}/models?key=${GEMINI_API_KEY}`);
        const data = await response.json();

        res.json(data);
    } catch (err) {
        console.error("Model Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch models" });
    }
});

// POST /api/chat/message - Send message & Get Reply
router.post('/message', protect, async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user.userId;

        // 1. Save User Message
        const userChat = new Chat({
            user: userId,
            session: sessionId, // Can be undefined if optional
            message: message,
            sender: 'user'
        });
        await userChat.save();

        // 2. Fetch Context (Last 10 messages from THIS session)
        const historyQuery = { user: userId };
        if (sessionId) historyQuery.session = sessionId;

        const history = await Chat.find(historyQuery)
            .sort({ timestamp: -1 })
            .limit(10);

        // Reverse to get chronological order (Oldest -> Newest)
        const contextMessages = history.reverse().map(msg => `${msg.sender === 'user' ? 'User' : 'FitBot'}: ${msg.message}`).join('\n');

        // 3. Call Google Gemini API (Server Side)
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        // System Prompt with Context
        const systemInstruction = `YOU ARE A HEALTH & FITNESS COACH. Your name is FitBot. You provide expert advice on workouts, diet, nutrition, and mental wellness. Be motivating, energetic, and helpful. If the user asks about topics unrelated to health/fitness (like coding, math, history), politely decline and steer them back to fitness.\n\n`;
        const dateContext = `Current System Time: ${new Date().toString()}.\n`;
        const chatHistoryContext = `\n--- RECENT CHAT HISTORY ---\n${contextMessages}\n--- END OF HISTORY ---\n`;

        const finalPrompt = systemInstruction + dateContext + chatHistoryContext + "User Query: " + message;

        // Fetch from Google
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Google API Error:", JSON.stringify(data, null, 2));
        }

        let botText = "Sorry, I'm having trouble thinking right now.";
        if (data.candidates && data.candidates[0].content) {
            botText = data.candidates[0].content.parts[0].text;
        } else {
            console.error("⚠️ Unexpected API Response Structure:", JSON.stringify(data, null, 2));
        }

        // 3. Save Bot Response
        const botChat = new Chat({
            user: userId,
            session: sessionId, // Ensure this is passed!
            message: botText,
            sender: 'bot'
        });
        await botChat.save();

        // 4. Return to frontend
        res.json({ reply: botText });

    } catch (err) {
        console.error("Chat Error:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
