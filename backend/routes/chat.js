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

    // Greeting intent
    const greet = /^(hi|hello|hey|yo|namaste|hola)[!.\s]*$/i.test(String(message).trim());
    if (greet) {
      return res.json({
        response: 'Hi! I\'m PulseAssist. I can help you:\n- Book an appointment\n- Check your appointments\n- Find available doctors\nAsk me something like “Which doctors are available today?” or “What are my appointments?”.'
      });
    }

    // Available doctors (optionally by specialization)
    const askAvailDoctors = /(available\s+doctors|which\s+doctors\s+are\s+available|show\s+available\s+doctors|find\s+doctors)/i.test(String(message));
    if (askAvailDoctors) {
      try {
        const specializations = [
          'Cardiologist','Pediatrician','Dermatologist','Orthopedic Surgeon','General Physician','Neurologist','Gynecologist','Psychiatrist','Oncologist','Radiologist','Anesthesiologist','Emergency Medicine','Family Medicine','Internal Medicine','Ophthalmologist','ENT Specialist','Urologist','Endocrinologist','Gastroenterologist','Pulmonologist','Rheumatologist','Nephrologist','Hematologist','Infectious Disease','Other'
        ];
        const text = String(message);
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

    // Specific doctor availability by name for today
    const nameMatch = /(?:dr\.?\s+)([a-zA-Z]+)\s*([a-zA-Z]*)\b.*(available|availability|time|slot)/i.exec(String(message));
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
    const lower = String(message).toLowerCase();
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