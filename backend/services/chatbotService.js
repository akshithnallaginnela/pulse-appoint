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

    // Keep last 20 messages for context
    session.history.push({ role: 'user', content: message });
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    try {
      // Analyze intent
      const analysis = await geminiService.analyzeIntent(message);
      let { intent, entities } = analysis;

      console.log(`[Chatbot] Intent: ${intent} Entities:`, JSON.stringify(entities));

      // Merge entities into session context
      if (entities.specialization) session.context.specialization = entities.specialization;
      if (entities.doctorName) session.context.doctorName = entities.doctorName;
      if (entities.date) session.context.date = entities.date;
      if (entities.time) session.context.time = entities.time;

      // ── Conversation continuation ──────────────────────────────
      // If the current intent is generic ('other') but we were in the middle
      // of a multi-turn flow and the user provided new entities, continue
      // with the previous intent so the handler can use the new info.
      const previousIntent = session.context.lastIntent;
      if (intent === 'other' && previousIntent) {
        const hasNewContext = entities.doctorName || entities.specialization
          || entities.date || entities.time;
        if (hasNewContext) {
          console.log(`[Chatbot] Continuing previous intent '${previousIntent}' (current was 'other' but got new entities)`);
          intent = previousIntent;
        }
      }

      // Save the resolved intent for future continuation (skip 'other')
      if (intent !== 'other') {
        session.context.lastIntent = intent;
      }

      let response;

      switch (intent) {
        case 'greeting':
          response = "Hello! 👋 Welcome to PulseAppoint! I'm your customer support assistant.\n\nI can help you with:\n• **Finding doctors** by specialization\n• **Booking, cancelling, or rescheduling** appointments\n• **Payment & refund** queries\n• **Doctor details** and availability\n• **General health** questions\n• **Platform navigation** help\n\nWhat can I help you with today?";
          break;

        case 'farewell':
          response = "Goodbye! 😊 Take care and stay healthy! Feel free to come back anytime you need help. We're here 24/7!";
          break;

        case 'thanks':
          response = "You're welcome! 😊 I'm happy to help. Is there anything else I can assist you with?";
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
          response = this._handleCancelAppointment(userId);
          break;

        case 'reschedule_appointment':
          response = this._handleRescheduleAppointment(userId);
          break;

        case 'view_appointments':
          response = this._handleViewAppointments(userId);
          break;

        case 'how_to_book':
          response = this._handleHowToBook();
          break;

        case 'how_to_cancel':
          response = this._handleHowToCancel();
          break;

        case 'how_to_reschedule':
          response = this._handleHowToReschedule();
          break;

        case 'doctor_details':
          response = await this._handleDoctorDetails(entities, session);
          break;

        case 'payment_info':
          response = this._handlePaymentInfo();
          break;

        case 'refund_query':
          response = this._handleRefundQuery();
          break;

        case 'account_help':
          response = this._handleAccountHelp();
          break;

        case 'platform_help':
          response = this._handlePlatformHelp();
          break;

        case 'medical_query':
          response = await this._handleMedicalQuery(message, session);
          break;

        case 'complaint':
          response = this._handleComplaint();
          break;

        case 'urgent_help':
          response = this._handleUrgentHelp();
          break;

        default:
          // Use AI to generate a contextual response for unrecognized queries
          const contextStr = session.history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n');
          response = await geminiService.generateResponse(message, contextStr);
          if (!response) {
            response = "I'm here to help you with anything related to PulseAppoint! 😊\n\nHere are some things I can assist with:\n• **How to book** an appointment\n• **How to cancel** or **reschedule**\n• **Find a doctor** by specialization\n• **Payment** and **refund** information\n• **Account** help\n\nPlease let me know what you need!";
          }
          break;
      }

      session.history.push({ role: 'assistant', content: response });
      return { response, intent, entities };

    } catch (error) {
      console.error('ChatbotService error:', error);
      const fallback = "I'm sorry, I encountered an issue. I can still help you with finding doctors, booking appointments, cancellations, refunds, and more — just let me know what you need!";
      session.history.push({ role: 'assistant', content: fallback });
      return { response: fallback, intent: 'error', entities: {} };
    }
  }

  // ─── FIND DOCTOR ─────────────────────────────────
  async _handleFindDoctor(entities, session) {
    const specialization = entities.specialization || session.context.specialization;
    const doctorName = entities.doctorName || session.context.doctorName;

    try {
      const doctors = await this._findDoctors({
        doctorName,
        specialization,
        limit: 5,
        sort: { 'rating.average': -1 }
      });

      if (doctors.length === 0) {
        const searchTerm = doctorName ? `Dr. ${doctorName}` : specialization;
        return searchTerm
          ? `I couldn't find any doctors matching **${searchTerm}**. Would you like to try a different name or specialization?\n\nAvailable specializations include: Cardiologist, Pediatrician, Dermatologist, Neurologist, General Physician, and more.`
          : "I couldn't find any available doctors right now. Please try again later or visit the **Doctors** page to browse all options.";
      }

      let response = specialization
        ? `Here are our top **${specialization}** doctors:\n\n`
        : "Here are our top-rated doctors! ⭐\n\n";

      doctors.forEach((doc, i) => {
        const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
        response += `${i + 1}. **${name}** — ${doc.specialization}\n`;
        response += `   ⭐ ${doc.rating.average.toFixed(1)} | 💰 ₹${doc.consultationFee} | 🏥 ${doc.experience} yrs exp\n\n`;
      });

      response += "Would you like to:\n• **Book an appointment** with any of these doctors?\n• **See doctor details** (profile, reviews)?\n• **Check availability** for a specific doctor?";

      return response;
    } catch (error) {
      console.error('Error finding doctors:', error);
      return "I had trouble searching for doctors. Please try visiting the **Doctors** page directly at /doctors to browse and search.";
    }
  }

  // ─── BOOK APPOINTMENT ────────────────────────────
  async _handleBookAppointment(entities, session, userId) {
    if (!userId) {
      return "To book an appointment, you'll need to **log in first**.\n\n**Steps to book:**\n1. Log in or create an account\n2. Go to the **Doctors** page\n3. Select a doctor\n4. Choose your preferred date & time\n5. Confirm and complete payment\n\nWould you like help with anything else?";
    }

    const spec = entities.specialization || session.context.specialization;
    const date = entities.date || session.context.date;
    const time = entities.time || session.context.time;
    const doctorName = entities.doctorName || session.context.doctorName;

    if (!spec && !doctorName) {
      return "I'd love to help you book an appointment! 📅\n\nWhat type of specialist are you looking for? For example:\n• Cardiologist\n• Dermatologist\n• General Physician\n• Pediatrician\n• Neurologist\n\nOr you can visit the **Doctors** page to browse all available doctors.";
    }

    if (!date) {
      return `Great choice! When would you like to schedule your appointment with ${spec ? `a **${spec}**` : 'the doctor'}?\n\nPlease provide a date (e.g., "tomorrow", "March 5th", "2026-03-01").`;
    }

    if (!time) {
      return `Got it! What time works best for you? (e.g., "10:00 AM", "14:30")\n\nTip: You can check a doctor's available time slots on their profile page.`;
    }

    return `Here's a summary of your booking:\n\n• **Specialist:** ${spec || 'Selected doctor'}\n• **Date:** ${date}\n• **Time:** ${time}\n\nTo complete your booking, please visit the **Doctors** page, select your preferred doctor, and finalize the appointment with payment.\n\n💡 **Tip:** You can pay via UPI, credit/debit card, or net banking.\n\nWould you like help with anything else?`;
  }

  // ─── Helper: find doctors by name and/or specialization ─────
  async _findDoctors({ doctorName, specialization, limit = 5, sort = null } = {}) {
    const query = { isActive: true, isVerified: true };
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    // If searching by doctor name, first find matching user IDs
    if (doctorName) {
      // Strip common prefixes like "Dr.", "Dr ", "Doctor "
      let cleanName = doctorName.replace(/^(dr\.?\s*|doctor\s+)/i, '').trim();
      if (!cleanName) cleanName = doctorName.trim(); // fallback if only prefix

      const User = require('../models/User');
      const nameParts = cleanName.split(/\s+/);
      let userQuery;
      if (nameParts.length === 1) {
        // Single name — match against either first or last name
        const nameRegex = new RegExp(nameParts[0], 'i');
        userQuery = { $or: [{ firstName: nameRegex }, { lastName: nameRegex }] };
      } else {
        // Multiple parts — match firstName+lastName combination
        const firstRegex = new RegExp(nameParts[0], 'i');
        const lastRegex = new RegExp(nameParts.slice(1).join(' '), 'i');
        userQuery = {
          $or: [
            { firstName: firstRegex, lastName: lastRegex },
            { firstName: new RegExp(doctorName, 'i') },
            { lastName: new RegExp(doctorName, 'i') }
          ]
        };
      }
      const matchingUsers = await User.find(userQuery).select('_id');
      if (matchingUsers.length === 0) {
        return [];
      }
      query.userId = { $in: matchingUsers.map(u => u._id) };
    }

    let q = Doctor.find(query).populate('userId', 'firstName lastName');
    if (sort) q = q.sort(sort);
    if (limit) q = q.limit(limit);
    return q;
  }

  // ─── CHECK AVAILABILITY ──────────────────────────
  async _handleCheckAvailability(entities, session) {
    const specialization = entities.specialization || session.context.specialization;
    const doctorName = entities.doctorName || session.context.doctorName;

    if (!specialization && !doctorName) {
      return "I can check doctor availability for you! 🕐\n\nWhich doctor or specialization are you interested in?\n\nFor example:\n• \"Is there a cardiologist available today?\"\n• \"Check availability for Dr. Smith\"";
    }

    try {
      const doctors = await this._findDoctors({ doctorName, specialization, limit: 3 });

      if (doctors.length === 0) {
        const searchTerm = doctorName ? `Dr. ${doctorName}` : specialization;
        return `I couldn't find any doctors matching "${searchTerm}". Please check the spelling or try a different name/specialization.\n\nYou can also visit the **Doctors** page to browse all available doctors.`;
      }

      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today.getDay()];

      let response = "Here's today's availability:\n\n";

      doctors.forEach((doc) => {
        const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
        const dayAvail = doc.availability[todayName];
        const available = dayAvail && dayAvail.isAvailable;

        response += `**${name}** (${doc.specialization})\n`;
        if (available) {
          response += `  ✅ Available today: ${dayAvail.startTime} - ${dayAvail.endTime}\n`;
          if (dayAvail.breakStartTime && dayAvail.breakEndTime) {
            response += `  ☕ Break: ${dayAvail.breakStartTime} - ${dayAvail.breakEndTime}\n`;
          }
          response += `  💰 Fee: ₹${doc.consultationFee}\n\n`;
        } else {
          response += `  ❌ Not available today\n\n`;
        }
      });

      response += "Would you like to **book an appointment** with any of these doctors?\n\n💡 For detailed availability on other dates, visit the doctor's profile page.";
      return response;
    } catch (error) {
      console.error('Error checking availability:', error);
      return "I had trouble checking availability. Please try the **Doctors** page for detailed schedules.";
    }
  }

  // ─── CANCEL APPOINTMENT ──────────────────────────
  _handleCancelAppointment(userId) {
    if (!userId) {
      return "Please **log in** first to manage your appointments.\n\nOnce logged in, you can cancel appointments from the **Appointments** page.";
    }

    return "To cancel an appointment:\n\n**Steps:**\n1. Go to your **Appointments** page\n2. Find the appointment you want to cancel\n3. Click the **Cancel** button\n4. Confirm the cancellation\n\n**⚠️ Important Rules:**\n• Appointments **cannot be cancelled within 12 hours** of booking. You must wait 12 hours after the booking time.\n• Refunds depend on when you cancel (see refund policy below)\n\n**💰 Refund Policy:**\n• **More than 24 hours** before appointment → **100% refund**\n• **2-24 hours** before appointment → **50% refund**\n• **Less than 2 hours** before appointment → **No refund**\n\nRefunds are processed within 5-7 business days.\n\nWould you like help with anything else?";
  }

  // ─── RESCHEDULE APPOINTMENT ──────────────────────
  _handleRescheduleAppointment(userId) {
    if (!userId) {
      return "Please **log in** first to manage your appointments.";
    }

    return "To reschedule an appointment:\n\n**Steps:**\n1. Go to your **Appointments** page\n2. Find the appointment you want to reschedule\n3. Click the **Reschedule** option\n4. Select a new date and time\n5. Confirm the change\n\n**⚠️ Important:**\n• Rescheduling must be done **at least 2 hours before** the original appointment time\n• The new time slot must be available\n• Completed or cancelled appointments cannot be rescheduled\n\nWould you like to know anything else?";
  }

  // ─── VIEW APPOINTMENTS ───────────────────────────
  _handleViewAppointments(userId) {
    if (!userId) {
      return "Please **log in** to view your appointments.\n\nOnce logged in, go to the **Appointments** page to see all your bookings.";
    }

    return "You can view all your appointments on the **Appointments** page! 📋\n\n**What you'll see:**\n• **Upcoming** appointments with date, time, and doctor info\n• **Past** appointments and history\n• **Cancelled** appointments\n• **Payment status** for each appointment\n\n**Filter options:**\n• By status (pending, confirmed, completed, cancelled)\n• By date range\n\nWould you like help with anything else?";
  }

  // ─── HOW TO BOOK ─────────────────────────────────
  _handleHowToBook() {
    return "Here's how to book an appointment on PulseAppoint: 📅\n\n**Step-by-step guide:**\n\n1️⃣ **Log in** to your account (or create one if you're new)\n\n2️⃣ Go to the **Doctors** page\n   • Browse doctors or search by specialization\n   • Use filters to narrow down (by rating, experience, fee)\n\n3️⃣ **Select a doctor** to view their profile\n   • See qualifications, experience, reviews, and fees\n\n4️⃣ Click **Book Appointment**\n   • Choose your preferred date\n   • Select an available time slot\n   • Add your reason for visit\n\n5️⃣ **Complete payment**\n   • Pay via UPI, card, or net banking (Razorpay)\n\n6️⃣ **Confirmation!** ✅\n   • You'll see the confirmation on your Appointments page\n\n💡 **Tips:**\n• Check doctor availability before booking\n• Book during off-peak hours for more slot options\n\nWould you like me to help you find a doctor?";
  }

  // ─── HOW TO CANCEL ───────────────────────────────
  _handleHowToCancel() {
    return "Here's how to cancel an appointment: ❌\n\n**Step-by-step guide:**\n\n1️⃣ **Log in** to your account\n\n2️⃣ Go to the **Appointments** page\n\n3️⃣ Find the appointment you want to cancel\n\n4️⃣ Click the **Cancel** button\n\n5️⃣ Confirm the cancellation\n\n**⚠️ Cancellation Rules:**\n• You must wait **12 hours after booking** before you can cancel\n• Completed appointments cannot be cancelled\n\n**💰 Refund Policy:**\n• **More than 24 hours** before appointment → **100% refund**\n• **2-24 hours** before appointment → **50% refund**\n• **Less than 2 hours** before → **No refund**\n\n📌 Refunds are processed to your original payment method within **5-7 business days**.\n\nNeed help with anything else?";
  }

  // ─── HOW TO RESCHEDULE ───────────────────────────
  _handleHowToReschedule() {
    return "Here's how to reschedule an appointment: 🔄\n\n**Step-by-step guide:**\n\n1️⃣ **Log in** to your account\n\n2️⃣ Go to the **Appointments** page\n\n3️⃣ Find the appointment you want to reschedule\n\n4️⃣ Click **Reschedule**\n\n5️⃣ Select a new **date and time**\n\n6️⃣ **Confirm** the new schedule\n\n**⚠️ Rules:**\n• Must reschedule **at least 2 hours before** the original time\n• The new slot must be available with the same doctor\n• Only pending or confirmed appointments can be rescheduled\n\nWould you like help with anything else?";
  }

  // ─── DOCTOR DETAILS ──────────────────────────────
  async _handleDoctorDetails(entities, session) {
    const specialization = entities.specialization || session.context.specialization;
    const doctorName = entities.doctorName || session.context.doctorName;

    if (!specialization && !doctorName) {
      return "I can help you learn about our doctors! 🩺\n\n**Doctor profiles include:**\n• Specialization and qualifications\n• Years of experience\n• Patient ratings and reviews\n• Consultation fee\n• Available days and hours\n• Languages spoken\n• Services offered\n\nWould you like to:\n• **Find a doctor** by specialization?\n• **Check availability** of a specific doctor?\n\nJust tell me what you're looking for!";
    }

    try {
      const doctors = await this._findDoctors({
        doctorName,
        specialization,
        limit: 3,
        sort: { 'rating.average': -1 }
      });

      if (doctors.length === 0) {
        const searchTerm = doctorName ? `Dr. ${doctorName}` : specialization;
        return `No doctors matching "${searchTerm || ''}" found. Try a different name or specialization, or visit the **Doctors** page.`;
      }

      let response = `Here are details for our ${doctorName ? `Dr. ${doctorName}` : specialization || ''} doctors:\n\n`;

      doctors.forEach((doc, i) => {
        const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
        response += `**${i + 1}. ${name}**\n`;
        response += `• Specialization: ${doc.specialization}\n`;
        response += `• Experience: ${doc.experience} years\n`;
        response += `• Rating: ⭐ ${doc.rating.average.toFixed(1)} (${doc.rating.count} reviews)\n`;
        response += `• Fee: ₹${doc.consultationFee}\n`;
        response += `• Duration: ${doc.consultationDuration} minutes\n`;
        if (doc.bio) response += `• Bio: ${doc.bio.substring(0, 100)}${doc.bio.length > 100 ? '...' : ''}\n`;
        if (doc.languages && doc.languages.length > 0) response += `• Languages: ${doc.languages.join(', ')}\n`;
        response += '\n';
      });

      response += "Visit the **Doctors** page for complete profiles, or ask me to check their **availability**!";
      return response;
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      return "I had trouble fetching doctor details. Please visit the **Doctors** page directly.";
    }
  }

  // ─── PAYMENT INFO ────────────────────────────────
  _handlePaymentInfo() {
    return "Here's everything about payments on PulseAppoint: 💳\n\n**Payment Methods:**\n• UPI (Google Pay, PhonePe, Paytm, etc.)\n• Credit / Debit Cards (Visa, Mastercard, RuPay)\n• Net Banking\n• Wallets\n\n**How it works:**\n1. Select your doctor and time slot\n2. You'll be redirected to **Razorpay** for secure payment\n3. Complete the payment\n4. Appointment is confirmed! ✅\n\n**Consultation Fees:**\n• Fees vary by doctor and are displayed on their profile\n• Typically range from ₹200 to ₹2000+\n\n**Security:**\n• All payments are processed through **Razorpay** (PCI-DSS compliant)\n• Your card/bank details are never stored by us\n\n**Receipts:**\n• Payment details are visible on your appointment page\n\nHave a question about a specific payment? Let me know!";
  }

  // ─── REFUND QUERY ────────────────────────────────
  _handleRefundQuery() {
    return "Here's our refund policy: 💰\n\n**Refund Eligibility:**\n\n| When You Cancel | Refund Amount |\n|---|---|\n| More than 24 hours before appointment | **100% refund** |\n| 2-24 hours before appointment | **50% refund** |\n| Less than 2 hours before | **No refund** |\n\n**Important Notes:**\n• You must wait **12 hours after booking** before you can cancel\n• Refunds are processed to your **original payment method**\n• Processing time: **5-7 business days**\n• If cancelled by the doctor, you receive a **100% refund**\n\n**Refund Status:**\n• Check your appointment details on the **Appointments** page\n• The refund status will be shown there\n\nIf your refund is delayed beyond 7 business days, please reach out again and we'll help you track it.\n\nAnything else I can help with?";
  }

  // ─── ACCOUNT HELP ────────────────────────────────
  _handleAccountHelp() {
    return "Here's help with your account: 👤\n\n**Creating an Account:**\n1. Click **Login** on the top navigation\n2. Choose **Sign Up**\n3. Enter your name, email, phone, and password\n4. Your account is ready!\n\n**Logging In:**\n• Use your **email and password** to log in\n• Click the **Login** button in the navigation bar\n\n**Managing Your Profile:**\n• After logging in, access your profile from the navigation menu\n• Update your name, phone, and profile picture\n\n**For Doctors:**\n• Doctors have a separate login at **/doctor-login**\n• Doctor accounts are verified by admin before activation\n\n**Forgot Password?**\n• Use the forgot password option on the login page\n\nNeed more help? Just ask!";
  }

  // ─── PLATFORM HELP ───────────────────────────────
  _handlePlatformHelp() {
    return "Welcome to **PulseAppoint**! Here's a quick guide: 🏥\n\n**What is PulseAppoint?**\nA platform to find trusted doctors and book appointments online.\n\n**Main Pages:**\n• 🏠 **Home** (/) — Platform overview, featured doctors\n• 🩺 **Doctors** (/doctors) — Browse and search all doctors\n• 📅 **Appointments** (/appointments) — View your bookings\n• ℹ️ **About** (/about) — Learn about the platform\n\n**Key Features:**\n• Search doctors by **specialization, rating, or experience**\n• **Real-time availability** checking\n• **Secure online payment** via Razorpay\n• **Appointment management** — book, cancel, reschedule\n• **Doctor reviews and ratings**\n• **24/7 AI support** (that's me! 🤖)\n\n**Quick Actions:**\n• Need a doctor? → Go to **Doctors** page\n• Have a booking? → Go to **Appointments** page\n• Want to know more? → Visit **About** page\n\nWhat would you like to do?";
  }

  // ─── MEDICAL QUERY ───────────────────────────────
  async _handleMedicalQuery(message, session) {
    // Try AI for health-related general information
    const contextStr = session.history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n');
    const aiResponse = await geminiService.generateResponse(message, contextStr);

    if (aiResponse) {
      return aiResponse + "\n\n⚠️ **Disclaimer:** This is for informational purposes only. Please consult a qualified doctor for medical advice.\n\nWould you like me to help you **find a doctor** for this concern?";
    }

    return "I understand you have a health-related question. While I can't provide medical diagnoses or prescriptions, I can help you:\n\n• **Find a specialist** for your concern\n• **Book an appointment** with a qualified doctor\n• **Check availability** for today\n\n⚠️ **For emergencies, please call 108 or visit your nearest hospital immediately.**\n\nWould you like me to find a doctor for you?";
  }

  // ─── COMPLAINT ───────────────────────────────────
  _handleComplaint() {
    return "I'm sorry to hear you're facing an issue. 😔\n\nI want to help resolve this for you. Here's what you can do:\n\n**Common Issues & Solutions:**\n• **Payment failed** → Try again or use a different payment method\n• **Can't cancel** → Remember, cancellation is blocked for 12 hours after booking\n• **Doctor not available** → Try a different date or another doctor\n• **App not loading** → Clear browser cache and try again\n\n**Still need help?**\nPlease describe your issue in detail and I'll do my best to assist you.\n\nIf the issue requires human support, please email us at **support@pulseappoint.com**.\n\nWhat's the specific issue you're facing?";
  }

  // ─── URGENT HELP ─────────────────────────────────
  _handleUrgentHelp() {
    return "🚨 **For medical emergencies, please call 108 (Ambulance) or 112 (Emergency) immediately!**\n\nIf you need urgent but non-emergency medical care:\n\n1. **Find an available doctor now:**\n   I can check which doctors are available today\n\n2. **Emergency Medicine specialists** can handle urgent cases\n\n3. **Walk-in clinics** may be available — check with your nearest hospital\n\n**On PulseAppoint:**\n• I can help you find a doctor available **right now**\n• Some doctors offer **same-day appointments**\n\nWould you like me to find available doctors for today?";
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
