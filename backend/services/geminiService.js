const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Chatbot AI features will be limited.');
      this.model = null;
      return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash (gemini-pro is deprecated and no longer available)
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Generate a conversational response for the chatbot
   */
  async generateResponse(prompt, context = '') {
    if (!this.model) {
      return null; // Caller should use fallback
    }

    try {
      const systemPrompt = `You are a helpful medical appointment assistant for PulseAppoint, a doctor appointment booking platform.
Your role is to help patients:
- Find doctors by specialization
- Book appointments
- Check availability
- Answer general questions about the platform

Keep responses concise, friendly, and helpful. Do not provide medical advice or diagnoses.
If you don't know something, suggest the user contact support.

${context ? `Context: ${context}` : ''}

User message: ${prompt}`;

      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  }

  /**
   * Analyze user intent from a chat message
   */
  async analyzeIntent(message) {
    if (!this.model) {
      return this._fallbackIntentAnalysis(message);
    }

    try {
      const prompt = `Analyze the following user message and extract the intent and entities for a doctor appointment booking system.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "intent": "one of: book_appointment, check_availability, find_doctor, cancel_appointment, reschedule_appointment, view_appointments, greeting, farewell, thanks, other",
  "entities": {
    "doctorName": "extracted doctor name or null",
    "specialization": "extracted specialization or null",
    "date": "extracted date in YYYY-MM-DD format or null",
    "time": "extracted time in HH:MM format or null"
  },
  "confidence": 0.0 to 1.0
}

User message: "${message}"`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Clean potential markdown code fences
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return this._fallbackIntentAnalysis(message);
    }
  }

  /**
   * Keyword-based fallback when AI is unavailable
   */
  _fallbackIntentAnalysis(message) {
    const lower = message.toLowerCase();

    const specializations = [
      'cardiologist', 'pediatrician', 'dermatologist', 'orthopedic',
      'general physician', 'neurologist', 'gynecologist', 'psychiatrist',
      'oncologist', 'radiologist', 'ophthalmologist', 'ent specialist',
      'urologist', 'endocrinologist', 'gastroenterologist', 'pulmonologist',
      'rheumatologist', 'nephrologist', 'hematologist'
    ];

    let intent = 'other';
    const entities = {
      doctorName: null,
      specialization: null,
      date: null,
      time: null
    };

    // Detect specialization
    for (const spec of specializations) {
      if (lower.includes(spec)) {
        entities.specialization = spec.charAt(0).toUpperCase() + spec.slice(1);
        break;
      }
    }

    // Detect intent
    if (/\b(hi|hello|hey|good morning|good evening)\b/.test(lower)) {
      intent = 'greeting';
    } else if (/\b(bye|goodbye|see you|take care)\b/.test(lower)) {
      intent = 'farewell';
    } else if (/\b(thanks|thank you|appreciate)\b/.test(lower)) {
      intent = 'thanks';
    } else if (/\b(book|schedule|appointment|make an appointment)\b/.test(lower)) {
      intent = 'book_appointment';
    } else if (/\b(available|availability|free|open slot|check)\b/.test(lower)) {
      intent = 'check_availability';
    } else if (/\b(find|search|looking for|doctor|specialist)\b/.test(lower) || entities.specialization) {
      intent = 'find_doctor';
    } else if (/\b(cancel)\b/.test(lower)) {
      intent = 'cancel_appointment';
    } else if (/\b(reschedule|change|move)\b/.test(lower)) {
      intent = 'reschedule_appointment';
    } else if (/\b(my appointment|view|upcoming|list)\b/.test(lower)) {
      intent = 'view_appointments';
    }

    // If we found a specialization but intent is still 'other', default to find_doctor
    if (entities.specialization && intent === 'other') {
      intent = 'find_doctor';
    }

    return {
      intent,
      entities,
      confidence: 0.6
    };
  }
}

module.exports = new GeminiService();
