// Chatbot Enhancements - Additional helper functions and improvements

class ChatbotEnhancements {
  // Format date in a user-friendly way
  static formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  }

  // Format time in 12-hour format
  static formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Validate if date is valid for booking
  static validateBookingDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return { valid: false, message: "Please select a future date for your appointment." };
    }

    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    if (selectedDate > threeMonthsFromNow) {
      return { valid: false, message: "Appointments can only be scheduled up to 3 months in advance." };
    }

    return { valid: true };
  }

  // Calculate cancellation refund
  static calculateCancellationRefund(appointmentDate, appointmentTime, amount) {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointmentDate.toDateString()} ${appointmentTime}`);
    const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
    
    let refundAmount = 0;
    let refundPercentage = 0;
    let message = '';

    if (hoursUntilAppointment > 24) {
      refundAmount = amount;
      refundPercentage = 100;
      message = `You'll receive a full refund of ₹${refundAmount}.`;
    } else if (hoursUntilAppointment > 2) {
      refundAmount = amount * 0.5;
      refundPercentage = 50;
      message = `You'll receive a 50% refund of ₹${refundAmount}.`;
    } else {
      message = 'No refund available for cancellations less than 2 hours before appointment.';
    }

    return { refundAmount, refundPercentage, message };
  }

  // Generate appointment summary
  static generateAppointmentSummary(appointment, doctor) {
    return `
**📋 Appointment Details:**

👨‍⚕️ **Doctor:** Dr. ${doctor.userId.firstName} ${doctor.userId.lastName}
🏥 **Specialization:** ${doctor.specialization}
📅 **Date:** ${this.formatDate(appointment.appointmentDate)}
🕐 **Time:** ${this.formatTime(appointment.appointmentTime)}
📝 **Reason:** ${appointment.reason}
💰 **Fee:** ₹${appointment.payment.amount}
🆔 **ID:** ${appointment._id}
📊 **Status:** ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
    `.trim();
  }

  // Generate doctor card text
  static generateDoctorCardText(doctor) {
    return `
**Dr. ${doctor.userId.firstName} ${doctor.userId.lastName}**
${doctor.specialization}
⭐ ${doctor.rating.average.toFixed(1)} (${doctor.rating.count} reviews)
💼 ${doctor.experience} years experience
💰 ₹${doctor.consultationFee} consultation fee
    `.trim();
  }

  // Check if message indicates affirmative response
  static isAffirmative(message) {
    const affirmativeWords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'proceed', 'book', 'go ahead'];
    const lowerMessage = message.toLowerCase().trim();
    return affirmativeWords.some(word => lowerMessage.includes(word));
  }

  // Check if message indicates negative response
  static isNegative(message) {
    const negativeWords = ['no', 'nope', 'nah', 'cancel', 'don\'t', 'dont', 'stop', 'nevermind'];
    const lowerMessage = message.toLowerCase().trim();
    return negativeWords.some(word => lowerMessage.includes(word));
  }

  // Generate helpful error message
  static generateErrorMessage(error, context = '') {
    console.error(`Chatbot error in ${context}:`, error);
    
    const errorMessages = {
      'ValidationError': "I noticed some information is missing or invalid. Let's try again.",
      'CastError': "I didn't quite understand that. Could you rephrase?",
      'MongoError': "I'm having trouble accessing the database. Please try again in a moment.",
      'default': "I encountered an unexpected error. Let's start fresh. What would you like to do?"
    };

    const errorType = error.name || 'default';
    return errorMessages[errorType] || errorMessages.default;
  }

  // Suggest next actions based on context
  static suggestNextActions(context) {
    const suggestions = {
      'booking_completed': ['View My Appointments', 'Book Another Appointment', 'Find Doctors'],
      'cancellation_completed': ['Book New Appointment', 'View Appointments', 'Find Doctors'],
      'reschedule_completed': ['View Appointments', 'Book Another Appointment'],
      'no_appointments': ['Book Appointment', 'Find Doctors', 'Help'],
      'default': ['Book Appointment', 'View Appointments', 'Find Doctors', 'Help']
    };

    return suggestions[context] || suggestions.default;
  }

  // Parse natural language time
  static parseNaturalTime(message) {
    const timePatterns = [
      { pattern: /(\d{1,2})\s*(am|pm)/i, format: '12hour' },
      { pattern: /(\d{1,2}):(\d{2})\s*(am|pm)?/i, format: '24hour' },
      { pattern: /(morning)/i, time: '09:00' },
      { pattern: /(afternoon)/i, time: '14:00' },
      { pattern: /(evening)/i, time: '17:00' },
      { pattern: /(noon)/i, time: '12:00' }
    ];

    for (const { pattern, time, format } of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (time) return time;
        
        if (format === '12hour') {
          let hour = parseInt(match[1]);
          const period = match[2].toLowerCase();
          if (period === 'pm' && hour !== 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;
          return `${String(hour).padStart(2, '0')}:00`;
        }
        
        if (format === '24hour') {
          let hour = parseInt(match[1]);
          const minute = match[2] || '00';
          const period = match[3]?.toLowerCase();
          
          if (period === 'pm' && hour !== 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;
          
          return `${String(hour).padStart(2, '0')}:${minute}`;
        }
      }
    }
    
    return null;
  }

  // Generate availability message
  static generateAvailabilityMessage(doctor, date, slots) {
    if (slots.length === 0) {
      const availableDays = Object.entries(doctor.availability)
        .filter(([_, av]) => av.isAvailable)
        .map(([day, _]) => day.charAt(0).toUpperCase() + day.slice(1))
        .join(', ');
      
      return `Dr. ${doctor.userId.firstName} ${doctor.userId.lastName} is not available on this day. They are available on: ${availableDays}.\n\nPlease choose a different date.`;
    }

    const formattedSlots = slots.slice(0, 8).map(slot => this.formatTime(slot));
    const moreSlots = slots.length > 8 ? `\n\n...and ${slots.length - 8} more slots available!` : '';
    
    return `Great! Dr. ${doctor.userId.firstName} ${doctor.userId.lastName} is available on ${this.formatDate(date)}.\n\nAvailable time slots:\n${formattedSlots.join(', ')}${moreSlots}\n\nWhat time works best for you?`;
  }
}

module.exports = ChatbotEnhancements;
