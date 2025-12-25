# AI Chatbot Setup Guide

## Prerequisites

- Node.js 16+ installed
- MongoDB running
- Google Gemini API key

## Step 1: Get Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Step 2: Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create or edit `.env` file:
   ```bash
   # Add this line to your .env file
   GEMINI_API_KEY=your_api_key_here
   ```

3. Replace `your_api_key_here` with your actual API key

## Step 3: Install Dependencies

The required dependencies are already in `package.json`:
- `@google/generative-ai` - Google Gemini AI SDK
- `uuid` - For generating session IDs

If you need to reinstall:
```bash
npm install
```

## Step 4: Start the Backend

```bash
npm run dev
```

The server should start on `http://localhost:5000`

## Step 5: Start the Frontend

In a new terminal:

```bash
cd ..  # Go back to root directory
npm run dev
```

The frontend should start on `http://localhost:5173`

## Step 6: Test the Chatbot

1. Open your browser to `http://localhost:5173`
2. Log in to your account
3. Click the blue floating button in the bottom-right corner
4. Start chatting!

## Verification

### Check Backend Logs

You should see:
```
Server is running on port 5000
MongoDB connected successfully
```

### Check Frontend

- The chatbot button should appear in the bottom-right
- Clicking it should open the chatbot window
- The chatbot should greet you

### Test AI Integration

Send a message like "Hello" - you should get an intelligent response.

If you see fallback responses instead of AI responses, check:
1. Your API key is correct in `.env`
2. You restarted the backend after adding the API key
3. You have internet connectivity

## Troubleshooting

### "GEMINI_API_KEY not found" Warning

**Problem:** The backend can't find your API key

**Solution:**
1. Check `.env` file exists in `backend/` directory
2. Verify the key is named exactly `GEMINI_API_KEY`
3. Restart the backend server

### Chatbot shows fallback responses

**Problem:** AI integration not working

**Solution:**
1. Verify your API key is valid
2. Check you have internet connection
3. Check Google AI Studio for API quota/limits
4. Look for errors in backend console

### "Error processing message"

**Problem:** Backend error

**Solution:**
1. Check backend console for detailed error
2. Verify MongoDB is running
3. Check all required models exist
4. Restart backend server

### Voice input not working

**Problem:** Browser doesn't support speech recognition

**Solution:**
- Use Chrome or Edge browser
- Allow microphone permissions
- Check microphone is working

## API Endpoints

### POST /api/chatbot/session/new
Create a new conversation session

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "message": "New session created successfully"
}
```

### POST /api/chatbot/message
Send a message to the chatbot

**Request:**
```json
{
  "message": "Find a cardiologist",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "response": "I found 3 cardiologists...",
  "suggestions": ["Book Appointment", "Check Availability"],
  "doctorCards": [...],
  "appointments": []
}
```

### GET /api/chatbot/session/:sessionId
Get conversation history

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "messages": [...]
}
```

### DELETE /api/chatbot/session/:sessionId
End a conversation session

**Response:**
```json
{
  "success": true,
  "message": "Session ended successfully"
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT secret for authentication |
| `PORT` | No | Server port (default: 5000) |

## Free Tier Limits

Google Gemini API free tier includes:
- 60 requests per minute
- 1,500 requests per day

For production use, consider upgrading to a paid plan.

## Security Notes

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Keep API key secret** - Don't share or expose it
3. **Use environment variables** - Never hardcode keys
4. **Rotate keys regularly** - Generate new keys periodically

## Next Steps

- Customize the system prompt in `geminiService.js`
- Add more intents and entity types
- Implement appointment booking flow
- Add conversation analytics
- Set up monitoring and logging

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review backend console logs
3. Check browser console for frontend errors
4. Verify all environment variables are set

---

**Happy chatting! 🤖**
