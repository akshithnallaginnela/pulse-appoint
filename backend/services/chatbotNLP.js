// Chatbot NLP Service - Intent Recognition and Entity Extraction

class ChatbotNLP {
  constructor() {
    // Intent patterns with regex and keywords
    this.intentPatterns = {
      greeting: {
        patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening)/i],
        keywords: ['hi', 'hello', 'hey', 'greetings', 'morning', 'afternoon', 'evening']
      },
      view_appointments: {
        patterns: [
          /^what.*my.*appointments?/i,
          /^show.*my.*appointments?/i,
          /^my.*appointments?$/i,
          /^list.*my.*appointments?/i,
          /^view.*my.*appointments?/i,
          /^check.*my.*appointments?/i,
          /^see.*my.*appointments?/i,
          /^get.*my.*appointments?/i,
          /^display.*my.*appointments?/i,
          /upcoming.*appointments?/i,
          /do i have.*appointments?/i,
          /any.*appointments?/i,
          /^appointments?$/i
        ],
        keywords: ['my appointments', 'show appointments', 'list appointments', 'view appointments', 'check appointments', 'what are my', 'do i have']
      },
      book_appointment: {
        patterns: [
          /book.*appointment/i,
          /schedule.*appointment/i,
          /make.*appointment/i,
          /need.*appointment/i,
          /want.*appointment/i,
          /appointment.*with/i,
          /see.*doctor/i,
          /consult.*with/i,
          /^i need.*doctor/i,
          /^i want.*doctor/i
        ],
        keywords: ['book', 'schedule', 'make', 'need appointment', 'want appointment', 'consultation', 'visit']
      },
      cancel_appointment: {
        patterns: [
          /cancel.*appointment/i,
          /remove.*appointment/i,
          /delete.*appointment/i,
          /don't want.*appointment/i,
          /need to cancel/i
        ],
        keywords: ['cancel', 'remove', 'delete', 'don\'t want']
      },
      reschedule_appointment: {
        patterns: [
          /reschedule.*appointment/i,
          /change.*appointment/i,
          /move.*appointment/i,
          /modify.*appointment/i,
          /different.*time/i,
          /different.*date/i
        ],
        keywords: ['reschedule', 'change', 'move', 'modify', 'different', 'another']
      },
      search_doctors: {
        patterns: [
          /find.*doctor/i,
          /search.*doctor/i,
          /show.*doctors?/i,
          /list.*doctors?/i,
          /available.*doctors?/i,
          /which.*doctors?/i,
          /any.*doctors?/i,
          /doctors?.*available/i
        ],
        keywords: ['find doctor', 'search doctor', 'show doctors', 'available doctors', 'list doctors']
      },
      doctor_info: {
        patterns: [
          /tell me about.*doctor/i,
          /doctor.*info/i,
          /doctor.*details/i,
          /about.*dr\./i,
          /who is.*dr\./i
        ],
        keywords: ['about doctor', 'doctor info', 'doctor details', 'tell me about']
      },
      availability_check: {
        patterns: [
          /available.*(?:on|at|today|tomorrow)/i,
          /free.*(?:on|at|today|tomorrow)/i,
          /check.*availability/i,
          /when.*available/i,
          /slots.*available/i,
          /time.*available/i
        ],
        keywords: ['available', 'free', 'availability', 'slots', 'when', 'time slots']
      },
      help: {
        patterns: [/help/i, /what can you do/i, /how.*work/i, /assist/i, /support/i],
        keywords: ['help', 'assist', 'support', 'how', 'what can']
      }
    };

    // Medical specializations
    this.specializations = [
      'cardiologist', 'pediatrician', 'dermatologist', 'orthopedic',
      'general physician', 'neurologist', 'gynecologist', 'psychiatrist',
      'oncologist', 'radiologist', 'anesthesiologist', 'emergency',
      'family medicine', 'internal medicine', 'ophthalmologist', 'ent',
      'urologist', 'endocrinologist', 'gastroenterologist', 'pulmonologist',
      'rheumatologist', 'nephrologist', 'hematologist', 'infectious disease'
    ];

    // Time patterns
    this.timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(morning|afternoon|evening|noon)/i
    ];

    // Date patterns
    this.datePatterns = [
      /today/i,
      /tomorrow/i,
      /day after tomorrow/i,
      /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i
    ];
  }

  // Detect intent from user message
  detectIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    console.log('[NLP detectIntent] Analyzing message:', lowerMessage);

    // Check each intent pattern
    for (const [intent, config] of Object.entries(this.intentPatterns)) {
      // Check regex patterns first (more specific)
      for (const pattern of config.patterns) {
        if (pattern.test(lowerMessage)) {
          console.log('[NLP detectIntent] Matched intent via regex:', intent);
          return intent;
        }
      }

      // Check keywords (need at least one keyword match)
      const keywordMatches = config.keywords.filter(keyword =>
        lowerMessage.includes(keyword.toLowerCase())
      );

      if (keywordMatches.length > 0) {
        console.log('[NLP detectIntent] Matched intent via keywords:', intent, 'matches:', keywordMatches);
        return intent;
      }
    }

    console.log('[NLP detectIntent] No match found, returning fallback');
    return 'fallback';
  }

  // Extract entities from message
  extractEntities(message) {
    const entities = {};
    const lowerMessage = message.toLowerCase();

    // Extract specialization (but exclude if it's part of "appointment")
    for (const spec of this.specializations) {
      if (lowerMessage.includes(spec) && !lowerMessage.includes('appointment')) {
        entities.specialization = spec.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        console.log('[NLP extractEntities] Found specialization:', entities.specialization);
        break;
      }
    }

    // Extract doctor name (Dr. followed by name)
    const doctorNameMatch = message.match(/dr\.?\s+([a-z]+(?:\s+[a-z]+)?)/i);
    if (doctorNameMatch) {
      entities.doctorName = doctorNameMatch[1].trim();
    }

    // Extract time
    for (const pattern of this.timePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[1] && match[2] && match[3]) { // HH:MM AM/PM format
          const hour = parseInt(match[1]);
          const minute = match[2];
          const period = match[3].toLowerCase();
          let hourNum = hour;

          if (period === 'pm' && hour !== 12) {
            hourNum += 12;
          } else if (period === 'am' && hour === 12) {
            hourNum = 0;
          }

          entities.time = `${String(hourNum).padStart(2, '0')}:${minute}`;
        } else if (match[1] && match[2] && !match[3]) { // HH:MM 24-hour format (no AM/PM)
          const hour = parseInt(match[1]);
          const minute = match[2];
          entities.time = `${String(hour).padStart(2, '0')}:${minute}`;
        } else if (match[1] && match[2] && typeof match[2] === 'string' && (match[2].toLowerCase() === 'am' || match[2].toLowerCase() === 'pm')) { // HH AM/PM format
          const hour = parseInt(match[1]);
          const period = match[2].toLowerCase();
          let hourNum = hour;

          if (period === 'pm' && hour !== 12) {
            hourNum += 12;
          } else if (period === 'am' && hour === 12) {
            hourNum = 0;
          }

          entities.time = `${String(hourNum).padStart(2, '0')}:00`;
        } else if (match[1] && (match[1].toLowerCase() === 'morning' || match[1].toLowerCase() === 'afternoon' || match[1].toLowerCase() === 'evening' || match[1].toLowerCase() === 'noon')) { // morning/afternoon/evening
          const timeOfDay = match[1].toLowerCase();
          const timeMap = {
            'morning': '09:00',
            'afternoon': '14:00',
            'evening': '17:00',
            'noon': '12:00'
          };
          entities.time = timeMap[timeOfDay];
        }
        break;
      }
    }

    // Extract date
    for (const pattern of this.datePatterns) {
      const match = message.match(pattern);
      if (match) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (/today/i.test(match[0])) {
          entities.date = today;
        } else if (/tomorrow/i.test(match[0])) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          entities.date = tomorrow;
        } else if (/day after tomorrow/i.test(match[0])) {
          const dayAfter = new Date(today);
          dayAfter.setDate(dayAfter.getDate() + 2);
          entities.date = dayAfter;
        } else if (match[1] && /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(match[0])) {
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = daysOfWeek.indexOf(match[1].toLowerCase());
          const currentDay = today.getDay();
          let daysToAdd = targetDay - currentDay;
          if (daysToAdd <= 0) {
            daysToAdd += 7;
          }
          const nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + daysToAdd);
          entities.date = nextDate;
        } else if (match[1] && match[2]) {
          // DD/MM/YYYY or MM/DD/YYYY format
          const part1 = parseInt(match[1]);
          const part2 = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : today.getFullYear();

          // Assume MM/DD format for US style
          if (part1 <= 12) {
            entities.date = new Date(year, part1 - 1, part2);
          } else {
            entities.date = new Date(year, part2 - 1, part1);
          }
        } else if (match[1] && match[2] && (typeof match[1] === 'string' && match[1].length > 2)) {
          // Month name format
          const months = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3,
            'may': 4, 'june': 5, 'july': 6, 'august': 7,
            'september': 8, 'october': 9, 'november': 10, 'december': 11
          };
          const month = months[match[1].toLowerCase()];
          const day = parseInt(match[2]);
          entities.date = new Date(today.getFullYear(), month, day);
        }
        break;
      }
    }

    // Extract appointment ID (typically a MongoDB ObjectId or number)
    const appointmentIdMatch = message.match(/appointment\s*#?([a-f0-9]{24}|\d+)/i);
    if (appointmentIdMatch) {
      entities.appointmentId = appointmentIdMatch[1];
    }

    return entities;
  }

  // Analyze complete message
  analyze(message) {
    const intent = this.detectIntent(message);
    const entities = this.extractEntities(message);

    return {
      intent,
      entities,
      confidence: this.calculateConfidence(intent, entities)
    };
  }

  // Calculate confidence score
  calculateConfidence(intent, entities) {
    let confidence = 0.5; // Base confidence

    if (intent !== 'fallback') {
      confidence += 0.3;
    }

    // Increase confidence based on extracted entities
    const entityCount = Object.keys(entities).length;
    confidence += Math.min(entityCount * 0.05, 0.2);

    return Math.min(confidence, 1.0);
  }

  // Generate suggestions based on context
  generateSuggestions(intent, context = {}) {
    const suggestions = {
      greeting: [
        '📅 Book Appointment',
        '👨‍⚕️ Find Doctors',
        '📋 My Appointments',
        '❓ Help'
      ],
      book_appointment: [
        'Cardiologist',
        'Pediatrician',
        'General Physician',
        'Dermatologist'
      ],
      search_doctors: [
        'Cardiologist',
        'Pediatrician',
        'Orthopedic Surgeon',
        'Show All Doctors'
      ],
      view_appointments: [
        'Upcoming Appointments',
        'Past Appointments',
        'Today\'s Appointments'
      ],
      fallback: [
        '📅 Book Appointment',
        '👨‍⚕️ Find Doctors',
        '📋 View Appointments',
        '❓ Help'
      ]
    };

    return suggestions[intent] || suggestions.fallback;
  }
}

module.exports = new ChatbotNLP();
