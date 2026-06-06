// ==================== gemini.js ====================
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const chatSessions = new Map();

async function getAIResponse(userMessage, userId) {
  try {
    if (!chatSessions.has(userId)) {
      const chat = aiModel.startChat({
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.8
        }
      });
      chatSessions.set(userId, chat);
    }

    const chat = chatSessions.get(userId);
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();
    
    return response;
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    return null;
  }
}

function clearChatHistory(userId) {
  chatSessions.delete(userId);
}

module.exports = { getAIResponse, clearChatHistory };