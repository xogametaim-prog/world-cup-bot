/**
 * Bot Version: 5.0.0v (The Absolute God-Mode: Mafia Live Counters & Admin Bot Spammer)
 * Developer: ta_im1 | Team: TRL for development
 * Platform: Pydroid 3 / Replit / Mobile Friendly
 */

const { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, 
    ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const express = require('express');

// 1️⃣ خادم الويب لمنع التايم آوت
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Gangster-bot Ultimate is Running! 🚀'));
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

const BOT_VERSION = "5.0.0v";
const tempUsers = new Map();
let activeMafiaGame = null;
let TICKET_LOG_CHANNEL_ID = "ضع_هنا_ايدي_روم_الادارة"; 

// --- [ قواميس وبيانات الأنظمة القديمة المحفوظة بالكامل ] ---
function getUserData(userId, username) {
    if (!tempUsers.has(userId)) {
        tempUsers.set(userId, { userId, username: username || 'مشجع مونديالي', points: 0, favoriteTeam: 'لم يحدد بعد ⚽', goalsScored: 0 });
    }
    return tempUsers.get(userId);
}

async function addPoints(userId, username, amount) {
    const userData = getUserData(userId, username);
    userData.points += amount;
    if (username) userData.username = username;
    try {
        const user = await client.users.fetch(userId);
        if (user) await user.send(`🎉 مبروك حصلت على **+${amount}** نقطة! رصيدك الحالي: \`${userData.points}\` 🏆`);
    } catch (e) {}
    return userData.points;
}

const flagData = [
    { countryAr: "المغرب", countryEn: "morocco", flagUrl: "https://flagcdn.com/w640/ma.png" },
    { countryAr: "السعودية", countryEn: "saudi arabia", flagUrl: "https://flagcdn.com/w640/sa.png" },
    { countryAr: "مصر", countryEn: "egypt", flagUrl: "https://flagcdn.com/w640/eg.png" }
];
// -------------------------------------------------------------

client.once('ready', async () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}! Version: ${BOT_VERSION}`);

    const commands = [
        new SlashCommandBuilder().setName('help').setDescription('عرض جميع أوامر البوت الفعالة حالياً دون استثناء'),
        new SlashCommandBuilder().setName('profile').setDescription('عرض ملفك الشخصي الرياضي ونقاطك'),
        new SlashCommandBuilder().setName('penalty').setDescription('تحدي ركلات الترجيح التفاعلي ضد البوت'),
        new SlashCommandBuilder().setName('guess-nationality').setDescription('بدء لعبة خمن جنسية اللاعب من العلم'),
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
            .setDescription('إنشاء رسالة فتح تذكرة دعم فني مخصصة بنظام الـ Modals المفتوحة دائماً')
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
                .setDescription('إرسال بث ورسالة جماعية لجميع أعضاء السيرفر على الخاص')
                .addStringOption(opt => opt.setName('title').setDescription('عنوان الرسالة الجماعية').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('نص الرسالة الجماعية').setRequired(true)))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
});

// 2️⃣ التعامل مع الاختصارات النصية (.m والمافيا المتطورة بالكامل، .w، .dm)
client.on('messageCreate', async message => {
    if (!message.guild) return;
    const msgContent = message.content.trim().toLowerCase();

    // اختصار الترحيب الشغال تلقائياً (.w)
    if (msgContent === '.w') {
        if (message.author.bot) return;
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('✨ أهلاً بك في مجتمع BRQ Community!')
            .setDescription(`منور السيرفر يا بطل <@${message.author.id}> نتمنى لك وقتاً ممتعاً! 🔥`)
            .setColor(0x3498DB)
            .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png');
        return message.channel.send({ embeds: [welcomeEmbed] });
    }

    // لعبة المافيا الأسطورية الكبرى بالعد التنازلي الحقيقي وتدخل الأدمن للبوتات (.m)
    if (msgContent === '.m') {
        if (activeMafiaGame) return message.reply('⚠️ هناك جولة مافيا قائمة بالفعل في هذا الشات!');

        activeMafiaGame = { 
            hostChannel: message.channel.id, 
            players: new Map(),
            votes: new Map(), // تخزين أصوات اللاعبين والعدادات
            votedUsers: new Set() // منع التكرار في التصويت ذاته
        };

        const updateEmbed = () => {
            const playerList = Array.from(activeMafiaGame.players.values()).map((p, idx) => `${idx + 1}- <@${p.id}> ${p.isBot ? '🤖 [بوت لعبة المافيا]' : '👤'}`).join('\n') || 'لا يوجد لاعبين مسجلين حتى الآن.';
            return new EmbedBuilder()
                .setTitle('✨ .•°•-BRQ Community Mafia-•°•? ✨')
                .setDescription(`**المشاركين الحاليين في البطولة (${activeMafiaGame.players.size}/25):**\n\n${playerList}`)
                .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png') 
                .setColor(0x5865F2)
                .setFooter({ text: 'اللعبة متاحة للجميع، وزر إضافة البوتات مخصص للإدارة العليا فقط!' });
        };

        // صف أزرار الأعضاء (دخول / خروج)
        const memberRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mafia_in').setEmoji('📥').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('mafia_out').setEmoji('📤').setStyle(ButtonStyle.Danger)
        );

        // صف أزرار الأدمنستريتر الحصري (إدخال بوتات من اللعبة)
        const adminRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mafia_admin_add_bot').setLabel('🤖 إضافة بوت (أدمن)').setStyle(ButtonStyle.Secondary)
        );

        const gameMsg = await message.channel.send({ embeds: [updateEmbed()], components: [memberRow, adminRow] });
        const lobbyCollector = gameMsg.createMessageComponentCollector({ time: 30000 }); // 30 ثانية لتجميع اللاعبين

        lobbyCollector.on('collect', async interaction => {
            // دخول العضو العادي
            if (interaction.customId === 'mafia_in') {
                if (activeMafiaGame.players.has(interaction.user.id)) return interaction.reply({ content: '❌ أنت مسجل بالفعل!', ephemeral: true });
                activeMafiaGame.players.set(interaction.user.id, { id: interaction.user.id, username: interaction.user.username, isBot: false });
                await interaction.deferUpdate(); await gameMsg.edit({ embeds: [updateEmbed()] });
            }
            // خروج العضو العادي
            if (interaction.customId === 'mafia_out') {
                if (!activeMafiaGame.players.has(interaction.user.id)) return interaction.reply({ content: '❌ أنت غير مسجل أصلاً لتخرج!', ephemeral: true });
                activeMafiaGame.players.delete(interaction.user.id);
                await interaction.deferUpdate(); await gameMsg.edit({ embeds: [updateEmbed()] });
            }
            // ضغطة زر إدخال البوتات (محمي برتبة Administrator الحصري)
            if (interaction.customId === 'mafia_admin_add_bot') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '❌ هذا الزر مخصص للـ Administrator (الإدارة العليا) فقط لإدخال بوتات اللعبة!', ephemeral: true });
                }
                const botId = `bot_${Math.floor(Math.random() * 100000)}`;
                const botName = `Mafia-AI-Bot-${activeMafiaGame.players.size + 1}`;
                activeMafiaGame.players.set(botId, { id: message.client.user.id, username: botName, isBot: true, fakeId: botId });
                
                await interaction.reply({ content: `🤖 تم إدخال البوت بنجاح: **${botName}**`, ephemeral: true });
                await gameMsg.edit({ embeds: [updateEmbed()] });
            }
        });

        lobbyCollector.on('end', async () => {
            if (!activeMafiaGame) return;
            if (activeMafiaGame.players.size < 2) {
                await message.channel.send('❌ تم إلغاء الجولة لعدم اكتمال النصاب الأدنى لبدء المعركة (لاعبين على الأقل).');
                activeMafiaGame = null;
                return;
            }

            // توزيع الأدوار عشوائياً وإرسالها للأعضاء الحقيقيين على الخاص
            const playersArr = Array.from(activeMafiaGame.players.values());
            const mafiaIndex = Math.floor(Math.random() * playersArr.length);
            playersArr.forEach((p, idx) => {
                p.role = (idx === mafiaIndex) ? 'مافيا 🥷' : 'مواطن 👤';
                if (!p.isBot) {
                    client.users.fetch(p.id).then(u => u.send(`🎮 جولة المافيا بدأت! دورك السري هو: **${p.role}**`).catch(() => {}));
                }
            });

            await message.channel.send('🎮 **تم قفل ساحة التسجيل وتوزيع بطاقات الأدوار سراً على الخاص!**\n⏱️ **بدأ الآن وقت التفكير والمناقشة الحرة والسوالف (30 ثانية).. تناقشوا بحذر!**');

            // بعد 15 ثانية بالضبط يرسل البوت التوجيه والنصيحة الإلزامية كما طلبت
            setTimeout(async () => {
                if (activeMafiaGame) {
                    await message.channel.send('💡 **[تنبيه هام للمناقشة]** مضت 15 ثانية! لازم تعرفوا وتكتشفوا مين القاتل أو المافيا المتخفي بينكم، وايش لازم تسووا عشان تصوتوا صح الحين وتنقذوا المواطنين!');
                }
            }, 15000);

            // بعد انتهاء الـ 30 ثانية الكاملة تبدأ ساحة التصويت بالعدادات الحية
            setTimeout(async () => {
                if (!activeMafiaGame) return;
                await message.channel.send('🗳️ **انتهى وقت التفكير المفتوح! بدأت ساحة التصويت الحية لإقصاء المتهمين والمافيا!**');

                const rows = [];
                let currentRow = new ActionRowBuilder();
                
                // تهيئة العدادات لجميع اللاعبين المشاركين
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

                const voteMsg = await message.channel.send({ embeds: [voteEmbed], components: rows });
                const voteCollector = voteMsg.createMessageComponentCollector({ time: 30000 }); // 30 ثانية للتصويت

                voteCollector.on('collect', async vInteraction => {
                    if (activeMafiaGame.votedUsers.has(vInteraction.user.id)) {
                        return vInteraction.reply({ content: '❌ لقد قمت بالتصويت بالفعل في هذه الجولة ولا يمكنك التغيير!', ephemeral: true });
                    }

                    if (vInteraction.customId === 'vote_target_skip') {
                        activeMafiaGame.votedUsers.add(vInteraction.user.id);
                        await vInteraction.reply({ content: `✅ اخترت تخطي هذه الجولة!`, ephemeral: true });
                        await message.channel.send(`⏭️ العضو <@${vInteraction.user.id}> صوت على **تخطي الجولة**.`);
                        return;
                    }

                    if (vInteraction.customId.startsWith('vote_target_')) {
                        const targetId = vInteraction.customId.replace('vote_target_', '');
                        const currentCount = activeMafiaGame.votes.get(targetId) || 0;
                        activeMafiaGame.votes.set(targetId, currentCount + 1);
                        activeMafiaGame.votedUsers.add(vInteraction.user.id);

                        // إيجاد اسم الشخص المستهدف لعرض العداد لايف في الشات
                        const targetObj = playersArr.find(p => (p.fakeId || p.id) === targetId);
                        const targetName = targetObj ? targetObj.username : "لاعب";

                        await vInteraction.reply({ content: `✅ تم تسجيل صوتك ضد ${targetName} بنجاح!`, ephemeral: true });
                        // إرسال رسالة في الشات توضح العداد الحالي للشخص الذي تم التصويت عليه فوراً
                        await message.channel.send(`🎯 <@${vInteraction.user.id}> صوت ضد **${targetName}**! العداد الحالي له: [\`${currentCount + 1}\` أصوات] 📈`);
                    }
                });

                voteCollector.on('end', async () => {
                    await message.channel.send('🏁 **انتهى وقت التصويت تماماً! تم تصفير وإغلاق الجولة بنجاح ويمكنكم اللعب مجدداً في أي وقت!**');
                    activeMafiaGame = null;
                });

            }, 30000); // 30 ثانية تفكير ومناقشة
        });
    }

    // الاختصار النصي للـ .dm الخاص بالمسؤولين والـ Administrators
    if (msgContent.startsWith('.dm')) {
        if (message.author.bot) return;
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

// 3️⃣ نظام التذاكر المتكامل بالـ Modals (مفتوح دائماً للمناقشة المستقرة)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ للمدراء فقط!', ephemeral: true });
        TICKET_LOG_CHANNEL_ID = interaction.channel.id;

        const ticketEmbed = new EmbedBuilder()
            .setTitle(interaction.options.getString('title'))
            .setDescription(interaction.options.getString('description'))
            .setColor(0x3498DB);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('trigger_modal_action').setLabel(interaction.options.getString('button_text')).setStyle(ButtonStyle.Primary).setEmoji('🎟️')
        );
        await interaction.reply({ content: '✅ تم التثبيت!', ephemeral: true });
        await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
    }

    if (interaction.isButton() && interaction.customId === 'trigger_modal_action') {
        const modal = new ModalBuilder().setCustomId('ticket_screen_modal').setTitle('General Support');
        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_field_reason')
            .setLabel('What is your question?')
            .setPlaceholder("Please describe your problem in details. Don't spam random letters or only write 'I need help'")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
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

        await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح: ${ch}`, ephemeral: true });
        await ch.send({ 
            content: `⚠️ استدعاء عاجل للـ @Administrator والمدراء!`,
            embeds: [new EmbedBuilder().setTitle('🎟️ تذكرة دعم مفتوحة').setDescription(`مرحباً بك <@${interaction.user.id}>\n\n**تفاصيل المشكلة المرفوعة بالنافذة:**\n\`\`\`text\n${problem}\n\`\`\``).setColor(0x2ECC71)] 
        });
    }
});

// 4️⃣ تشغيل المسابقات والأنظمة العامة المسترجعة بالكامل (Giveaway, Vote, Penalty, Profile)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // نظام الجيف اواي بالأزرار (Giveaway System)
    if (interaction.commandName === 'giveaway') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ للمدراء فقط!', ephemeral: true });
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');

        const giveEmbed = new EmbedBuilder()
            .setTitle('🎉 **GIVEAWAY / مسابقة جديدة** 🎉')
            .setDescription(`**الجائزة المعروضة:** \`${prize}\`\n**المدة:** \`${duration}\` دقيقة\n\nاضغط على الزر أدناه فوراً للدخول في السحب التلقائي!`)
            .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('join_give_event').setLabel('🎉 دخول السحب').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ content: '✅ تم إطلاق الجيف اواي!', ephemeral: true });
        const giveMsg = await interaction.channel.send({ embeds: [giveEmbed], components: [row] });

        const entrants = [];
        const giveCollector = giveMsg.createMessageComponentCollector({ time: duration * 60000 });

        giveCollector.on('collect', async i => {
            if (i.customId === 'join_give_event') {
                if (entrants.includes(i.user.id)) return i.reply({ content: '❌ أنت مسجل بالفعل بالمسابقة!', ephemeral: true });
                entrants.push(i.user.id);
                await i.reply({ content: '✅ تم دخولك السحب بنجاح، حظاً موفقاً!', ephemeral: true });
            }
        });

        giveCollector.on('end', async () => {
            if (entrants.length === 0) return interaction.channel.send('❌ انتهت المسابقة ولم يشترك أحد لتحديد فائز.');
            const winner = entrants[Math.floor(Math.random() * entrants.length)];
            await interaction.channel.send(`🎉 **مبروك الفائز بالجيف اواي الأسبوعي هو: <@${winner}>! لقد حصلت على الجائزة: \`${prize}\`**`);
        });
    }

    // نظام التصويت (Vote System)
    if (interaction.commandName === 'vote') {
        const question = interaction.options.getString('question');
        const voteEmbed = new EmbedBuilder()
            .setTitle('🗳️ إستطلاع رأي وتصويت للأعضاء')
            .setDescription(`**الموضوع المطروح للنقاش:**\n\n${question}`)
            .setColor(0x9B59B6);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_yes').setLabel('موافق 👍').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_no').setLabel('معارض 👎').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ content: '✅ تم نشر التصويت!', ephemeral: true });
        await interaction.channel.send({ embeds: [voteEmbed], components: [row] });
    }

    // أنظمة الملف الشخصي وركلات الترجيح والأعلام الكلاسيكية
    if (interaction.commandName === 'profile') {
        const data = getUserData(interaction.user.id, interaction.user.username);
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🪪 ملف ${interaction.user.username}`).addFields({ name: '🥈 النقاط المكتسبة:', value: `\`${data.points}\`` }).setColor(0x27AE60)] });
    }
    if (interaction.commandName === 'penalty') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('p_l').setLabel('يسار ⬅️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('p_r').setLabel('يمين ➡️').setStyle(ButtonStyle.Primary)
        );
        await interaction.reply({ content: '⚽ سدد ركلة الترجيح الرياضية القاتلة الحين وجرب حظك:', components: [row] });
    }
    if (interaction.commandName === 'guess-nationality') {
        const flag = flagData[Math.floor(Math.random() * flagData.length)];
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🌍 خمن العلم الرياضي التالي للحصول على النقاط!').setImage(flag.flagUrl).setColor(0xF39C12)] });
    }
});

// 5️⃣ قائمة المساعدة الفورية
