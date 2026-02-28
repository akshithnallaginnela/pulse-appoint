const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const geminiService = require('./geminiService');

class ChatbotService {
  // ─── SESSION MANAGEMENT (MongoDB-backed) ────────────────────

  async getSession(sessionId, userId = null) {
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = await ChatSession.create({
        sessionId,
        userId,
        history: [],
        context: {},
        lastActivity: new Date()
      });
    } else {
      // Associate userId if provided and not yet set
      if (userId && !session.userId) {
        session.userId = userId;
      }
      session.lastActivity = new Date();
      await session.save();
    }
    return session;
  }

  /**
   * Process an incoming chat message and return a response
   */
  async processMessage(sessionId, message, userId = null) {
    const session = await this.getSession(sessionId, userId);

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
      if (!session.context) session.context = {};
      if (entities.specialization) session.context.specialization = entities.specialization;
      if (entities.doctorName) session.context.doctorName = entities.doctorName;
      if (entities.date) session.context.date = entities.date;
      if (entities.time) session.context.time = entities.time;

      // ── Conversation continuation ──────────────────────────────
      const MULTI_TURN_INTENTS = new Set([
        'book_appointment', 'check_availability', 'find_doctor', 'doctor_details',
        'cancel_appointment', 'reschedule_appointment', 'symptom_analysis'
      ]);
      const ENTITY_ONLY_INTENTS = new Set(['find_doctor']);
      const EXPLICIT_INTENTS = new Set([
        'greeting', 'farewell', 'thanks', 'how_to_book', 'how_to_cancel',
        'how_to_reschedule', 'payment_info', 'refund_query', 'account_help',
        'platform_help', 'medical_query', 'complaint', 'urgent_help'
      ]);

      const previousIntent = session.context.lastIntent;
      if (previousIntent && MULTI_TURN_INTENTS.has(previousIntent)) {
        const hasNewContext = entities.doctorName || entities.specialization
          || entities.date || entities.time || entities.appointmentId;

        // Also check if user typed a bare number (doctor/appointment selection)
        const bareNumber = /^\d+$/.test(message.trim());

        if (hasNewContext || bareNumber) {
          if (intent === 'other' || (ENTITY_ONLY_INTENTS.has(intent) && !EXPLICIT_INTENTS.has(intent) && previousIntent !== intent)) {
            console.log(`[Chatbot] Continuing previous intent '${previousIntent}' (was '${intent}', got new entities)`);
            intent = previousIntent;
          }
        }
      } else if (intent === 'other' && previousIntent) {
        const hasNewContext = entities.doctorName || entities.specialization
          || entities.date || entities.time;
        if (hasNewContext) {
          console.log(`[Chatbot] Continuing previous intent '${previousIntent}' (current was 'other' with new entities)`);
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
          response = "Hello! 👋 Welcome to PulseAppoint! I'm your customer support assistant.\n\nI can help you with:\n• **Finding doctors** by specialization or symptoms\n• **Booking appointments** directly in this chat\n• **Cancelling or rescheduling** your appointments\n• **Viewing your appointments**\n• **Symptom analysis** — tell me your symptoms and I'll suggest the right specialist\n• **Payment & refund** queries\n• **Doctor details** and availability\n\nWhat can I help you with today?";
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
          response = await this._handleBookAppointment(entities, session, userId, message);
          break;

        case 'check_availability':
          response = await this._handleCheckAvailability(entities, session);
          break;

        case 'cancel_appointment':
          response = await this._handleCancelAppointment(entities, session, userId, message);
          break;

        case 'reschedule_appointment':
          response = await this._handleRescheduleAppointment(entities, session, userId, message);
          break;

        case 'symptom_analysis':
          response = await this._handleSymptomAnalysis(message, entities, session);
          break;

        case 'view_appointments':
          response = await this._handleViewAppointments(userId);
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
            response = "I'm here to help you with anything related to PulseAppoint! 😊\n\nHere are some things I can assist with:\n• **Book an appointment** right here in chat\n• **Cancel** or **reschedule** appointments\n• **View your appointments**\n• **Find a doctor** by specialization or symptoms\n• **Tell me your symptoms** and I'll suggest the right specialist\n• **Payment** and **refund** information\n\nPlease let me know what you need!";
          }
          break;
      }

      session.history.push({ role: 'assistant', content: response });
      session.markModified('context');
      session.markModified('history');
      await session.save();

      return { response, intent, entities };

    } catch (error) {
      console.error('ChatbotService error:', error);
      const fallback = "I'm sorry, I encountered an issue. I can still help you with finding doctors, booking appointments, cancellations, refunds, and more — just let me know what you need!";
      session.history.push({ role: 'assistant', content: fallback });
      session.markModified('history');
      await session.save();
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

  // ─── BOOK APPOINTMENT (AUTHENTICATED ACTION) ────────────────
  async _handleBookAppointment(entities, session, userId, rawMessage) {
    if (!userId) {
      return "To book an appointment, you'll need to **log in first**.\n\nOnce logged in, tell me:\n• Which **specialization** or **doctor** you want\n• Your preferred **date**\n• Your preferred **time**\n\nAnd I'll book it for you right here in the chat! 📅";
    }

    const spec = entities.specialization || session.context.specialization;
    const date = entities.date || session.context.date;
    const time = entities.time || session.context.time;
    const doctorName = entities.doctorName || session.context.doctorName;

    // Step 1: Need specialization or doctor name
    if (!spec && !doctorName && !session.context.selectedDoctorId && !session.context.candidateDoctors) {
      return "I'd love to help you book an appointment! 📅\n\nWhat type of specialist are you looking for? For example:\n• Cardiologist\n• Dermatologist\n• General Physician\n• Pediatrician\n• Neurologist\n\nOr tell me the doctor's name directly.";
    }

    // Handle doctor selection from candidate list
    if (session.context.candidateDoctors && !session.context.selectedDoctorId) {
      const pick = parseInt(rawMessage.trim());
      const candidates = session.context.candidateDoctors;
      if (!isNaN(pick)) {
        const selected = candidates.find(c => c.index === pick);
        if (selected) {
          session.context.selectedDoctorId = selected.id;
          session.context.selectedDoctorName = selected.name;
          session.context.selectedDoctorFee = selected.fee;
          delete session.context.candidateDoctors;
          session.markModified('context');

          const nextDate = entities.date || session.context.date;
          if (!nextDate) {
            return `Selected **${selected.name}**! 🎉\n\nWhat **date** would you like? (e.g., "tomorrow", "March 5th", "2026-03-01")`;
          }
          // Fall through to date/time handling below
        } else {
          return `Please type a number between 1 and ${candidates.length} to select a doctor.`;
        }
      } else {
        return `Please type a number between 1 and ${candidates.length} to select a doctor.`;
      }
    }

    // Step 2: Find the doctor(s) and let user pick if needed
    if (!session.context.selectedDoctorId) {
      try {
        const doctors = await this._findDoctors({
          doctorName,
          specialization: spec,
          limit: 5,
          sort: { 'rating.average': -1 }
        });

        if (doctors.length === 0) {
          const searchTerm = doctorName ? `Dr. ${doctorName}` : spec;
          return `I couldn't find any doctors matching **${searchTerm}**. Please try a different name or specialization.`;
        }

        if (doctors.length === 1) {
          // Auto-select the only match
          const doc = doctors[0];
          session.context.selectedDoctorId = doc._id.toString();
          const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
          session.context.selectedDoctorName = name;
          session.context.selectedDoctorFee = doc.consultationFee;
          session.markModified('context');

          if (!date) {
            return `Great! I've selected **${name}** (${doc.specialization}, ₹${doc.consultationFee}).\n\nWhat **date** would you like? (e.g., "tomorrow", "March 5th", "2026-03-01")`;
          }
        } else {
          // Multiple matches — store them and ask user to pick
          session.context.candidateDoctors = doctors.map((d, i) => ({
            index: i + 1,
            id: d._id.toString(),
            name: d.userId ? `Dr. ${d.userId.firstName} ${d.userId.lastName}` : 'Doctor',
            specialization: d.specialization,
            fee: d.consultationFee,
            rating: d.rating.average.toFixed(1)
          }));
          session.markModified('context');

          let response = `I found ${doctors.length} doctors. Please pick one by number:\n\n`;
          session.context.candidateDoctors.forEach(d => {
            response += `**${d.index}.** ${d.name} — ${d.specialization} | ⭐ ${d.rating} | ₹${d.fee}\n`;
          });
          response += '\nJust type the number (e.g. "1") to select.';
          return response;
        }
      } catch (error) {
        console.error('Error finding doctors for booking:', error);
        return "I had trouble searching for doctors. Please try again.";
      }
    }

    // Step 3: Need date
    const currentDate = entities.date || session.context.date;
    if (!currentDate) {
      return `Great choice! When would you like your appointment with **${session.context.selectedDoctorName || 'the doctor'}**?\n\nPlease provide a date (e.g., "tomorrow", "March 5th", "2026-03-01").`;
    }
    session.context.date = currentDate;

    // Step 4: Need time
    const currentTime = entities.time || session.context.time;
    if (!currentTime) {
      return `Got it — date is **${currentDate}**.\n\nWhat **time** works best? (e.g., "10:00 AM", "14:30")\n\n💡 Tip: You can ask me to "check availability" to see open slots.`;
    }
    session.context.time = currentTime;

    // Step 5: All info collected — actually create the appointment
    try {
      const doctorId = session.context.selectedDoctorId;
      if (!doctorId) {
        return "Something went wrong with doctor selection. Please say the doctor's name or specialization again.";
      }

      const doctor = await Doctor.findById(doctorId);
      if (!doctor || !doctor.isActive || !doctor.isVerified) {
        return "This doctor is no longer available. Please select another doctor.";
      }

      // Parse date
      const appointmentDate = this._parseDate(currentDate);
      if (!appointmentDate) {
        session.context.date = null;
        session.markModified('context');
        return `I couldn't parse the date **"${currentDate}"**. Please use a format like "2026-03-05", "March 5th", or "tomorrow".`;
      }

      // Parse time to HH:MM
      const appointmentTime = this._parseTime(currentTime);
      if (!appointmentTime) {
        session.context.time = null;
        session.markModified('context');
        return `I couldn't parse the time **"${currentTime}"**. Please use a format like "10:00 AM", "14:30", or "2 PM".`;
      }

      // Check doctor availability for that day
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[appointmentDate.getDay()];
      if (typeof doctor.isAvailableAt === 'function' && !doctor.isAvailableAt(dayName, appointmentTime)) {
        const dayAvail = doctor.availability[dayName];
        session.context.time = null;
        session.markModified('context');
        if (dayAvail && dayAvail.isAvailable) {
          return `**${session.context.selectedDoctorName}** is not available at **${appointmentTime}** on ${dayName}.\n\nTheir hours on ${dayName}: **${dayAvail.startTime} - ${dayAvail.endTime}**.\n\nPlease choose a different time.`;
        }
        return `**${session.context.selectedDoctorName}** is not available on **${dayName}s**. Please choose a different date.`;
      }

      // Check if slot is already booked
      const existingAppointment = await Appointment.findOne({
        doctorId,
        appointmentDate,
        appointmentTime,
        status: { $nin: ['cancelled'] }
      });
      if (existingAppointment) {
        session.context.time = null;
        session.markModified('context');
        return `Sorry, the **${appointmentTime}** slot on **${appointmentDate.toDateString()}** is already booked.\n\nPlease choose a different time.`;
      }

      // Create the appointment
      const selectedDoctorName = session.context.selectedDoctorName;
      const appointment = new Appointment({
        patientId: userId,
        doctorId,
        appointmentDate,
        appointmentTime,
        duration: doctor.consultationDuration || 30,
        reason: 'Booked via AI Assistant',
        consultationType: 'in-person',
        payment: {
          amount: doctor.consultationFee,
          status: 'pending'
        }
      });

      await appointment.save();

      // Clear booking context
      delete session.context.selectedDoctorId;
      delete session.context.selectedDoctorName;
      delete session.context.selectedDoctorFee;
      delete session.context.candidateDoctors;
      delete session.context.specialization;
      delete session.context.doctorName;
      delete session.context.date;
      delete session.context.time;
      session.markModified('context');

      return `✅ **Appointment booked successfully!**\n\n📋 **Booking Summary:**\n• **Doctor:** ${selectedDoctorName || 'Selected doctor'}\n• **Date:** ${appointmentDate.toDateString()}\n• **Time:** ${appointmentTime}\n• **Fee:** ₹${doctor.consultationFee}\n• **Status:** Pending confirmation\n• **Appointment ID:** ${appointment._id}\n\n💳 **Next step:** Complete your payment on the **Appointments** page to confirm the booking.\n\nWould you like help with anything else?`;

    } catch (error) {
      console.error('Error creating appointment:', error);
      if (error.message && error.message.includes('future date')) {
        return "⚠️ Appointments must be scheduled for a **future date and time**. Please choose an upcoming date.";
      }
      if (error.message && error.message.includes('3 months')) {
        return "⚠️ Appointments cannot be scheduled more than **3 months** in advance. Please choose a closer date.";
      }
      return "I encountered an error while booking the appointment. Please try again or visit the **Doctors** page to book directly.";
    }
  }

  // ─── Helper: find doctors by name and/or specialization ─────
  async _findDoctors({ doctorName, specialization, limit = 5, sort = null } = {}) {
    const query = { isActive: true, isVerified: true };
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (doctorName) {
      let cleanName = doctorName.replace(/^(dr\.?\s*|doctor\s+)/i, '').trim();
      if (!cleanName) cleanName = doctorName.trim();

      const nameParts = cleanName.split(/\s+/);
      let userQuery;
      if (nameParts.length === 1) {
        const nameRegex = new RegExp(nameParts[0], 'i');
        userQuery = { $or: [{ firstName: nameRegex }, { lastName: nameRegex }] };
      } else {
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

  // ─── CANCEL APPOINTMENT (AUTHENTICATED ACTION) ──────────────
  async _handleCancelAppointment(entities, session, userId, rawMessage) {
    if (!userId) {
      return "Please **log in** first to cancel an appointment.\n\nOnce logged in, just tell me which appointment you'd like to cancel and I'll handle it for you!";
    }

    try {
      // Handle selection from candidates
      if (session.context.cancelCandidates) {
        const pick = parseInt(rawMessage.trim());
        if (!isNaN(pick)) {
          const candidates = session.context.cancelCandidates;
          const selected = candidates.find(c => c.index === pick);
          if (!selected) {
            return `Please type a number between 1 and ${candidates.length} to select an appointment.`;
          }
          if (!selected.canCancel) {
            return `⚠️ Appointment #${pick} **cannot be cancelled yet** (12-hour rule). Please wait until 12 hours have passed since booking.`;
          }
          session.context.pendingCancelId = selected.id;
          delete session.context.cancelCandidates;
          session.markModified('context');
          // Fall through to perform the cancellation
        } else {
          return `Please type a number between 1 and ${session.context.cancelCandidates.length} to select an appointment.`;
        }
      }

      const appointmentId = entities.appointmentId || session.context.pendingCancelId;

      if (!appointmentId) {
        // Fetch upcoming cancellable appointments
        const appointments = await Appointment.find({
          patientId: userId,
          status: { $in: ['pending', 'confirmed', 'rescheduled'] },
          appointmentDate: { $gte: new Date(new Date().toDateString()) }
        })
          .populate({
            path: 'doctorId',
            select: 'specialization consultationFee userId',
            populate: { path: 'userId', select: 'firstName lastName' }
          })
          .sort({ appointmentDate: 1 })
          .limit(5);

        if (appointments.length === 0) {
          return "You don't have any upcoming appointments that can be cancelled.";
        }

        // Store candidates for selection
        session.context.cancelCandidates = appointments.map((apt, i) => ({
          index: i + 1,
          id: apt._id.toString(),
          doctor: apt.doctorId?.userId ? `Dr. ${apt.doctorId.userId.firstName} ${apt.doctorId.userId.lastName}` : 'Doctor',
          specialization: apt.doctorId?.specialization || 'N/A',
          date: apt.appointmentDate.toDateString(),
          time: apt.appointmentTime,
          status: apt.status,
          canCancel: (() => {
            const now = new Date();
            const hoursSinceBooking = (now - apt.createdAt) / (1000 * 60 * 60);
            return hoursSinceBooking >= 12 && !['cancelled', 'completed'].includes(apt.status);
          })()
        }));
        session.markModified('context');

        let response = "Here are your upcoming appointments:\n\n";
        session.context.cancelCandidates.forEach(a => {
          const cancelTag = a.canCancel ? '✅ Can cancel' : '⏳ Cannot cancel yet (12-hr rule)';
          response += `**${a.index}.** ${a.doctor} (${a.specialization})\n`;
          response += `   📅 ${a.date} at ${a.time} | Status: ${a.status}\n`;
          response += `   ${cancelTag}\n\n`;
        });
        response += 'Which appointment would you like to cancel? Type the **number** (e.g. "1").';
        return response;
      }

      // Perform cancellation
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        delete session.context.pendingCancelId;
        session.markModified('context');
        return "I couldn't find that appointment. Please try again.";
      }

      if (appointment.patientId.toString() !== userId.toString()) {
        delete session.context.pendingCancelId;
        session.markModified('context');
        return "You don't have permission to cancel this appointment.";
      }

      if (appointment.status === 'cancelled') {
        delete session.context.pendingCancelId;
        session.markModified('context');
        return "This appointment is already cancelled.";
      }

      if (appointment.status === 'completed') {
        delete session.context.pendingCancelId;
        session.markModified('context');
        return "Completed appointments cannot be cancelled.";
      }

      // Check 12-hour rule
      const now = new Date();
      const hoursSinceBooking = (now - appointment.createdAt) / (1000 * 60 * 60);
      if (hoursSinceBooking < 12) {
        const hoursRemaining = Math.ceil(12 - hoursSinceBooking);
        delete session.context.pendingCancelId;
        session.markModified('context');
        return `⚠️ This appointment was booked less than 12 hours ago. You must wait **${hoursRemaining} more hour(s)** before cancelling.\n\nPlease try again later.`;
      }

      // Calculate refund
      const refundAmount = appointment.calculateRefund();

      // Cancel
      appointment.status = 'cancelled';
      appointment.cancellation = {
        cancelledBy: 'patient',
        cancelledAt: new Date(),
        reason: 'Cancelled via AI Assistant',
        refundAmount,
        refundStatus: refundAmount > 0 ? 'pending' : 'processed'
      };

      await appointment.save();

      // Clean up context
      delete session.context.cancelCandidates;
      delete session.context.pendingCancelId;
      session.markModified('context');

      let refundMsg = '';
      if (refundAmount > 0) {
        const pct = refundAmount === appointment.payment.amount ? '100%' : '50%';
        refundMsg = `\n💰 **Refund:** ₹${refundAmount} (${pct}) — will be processed within 5-7 business days.`;
      } else {
        refundMsg = '\n💰 **Refund:** No refund (appointment was less than 2 hours away).';
      }

      await appointment.populate({
        path: 'doctorId',
        select: 'specialization userId',
        populate: { path: 'userId', select: 'firstName lastName' }
      });

      const docName = appointment.doctorId?.userId
        ? `Dr. ${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`
        : 'Doctor';

      return `✅ **Appointment cancelled successfully!**\n\n• **Doctor:** ${docName}\n• **Date:** ${appointment.appointmentDate.toDateString()}\n• **Time:** ${appointment.appointmentTime}${refundMsg}\n\nWould you like help with anything else?`;

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return "I encountered an error while cancelling. Please try cancelling from the **Appointments** page or try again.";
    }
  }

  // ─── RESCHEDULE APPOINTMENT (AUTHENTICATED ACTION) ──────────
  async _handleRescheduleAppointment(entities, session, userId, rawMessage) {
    if (!userId) {
      return "Please **log in** first to reschedule an appointment.\n\nOnce logged in, just tell me which appointment to reschedule and I'll handle it!";
    }

    try {
      // Handle selection from candidates
      if (session.context.rescheduleCandidates && !session.context.rescheduleTargetId) {
        const pick = parseInt(rawMessage.trim());
        if (!isNaN(pick)) {
          const candidates = session.context.rescheduleCandidates;
          const selected = candidates.find(c => c.index === pick);
          if (!selected) {
            return `Please type a number between 1 and ${candidates.length} to select an appointment.`;
          }
          if (!selected.canReschedule) {
            return `Appointment #${pick} cannot be rescheduled (must be at least 2 hours before the appointment time).`;
          }
          session.context.rescheduleTargetId = selected.id;
          session.context.rescheduleDoctorId = selected.doctorId;
          delete session.context.rescheduleCandidates;
          session.markModified('context');
          return "What **new date** would you like? (e.g., \"tomorrow\", \"March 10th\", \"2026-03-10\")";
        } else {
          return `Please type a number between 1 and ${session.context.rescheduleCandidates.length} to select an appointment.`;
        }
      }

      // Step 1: Pick appointment
      if (!session.context.rescheduleTargetId) {
        const appointments = await Appointment.find({
          patientId: userId,
          status: { $in: ['pending', 'confirmed', 'rescheduled'] },
          appointmentDate: { $gte: new Date(new Date().toDateString()) }
        })
          .populate({
            path: 'doctorId',
            select: 'specialization userId',
            populate: { path: 'userId', select: 'firstName lastName' }
          })
          .sort({ appointmentDate: 1 })
          .limit(5);

        if (appointments.length === 0) {
          return "You don't have any upcoming appointments that can be rescheduled.";
        }

        session.context.rescheduleCandidates = appointments.map((apt, i) => ({
          index: i + 1,
          id: apt._id.toString(),
          doctorId: apt.doctorId?._id.toString(),
          doctor: apt.doctorId?.userId ? `Dr. ${apt.doctorId.userId.firstName} ${apt.doctorId.userId.lastName}` : 'Doctor',
          specialization: apt.doctorId?.specialization || 'N/A',
          date: apt.appointmentDate.toDateString(),
          time: apt.appointmentTime,
          canReschedule: apt.canBeRescheduled()
        }));
        session.markModified('context');

        let response = "Here are your upcoming appointments:\n\n";
        session.context.rescheduleCandidates.forEach(a => {
          const tag = a.canReschedule ? '✅ Can reschedule' : '❌ Cannot reschedule (< 2 hrs)';
          response += `**${a.index}.** ${a.doctor} (${a.specialization})\n`;
          response += `   📅 ${a.date} at ${a.time}\n`;
          response += `   ${tag}\n\n`;
        });
        response += 'Which appointment would you like to reschedule? Type the **number**.';
        return response;
      }

      // Step 2: Need new date
      const newDate = entities.date || session.context.rescheduleNewDate;
      if (!newDate) {
        return "What **new date** would you like? (e.g., \"tomorrow\", \"March 10th\", \"2026-03-10\")";
      }
      session.context.rescheduleNewDate = newDate;
      session.markModified('context');

      // Step 3: Need new time
      const newTime = entities.time || session.context.rescheduleNewTime;
      if (!newTime) {
        return `Got it — **${newDate}**.\n\nWhat **new time** would you like? (e.g., "10:00 AM", "14:30")`;
      }
      session.context.rescheduleNewTime = newTime;
      session.markModified('context');

      // Step 4: Perform reschedule
      const targetId = session.context.rescheduleTargetId;
      const appointment = await Appointment.findById(targetId);
      if (!appointment) {
        this._clearRescheduleContext(session);
        return "I couldn't find that appointment. Please try again.";
      }

      if (appointment.patientId.toString() !== userId.toString()) {
        this._clearRescheduleContext(session);
        return "You don't have permission to reschedule this appointment.";
      }

      if (!appointment.canBeRescheduled()) {
        this._clearRescheduleContext(session);
        return "This appointment can no longer be rescheduled (must be at least 2 hours before the appointment).";
      }

      const parsedDate = this._parseDate(newDate);
      if (!parsedDate) {
        session.context.rescheduleNewDate = null;
        session.markModified('context');
        return `I couldn't parse the date **"${newDate}"**. Please use a format like "2026-03-05" or "March 5th".`;
      }

      const parsedTime = this._parseTime(newTime);
      if (!parsedTime) {
        session.context.rescheduleNewTime = null;
        session.markModified('context');
        return `I couldn't parse the time **"${newTime}"**. Please use a format like "10:00 AM" or "14:30".`;
      }

      // Check doctor availability
      const doctor = await Doctor.findById(session.context.rescheduleDoctorId || appointment.doctorId);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[parsedDate.getDay()];

      if (typeof doctor.isAvailableAt === 'function' && !doctor.isAvailableAt(dayName, parsedTime)) {
        session.context.rescheduleNewTime = null;
        session.markModified('context');
        return `The doctor is not available at **${parsedTime}** on **${dayName}**. Please choose a different date/time.`;
      }

      // Check slot conflict
      const existing = await Appointment.findOne({
        doctorId: appointment.doctorId,
        appointmentDate: parsedDate,
        appointmentTime: parsedTime,
        status: { $nin: ['cancelled'] },
        _id: { $ne: appointment._id }
      });
      if (existing) {
        session.context.rescheduleNewTime = null;
        session.markModified('context');
        return `Sorry, the **${parsedTime}** slot on **${parsedDate.toDateString()}** is already booked. Please choose another time.`;
      }

      // Update
      appointment.appointmentDate = parsedDate;
      appointment.appointmentTime = parsedTime;
      appointment.status = 'rescheduled';
      appointment.patientNotes = 'Rescheduled via AI Assistant';
      await appointment.save();

      // Clean up context
      this._clearRescheduleContext(session);

      await appointment.populate({
        path: 'doctorId',
        select: 'specialization userId',
        populate: { path: 'userId', select: 'firstName lastName' }
      });

      const docName = appointment.doctorId?.userId
        ? `Dr. ${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`
        : 'Doctor';

      return `✅ **Appointment rescheduled successfully!**\n\n• **Doctor:** ${docName}\n• **New Date:** ${parsedDate.toDateString()}\n• **New Time:** ${parsedTime}\n• **Status:** Rescheduled\n\nWould you like help with anything else?`;

    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      return "I encountered an error while rescheduling. Please try from the **Appointments** page or try again.";
    }
  }

  _clearRescheduleContext(session) {
    delete session.context.rescheduleTargetId;
    delete session.context.rescheduleDoctorId;
    delete session.context.rescheduleCandidates;
    delete session.context.rescheduleNewDate;
    delete session.context.rescheduleNewTime;
    session.markModified('context');
  }

  // ─── VIEW APPOINTMENTS (REAL DATA) ──────────────────────────
  async _handleViewAppointments(userId) {
    if (!userId) {
      return "Please **log in** to view your appointments.\n\nOnce logged in, I can show you all your upcoming and past appointments right here!";
    }

    try {
      const appointments = await Appointment.find({ patientId: userId })
        .populate({
          path: 'doctorId',
          select: 'specialization consultationFee userId',
          populate: { path: 'userId', select: 'firstName lastName' }
        })
        .sort({ appointmentDate: -1 })
        .limit(10);

      if (appointments.length === 0) {
        return "You don't have any appointments yet.\n\nWould you like me to help you **book an appointment**? Just tell me the specialization or doctor you're looking for!";
      }

      const todayStart = new Date(new Date().toDateString());
      const upcoming = appointments.filter(a =>
        ['pending', 'confirmed', 'rescheduled'].includes(a.status) &&
        new Date(a.appointmentDate) >= todayStart
      );
      const past = appointments.filter(a =>
        !['pending', 'confirmed', 'rescheduled'].includes(a.status) ||
        new Date(a.appointmentDate) < todayStart
      );

      let response = '📋 **Your Appointments:**\n\n';

      if (upcoming.length > 0) {
        response += '**Upcoming:**\n';
        upcoming.forEach((apt, i) => {
          const docName = apt.doctorId?.userId
            ? `Dr. ${apt.doctorId.userId.firstName} ${apt.doctorId.userId.lastName}`
            : 'Doctor';
          const statusIcon = apt.status === 'confirmed' ? '✅' : apt.status === 'rescheduled' ? '🔄' : '⏳';
          response += `${i + 1}. ${statusIcon} **${docName}** (${apt.doctorId?.specialization || 'N/A'})\n`;
          response += `   📅 ${apt.appointmentDate.toDateString()} at ${apt.appointmentTime}\n`;
          response += `   Status: ${apt.status} | 💰 ₹${apt.payment?.amount || 'N/A'} (${apt.payment?.status || 'N/A'})\n\n`;
        });
      } else {
        response += '**No upcoming appointments.**\n\n';
      }

      if (past.length > 0) {
        response += '**Recent/Past:**\n';
        past.slice(0, 5).forEach((apt, i) => {
          const docName = apt.doctorId?.userId
            ? `Dr. ${apt.doctorId.userId.firstName} ${apt.doctorId.userId.lastName}`
            : 'Doctor';
          const statusIcon = apt.status === 'completed' ? '✅' : apt.status === 'cancelled' ? '❌' : '📋';
          response += `${i + 1}. ${statusIcon} **${docName}** — ${apt.appointmentDate.toDateString()} | ${apt.status}\n`;
        });
        response += '\n';
      }

      response += 'Would you like to **book**, **cancel**, or **reschedule** an appointment?';
      return response;

    } catch (error) {
      console.error('Error fetching appointments:', error);
      return "I had trouble fetching your appointments. Please visit the **Appointments** page directly.";
    }
  }

  // ─── HOW TO BOOK ─────────────────────────────────
  _handleHowToBook() {
    return "Here's how to book an appointment on PulseAppoint: 📅\n\n**Option 1 — Via Chat (if logged in):**\nJust tell me the doctor/specialization, date, and time — I'll book it right here!\n\n**Option 2 — Via the Website:**\n1️⃣ **Log in** to your account\n2️⃣ Go to the **Doctors** page\n3️⃣ **Select a doctor** to view their profile\n4️⃣ Click **Book Appointment** → choose date & time\n5️⃣ **Complete payment** via Razorpay\n6️⃣ **Confirmation!** ✅\n\nWould you like me to help you book right now?";
  }

  // ─── HOW TO CANCEL ───────────────────────────────
  _handleHowToCancel() {
    return "Here's how to cancel an appointment: ❌\n\n**Option 1 — Via Chat (if logged in):**\nJust say \"cancel appointment\" and I'll show your appointments and cancel for you!\n\n**Option 2 — Via the Website:**\n1️⃣ Go to your **Appointments** page\n2️⃣ Find the appointment → Click **Cancel** → Confirm\n\n**⚠️ Rules:**\n• Must wait **12 hours after booking**\n• **>24 hrs before** → 100% refund\n• **2-24 hrs before** → 50% refund\n• **<2 hrs before** → No refund\n\nRefunds processed in 5-7 business days.\n\nWant me to cancel an appointment for you now?";
  }

  // ─── HOW TO RESCHEDULE ───────────────────────────
  _handleHowToReschedule() {
    return "Here's how to reschedule an appointment: 🔄\n\n**Option 1 — Via Chat (if logged in):**\nJust say \"reschedule appointment\" and I'll handle it!\n\n**Option 2 — Via the Website:**\n1️⃣ Go to your **Appointments** page\n2️⃣ Find the appointment → Click **Reschedule**\n3️⃣ Select new date & time → Confirm\n\n**⚠️ Rules:**\n• Must reschedule **at least 2 hours before** the appointment\n• Only pending or confirmed appointments\n\nWant me to reschedule an appointment for you now?";
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
    return "Welcome to **PulseAppoint**! Here's a quick guide: 🏥\n\n**What is PulseAppoint?**\nA platform to find trusted doctors and book appointments online.\n\n**Main Pages:**\n• 🏠 **Home** (/) — Platform overview, featured doctors\n• 🩺 **Doctors** (/doctors) — Browse and search all doctors\n• 📅 **Appointments** (/appointments) — View your bookings\n• ℹ️ **About** (/about) — Learn about the platform\n\n**Key Features:**\n• Search doctors by **specialization, rating, or experience**\n• **Real-time availability** checking\n• **Secure online payment** via Razorpay\n• **Appointment management** — book, cancel, reschedule via chat or UI\n• **Doctor reviews and ratings**\n• **24/7 AI support** (that's me! 🤖)\n\nWhat would you like to do?";
  }

  // ─── SYMPTOM ANALYSIS & DOCTOR RECOMMENDATION ────
  async _handleSymptomAnalysis(message, entities, session) {
    // Symptom-to-specialization mapping
    const symptomMap = {
      // Heart / Cardiovascular
      'chest pain': 'Cardiologist', 'heart palpitations': 'Cardiologist', 'shortness of breath': 'Cardiologist',
      'high blood pressure': 'Cardiologist', 'irregular heartbeat': 'Cardiologist', 'chest tightness': 'Cardiologist',
      // Skin
      'rash': 'Dermatologist', 'acne': 'Dermatologist', 'skin infection': 'Dermatologist', 'eczema': 'Dermatologist',
      'itching': 'Dermatologist', 'hair loss': 'Dermatologist', 'psoriasis': 'Dermatologist', 'skin allergy': 'Dermatologist',
      'pimples': 'Dermatologist', 'dark spots': 'Dermatologist', 'skin rash': 'Dermatologist',
      // Brain / Nerves
      'headache': 'Neurologist', 'migraine': 'Neurologist', 'dizziness': 'Neurologist', 'seizure': 'Neurologist',
      'numbness': 'Neurologist', 'tingling': 'Neurologist', 'memory loss': 'Neurologist', 'tremor': 'Neurologist',
      // Bones / Joints
      'joint pain': 'Orthopedic', 'back pain': 'Orthopedic', 'fracture': 'Orthopedic', 'knee pain': 'Orthopedic',
      'shoulder pain': 'Orthopedic', 'bone pain': 'Orthopedic', 'sprain': 'Orthopedic', 'neck pain': 'Orthopedic',
      'hip pain': 'Orthopedic', 'muscle pain': 'Orthopedic',
      // Children
      'child fever': 'Pediatrician', 'baby not eating': 'Pediatrician', 'child rash': 'Pediatrician',
      'child cough': 'Pediatrician', 'child vaccination': 'Pediatrician', 'infant health': 'Pediatrician',
      // Stomach / Digestive
      'stomach pain': 'Gastroenterologist', 'acidity': 'Gastroenterologist', 'constipation': 'Gastroenterologist',
      'diarrhea': 'Gastroenterologist', 'bloating': 'Gastroenterologist', 'nausea': 'Gastroenterologist',
      'vomiting': 'Gastroenterologist', 'indigestion': 'Gastroenterologist', 'abdominal pain': 'Gastroenterologist',
      'gas': 'Gastroenterologist', 'acid reflux': 'Gastroenterologist',
      // Eyes
      'eye pain': 'Ophthalmologist', 'blurry vision': 'Ophthalmologist', 'red eyes': 'Ophthalmologist',
      'eye infection': 'Ophthalmologist', 'watery eyes': 'Ophthalmologist', 'vision problems': 'Ophthalmologist',
      // Ear / Nose / Throat
      'ear pain': 'ENT Specialist', 'sore throat': 'ENT Specialist', 'nasal congestion': 'ENT Specialist',
      'hearing loss': 'ENT Specialist', 'tonsils': 'ENT Specialist', 'sinusitis': 'ENT Specialist',
      'nose bleed': 'ENT Specialist', 'snoring': 'ENT Specialist',
      // Lungs / Respiratory
      'cough': 'Pulmonologist', 'asthma': 'Pulmonologist', 'wheezing': 'Pulmonologist',
      'breathing difficulty': 'Pulmonologist', 'chronic cough': 'Pulmonologist',
      // Mental Health
      'anxiety': 'Psychiatrist', 'depression': 'Psychiatrist', 'stress': 'Psychiatrist',
      'insomnia': 'Psychiatrist', 'panic attacks': 'Psychiatrist', 'mood swings': 'Psychiatrist',
      'mental health': 'Psychiatrist', 'sleep problems': 'Psychiatrist',
      // Women's Health
      'period problems': 'Gynecologist', 'pregnancy': 'Gynecologist', 'menstrual pain': 'Gynecologist',
      'irregular periods': 'Gynecologist', 'pcos': 'Gynecologist', 'pelvic pain': 'Gynecologist',
      // Urinary
      'urinary problems': 'Urologist', 'kidney pain': 'Urologist', 'blood in urine': 'Urologist',
      'frequent urination': 'Urologist', 'kidney stone': 'Urologist',
      // Diabetes / Hormones
      'diabetes': 'Endocrinologist', 'thyroid': 'Endocrinologist', 'weight gain': 'Endocrinologist',
      'hormonal imbalance': 'Endocrinologist',
      // Teeth
      'toothache': 'Dentist', 'tooth pain': 'Dentist', 'bleeding gums': 'Dentist', 'cavity': 'Dentist',
      // General / Common
      'fever': 'General Physician', 'cold': 'General Physician', 'flu': 'General Physician',
      'body pain': 'General Physician', 'fatigue': 'General Physician', 'weakness': 'General Physician',
      'weight loss': 'General Physician', 'loss of appetite': 'General Physician', 'general checkup': 'General Physician',
      'not feeling well': 'General Physician', 'feeling sick': 'General Physician'
    };

    const lower = message.toLowerCase();

    // Find matching symptoms in the message
    const matchedSymptoms = [];
    const matchedSpecializations = new Set();

    for (const [symptom, spec] of Object.entries(symptomMap)) {
      if (lower.includes(symptom)) {
        matchedSymptoms.push(symptom);
        matchedSpecializations.add(spec);
      }
    }

    // If no keyword matches, try AI analysis
    if (matchedSymptoms.length === 0) {
      try {
        const aiAnalysis = await geminiService.analyzeSymptoms(message);
        if (aiAnalysis && aiAnalysis.specializations && aiAnalysis.specializations.length > 0) {
          let response = `Based on your symptoms, here's my analysis:\n\n`;
          response += `📋 **Symptoms identified:** ${aiAnalysis.symptoms || message}\n\n`;
          response += `🩺 **Recommended specialist(s):**\n`;
          aiAnalysis.specializations.forEach(spec => {
            response += `• **${spec}**\n`;
          });
          if (aiAnalysis.advice) {
            response += `\n💡 **General advice:** ${aiAnalysis.advice}\n`;
          }
          response += `\n⚠️ **Disclaimer:** This is AI-based guidance, not a medical diagnosis. Please consult a qualified doctor.\n\n`;

          // Try to find doctors for the first specialization
          const primarySpec = aiAnalysis.specializations[0];
          try {
            const doctors = await this._findDoctors({ specialization: primarySpec, limit: 3, sort: { 'rating.average': -1 } });
            if (doctors.length > 0) {
              response += `Here are available **${primarySpec}** doctors:\n\n`;
              doctors.forEach((doc, i) => {
                const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
                response += `${i + 1}. **${name}** — ⭐ ${doc.rating.average.toFixed(1)} | ₹${doc.consultationFee} | ${doc.experience} yrs exp\n`;
              });
              response += `\nWould you like to **book an appointment** with any of them?`;
            }
          } catch (e) {
            response += `Would you like me to **find a ${primarySpec}** for you?`;
          }
          return response;
        }
      } catch (e) {
        console.error('AI symptom analysis error:', e);
      }

      // Fallback — ask for more details
      return "I'd like to help you find the right doctor! 🩺\n\nCould you describe your symptoms in a bit more detail? For example:\n• Where is the pain or discomfort?\n• How long have you had these symptoms?\n• Any other symptoms like fever, nausea, or dizziness?\n\nThe more you tell me, the better I can suggest the right specialist!\n\n⚠️ **For emergencies, please call 108 or visit your nearest hospital immediately.**";
    }

    // Build response from keyword matches
    const specs = Array.from(matchedSpecializations);
    let response = `Based on your symptoms, here's what I recommend:\n\n`;
    response += `📋 **Symptoms detected:** ${matchedSymptoms.join(', ')}\n\n`;
    response += `🩺 **Recommended specialist(s):**\n`;
    specs.forEach(spec => {
      response += `• **${spec}**\n`;
    });

    // Provide basic advice based on the primary specialization
    const primarySpec = specs[0];
    const adviceMap = {
      'General Physician': 'Stay hydrated, rest well, and monitor your temperature. If symptoms persist for more than 3 days, see a doctor.',
      'Cardiologist': 'Avoid strenuous activity. If you experience severe chest pain, call 108 immediately.',
      'Dermatologist': 'Avoid scratching or applying unknown creams. Keep the area clean and dry.',
      'Neurologist': 'Rest in a quiet, dark room. Stay hydrated and track when symptoms occur.',
      'Orthopedic': 'Apply ice to reduce swelling, avoid putting weight on the affected area, and rest.',
      'Gastroenterologist': 'Eat light meals, stay hydrated, and avoid spicy or oily foods.',
      'Pulmonologist': 'Avoid smoke and dust. If breathing difficulty is severe, seek immediate help.',
      'Psychiatrist': 'Practice deep breathing, maintain a routine, and talk to someone you trust.',
      'Ophthalmologist': 'Avoid rubbing your eyes, reduce screen time, and wash your eyes with clean water.',
      'ENT Specialist': 'Gargle with warm salt water, stay hydrated, and avoid cold drinks.',
      'Pediatrician': 'Keep the child hydrated, monitor temperature, and ensure proper rest.',
      'Gynecologist': 'Track your symptoms and cycle patterns. Stay hydrated and rest.',
      'Urologist': 'Drink plenty of water and avoid holding urine for long periods.',
      'Endocrinologist': 'Maintain a balanced diet and monitor your blood sugar/thyroid levels regularly.',
      'Dentist': 'Rinse with warm salt water, avoid very hot or cold foods, and maintain oral hygiene.'
    };

    if (adviceMap[primarySpec]) {
      response += `\n💡 **Quick tip:** ${adviceMap[primarySpec]}\n`;
    }

    response += `\n⚠️ **Disclaimer:** This is AI-based guidance, not a medical diagnosis. Please consult a qualified doctor for proper evaluation.\n\n`;

    // Find available doctors for the primary specialization
    try {
      const doctors = await this._findDoctors({ specialization: primarySpec, limit: 3, sort: { 'rating.average': -1 } });
      if (doctors.length > 0) {
        response += `Here are available **${primarySpec}** doctors on our platform:\n\n`;
        doctors.forEach((doc, i) => {
          const name = doc.userId ? `Dr. ${doc.userId.firstName} ${doc.userId.lastName}` : 'Doctor';
          response += `${i + 1}. **${name}** — ⭐ ${doc.rating.average.toFixed(1)} | ₹${doc.consultationFee} | ${doc.experience} yrs exp\n`;
        });
        response += `\nWould you like to **book an appointment** with any of them? Just say "book with doctor 1" or tell me the name!`;
      } else {
        response += `I couldn't find ${primarySpec} doctors right now. Visit the **Doctors** page to browse all specialists.`;
      }
    } catch (error) {
      console.error('Error finding doctors for symptoms:', error);
      response += `Would you like me to **find a ${primarySpec}** for you?`;
    }

    return response;
  }

  // ─── MEDICAL QUERY ───────────────────────────────
  async _handleMedicalQuery(message, session) {
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

  // ─── DATE PARSING HELPER ─────────────────────────
  _parseDate(dateStr) {
    if (!dateStr) return null;
    const lower = dateStr.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lower === 'today') {
      return today;
    }
    if (lower === 'tomorrow') {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (lower === 'day after tomorrow') {
      const d = new Date(today);
      d.setDate(d.getDate() + 2);
      return d;
    }

    // "next monday", "next tuesday", etc.
    const nextDayMatch = lower.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
    if (nextDayMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(nextDayMatch[1]);
      const d = new Date(today);
      const currentDay = d.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      d.setDate(d.getDate() + daysToAdd);
      return d;
    }

    // Month name maps
    const months = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };

    // "March 5th" or "March 5"
    const monthDayMatch = lower.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?$/);
    if (monthDayMatch && months[monthDayMatch[1]] !== undefined) {
      const month = months[monthDayMatch[1]];
      const day = parseInt(monthDayMatch[2]);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : today.getFullYear();
      const d = new Date(year, month, day);
      if (d < today && !monthDayMatch[3]) {
        d.setFullYear(d.getFullYear() + 1);
      }
      return d;
    }

    // "5th March" or "5 March"
    const dayMonthMatch = lower.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s*,?\s*(\d{4}))?$/);
    if (dayMonthMatch && months[dayMonthMatch[2]] !== undefined) {
      const day = parseInt(dayMonthMatch[1]);
      const month = months[dayMonthMatch[2]];
      const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3]) : today.getFullYear();
      const d = new Date(year, month, day);
      if (d < today && !dayMonthMatch[3]) {
        d.setFullYear(d.getFullYear() + 1);
      }
      return d;
    }

    // ISO format YYYY-MM-DD
    const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = lower.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      return new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
    }

    // Last resort: native Date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }

    return null;
  }

  // ─── TIME PARSING HELPER ─────────────────────────
  _parseTime(timeStr) {
    if (!timeStr) return null;
    const lower = timeStr.toLowerCase().trim();

    // "10:00 AM", "2:30 PM", "10:00am"
    const ampmMatch = lower.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1]);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3];
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // "10 AM", "2 PM"
    const hourOnlyAmpm = lower.match(/^(\d{1,2})\s*(am|pm)$/);
    if (hourOnlyAmpm) {
      let hours = parseInt(hourOnlyAmpm[1]);
      const period = hourOnlyAmpm[2];
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:00`;
    }

    // 24-hour format "14:30", "09:00"
    const h24Match = lower.match(/^(\d{1,2}):(\d{2})$/);
    if (h24Match) {
      const hours = parseInt(h24Match[1]);
      const minutes = h24Match[2];
      if (hours >= 0 && hours <= 23) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }

    return null;
  }
}

module.exports = new ChatbotService();
