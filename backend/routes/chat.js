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

    // Book appointment intent
    const bookingIntent = /book\s+(an?\s+)?appointment/i.test(lower);
    if (bookingIntent) {
      if (!req.user) {
        return res.json({ response: 'Please log in to book appointments. Go to Login, then try again.' });
      }
      if (req.user.role !== 'patient') {
        return res.json({ response: 'Only patient accounts can book appointments via the assistant.' });
      }

      const doctorMatch = message.match(/dr\.?\s+([a-zA-Z]+)(?:\s+([a-zA-Z]+))?/i);
      const dateMatch = message.match(/on\s+(\d{4}-\d{2}-\d{2}|\d{2}[\/.-]\d{2}[\/.-]\d{4})/i);
      const timeMatch = message.match(/at\s+([0-9]{1,2}:[0-9]{2}(?:\s*[ap]m)?|[0-9]{1,2}\s*[ap]m)/i);
      const reasonMatch = message.match(/for\s+(.+)/i);

      if (!doctorMatch || !dateMatch || !timeMatch) {
        return res.json({
          response: 'To book via chat, say something like “Book an appointment with Dr. Sharma on 2025-02-05 at 10:00 for routine checkup.”'
        });
      }

      const appointmentDate = parseDateString(dateMatch[1]);
      const appointmentTime = normalizeTime(timeMatch[1]);
      if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
        return res.json({ response: 'I could not understand that date. Please use YYYY-MM-DD format.' });
      }
      if (!appointmentTime) {
        return res.json({ response: 'I could not understand that time. Please use HH:MM (24h) or include am/pm.' });
      }

      const first = doctorMatch[1];
      const last = doctorMatch[2];
      const userQuery = last
        ? { firstName: new RegExp(`^${first}$`, 'i'), lastName: new RegExp(`^${last}$`, 'i') }
        : { firstName: new RegExp(`^${first}$`, 'i') };

      try {
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

        const reasonText = reasonMatch ? reasonMatch[1].trim() : 'General consultation';

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

    // Cancel appointment intent
    const cancelIntent = /(cancel|cancelling).*appointment/.test(lower);
    if (cancelIntent) {
      if (!req.user) {
        return res.json({ response: 'Please log in to cancel appointments.' });
      }
      if (req.user.role !== 'patient') {
        return res.json({ response: 'Only patient accounts can cancel appointments via the assistant.' });
      }

      const dateMatch = message.match(/on\s+(\d{4}-\d{2}-\d{2}|\d{2}[\/.-]\d{2}[\/.-]\d{4})/i);
      const timeMatch = message.match(/at\s+([0-9]{1,2}:[0-9]{2}(?:\s*[ap]m)?|[0-9]{1,2}\s*[ap]m)/i);
      const reasonMatch = message.match(/because\s+(.+)/i) || message.match(/for\s+(.+)/i);

      if (!dateMatch || !timeMatch) {
        return res.json({ response: 'Please tell me which appointment to cancel, for example “Cancel my appointment on 2025-02-01 at 09:00”.' });
      }

      const appointmentDate = parseDateString(dateMatch[1]);
      const appointmentTime = normalizeTime(timeMatch[1]);
      if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
        return res.json({ response: 'I could not understand that date. Please use YYYY-MM-DD format.' });
      }
      if (!appointmentTime) {
        return res.json({ response: 'I could not understand that time. Please use HH:MM (24h) or include am/pm.' });
      }

      const startOfDay = new Date(appointmentDate.getTime());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      try {
        const appointment = await Appointment.findOne({
          patientId: req.user._id,
          appointmentDate: { $gte: startOfDay, $lt: endOfDay },
          appointmentTime,
          status: { $in: ['pending', 'confirmed', 'rescheduled'] }
        });

        if (!appointment) {
          return res.json({ response: 'I could not find an appointment matching that time. Please check the details on the Appointments page.' });
        }

        if (!appointment.canBeCancelled()) {
          return res.json({ response: 'That appointment can no longer be cancelled within 24 hours of the scheduled time.' });
        }

        const refundAmount = appointment.calculateRefund();
        appointment.status = 'cancelled';
        appointment.cancellation = {
          cancelledBy: 'patient',
          cancelledAt: new Date(),
          reason: reasonMatch ? reasonMatch[1].trim() : 'Cancelled via assistant',
          refundAmount,
          refundStatus: refundAmount > 0 ? 'pending' : 'processed'
        };

        await appointment.save();

        const dateDisplay = formatHumanDate(appointmentDate);
        const refundText = refundAmount > 0 ? `Refund amount ₹${refundAmount} will be processed soon.` : 'No refund is due for this cancellation.';
        return res.json({
          response: `Your appointment on ${dateDisplay} at ${appointmentTime} has been cancelled. ${refundText}`
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

    // Simple intent: show user's appointments
    const asksAppointments = /(my\s+appointments|appointments\s*(today|upcoming)?|what\s+are\s+my\s+appointments|show\s+appointments|view\s+appointments)/.test(lower);
    if (asksAppointments) {
      if (!req.user) {
        return res.json({
          response: 'Please log in to view your appointments. Go to Login, then open Appointments from the navbar.'
        });
      }
      try {
        const now = new Date();
        const appointments = await Appointment.find({ patientId: req.user._id })
          .populate('doctorId', 'specialization consultationFee')
          .sort({ appointmentDate: 1, appointmentTime: 1 })
          .limit(5);

        if (!appointments || appointments.length === 0) {
          return res.json({ response: 'You have no appointments yet. Would you like help booking one?' });
        }

        const lines = appointments.map(a => {
          const date = new Date(a.appointmentDate).toLocaleDateString();
          const time = a.appointmentTime;
          const spec = a.doctorId?.specialization ? ` • ${a.doctorId.specialization}` : '';
          const status = a.status;
          return `- ${date} ${time}${spec} • ${status}`;
        });
        const summary = `You have ${appointments.length} recent appointments:\n${lines.join('\n')}\n\nFor full details or to cancel/reschedule, open Appointments in the app.`;
        return res.json({ response: summary });
      } catch (e) {
        console.error('Chat appointments fetch error:', e);
        return res.json({
          response: 'I could not fetch your appointments right now. Please open the Appointments page for details.'
        });
      }
    }

    console.log('Initializing chat with API key:', apiKey ? 'Present' : 'Missing');
    
    try {
      console.log('Initializing model...');
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_CONTEXT,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 512,
        },
      });

      console.log('Preparing contents from history...');
      const contents = [];
      // Map prior messages if provided
      if (Array.isArray(history)) {
        for (const item of history) {
          if (!item || !item.role || !item.content) continue;
          const role = item.role === 'assistant' ? 'model' : 'user';
          contents.push({ role, parts: [{ text: String(item.content) }] });
        }
      }
      // Append current user message
      contents.push({ role: 'user', parts: [{ text: String(message) }] });

      console.log('Sending request to Gemini API...');
      const result = await model.generateContent({ contents });

      if (!result || !result.response) {
        console.error('No response object from Gemini');
        return res.status(500).json({ error: 'Empty response from AI' });
      }

      try {
        const responseText = result.response.text();
        console.log('Generated response:', responseText);
        
        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Empty response from AI');
        }

        res.json({ response: responseText.trim() });
      } catch (error) {
        console.error('Error processing response:', error);
        return res.status(500).json({ 
          error: 'Failed to process AI response',
          details: error.message 
        });
      }
    } catch (generationError) {
      console.error('AI generation error:', generationError);
      const msg = (generationError && generationError.message) || '';
      const isSafetyEnumError = msg.includes('GenerateContentRequest.safety_settings');
      if (isSafetyEnumError || (generationError.status === 400)) {
        return res.json({
          response: 'I can help only with PulseAppoint usage, like booking or managing appointments. What would you like to do in the app?'
        });
      }
      return res.json({
        response: 'Sorry, I could not process that. I can help with booking, finding doctors, or managing appointments in PulseAppoint.'
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return res.json({
      response: 'Something went wrong. I can help with PulseAppoint features like booking and managing appointments.'
    });
  }
});

module.exports = router;