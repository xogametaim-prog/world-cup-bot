const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType,
    MessageFlags
} = require('discord.js');
const express = require('express');
const { createCanvas, loadImage } = require('@napi-rs/canvas'); // مكتبة سريعة وخفيفة جداً للرسم برمجياً دون تعليق ريندر

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Rocket League Bot Active!'));
app.listen(PORT, '0.0.0.0', () => console.log(`Server connected to port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// الاختصارات والأوامر الأساسية لروكيت ليق
const PREFIX = '-';
const CREATE_ROOM_PREFIX = '-rm';
const WELCOME_SETUP_PREFIX = '-wel';
const PIC_ONLY_SETUP_PREFIX = '-puc';
const LOG_MESSAGES_PREFIX = '-lgm';
const BROADCAST_PREFIX = '-t';
const HELP_PREFIX = '-hp';

// لوقات دخول وخروج الأعضاء والرتب التلقائية
let welcomeChannelId = null;     // -wel
let picOnlyChannelId = null;     // -puc
let logMessagesChannelId = null; // -lgm
let logWelcomeChannelId = null;  // -lgwelcome
let logByeChannelId = null;      // -lgbye

let autoRoleMemberId = null;     // -gm
let autoRoleBotId = null;        // -gb

let questionInterval = null;     // التحكم في الإرسال التلقائي للأسئلة
const userWarns = new Map();     // تتبع المخالفين في شات الصور

// أسئلة روكيت ليق التفاعلية (أكثر من 45 سؤالاً عشوائياً ممتازاً)
const ROCKET_LEAGUE_QUESTIONS = [
    "🏎️ ما هي سيارتك المفضلة للعب التنافسي في روكيت ليق؟",
    "⚽ ما هو أعلى رتبة (Rank) وصلت إليها في اللعبة حتى الآن؟",
    "💥 هل تفضل استراتيجية تفجير الخصوم (Demos) أم تفضل الدفاع الهادئ؟",
    "🔥 ما هو رأيك في خريطة Wasteland الجديدة التنافسية؟",
    "🎩 ما هي القبعة (Topper) الأكثر تميزاً في حسابك؟",
    "⚡ كم نسبة نجاحك في القيام بحركة الـ Double Tap؟",
    "🚀 هل تتقن الـ Air Dribble أم لا زلت تتدرب عليها؟",
    "🎮 هل تلعب باستخدام الكنترولر (يد التحكم) أم الكيبورد والماوس؟",
    "⭐ من هو لاعبك المحترف المفضل في بطولة RLCS؟",
    "🥅 هل تفضل اللعب كمهاجم أم حارس مرمى دائم؟",
    "💨 ما هو الـ Boost المفضل لديك من ناحية الصوت والمظهر؟",
    "🔧 كم عدد الساعات الكلي الذي قضيته في روكيت ليق حتى الآن؟",
    "🚗 هل تفضل سيارة Octane أم Fennec ولماذا؟",
    "🛠️ ما هو رأيك في سيارة Dominus وهل تصلح للـ 50-50؟",
    "📦 ما هو أندر عنصر (Item) تمتلكه في مستودعك الخاص؟",
    "🏆 ما هو النمط المفضل لديك: 1v1 أم 2v2 أم 3v3؟",
    "🌀 هل تفضل مهارة الـ Speed Flip أثناء ضربة البداية (Kickoff)؟",
    "🎯 ما هي أفضل مهارة دفاعية تتقنها في اللعبة؟",
    "🛡️ كيف تتعامل مع المهاجمين الذين يعتمدون على مهارة الـ Flick؟",
    "🌋 هل تفضل اللعب في الخرائط الليلية أم الخرائط النهارية؟",
    "🎒 ما هو الغرض الأكثر طلباً للتجارة (Trading) في حسابك؟",
    "⚡ ما هي أفضل طريقة برأيك لجمع الـ Boost بسرعة أثناء اللعب؟",
    "🥅 ما هي ردة فعلك عندما يقوم زميلك في الفريق بـ Goal عكسي؟",
    "🏎️ هل تمتلك سيارة الـ Batmobile وهل تفضل اللعب بها؟",
    "🌟 ما هو هدفك الأساسي في الموسم الحالي من روكيت ليق؟",
    "🎈 هل تلعب نمط Rumble الترفيهي أم تفضل الأنماط الكلاسيكية فقط؟",
    "⛸️ ما رأيك في نمط Snow Day (الهوكي) وهل تراه تكتيكياً؟",
    "🏀 هل تلعب قسم السلة (Hoops) وهل تراه يساعد في مهارات الجو؟",
    "🎵 ما هي الأغنية المفضلة لديك في واجهة اللعبة الرئيسية؟",
    "⏱️ كم ساعة تقريباً تلعب روكيت ليق أسبوعياً؟",
    "⚽ تكتيكياً: متى يجب عليك القيام بمهارة الـ Half-Flip للعودة للدفاع؟",
    "🎯 سؤال: كيف تضمن الفوز في الـ 50-50 في الكرات الأرضية؟",
    "🚀 ما رأيك في حركة الـ Ceiling Shot وهل تراها سهلة الدفاع؟",
    "🔥 تكتيك: هل تفضل البقاء خلف زميلك (Rotation) أم الضغط الثنائي الدائم؟",
    "💥 هل تعتمد على الشات السريع (Quick Chat) لتوجيه فريقك أم تفضل الصمت؟",
    "🚗 ما هو العشب المفضلة لديك في ملاعب روكيت ليق؟",
    "🏆 هل شاركت في بطولات روكيت ليق الرسمية داخل اللعبة؟",
    "🌟 ما هو اللقب (Title) المفضل لديك المعلق تحت اسمك في اللعبة؟",
    "💨 هل تؤيد إلغاء ميزة الـ Trading الرسمية التي حدثت في اللعبة؟",
    "🌀 ما هي أفضل لقطة (Clip) قمت بتسجيلها في مسيرتك باللعبة؟",
    "🎮 هل تفضل اللعب مع الأصدقاء بالصوت أم اللعب الفردي التام؟",
    "🛡️ ما هو أفضل كوستومايز (تصميم سيارة) قمت بتركيبه حتى الآن؟",
    "🔥 هل تستخدم الـ Rocket Pass وهل يستحق الشراء دائماً؟",
    "⚽ كم مرة قمت بإنقاذ تاريخي في اللحظة الأخيرة اليوم؟",
    "🏆 لو واجهت فريقاً محترفاً، ما هو التكتيك الذي ستعتمده للفوز؟"
];

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// دالة توليد بطاقة ترحيبية مرسومة برمجياً باسم العضو وصورته الشخصية بدقة فائقة وسرعة تامة
async function generateWelcomeImage(member) {
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // رسم الخلفية
    ctx.fillStyle = '#23272a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // رسم إطار ملوّن أنيق بحدود مائلة
    const gradient = ctx.createLinearGradient(0, 0, 700, 0);
    gradient.addColorStop(0, '#5865F2');
    gradient.addColorStop(1, '#00b0f4');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // كتابة نصوص الترحيب الفنية
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('WELCOME!', 250, 100);

    ctx.fillStyle = '#00b0f4';
    ctx.font = '24px Arial';
    ctx.fillText(member.user.username, 250, 145);

    ctx.fillStyle = '#99aab5';
    ctx.font = '18px Arial';
    ctx.fillText(`Member #${member.guild.memberCount}`, 250, 185);

    // رسم صورة العضو الشخصية كدائرة كاملة
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
    } catch (e) {
        ctx.fillStyle = '#5865F2';
        ctx.beginPath();
        ctx.arc(125, 125, 64, 0, Math.PI * 2, true);
        ctx.fill();
    }

    return canvas.toBuffer('image/png');
}

// قراءة دخول الأعضاء (الترحيب المطور بالصورة + اللوج + الرتب التلقائية)
client.on('guildMemberAdd', async member => {
    // أ- الرتب التلقائية الفورية للأعضاء الحقيقيين والبوتات
    if (member.user.bot) {
        if (autoRoleBotId) {
            const role = member.guild.roles.cache.get(autoRoleBotId);
            if (role) await member.roles.add(role).catch(console.error);
        }
    } else {
        if (autoRoleMemberId) {
            const role = member.guild.roles.cache.get(autoRoleMemberId);
            if (role) await member.roles.add(role).catch(console.error);
        }
    }

    // ب- الترحيب بالبطاقة المرسومة والاسم والمنشن في روم الترحيب المخصص
    if (welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
        if (welcomeChannel) {
            try {
                const imageBuffer = await generateWelcomeImage(member);
                await welcomeChannel.send({
                    content: `👋 مرحباً بك يا ${member} في سيرفرنا الرائع! يسعدنا جداً انضمامك إلينا.`,
                    files: [{ attachment: imageBuffer, name: 'welcome-card.png' }]
                });
            } catch (err) {
                console.error(err);
            }
        }
    }

    // ج- لوق دخول الأعضاء المتقدم والتفصيلي (-lgwelcome)
    if (logWelcomeChannelId) {
        const logChannel = member.guild.channels.cache.get(logWelcomeChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📥 عضو جديد دخل السيرفر')
                .setColor('#2ecc71')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '👤 الاسم', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 الأيدي (ID)', value: `\`${member.user.id}\``, inline: true },
                    { name: '⏱️ تاريخ إنشاء حسابه بدقة', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📅 وقت انضمامه للسيرفر', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }
});

// قراءة خروج ومغادرة الأعضاء (-lgbye)
client.on('guildMemberRemove', async member => {
    if (logByeChannelId) {
        const logChannel = member.guild.channels.cache.get(logByeChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📤 عضو غادر السيرفر')
                .setColor('#e74c3c')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '👤 الاسم والتاغ', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 الأيدي (ID)', value: `\`${member.user.id}\``, inline: true },
                    { name: '📅 وقت المغادرة', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }
});

// دالة فحص وتعيين قنوات اللوج أو الإعداد بيسر وسهولة
async function handleConfigSetup(message, prefix, name) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const channelMention = message.mentions.channels.first();
    const inputId = args[0];

    const targetChannel = channelMention || message.guild.channels.cache.get(inputId);

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        message.reply(`❌ يرجى منشن قناة نصية صحيحة أو وضع أيدي القناة لتعيين قناة **${name}**:`);
        return null;
    }

    await message.reply(`✅ **تم بنجاح ربط وتعيين قناة ${name} على: ${targetChannel}**`);
    await message.delete().catch(() => {});
    return targetChannel.id;
}

// دالة المساعدة المحدثة بالكامل
function getHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🏎️ دليل أوامر واختصارات البوت الكامل والمستقر')
        .setDescription('مرحباً بك! إليك الشرح لجميع الميزات والاختصارات الحصرية المتاحة لك الآن:')
        .setColor('#e67e22')
        .addFields(
            { name: '📂 أولاً: رومات الصور وحماية القنوات واللوج', value:
                `**-rm [الاسم]** : لإنشاء روم نصي جديد ينسخ فقط صلاحيات الـ \`@everyone\` من الروم الحالي فوراً دون رتب.\n` +
                `**-puc** : يكتب داخل الروم لجعلها **روم صور فقط** ومسح النصوص وتنبيه الأعضاء يدوياً بالخاص.\n` +
                `**-lgm [#القناة]** : لتحديد قناة سجلات وتخريب شات الصور (في حال كرر عضو الكتابة النصية أكثر من 5 مرات).`
            },
            { name: '📊 ثانياً: لوقات السيرفر المتقدمة والرتب التلقائية الفورية', value:
                `**-wel [#القناة]** : لتحديد روم الترحيب التلقائي ببطاقة الاسم والصورة الشخصية المبتكرة.\n` +
                `**-lgwelcome [#القناة]** : لتحديد روم لوقات دخول الأعضاء الجدد وتوثيق حساباتهم.\n` +
                `**-lgbye [#القناة]** : لتحديد روم لوقات خروج ومغادرة الأعضاء.\n` +
                `**-gm [أيدي الرتبة]** : لتحديد رتبة تلقائية يتم منحها فوراً لأي عضو حقيقي يدخل السيرفر.\n` +
                `**-gb [أيدي الرتبة]** : لتحديد رتبة تلقائية يتم منحها فوراً لأي بوت يدخل السيرفر.`
            },
            { name: '⚽ ثالثاً: تحديات وأسئلة روكيت ليق والإرسال التلقائي', value:
                `**-sn** : لتشغيل الإرسال التلقائي للأسئلة العشوائية والممتعة في الشات كل 10 دقائق.\n` +
                `**-snp** : لإيقاف نظام الإرسال التلقائي للأسئلة العشوائية فوراً.\n` +
                `**-s** : لإرسال سؤال عشوائي وتحدي واحد فوراً في الشات لتجربة التفاعل.\n` +
                `**-t** : لبدء برودكاست جماعي فائق السرعة والآمن لجميع الأعضاء بالخاص مع الـ Rate limit لتفادي الباند.\n` +
                `**-hp** : لعرض دليل المساعدة والشرح الموحد الماثل أمامك الآن.`
            }
        )
        .setTimestamp();
}

// الاستماع للرسائل وتطبيق كامل العمليات المطلوبة بدقة تامة
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // 1. أمر المساعدة وعرض الشروح المحدث -hp
    if (content === HELP_PREFIX) {
        await message.channel.send({ embeds: [getHelpEmbed()] });
        await message.delete().catch(() => {});
        return;
    }

    // 2. ميزة إنشاء روم نصي بصلاحيات الـ @everyone فقط (-rm [الاسم])
    if (content.startsWith(CREATE_ROOM_PREFIX)) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

        const roomName = content.slice(CREATE_ROOM_PREFIX.length).trim();
        if (!roomName) {
            return message.reply('❌ يرجى كتابة اسم الروم النصي المراد إنشاؤه (مثال: `-rm chat-players`):');
        }

        try {
            const currentChannel = message.channel;
            const everyonePermissions = currentChannel.permissionOverwrites.cache.get(message.guild.id);

            const permissionOverwrites = [
                {
                    id: message.guild.id, 
                    allow: everyonePermissions ? everyonePermissions.allow.toArray() : [],
                    deny: everyonePermissions ? everyonePermissions.deny.toArray() : []
                }
            ];

            const newChannel = await message.guild.channels.create({
                name: roomName,
                type: ChannelType.GuildText,
                parent: currentChannel.parentId || null,
                permissionOverwrites: permissionOverwrites
            });

            await message.reply(`✅ **تم بنجاح إنشاء القناة النصية الجديدة بصلاحيات everyone فقط:** ${newChannel}`);
            await message.delete().catch(() => {});
        } catch (err) {
            console.error(err);
        }
        return;
    }

    // أمر إضافة رتب لقناة نصية محددة
    if (content.startsWith('-addrole')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

        const roleMention = message.mentions.roles.first();
        if (!roleMention) {
            return message.reply('❌ يرجى منشن الرتبة المراد إضافتها للقناة:');
        }

        try {
            await message.channel.permissionOverwrites.create(roleMention, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            await message.reply(`✅ **تم بنجاح إضافة الرتبة ${roleMention} ومنحها كامل الصلاحيات في هذه القناة!**`);
        } catch (err) {
            console.error(err);
        }
        return;
    }

    // 3. تعيين قنوات السيرفر المختلفة بالاختصارات
    if (content.startsWith(WELCOME_SETUP_PREFIX)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        welcomeChannelId = await handleConfigSetup(message, WELCOME_SETUP_PREFIX, 'الترحيب بالأعضاء الجدد (-wel)');
        return;
    }

    if (content.startsWith(LOG_MESSAGES_PREFIX)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        logMessagesChannelId = await handleConfigSetup(message, LOG_MESSAGES_PREFIX, 'سجلات التخريب وشات الصور (-lgm)');
        return;
    }

    if (content.startsWith('-lgwelcome')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        logWelcomeChannelId = await handleConfigSetup(message, '-lgwelcome', 'لوقات دخول الأعضاء الجدد');
        return;
    }

    if (content.startsWith('-lgbye')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        logByeChannelId = await handleConfigSetup(message, '-lgbye', 'لوقات خروج الأعضاء');
        return;
    }

    // 4. تعيين الرتب التلقائية الفورية بدقة
    if (content.startsWith('-gm')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const roleId = content.replace('-gm', '').trim();
        const role = message.guild.roles.cache.get(roleId);
        if (!role) return message.reply('❌ الأيدي غير صحيح أو الرتبة غير موجودة:');
        autoRoleMemberId = roleId;
        await message.reply(`✅ **تم تعيين الرتبة التلقائية للأعضاء الجدد بنجاح لتكون: ${role.name}**`);
        return;
    }

    if (content.startsWith('-gb')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const roleId = content.replace('-gb', '').trim();
        const role = message.guild.roles.cache.get(roleId);
        if (!role) return message.reply('❌ الأيدي غير صحيح أو الرتبة غير موجودة:');
        autoRoleBotId = roleId;
        await message.reply(`✅ **تم تعيين الرتبة التلقائية للبوتات بنجاح لتكون: ${role.name}**`);
        return;
    }

    // 5. أمر تحويل الروم إلى (روم صور فقط) -puc
    if (content === PIC_ONLY_SETUP_PREFIX) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        picOnlyChannelId = message.channel.id;
        await message.reply('📸 **تم بنجاح تحويل هذه القناة إلى قناة صور فقط! سيتم تنظيف وحذف أي نصوص عادية.**');
        await message.delete().catch(() => {});
        return;
    }

    // 6. تشغيل البث والأسئلة التلقائية التفاعلية عن روكيت ليق (-sn / -snp / -s)
    if (content === '-sn') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        if (questionInterval) {
            return message.reply('⚠️ نظام الأسئلة التلقائية يعمل بالفعل حالياً في السيرفر.');
        }

        await message.reply('🚀 **تم تفعيل وتشغيل نظام إرسال أسئلة روكيت ليق العشوائية تلقائياً كل 10 دقائق!**');
        
        questionInterval = setInterval(async () => {
            const randomQuestion = ROCKET_LEAGUE_QUESTIONS[Math.floor(Math.random() * ROCKET_LEAGUE_QUESTIONS.length)];

            const embed = new EmbedBuilder()
                .setTitle('⚽ تحدي وأسئلة روكيت ليق اليومية!')
                .setDescription(randomQuestion)
                .setColor('#2980b9')
                .setTimestamp();

            await message.channel.send({ embeds: [embed] }).catch(console.error);
        }, 600000);
        return;
    }

    if (content === '-snp') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        if (!questionInterval) {
            return message.reply('❌ نظام الأسئلة التلقائية متوقف بالفعل.');
        }
        clearInterval(questionInterval);
        questionInterval = null;
        await message.reply('🛑 **تم إيقاف نظام إرسال الأسئلة التلقائية عن روكيت ليق بنجاح.**');
        return;
    }

    if (content === '-s') {
        const randomQuestion = ROCKET_LEAGUE_QUESTIONS[Math.floor(Math.random() * ROCKET_LEAGUE_QUESTIONS.length)];

        const embed = new EmbedBuilder()
            .setTitle('⚽ تحدي وأسئلة روكيت ليق العشوائية!')
            .setDescription(randomQuestion)
            .setColor('#2980b9')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        await message.delete().catch(() => {});
        return;
    }

    // 7. ميزة برودكاست الخاص فائق السرعة والآمن بالكامل لتجنب الباند (-t)
    if (content === BROADCAST_PREFIX) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const broadcastState = { step: 1, title: null, description: null, imageUrl: null, messagesToDelete: [] };
        dmSetup.set(message.author.id, broadcastState);

        const prompt = await message.channel.send(`${message.author}, 📢 **بدء إعداد برودكاست الخاص الآمن**\n\n**الخطوة [1/3]:** يرجى كتابة **عنوان** رسالة البرودكاست:`);
        broadcastState.messagesToDelete.push(message.id, prompt.id);
        return;
    }

    // تتبع برودكاست الخاص فائق السرعة والآمن
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

            const broadcastEmbed = new EmbedBuilder()
                .setTitle(state.title)
                .setDescription(state.description)
                .setColor('#5865F2')
                .setTimestamp();

            if (state.imageUrl) {
                broadcastEmbed.setImage(state.imageUrl);
            }

            const statusMsg = await message.channel.send('⏳ **جاري بدء عملية البرودكاست التدريجي والآمن لتجنب الباند من ديسكورد...**');

            setTimeout(async () => {
                for (const msgId of state.messagesToDelete) {
                    await message.channel.messages.delete(msgId).catch(() => {});
                }
            }, 1000);

            const members = await message.guild.members.fetch();
            const memberArray = Array.from(members.values()).filter(m => !m.user.bot);

            let sentCount = 0;
            let failedCount = 0;
            let index = 0;

            // إرسال سريع وآمن (تأخير 2.5 ثانية بين كل عضو) لحماية البوت من الباند
            const interval = setInterval(async () => {
                if (index >= memberArray.length) {
                    clearInterval(interval);
                    await statusMsg.edit(`✅ **اكتمل البرودكاست بنجاح!**\n\n📬 تم الإرسال إلى: \`${sentCount}\` عضو.\n❌ فشل الإرسال لـ: \`${failedCount}\` عضو (بسبب إغلاق الخاص).`);
                    return;
                }

                const targetMember = memberArray[index];
                try {
                    await targetMember.send({ embeds: [broadcastEmbed] });
                    sentCount++;
                } catch (err) {
                    failedCount++;
                }

                await statusMsg.edit(`⏳ **جاري الإرسال التدريجي لجميع الأعضاء...**\n\n📊 التقدم: \`${index + 1}/${memberArray.length}\` عضو.\n✅ تم الإرسال: \`${sentCount}\` | ❌ فشل: \`${failedCount}\``);
                index++;
            }, 2500); 

            dmSetup.delete(message.author.id);
            return;
        }
    }

    // 8. حماية روم الصور فقط ومسح النصوص وتنبيه العضو واللوج التلقائي للتخريب
    if (picOnlyChannelId && message.channel.id === picOnlyChannelId) {
        const hasAttachment = message.attachments.size > 0;
        const hasEmbedImage = message.embeds.some(e => e.image || e.thumbnail);

        if (!hasAttachment && !hasEmbedImage) {
            await message.delete().catch(() => {});

            await message.author.send(`❌ عذراً يا **${message.author.username}**! يمنع منعاً باتاً إرسال الرسائل النصية داخل قناة الصور فقط، هذه القناة مخصصة للصور فقط.`).catch(() => {});

            const warns = userWarns.get(message.author.id) || 0;
            const newWarns = warns + 1;
            userWarns.set(message.author.id, newWarns);

            if (newWarns >= 5) {
                if (logMessagesChannelId) {
                    const logChannel = message.guild.channels.cache.get(logMessagesChannelId);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ تنبيه: تخريب شات الصور!')
                            .setColor('#e74c3c')
                            .setDescription(`قام العضو ${message.author} بإرسال رسائل نصية عشوائية بداخل قناة الصور أكثر من 5 مرات متكررة بشكل مخالف للقوانين.`)
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] }).catch(console.error);
                    }
                }
                userWarns.set(message.author.id, 0); 
            }
        }
    }
});

client.login(TOKEN);