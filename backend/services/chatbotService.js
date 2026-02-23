const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const geminiService = require('./geminiService');

class ChatbotService {
  constructor() {
    // In-memory session store (use Redis in production)
    this.sessions = new Map();
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        history: [],
        context: {},
        lastActivity: Date.now()
      });
    }
    const session = this.sessions.get(sessionId);
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Process an incoming chat message and return a response
   */
  async processMessage(sessionId, message, userId = null) {
    const session = this.getSession(sessionId);

    // Keep last 10 messages for context
    session.history.push({ role: 'user', content: message });
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    try {
      // Analyze intent
      const analysis = await geminiService.analyzeIntent(message);
      const { intent, entities } = analysis;

      console.log(`[Chatbot] Intent: ${intent} Entities:`, JSON.stringify(entities));

      // Merge entities into session context
      if (entities.specialization) session.context.specialization = entities.specialization;
      if (entities.doctorName) session.context.doctorName = entities.doctorName;
      if (entities.date) session.context.date = entities.date;
      if (entities.time) session.context.time = entities.time;

      let response;

      switch (intent) {
        case 'greeting':
          response = "Hello! 👋 Welcome to PulseAppoint! I can help you find doctors, book appointments, or check availability. What would you like to do?";
          break;

        case 'farewell':
          response = "Goodbye! Take care and stay healthy! 😊 Feel free to come back anytime you need help.";
          break;

        case 'thanks':
          response = "You're welcome! 😊 Is there anything else I can help you with?";
          break;

        case 'find_doctor':
          response = await this._handleFindDoctor(entities, session);
          break;

        case 'book_appointment':
          response = await this._handleBookAppointment(entities, session, userId);
          break;

        case 'check_availability':
          response = await this._handleCheckAvailability(entities, session);
          break;

        case 'cancel_appointment':
          response = userId
            ? "To cancel an appointment, please go to your Appointments page and click the cancel button on the appointment you'd like to cancel."
            : "Please log in first to manage your appointments.";
          break;

        case 'reschedule_appointment':
          response = userId
            ? "To reschedule, please cancel the existing appointment and book a new one at your preferred time."
            : "Please log in first to manage your appointments.";
          break;

        case 'view_appointments':
          response = userId
            ? "You can view all your appointments on the **Appointments** page. Would you like me to help you with anything else?"
            : "Please log in to view your appointments.";
          break;

        default:
          // Try to generate an AI response for general queries
          const contextStr = session.history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n');
          response = await geminiService.generateResponse(message, contextStr);
          if (!response) {
            response = "I'm here to help you with appointments and finding doctors. Could you please tell me what you'd like to do?";
          }
          break;
      }

      session.history.push({ role: 'assistant', content: response });
      return { response, intent, entities };

    } catch (error) {
      console.error('ChatbotService error:', error);
      const fallback = "I'm sorry, I encountered an issue. I can still help you find doctors or book appointments — just let me know what you need!";
      session.history.push({ role: 'assistant', content: fallback });
      return { response: fallback, intent: 'error', entities: {} };
    }
  }

  async _handleFindDoctor(entities, session) {
    const specialization = entities.specialization || session.context.specialization;

    try {
      const query = { isActive: true, isVerified: true };
      if (specialization) {
        query.specialization = new RegExp(specialization, 'i');
      }

      const doctors = await Doctor.find(query)
        .populate('userId', 'firstName lastName')
        .sort({ 'rating.average': -1 })
        .limit(5);

      if (doctors.length === 0) {
        return specialization
          ? `I couldn't find any ${specialization} doctors at the moment. Would you like to try a different specialization?`
          : "I couldn't find any available doctors right now. Please try again later.";
      }

      let response = specialization
        ? `Here are our top ${specialization} doctors:\n\n`
        : "Here are our top-rated doctors! ⭐\n\n";

      doctors.forEach((doc, i) => {
        const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
        response += `${i + 1}. **${name}** — ${doc.specialization}\n`;
        response += `   ⭐ ${doc.rating.average.toFixed(1)} | 💰 ₹${doc.consultationFee} | 🏥 ${doc.experience} yrs exp\n\n`;
      });

      response += "Would you like to book an appointment with any of these doctors?";

      if (!specialization) {
        response += "\n\nWhat type of specialist are you looking for?";
      }

      return response;
    } catch (error) {
      console.error('Error finding doctors:', error);
      return "I had trouble searching for doctors. Please try again or visit the Doctors page directly.";
    }
  }

  async _handleBookAppointment(entities, session, userId) {
    if (!userId) {
      return "To book an appointment, you'll need to log in first. Please log in and try again!";
    }

    const spec = entities.specialization || session.context.specialization;
    const date = entities.date || session.context.date;
    const time = entities.time || session.context.time;
    const doctorName = entities.doctorName || session.context.doctorName;

    if (!spec && !doctorName) {
      return "Sure, I'd love to help you book an appointment! What type of specialist are you looking for?";
    }

    if (!date) {
      return `Great choice! When would you like to schedule your appointment? Please provide a date (e.g., "tomorrow", "March 5th", "2026-03-01").`;
    }

    if (!time) {
      return `Got it! What time works best for you? (e.g., "10:00 AM", "14:30")`;
    }

    return `To complete your booking, please visit the **Book Appointment** page where you can select ${spec ? `a ${spec}` : 'your doctor'}, confirm the date (${date}) and time (${time}), and finalize your appointment.\n\nWould you like help with anything else?`;
  }

  async _handleCheckAvailability(entities, session) {
    const specialization = entities.specialization || session.context.specialization;
    const doctorName = entities.doctorName || session.context.doctorName;

    if (!specialization && !doctorName) {
      return "I can check doctor availability for you! Which doctor or specialization are you interested in?";
    }

    try {
      const query = { isActive: true, isVerified: true };
      if (specialization) {
        query.specialization = new RegExp(specialization, 'i');
      }

      const doctors = await Doctor.find(query)
        .populate('userId', 'firstName lastName')
        .limit(3);

      if (doctors.length === 0) {
        return `I couldn't find any ${specialization || ''} doctors. Would you like to try a different specialization?`;
      }

      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today.getDay()];

      let response = "Here's the availability I found:\n\n";

      doctors.forEach((doc) => {
        const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
        const dayAvail = doc.availability[todayName];
        const available = dayAvail && dayAvail.isAvailable;

        response += `**${name}** (${doc.specialization})\n`;
        if (available) {
          response += `  ✅ Available today: ${dayAvail.startTime} - ${dayAvail.endTime}\n\n`;
        } else {
          response += `  ❌ Not available today\n\n`;
        }
      });

      response += "Would you like to book an appointment with any of these doctors?";
      return response;
    } catch (error) {
      console.error('Error checking availability:', error);
      return "I had trouble checking availability. Please try the Doctors page for detailed schedules.";
    }
  }

  // Cleanup old sessions (call periodically)
  cleanupSessions(maxAgeMs = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}

module.exports = new ChatbotService();
