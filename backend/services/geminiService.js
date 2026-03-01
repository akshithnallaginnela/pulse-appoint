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
  "intent": "one of: book_appointment, check_availability, find_doctor, cancel_appointment, reschedule_appointment, view_appointments, doctor_details, symptom_analysis, payment_info, refund_query, how_to_book, how_to_cancel, how_to_reschedule, account_help, platform_help, medical_query, greeting, farewell, thanks, complaint, urgent_help, other",
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
      // Remove trailing noise words like 'available', 'book', 'appointment', etc.
      name = name.replace(/\b(available|availability|today|tomorrow|appointment|details|info|profile|please|is|the|for|on|at|book|booking|cancel|schedule|check|find|search)\b.*$/i, '').trim();
      if (name.length > 0) {
        entities.doctorName = name;
      }
    }

    // Detect date (basic patterns)
    const todayDate = new Date();
    const monthNames = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };
    // Helper: format Date to YYYY-MM-DD using local time (avoids UTC timezone shift)
    const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    if (/\btoday\b/.test(lower)) {
      entities.date = fmtDate(todayDate);
    } else if (/\btomorrow\b/.test(lower)) {
      const tmrw = new Date(todayDate);
      tmrw.setDate(tmrw.getDate() + 1);
      entities.date = fmtDate(tmrw);
    } else if (/\bday after tomorrow\b/.test(lower)) {
      const dat = new Date(todayDate);
      dat.setDate(dat.getDate() + 2);
      entities.date = fmtDate(dat);
    } else {
      // Try YYYY-MM-DD
      const isoMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (isoMatch) {
        entities.date = isoMatch[1];
      } else {
        // Try "March 12th", "march 12", "Mar 5th"
        const monthDayMatch = lower.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
        if (monthDayMatch && monthNames[monthDayMatch[1]] !== undefined) {
          const month = monthNames[monthDayMatch[1]];
          const day = parseInt(monthDayMatch[2]);
          const year = todayDate.getFullYear();
          const d = new Date(year, month, day);
          if (d < todayDate) d.setFullYear(year + 1);
          entities.date = fmtDate(d);
        } else {
          // Try "12th March", "12 march"
          const dayMonthMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\b/);
          if (dayMonthMatch && monthNames[dayMonthMatch[2]] !== undefined) {
            const day = parseInt(dayMonthMatch[1]);
            const month = monthNames[dayMonthMatch[2]];
            const year = todayDate.getFullYear();
            const d = new Date(year, month, day);
            if (d < todayDate) d.setFullYear(year + 1);
            entities.date = fmtDate(d);
          } else {
            // Try DD/MM/YYYY or DD-MM-YYYY
            const dmyMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
            if (dmyMatch) {
              const d = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
              entities.date = fmtDate(d);
            }
          }
        }
      }
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
    } else if (/how.*(\bbook\b|\bschedule\b|make.*appointment)|steps.*\bbook\b|process.*\bbook\b|guide.*\bbook\b|help.*(\bbook\b|\bbooking\b)|booking.*(process|steps|guide|procedure)/.test(lower)) {
      intent = 'how_to_book';
    } else if (/how.*(cancel|cancellation)|steps.*cancel|process.*(cancel|cancellation)|guide.*cancel|help.*(cancel|cancellation)|cancell?ation.*(process|steps|guide|procedure|policy|help)/.test(lower)) {
      intent = 'how_to_cancel';
    } else if (/how.*(reschedule|change.*appointment)|steps.*reschedule|process.*reschedule|help.*reschedul|reschedul.*(process|steps|guide|procedure)/.test(lower)) {
      intent = 'how_to_reschedule';
    } else if (/\b(refund|money back|get.*refund|refund.*policy|refund.*status)\b/.test(lower)) {
      intent = 'refund_query';
    } else if (/\b(payment|pay|billing|charge|fee|cost|price|how much)\b/.test(lower)) {
      intent = 'payment_info';
    } else if (/\b(available|availability|free|open slot|when.*available)\b/.test(lower) && (/doctor|dr\.|specialist|appointment|slot|schedule/.test(lower) || entities.doctorName || entities.specialization)) {
      intent = 'check_availability';
    } else if (/\b(cancell?ation|cancel)\b/.test(lower)) {
      intent = 'cancel_appointment';
    } else if (/\b(reschedule|change.*time|move.*appointment)\b/.test(lower)) {
      intent = 'reschedule_appointment';
    } else if (/\b(my appointments?|show.*appointments?|view.*appointments?|upcoming.*appointments?|list.*appointments?|appointments?.*history)\b/.test(lower)) {
      intent = 'view_appointments';
    } else if (/\b(complaint|issue|problem|not working|bug|error|wrong|bad experience|poor experience|disappointed|terrible|dissatisfied|unsatisfied)\b/.test(lower)) {
      intent = 'complaint';
    } else if (/\b(book|schedule)\b/.test(lower) || /\bmake an appointment\b/.test(lower)) {
      intent = 'book_appointment';
    } else if (/doctor.*detail|about.*(doctor|dr\.?\s)|tell.*about.*(doctor|dr\.?\s)|tell.*more.*about|doctor.*info|profile|qualifi|experience|rating|review/.test(lower)) {
      intent = 'doctor_details';
    } else if (/\b(find|search|looking for|specialist)\b/.test(lower) || entities.specialization) {
      intent = 'find_doctor';
    } else if (/\b(account|login|sign.*up|register|password|forgot)\b/.test(lower)) {
      intent = 'account_help';
    } else if (/how.*work|what.*pulseappoint|about.*platform|feature|navigate|where.*page|what.*page|platform.*(help|support|guide)|how.*use/.test(lower)) {
      intent = 'platform_help';
    } else if (/\b(urgent|emergency|immediately|asap)\b/.test(lower)) {
      intent = 'urgent_help';
    } else if (/what (are|is) .*(symptom|cause|treatment|sign|risk)|tell me about .*(disease|condition|illness)|how to (prevent|treat|cure)/.test(lower)) {
      intent = 'medical_query';
    } else if (/\b(health|symptom|disease|condition|medicine|treatment|diagnos|sick|pain|fever|cold|cough|headache|rash|acne|vomit|nausea|dizziness|bleeding|swelling|itching|burning|cramp|ache|sore|infection|allergy|breathing|wheez|fatigue|weakness|numbness|tingling|blurr|stomach|chest|joint|back pain|knee|throat|ear pain|anxiety|depression|insomnia|pimple|hair loss|acidity|constipation|diarrhea)\b/.test(lower)) {
      intent = 'symptom_analysis';
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
  /**
   * Analyze symptoms and suggest appropriate specializations
   */
  async analyzeSymptoms(message) {
    if (!this.model) {
      return null;
    }

    try {
      const prompt = `You are a medical triage assistant. A patient describes their symptoms below. Analyze them and suggest appropriate medical specialists.

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{
  "symptoms": "brief summary of identified symptoms",
  "specializations": ["Primary Specialist", "Secondary Specialist (if applicable)"],
  "severity": "mild|moderate|severe",
  "advice": "one-line general health tip (not a diagnosis or prescription)"
}

Specializations must be from: General Physician, Cardiologist, Dermatologist, Neurologist, Orthopedic, Pediatrician, Gynecologist, Psychiatrist, Ophthalmologist, ENT Specialist, Gastroenterologist, Pulmonologist, Urologist, Endocrinologist, Dentist, Oncologist, Rheumatologist, Nephrologist.

IMPORTANT: Never diagnose. Never prescribe medication. Only suggest which type of doctor to see.

Patient message: "${message}"`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      return null;
    }
  }
}

module.exports = new GeminiService();
