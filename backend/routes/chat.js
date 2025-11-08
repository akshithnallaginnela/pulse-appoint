const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// System guardrails
const SYSTEM_CONTEXT = `You are PulseAssist, the in-app assistant for the PulseAppoint web application.
You must ONLY answer questions about using PulseAppoint and its features:
- Booking appointments, finding doctors, viewing profiles, availability, fees
- Managing appointments (view, cancel, reschedule), payments basics in-app
- Site navigation and where to find features on this website

STRICT RULES:
- If a question is unrelated to this app or general health advice, refuse briefly and steer back to app usage.
- Never output private keys, internal configs, or code.
- Keep answers concise and actionable. When relevant, outline the in-app steps.

If out-of-scope: say you can only help with PulseAppoint usage and suggest a relevant topic (e.g., booking or managing appointments).`;


// Basic domain filter to short-circuit clearly unrelated topics
function isOutOfScope(input) {
  const text = String(input || '').toLowerCase();
  const obviousNonDomain = [
    'politics','stock','crypto','programming','math','physics','chemistry','celebrity','movie','song','lyrics','recipe',
    'news','sports','football','cricket','basketball','weather','lottery','gaming','game','code','javascript','python'
  ];
  const domainHints = ['appointment','doctor','clinic','book','reschedule','cancel','specialization','profile','payment','pulseappoint','login','signup','register'];
  const hasDomainHint = domainHints.some(k => text.includes(k));
  const hasObviousNonDomain = obviousNonDomain.some(k => text.includes(k));
  return hasObviousNonDomain && !hasDomainHint;
}

function parseDateString(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    date = new Date(trimmed);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    date = new Date(`${year}-${month}-${day}`);
  } else if (/^\d{2}[-.]\d{2}[-.]\d{4}$/.test(trimmed)) {
    const seperator = trimmed.includes('-') ? '-' : '.';
    const [day, month, year] = trimmed.split(seperator);
    date = new Date(`${year}-${month}-${day}`);
  } else {
    return null;
  }
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function normalizeTime(raw) {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '');
  let match = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!match) {
    match = cleaned.match(/^(\d{1,2})(am|pm)$/);
    if (match) {
      let hour = parseInt(match[1], 10);
      let minutes = '00';
      const suffix = match[2];
      if (suffix === 'pm' && hour !== 12) hour += 12;
      if (suffix === 'am' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${minutes}`;
    }
    return null;
  }
  let hour = parseInt(match[1], 10);
  const minutes = match[2];
  const suffix = match[3];
  if (suffix === 'pm' && hour !== 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

function formatHumanDate(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Clarification / follow-up intent helpers
function isClarificationIntent(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  // short follow-ups like "why", "how come", "what do you mean", "explain"
  return /\bwhy\b|\bwhy\s+can(?:'|\u2019)?t\b|\bhow\b|\bhow\s+come\b|\bwhat\s+do\s+you\s+mean\b|\bexplain\b|\bplease\s+explain\b/.test(t);
}

function generateClarificationResponse(lastAssistantContent, userMessage) {
  if (!lastAssistantContent) return null;
  const ctx = String(lastAssistantContent).toLowerCase();
  const q = String(userMessage || '').toLowerCase();

  // Cancellation rule explanation
  if (ctx.includes('cannot be cancelled within 12 hours') || ctx.includes('within 12 hours')) {
    return 'Appointments cannot be cancelled within 12 hours of the scheduled time because clinics need time to reallocate the slot. If you have an emergency, please contact the clinic directly — we can also show contact details on the Appointments page.';
  }

  // Authentication requirement
  if (ctx.includes('please log in') || ctx.includes('log in to')) {
    return 'You need to be logged in to perform this action so we can verify you are the patient who booked the appointment. Please open the Login page, sign in, then try cancelling again.';
  }

  // Not found / mismatch explanations
  if (ctx.includes('i could not find that doctor') || ctx.includes('could not find any appointments') || ctx.includes('i could not find an appointment')) {
    return 'I could not find an appointment matching those details. Please check the doctor name (use first and last name) and the date in DD-MM-YYYY format. You can also open the Appointments or Doctors page to verify details.';
  }

  // Doctor not available explanation
  if (ctx.includes('not available at that time') || ctx.includes('has no free slots')) {
    return 'The doctor does not have a free slot at that time. Try a different time or day, or I can show available doctors with nearby slots.';
  }

  // Generic clarification: echo prior assistant content and offer actionable next step
  if (q.includes('why') || q.includes('how') || q.includes('explain')) {
    const brief = ctx.split('\n')[0];
    return `Here\'s why: ${brief}. If you want, tell me what you\'d like to do next (cancel, reschedule, or view details).`;
  }

  return null;
}

router.post('/', optionalAuth, async (req, res) => {
  console.log('Received chat request');
  
  try {
    const { message, history = [] } = req.body || {};
    console.log('Received message:', message);

    if (!message) {
      console.log('No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!genAI) {
      console.error('Gemini AI not initialized');
      return res.json({
        response: 'The assistant is not fully configured. I can help with PulseAppoint usage like booking or managing appointments.'
      });
    }

    if (isOutOfScope(message)) {
      return res.json({
        response: 'I can help only with PulseAppoint usage, like booking or managing appointments. What would you like to do in the app?'
      });
    }

    const normalizedMessage = String(message);
    const lower = normalizedMessage.toLowerCase();

    // Greeting intent
    const greet = /^(hi|hello|hey|yo|namaste|hola)[!.\s]*$/i.test(normalizedMessage.trim());
    if (greet) {
      return res.json({
        response: 'Hi! I\'m PulseAssist. I can help you:\n- Book an appointment\n- Check or cancel appointments\n- Find available doctors\nAsk me something like “Book Dr. Rao on 2025-02-03 at 10:30” or “Cancel my appointment on 2025-02-01 at 09:00”.'
      });
    }

    // Clarification / follow-up handling (e.g., user replies "why" after assistant says "cannot be cancelled within 12 hours")
    if (isClarificationIntent(normalizedMessage) && Array.isArray(history) && history.length > 0) {
      const lastAssistant = history[history.length - 1];
      if (lastAssistant && lastAssistant.role === 'assistant') {
        const clarReply = generateClarificationResponse(lastAssistant.content, normalizedMessage);
        if (clarReply) {
          console.log('Responding with clarification:', clarReply);
          return res.json({ response: clarReply });
        }
      }
    }

    // Available doctors (optionally by specialization)
    const askAvailDoctors = /(available\s+doctors|which\s+doctors\s+are\s+available|show\s+available\s+doctors|find\s+doctors)/i.test(normalizedMessage);
    if (askAvailDoctors) {
      try {
        const specializations = [
          'Cardiologist','Pediatrician','Dermatologist','Orthopedic Surgeon','General Physician','Neurologist','Gynecologist','Psychiatrist','Oncologist','Radiologist','Anesthesiologist','Emergency Medicine','Family Medicine','Internal Medicine','Ophthalmologist','ENT Specialist','Urologist','Endocrinologist','Gastroenterologist','Pulmonologist','Rheumatologist','Nephrologist','Hematologist','Infectious Disease','Other'
        ];
        const text = normalizedMessage;
        const matchedSpec = specializations.find(s => new RegExp(s, 'i').test(text));
        const filter = { isActive: true, isVerified: true, ...(matchedSpec ? { specialization: matchedSpec } : {}) };
        const doctors = await Doctor.find(filter)
          .populate('userId', 'firstName lastName')
          .sort({ 'rating.average': -1 })
          .limit(5);
        if (!doctors.length) {
          return res.json({ response: matchedSpec ? `No available ${matchedSpec}s right now.` : 'No available doctors right now.' });
        }
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dateStr = today.toISOString().slice(0, 10);
        const lines = [];
        for (const d of doctors) {
          const slots = d.getAvailableSlots(dayName, dateStr);
          const booked = await Appointment.find({ doctorId: d._id, appointmentDate: new Date(dateStr), status: { $in: ['confirmed','pending'] } }).select('appointmentTime');
          const bookedTimes = booked.map(b => b.appointmentTime);
          const free = slots.filter(s => !bookedTimes.includes(s));
          const name = d.userId ? `${d.userId.firstName} ${d.userId.lastName}` : 'Doctor';
          lines.push(`- Dr. ${name} (${d.specialization}) • Fee ₹${d.consultationFee} • Today slots: ${free.slice(0,5).join(', ') || 'none'}`);
        }
        const header = matchedSpec ? `Available ${matchedSpec}s:` : 'Available doctors:';
        return res.json({ response: `${header}\n${lines.join('\n')}\n\nWant availability for a specific doctor today? Ask like “When is Dr <name> available today?”` });
      } catch (e) {
        console.error('Chat available doctors error:', e);
        return res.json({ response: 'I could not fetch available doctors right now. Please open the Doctors page.' });
      }
    }

    // Book appointment intent - Initial request
    const bookingInitialIntent = /(book|schedule|make)\s+(an?\s+)?appointment/i.test(lower);
    if (bookingInitialIntent && !normalizedMessage.includes('with dr') && !normalizedMessage.includes('with doctor')) {
      return res.json({
        response: 'I can help you book an appointment! Please tell me the doctor\'s name and preferred date (DD-MM-YYYY).'
      });
    }

    // Book appointment intent - With details
    const bookingIntent = /with\s+(?:dr\.?\s+|doctor\s+)?([a-zA-Z]+)(?:\s+([a-zA-Z]+))?\s+(?:on|for)\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i.test(normalizedMessage);
    if (bookingIntent) {
      if (!req.user) {
        return res.json({ response: 'Please log in to book appointments. Go to Login, then try again.' });
      }
      if (req.user.role !== 'patient') {
        return res.json({ response: 'Only patient accounts can book appointments via the assistant.' });
      }

      const match = normalizedMessage.match(/with\s+(?:dr\.?\s+|doctor\s+)?([a-zA-Z]+)(?:\s+([a-zA-Z]+))?\s+(?:on|for)\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
      const doctorFirstName = match[1];
      const doctorLastName = match[2];
      const dateStr = match[3];
      const timeMatch = message.match(/at\s+([0-9]{1,2}:[0-9]{2}(?:\s*[ap]m)?|[0-9]{1,2}\s*[ap]m)/i);
      const appointmentTime = timeMatch ? normalizeTime(timeMatch[1]) : null;

      const appointmentDate = parseDateString(dateStr);
      if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
        return res.json({ response: 'I could not understand that date. Please use DD-MM-YYYY format.' });
      }

      if (!appointmentTime) {
        return res.json({ response: 'Please specify a time for the appointment (e.g., "at 10:30 AM").' });
      }

      try {
        const userQuery = doctorLastName
          ? { firstName: new RegExp(`^${doctorFirstName}$`, 'i'), lastName: new RegExp(`^${doctorLastName}$`, 'i') }
          : { firstName: new RegExp(`^${doctorFirstName}$`, 'i') };

        const doctor = await Doctor.find({ isActive: true, isVerified: true })
          .populate({ path: 'userId', select: 'firstName lastName consultationFee', match: userQuery })
          .then(list => list.find(d => d.userId));

        if (!doctor) {
          return res.json({ response: 'I could not find that doctor. Please check the name or search on the Doctors page.' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (appointmentDate < today) {
          return res.json({ response: 'Appointment date must be in the future. Please pick another date.' });
        }

        const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (!doctor.isAvailableAt || !doctor.isAvailableAt(dayName, appointmentTime)) {
          return res.json({ response: 'The doctor is not available at that time. Please choose another slot.' });
        }

        const existingAppointment = await Appointment.findOne({
          doctorId: doctor._id,
          appointmentDate,
          appointmentTime,
          status: { $nin: ['cancelled'] }
        });

        if (existingAppointment) {
          return res.json({ response: 'That time slot is already booked. Please pick another time.' });
        }

        const reasonText = 'General consultation';

        const appointment = new Appointment({
          patientId: req.user._id,
          doctorId: doctor._id,
          appointmentDate,
          appointmentTime,
          duration: doctor.consultationDuration,
          reason: reasonText,
          consultationType: 'in-person',
          symptoms: [],
          currentMedications: [],
          allergies: [],
          payment: {
            amount: doctor.consultationFee,
            status: 'pending'
          }
        });

        await appointment.save();

        const doctorName = `${doctor.userId.firstName} ${doctor.userId.lastName}`;
        const dateDisplay = formatHumanDate(appointmentDate);
        return res.json({
          response: `Appointment booked with Dr. ${doctorName} on ${dateDisplay} at ${appointmentTime}. It is currently pending confirmation. You can manage it from the Appointments page.`
        });
      } catch (e) {
        console.error('Chat booking error:', e);
        return res.json({ response: 'I could not complete the booking. Please try again from the Appointments page.' });
      }
    }

    // Cancel appointment intent - Initial request
    const cancelInitialIntent = /(cancel|cancelling).*appointment/.test(lower) && !normalizedMessage.includes('with dr') && !normalizedMessage.includes('with doctor');
    if (cancelInitialIntent) {
      if (!req.user) {
        return res.json({ response: 'Please log in to cancel appointments.' });
      }
      if (req.user.role !== 'patient') {
        return res.json({ response: 'Only patient accounts can cancel appointments via the assistant.' });
      }

      try {
        const appointments = await Appointment.find({
          patientId: req.user._id,
          status: { $in: ['pending', 'confirmed', 'rescheduled'] }
        })
        .populate('doctorId')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
        .sort({ appointmentDate: 1, appointmentTime: 1 });

        if (!appointments || appointments.length === 0) {
          return res.json({ response: 'You have no active appointments to cancel.' });
        }

        const lines = appointments.map(a => {
          const doctorName = a.doctorId.userId ? `Dr. ${a.doctorId.userId.firstName} ${a.doctorId.userId.lastName}` : 'Unknown Doctor';
          const date = new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' });
          return `${doctorName} on ${date} at ${a.appointmentTime}`;
        });

        return res.json({ 
          response: `Here are your active appointments:\n${lines.join('\n')}\n\nTo cancel an appointment, please tell me the doctor's name and the date (DD-MM-YYYY).`
        });
      } catch (e) {
        console.error('Chat list appointments error:', e);
        return res.json({ response: 'I could not fetch your appointments. Please try from the Appointments page.' });
      }
    }

    // Cancel appointment intent - With details
    const isInCancelContext = history.length > 0 && 
      history[history.length - 1]?.role === 'assistant' && 
      history[history.length - 1]?.content?.includes('To cancel an appointment');

    // Check if the message looks like an appointment reference
    const appointmentPattern = /(?:dr\.?\s+|doctor\s+)?([a-zA-Z]+)\s+([a-zA-Z]+)\s+(?:on\s+)?(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})(?:\s+(?:at\s+)?(\d{1,2}:\d{2}|\d{1,2}(?::\d{2})?\s*[AaPp][Mm]))?/i;
    
    const isCancellingAppointment = lower.includes('cancel') || isInCancelContext;
    const match = normalizedMessage.match(appointmentPattern);
    
    if (isCancellingAppointment && match) {
      if (!req.user) {
        return res.json({ response: 'Please log in to cancel appointments.' });
      }
      if (req.user.role !== 'patient') {
        return res.json({ response: 'Only patient accounts can cancel appointments via the assistant.' });
      }

      const doctorFirstName = match[1];
      const doctorLastName = match[2];
      const dateStr = match[3];

      const cancelDate = parseDateString(dateStr);
      if (!cancelDate || Number.isNaN(cancelDate.getTime())) {
        return res.json({ response: 'I could not understand that date. Please use DD-MM-YYYY format.' });
      }

      console.log('Cancellation request:', {
        doctorFirstName,
        doctorLastName,
        dateStr,
        cancelDate,
        time: match[4]
      });

      const startOfDay = new Date(cancelDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      try {
        console.log('Searching for appointments with criteria:', {
          patientId: req.user._id,
          date: startOfDay,
          doctorName: `${doctorFirstName} ${doctorLastName}`
        });

        const appointments = await Appointment.find({
          patientId: req.user._id,
          appointmentDate: { $gte: startOfDay, $lt: endOfDay },
          status: { $in: ['pending', 'confirmed', 'rescheduled'] }
        })
        .populate('doctorId')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } });

        console.log('Found appointments:', appointments.length);

        if (!appointments || appointments.length === 0) {
          return res.json({ response: 'I could not find any appointments for that date. Please check the details and try again.' });
        }

        // Match the doctor (and optionally time) if specified
        const requestedTimeNormalized = match[4] ? normalizeTime(match[4]) : null;
        const appointment = appointments.find(a => {
          if (!a.doctorId?.userId) {
            console.log('No doctor user data for appointment:', a._id);
            return false;
          }
          const docFirst = a.doctorId.userId.firstName;
          const docLast = a.doctorId.userId.lastName;

          const firstNameMatch = docFirst?.toLowerCase() === doctorFirstName.toLowerCase();
          const lastNameMatch = docLast?.toLowerCase() === doctorLastName.toLowerCase();

          const apptTimeNormalized = normalizeTime(a.appointmentTime);
          if (requestedTimeNormalized && apptTimeNormalized) {
            // require both name and exact time match when user specified time
            const timeMatch = apptTimeNormalized === requestedTimeNormalized;
            console.log('Comparing doctor names and time:', {
              provided: `${doctorFirstName} ${doctorLastName} @ ${requestedTimeNormalized}`,
              actual: `${docFirst} ${docLast} @ ${apptTimeNormalized}`,
              nameMatches: firstNameMatch && lastNameMatch,
              timeMatches: timeMatch
            });
            return firstNameMatch && lastNameMatch && timeMatch;
          }

          console.log('Comparing doctor names:', {
            provided: `${doctorFirstName} ${doctorLastName}`,
            actual: `${docFirst} ${docLast}`,
            matches: firstNameMatch && lastNameMatch
          });

          return firstNameMatch && lastNameMatch;
        });

        if (!appointment) {
          return res.json({ response: 'I could not find an appointment with that doctor on that date. Please check the details and try again.' });
        }

        // Build scheduled datetime (combine date + stored appointmentTime) for an accurate 12-hour check
        const scheduled = new Date(appointment.appointmentDate);
        if (appointment.appointmentTime) {
          const apptNorm = normalizeTime(appointment.appointmentTime);
          if (apptNorm) {
            const [hh, mm] = apptNorm.split(':').map(n => parseInt(n, 10));
            scheduled.setHours(hh, mm, 0, 0);
          }
        }
        const now = new Date();
        const hoursDiff = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 12) {
          return res.json({ 
            response: 'Sorry, appointments cannot be cancelled within 12 hours of the scheduled time. Please contact the clinic directly if you have an emergency.' 
          });
        }

        if (!appointment.canBeCancelled()) {
          return res.json({ 
            response: 'That appointment can no longer be cancelled. Please contact the clinic directly if you have an emergency.' 
          });
        }

        const refundAmount = appointment.calculateRefund();
        appointment.status = 'cancelled';
        appointment.cancellation = {
          cancelledBy: 'patient',
          cancelledAt: new Date(),
          reason: 'Cancelled via assistant',
          refundAmount,
          refundStatus: refundAmount > 0 ? 'pending' : 'processed'
        };

        await appointment.save();

        const dateDisplay = formatHumanDate(appointment.appointmentDate);
        const timeDisplay = appointment.appointmentTime;
        const refundText = refundAmount > 0 ? `Refund amount ₹${refundAmount} will be processed soon.` : 'No refund is due for this cancellation.';
        return res.json({
          response: `Your appointment on ${dateDisplay} at ${timeDisplay} has been cancelled. ${refundText}`
        });
      } catch (e) {
        console.error('Chat cancellation error:', e);
        return res.json({ response: 'I could not cancel the appointment. Please try from the Appointments page.' });
      }
    }

    // Specific doctor availability by name for today
    const nameMatch = /(?:dr\.?\s+)([a-zA-Z]+)\s*([a-zA-Z]*)\b.*(available|availability|time|slot)/i.exec(normalizedMessage);
    if (nameMatch) {
      try {
        const first = nameMatch[1];
        const last = nameMatch[2];
        const userQuery = last ? { 'userId.lastName': new RegExp(`^${last}$`, 'i'), 'userId.firstName': new RegExp(first, 'i') } : { 'userId.firstName': new RegExp(`^${first}$`, 'i') };
        const doctor = await Doctor.find({ isActive: true, isVerified: true })
          .populate({ path: 'userId', select: 'firstName lastName', match: userQuery })
          .then(list => list.find(d => d.userId));
        if (!doctor) {
          return res.json({ response: 'I could not find that doctor. Please check the name or search on the Doctors page.' });
        }
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dateStr = today.toISOString().slice(0, 10);
        const slots = doctor.getAvailableSlots(dayName, dateStr);
        const booked = await Appointment.find({ doctorId: doctor._id, appointmentDate: new Date(dateStr), status: { $in: ['confirmed','pending'] } }).select('appointmentTime');
        const bookedTimes = booked.map(b => b.appointmentTime);
        const free = slots.filter(s => !bookedTimes.includes(s));
        const name = `${doctor.userId.firstName} ${doctor.userId.lastName}`;
        if (!free.length) {
          return res.json({ response: `Dr. ${name} has no free slots today. You can check another day on the Doctors page.` });
        }
        return res.json({ response: `Dr. ${name} is available today at: ${free.slice(0,10).join(', ')}` });
      } catch (e) {
        console.error('Chat doctor availability error:', e);
        return res.json({ response: 'I could not fetch the availability right now. Please check on the Doctors page.' });
      }
    }

            // Handle advanced intents with Gemini for general assistance
    try {
      if (!genAI) {
        return res.json({
          response: 'I can help with PulseAppoint features like booking appointments or finding doctors. What would you like to do?'
        });
      }

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 512,
        },
      });

      // Build conversation history for context
      const contents = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (!item?.role || !item?.content) continue;
          const role = item.role === 'assistant' ? 'model' : 'user';
          contents.push({ role, parts: [{ text: String(item.content) }] });
        }
      }
      contents.push({ role: 'user', parts: [{ text: String(message) }] });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          stopSequences: ["Human:", "Assistant:"],
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      if (!result?.response) {
        throw new Error('Empty response from AI');
      }

      const responseText = result.response.text()?.trim();
      if (!responseText) {
        throw new Error('Empty response text');
      }

      return res.json({ response: responseText });

    } catch (error) {
      console.error('AI generation error:', error);
      const msg = error?.message || '';
      const isSafetyError = msg.includes('safety_settings') || msg.includes('safety filters');
      
      if (isSafetyError || error.status === 400) {
        return res.json({
          response: 'I can only help with PulseAppoint features like booking appointments or finding doctors. What would you like to do?'
        });
      }

      return res.json({
        response: 'I encountered an error. I can help with booking appointments, finding doctors, or managing your existing appointments.'
      });
    }
    // Show user's appointments
    const asksAppointments = /(my\s+appointments|appointments\s*(today|upcoming)?|what\s+are\s+my\s+appointments|show\s+appointments|view\s+appointments)/.test(lower);
    if (asksAppointments) {
      if (!req.user) {
        return res.json({
          response: 'Please log in to view your appointments. Go to Login, then open Appointments from the navbar.'
        });
      }
      try {
        const appointments = await Appointment.find({ 
          patientId: req.user._id,
          status: { $in: ['confirmed', 'pending', 'rescheduled'] }
        })
        .populate('doctorId')
        .populate({ 
          path: 'doctorId', 
          populate: { path: 'userId', select: 'firstName lastName' }
        })
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .limit(5);

        if (!appointments || appointments.length === 0) {
          return res.json({ response: 'You have no active appointments. Would you like help booking one?' });
        }

        const lines = appointments.map(a => {
          const date = formatHumanDate(new Date(a.appointmentDate));
          const time = a.appointmentTime;
          const doctor = a.doctorId?.userId ? `Dr. ${a.doctorId.userId.firstName} ${a.doctorId.userId.lastName}` : 'Unknown Doctor';
          const spec = a.doctorId?.specialization ? ` • ${a.doctorId.specialization}` : '';
          const status = a.status.charAt(0).toUpperCase() + a.status.slice(1);
          return `- ${doctor} on ${date} at ${time}${spec} • ${status}`;
        });

        const summary = `Your upcoming appointments:\n${lines.join('\n')}\n\nFor full details or to manage appointments, open Appointments in the app.`;
        return res.json({ response: summary });
      } catch (e) {
        console.error('Chat appointments fetch error:', e);
        return res.json({
          response: 'I could not fetch your appointments right now. Please open the Appointments page for details.'
        });
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    return res.json({
      response: 'Something went wrong. I can help with PulseAppoint features like booking and managing appointments.'
    });
  }
});





























































































module.exports = router;