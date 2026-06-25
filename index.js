const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType,
    REST,
    Routes,
    MessageFlags
} = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Ticket & Log Bot Active!'));
app.listen(PORT, '0.0.0.0', () => console.log(`Server connected to port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// الاختصارات الأساسية والمحدثة بالكامل
const TICKET_PREFIX = '-st'; 
const EMBED_PREFIX = '-em';  
const LOG_PREFIX = '-lg';    
const DM_PREFIX = '-dm';     

const LOG_DM_PREFIX = '-lgdm';         // لوج برودكاست الخاص
const LOG_FEEDBACK_PREFIX = '-lgfeedback'; // لوج التقييمات
const LOG_EMBED_PREFIX = '-lgem';     // لوج من عمل إمبد
const STOP_DM_PREFIX = '-sdm';         // إيقاف البرودكاست
const DM_ANYONE_PREFIX = '-dmanyone';   // فحص عمليات الإرسال النشطة

const tempSetup = new Map();
const embedSetup = new Map();
const dmSetup = new Map();

// تخزين معرفات قنوات اللوج المختلفة
let logChannelId = null;        // -lg
let logDmChannelId = null;      // -lgdm
let logFeedbackChannelId = null; // -lgfeedback
let logEmbedChannelId = null;   // -lgem

// لتتبع وإدارة عمليات البرودكاست النشطة وإمكانية إيقافها
let activeBroadcast = null; 

// ==================== إعدادات نظام التذاكر المطور والمستقر ====================
const TICKET_CONFIG = {
    categoryID: 'ايدي_قسم_التذاكر_هنا', 

    mainEmbedImage: 'https://i.imgur.com/ضع_رابط_صورة_البوكس_الرئيسي_هنا.png', 
    ticketEmbedImage: 'https://i.imgur.com/ضع_رابط_صورة_التذكرة_الداخلية_هنا.png',

    options: [
        {
            value: 'option_1',
            label: 'الدعم الفني والتقني',
            description: 'للمشاكل البرمجية والتقنية داخل السيرفر',
            emoji: '🛠️',
            roleId: 'ايدي_رتبة_القسم_1_هنا', 
        },
        {
            value: 'option_2',
            label: 'الاستفسارات العامة',
            description: 'لأي سؤال عام تود طرحه على الإدارة',
            emoji: '❓',
            roleId: 'ايدي_رتبة_القسم_2_هنا', 
        },
        {
            value: 'option_3',
            label: 'الشكاوى والبلاغات',
            description: 'لتقديم شكوى ضد عضو أو الإبلاغ عن مشكلة',
            emoji: '⚠️',
            roleId: 'ايدي_رتبة_القسم_3_هنا', 
        },
        {
            value: 'option_4',
            label: 'المبيعات والاشتراكات',
            description: 'للاستفسار عن الأسعار أو الشراء المباشر',
            emoji: '💰',
            roleId: 'ايدي_رتبة_القسم_4_هنا', 
        },
        {
            value: 'option_5',
            label: 'الإدارة العليا',
            description: 'للتواصل المباشر والحالات الخاصة جداً',
            emoji: '👑',
            roleId: 'ايدي_رتبة_القسم_5_هنا', 
        }
    ]
};
// ====================================================================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const commands = [
        {
            name: 'setup-ticket',
            description: 'إنشاء رسالة نظام التذاكر بالقائمة المنسدلة'
        }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Slash commands registered successfully.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

async function sendTicketSetup(channel) {
    const embed = new EmbedBuilder()
        .setTitle('الدعم الفني والخدمات | Support Portal')
        .setDescription('يرجى تحديد القسم المناسب لمشكلتك من القائمة المنسدلة أدناه لفتح تذكرة مباشرة مع الطاقم المختص.')
        .setColor('#2b2d31');

    if (TICKET_CONFIG.mainEmbedImage && TICKET_CONFIG.mainEmbedImage.startsWith('http')) {
        embed.setImage(TICKET_CONFIG.mainEmbedImage);
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_menu_select')
        .setPlaceholder('الرجاء اختيار قسم لفتح التذكرة...')
        .addOptions(
            TICKET_CONFIG.options.map(opt => 
                new StringSelectMenuOptionBuilder()
                    .setValue(opt.value)
                    .setLabel(opt.label)
                    .setDescription(opt.description)
                    .setEmoji(opt.emoji)
            )
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await channel.send({ embeds: [embed], components: [row] });
}

// دالة إرسال لوج التكت المعتاد
async function sendTicketLog(guild, channelName, creatorId, claimerId, closerUser) {
    if (!logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const creator = guild.members.cache.get(creatorId);
    const claimer = claimerId ? guild.members.cache.get(claimerId) : 'لا يوجد (لم تُستلم التذكرة)';

    const logEmbed = new EmbedBuilder()
        .setTitle('📂 سجل إغلاق تذكرة | Ticket Logs')
        .setColor('#e74c3c')
        .addFields(
            { name: '📝 اسم التذكرة', value: `\`${channelName}\``, inline: true },
            { name: '👤 منشئ التذكرة', value: creator ? `${creator}` : `\`أيدي: ${creatorId}\``, inline: true },
            { name: '🙋‍♂️ الإداري المستلم', value: claimerId ? `${claimer}` : '`لم يتم الاستلام`', inline: true },
            { name: '🔒 مغلق التذكرة', value: `${closerUser}`, inline: true }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error(err);
    }
}

// دالة إرسال لوج التقييمات المستلمة
async function sendRatingLog(guild, creator, rating, claimerName) {
    if (!logFeedbackChannelId) return;
    const logChannel = guild.channels.cache.get(logFeedbackChannelId);
    if (!logChannel) return;

    const ratingStars = '⭐'.repeat(rating);

    const embed = new EmbedBuilder()
        .setTitle('⭐ تقييم دعم فني جديد')
        .setColor('#f1c40f')
        .addFields(
            { name: '👤 العضو المقيم', value: `${creator}`, inline: true },
            { name: '🙋‍♂️ الإداري المسؤول', value: `\`${claimerName}\``, inline: true },
            { name: '📊 التقييم المستلم', value: `${ratingStars} (${rating}/5)`, inline: true }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error(err);
    }
}

// دالة إرسال تقرير اللوج الخاص ببرودكاست الخاص -dm
async function sendDmLog(guild, sender, title, totalCount, successCount, failedCount, isStopped = false) {
    if (!logDmChannelId) return;
    const logChannel = guild.channels.cache.get(logDmChannelId);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle(isStopped ? '🚫 تم إيقاف برودكاست الخاص يدوياً' : '📢 سجل إرسال برودكاست خاص - DM Log')
        .setColor(isStopped ? '#e67e22' : '#3498db')
        .addFields(
            { name: '👤 المرسل الإداري', value: `${sender}`, inline: true },
            { name: '📝 عنوان الرسالة', value: `\`${title}\``, inline: true },
            { name: '📊 الإجمالي المستهدف', value: `\`${totalCount}\` عضو`, inline: true },
            { name: '✅ تم الإرسال بنجاح', value: `\`${successCount}\` عضو`, inline: true },
            { name: '❌ فشل الإرسال (الخاص مغلق)', value: `\`${failedCount}\` عضو`, inline: true }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error(err);
    }
}

// دالة إرسال اللوج الخاص بمن صمم ونشر إمبد مخصص -em
async function sendEmbedLog(guild, sender, title, description, channel) {
    if (!logEmbedChannelId) return;
    const logChannel = guild.channels.cache.get(logEmbedChannelId);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle('📝 سجل تصميم ونشر إمبد مخصص')
        .setColor('#9b59b6')
        .addFields(
            { name: '👤 المصمم المسؤول', value: `${sender}`, inline: true },
            { name: '📍 قناة النشر', value: `${channel}`, inline: true },
            { name: 'عنوان الإمبد', value: `\`${title}\``, inline: false },
            { name: 'وصف الإمبد', value: `\`\`\`${description}\`\`\``, inline: false }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error(err);
    }
}

async function startEmbedSetup(channel, user) {
    const member = channel.guild.members.cache.get(user.id);
    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        return channel.send('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
    }

    const embedState = { step: 1, title: null, description: null, buttonLabel: null, messagesToDelete: [] };
    embedSetup.set(user.id, embedState);

    const prompt1 = await channel.send(`${user}, 📝 **بدء إعداد إمبد مخصص**\n\n**الخطوة [1/3]:** يرجى كتابة **عنوان (Title)** الإمبد:`);
    embedState.messagesToDelete.push(prompt1.id);
}

// دالة مساعدة لربط قنوات اللوج المختلفة بسهولة وبشكل نظيف
async function handleLogSetup(message, prefix, logVarName, logName) {
    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const channelMention = message.mentions.channels.first();
    const inputId = args[0];

    const targetChannel = channelMention || message.guild.channels.cache.get(inputId);

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return message.reply(`❌ يرجى منشن قناة نصية صحيحة أو وضع الأيدي الخاص بها لتكون قناة سجلات ${logName}:`);
    }

    if (logVarName === 'logChannelId') logChannelId = targetChannel.id;
    if (logVarName === 'logDmChannelId') logDmChannelId = targetChannel.id;
    if (logVarName === 'logFeedbackChannelId') logFeedbackChannelId = targetChannel.id;
    if (logVarName === 'logEmbedChannelId') logEmbedChannelId = targetChannel.id;

    await message.reply(`✅ **تم بنجاح ربط وتعيين قناة سجلات [${logName}] على: ${targetChannel}**`);
    await message.delete().catch(() => {});
}

// التعامل مع الرسائل والاختصارات
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // 1. ربط قنوات اللوج الأربعة المخصصة والمستقلة
    if (message.content.startsWith(LOG_DM_PREFIX)) {
        return handleLogSetup(message, LOG_DM_PREFIX, 'logDmChannelId', 'الرسائل الخاصة - DM');
    }
    if (message.content.startsWith(LOG_FEEDBACK_PREFIX)) {
        return handleLogSetup(message, LOG_FEEDBACK_PREFIX, 'logFeedbackChannelId', 'التقييمات - Feedback');
    }
    if (message.content.startsWith(LOG_EMBED_PREFIX)) {
        return handleLogSetup(message, LOG_EMBED_PREFIX, 'logEmbedChannelId', 'نشر الإمبد - Embed');
    }
    if (message.content.startsWith(LOG_PREFIX)) {
        return handleLogSetup(message, LOG_PREFIX, 'logChannelId', 'سجل التذاكر - Tickets');
    }

    // 2. إيقاف عملية البرودكاست النشطة فوراً يدوياً -sdm
    if (message.content.trim() === STOP_DM_PREFIX) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
        }

        if (!activeBroadcast) {
            return message.reply('❌ لا توجد أي عملية إرسال برودكاست (DM Broadcast) نشطة حالياً لإيقافها.');
        }

        clearInterval(activeBroadcast.interval);
        activeBroadcast.isStopped = true;

        await message.reply('🚫 **تم إيقاف عملية الإرسال بالخاص يدوياً وقطع الاتصال فوراً!**');
        
        // إرسال اللوج النهائي المفصل بالتقارير الموقوفة لقناة سجل برودكاست الخاص
        await sendDmLog(
            message.guild, 
            activeBroadcast.sender, 
            activeBroadcast.title, 
            activeBroadcast.totalCount, 
            activeBroadcast.sentCount, 
            activeBroadcast.failedCount, 
            true
        );

        activeBroadcast = null;
        await message.delete().catch(() => {});
        return;
    }

    // 3. فحص ومراقبة عمليات الإرسال النشطة لمنع التداخل -dmanyone
    if (message.content.trim() === DM_ANYONE_PREFIX) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
        }

        if (activeBroadcast) {
            return message.reply(`📊 **يوجد عملية برودكاست نشطة حالياً!**\n\n👤 الإداري المرسل: ${activeBroadcast.sender}\n📝 عنوان الإرسال: \`${activeBroadcast.title}\`\n📈 نسبة التقدم الحالية: \`${activeBroadcast.sentCount + activeBroadcast.failedCount}/${activeBroadcast.totalCount}\` عضو.`);
        } else {
            return message.reply('✅ لا توجد أي عملية إرسال نشطة بالخاص حالياً في السيرفر من أي إداري.');
        }
    }

    // 4. الاختصار -st لإعداد البوكس التفاعلي
    if (message.content.trim() === TICKET_PREFIX) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
        }
        try {
            await sendTicketSetup(message.channel);
            await message.delete().catch(() => {});
        } catch (err) {
            console.error(err);
        }
        return;
    }

    // 5. الاختصار -em للإمبد المخصص
    if (message.content.trim() === EMBED_PREFIX) {
        try {
            await startEmbedSetup(message.channel, message.author);
            await message.delete().catch(() => {});
        } catch (err) {
            console.error(err);
        }
        return;
    }

    // 6. الاختصار -dm لبرودكاست الخاص الذكي والآمن
    if (message.content.trim() === DM_PREFIX) {
        const member = message.member;
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
        }

        if (activeBroadcast) {
            return message.reply(`❌ لا يمكنك بدء برودكاست جديد؛ لأن هناك عملية إرسال نشطة ومستمرة حالياً بواسطة المشرف: ${activeBroadcast.sender}`);
        }

        const dmState = { step: 1, title: null, description: null, imageUrl: null, messagesToDelete: [] };
        dmSetup.set(message.author.id, dmState);

        const prompt1 = await message.channel.send(`${message.author}, 📢 **بدء إعداد برودكاست الخاص الآمن**\n\n**الخطوة [1/3]:** يرجى كتابة **عنوان** رسالة البرودكاست:`);
        dmState.messagesToDelete.push(message.id, prompt1.id);
        return;
    }

    // تتبع خطوات إعداد إمبد -em والمسح التلقائي عند الانتهاء
    if (embedSetup.has(message.author.id)) {
        const state = embedSetup.get(message.author.id);
        state.messagesToDelete.push(message.id);

        if (state.step === 1) {
            state.title = message.content.trim();
            state.step = 2;
            const prompt2 = await message.reply(`✅ تم حفظ العنوان.\n\n**الخطوة [2/3]:** يرجى كتابة **وصف (Description)** الإمبد:`);
            state.messagesToDelete.push(prompt2.id);
            return;
        }

        if (state.step === 2) {
            state.description = message.content.trim();
            state.step = 3;
            const prompt3 = await message.reply(`✅ تم حفظ الوصف.\n\n**الخطوة [3/3] الأخيرة:** يرجى كتابة **النص المكتوب على الزر**:`);
            state.messagesToDelete.push(prompt3.id);
            return;
        }

        if (state.step === 3) {
            state.buttonLabel = message.content.trim();

            const customEmbed = new EmbedBuilder()
                .setTitle(state.title)
                .setDescription(state.description)
                .setColor('#5865F2');

            const customButton = new ButtonBuilder()
                .setCustomId('general_embed_button_action')
                .setLabel(state.buttonLabel)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫');

            const row = new ActionRowBuilder().addComponents(customButton);

            await message.channel.send({ embeds: [customEmbed], components: [row] });
            
            // إرسال تقرير اللوج الخاص بتصميم الإمبد ونشره
            await sendEmbedLog(message.guild, message.author, state.title, state.description, message.channel);

            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            embedSetup.delete(message.author.id);
            return;
        }
    }

    // تتبع خطوات إعداد برودكاست الخاص -dm مع نظام الإرسال التدريجي والآمن
    if (dmSetup.has(message.author.id)) {
        const state = dmSetup.get(message.author.id);
        state.messagesToDelete.push(message.id);

        if (state.step === 1) {
            state.title = message.content.trim();
            state.step = 2;
            const prompt2 = await message.reply(`✅ تم حفظ العنوان.\n\n**الخطوة [2/3]:** يرجى كتابة **محتوى (الوصف)** رسالة البرودكاست:`);
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

            const broadcastEmbed = new EmbedBuilder()
                .setTitle(state.title)
                .setDescription(state.description)
                .setColor('#5865F2')
                .setTimestamp();

            if (state.imageUrl) {
                broadcastEmbed.setImage(state.imageUrl);
            }

            const statusMsg = await message.channel.send('⏳ **جاري بدء عملية البرودكاست التدريجي والآمن لتجنب البان...**');

            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            const members = await message.guild.members.fetch();
            const memberArray = Array.from(members.values()).filter(m => !m.user.bot);

            // تفعيل نظام الإدارة والتحكم في البرودكاست ليكون متاحاً للإيقاف بـ -sdm
            activeBroadcast = {
                sender: message.author,
                title: state.title,
                totalCount: memberArray.length,
                sentCount: 0,
                failedCount: 0,
                isStopped: false,
                interval: null
            };

            let index = 0;

            activeBroadcast.interval = setInterval(async () => {
                // إذا تم طلب إيقاف البرودكاست يدوياً عبر -sdm
                if (!activeBroadcast || activeBroadcast.isStopped) {
                    clearInterval(activeBroadcast?.interval);
                    return;
                }

                if (index >= memberArray.length) {
                    clearInterval(activeBroadcast.interval);
                    await statusMsg.edit(`✅ **اكتمل البرودكاست بنجاح!**\n\n📬 تم الإرسال إلى: \`${activeBroadcast.sentCount}\` عضو.\n❌ فشل الإرسال لـ: \`${activeBroadcast.failedCount}\` عضو.`);
                    
                    // إرسال اللوج النهائي والتقرير لقناة سجل برودكاست الخاص
                    await sendDmLog(message.guild, activeBroadcast.sender, activeBroadcast.title, activeBroadcast.totalCount, activeBroadcast.sentCount, activeBroadcast.failedCount);
                    activeBroadcast = null;
                    return;
                }

                const targetMember = memberArray[index];
                try {
                    await targetMember.send({ embeds: [broadcastEmbed] });
                    activeBroadcast.sentCount++;
                } catch (err) {
                    activeBroadcast.failedCount++;
                }

                await statusMsg.edit(`⏳ **جاري الإرسال التدريجي لجميع الأعضاء...**\n\n📊 التقدم: \`${index + 1}/${memberArray.length}\` عضو.\n✅ تم الإرسال: \`${activeBroadcast.sentCount}\` | ❌ فشل: \`${activeBroadcast.failedCount}\``);
                index++;
            }, 3000); // 3 ثوانٍ لحماية البوت من حظر شركة ديسكورد

            dmSetup.delete(message.author.id);
            return;
        }
    }

    // أمر استدعاء العضو داخل التكت المفتوح !ping
    if (message.content.trim().toLowerCase() === '!ping') {
        const topic = message.channel.topic || '';
        if (topic.includes('creator_id:')) {
            const creatorPart = topic.split('creator_id:')[1];
            const creatorId = creatorPart ? creatorPart.split(';')[0] : null;
            if (creatorId) {
                const member = message.guild.members.cache.get(creatorId);
                if (member) {
                    return message.channel.send(`🔔 تنبيه للعضو: ${member}، يرجى مراجعة التذكرة لمتابعة الرد مع الإدارة.`);
                }
            }
        }
    }
});

// التعامل مع السلاش والتفاعلات وقواعد التذاكر المتعددة
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup-ticket') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'عذراً، هذا الأمر مخصص للإداريين فقط.', flags: MessageFlags.Ephemeral });
            }
            await interaction.reply({ content: 'تم إرسال نظام التذاكر بنجاح!', flags: MessageFlags.Ephemeral });
            await sendTicketSetup(interaction.channel);
        }
    }

    // فتح تذكرة عند اختيار خيار من القائمة
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_menu_select') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const guild = interaction.guild;
            const member = interaction.member;

            const existingChannel = guild.channels.cache.find(c => c.name.startsWith('ticket-') && c.name.endsWith(member.user.username));
            if (existingChannel) {
                return interaction.editReply({ content: `❌ لا يمكنك فتح تذكرة جديدة؛ لأن لديك تذكرة مفتوحة بالفعل وهي: ${existingChannel}` });
            }

            const selectedValue = interaction.values[0];
            const selectedOption = TICKET_CONFIG.options.find(opt => opt.value === selectedValue);

            if (!selectedOption) {
                return interaction.editReply({ content: 'عذراً، حدث خطأ في معالجة طلبك.' });
            }

            const permissionOverwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ];

            const targetRole = guild.roles.cache.get(selectedOption.roleId);
            if (targetRole) {
                permissionOverwrites.push({
                    id: targetRole.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                });
            }

            try {
                const parentId = guild.channels.cache.get(TICKET_CONFIG.categoryID) ? TICKET_CONFIG.categoryID : null;
                const channel = await guild.channels.create({
                    name: `ticket-${selectedOption.value}-${member.user.username}`,
                    type: ChannelType.GuildText,
                    parent: parentId,
                    permissionOverwrites: permissionOverwrites
                });

                await channel.setTopic(`creator_id:${member.id}`);

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`تذكرة جديدة - ${selectedOption.label}`)
                    .setDescription(`مرحباً بك ${member}، تم فتح التذكرة الخاصة بك في قسم **${selectedOption.label}**.\n\nيرجى كتابة استفسارك هنا وانتظار استلام أحد أفراد الطاقم للمتابعة معك.`)
                    .setColor('#5865F2')
                    .setTimestamp();

                if (TICKET_CONFIG.ticketEmbedImage && TICKET_CONFIG.ticketEmbedImage.startsWith('http')) {
                    welcomeEmbed.setImage(TICKET_CONFIG.ticketEmbedImage);
                }

                const claimButton = new ButtonBuilder()
                    .setCustomId(`claim_ticket_${selectedOption.value}`)
                    .setLabel('استلام التذكرة')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🙋‍♂️');

                const closeButton = new ButtonBuilder()
                    .setCustomId(`close_ticket_${selectedOption.value}`)
                    .setLabel('إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');

                const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

                const supportRoleMention = targetRole ? `<@&${targetRole.id}>` : '';
                await channel.send({ 
                    content: `${member} ${supportRoleMention}`, 
                    embeds: [welcomeEmbed], 
                    components: [row] 
                });

                await interaction.editReply({ content: `تم إنشاء تذكرتك بنجاح في القناة: ${channel}` });

            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: 'حدث خطأ أثناء محاولة إنشاء التذكرة.' });
            }
        }
    }

    // تفاعل الأزرار
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // زر استلام التذكرة
        if (customId.startsWith('claim_ticket_')) {
            const optionValue = customId.replace('claim_ticket_', '');
            const selectedOption = TICKET_CONFIG.options.find(opt => opt.value === optionValue);

            if (!selectedOption) return;

            const member = interaction.member;
            const targetRole = interaction.guild.roles.cache.get(selectedOption.roleId);
            const hasRequiredRole = (targetRole && member.roles.cache.has(targetRole.id)) || member.permissions.has(PermissionFlagsBits.Administrator);

            if (!hasRequiredRole) {
                return interaction.reply({ content: '❌ لا يمكنك استلام هذه التذكرة لأنك لا تملك الرتبة المخصصة للتحكم فيها!', flags: MessageFlags.Ephemeral });
            }

            await interaction.deferUpdate();

            const topic = interaction.channel.topic || '';
            const creatorId = topic.split('creator_id:')[1]?.split(';')[0] || '';
            
            await interaction.channel.setTopic(`creator_id:${creatorId};claimed_by:${member.id};claimer_name:${member.user.username}`);

            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .addFields({ name: 'المشرف المستلم', value: `👤 تم الاستلام بواسطة: ${member}` });

            const disabledClaimButton = new ButtonBuilder()
                .setCustomId('claimed_disabled_btn')
                .setLabel(`مستلمة بواسطة ${member.user.username}`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true);

            const closeButton = new ButtonBuilder()
                .setCustomId(`close_ticket_${optionValue}`)
                .setLabel('إغلاق التذكرة')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');

            const row = new ActionRowBuilder().addComponents(disabledClaimButton, closeButton);

            await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
            
            const creatorMention = creatorId ? `<@${creatorId}>` : '';
            await interaction.followUp({ content: `${creatorMention} **تم استلام تكت عن طريق هذا الإدارة: ${member}، تابع معه.**` });
        }

        // زر إغلاق التذكرة المخصصة ونظام التقييم
        if (customId.startsWith('close_ticket_')) {
            const optionValue = customId.replace('close_ticket_', '');
            const selectedOption = TICKET_CONFIG.options.find(opt => opt.value === optionValue);

            const member = interaction.member;
            const topic = interaction.channel.topic || '';
            const isClaimer = topic.includes(`claimed_by:${member.id}`);
            const hasSupportRole = selectedOption && member.roles.cache.has(selectedOption.roleId);
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isClaimer && !hasSupportRole && !isAdmin) {
                return interaction.reply({ content: '❌ لا يمكنك إغلاق التذكرة، الإغلاق متاح فقط لمن استلمها أو الرتبة المخصصة.', flags: MessageFlags.Ephemeral });
            }

            const creatorId = topic.split('creator_id:')[1]?.split(';')[0] || '';
            const claimerId = topic.includes('claimed_by:') ? topic.split('claimed_by:')[1].split(';')[0] : '';
            const claimerName = topic.includes('claimer_name:') ? topic.split('claimer_name:')[1].split(';')[0] : 'مشرف الدعم';

            await interaction.reply({ content: '⚠️ جاري إرسال التقييم للعضو وحذف التذكرة خلال 5 ثوانٍ...' });

            await sendTicketLog(interaction.guild, interaction.channel.name, creatorId, claimerId, member);

            const creatorUser = await interaction.guild.members.fetch(creatorId).catch(() => null);
            if (creatorUser) {
                const ratingEmbed = new EmbedBuilder()
                    .setTitle('⭐ تقييم مستوى الدعم الفني')
                    .setDescription(`لقد تم إغلاق تذكرتك في سيرفر **${interaction.guild.name}**.\nيرجى الضغط على أحد الأزرار أدناه لتقييم أداء المشرف المتابع معك (**${claimerName}**):`)
                    .setColor('#f1c40f');

                const starsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rate_1_${claimerName}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_2_${claimerName}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_3_${claimerName}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_4_${claimerName}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_5_${claimerName}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                );

                await creatorUser.send({ embeds: [ratingEmbed], components: [starsRow] }).catch(() => {});
            }

            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error('Error deleting channel:', err);
                }
            }, 5000);
        }

        // تسجيل التقييم في قناة اللوج فور ضغط العضو عليه بالخاص
        if (customId.startsWith('rate_')) {
            await interaction.deferUpdate();
            const parts = customId.split('_');
            const rating = parseInt(parts[1]);
            const claimerName = parts[2];

            await sendRatingLog(interaction.guild, interaction.user, rating, claimerName);
            await interaction.followUp({ content: '✅ **شكراً جزيلاً لك على تقييمك! تم إرسال التقييم للإدارة بنجاح.**', flags: MessageFlags.Ephemeral });
        }

        // زر الإمبد المخصص العام
        if (customId === 'general_embed_button_action') {
            await interaction.reply({ content: 'سيتم فتح تذكرة عامة لك الآن...', flags: MessageFlags.Ephemeral });
            const guild = interaction.guild;
            const member = interaction.member;

            try {
                const channel = await guild.channels.create({
                    name: `ticket-general-${member.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                await channel.setTopic(`creator_id:${member.id}`);

                const embed = new EmbedBuilder()
                    .setTitle('تذكرة عامة مفتوحة')
                    .setDescription(`مرحباً بك ${member}، يرجى كتابة استفسارك هنا وسيجيبك الإشراف بأقرب وقت.`)
                    .setColor('#5865F2');

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_custom_ticket_general')
                    .setLabel('إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');

                const row = new ActionRowBuilder().addComponents(closeButton);
                await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
            } catch (err) {
                console.error(err);
            }
        }

        if (customId === 'close_custom_ticket_general') {
            await interaction.reply({ content: '⚠️ سيتم حذف التذكرة نهائياً وإغلاق القناة خلال 5 ثوانٍ...' });
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error(err);
                }
            }, 5000);
        }
    }
});

client.login(TOKEN);