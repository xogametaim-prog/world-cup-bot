const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.AI_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
});

// ذاكرة مؤقتة داخل الرام
const memory = new Map();

// عدد الرسائل المحفوظة لكل مستخدم
const MAX_HISTORY = 12;

async function generateAIResponse(userId, userMessage) {
    try {
        if (!process.env.AI_KEY) {
            throw new Error("AI_KEY is missing");
        }

        // إنشاء سجل للمستخدم إذا لم يكن موجوداً
        if (!memory.has(userId)) {
            memory.set(userId, []);
        }

        const history = memory.get(userId);

        // بناء السياق
        let context = "";

        if (history.length > 0) {
            context =
                "هذه هي المحادثة السابقة بين المستخدم والمساعد:\n\n";

            for (const msg of history) {
                context += `${msg.role}: ${msg.content}\n`;
            }

            context += "\n";
        }

        context += `user: ${userMessage}\nassistant:`;

        // إرسال الطلب إلى Gemini
        const result = await model.generateContent(context);

        const response =
            result.response.text()?.trim() ||
            "لم أتمكن من إنشاء رد حالياً.";

        // حفظ رسالة المستخدم
        history.push({
            role: "user",
            content: userMessage
        });

        // حفظ رد البوت
        history.push({
            role: "assistant",
            content: response
        });

        // الاحتفاظ بآخر 12 رسالة فقط
        if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
        }

        memory.set(userId, history);

        return response;

    } catch (error) {
        console.error("Gemini Error:", error);

        return "⚠️ حصلت مشكلة في الاتصال بالذكاء الاصطناعي، تأكد من صحة الـ AI_KEY داخل Render يا غالي!";
    }
}

module.exports = {
    generateAIResponse
};