const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// سحب مفتاح جيميناي بأمان من البيئة
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// استخدام الموديل المستقر والأحدث لعام 2026 لمنع أخطاء السيرفر القديم
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const memoryPath = path.join(__dirname, 'memory.json');

// دالة لقراءة الذاكرة المحفوظة للأعضاء
function loadMemory() {
    try {
        if (fs.existsSync(memoryPath)) {
            return JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
        }
    } catch (e) {
        console.error("خطأ في قراءة ملف الذاكرة:", e);
    }
    return {};
}

// دالة لحفظ الذاكرة في ملف الـ JSON
function saveMemory(memory) {
    try {
        fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf8');
    } catch (e) {
        console.error("خطأ في الكتابة داخل ملف الذاكرة:", e);
    }
}

// الدالة الأساسية لتوليد الردود وحفظ السياق لكل مستخدم منفصل
async function getAIResponseWithMemory(userId, userMessage) {
    let memory = loadMemory();

    // إذا كان العضو يتكلم أول مرة، نفتح له سجل خاص به
    if (!memory[userId]) {
        memory[userId] = [];
    }

    // إضافة رسالة العضو الحالية للسجل الخاص به
    memory[userId].push({ role: "user", parts: [{ text: userMessage }] });

    // تحديد الحد الأقصى بـ 10 رسائل فقط لكل عضو عشان السيرفر يظل خفيف ولا يعلق
    if (memory[userId].length > 10) {
        memory[userId] = memory[userId].slice(-10);
    }

    try {
        // تشغيل نظام المحادثة مع تمرير التاريخ القديم الخاص بهذا العضو فقط
        const chat = aiModel.startChat({
            history: memory[userId].slice(0, -1)
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();

        // إضافة رد الذكاء الاصطناعي لسجل العضو وحفظه بالملف
        memory[userId].push({ role: "model", parts: [{ text: responseText }] });
        saveMemory(memory);

        return responseText;
    } catch (error) {
        console.error(`خطأ جيميناي مع العضو ${userId}:`, error);
        
        // في حال حدوث أي لخبطة بالذاكرة، نصفر سجل العضو هذا فوراً لإنقاذ المحادثة ونرد عليه مباشرة
        delete memory[userId];
        saveMemory(memory);
        
        try {
            const fallbackResult = await aiModel.generateContent(userMessage);
            return fallbackResult.response.text();
        } catch (err) {
            return "⚠️ حصل ضغط خفيف على السيرفر، جرب ترسل رسالتك مرة ثانية يا غالي!";
        }
    }
}

module.exports = { getAIResponseWithMemory };
