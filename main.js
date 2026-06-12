/**
 * Bot Version: 5.5.0v (The Ultimate Slash-Command Mafia with Admin Mention Override)
 * Developer: ta_im1 | Team: TRL for development
 * Platform: Optimized for Mobile (Pydroid 3 / Replit)
 */

const { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, 
    ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const express = require('express');

// 1️⃣ خادم الويب للحفاظ على استقرار البوت
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Gangster-bot Slash Mafia is Active! 🚀'));
app.listen(port, () => console.log(`[SYSTEM] Web server active on port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const BOT_VERSION = "5.5.0v";
const tempUsers = new Map();
let activeMafiaGame = null;
let TICKET_LOG_CHANNEL_ID = "ضع_هنا_ايدي_روم_الادارة"; 

// --- [ قاعدة بيانات الأنظمة الرياضية القديمة ] ---
function getUserData(userId, username) {
    if (!tempUsers.has(userId)) {
        tempUsers.set(userId, { userId, username: username || 'مشجع مونديالي', points: 0, favoriteTeam: 'لم يحدد بعد ⚽', goalsScored: 0 });
    }
    return tempUsers.get(userId);
}

const flagData = [
    { countryAr: "المغرب", countryEn: "morocco", flagUrl: "https://flagcdn.com/w640/ma.png" },
    { countryAr: "السعودية", countryEn: "saudi arabia", flagUrl: "https://flagcdn.com/w640/sa.png" },
    { countryAr: "مصر", countryEn: "egypt", flagUrl: "https://flagcdn.com/w640/eg.png" }
];

// 2️⃣ تسجيل الأوامر المائلة الشاملة (وتحويل المافيا رسمياً إلى Slash Command)
client.once('ready', async () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}! Version: ${BOT_VERSION}`);

    const commands = [
        new SlashCommandBuilder().setName('help').setDescription('عرض جميع أوامر البوت الفعالة حالياً دون استثناء'),
        new SlashCommandBuilder().setName('profile').setDescription('عرض ملفك الشخصي الرياضي ونقاطك'),
        new SlashCommandBuilder().setName('penalty').setDescription('تحدي ركلات الترجيح التفاعلي ضد البوت'),
        new SlashCommandBuilder().setName('guess-nationality').setDescription('بدء لعبة خمن جنسية اللاعب من العلم'),
        new SlashCommandBuilder()
            .setName('mafia')
            .setDescription('بدء جولة بطولة المافيا الكبرى بالسيرفر')
            .addBooleanOption(opt => opt.setName('mention_everyone').setDescription('منشن إيفري وان (خاص بالأدمنستريتر فقط)').setRequired(false)),
        new SlashCommandBuilder()
            .setName('vote')
            .setDescription('إنشاء تصويت سريع وعادل بالأزرار للأعضاء')
            .addStringOption(opt => opt.setName('question').setDescription('موضوع التصويت').setRequired(true)),
        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('إنشاء مسابقة جيف اواي تفاعلية بنظام الأزرار')
            .addStringOption(opt => opt.setName('prize').setDescription('الجائزة المعروضة').setRequired(true))
            .addIntegerOption(opt => opt.setName('duration').setDescription('المدة بالدقائق').setRequired(true)),
        new SlashCommandBuilder()
            .setName('setup-ticket')
            .setDescription('إنشاء رسالة نظام التذاكر المطور بالـ Modals المفتوحة دائماً')
            .addStringOption(opt => opt.setName('title').setDescription('عنوان إمبيد التكت').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('وصف أو شروط التكت').setRequired(true))
            .addStringOption(opt => opt.setName('button_text').setDescription('النص المكتوب على زر الفتح').setRequired(true)),
        new SlashCommandBuilder()
            .setName('dm')
            .setDescription('نظام الرسائل الخاصة الإداري الشامل')
            .addSubcommand(sub => sub
                .setName('user')
                .setDescription('إرسال رسالة مخصصة لعضو محدد على الخاص')
                .addUserOption(opt => opt.setName('target').setDescription('العضو المستهدف').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('نص الرسالة').setRequired(true)))
            .addSubcommand(sub => sub
                .setName('all')
                .setDescription('إرسال رسالة جماعية شاملة لكل أعضاء السيرفر على الخاص')
                .addStringOption(opt => opt.setName('title').setDescription('عنوان الرسالة الجماعية').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('نص الرسالة الجماعية').setRequired(true)))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[SYSTEM] All global slash commands successfully operational!');
    } catch (e) { console.error(e); }
});

// 3️⃣ استقبال الاختصارات النصية المتبقية (.w و .dm)
client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const msgContent = message.content.trim().toLowerCase();

    // اختصار الترحيب المباشر بالصور (.w)
    if (msgContent === '.w') {
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('✨ أهلاً بك في مجتمع BRQ Community!')
            .setDescription(`منور السيرفر يا بطل <@${message.author.id}> نتمنى لك وقتاً أسطورياً معنا! 🔥`)
            .setColor(0x3498DB)
            .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png');
        return message.channel.send({ embeds: [welcomeEmbed] });
    }

    // اختصار الـ .dm الإداري القديم
    if (msgContent.startsWith('.dm')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const args = message.content.slice('.dm'.length).trim().split(/ +/);
        if (args.length < 1) return;

        if (args[0] === 'كل' || args[0].toLowerCase() === 'all') {
            const broadcastText = args.slice(1).join(' ');
            if (!broadcastText) return;
            const members = await message.guild.members.fetch();
            members.forEach(m => { if (!m.user.bot) m.send(`📢 **إشعار جماعي عاجل من الإدارة:**\n\n${broadcastText}`).catch(() => {}); });
        } else {
            const targetUser = message.mentions.users.first();
            const directText = args.slice(1).join(' ');
            if (!targetUser || !directText) return;
            try { await targetUser.send(`📢 **رسالة إدارية مباشرة:**\n\n${directText}`); } catch (e) {}
        }
    }
});

// 4️⃣ تشغيل وإدارة نظام المافيا المطور بالكامل عبر الـ Slash Command
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'mafia') {
        if (activeMafiaGame) return interaction.reply({ content: '⚠️ هناك جولة مافيا قائمة بالفعل في هذا الشات!', ephemeral: true });

        const doMention = interaction.options.getBoolean('mention_everyone') || false;

        // التحقق من صلاحية المنشن الحصرية للأدمنستريتر
        if (doMention && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ لا يمكنك استخدام خيار منشن إيفري وان إلا إذا كنت تمتلك رتبة Administrator (الإدارة العليا)!', ephemeral: true });
        }

        activeMafiaGame = { 
            hostChannel: interaction.channel.id, 
            players: new Map(),
            votes: new Map(),
            votedUsers: new Set()
        };

        const updateEmbed = () => {
            const playerList = Array.from(activeMafiaGame.players.values()).map((p, idx) => `${idx + 1}- <@${p.id}> ${p.isBot ? '🤖 [بوت لعبة المافيا]' : '👤'}`).join('\n') || 'لا يوجد لاعبين مسجلين حتى الآن.';
            return new EmbedBuilder()
                .setTitle('✨ .•°•-BRQ Community Mafia-•°•? ✨')
                .setDescription(`**المشاركين الحاليين في البطولة (${activeMafiaGame.players.size}/25):**\n\n${playerList}`)
                .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png') 
                .setColor(0x5865F2)
                .setFooter({ text: 'اللعبة متاح بدءها للجميع، وزر إضافة البوتات مخصص للإدارة العليا!' });
        };

        const memberRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mafia_in').setEmoji('📥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('mafia_out').setEmoji('📤').setStyle(ButtonStyle.Danger)
        );

        const adminRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mafia_admin_add_bot').setLabel('🤖 إضافة بوت (أدمن)').setStyle(ButtonStyle.Secondary)
        );

        // إرسال الرد الأول والمنشن إذا طلب الأدمن ذلك
        await interaction.reply({ content: '✅ تم إطلاق جولة المافيا بنجاح!', ephemeral: true });
        
        let gameMsg;
        if (doMention) {
            gameMsg = await interaction.channel.send({ content: '@everyone 🔥 **بدأت بطولة مافيا جديدة الحين! تعالوا وسجلوا فوراً!**', embeds: [updateEmbed()], components: [memberRow, adminRow] });
        } else {
            gameMsg = await interaction.channel.send({ embeds: [updateEmbed()], components: [memberRow, adminRow] });
        }

        const lobbyCollector = gameMsg.createMessageComponentCollector({ time: 30000 }); // 30 ثانية للتسجيل

        lobbyCollector.on('collect', async i => {
            if (i.customId === 'mafia_in') {
                if (activeMafiaGame.players.has(i.user.id)) return i.reply({ content: '❌ أنت مسجل بالفعل!', ephemeral: true });
                activeMafiaGame.players.set(i.user.id, { id: i.user.id, username: i.user.username, isBot: false });
                await i.deferUpdate(); await gameMsg.edit({ embeds: [updateEmbed()] });
            }
            if (i.customId === 'mafia_out') {
                if (!activeMafiaGame.players.has(i.user.id)) return i.reply({ content: '❌ أنت غير مسجل أصلاً لتخرج!', ephemeral: true });
                activeMafiaGame.players.delete(i.user.id);
                await i.deferUpdate(); await gameMsg.edit({ embeds: [updateEmbed()] });
            }
            if (i.customId === 'mafia_admin_add_bot') {
                if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return i.reply({ content: '❌ هذا الزر مخصص للـ Administrator (الإدارة العليا) فقط لإدخال بوتات اللعبة العشوائية!', ephemeral: true });
                }
                const botId = `bot_${Math.floor(Math.random() * 100000)}`;
                const botName = `Mafia-AI-Bot-${activeMafiaGame.players.size + 1}`;
                activeMafiaGame.players.set(botId, { id: interaction.client.user.id, username: botName, isBot: true, fakeId: botId });
                
                await i.reply({ content: `🤖 تم إدخال البوت بنجاح: **${botName}**`, ephemeral: true });
                await gameMsg.edit({ embeds: [updateEmbed()] });
            }
        });

        lobbyCollector.on('end', async () => {
            if (!activeMafiaGame) return;
            if (activeMafiaGame.players.size < 2) {
                await interaction.channel.send('❌ تم إلغاء الجولة لعدم اكتمال النصاب الأدنى لبدء المعركة (لاعبين على الأقل).');
                activeMafiaGame = null;
                return;
            }

            const playersArr = Array.from(activeMafiaGame.players.values());
            const mafiaIndex = Math.floor(Math.random() * playersArr.length);
            playersArr.forEach((p, idx) => {
                p.role = (idx === mafiaIndex) ? 'مافيا 🥷' : 'مواطن 👤';
                if (!p.isBot) {
                    client.users.fetch(p.id).then(u => u.send(`🎮 جولة المافيا بدأت! دورك السري هو: **${p.role}**`).catch(() => {}));
                }
            });

            await interaction.channel.send('🎮 **تم قفل ساحة التسجيل وتوزيع بطاقات الأدوار سراً على الخاص!**\n⏱️ **بدأ الآن وقت التفكير والمناقشة الحرة والسوالف (30 ثانية).. تناقشوا بحذر!**');

            // التنبيه والنصيحة الإلزامية بعد 15 ثانية
            setTimeout(async () => {
                if (activeMafiaGame) {
                    await interaction.channel.send('💡 **[تنبيه هام للمناقشة]** مضت 15 ثانية! لازم تعرفوا وتكتشفوا مين القاتل أو المافيا المتخفي بينكم، وايش لازم تسووا عشان تصوتوا صح الحين وتنقذوا المواطنين!');
                }
            }, 15000);

            // بدء ساحة التصويت بالعدادات الحية بعد 30 ثانية
            setTimeout(async () => {
                if (!activeMafiaGame) return;
                await interaction.channel.send('🗳️ **انتهى وقت التفكير المفتوح! بدأت ساحة التصويت الحية لإقصاء المتهمين والمافيا!**');

                const rows = [];
                let currentRow = new ActionRowBuilder();
                playersArr.forEach(p => activeMafiaGame.votes.set(p.fakeId || p.id, 0));

                for (let i = 0; i < playersArr.length; i++) {
                    if (i > 0 && i % 5 === 0) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
                    const labelName = playersArr[i].username.slice(0, 10);
                    currentRow.addComponents(
                        new ButtonBuilder().setCustomId(`vote_target_${playersArr[i].fakeId || playersArr[i].id}`).setLabel(labelName).setStyle(ButtonStyle.Primary)
                    );
                }
                if (currentRow.components.length >= 5) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
                currentRow.addComponents(new ButtonBuilder().setCustomId('vote_target_skip').setLabel('⏭️ تخطي الجولة').setStyle(ButtonStyle.Danger));
                rows.push(currentRow);

                const voteEmbed = new EmbedBuilder()
                    .setTitle('🗳️ لوحة تصويت جولة المافيا الحية')
                    .setDescription('اضغط على اسم الشخص للتصويت ضده وإقصائه، العداد سيحدث فوراً في الشات!')
                    .setColor(0xE74C3C);

                const voteMsg = await interaction.channel.send({ embeds: [voteEmbed], components: rows });
                const voteCollector = voteMsg.createMessageComponentCollector({ time: 30000 });

                voteCollector.on('collect', async vInteraction => {
                    if (activeMafiaGame.votedUsers.has(vInteraction.user.id)) {
                        return vInteraction.reply({ content: '❌ لقد قمت بالتصويت بالفعل في هذه الجولة ولا يمكنك التغيير!', ephemeral: true });
                    }

                    if (vInteraction.customId === 'vote_target_skip') {
                        activeMafiaGame.votedUsers.add(vInteraction.user.id);
                        await vInteraction.reply({ content: `✅ اخترت تخطي هذه الجولة!`, ephemeral: true });
                        await interaction.channel.send(`⏭️ العضو <@vInteraction.user.id}> صوت على **تخطي الجولة**.`);
                        return;
                    }

                    if (vInteraction.customId.startsWith('vote_target_')) {
                        const targetId = vInteraction.customId.replace('vote_target_', '');
                        const currentCount = activeMafiaGame.votes.get(targetId) || 0;
                        activeMafiaGame.votes.set(targetId, currentCount + 1);
                        activeMafiaGame.votedUsers.add(vInteraction.user.id);

                        const targetObj = playersArr.find(p => (p.fakeId || p.id) === targetId);
                        const targetName = targetObj ? targetObj.username : "لاعب";

                        await vInteraction.reply({ content: `✅ تم تسجيل صوتك ضد ${targetName} بنجاح!`, ephemeral: true });
                        await interaction.channel.send(`🎯 <@${vInteraction.user.id}> صوت ضد **${targetName}**! العداد الحالي له: [\`${currentCount + 1}\` أصوات] 📈`);
                    }
                });

                voteCollector.on('end', async () => {
                    await interaction.channel.send('🏁 **انتهى وقت التصويت تماماً! تم تصفير وإغلاق الجولة بنجاح ويمكنكم اللعب مجدداً عبر الأمر المائل!**');
                    activeMafiaGame = null;
                });

            }, 30000);
        });
    }
});

// 5️⃣ باقي الأنظمة والمسابقات المحفوظة (Ticket, Giveaway, Vote, Games)
client.on('interactionCreate', async interaction => {
    // نظام التذاكر بالـ Modals
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ للمدراء فقط!', ephemeral: true });
        TICKET_LOG_CHANNEL_ID = interaction.channel.id;

        const ticketEmbed = new EmbedBuilder().setTitle(interaction.options.getString('title')).setDescription(interaction.options.getString('description')).setColor(0x3498DB);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('trigger_modal_action').setLabel(interaction.options.getString('button_text')).setStyle(ButtonStyle.Primary).setEmoji('🎟️'));
        await interaction.reply({ content: '✅ تم التثبيت!', ephemeral: true });
        await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
    }

    if (interaction.isButton() && interaction.customId === 'trigger_modal_action') {
        const modal = new ModalBuilder().setCustomId('ticket_screen_modal').setTitle('General Support');
        const reasonInput = new TextInputBuilder().setCustomId('ticket_field_reason').setLabel('What is your question?').setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket_screen_modal') {
        const problem = interaction.fields.getTextInputValue('ticket_field_reason');
        const ch = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
            ]
        });
        await interaction.reply({ content: `✅ تم فتح تذكرتك: ${ch}`, ephemeral: true });
        await ch.send({ content: `⚠️ استدعاء عاجل للمدراء!`, embeds: [new EmbedBuilder().setTitle('🎟️ تذكرة دعم').setDescription(`تفاصيل المشكلة:\n\`\`\`text\n${problem}\n\`\`\``).setColor(0x2ECC71)] });
    }

    // الأوامر العامة المسترجعة (Giveaway & Vote & Games)
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'giveaway') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ للمدراء فقط!', ephemeral: true });
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');

        const giveEmbed = new EmbedBuilder().setTitle('🎉 **GIVEAWAY / مسابقة** 🎉').setDescription(`**الجائزة:** \`${prize}\`\n**المدة:** \`${duration}\` دقيقة`).setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_give_event').setLabel('🎉 دخول السحب').setStyle(ButtonStyle.Danger));
        await interaction.reply({ content: '✅ تم الإطلاق!', ephemeral: true });
        const giveMsg = await interaction.channel.send({ embeds: [giveEmbed], components: [row] });

        const entrants = [];
        const giveCollector = giveMsg.createMessageComponentCollector({ time: duration * 60000 });
        giveCollector.on('collect', async i => {
            if (i.customId === 'join_give_event') {
                if (entrants.includes(i.user.id)) return i.reply({ content: '❌ مسجل سابقاً!', ephemeral: true });
                entrants.push(i.user.id); await i.reply({ content: '✅ تم دخول السحب!', ephemeral: true });
            }
        });
        giveCollector.on('end', async () => {
            if (entrants.length === 0) return interaction.channel.send('❌ انتهت المسابقة ولم يشترك أحد.');
            const winner = entrants[Math.floor(Math.random() * entrants.length)];
            await interaction.channel.send(`🎉 **مبروك الفائز هو: <@${winner}>! حصلت على: \`${prize}\`**`);
        });
    }

    if (interaction.commandName === 'vote') {
        const question = interaction.options.getString('question');
        const voteEmbed = new EmbedBuilder().setTitle('🗳️ إستطلاع رأي').setDescription(`**الموضوع:**\n\n${question}`).setColor(0x9B59B6);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('v_yes').setLabel('موافق 👍').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('v_no').setLabel('معارض 👎').setStyle(ButtonStyle.Danger));
        await interaction.reply({ content: '✅ تم النشر!', ephemeral: true });
        await interaction.channel.send({ embeds: [voteEmbed], components: [row] });
    }

    if (interaction.commandName === 'profile') {
        const data = getUserData(interaction.user.id, interaction.user.username);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🪪 ملف ${interaction.user.username}`).addFields({ name: '🥈 النقاط:', value: `\`${data.points}\`` }).setColor(0x27AE60)] });
    }
    if (interaction.commandName === 'penalty') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('p_l').setLabel('يسار ⬅️').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('p_r').setLabel('يمين ➡️').setStyle(ButtonStyle.Primary));
        await interaction.reply({ content: '⚽ سدد ركلة الترجيح الآن:', components: [row] });
    }
    if (interaction.commandName === 'guess-nationality') {
        const flag = flagData[Math.floor(Math.random() * flagData.length)];
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🌍 خمن العلم المونديالي التالي!').setImage(flag.flagUrl).setColor(0xF39C12)] });
    }
});

// 6️⃣ قائمة المساعدة الفورية الشاملة لكل الأنظمة والأوامر المائلة
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'help') return;

    const helpEmbed = new EmbedBuilder()
        .setTitle('🤖 قائمة تحكم وأنظمة البوت المائلة بالكامل')
        .setDescription('**كل الميزات الشغالة والمحدثة بالنظام الجديد:**\n\n• 🛑 **الإدارة العليا (Admin)**\n └ `/dm user`, `/dm all`, `/setup-ticket`\n\n• 🎉 **المسابقات والفعاليات (Giveaway & Vote)**\n └ `/giveaway` (السحبات بالأزرار)، `/vote` (لوحات التصويت الحي)\n\n• 👥 **الألعاب والترفيه (Games)**\n └ `/mafia` (لعبة المافيا بالأمر المائل والمنشن الاختياري)، `/profile`, `/penalty`, `/guess-nationality`\n\n• 🎟️ **الاختصارات النصية المباشرة (Shortcuts)**\n └ `.w` (الترحيب الفوري وعرض الإمبيد)')
        .setColor(0x5865F2)
        .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png'); 

    await interaction.reply({ embeds: [helpEmbed] });
});

client.login(process.env.TOKEN);
