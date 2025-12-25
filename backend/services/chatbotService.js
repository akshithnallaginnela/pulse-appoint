const Conversation = require('../models/Conversation');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const geminiService = require('./geminiService');
const { v4: uuidv4 } = require('uuid');
const chrono = require('chrono-node');

class ChatbotService {
    /**
     * Get or create conversation session
     */
    async getOrCreateConversation(userId, sessionId = null) {
        try {
            // If sessionId provided, try to find existing conversation
            if (sessionId) {
                const conversation = await Conversation.findOne({
                    userId,
                    sessionId,
                    isActive: true
                });

                if (conversation) {
                    return conversation;
                }
            }

            // Create new conversation
            const newConversation = new Conversation({
                userId,
                sessionId: sessionId || uuidv4(),
                messages: [],
                context: {}
            });

            await newConversation.save();
            return newConversation;
        } catch (error) {
            console.error('Error getting/creating conversation:', error);
            throw error;
        }
    }

    /**
     * Process user message and generate response
     */
    async processMessage(userId, message, sessionId = null) {
        try {
            // Get or create conversation
            const conversation = await this.getOrCreateConversation(userId, sessionId);

            // Analyze intent using Gemini AI
            const analysis = await geminiService.analyzeIntent(message);
            const { intent, entities } = analysis;

            console.log('[Chatbot] Intent:', intent, 'Entities:', entities);

            // Add user message to conversation
            conversation.messages.push({
                role: 'user',
                content: message,
                intent,
                entities,
                timestamp: new Date()
            });

            // Process based on intent
            let response = '';
            let suggestions = [];
            let doctorCards = [];
            let appointments = [];

            switch (intent) {
                case 'greeting':
                    response = "Hello! 👋 I'm your healthcare assistant. I can help you book appointments, find doctors, or manage your existing appointments. What would you like to do today?";
                    suggestions = ['📅 Book Appointment', '👨‍⚕️ Find Doctors', '📋 My Appointments'];
                    break;

                case 'help':
                    response = `I can help you with:

📅 **Book Appointments** - Schedule a visit with a doctor
👨‍⚕️ **Find Doctors** - Search by specialization or name
📋 **View Appointments** - See your upcoming appointments
❌ **Cancel** - Cancel an existing appointment
🔄 **Reschedule** - Change appointment date or time

What would you like to do?`;
                    suggestions = ['Book Appointment', 'Find Doctors', 'My Appointments'];
                    break;

                case 'search_doctors':
                case 'book_appointment':
                    ({ response, suggestions, doctorCards } = await this.handleDoctorSearch(entities, conversation));
                    break;

                case 'view_appointments':
                    ({ response, appointments } = await this.handleViewAppointments(userId));
                    suggestions = ['Book New Appointment', 'Find Doctors'];
                    break;

                case 'cancel_appointment':
                    ({ response, suggestions, appointments } = await this.handleCancelAppointment(userId, entities, conversation));
                    break;

                case 'reschedule_appointment':
                    ({ response, suggestions } = await this.handleRescheduleAppointment(userId, entities, conversation));
                    break;

                default:
                    // Use Gemini AI to generate contextual response
                    response = await geminiService.generateResponse(message, conversation.messages);
                    suggestions = this.generateContextualSuggestions(intent, entities);
            }

            // Add assistant response to conversation
            conversation.messages.push({
                role: 'assistant',
                content: response,
                intent,
                timestamp: new Date()
            });

            // Save conversation
            await conversation.save();

            return {
                sessionId: conversation.sessionId,
                response,
                suggestions,
                doctorCards,
                appointments
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    /**
     * Handle doctor search
     */
    async handleDoctorSearch(entities, conversation) {
        try {
            let query = { isActive: true, isVerified: true };
            let response = '';
            let suggestions = [];
            let doctorCards = [];

            // Search by specialization
            if (entities.specialization) {
                query.specialization = new RegExp(entities.specialization, 'i');

                const doctors = await Doctor.find(query)
                    .populate('userId', 'firstName lastName')
                    .limit(5);

                if (doctors.length > 0) {
                    doctorCards = doctors.map(doc => ({
                        id: doc._id,
                        name: `Dr. ${doc.userId.firstName} ${doc.userId.lastName}`,
                        specialization: doc.specialization,
                        experience: doc.experience,
                        fee: doc.consultationFee,
                        rating: doc.rating.average,
                        bio: doc.bio
                    }));

                    response = `I found ${doctors.length} ${entities.specialization}${doctors.length > 1 ? 's' : ''} for you! 👨‍⚕️\n\nWould you like to book an appointment with any of them?`;
                    suggestions = doctorCards.map(d => `Book with ${d.name.split(' ').slice(-1)[0]}`);

                    // Save search results in context
                    conversation.context.lastDoctorSearch = doctors.map(d => d._id.toString());
                } else {
                    response = `I couldn't find any ${entities.specialization}s at the moment. Would you like to:\n• Try a different specialization\n• See all available doctors`;
                    suggestions = ['General Physician', 'Cardiologist', 'Pediatrician', 'Show All Doctors'];
                }
            }
            // Search by doctor name
            else if (entities.doctorName) {
                const doctors = await Doctor.find({ isActive: true, isVerified: true })
                    .populate('userId', 'firstName lastName')
                    .then(docs => docs.filter(doc =>
                        `${doc.userId.firstName} ${doc.userId.lastName}`.toLowerCase().includes(entities.doctorName.toLowerCase())
                    ));

                if (doctors.length > 0) {
                    const doctor = doctors[0];
                    doctorCards = [{
                        id: doctor._id,
                        name: `Dr. ${doctor.userId.firstName} ${doctor.userId.lastName}`,
                        specialization: doctor.specialization,
                        experience: doctor.experience,
                        fee: doctor.consultationFee,
                        rating: doctor.rating.average,
                        bio: doctor.bio
                    }];

                    response = `I found Dr. ${doctor.userId.firstName} ${doctor.userId.lastName}! 👨‍⚕️\n\nWould you like to book an appointment?`;
                    suggestions = ['Book Appointment', 'Check Availability', 'Find Other Doctors'];

                    conversation.context.selectedDoctor = doctor._id.toString();
                } else {
                    response = `I couldn't find a doctor named "${entities.doctorName}". Could you:\n• Check the spelling\n• Search by specialization instead`;
                    suggestions = ['Cardiologist', 'Pediatrician', 'General Physician'];
                }
            }
            // No specific criteria - show popular doctors
            else {
                const doctors = await Doctor.find(query)
                    .populate('userId', 'firstName lastName')
                    .sort({ 'rating.average': -1 })
                    .limit(5);

                if (doctors.length > 0) {
                    doctorCards = doctors.map(doc => ({
                        id: doc._id,
                        name: `Dr. ${doc.userId.firstName} ${doc.userId.lastName}`,
                        specialization: doc.specialization,
                        experience: doc.experience,
                        fee: doc.consultationFee,
                        rating: doc.rating.average,
                        bio: doc.bio
                    }));

                    response = `Here are our top-rated doctors! ⭐\n\nWhat type of specialist are you looking for?`;
                    suggestions = ['Cardiologist', 'Pediatrician', 'Dermatologist', 'General Physician'];

                    conversation.context.lastDoctorSearch = doctors.map(d => d._id.toString());
                }
            }

            return { response, suggestions, doctorCards };
        } catch (error) {
            console.error('Error handling doctor search:', error);
            return {
                response: "I'm having trouble searching for doctors right now. Please try again in a moment.",
                suggestions: ['Try Again', 'View My Appointments'],
                doctorCards: []
            };
        }
    }

    /**
     * Handle view appointments
     */
    async handleViewAppointments(userId) {
        try {
            const appointments = await Appointment.find({
                patientId: userId,
                status: { $in: ['pending', 'confirmed', 'rescheduled'] }
            })
                .populate({
                    path: 'doctorId',
                    populate: { path: 'userId', select: 'firstName lastName' }
                })
                .sort({ appointmentDate: 1, appointmentTime: 1 })
                .limit(10);

            if (appointments.length === 0) {
                return {
                    response: "You don't have any upcoming appointments. 📅\n\nWould you like to book one?",
                    appointments: []
                };
            }

            const appointmentList = appointments.map(apt => ({
                id: apt._id,
                doctorName: `Dr. ${apt.doctorId.userId.firstName} ${apt.doctorId.userId.lastName}`,
                specialization: apt.doctorId.specialization,
                date: apt.appointmentDate,
                time: apt.appointmentTime,
                status: apt.status,
                fee: apt.payment.amount
            }));

            const response = `You have ${appointments.length} upcoming appointment${appointments.length > 1 ? 's' : ''}: 📋\n\nWould you like to reschedule or cancel any of these?`;

            return {
                response,
                appointments: appointmentList
            };
        } catch (error) {
            console.error('Error viewing appointments:', error);
            return {
                response: "I'm having trouble retrieving your appointments. Please try again.",
                appointments: []
            };
        }
    }

    /**
     * Handle cancel appointment
     */
    async handleCancelAppointment(userId, entities, conversation) {
        try {
            const appointments = await Appointment.find({
                patientId: userId,
                status: { $in: ['pending', 'confirmed', 'rescheduled'] }
            })
                .populate({
                    path: 'doctorId',
                    populate: { path: 'userId', select: 'firstName lastName' }
                })
                .sort({ appointmentDate: 1 });

            if (appointments.length === 0) {
                return {
                    response: "You don't have any active appointments to cancel.",
                    suggestions: ['Book Appointment', 'Find Doctors'],
                    appointments: []
                };
            }

            const appointmentList = appointments.map(apt => ({
                id: apt._id,
                doctorName: `Dr. ${apt.doctorId.userId.firstName} ${apt.doctorId.userId.lastName}`,
                specialization: apt.doctorId.specialization,
                date: apt.appointmentDate,
                time: apt.appointmentTime,
                status: apt.status
            }));

            const response = "Which appointment would you like to cancel? Please select from your upcoming appointments:";
            const suggestions = appointmentList.map((apt, i) => `Cancel Appointment ${i + 1}`);

            return {
                response,
                suggestions,
                appointments: appointmentList
            };
        } catch (error) {
            console.error('Error handling cancel appointment:', error);
            return {
                response: "I'm having trouble accessing your appointments. Please try again.",
                suggestions: ['Try Again', 'View Appointments'],
                appointments: []
            };
        }
    }

    /**
     * Handle reschedule appointment
     */
    async handleRescheduleAppointment(userId, entities, conversation) {
        try {
            const appointments = await Appointment.find({
                patientId: userId,
                status: { $in: ['pending', 'confirmed', 'rescheduled'] }
            })
                .populate({
                    path: 'doctorId',
                    populate: { path: 'userId', select: 'firstName lastName' }
                })
                .sort({ appointmentDate: 1 });

            if (appointments.length === 0) {
                return {
                    response: "You don't have any active appointments to reschedule.",
                    suggestions: ['Book Appointment', 'Find Doctors']
                };
            }

            const response = "Which appointment would you like to reschedule?";
            const suggestions = appointments.map((apt, i) => `Reschedule Appointment ${i + 1}`);

            return {
                response,
                suggestions
            };
        } catch (error) {
            console.error('Error handling reschedule:', error);
            return {
                response: "I'm having trouble accessing your appointments. Please try again.",
                suggestions: ['Try Again']
            };
        }
    }

    /**
     * Generate contextual suggestions
     */
    generateContextualSuggestions(intent, entities) {
        const suggestions = [];

        if (entities.specialization) {
            suggestions.push('Book Appointment', 'Check Availability');
        } else if (entities.doctorName) {
            suggestions.push('Book with this doctor', 'Find other doctors');
        } else {
            suggestions.push('Book Appointment', 'Find Doctors', 'My Appointments');
        }

        return suggestions;
    }

    /**
     * Get conversation history
     */
    async getConversationHistory(sessionId) {
        try {
            const conversation = await Conversation.findOne({ sessionId, isActive: true });

            if (!conversation) {
                return [];
            }

            return conversation.messages;
        } catch (error) {
            console.error('Error getting conversation history:', error);
            throw error;
        }
    }

    /**
     * End conversation session
     */
    async endConversation(sessionId) {
        try {
            const conversation = await Conversation.findOne({ sessionId });

            if (conversation) {
                conversation.isActive = false;
                await conversation.save();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error ending conversation:', error);
            throw error;
        }
    }
}

module.exports = new ChatbotService();
