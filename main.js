const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActivityType 
} = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');
const express = require('express');

// إنشاء أو الاتصال بقاعدة البيانات
const db = new Database(path.join(__dirname, 'worldcup.db'));

// تهيئة الجداول إن لم تكن موجودة
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        team TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        lang TEXT DEFAULT 'ar'
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS leaderboard (
        user_id TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0
    )
`).run();

// تشغيل البوت مع الـ Intents المطلوبة لقراءة الرسائل والـ Guilds
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// تخزين الجولات الحالية للعبة التخمين لكل سيرفر
const activeGames = new Map();

// 1. روابط أعلام الـ 48 منتخباً المشاركين بناءً على قائمتك المحدثة
const teamFlags = {
    "أمريكا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513905212201846392/USA.png",
    "المكسيك": "https://cdn.discordapp.com/attachments/1468904544321671220/1513905218029617182/MEX.png",
    "كندا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513904410798063696/CAN.png",
    "الجزائر": "https://cdn.discordapp.com/attachments/1468904544321671220/1513906087617626242/ALG.png",
    "الأرجنتين": "https://cdn.discordapp.com/attachments/1468904544321671220/1513906313787215932/ARG.png",
    "أستراليا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513906551180492971/AUS.png",
    "النمسا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513906667237019679/AUT.png",
    "بلجيكا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513906790348226712/BEL.png",
    "البوسنة والهرسك": "https://cdn.discordapp.com/attachments/1468904544321671220/1513906992207630427/BIH.png",
    "البرازيل": "https://cdn.discordapp.com/attachments/1468904544321671220/1513908176137748613/BRA.png",
    "كاب فيردي": "https://cdn.discordapp.com/attachments/1468904544321671220/1513908274368348200/CPV.png",
    "كولومبيا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513908455994429512/COL.png",
    "جمهورية الكونغو الديمقراطية": "https://cdn.discordapp.com/attachments/1468904544321671220/1513908591680294962/COD.png",
    "ساحل العاج": "https://cdn.discordapp.com/attachments/1468904544321671220/1513908707686224002/CIV.png",
    "كرواتيا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513909283111178390/CRO.png",
    "كوراساو": "https://cdn.discordapp.com/attachments/1468904544321671220/1513909401457659934/CUW.png",
    "التشيك": "https://cdn.discordapp.com/attachments/1468904544321671220/1513910724903043335/CZE.png",
    "الإكوادور": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911000250843337/ECU.png",
    "مصر": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911250739007549/EGY.png",
    "إنجلترا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911313422880788/ENG.png",
    "فرنسا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911401448603809/FRA.png",
    "ألمانيا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911493530484807/GER.png",
    "غانا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911571179638876/GHA.png",
    "هايتي": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911750888784072/HAI.png",
    "إيران": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911879876087970/IRN.png",
    "العراق": "https://cdn.discordapp.com/attachments/1468904544321671220/1513911948817989732/IRQ.png",
    "اليابان": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912006934265957/JPN.png",
    "الأردن": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912072805683260/JOR.png",
    "كوريا الجنوبية": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912134147510402/KOR.png",
    "المغرب": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912192930549862/MAR.png",
    "هولندا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912270001012936/NED.png",
    "نيوزيلندا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912511341133864/NZL.png",
    "النرويج": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912653221724322/NOR.png",
    "بنما": "https://cdn.discordapp.com/attachments/1468904544321671220/1513912795496841459/PAN.png",
    "باراغواي": "https://cdn.discordapp.com/attachments/1468904544321671220/1513913543370608641/PAR.png",
    "البرتغال": "https://cdn.discordapp.com/attachments/1468904544321671220/1513913691937181766/POR.png",
    "قطر": "https://cdn.discordapp.com/attachments/1468904544321671220/1513913827991752806/QAT.png",
    "السعودية": "https://cdn.discordapp.com/attachments/1468904544321671220/1513913892386902037/KSA.png",
    "إسكتلندا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513913998431617206/SCO.png",
    "السنغال": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914164454887674/SEN.png",
    "جنوب أفريقيا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914254363725919/RSA.png",
    "إسبانيا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914328041132285/ESP.png",
    "السويد": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914374933184762/SWE.png",
    "سويسرا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914468151857409/SUI.png",
    "تونس": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914618865651812/TUN.png",
    "تركيا": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914724981542942/TUR.png",
    "الأوروغواي": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914777447960838/URU.png",
    "أوزبكستان": "https://cdn.discordapp.com/attachments/1468904544321671220/1513914875091484804/UZB.png"
};

// 2. مصفوفة الإجابات المقبولة للعبة التخمين (بالعربي والإنجليزي)
const countryAnswers = {
    "أمريكا": ["USA", "usa", "United States", "united states", "أمريكا", "امريكا", "الولايات المتحدة", "الولايات المتحده"],
    "المكسيك": ["Mexico", "mexico", "المكسيك", "مكسيك"],
    "كندا": ["Canada", "canada", "كندا"],
    "الجزائر": ["Algeria", "algeria", "الجزائر", "الجزائر"],
    "الأرجنتين": ["Argentina", "argentina", "الأرجنتين", "الارجنتين"],
    "أستراليا": ["Australia", "australia", "أستراليا", "استراليا"],
    "النمسا": ["Austria", "austria", "النمسا", "نمسا"],
    "بلجيكا": ["Belgium", "belgium", "بلجيكا"],
    "البوسنة والهرسك": ["Bosnia", "bosnia", "البوسنة والهرسك", "البوسنه والهرسك", "البوسنة", "البوسنه"],
    "البرازيل": ["Brazil", "brazil", "البرازيل", "برازيل"],
    "كاب فيردي": ["Cape Verde", "cape verde", "كاب فيردي", "الرأس الأخضر", "الراس الاخضر"],
    "كولومبيا": ["Colombia", "colombia", "كولومبيا"],
    "جمهورية الكونغو الديمقراطية": ["Congo", "congo", "جمهورية الكونغو الديمقراطية", "جمهورية الكونغو", "الكونغو"],
    "ساحل العاج": ["Ivory Coast", "ivory coast", "ساحل العاج", "كوت ديفوار"],
    "كرواتيا": ["Croatia", "croatia", "كرواتيا"],
    "كوراساو": ["Curacao", "curacao", "كوراساو"],
    "التشيك": ["Czech", "czech", "التشيك", "جمهورية التشيك"],
    "الإكوادور": ["Ecuador", "ecuador", "الإكوادور", "الاكوادور"],
    "مصر": ["Egypt", "egypt", "مصر"],
    "إنجلترا": ["England", "england", "إنجلترا", "انجلترا"],
    "فرنسا": ["France", "france", "فرنسا"],
    "ألمانيا": ["Germany", "germany", "ألمانيا", "المانيا"],
    "غانا": ["Ghana", "ghana", "غانا"],
    "هايتي": ["Haiti", "haiti", "هايتي"],
    "إيران": ["Iran", "iran", "إيران", "ايران"],
    "العراق": ["Iraq", "iraq", "العراق"],
    "اليابان": ["Japan", "japan", "اليابان"],
    "الأردن": ["Jordan", "jordan", "الأردن", "الاردن"],
    "كوريا الجنوبية": ["South Korea", "south korea", "كوريا الجنوبية", "كوريا الجنوبيه"],
    "المغرب": ["Morocco", "morocco", "المغرب"],
    "هولندا": ["Netherlands", "netherlands", "هولندا"],
    "نيوزيلندا": ["New Zealand", "new zealand", "نيوزيلندا"],
    "النرويج": ["Norway", "norway", "النرويج", "النرويجي"],
    "بنما": ["Panama", "panama", "بنما"],
    "باراغواي": ["Paraguay", "paraguay", "باراغواي"],
    "البرتغال": ["Portugal", "portugal", "البرتغال"],
    "قطر": ["Qatar", "qatar", "قطر"],
    "السعودية": ["Saudi Arabia", "saudi", "السعودية", "السعوديه", "saudi arabia"],
    "إسكتلندا": ["Scotland", "scotland", "إسكتلندا", "اسكتلندا"],
    "السنغال": ["Senegal", "senegal", "السنغال"],
    "جنوب أفريقيا": ["South Africa", "south africa", "جنوب أفريقيا", "جنوب افريقيا"],
    "إسبانيا": ["Spain", "spain", "إسبانيا", "اسبانيا"],
    "السويد": ["Sweden", "sweden", "السويد"],
    "سويسرا": ["Switzerland", "switzerland", "سويسرا"],
    "تونس": ["Tunisia", "tunisia", "تونس"],
    "تركيا": ["Turkey", "turkey", "تركيا"],
    "الأوروغواي": ["Uruguay", "uruguay", "الأوروغواي", "الاوروغواي"],
    "أوزبكستان": ["Uzbekistan", "uzbekistan", "أوزبكستان", "اوزبكستان"]
};

// الترجمات والنصوص لنظام اللغتين
const locales = {
    ar: {
        welcome: "مرحباً بك في بوت كأس العالم 2026!",
        already_picked: "❌ لقد قمت باختيار منتخبك المفضل مسبقاً ولا يمكنك تغييره: **{team}**",
        team_selected: "✅ تم اختيار **{team}** كمنتخبك المفضل بنجاح!",
        no_team: "❌ لم تقم باختيار منتخبك المفضل بعد. استخدم الأمر `/pick_team`.",
        your_team: "🏆 منتخبك المفضل الحالي هو: **{team}**",
        teams_title: "📋 قائمة المنتخبات الـ 48 المشاركة:",
        wc_info_title: "ℹ️ معلومات كأس العالم 2026",
        wc_info_desc: "📅 **التاريخ:** 11 يونيو 2026 – 19 يوليو 2026\n📍 **المستضيف:** الولايات المتحدة، المكسيك، كندا\n⚽ **عدد المنتخبات:** 48 منتخباً لأول مرة في التاريخ!",
        lang_changed: "✅ تم تغيير لغة السيرفر إلى: **العربية**",
        broadcast_started: "📢 جاري بدء إرسال الرسالة الجماعية لجميع الأعضاء...",
        broadcast_success: "✅ تم إرسال الرسالة إلى {successCount} عضو بنجاح.",
        leaderboard_title: "🏆 لوحة الصدارة - نقاط التخمين",
        guess_start: "🤔 خمن اسم الدولة صاحبة هذا العلم في الشات!",
        correct_answer: "🎉 إجابة صحيحة من {user}! الدولة هي **{country}**. تم إضافة نقطة لرصيدك 🏅",
        help_title: "🛠️ قائمة الأوامر المتاحة",
        help_desc: "`/pick_team` - اختيار منتخبك المفضل (مرة واحدة)\n`/my_team` - عرض منتخبك المفضل الحالي\n`/teams` - عرض قائمة المنتخبات المتوفرة\n`/worldcup` - معلومات عن البطولة\n`/guess_team` - بدء جولة تخمين العلم\n`/leaderboard` - عرض ترتيب اللاعبين\n`/language` - تغيير لغة البوت بالسيرفر\n`/broadcast` - إرسال رسالة للأعضاء (الأدمن فقط)"
    },
    en: {
        welcome: "Welcome to World Cup 2026 Bot!",
        already_picked: "❌ You have already picked your favorite team and cannot change it: **{team}**",
        team_selected: "✅ Successfully selected **{team}** as your favorite team!",
        no_team: "❌ You haven't picked a favorite team yet. Use `/pick_team`.",
        your_team: "🏆 Your current favorite team is: **{team}**",
        teams_title: "📋 List of the 48 Participating Teams:",
        wc_info_title: "ℹ️ World Cup 2026 Information",
        wc_info_desc: "📅 **Date:** June 11, 2026 – July 19, 2026\n📍 **Hosts:** United States, Mexico, Canada\n⚽ **Teams:** 48 teams for the first time in history!",
        lang_changed: "✅ Server language has been changed to: **English**",
        broadcast_started: "📢 Starting global broadcast to all members...",
        broadcast_success: "✅ Message successfully sent to {successCount} members.",
        leaderboard_title: "🏆 Leaderboard - Guessing Points",
        guess_start: "🤔 Guess the country of this flag in the chat!",
        correct_answer: "🎉 Correct answer by {user}! The country is **{country}**. +1 point added 🏅",
        help_title: "🛠️ Available Commands List",
        help_desc: "`/pick_team` - Pick your favorite team (Once)\n`/my_team` - View your favorite team\n`/teams` - View all available teams\n`/worldcup` - Tournament information\n`/guess_team` - Start a flag guessing round\n`/leaderboard` - View players leaderboard\n`/language` - Change server language\n`/broadcast` - Send DM to all members (Admin only)"
    }
};

// دالة جلب لغة السيرفر الحالية من قاعدة البيانات
function getLang(guildId) {
    if (!guildId) return 'ar';
    const row = db.prepare('SELECT lang FROM guilds WHERE guild_id = ?').get(guildId);
    return row ? row.lang : 'ar';
}

// دالة لمعالجة النصوص العربية لتبسيط عملية المطابقة والتحقق
function normalizeText(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/[أإآا]/g, 'ا')
        .replace(/[ةه]/g, 'ه');
}

// تسجيل الأوامر عند جاهزية البوت
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('World Cup 2026 ⚽', { type: ActivityType.Watching });

    const commands = [
        new SlashCommandBuilder()
            .setName('pick_team')
            .setDescription('اختر منتخبك المفضل / Pick your favorite team')
            .addStringOption(option => {
                option.setName('team').setDescription('اسم المنتخب / Team name').setRequired(true);
                option.setAutocomplete(true);
                return option;
            }),
        new SlashCommandBuilder()
            .setName('my_team')
            .setDescription('عرض منتخبك المفضل الحالي / View your favorite team'),
        new SlashCommandBuilder()
            .setName('teams')
            .setDescription('عرض قائمة المنتخبات / View all teams'),
        new SlashCommandBuilder()
            .setName('worldcup')
            .setDescription('معلومات عن بطولة كأس العالم 2026 / World Cup 2026 Info'),
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('عرض قائمة الأوامر المتاحة / View help commands'),
        new SlashCommandBuilder()
            .setName('language')
            .setDescription('تغيير لغة البوت بالسيرفر / Change server language')
            .addStringOption(option => 
                option.setName('lang')
                    .setDescription('اختر اللغة / Choose language')
                    .setRequired(true)
                    .addChoices(
                        { name: 'العربية', value: 'ar' },
                        { name: 'English', value: 'en' }
                    )
            ),
        new SlashCommandBuilder()
            .setName('broadcast')
            .setDescription('إرسال رسالة جماعية للأعضاء / Broadcast DM to members (Admin only)')
            .addStringOption(option => option.setName('message').setDescription('الرسالة / Message').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder()
            .setName('guess_team')
            .setDescription('بدء جولة تخمين علم الدولة / Start a flag guessing round'),
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('عرض لوحة صدارة النقاط / View leaderboard points')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE');

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// التعامل مع ميزة الـ Autocomplete لأمر pick_team لتسهيل الاختيار على المستخدم
client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;

    if (interaction.commandName === 'pick_team') {
        const focusedValue = interaction.options.focusedValue.toLowerCase();
        const countries = Object.keys(countryAnswers);
        const filtered = countries.filter(choice => choice.toLowerCase().includes(focusedValue)).slice(0, 25);
        
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        );
    }
});

// التعامل مع الـ Slash Commands الرئيسية
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guildId, user, options } = interaction;
    const lang = getLang(guildId);
    const text = locales[lang];

    if (guildId) {
        db.prepare('INSERT OR IGNORE INTO guilds (guild_id, lang) VALUES (?, ?)').run(guildId, 'ar');
    }

    // 1. أمر /pick_team
    if (commandName === 'pick_team') {
        const selectedTeam = options.getString('team');
        
        if (!countryAnswers[selectedTeam]) {
            return interaction.reply({ content: lang === 'ar' ? '❌ هذا المنتخب ليس من ضمن الـ 48 المشاركين.' : '❌ This team is not among the 48 participating countries.', ephemeral: true });
        }

        const existingUser = db.prepare('SELECT team FROM users WHERE user_id = ?').get(user.id);
        if (existingUser) {
            return interaction.reply({ content: text.already_picked.replace('{team}', existingUser.team), ephemeral: true });
        }

        db.prepare('INSERT INTO users (user_id, team) VALUES (?, ?)').run(user.id, selectedTeam);
        return interaction.reply({ content: text.team_selected.replace('{team}', selectedTeam) });
    }

    // 2. أمر /my_team
    if (commandName === 'my_team') {
        const row = db.prepare('SELECT team FROM users WHERE user_id = ?').get(user.id);
        if (!row) {
            return interaction.reply({ content: text.no_team, ephemeral: true });
        }

        const flagUrl = teamFlags[row.team] || "";
        const embed = new EmbedBuilder()
            .setTitle(text.your_team.replace('{team}', row.team))
            .setColor('#107896')
            .setImage(flagUrl);

        return interaction.reply({ embeds: [embed] });
    }

    // 3. أمر /teams
    if (commandName === 'teams') {
        const countriesList = Object.keys(countryAnswers).join(' • ');
        const embed = new EmbedBuilder()
            .setTitle(text.teams_title)
            .setDescription(countriesList)
            .setColor('#2b2d31');

        return interaction.reply({ embeds: [embed] });
    }

    // 4. أمر /worldcup
    if (commandName === 'worldcup') {
        const embed = new EmbedBuilder()
            .setTitle(text.wc_info_title)
            .setDescription(text.wc_info_desc)
            .setThumbnail('https://cdn.discordapp.com/attachments/1468904544321671220/1513905212201846392/USA.png')
            .setColor('#00ffcc');

        return interaction.reply({ embeds: [embed] });
    }

    // 5. أمر /help
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle(text.help_title)
            .setDescription(text.help_desc)
            .setColor('#f1c40f');

        return interaction.reply({ embeds: [embed] });
    }

    // 6. أمر /language
    if (commandName === 'language') {
        const newLang = options.getString('lang');
        db.prepare('UPDATE guilds SET lang = ? WHERE guild_id = ?').run(newLang, guildId);
        return interaction.reply({ content: locales[newLang].lang_changed });
    }

    // 7. أمر /broadcast (للأدمن فقط)
    if (commandName === 'broadcast') {
        const broadcastMsg = options.getString('message');
        await interaction.reply({ content: text.broadcast_started, ephemeral: true });

        let successCount = 0;
        
        try {
            const members = await interaction.guild.members.fetch();
            
            for (const [id, member] of members) {
                if (member.user.bot) continue;
                try {
                    await member.send(`📢 **رسالة جماعية من سيرفر ${interaction.guild.name}:**\n\n${broadcastMsg}`);
                    successCount++;
                } catch (err) {
                    continue; 
                }
            }
            return interaction.editReply({ content: text.broadcast_success.replace('{successCount}', successCount) });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: "❌ حدث خطأ أثناء محاولة جلب الأعضاء أو إرسال الرسائل." });
        }
    }

    // 8. أمر /guess_team
    if (commandName === 'guess_team') {
        if (!guildId) return;
        
        const countries = Object.keys(teamFlags);
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];
        const flagUrl = teamFlags[randomCountry];

        // تهيئة وحفظ الإجابات المقبولة بصيغة موحدة ومبسطة للمطابقة الذكية
        activeGames.set(guildId, {
            country: randomCountry,
            answers: countryAnswers[randomCountry].map(a => normalizeText(a))
        });

        const embed = new EmbedBuilder()
            .setTitle(text.guess_start)
            .setImage(flagUrl)
            .setColor('#e74c3c');

        return interaction.reply({ embeds: [embed] });
    }

    // 9. أمر /leaderboard
    if (commandName === 'leaderboard') {
        const rows = db.prepare('SELECT user_id, points FROM leaderboard ORDER BY points DESC LIMIT 10').all();
        
        let desc = "";
        if (rows.length === 0) {
            desc = lang === 'ar' ? "لا توجد بيانات حالياً." : "No data available yet.";
        } else {
            rows.forEach((row, index) => {
                desc += `${index + 1}. <@${row.user_id}> - **${row.points}** ${lang === 'ar' ? 'نقاط' : 'points'}\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(text.leaderboard_title)
            .setDescription(desc)
            .setColor('#9b59b6');

        return interaction.reply({ embeds: [embed] });
    }
});

// مراقب الرسائل النصية للتعامل مع نظام الإجابة على لعبة التخمين
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guildId) return;

    const game = activeGames.get(message.guildId);
    if (!game) return;

    // تحويل إدخال اللاعب لصيغة موحدة للمقارنة العادلة والدقيقة
    const userAnswerNormalized = normalizeText(message.content);

    if (game.answers.includes(userAnswerNormalized)) {
        const lang = getLang(message.guildId);
        const text = locales[lang];

        // تسجيل النقاط داخل الـ leaderboard
        db.prepare('INSERT OR IGNORE INTO leaderboard (user_id, points) VALUES (?, 0)').run(message.author.id);
        db.prepare('UPDATE leaderboard SET points = points + 1 WHERE user_id = ?').run(message.author.id);

        await message.reply({
            content: text.correct_answer
                .replace('{user}', `<@${message.author.id}>`)
                .replace('{country}', game.country)
        });

        // حذف الجولة الحالية فوراً لمنع تكرار الإجابة لنفس العلم
        activeGames.delete(message.guildId);
    }
});

// تشغيل سيرفر الويب لتخطي مشكلة الـ Web Service Port على Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('World Cup 2026 Discord Bot is Running Successfully!');
});

app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// تسجيل دخول البوت باستخدام توكن البيئة المحيطة
client.login(process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE');
