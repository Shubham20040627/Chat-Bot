const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String, // The actual text
        required: false // Optional if sending an image
    },
    sender: {
        type: String, // 'user' or 'bot'
        required: true,
        enum: ['user', 'bot']
    },
    image: {
        type: String, // Base64 string of the image
        required: false
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: false // Made optional to prevent errors during migration
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Chat', chatSchema);
