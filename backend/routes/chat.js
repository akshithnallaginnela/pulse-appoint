const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini AI with error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
    apiVersion: 'v1',  // Explicitly set API version to v1
});

// Context for the chatbot to stay focused on the application
const SYSTEM_CONTEXT = `You are a helpful assistant for the PulseAppoint medical appointment booking application. 
Your name is PulseAssist and you can only help with queries related to:
1. How to book appointments
2. How to find doctors
3. How to manage appointments (cancel, reschedule)
4. General navigation of the website
5. Basic health appointment related questions

If users ask questions unrelated to the application or medical appointments, politely redirect them to discuss application-related queries only.

Key features of PulseAppoint:
- Book appointments with doctors
- View doctor profiles and specializations
- Manage appointments (view, cancel, reschedule)
- View upcoming appointments
- Search for doctors by specialization

Always be polite, professional, and healthcare-focused in your responses.`;

router.post('/', async (req, res) => {
  console.log('Received chat request');
  
  try {
    const { message } = req.body;
    console.log('Received message:', message);

    if (!message) {
      console.log('No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!genAI) {
      console.error('Gemini AI not initialized');
      return res.status(500).json({ error: 'Chat service is not properly configured' });
    }

    console.log('Initializing chat with API key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
    
    try {
      console.log('Initializing model...');
      const model = genAI.getGenerativeModel({ 
        model: "models/gemini-pro",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });

      console.log('Sending request to Gemini API...');
      const prompt = [{
        text: `${SYSTEM_CONTEXT}\n\nUser: ${message}\nAssistant:`
      }];
      
      const result = await model.generateContent({
        contents: prompt
      });

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

        res.json({ response: responseText });
      } catch (error) {
        console.error('Error processing response:', error);
        return res.status(500).json({ 
          error: 'Failed to process AI response',
          details: error.message 
        });
      }
    } catch (generationError) {
      console.error('AI generation error:', generationError);
      res.status(500).json({ 
        error: 'Failed to generate response',
        details: process.env.NODE_ENV === 'development' ? generationError.message : undefined
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;