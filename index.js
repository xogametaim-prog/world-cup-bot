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
    MessageFlags
} = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('AI Ticket Bot is Active!'));
app.listen(PORT, '0.0.0.0', () => console.log(`Server connected to port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// الاختصارات الأساسية لنظام التذاكر
const PREFIX = '-';
const TICKET_SETUP_PREFIX = '-st'; // إعداد البوكس التفاعلي المخصص
const LOG_TICKET_PREFIX = '-lgt';  // تعيين قناة اللوج

const tempSetup = new Map();
const ticketInactivityTimers = new Map(); // لمراقبة الـ 45 دقيقة خمول

let logTicketChannelId = null; 

// قاعدة بيانات الردود الذكية الفورية داخل التذاكر المفتوحة
const AI_RESPONSES = [
    { keys: ['سعر', 'اسعار', 'الاسعار', 'بكم', 'اشتراك'], reply: '💳 **أهلاً بك! بخصوص أسعار المنتجات والاشتراكات، يمكنك مراجعة روم المتجر المخصص، أو كتابة تفاصيل طلبك هنا وسيقوم المشرف المسؤول بالرد عليك وتلبية طلبك قريباً.**' },
    { keys: ['رتبه', 'رتبة', 'رتب', 'رولات'], reply: '👑 **أهلاً بك! للحصول على رتبة معينة أو الاستفسار عن الشروط المخصصة للرتب الإشرافية والتفاعلية، يرجى كتابة اسم الرتبة المطلوبة وسيقوم طاقم الإدارة بفحص حسابك ومساعدتك فوراً.**' },
    { keys: ['مشكله', 'مشكلة', 'خطا', 'خطأ', 'ما يشتغل'], reply: '🛠️ **أهلاً بك! يؤسفنا سماع ذلك. يرجى إرسال لقطة شاشة (Screenshot) توضح المشكلة أو الخطأ الذي يظهر لك بالتفصيل بداخل هذا الشات، وسيقوم فريق الدعم الفني بحل المشكلة لك في أقرب وقت.**' },
    { keys: ['كيف', 'طريقة', 'طريقه'], reply: '❓ **أهلاً بك! يرجى توضيح استفسارك بالتفصيل (كيف تفعل ماذا بالتحديد؟)، لكي نتمكن من شرح الطريقة لك بدقة وبشكل فوري.**' }
];

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

client.once('ready', async () => {
    console.log(`AI Ticket Bot is Online as ${client.user.tag}`);
});

// دالة لتحديث مؤقت الخمول (45 دقيقة) وتنبيه العضو
function resetInactivityTimer(channel, memberId) {
    if (ticketInactivityTimers.has(channel.id)) {
        clearTimeout(ticketInactivityTimers.get(channel.id));
    }

    // 45 دقيقة = 45 * 60 * 1000 = 2,700,000 مللي ثانية
    const timer = setTimeout(async () => {
        const member = channel.guild.members.cache.get(memberId);
        if (member) {
            await channel.send(`🔔 ${member}، **تنبيه خمول:** لقد مضت 45 دقيقة دون أي تفاعل في هذه التذكرة. إذا لم تعد بحاجة إليها، يرجى كتابة **(اغلقها)** أو **(سكرها)** أو الضغط على زر الإغلاق.`);
        }
    }, 2700000);

    ticketInactivityTimers.set(channel.id, timer);
}

// دالة إرسال تقرير اللوج عند الإغلاق
async function sendTicketLog(guild, channelName, creatorId, claimerId, closerUser) {
    if (!logTicketChannelId) return;
    const logChannel = guild.channels.cache.get(logTicketChannelId);
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

// دالة الإغلاق المباشر للتكت
async function executeTicketClose(channel, closerUser) {
    const topic = channel.topic || '';
    const creatorId = topic.split('creator_id:')[1]?.split(';')[0] || '';
    const claimerId = topic.includes('claimed_by:') ? topic.split('claimed_by:')[1].split(';')[0] : null;

    if (ticketInactivityTimers.has(channel.id)) {
        clearTimeout(ticketInactivityTimers.get(channel.id));
        ticketInactivityTimers.delete(channel.id);
    }

    await channel.send('⚠️ **جاري إرسال اللوج وحذف التذكرة خلال 5 ثوانٍ تلقائياً...**');
    await sendTicketLog(channel.guild, channel.name, creatorId, claimerId, closerUser);

    setTimeout(async () => {
        await channel.delete().catch(() => {});
    }, 5000);
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const isAuthorized = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.some(r => r.name === 'Ownerv');

    // ==================== محرك الرد الآلي ومراقبة خمول التذاكر بداخل التذاكر المفتوحة ====================
    if (message.channel.name.startsWith('ticket-')) {
        const topic = message.channel.topic || '';
        const creatorId = topic.split('creator_id:')[1]?.split(';')[0] || '';
        
        if (message.author.id === creatorId) {
            resetInactivityTimer(message.channel, creatorId);
        }

        // إغلاق التكت بالكلمات المفتاحية
        if (message.author.id === creatorId && (content === 'سكرها' || content === 'اغلقها' || content === 'أغلقها')) {
            return await executeTicketClose(message.channel, message.author);
        }

        let matched = false;
        // محرك الرد التلقائي الذكي على الأسئلة
        for (const response of AI_RESPONSES) {
            if (response.keys.some(key => content.toLowerCase().includes(key))) {
                await message.channel.sendTyping();
                setTimeout(async () => {
                    await message.reply({ content: response.reply });
                }, 1500);
                matched = true;
                break;
            }
        }
        if (!matched && !topic.includes('ai_notified:true')) {
            await message.channel.setTopic(`${topic};ai_notified:true`);
            await message.channel.send({ content: `🤖 **أهلاً بك يا ${message.author}! أنا البوت المساعد التلقائي الذكي.\nيرجى كتابة تفاصيل استفسارك أو مشكلتك بداخل الشات، وسأجيبك فوراً.**` });
        }
    }
    // =========================================================================================

    // بدء الإعداد التفاعلي لبوكس التذاكر المتعدد
    if (content === TICKET_SETUP_PREFIX) {
        if (!isAuthorized) {
            return message.reply('❌ عذراً، هذا الأمر مخصص للإداريين فقط.');
        }

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

    // تتبع خطوات إعداد البوكس ومسح الشات عند الانتهاء تلقائياً ليبقى نظيفاً
    if (tempSetup.has(message.author.id)) {
        const state = tempSetup.get(message.author.id);
        state.messagesToDelete.push(message.id);

        if (state.step === 'get_count') {
            const count = parseInt(message.content.trim());
            if (isNaN(count) || count < 1 || count > 10) {
                const errPrompt = await message.reply('❌ يرجى كتابة رقم صحيح من 1 إلى 10 فقط:');
                state.messagesToDelete.push(errPrompt.id);
                return;
            }
            state.optionsCount = count;
            state.currentOptionIndex = 0;
            state.step = 'get_option_label';
            const nextPrompt = await message.reply(`✅ تم تحديد عدد الأقسام: **${count}**\n\n💬 **الآن لنبدأ بتجهيز القسم رقم [1]**:\nيرجى كتابة **اسم المربع / الخيار**:`);
            state.messagesToDelete.push(nextPrompt.id);
            return;
        }

        if (state.step === 'get_option_label') {
            const label = message.content.trim();
            state.options.push({ label: label, roleId: null, description: null, value: `opt_${state.currentOptionIndex + 1}` });
            state.step = 'get_option_desc';
            const nextPrompt = await message.reply(`✅ تم حفظ اسم القسم: **${label}**\n\n📝 يرجى كتابة **الشرح/الوصف** الذي تريده أن يظهر كشرح فرعي لهذا القسم:`);
            state.messagesToDelete.push(nextPrompt.id);
            return;
        }

        if (state.step === 'get_option_desc') {
            const desc = message.content.trim();
            state.options[state.currentOptionIndex].description = desc;
            state.step = 'get_option_role';
            const nextPrompt = await message.reply(`✅ تم حفظ الوصف.\n\n👤 يرجى كتابة **أيدي الرتبة (Role ID)** المسؤولة عن تذاكر هذا القسم:`);
            state.messagesToDelete.push(nextPrompt.id);
            return;
        }

        if (state.step === 'get_option_role') {
            const roleId = message.content.trim();
            const role = message.guild.roles.cache.get(roleId);
            if (!role) {
                const errPrompt = await message.reply('❌ أيدي الرتبة غير صحيح. يرجى كتابة أيدي رتبة صحيح وموجود بالسيرفر:');
                state.messagesToDelete.push(errPrompt.id);
                return;
            }

            state.options[state.currentOptionIndex].roleId = roleId;
            state.currentOptionIndex++;

            if (state.currentOptionIndex < state.optionsCount) {
                state.step = 'get_option_label';
                const nextPrompt = await message.reply(`✅ تم ربط الرتبة **${role.name}** بالقسم السابق.\n\n💬 **لننتقل للقسم رقم [${state.currentOptionIndex + 1}]**:\nيرجى كتابة **اسم المربع / الخيار**:`);
                state.messagesToDelete.push(nextPrompt.id);
                return;
            } else {
                state.step = 'get_image';
                const nextPrompt = await message.reply(`✅ تم الانتهاء من إعداد جميع الأقسام بنجاح!\n\n🖼 يرجى وضع **رابط الصورة (Image URL)** للبوكس الرئيسي (إذا كنت لا تريد صورة اكتب: \`لا\`):`);
                state.messagesToDelete.push(nextPrompt.id);
                return;
            }
        }

        if (state.step === 'get_image') {
            const input = message.content.trim();
            if (input.toLowerCase() !== 'لا' && input.startsWith('http')) {
                state.imageUrl = input;
            } else {
                state.imageUrl = null;
            }
            state.step = 'get_category';
            const nextPrompt = await message.reply(`✅ تم حفظ إعدادات الصورة.\n\n📂 يرجى كتابة **أيدي القسم (Category ID)** الذي تفتح فيه التذاكر (إذا كنت تريدها تفتح في أي مكان اكتب: \`لا\`):`);
            state.messagesToDelete.push(nextPrompt.id);
            return;
        }

        if (state.step === 'get_category') {
            const input = message.content.trim();
            if (input.toLowerCase() !== 'لا') {
                state.categoryId = input;
            } else {
                state.categoryId = null;
            }

            const embed = new EmbedBuilder()
                .setTitle('بوابة المساعدة الفنية والخدمات | Support Portal')
                .setDescription(`يرجى تحديد القسم المناسب لمشكلتك من القائمة المنسدلة أدناه لفتح تذكرة مباشرة مع الطاقم المختص ومتابعتك.`)
                .setColor('#2b2d31');

            if (state.imageUrl) {
                embed.setImage(state.imageUrl);
            }

            const uniqueId = Date.now().toString().slice(-4);
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`multi_t_menu_${uniqueId}_${state.categoryId || 'none'}`)
                .setPlaceholder('الرجاء اختيار قسم لفتح التذكرة...');

            state.options.forEach(opt => {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setValue(`opaction_${opt.roleId}`) 
                        .setLabel(opt.label)
                        .setDescription(opt.description || `تذكرة بقسم ${opt.label}`)
                        .setEmoji('🎫')
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await message.channel.send({ embeds: [embed], components: [row] });
            
            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            tempSetup.delete(message.author.id);
        }
    }

    // تعيين قناة لوج التذاكر المغلّقة (-lgt [#القناة])
    if (content.startsWith(LOG_TICKET_PREFIX)) {
        if (!isAuthorized) return;
        
        const args = content.slice(LOG_TICKET_PREFIX.length).trim().split(/ +/);
        const channelMention = message.mentions.channels.first();
        const inputId = args[0];

        const targetChannel = channelMention || message.guild.channels.cache.get(inputId);

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return message.reply('❌ يرجى منشن قناة نصية صحيحة أو وضع الأيدي لتعيين قناة لوج التذاكر:');
        }

        logTicketChannelId = targetChannel.id;
        await message.reply(`✅ **تم بنجاح تعيين قناة لوج التذاكر المغلّقة على: ${targetChannel}**`);
        await message.delete().catch(() => {});
        return;
    }
});

client.on('interactionCreate', async interaction => {
    // فتح تكت من القوائم المنسدلة المخصصة مع ترقيم فخم وتلقائي للرومات
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('multi_t_menu_')) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const parts = interaction.customId.split('_');
            const targetCategoryId = parts[4] === 'none' ? null : parts[4];

            const selectedValue = interaction.values[0];
            const targetRoleId = selectedValue.replace('opaction_', '');

            const guild = interaction.guild;
            const member = interaction.member;

            const existingChannel = guild.channels.cache.find(c => c.name.startsWith('ticket-') && c.name.endsWith(member.user.username));
            if (existingChannel) {
                return interaction.editReply({ content: `❌ لا يمكنك فتح تذكرة جديدة؛ لأن لديك تذكرة مفتوحة بالفعل وهي: ${existingChannel}` });
            }

            const permissionOverwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ];

            if (targetRoleId && targetRoleId !== 'none') {
                permissionOverwrites.push({
                    id: targetRoleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                });
            }

            try {
                // ترقيم التذاكر تلقائياً برقم عشوائي سريع ومميز
                const uniqueTicketNum = Math.floor(1000 + Math.random() * 9000); 

                const channel = await guild.channels.create({
                    name: `ticket-${uniqueTicketNum}`, 
                    type: ChannelType.GuildText,
                    parent: targetCategoryId,
                    permissionOverwrites: permissionOverwrites
                });

                await channel.setTopic(`creator_id:${member.id}`);

                // تشغيل مؤقت الخمول (45 دقيقة) للتذكرة المفتوحة تلقائياً
                resetInactivityTimer(channel, member.id);

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('بوابة المساعدة الفنية والخدمات | Ticket Open')
                    .setDescription(`تفضل يا ${member}، كيف يمكننا مساعدتك اليوم؟\n\n💬 **سؤال هام:** هل قمت بقراءة الرومات والقوانين أولاً؟ إذا لم يكن هناك رومات يرجى توضيح طلبك مباشرة في الشات لخدمتك.\n\n🤖 **ملاحظة:** البوت المساعد مفعّل بداخل هذا الروم وسيستمع لاستفسارك ويحاول إجابتك فوراً وصامتاً!`)
                    .setColor('#5865F2')
                    .setTimestamp();

                // أزرار التحكم الكاملة والمطلوبة من قبلك داخل التكت المفتوح
                const claimButton = new ButtonBuilder()
                    .setCustomId(`claim_custom_ticket_${targetRoleId}`)
                    .setLabel('استلام التكت (مشرف)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🙋‍♂️');

                const botClaimButton = new ButtonBuilder()
                    .setCustomId(`bot_claim_ticket_${targetRoleId}`)
                    .setLabel('استلام التكت (البوت)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤖');

                const alertStaffButton = new ButtonBuilder()
                    .setCustomId(`alert_staff_btn_${targetRoleId}`)
                    .setLabel('تنبيه الإدارة المستلمة')
                    .setStyle(ButtonStyle.Warning)
                    .setEmoji('⚠️');

                const alertUserButton = new ButtonBuilder()
                    .setCustomId(`alert_user_btn_${targetRoleId}`)
                    .setLabel('تنبيه العضو')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔔');

                const closeButton = new ButtonBuilder()
                    .setCustomId(`close_custom_ticket_${targetRoleId}`)
                    .setLabel('إغلاق التكت')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');

                const row1 = new ActionRowBuilder().addComponents(claimButton, botClaimButton, alertStaffButton, alertUserButton, closeButton);

                const supportRoleMention = targetRoleId ? `<@&${targetRoleId}>` : '';
                await channel.send({ 
                    content: `${member} ${supportRoleMention}`, 
                    embeds: [welcomeEmbed], 
                    components: [row1] 
                });

                await interaction.editReply({ content: `تم فتح تذكرتك بنجاح في القناة: ${channel}` });

            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ حدث خطأ غير متوقع أثناء محاولة إنشاء التذكرة.' });
            }
        }
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;

        // 1. زر استلام التكت (بواسطة المشرف)
        if (customId.startsWith('claim_custom_ticket_')) {
            const targetRoleId = customId.replace('claim_custom_ticket_', '');
            const member = interaction.member;

            const hasRequiredRole = member.roles.cache.has(targetRoleId) || member.permissions.has(PermissionFlagsBits.Administrator);

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

            // جلب الأزرار الأخرى وحظر إظهار الـ Lag
            const botClaimButton = new ButtonBuilder().setCustomId(`bot_claim_ticket_${targetRoleId}`).setLabel('استلام التكت (البوت)').setStyle(ButtonStyle.Success).setEmoji('🤖').setDisabled(true);
            const alertStaffButton = new ButtonBuilder().setCustomId(`alert_staff_btn_${targetRoleId}`).setLabel('تنبيه الإدارة المستلمة').setStyle(ButtonStyle.Warning).setEmoji('⚠️');
            const alertUserButton = new ButtonBuilder().setCustomId(`alert_user_btn_${targetRoleId}`).setLabel('تنبيه العضو').setStyle(ButtonStyle.Secondary).setEmoji('🔔');
            const closeButton = new ButtonBuilder().setCustomId(`close_custom_ticket_${targetRoleId}`).setLabel('إغلاق التكت').setStyle(ButtonStyle.Danger).setEmoji('🔒');

            const row = new ActionRowBuilder().addComponents(disabledClaimButton, botClaimButton, alertStaffButton, alertUserButton, closeButton);

            await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
            
            const creatorMention = creatorId ? `<@${creatorId}>` : '';
            await interaction.followUp({ content: `${creatorMention} **تم استلام تكت عن طريق هذا الإدارة: ${member}، تابع معه.**` });
        }

        // زر استلام التكت (بواسطة البوت - الرد الآلي المطور)
        if (customId.startsWith('bot_claim_ticket_')) {
            await interaction.deferUpdate();
            const targetRoleId = customId.replace('bot_claim_ticket_', '');
            
            const topic = interaction.channel.topic || '';
            const creatorId = topic.split('creator_id:')[1]?.split(';')[0] || '';
            
            // حفظ أيدي البوت كمستلم للتكت
            await interaction.channel.setTopic(`creator_id:${creatorId};claimed_by:${client.user.id};claimer_name:${client.user.username}`);

            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .addFields({ name: 'المساعد المستلم', value: `🤖 تم الاستلام بواسطة: ${client.user}` });

            const disabledBotButton = new ButtonBuilder()
                .setCustomId('bot_claimed_disabled')
                .setLabel('مستلمة بواسطة البوت 🤖')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true);

            const claimButton = new ButtonBuilder().setCustomId(`claim_custom_ticket_${targetRoleId}`).setLabel('استلام التكت (مشرف)').setStyle(ButtonStyle.Primary).setEmoji('🙋‍♂️').setDisabled(true);
            const alertStaffButton = new ButtonBuilder().setCustomId(`alert_staff_btn_${targetRoleId}`).setLabel('تنبيه الإدارة المستلمة').setStyle(ButtonStyle.Warning).setEmoji('⚠️');
            const alertUserButton = new ButtonBuilder().setCustomId(`alert_user_btn_${targetRoleId}`).setLabel('تنبيه العضو').setStyle(ButtonStyle.Secondary).setEmoji('🔔');
            const closeButton = new ButtonBuilder().setCustomId(`close_custom_ticket_${targetRoleId}`).setLabel('إغلاق التكت').setStyle(ButtonStyle.Danger).setEmoji('🔒');

            const row = new ActionRowBuilder().addComponents(claimButton, disabledBotButton, alertStaffButton, alertUserButton, closeButton);

            await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
            await interaction.followUp({ content: `🤖 **لقد قمت باستلام هذه التذكرة آلياً لمساعدتك فوراً! يرجى كتابة أي استفسار وسأجيبك عليه بالثانية.**` });
        }

        // 2. زر تنبيه الإدارة المستلمة (⚠️)
        if (customId.startsWith('alert_staff_btn_')) {
            const topic = interaction.channel.topic || '';
            const claimerId = topic.includes('claimed_by:') ? topic.split('claimed_by:')[1].split(';')[0] : null;

            if (!claimerId) {
                return interaction.reply({ content: '❌ لم يتم استلام هذه التذكرة من قبل أي مشرف بعد لتنبيهه.', flags: MessageFlags.Ephemeral });
            }

            if (claimerId === client.user.id) {
                return interaction.reply({ content: '🤖 البوت مستلم لهذه التذكرة حالياً وسيرد على استفساراتك تلقائياً وبسرعة فائقة.', flags: MessageFlags.Ephemeral });
            }

            const claimerUser = interaction.guild.members.cache.get(claimerId);
            if (claimerUser) {
                await interaction.reply({ content: `⚠️ ${claimerUser}، يرجى مراجعة التكت فوراً؛ لأن صاحب الطلب بانتظار ردك.` });
            } else {
                await interaction.reply({ content: '❌ تعذر العثور على المشرف المستلم حالياً.', flags: MessageFlags.Ephemeral });
            }
        }

        // 3. زر تنبيه العضو (🔔)
        if (customId.startsWith('alert_user_btn_')) {
            const targetRoleId = customId.replace('alert_user_btn_', '');
            const member = interaction.member;

            const hasRequiredRole = member.roles.cache.has(targetRoleId) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRequiredRole) {
                return interaction.reply({ content: '❌ هذا الزر مخصص للمشرف المستلم أو الإدارة لتنبيه العضو.', flags: MessageFlags.Ephemeral });
            }

            const topic = interaction.channel.topic || '';
            const creatorId = topic.includes('creator_id:') ? topic.split('creator_id:')[1].split(';')[0] : null;

            if (creatorId) {
                const creatorUser = interaction.guild.members.cache.get(creatorId);
                await interaction.reply({ content: `🔔 تنبيه للعضو ${creatorUser}! يرجى مراجعة التذكرة لمتابعة الرد مع الإدارة.` });
            } else {
                await interaction.reply({ content: '❌ لم يتم التعرف على صاحب التذكرة لتنبيهه.', flags: MessageFlags.Ephemeral });
            }
        }

        // 4. زر طلب إغلاق التكت (🛑)
        if (customId.startsWith('request_close_btn_')) {
            const topic = interaction.channel.topic || '';
            const creatorId = topic.includes('creator_id:') ? topic.split('creator_id:')[1].split(';')[0] : null;

            if (interaction.user.id !== creatorId) {
                return interaction.reply({ content: '❌ هذا الخيار مخصص لصاحب التذكرة لطلب الإغلاق من الإدارة.', flags: MessageFlags.Ephemeral });
            }

            await interaction.reply({ content: '🛑 **قام العضو بتقديم طلب لإغلاق هذه التذكرة. يرجى من الإدارة مراجعة الطلب والموافقة على الإغلاق.**' });
        }

        // 5. زر إغلاق التذكرة المخصصة ونظام التقييم (🔒)
        if (customId.startsWith('close_custom_ticket_')) {
            const targetRoleId = customId.replace('close_custom_ticket_', '');
            const member = interaction.member;
            
            const isAuthorizedToClose = member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(targetRoleId);
            
            if (!isAuthorizedToClose) {
                return interaction.reply({ content: '❌ لا يمكنك إغلاق التذكرة، الإغلاق متاح فقط للمشرف المستلم أو الإدارة العليا.', flags: MessageFlags.Ephemeral });
            }

            await executeTicketClose(interaction.channel, member);
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
    }
});

client.login(TOKEN);