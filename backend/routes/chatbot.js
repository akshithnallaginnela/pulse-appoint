const express = require('express');
const { v4: uuidv4 } = require('uuid');
const chatbotService = require('../services/chatbotService');

const router = express.Router();

// Optional auth — extract userId if token is present but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (_) {
    // Token invalid or expired — continue without auth
  }
  next();
};

// @route   POST /api/chatbot/session
// @desc    Create a new chat session
// @access  Public
router.post('/session', (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

// @route   POST /api/chatbot/message
// @desc    Send a message to the chatbot
// @access  Public (optional auth for user-specific features)
router.post('/message', optionalAuth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    console.log(`[Chatbot Route] Received message: ${message.substring(0, 100)} sessionId: ${sessionId}`);

    const userId = req.user ? req.user._id : null;
    const result = await chatbotService.processMessage(sessionId, message.trim(), userId);

    console.log(`[Chatbot Route] Response: ${result.response.substring(0, 100)}`);

    res.json({
      response: result.response,
      intent: result.intent,
      entities: result.entities,
      sessionId
    });
  } catch (error) {
    console.error('Chatbot route error:', error);
    res.status(500).json({
      message: 'Sorry, something went wrong. Please try again.',
      response: "I'm having trouble right now. Please try again in a moment."
    });
  }
});

module.exports = router;
