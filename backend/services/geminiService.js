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
      const systemPrompt = `You are a friendly, knowledgeable customer support assistant for **PulseAppoint**, a doctor appointment booking platform.

YOUR CAPABILITIES — you must help patients with ALL of the following:

1. **Booking Appointments**
   - Explain step-by-step how to book: go to Doctors page → select a doctor → choose date & time → confirm & pay.
   - Guide users to the /doctors page to browse or search by specialization.

2. **Cancelling Appointments**
   - Explain: go to Appointments page → find the appointment → click Cancel.
   - Important rule: appointments cannot be cancelled within 12 hours of booking. They must wait 12 hours after booking time.
   - Refund policy: if cancelled more than 24 hours before appointment → 100% refund; within 24 hours → 50% refund; less than 2 hours → no refund.

3. **Rescheduling Appointments**
   - Explain: visit the Appointments page and use the reschedule option.
   - Must be done at least 2 hours before the original appointment time.

4. **Doctor Information**
   - Help users find doctors by specialization (Cardiologist, Pediatrician, Dermatologist, etc.).
   - Doctor profiles include: specialization, experience, ratings, consultation fee, availability, bio, languages, and services.

5. **Payment & Billing**
   - Payments are processed through Razorpay (supports UPI, cards, net banking).
   - Consultation fees vary by doctor and are shown on their profile.
   - Refunds are processed to original payment method within 5-7 business days.

6. **Account & Profile**
   - Users can create an account, log in, and manage their profile.
   - Appointment history is visible on the Appointments page.

7. **Platform Navigation**
   - Home page (/): overview and featured doctors.
   - Doctors page (/doctors): browse and search all doctors.
   - Appointments page (/appointments): view all your appointments.
   - About page (/about): learn about PulseAppoint.

8. **General Medical Queries**
   - Provide general health awareness information.
   - ALWAYS add a disclaimer: "This is for informational purposes only. Please consult a doctor for medical advice."
   - Never diagnose conditions or prescribe medications.

RESPONSE GUIDELINES:
- Be concise but thorough. Use bullet points and bold text for clarity.
- Be empathetic and professional.
- If a question is outside your scope, politely redirect to contacting support.
- Always suggest the next logical step for the user.
- Use emojis sparingly for friendliness.

${context ? `Recent conversation context:\n${context}\n` : ''}

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
      const prompt = `Analyze the following user message for a doctor appointment booking platform's customer support chatbot.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "intent": "one of: book_appointment, check_availability, find_doctor, cancel_appointment, reschedule_appointment, view_appointments, doctor_details, payment_info, refund_query, how_to_book, how_to_cancel, how_to_reschedule, account_help, platform_help, medical_query, greeting, farewell, thanks, complaint, urgent_help, other",
  "entities": {
    "doctorName": "extracted doctor name or null",
    "specialization": "extracted specialization or null",
    "date": "extracted date in YYYY-MM-DD format or null",
    "time": "extracted time in HH:MM format or null",
    "appointmentId": "any reference to appointment number/id or null",
    "topic": "the main topic of the query or null"
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
      'rheumatologist', 'nephrologist', 'hematologist', 'family medicine',
      'internal medicine', 'emergency medicine', 'anesthesiologist',
      'infectious disease'
    ];

    let intent = 'other';
    const entities = {
      doctorName: null,
      specialization: null,
      date: null,
      time: null,
      appointmentId: null,
      topic: null
    };

    // Detect specialization
    for (const spec of specializations) {
      if (lower.includes(spec)) {
        entities.specialization = spec.charAt(0).toUpperCase() + spec.slice(1);
        break;
      }
    }

    // Detect doctor name (e.g., "Dr. Smith", "Dr. harshaa N", "doctor John")
    const drMatch = message.match(/\bdr\.?\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i)
      || message.match(/\bdoctor\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i);
    if (drMatch) {
      // Remove trailing words that are common non-name tokens
      let name = drMatch[1].trim();
      // Remove trailing noise words like 'available', 'today', 'appointment', etc.
      name = name.replace(/\b(available|availability|today|tomorrow|appointment|details|info|profile|please|is|the|for|on|at)\b.*$/i, '').trim();
      if (name.length > 0) {
        entities.doctorName = name;
      }
    }

    // Detect date (basic patterns)
    const todayDate = new Date();
    if (/\btoday\b/.test(lower)) {
      entities.date = todayDate.toISOString().split('T')[0];
    } else if (/\btomorrow\b/.test(lower)) {
      const tmrw = new Date(todayDate);
      tmrw.setDate(tmrw.getDate() + 1);
      entities.date = tmrw.toISOString().split('T')[0];
    } else {
      // Try YYYY-MM-DD
      const isoMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (isoMatch) entities.date = isoMatch[1];
    }

    // Detect time (e.g., "10:00 AM", "2:30 PM", "14:30")
    const timeMatch = message.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i)
      || message.match(/\b(\d{1,2}\s*(?:am|pm))\b/i);
    if (timeMatch) {
      entities.time = timeMatch[1].trim();
    }

    // Detect intent — ordered from most specific to least
    if (/\b(hi|hello|hey|good morning|good evening|good afternoon)\b/.test(lower)) {
      intent = 'greeting';
    } else if (/\b(bye|goodbye|see you|take care)\b/.test(lower)) {
      intent = 'farewell';
    } else if (/\b(thanks|thank you|appreciate|thx)\b/.test(lower)) {
      intent = 'thanks';
    } else if (/how.*(book|schedule|make.*appointment)|steps.*book|process.*book|guide.*book/.test(lower)) {
      intent = 'how_to_book';
    } else if (/how.*(cancel|cancellation)|steps.*cancel|process.*cancel|guide.*cancel/.test(lower)) {
      intent = 'how_to_cancel';
    } else if (/how.*(reschedule|change.*appointment)|steps.*reschedule/.test(lower)) {
      intent = 'how_to_reschedule';
    } else if (/\b(refund|money back|get.*refund|refund.*policy|refund.*status)\b/.test(lower)) {
      intent = 'refund_query';
    } else if (/\b(payment|pay|billing|charge|fee|cost|price|how much)\b/.test(lower)) {
      intent = 'payment_info';
    } else if (/\b(book|schedule|appointment|make an appointment)\b/.test(lower)) {
      intent = 'book_appointment';
    } else if (/\b(available|availability|free|open slot|when.*available)\b/.test(lower)) {
      intent = 'check_availability';
    } else if (/\b(cancel)\b/.test(lower)) {
      intent = 'cancel_appointment';
    } else if (/\b(reschedule|change.*time|move.*appointment)\b/.test(lower)) {
      intent = 'reschedule_appointment';
    } else if (/\b(my appointment|view|upcoming|list.*appointment|appointment.*history)\b/.test(lower)) {
      intent = 'view_appointments';
    } else if (/doctor.*detail|about.*doctor|doctor.*info|profile|qualifi|experience|rating|review/.test(lower)) {
      intent = 'doctor_details';
    } else if (/\b(find|search|looking for|doctor|specialist)\b/.test(lower) || entities.specialization) {
      intent = 'find_doctor';
    } else if (/\b(account|profile|login|sign.*up|register|password|forgot)\b/.test(lower)) {
      intent = 'account_help';
    } else if (/how.*work|what.*pulseappoint|about.*platform|feature|help|support|navigate|where|page/.test(lower)) {
      intent = 'platform_help';
    } else if (/\b(health|symptom|disease|condition|medicine|treatment|diagnos|sick|pain|fever|cold|cough|headache)\b/.test(lower)) {
      intent = 'medical_query';
    } else if (/\b(complaint|issue|problem|not working|bug|error|wrong)\b/.test(lower)) {
      intent = 'complaint';
    } else if (/\b(urgent|emergency|immediately|asap)\b/.test(lower)) {
      intent = 'urgent_help';
    }

    // If we found a specialization but intent is still 'other', default to find_doctor
    if (entities.specialization && intent === 'other') {
      intent = 'find_doctor';
    }

    // If we found a doctor name but intent is still 'other', default to find_doctor
    if (entities.doctorName && intent === 'other') {
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
