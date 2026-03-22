const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Session = require('../models/Session');
const Chat = require('../models/Chat');

// POST /api/sessions - Create New Session
router.post('/', protect, async (req, res) => {
    try {
        const newSession = new Session({
            user: req.user.userId,
            title: `New Chat ${new Date().toLocaleTimeString()}`
        });
        await newSession.save();
        res.json(newSession);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /api/sessions - Get All Sessions for User
router.get('/', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ user: req.user.userId }).sort({ timestamp: -1 });
        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', protect, async (req, res) => {
    try {
        const sessionId = req.params.id;

        // Check if session exists and belongs to user
        const session = await Session.findOne({ _id: sessionId, user: req.user.userId });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Delete all chats in this session
        await Chat.deleteMany({ session: sessionId });

        // Delete the session itself
        await Session.findByIdAndDelete(sessionId);

        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
