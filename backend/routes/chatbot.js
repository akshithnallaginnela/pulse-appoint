const express = require('express');
const chatbotService = require('../services/chatbotService');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   POST /api/chatbot/session/new
// @desc    Create new conversation session
// @access  Private
router.post('/session/new', verifyToken, async (req, res) => {
    try {
        const conversation = await chatbotService.getOrCreateConversation(req.user._id);

        res.json({
            success: true,
            sessionId: conversation.sessionId,
            message: 'New session created successfully'
        });
    } catch (error) {
        console.error('New session error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating new session'
        });
    }
});

// @route   POST /api/chatbot/message
// @desc    Send message to chatbot
// @access  Private
router.post(
    '/message',
    verifyToken,
    [
        body('message').trim().notEmpty().withMessage('Message is required'),
        body('sessionId').optional().isString()
    ],
    async (req, res) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: errors.array()
                });
            }

            const { message, sessionId } = req.body;
            console.log('[Chatbot Route] Received message:', message, 'sessionId:', sessionId);

            const result = await chatbotService.processMessage(
                req.user._id,
                message.trim(),
                sessionId
            );

            console.log('[Chatbot Route] Response:', result.response);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Chatbot message error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing your message. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// @route   GET /api/chatbot/session/:sessionId
// @desc    Get conversation history
// @access  Private
router.get('/session/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const history = await chatbotService.getConversationHistory(sessionId);

        res.json({
            success: true,
            sessionId,
            messages: history
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving conversation history'
        });
    }
});

// @route   DELETE /api/chatbot/session/:sessionId
// @desc    End a conversation session
// @access  Private
router.delete('/session/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const result = await chatbotService.endConversation(sessionId);

        res.json({
            success: result,
            message: result ? 'Session ended successfully' : 'Session not found'
        });
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending conversation session'
        });
    }
});

module.exports = router;
