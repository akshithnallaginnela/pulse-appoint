const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;

        if (!this.apiKey) {
            console.warn('⚠️  GEMINI_API_KEY not found in environment variables. Chatbot will use fallback responses.');
            this.genAI = null;
            this.model = null;
        } else {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        }

        // System prompt for healthcare assistant personality
        this.systemPrompt = `You are a helpful and friendly healthcare assistant for a doctor appointment booking system.

Your capabilities:
- Help patients book appointments with doctors
- Search for doctors by specialization or name
- View and manage patient appointments
- Answer questions about the healthcare system
- Provide information about doctors (specialization, experience, fees, ratings)

Your personality:
- Friendly, professional, and empathetic
- Clear and concise in communication
- Patient and understanding
- Always verify information before taking actions
- Proactive in offering help and suggestions

Important guidelines:
- Always ask for missing information (doctor name, date, time) before booking
- Confirm appointments before finalizing
- Suggest alternatives if a doctor is unavailable
- Keep responses concise but informative
- Use emojis sparingly for a friendly touch
- Never make assumptions about medical conditions
- Always maintain patient privacy and confidentiality

When users ask to:
- "Book appointment" or "Schedule appointment" → Ask for specialization or doctor name, then date and time
- "Find doctor" or "Search doctor" → Ask for specialization or specific requirements
- "View appointments" or "My appointments" → Show their upcoming appointments
- "Cancel appointment" → Ask which appointment to cancel and confirm
- "Reschedule appointment" → Ask which appointment and new date/time

Format your responses in a conversational, natural way. Use markdown formatting when helpful (bold for emphasis, lists for options).`;
    }

    /**
     * Generate AI response with conversation context
     * @param {string} userMessage - The user's message
     * @param {Array} conversationHistory - Previous messages for context
     * @returns {Promise<string>} - AI generated response
     */
    async generateResponse(userMessage, conversationHistory = []) {
        try {
            // If no API key, return fallback response
            if (!this.model) {
                return this.getFallbackResponse(userMessage);
            }

            // Build conversation context
            let prompt = this.systemPrompt + '\n\n';

            // Add conversation history (last 10 messages for context)
            const recentHistory = conversationHistory.slice(-10);
            if (recentHistory.length > 0) {
                prompt += 'Previous conversation:\n';
                recentHistory.forEach(msg => {
                    const role = msg.role === 'user' ? 'Patient' : 'Assistant';
                    prompt += `${role}: ${msg.content}\n`;
                });
                prompt += '\n';
            }

            // Add current user message
            prompt += `Patient: ${userMessage}\n\nAssistant:`;

            // Generate response
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return text.trim();
        } catch (error) {
            console.error('Error generating AI response:', error);

            // Return fallback response on error
            return this.getFallbackResponse(userMessage);
        }
    }

    /**
     * Analyze user intent from message
     * @param {string} message - User's message
     * @returns {Promise<Object>} - Intent and entities
     */
    async analyzeIntent(message) {
        try {
            if (!this.model) {
                return this.getFallbackIntent(message);
            }

            const prompt = `Analyze the following patient message and extract:
1. Primary intent (one of: greeting, book_appointment, search_doctors, view_appointments, cancel_appointment, reschedule_appointment, doctor_info, help, other)
2. Entities: doctor name, specialization, date, time

Message: "${message}"

Respond in JSON format:
{
  "intent": "intent_name",
  "entities": {
    "doctorName": "extracted doctor name or null",
    "specialization": "extracted specialization or null",
    "date": "extracted date in natural language or null",
    "time": "extracted time or null"
  },
  "confidence": 0.0-1.0
}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return analysis;
            }

            return this.getFallbackIntent(message);
        } catch (error) {
            console.error('Error analyzing intent:', error);
            return this.getFallbackIntent(message);
        }
    }

    /**
     * Get fallback response when AI is unavailable
     */
    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return "Hello! 👋 I'm your healthcare assistant. I can help you book appointments, find doctors, or view your appointments. How can I assist you today?";
        }

        if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
            return "I'd be happy to help you book an appointment! Could you tell me what type of doctor you're looking for? For example, a cardiologist, pediatrician, or general physician?";
        }

        if (lowerMessage.includes('doctor') || lowerMessage.includes('find')) {
            return "I can help you find a doctor. What specialization are you looking for? (e.g., Cardiologist, Pediatrician, Dermatologist)";
        }

        if (lowerMessage.includes('my appointments') || lowerMessage.includes('view') || lowerMessage.includes('show')) {
            return "Let me fetch your appointments for you...";
        }

        if (lowerMessage.includes('cancel')) {
            return "I can help you cancel an appointment. Let me show you your upcoming appointments first.";
        }

        if (lowerMessage.includes('help')) {
            return `I can help you with:

📅 **Book Appointments** - Schedule a visit with a doctor
👨‍⚕️ **Find Doctors** - Search by specialization or name
📋 **View Appointments** - See your upcoming appointments
❌ **Cancel Appointments** - Cancel existing appointments
🔄 **Reschedule** - Change appointment date or time

What would you like to do?`;
        }

        return "I'm here to help you with appointments and finding doctors. Could you please tell me what you'd like to do?";
    }

    /**
     * Get fallback intent analysis
     */
    getFallbackIntent(message) {
        const lowerMessage = message.toLowerCase();
        let intent = 'other';
        const entities = {
            doctorName: null,
            specialization: null,
            date: null,
            time: null
        };

        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            intent = 'greeting';
        } else if (lowerMessage.includes('book') || lowerMessage.includes('schedule')) {
            intent = 'book_appointment';
        } else if (lowerMessage.includes('find') || lowerMessage.includes('search')) {
            intent = 'search_doctors';
        } else if (lowerMessage.includes('my appointments') || lowerMessage.includes('view')) {
            intent = 'view_appointments';
        } else if (lowerMessage.includes('cancel')) {
            intent = 'cancel_appointment';
        } else if (lowerMessage.includes('reschedule')) {
            intent = 'reschedule_appointment';
        } else if (lowerMessage.includes('help')) {
            intent = 'help';
        }

        // Simple entity extraction
        const specializations = ['cardiologist', 'pediatrician', 'dermatologist', 'neurologist', 'orthopedic', 'general physician'];
        for (const spec of specializations) {
            if (lowerMessage.includes(spec)) {
                entities.specialization = spec;
                break;
            }
        }

        return {
            intent,
            entities,
            confidence: 0.6
        };
    }
}

module.exports = new GeminiService();
