// ==================== gemini.js ====================
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.AI_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const userChats = new Map();

async function getAIResponseWithMemory(userId, userMessage) {
    try {
        if (!userChats.has(userId)) {
            userChats.set(userId, []);
        }

        let history = userChats.get(userId);
        let promptContext = "أنت بوت ذكي في سيرفر ديسكورد. هذه هي المحادثة السابقة مع العضو:\n";
        
        history.forEach(chat => {
            promptContext += `${chat.role}: ${chat.text}\n`;
        });
        
        promptContext += `المستخدم: ${userMessage}\nالبوت:`;

        const result = await aiModel.generateContent(promptContext);
        const responseText = result.response.text();

        history.push({ role: "المستخدم", text: userMessage });
        history.push({ role: "البوت", text: responseText });

        if (history.length > 12) {
            history = history.slice(-12);
        }
        userChats.set(userId, history);

        return responseText;

    } catch (error) {
        console.error("خطأ الذكاء الاصطناعي:", error);
        try {
            const fallback = await aiModel.generateContent(userMessage);
            return fallback.response.text();
        } catch (err) {
            return "⚠️ حصلت مشكلة في الاتصال، تأكد من صحة المفتاح في Render تحت اسم الاختصار الجديد AI_KEY !";
        }
    }
}

module.exports = { getAIResponseWithMemory };