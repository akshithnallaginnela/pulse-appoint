# 🤖 AI Chatbot Assistant - Healthcare Appointment System

## Overview

This intelligent AI-powered chatbot serves as a virtual hospital receptionist, enabling users to manage their healthcare appointments through natural conversation. Built with advanced NLP capabilities, it provides a seamless, user-friendly experience for booking, rescheduling, and canceling appointments.

## ✨ Features

### Core Capabilities

1. **Appointment Booking**
   - Search doctors by specialization
   - View available time slots
   - Complete booking through conversation
   - Real-time availability checking

2. **Appointment Management**
   - View upcoming appointments
   - Reschedule appointments
   - Cancel appointments with automatic refund calculation
   - View appointment history

3. **Doctor Discovery**
   - Search by specialization (Cardiologist, Pediatrician, etc.)
   - Search by doctor name
   - View doctor profiles, ratings, and fees
   - Check doctor availability schedules

4. **Intelligent Conversation**
   - Natural language understanding
   - Context-aware responses
   - Multi-turn conversation support
   - Typo and error tolerance
   - Follow-up question handling

5. **User Experience**
   - Modern, clean UI with chat bubbles
   - Typing indicators
   - Quick-reply suggestion buttons
   - Voice input support (Speech Recognition API)
   - Doctor and appointment card previews
   - Smooth animations and transitions

## 🏗️ Architecture

### Backend Components

#### 1. **Models**
- **Conversation Model** (`backend/models/Conversation.js`)
  - Stores conversation history
  - Manages session state
  - Tracks user context and pending actions

#### 2. **Services**
- **ChatbotNLP Service** (`backend/services/chatbotNLP.js`)
  - Intent recognition using pattern matching
  - Entity extraction (dates, times, specializations, doctor names)
  - Confidence scoring
  - Suggestion generation

- **Chatbot Service** (`backend/services/chatbotService.js`)
  - Conversation management
  - Intent handling
  - Database operations
  - Response generation
  - Context tracking

#### 3. **Routes**
- **Chatbot Routes** (`backend/routes/chatbot.js`)
  - `POST /api/chatbot/message` - Send message to chatbot
  - `GET /api/chatbot/session/:sessionId` - Get conversation history
  - `POST /api/chatbot/session/new` - Start new session
  - `POST /api/chatbot/session/end` - End session

### Frontend Components

#### 1. **Main Components**
- **Chatbot Component** (`src/components/Chatbot.tsx`)
  - Full-featured chat interface
  - Message rendering with role-based styling
  - Doctor and appointment card display
  - Suggestion buttons
  - Voice input integration

- **ChatbotButton Component** (`src/components/ChatbotButton.tsx`)
  - Floating action button
  - Pulse animation
  - Opens/closes chatbot

#### 2. **UI Features**
- User messages: Right-aligned, blue background
- Bot messages: Left-aligned, gray background
- Avatar icons for both user and bot
- Typing indicator with animated dots
- Scrollable message area
- Minimizable interface
- Smooth transitions and animations

## 🎯 Supported Intents

### Primary Intents

1. **Greeting**
   - Triggers: "hi", "hello", "hey"
   - Response: Welcome message with action suggestions

2. **Book Appointment**
   - Triggers: "book appointment", "schedule appointment", "need appointment"
   - Flow: Specialization → Doctor selection → Date → Time → Reason → Confirmation

3. **Cancel Appointment**
   - Triggers: "cancel appointment", "cancel my appointment"
   - Flow: Select appointment → Confirm cancellation → Refund processing

4. **Reschedule Appointment**
   - Triggers: "reschedule appointment", "change appointment"
   - Flow: Select appointment → New date → New time → Confirmation

5. **View Appointments**
   - Triggers: "my appointments", "show appointments", "upcoming appointments"
   - Response: List of user's active appointments

6. **Search Doctors**
   - Triggers: "find doctor", "show doctors", "list doctors"
   - Response: Doctor list with cards

7. **Doctor Info**
   - Triggers: "tell me about Dr. [name]", "doctor info"
   - Response: Detailed doctor profile

8. **Availability Check**
   - Triggers: "check availability", "available slots"
   - Response: Available time slots for selected doctor

9. **Help**
   - Triggers: "help", "what can you do"
   - Response: List of capabilities

## 🔄 Conversation Flow Examples

### Example 1: Booking an Appointment

```
User: "I need to book an appointment with a cardiologist"
Bot: "I found 3 cardiologists available. Please select a doctor..."
     [Shows doctor cards]

User: "Dr. Smith"
Bot: "Great! When would you like to schedule your appointment?"

User: "Tomorrow"
Bot: "Available slots for December 18:
     10:00, 10:30, 11:00, 14:00, 14:30, 15:00
     What time would you prefer?"

User: "2:30 PM"
Bot: "Great! Please briefly describe the reason for your visit:"

User: "Regular checkup"
Bot: "**Appointment Summary:**
     👨‍⚕️ Doctor: Dr. John Smith
     📅 Date: Tuesday, December 18, 2024
     🕐 Time: 14:30
     📝 Reason: Regular checkup
     💰 Fee: ₹500
     
     Shall I book this appointment for you?"

User: "Yes"
Bot: "✅ Appointment Booked Successfully!
     Your appointment has been confirmed.
     📧 Confirmation email sent.
     🆔 Appointment ID: 507f1f77bcf86cd799439011"
```

### Example 2: Cancelling an Appointment

```
User: "Cancel my appointment"
Bot: "Which appointment would you like to cancel?"
     [Shows appointment cards]

User: "Appointment 1"
Bot: "Are you sure you want to cancel with Dr. Smith on Dec 18 at 2:30 PM?
     You'll receive a full refund of ₹500.
     Reply 'Yes' to confirm."

User: "Yes"
Bot: "✅ Appointment Cancelled Successfully
     Refund of ₹500 will be processed in 5-7 business days."
```

## 🛠️ Installation & Setup

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
npm install uuid
```

2. **Environment Variables**
Add to your `backend/.env`:
```env
# Existing variables...
# No additional variables needed for basic chatbot functionality
```

3. **Start Backend**
```bash
npm run dev
```

### Frontend Setup

1. **Install Dependencies** (if needed)
```bash
npm install
```

2. **Start Frontend**
```bash
npm run dev
```

## 🎨 Customization

### Styling

The chatbot uses TailwindCSS with the following color scheme:
- **Primary**: Blue (blue-600, blue-500)
- **User Messages**: Blue background (blue-600)
- **Bot Messages**: Gray background (gray-100)
- **Accents**: Green for fees, various badge colors

To customize, modify the Tailwind classes in:
- `src/components/Chatbot.tsx`
- `src/components/ChatbotButton.tsx`

### Adding New Intents

1. Add intent pattern to `backend/services/chatbotNLP.js`:
```javascript
your_new_intent: {
  patterns: [/your.*pattern/i],
  keywords: ['keyword1', 'keyword2']
}
```

2. Add handler in `backend/services/chatbotService.js`:
```javascript
case 'your_new_intent':
  ({ response, suggestions } = await this.handleYourNewIntent(entities));
  break;
```

3. Implement the handler method:
```javascript
async handleYourNewIntent(entities) {
  // Your logic here
  return {
    response: "Your response",
    suggestions: ['Option 1', 'Option 2']
  };
}
```

### Adding More Specializations

Edit the `specializations` array in `backend/services/chatbotNLP.js`:
```javascript
this.specializations = [
  'cardiologist',
  'pediatrician',
  'your-new-specialization',
  // ...
];
```

## 🧪 Testing

### Manual Testing Scenarios

1. **Book Appointment Flow**
   - Test with valid specialization
   - Test with doctor name
   - Test date/time parsing
   - Test confirmation/cancellation

2. **Cancel Appointment**
   - Test with existing appointments
   - Test refund calculation
   - Test cancellation policy (12-hour rule)

3. **Reschedule Appointment**
   - Test rescheduling to valid date/time
   - Test slot availability checking

4. **Edge Cases**
   - Invalid dates (past dates)
   - Fully booked slots
   - Non-existent doctors
   - Typos and misspellings

### API Testing with cURL

```bash
# Start new session
curl -X POST http://localhost:5000/api/chatbot/session/new \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send message
curl -X POST http://localhost:5000/api/chatbot/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Book appointment with cardiologist", "sessionId": "SESSION_ID"}'
```

## 📱 Voice Input Support

The chatbot supports voice input using the Web Speech API:

```javascript
// Browser compatibility check
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  // Voice input available
}
```

**Supported Browsers:**
- Chrome/Edge (full support)
- Safari (limited support)
- Firefox (not supported)

## 🔐 Security Features

1. **Authentication Required**
   - All chatbot endpoints require valid JWT token
   - Session ID validation

2. **Input Validation**
   - Message content sanitization
   - Maximum message length
   - SQL injection prevention (via Mongoose)

3. **Rate Limiting**
   - Inherited from main API rate limiting
   - Prevents abuse

## 📊 Database Schema

### Conversation Collection

```javascript
{
  userId: ObjectId,
  sessionId: String (UUID),
  messages: [{
    role: String ('user' | 'assistant' | 'system'),
    content: String,
    intent: String,
    entities: Object,
    timestamp: Date
  }],
  context: {
    currentIntent: String,
    awaitingInput: Boolean,
    expectedInputType: String,
    pendingAction: Object,
    selectedDoctor: ObjectId,
    selectedDate: Date,
    selectedTime: String,
    availableSlots: [String],
    appointmentReason: String
  },
  isActive: Boolean,
  lastActivity: Date
}
```

## 🚀 Performance Optimization

1. **Lazy Loading**
   - Chatbot loads only when button is clicked
   - Reduces initial bundle size

2. **Message Pagination**
   - Limited message history displayed
   - Older messages can be loaded on demand

3. **Debouncing**
   - Prevents multiple rapid API calls

4. **Caching**
   - Doctor list caching
   - Session state persistence

## 🐛 Troubleshooting

### Common Issues

1. **Chatbot not responding**
   - Check backend server is running
   - Verify JWT token is valid
   - Check browser console for errors

2. **Voice input not working**
   - Ensure HTTPS connection (required for mic access)
   - Check browser compatibility
   - Grant microphone permissions

3. **Appointments not booking**
   - Verify MongoDB connection
   - Check doctor availability data
   - Ensure user is authenticated

4. **Session expires**
   - Sessions are kept alive for 24 hours
   - Start new session if expired

## 📈 Future Enhancements

- [ ] Integration with OpenAI GPT for more natural responses
- [ ] Multi-language support
- [ ] Voice output (Text-to-Speech)
- [ ] Appointment reminders via chatbot
- [ ] Medical history integration
- [ ] Symptom checker
- [ ] Prescription refill requests
- [ ] Lab report discussions
- [ ] Video consultation booking
- [ ] Insurance verification

## 🤝 Contributing

When adding new features:

1. Update NLP patterns in `chatbotNLP.js`
2. Add handlers in `chatbotService.js`
3. Update UI components as needed
4. Add tests
5. Update this documentation

## 📄 License

This chatbot feature is part of the Pulse Appoint healthcare management system.

## 🙏 Acknowledgments

- Built with React, Express, and MongoDB
- UI components from shadcn/ui
- Icons from Lucide React
- NLP patterns inspired by best practices in conversational AI

---

**Note:** This chatbot uses rule-based NLP. For production use, consider integrating with advanced NLP services like:
- OpenAI GPT-4
- Google Dialogflow
- Microsoft LUIS
- Rasa Open Source

For questions or support, contact the development team.
