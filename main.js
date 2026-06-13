const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const http = require('http'); // المكتبة السحرية عشان نضحك على ريندر

// 1️⃣ فتح سيرفر وهمي عشان Render يشوف بورت مفتوح ويرتاح نفسياً
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running successfully!');
});

// Render تلقائياً بيرسل رقم البورت في الـ Environment، وإذا ما لقاه بنفتح بورت 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Render Trick] Dummy server is listening on port ${PORT}`);
});

// 2️⃣ إعدادات البوت الأساسية وتفعيل كافة الـ Intents المطلوبة
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

const PREFIX = '.'; // أمر النقطة

client.on('ready', () => {
    console.log(`تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // تجاهل الرسائل التي لا تبدأ بالنقطة أو الصادرة من بوتات
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    // 🔒 نظام الأمان الصارم باستخدام الـ ID الخاص بك مباشرة
    const OWNER_ID = '1515394889855275281'; 
    if (message.author.id !== OWNER_ID) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args[0].toLowerCase();

    // 1️⃣ أمر التبنيد الجماعي المخفي: .banall 50 أو .banall 100
    if (command === 'banall') {
        const count = parseInt(args[1]);
        if (isNaN(count) || count <= 0) return; // تجاهل الأمر لو لم يتم تحديد رقم صحيح

        try {
            await message.delete(); // حذف رسالة الأمر فوراً لإخفائه
        } catch (err) {
            console.error("لم يتمكن البوت من حذف الرسالة (نقص صلاحيات):", err);
        }

        try {
            // جلب كافة أعضاء السيرفر وتحديث الكاش
            const members = await message.guild.members.fetch();
            
            // فلترة الأعضاء: ليس بوت، وليس لديه رتب إضافية (رتبة @everyone فقط لحماية الحقيقيين)
            const targets = members.filter(m => !m.user.bot && m.roles.cache.size <= 1).first(count);

            if (targets.length === 0) return;

            // تنفيذ التبنيد حبة حبة بالـ Delay المطلوبة (20 ثانية) عشان الأمان الكامل
            for (const member of targets) {
                try {
                    await member.ban({ reason: 'تنظيف الحسابات غير القانونية والمخالفة' });
                    console.log(`تم بنجاح تبنيد العضو: ${member.user.tag}`);
                    
                    // الانتظار لمدة 20 ثانية قبل الانتقال للعضو التالي لمنع الـ Rate Limit تماماً
                    await new Promise(resolve => setTimeout(resolve, 20000)); 
                } catch (banError) {
                    console.error(`فشل تبنيد ${member.user.tag}:`, banError);
                }
            }
        } catch (fetchError) {
            console.error("حدث خطأ أثناء جلب الأعضاء:", fetchError);
        }
    }

    // 2️⃣ أمر حذف الكاتيجوري وكل الرومات اللي جواتها: .delcat ID_الكاتيجوري
    if (command === 'delcat') {
        const categoryId = args[1];
        if (!categoryId) return;

        try {
            await message.delete(); // حذف رسالة الأمر فوراً
        } catch (err) {
            console.error("لم يتمكن البوت من حذف الرسالة:", err);
        }

        try {
            const category = message.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) return;

            // جلب كافة الرومات التابعة لهذه الكاتيجوري
            const children = category.children.cache;

            // مسح الرومات الداخلية أولاً
            for (const [id, channel] of children) {
                try {
                    await channel.delete();
                    await new Promise(resolve => setTimeout(resolve, 1000)); // ديلاي ثانية بين الرومات
                } catch (chanErr) {
                    console.error(`فشل حذف الروم ${channel.name}:`, chanErr);
                }
            }

            // مسح الكاتيجوري نفسها بعد تفريغها
            await category.delete();
            console.log(`تم حذف الكاتيجوري ${category.name} بالكامل بنجاح.`);

        } catch (catError) {
            console.error("حدث خطأ أثناء حذف الكاتيجوري:", catError);
        }
    }
});

// البوت يقرأ التوكن تلقائياً من الـ Environment Variables في ريندر
client.login(process.env.TOKEN);
