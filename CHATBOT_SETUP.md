# 🚀 Chatbot Quick Start Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB running locally or MongoDB Atlas account
- npm or yarn package manager

## Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

This will install the new `uuid` package required for chatbot sessions.

## Step 2: Verify Environment Variables

Make sure your `backend/.env` file contains:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/doctor-appointment
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## Step 3: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Server is running on port 5000
MongoDB connected successfully
```

## Step 4: Start the Frontend

Open a new terminal:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Step 5: Test the Chatbot

1. **Sign up / Log in** to the application
2. Look for the **blue floating button** at the bottom-right corner with a pulsing animation
3. **Click the button** to open the chatbot
4. Try these test commands:

### Test Commands

```
👋 Basic Interaction
- "Hi"
- "Hello"
- "Help"

📅 Book Appointment
- "I need to book an appointment"
- "Book appointment with a cardiologist"
- "Schedule an appointment with Dr. Sharma"
- "I want to see a pediatrician tomorrow"

👨‍⚕️ Find Doctors
- "Show me all cardiologists"
- "Find a pediatrician"
- "List available doctors"
- "Who are the orthopedic doctors?"

📋 View Appointments
- "Show my appointments"
- "What are my upcoming appointments?"
- "My appointments"

❌ Cancel Appointment
- "Cancel my appointment"
- "I want to cancel an appointment"

🔁 Reschedule
- "Reschedule my appointment"
- "Change my appointment date"
```

## Step 6: Verify Everything Works

### Backend Health Check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-12-17T..."
}
```

### Chatbot API Test (requires auth token)

First, login and get your token:

```bash
# Register/Login
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "1234567890",
    "dateOfBirth": "1990-01-01",
    "gender": "male"
  }'
```

Then test chatbot:

```bash
# Create session
curl -X POST http://localhost:5000/api/chatbot/session/new \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Send message
curl -X POST http://localhost:5000/api/chatbot/message \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "SESSION_ID_FROM_ABOVE"}'
```

## Common Issues & Solutions

### Issue 1: Chatbot button not appearing

**Solution:**
- Make sure you're logged in
- Check browser console for errors
- Verify `ChatbotButton` is imported in `App.tsx`

### Issue 2: "MongoDB connection error"

**Solution:**
- Ensure MongoDB is running: `mongod` or use MongoDB Atlas
- Check `MONGODB_URI` in `.env`
- Verify network access in MongoDB Atlas

### Issue 3: Chatbot not responding

**Solution:**
- Check backend terminal for errors
- Verify JWT token is valid (not expired)
- Open browser DevTools Network tab to see API calls

### Issue 4: Voice input not working

**Solution:**
- Use HTTPS or localhost (required for microphone access)
- Grant microphone permissions in browser
- Use Chrome/Edge (Firefox doesn't support Web Speech API)

### Issue 5: "Module not found: uuid"

**Solution:**
```bash
cd backend
npm install uuid
```

## Seeding Test Data

To test the chatbot with sample doctors:

```bash
cd backend
node seedDoctors.js
```

This will create:
- Sample doctors with various specializations
- Properly configured availability schedules
- Different fee structures

## Frontend Component Structure

```
src/
├── components/
│   ├── Chatbot.tsx              ← Main chat interface
│   ├── ChatbotButton.tsx        ← Floating action button
│   └── ui/                       ← Shadcn UI components
├── services/
│   └── api.ts                    ← API configuration
└── App.tsx                       ← Chatbot integration
```

## Backend Component Structure

```
backend/
├── models/
│   ├── Conversation.js          ← Chat history model
│   ├── User.js
│   ├── Doctor.js
│   └── Appointment.js
├── services/
│   ├── chatbotNLP.js            ← Natural language processing
│   └── chatbotService.js        ← Business logic
├── routes/
│   └── chatbot.js               ← API endpoints
└── server.js                     ← Express server
```

## Testing Scenarios

### Scenario 1: Complete Booking Flow

1. Open chatbot
2. Say: "Book appointment with cardiologist"
3. Select a doctor from the cards
4. Choose: "Tomorrow"
5. Choose time: "2:30 PM"
6. Enter reason: "Regular checkup"
7. Confirm: "Yes"

**Expected:** Appointment created successfully with confirmation message

### Scenario 2: Cancel with Refund

1. Say: "Cancel my appointment"
2. Select appointment by number
3. Confirm: "Yes"

**Expected:** Appointment cancelled with refund calculation

### Scenario 3: Search Doctors

1. Say: "Show me pediatricians"
2. Review doctor cards with ratings and fees

**Expected:** List of pediatricians displayed

### Scenario 4: Check Availability

1. Say: "Book appointment with Dr. Smith"
2. Select date: "Next Monday"
3. Review available time slots

**Expected:** List of available slots for selected date

## Advanced Configuration

### Adjusting Conversation Timeout

In `backend/models/Conversation.js`:

```javascript
// Expire inactive sessions after 24 hours
conversationSchema.index(
  { lastActivity: 1 }, 
  { expireAfterSeconds: 86400 }
);
```

### Customizing NLP Patterns

In `backend/services/chatbotNLP.js`:

```javascript
// Add your custom patterns
your_intent: {
  patterns: [/your.*regex/i],
  keywords: ['keyword1', 'keyword2']
}
```

### Modifying Appointment Limits

In `backend/models/Appointment.js`:

```javascript
// Change max future booking window
const threeMonthsFromNow = new Date();
threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3); // Change 3 to your desired months
```

## Performance Tips

1. **Enable MongoDB Indexes**
```javascript
// Already configured in models
conversationSchema.index({ userId: 1, sessionId: 1 });
```

2. **Optimize Message History**
- Limit messages per conversation
- Archive old conversations

3. **Cache Doctor Lists**
- Implement Redis caching for frequently accessed doctors

## Security Checklist

- [x] JWT authentication required
- [x] Input sanitization via Mongoose
- [x] Rate limiting enabled
- [x] CORS configured
- [x] Helmet security headers
- [ ] Add request validation middleware (recommended)
- [ ] Implement session encryption (recommended for production)

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=use_a_strong_random_secret_here
FRONTEND_URL=https://yourdomain.com
PORT=5000
```

### Build Frontend

```bash
npm run build
```

### PM2 Process Manager (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name "pulse-appoint-api"

# Monitor
pm2 status
pm2 logs pulse-appoint-api
```

## Monitoring & Debugging

### Enable Debug Logs

```javascript
// In chatbotService.js
console.log('[Chatbot Debug]', {
  intent,
  entities,
  userId,
  sessionId
});
```

### Monitor Conversation Metrics

```javascript
// Count active sessions
db.conversations.countDocuments({ isActive: true })

// View recent conversations
db.conversations.find().sort({ createdAt: -1 }).limit(10)
```

## Support

If you encounter issues:

1. Check the `CHATBOT_README.md` for detailed documentation
2. Review browser console and backend logs
3. Verify all dependencies are installed
4. Ensure MongoDB is running and accessible

## Next Steps

- Read `CHATBOT_README.md` for comprehensive feature documentation
- Explore customization options
- Add more intents and patterns
- Consider integrating OpenAI for advanced NLP

Happy chatting! 🤖✨
