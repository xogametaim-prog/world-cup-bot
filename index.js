[
  {
    "filename": "package.json",
    "content": "{\n  \"name\": \"world-cup-bot\",\n  \"version\": \"1.0.0\",\n  \"description\": \"Discord Bot with ProBot-style Web Dashboard for BRQ Community\",\n  \"main\": \"main.js\",\n  \"scripts\": {\n    \"start\": \"node main.js\"\n  },\n  \"dependencies\": {\n    \"@napi-rs/canvas\": \"^0.1.44\",\n    \"discord.js\": \"^14.14.1\",\n    \"express\": \"^4.18.2\",\n    \"express-session\": \"^1.17.3\",\n    \"body-parser\": \"^1.20.2\",\n    \"mongoose\": \"^8.0.3\"\n  }\n}"
  },
  {
    "filename": "server.js",
    "content": "const express = require('express');\nconst session = require('express-session');\nconst bodyParser = require('body-parser');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(bodyParser.urlencoded({ extended: true }));\napp.use(session({\n    secret: 'brq-probot-secret-key-987',\n    resave: false,\n    saveUninitialized: true,\n    cookie: { secure: false }\n}));\n\nconst ADMIN_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';\n\nfunction startDashboard(client, getGuildConfig, saveGuildConfig) {\n    app.get('/', (req, res) => {\n        if (req.session.loggedIn) {\n            return res.redirect('/dashboard');\n        }\n        res.send(`\n            <!DOCTYPE html>\n            <html lang=\"ar\" dir=\"rtl\">\n            <head>\n                <meta charset=\"UTF-8\">\n                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n                <title>بوابة تحكم BRQ Bot | تسجيل الدخول</title>\n                <script src=\"https://cdn.tailwindcss.com\"></script>\n                <link href=\"https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap\" rel=\"stylesheet\">\n                <style>body { font-family: 'Cairo', sans-serif; }</style>\n            </head>\n            <body class=\"bg-slate-950 text-white flex items-center justify-center min-h-screen\">\n                <div class=\"bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800\">\n                    <div class=\"text-center mb-6\">\n                        <div class=\"w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30\">\n                            <span class=\"text-3xl\">🤖</span>\n                        </div>\n                        <h1 class=\"text-2xl font-extrabold text-indigo-400\">لوحة تحكم BRQ Bot</h1>\n                        <p class=\"text-slate-400 text-sm mt-1\">التحكم الكامل بكافة الأنظمة والأوامر كمنصة ProBot</p>\n                    </div>\n                    <form action=\"/login\" method=\"POST\" class=\"space-y-5\">\n                        <div>\n                            <label class=\"block text-sm font-bold text-slate-300 mb-2\">رمز المرور الإداري</label>\n                            <input type=\"password\" name=\"password\" placeholder=\"••••••••\" class=\"w-full p-3 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white text-center text-lg\" required>\n                        </div>\n                        <button type=\"submit\" class=\"w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg font-bold text-white transition-all shadow-lg shadow-indigo-600/30\">تسجيل الدخول الآمن</button>\n                    </form>\n                </div>\n            </body>\n            </html>\n        `);\n    });\n\n    app.post('/login', (req, res) => {\n        const { password } = req.body;\n        if (password === ADMIN_PASSWORD) {\n            req.session.loggedIn = true;\n            res.redirect('/dashboard');\n        } else {\n            res.send('<script>alert(\"رمز المرور غير صحيح!\"); window.location=\"/\";</script>');\n        }\n    });\n\n    app.get('/dashboard', async (req, res) => {\n        if (!req.session.loggedIn) return res.redirect('/');\n\n        const totalGuilds = client.guilds.cache.size;\n        const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);\n        const ping = client.ws.ping;\n\n        let guildOptionsHtml = '';\n        client.guilds.cache.forEach(guild => {\n            guildOptionsHtml += `<option value=\"${guild.id}\" class=\"bg-slate-800 text-white\">${guild.name}</option>`;\n        });\n\n        res.send(`\n            <!DOCTYPE html>\n            <html lang=\"ar\" dir=\"rtl\">\n            <head>\n                <meta charset=\"UTF-8\">\n                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n                <title>لوحة تحكم BRQ Bot | الإدارة الشاملة</title>\n                <script src=\"https://cdn.tailwindcss.com\"></script>\n                <link href=\"https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap\" rel=\"stylesheet\">\n                <style>body { font-family: 'Cairo', sans-serif; }</style>\n            </head>\n            <body class=\"bg-slate-950 text-slate-100 min-h-screen flex flex-col\">\n                <header class=\"bg-slate-900 p-4 border-b border-slate-850 flex justify-between items-center px-6 shadow-md\">\n                    <div class=\"flex items-center gap-3\">\n                        <span class=\"text-2xl\">⚡</span>\n                        <h1 class=\"text-xl font-extrabold text-indigo-400\">لوحة تحكم BRQ Bot | ProBot Style</h1>\n                    </div>\n                    <a href=\"/logout\" class=\"bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md shadow-rose-600/20\">تسجيل الخروج</a>\n                </header>\n                <main class=\"flex-1 p-6 max-w-6xl w-full mx-auto space-y-8\">\n                    <div class=\"grid grid-cols-1 md:grid-cols-3 gap-6\">\n                        <div class=\"bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg\">\n                            <h3 class=\"text-slate-400 text-sm font-bold\">إجمالي الخوادم</h3>\n                            <p class=\"text-3xl font-extrabold mt-2 text-indigo-400\">${totalGuilds}</p>\n                        </div>\n                        <div class=\"bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg\">\n                            <h3 class=\"text-slate-400 text-sm font-bold\">إجمالي الأعضاء النشطين</h3>\n                            <p class=\"text-3xl font-extrabold mt-2 text-emerald-400\">${totalMembers}</p>\n                        </div>\n                        <div class=\"bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg\">\n                            <h3 class=\"text-slate-400 text-sm font-bold\">سرعة الاستجابة للشبكة</h3>\n                            <p class=\"text-3xl font-extrabold mt-2 text-amber-400\">${ping} ms</p>\n                        </div>\n                    </div>\n                    <div class=\"bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-6\">\n                        <h2 class=\"text-lg font-extrabold text-indigo-400 border-b border-slate-800 pb-3 flex items-center gap-2\">\n                            <span>⚙️</span> إعدادات القنوات والأنظمة الأساسية\n                        </h2>\n                        <form action=\"/save-config\" method=\"POST\" class=\"space-y-6\">\n                            <div class=\"space-y-2\">\n                                <label class=\"block text-sm font-bold text-slate-300\">اختر السيرفر لتطبيق الإعدادات</label>\n                                <select name=\"guildId\" class=\"w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500\" required>\n                                    ${guildOptionsHtml}\n                                </select>\n                            </div>\n                            <div class=\"grid grid-cols-1 md:grid-cols-2 gap-6\">\n                                <div class=\"space-y-2\">\n                                    <label class=\"block text-sm font-bold text-slate-300\">روم زيادة المستويات (Level Channel ID)</label>\n                                    <input type=\"text\" name=\"levelChannelId\" placeholder=\"مثال: 123456789012345678\" class=\"w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500\">\n                                </div>\n                                <div class=\"space-y-2\">\n                                    <label class=\"block text-sm font-bold text-slate-300\">روم الأذكار التلقائي (Islamic Channel ID)</label>\n                                    <input type=\"text\" name=\"islamicChannelId\" placeholder=\"مثال: 123456789012345678\" class=\"w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500\">\n                                </div>\n                            </div>\n                            <button type=\"submit\" class=\"w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg font-bold text-white transition-all shadow-md shadow-indigo-600/30\">حفظ كافة التغييرات</button>\n                        </form>\n                    </div>\n                    <div class=\"bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-4\">\n                        <h2 class=\"text-lg font-extrabold text-emerald-400 border-b border-slate-800 pb-3\">\n                            📌 دليل وحالة عمل الأوامر القديمة\n                        </h2>\n                        <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300\">\n                            <div class=\"bg-slate-850 p-4 rounded-lg border border-slate-800\">\n                                <p class=\"font-bold text-slate-100 mb-2\">🛡️ الأوامر الإدارية والإشرافية:</p>\n                                <ul class=\"list-disc list-inside space-y-1 text-slate-400\">\n                                    <li>حظر الأعضاء (/ban) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>كتم الأعضاء (/timeout) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>تعديل وبناء السيرفر بـ 100 رتبة (/setup_server) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>حذف جميع الرتب التلقائية (/delete_all_roles) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>حذف جميع قنوات السيرفر (/delete_all_channels) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                </ul>\n                            </div>\n                            <div class=\"bg-slate-850 p-4 rounded-lg border border-slate-800\">\n                                <p class=\"font-bold text-slate-100 mb-2\">🎫 التذاكر والمستويات والاقتصاد:</p>\n                                <ul class=\"list-disc list-inside space-y-1 text-slate-400\">\n                                    <li>نظام التذاكر المتقدم (/setup_ticket) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>نظام الوسطاء المؤتمت (/setup_middleman_panel) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>نظام الرومات المؤقتة (Dynamic Voice) - <span class=\"text-emerald-400\">مفعل تلقائياً</span></li>\n                                    <li>نظام البنك والعملات الافتراضية (/coins, /daily) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                    <li>بطاقة المستوى المصورة الرائعة (/rank) - <span class=\"text-emerald-400\">مفعل</span></li>\n                                </ul>\n                            </div>\n                        </div>\n                    </div>\n                </main>\n            </body>\n            </html>\n        `);\n    });\n\n    app.post('/save-config', async (req, res) => {\n        if (!req.session.loggedIn) return res.redirect('/');\n        const { guildId, levelChannelId, islamicChannelId } = req.body;\n        try {\n            const config = await getGuildConfig(guildId);\n            if (levelChannelId) config.levelChannelId = levelChannelId;\n            if (islamicChannelId) config.islamicChannelId = islamicChannelId;\n            await saveGuildConfig(guildId, config);\n            res.send('<script>alert(\"تم حفظ وتحديث الإعدادات بنجاح في قاعدة البيانات!\"); window.location=\"/dashboard\";</script>');\n        } catch (e) {\n            res.send(`<script>alert(\"حدث خطأ أثناء الحفظ: ${e.message}\"); window.location=\"/dashboard\";</script>`);\n        }\n    });\n\n    app.get('/logout', (req, res) => {\n        req.session.destroy();\n        res.redirect('/');\n    });\n\n    app.listen(PORT, () => {\n        console.log(`[Dashboard] Web control panel running 24/7 on port ${PORT}`);\n    });\n}\n\nmodule.exports = startDashboard;"
  },
  {
    "filename": "main.js",
    "content": "const { \n    Client, \n    GatewayIntentBits, \n    ChannelType, \n    PermissionFlagsBits, \n    ActionRowBuilder, \n    ButtonBuilder, \n    ButtonStyle, \n    EmbedBuilder, \n    AttachmentBuilder\n} = require('discord.js');\nconst mongoose = require('mongoose');\nconst { createCanvas, loadImage } = require('@napi-rs/canvas');\nconst fs = require('fs');\n\nconst client = new Client({\n    intents: [\n        GatewayIntentBits.Guilds,\n        GatewayIntentBits.GuildMessages,\n        GatewayIntentBits.MessageContent,\n        GatewayIntentBits.GuildMembers,\n        GatewayIntentBits.GuildVoiceStates\n    ]\n});\n\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n\n// --- تهيئة قاعدة البيانات ---\nconst MONGO_URI = process.env.MONGO_URI;\nlet useMongoDB = false;\nlet localDatabase = {};\n\nif (MONGO_URI) {\n    mongoose.connect(MONGO_URI)\n        .then(() => {\n            console.log('✅ تم الاتصال بنجاح بقاعدة بيانات MongoDB السحابية.');\n            useMongoDB = true;\n        })\n        .catch((err) => console.error('❌ فشل الاتصال بقاعدة بيانات MongoDB، سيتم استخدام الملف المحلي الاحتياطي:', err));\n} else {\n    console.warn('⚠️ تنبيه: لم يتم ضبط متغير البيئة MONGO_URI. سيتم حفظ مستويات الأعضاء محلياً في ملف database.json.');\n    if (fs.existsSync('./database.json')) {\n        try {\n            localDatabase = JSON.parse(fs.readFileSync('./database.json', 'utf8'));\n        } catch (e) {\n            localDatabase = {};\n        }\n    }\n}\n\n// هيكل قاعدة بيانات الأعضاء والاقتصاد لـ MongoDB\nconst userSchema = new mongoose.Schema({\n    guildId: String,\n    userId: String,\n    level: { type: Number, default: 1 },\n    xp: { type: Number, default: 0 },\n    messageCount: { type: Number, default: 0 },\n    coins: { type: Number, default: 0 },\n    lastDaily: { type: Date, default: null }\n});\nconst UserLevelModel = mongoose.model('UserLevel', userSchema);\n\n// هيكل إعدادات السيرفر المتطور لـ MongoDB\nconst configSchema = new mongoose.Schema({\n    guildId: String,\n    levelChannelId: String,\n    islamicChannelId: String,\n    roleRewards: [{ roleId: String, messagesNeeded: Number }]\n});\nconst GuildConfigModel = mongoose.model('GuildConfig', configSchema);\n\n// مصفوفة الرامات الصوتية المؤقتة لتتبعها وحذفها عند خروج الجميع\nconst tempVoiceChannels = new Map();\n\n// مصفوفة المشاركين في مسابقات الـ Giveaways الحالية\nconst activeGiveaways = new Map();\n\n// مكتبة الأذكار والآيات القرآنية لنظام النشر التلقائي\nconst ISLAMIC_REMINDERS = [\n    \"📖 قَالَ اللَّهُ تَعَالَى: {وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا * وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ}\",\n    \"🕌 قَالَ رَسُولُ اللَّهِ ﷺ: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ'\",\n    \"📖 قَالَ اللَّهُ تَعَالَى: {أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ}\",\n    \"🕌 سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ\",\n    \"🕌 لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ (كنز من كنوز الجنة)\",\n    \"📖 قَالَ اللَّهُ تَعَالَى: {إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا}\",\n    \"🕌 قَالَ رَسُولُ اللَّهِ ﷺ: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ'\",\n    \"🕌 اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنَّا\",\n    \"📖 قَالَ اللَّهُ تَعَالَى: {رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ}\",\n    \"🕌 لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ\"\n];\n\n// جلب بيانات العضو\nasync function getUserData(guildId, userId) {\n    if (useMongoDB) {\n        let data = await UserLevelModel.findOne({ guildId, userId });\n        if (!data) {\n            data = new UserLevelModel({ guildId, userId, level: 1, xp: 0, messageCount: 0, coins: 0, lastDaily: null });\n            await data.save();\n        }\n        return data;\n    } else {\n        if (!localDatabase[guildId]) localDatabase[guildId] = {};\n        if (!localDatabase[guildId].users) localDatabase[guildId].users = {};\n        if (!localDatabase[guildId].users[userId]) {\n            localDatabase[guildId].users[userId] = { level: 1, xp: 0, messageCount: 0, coins: 0, lastDaily: null };\n        }\n        return localDatabase[guildId].users[userId];\n    }\n}\n\n// حفظ بيانات العضو\nasync function saveUserData(guildId, userId, data) {\n    if (useMongoDB) {\n        await UserLevelModel.updateOne({ guildId, userId }, {\n            level: data.level,\n            xp: data.xp,\n            messageCount: data.messageCount,\n            coins: data.coins,\n            lastDaily: data.lastDaily\n        });\n    } else {\n        localDatabase[guildId].users[userId] = {\n            level: data.level,\n            xp: data.xp,\n            messageCount: data.messageCount,\n            coins: data.coins,\n            lastDaily: data.lastDaily\n        };\n        fs.writeFileSync('./database.json', JSON.stringify(localDatabase, null, 2));\n    }\n}\n\n// جلب إعدادات السيرفر\nasync function getGuildConfig(guildId) {\n    if (useMongoDB) {\n        let config = await GuildConfigModel.findOne({ guildId });\n        if (!config) {\n            config = new GuildConfigModel({ guildId, levelChannelId: null, islamicChannelId: null, roleRewards: [] });\n            await config.save();\n        }\n        return config;\n    } else {\n        if (!localDatabase[guildId]) localDatabase[guildId] = {};\n        if (!localDatabase[guildId].config) {\n            localDatabase[guildId].config = { levelChannelId: null, islamicChannelId: null, roleRewards: [] };\n        }\n        return localDatabase[guildId].config;\n    }\n}\n\n// حفظ الإعدادات\nasync function saveGuildConfig(guildId, configData) {\n    if (useMongoDB) {\n        await GuildConfigModel.updateOne({ guildId }, {\n            levelChannelId: configData.levelChannelId,\n            islamicChannelId: configData.islamicChannelId,\n            roleRewards: configData.roleRewards\n        });\n    } else {\n        localDatabase[guildId].config = configData;\n        fs.writeFileSync('./database.json', JSON.stringify(localDatabase, null, 2));\n    }\n}\n\n// التحقق مما إذا كان المستخدم من طاقم الإدارة (Staff فما فوق)\nfunction isStaffOrAdmin(member) { \n    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;\n    const managementRoles = [\"Staff\", \"Admin\", \"High Admin\", \"Owner\", \"Co-Owner\", \"Founder\", \"Staff Supervisor\", \"Supervisor\"];\n    return member.roles.cache.some(r => managementRoles.includes(r.name));\n}\n\n// إرسال سجل التذاكر تلقائياً\nasync function sendTicketLog(guild, embed) {\n    const logChannel = guild.channels.cache.find(c => \n        c.name.includes('لوق • التذاكر') || \n        c.name.includes('لوق-التذاكر') || \n        c.name.includes('لوق • العامة')\n    );\n    if (logChannel) {\n        await logChannel.send({ embeds: [embed] }).catch(() => {});\n    }\n}\n\n// معالجة الرسائل والردود والعملات والمستويات\nclient.on('messageCreate', async (message) => {\n    if (message.author.bot || !message.guild) return;\n\n    const trimmedMsg = message.content.trim();\n    const guildId = message.guild.id;\n    const userId = message.author.id;\n\n    if (trimmedMsg === \"سلام عليكم\") {\n        return message.reply(\"و عليكم السلام ورحمه الله وبركاته\").catch(() => {});\n    } else if (trimmedMsg === \"باك\") {\n        return message.reply(\"ولكمم\").catch(() => {});\n    } else if (trimmedMsg === \"برب\") {\n        return message.reply(\"يلا لا طول علينا\").catch(() => {});\n    } else if (trimmedMsg === \"هاي\") {\n        return message.reply(\"وتسب برو\").catch(() => {});\n    }\n\n    try {\n        const userData = await getUserData(guildId, userId);\n        userData.messageCount += 1;\n        \n        const coinsToAdd = Math.floor(Math.random() * 21) + 10;\n        userData.coins += coinsToAdd;\n\n        const xpToAdd = Math.floor(Math.random() * 11) + 10;\n        userData.xp += xpToAdd;\n\n        const xpNeeded = userData.level * 150;\n        \n        if (userData.xp >= xpNeeded) {\n            const oldLevel = userData.level;\n            userData.xp -= xpNeeded;\n            userData.level += 1;\n            const newLevel = userData.level;\n\n            const config = await getGuildConfig(guildId);\n            let announceChannel = message.channel;\n            if (config.levelChannelId) {\n                const targetChannel = message.guild.channels.cache.get(config.levelChannelId);\n                if (targetChannel) announceChannel = targetChannel;\n            }\n\n            try {\n                const canvas = createCanvas(1280, 543);\n                const ctx = canvas.getContext('2d');\n\n                const bg = await loadImage('./input_file_22.jpeg').catch(() => null);\n                if (bg) {\n                    ctx.drawImage(bg, 0, 0, 1280, 543);\n                } else {\n                    ctx.fillStyle = '#0f172a';\n                    ctx.fillRect(0, 0, 1280, 543);\n                }\n\n                ctx.shadowColor = '#a855f7';\n                ctx.shadowBlur = 20;\n\n                const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 128 });\n                const avatarImage = await loadImage(avatarUrl).catch(() => null);\n\n                ctx.save();\n                ctx.beginPath();\n                ctx.arc(190, 271.5, 95, 0, Math.PI * 2, true);\n                ctx.closePath();\n                ctx.clip();\n                \n                if (avatarImage) {\n                    ctx.drawImage(avatarImage, 95, 176.5, 190, 190);\n                } else {\n                    ctx.fillStyle = '#475569';\n                    ctx.fill();\n                }\n                ctx.restore();\n\n                ctx.shadowBlur = 0;\n\n                ctx.fillStyle = '#FFFFFF';\n                ctx.font = 'bold 44px sans-serif';\n                ctx.fillText('ترقية تفاعلية جديدة! 🎉', 360, 160);\n\n                ctx.fillStyle = '#c084fc';\n                ctx.font = 'bold 32px sans-serif';\n                ctx.fillText(`المستوى السابق: ${oldLevel} ➡️ المستوى الحالي: ${newLevel}`, 360, 240);\n\n                ctx.fillStyle = '#94a3b8';\n                ctx.font = '24px sans-serif';\n                ctx.fillText(`اسم العضو: ${message.author.username}`, 360, 310);\n                ctx.fillText(`إجمالي الرسائل: ${userData.messageCount}`, 360, 370);\n\n                ctx.fillStyle = '#a855f7';\n                ctx.font = 'bold 22px sans-serif';\n                ctx.fillText(`ID: ${userId}`, 980, 60);\n\n                const buffer = canvas.toBuffer('image/png');\n                const attachment = new AttachmentBuilder(buffer, { name: `levelup-${userId}.png` });\n\n                await announceChannel.send({ \n                    content: `🎉 **ترقية تفاعلية للأعضاء!**\\nلقد كنت في مستوى **${oldLevel}** وأصبحت الآن في مستوى **${newLevel}**!\\nالرتبة التفاعلية السابقة: **Level ${oldLevel}** ➡️ الرتبة الجديدة: **Level ${newLevel}**`,\n                    files: [attachment] \n                }).catch(() => {});\n\n            } catch (err) {\n                console.error(err);\n                await announceChannel.send(`🎉 تهانينا ${message.author}! لقد كنت في مستوى **${oldLevel}** وأصبحت الآن في مستوى **${newLevel}**!`).catch(() => {});\n            }\n        }\n\n        const config = await getGuildConfig(guildId);\n        if (config && config.roleRewards && config.roleRewards.length > 0) {\n            for (const reward of config.roleRewards) {\n                if (userData.messageCount >= reward.messagesNeeded) {\n                    const role = message.guild.roles.cache.get(reward.roleId);\n                    if (role && !message.member.roles.cache.has(role.id)) {\n                        try {\n                            await message.member.roles.add(role);\n                            await message.channel.send(`🎉 مبارك <@${userId}>! لقد حصلت على رتبة **${role.name}** لمشاركتك المتميزة ووصولك لـ **${reward.messagesNeeded}** رسالة!`);\n                        } catch (e) {\n                            console.error(e);\n                        }\n                    }\n                } \n            }\n        }\n\n        await saveUserData(guildId, userId, userData);\n    } catch (e) {\n        console.error(e);\n    }\n});\n\n// نظام الرومات الصوتية المؤقتة تلقائياً\nclient.on('voiceStateUpdate', async (oldState, newState) => {\n    const member = newState.member;\n    const guild = newState.guild;\n\n    if (newState.channelId) {\n        const joinChannel = guild.channels.cache.get(newState.channelId);\n        if (joinChannel && (joinChannel.name.includes('انشاء • فويس') || joinChannel.name.includes('انشاء-فويس'))) {\n            try {\n                const tempChannel = await guild.channels.create({\n                    name: `🎙️ | فويس ${member.displayName}`,\n                    type: ChannelType.GuildVoice,\n                    parent: joinChannel.parentId,\n                    userLimit: 10,\n                    permissionOverwrites: [\n                        {\n                            id: member.id,\n                            allow: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers]\n                        }\n                    ]\n                });\n\n                await member.voice.setChannel(tempChannel);\n                tempVoiceChannels.set(tempChannel.id, member.id);\n            } catch (e) {\n                console.error(e);\n            }\n        }\n    }\n\n    if (oldState.channelId) {\n        const leaveChannel = guild.channels.cache.get(oldState.channelId);\n        if (leaveChannel && tempVoiceChannels.has(leaveChannel.id)) {\n            if (leaveChannel.members.size === 0) {\n                try {\n                    await leaveChannel.delete();\n                    tempVoiceChannels.delete(leaveChannel.id);\n                } catch (e) {\n                    console.error(e);\n                }\n            }\n        }\n    }\n});\n\n// نظام النشر التلقائي للآيات والأذكار\nsetInterval(async () => {\n    try {\n        const guilds = client.guilds.cache;\n        for (const guild of guilds.values()) {\n            const config = await getGuildConfig(guild.id);\n            if (config && config.islamicChannelId) {\n                const targetChannel = guild.channels.cache.get(config.islamicChannelId);\n                if (targetChannel) {\n                    const randomReminder = ISLAMIC_REMINDERS[Math.floor(Math.random() * ISLAMIC_REMINDERS.length)];\n                    const embed = new EmbedBuilder()\n                        .setTitle('🕌 تذكير إسلامي دوري أجر لي ولك 🕌')\n                        .setDescription(`**${randomReminder}**`)\n                        .setColor(0x10b981)\n                        .setFooter({ text: 'سبحان الله وبحمده ، سبحان الله العظيم' })\n                        .setTimestamp();\n\n                    await targetChannel.send({ embeds: [embed] }).catch(() => {});\n                }\n            }\n        }\n    } catch (e) {\n        console.error(e);\n    }\n}, 3600000);\n\n// التفاعلات والأزرار والتذاكر والوسطاء وجيف اوايز\nclient.on('interactionCreate', async (interaction) => {\n    if (interaction.isButton()) {\n        const { guild, member, customId, channel } = interaction;\n        const topic = channel.topic || '';\n        const match = topic.match(/creator-id:\\s*(\d+)/);\n        const creatorId = match ? match[1] : null;\n\n        if (customId === 'create_ticket_btn') {\n            await interaction.deferReply({ ephemeral: true });\n            let category = guild.channels.cache.find(c => c.name === '🎫 | Tickets' && c.type === ChannelType.GuildCategory);\n            if (!category) {\n                try {\n                    category = await guild.channels.create({ name: '🎫 | Tickets', type: ChannelType.GuildCategory });\n                } catch (e) {\n                    return interaction.followUp({ content: '❌ حدث خطأ أثناء إنشاء تصنيف التذاكر.', ephemeral: true });\n                }\n            }\n            const staffRole = guild.roles.cache.find(r => r.name === 'Staff');\n            try {\n                const overwrites = [\n                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },\n                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },\n                    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }\n                ];\n                if (staffRole) {\n                    overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });\n                }\n                const ticketChannel = await guild.channels.create({\n                    name: `🎫-${member.user.username}`,\n                    type: ChannelType.GuildText,\n                    parent: category.id,\n                    topic: `creator-id: ${member.id}`,\n                    permissionOverwrites: overwrites\n                });\n                const embed = new EmbedBuilder()\n                    .setTitle('نظام التذاكر الموحد')\n                    .setDescription(`مرحباً بك ${member} في نظام الدعم الفني الخاص بنا.\\nالرجاء كتابة مشكلتك أو طلبك هنا، وسيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن.`)\n                    .setColor(0x00FF00)\n                    .setFooter({ text: 'التحكم بالتذكرة مخصص فقط لأعضاء الإدارة وطاقم العمل.' });\n                const actionRow = new ActionRowBuilder().addComponents(\n                    new ButtonBuilder().setCustomId('claim_ticket_btn').setLabel('استلام التذكرة 💼').setStyle(ButtonStyle.Success),\n                    new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('إغلاق التذكرة 🔒').setStyle(ButtonStyle.Danger),\n                    new ButtonBuilder().setCustomId('call_member_btn').setLabel('نداء العضو 🔔').setStyle(ButtonStyle.Secondary)\n                );\n                await ticketChannel.send({ embeds: [embed], components: [actionRow] });\n                await interaction.followUp({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}`, ephemeral: true });\n                const logEmbed = new EmbedBuilder()\n                    .setTitle('🟢 تذكرة جديدة مفتوحة')\n                    .setDescription(`تم إنشاء تذكرة دعم فني جديدة في السيرفر.`)\n                    .addFields(\n                        { name: 'صاحب التذكرة:', value: `${member} (${member.id})`, inline: true },\n                        { name: 'روم التذكرة:', value: `${ticketChannel}`, inline: true }\n                    )\n                    .setColor(0x2ECC71)\n                    .setTimestamp();\n                await sendTicketLog(guild, logEmbed);\n            } catch (e) {\n                console.error(e);\n                await interaction.followUp({ content: '❌ حدث خطأ أثناء إنشاء روم التذكرة.', ephemeral: true });\n            }\n        }\n\n        if (customId === 'claim_ticket_btn') {\n            if (!isStaffOrAdmin(member)) return interaction.reply({ content: '❌ هذا الزر مخصص فقط لطاقم العمل والإدارة.', ephemeral: true });\n            const staffRole = guild.roles.cache.find(r => r.name === 'Staff');\n            try {\n                if (staffRole) await channel.permissionOverwrites.edit(staffRole.id, { ViewChannel: false });\n                await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });\n                await interaction.reply({ content: `💼 تم استلام ومتابعة التذكرة الحالية بواسطة المشرف: ${member}.` });\n                const logEmbed = new EmbedBuilder()\n                    .setTitle('🔵 تم استلام تذكرة')\n                    .setDescription(`قام أحد المشرفين باستلام تذكرة لمتابعتها.`)\n                    .addFields(\n                        { name: 'المستلم:', value: `${member}`, inline: true },\n                        { name: 'روم التذكرة:', value: `${channel}`, inline: true }\n                    )\n                    .setColor(0x3498DB).setTimestamp();\n                await sendTicketLog(guild, logEmbed);\n            } catch (e) { console.error(e); }\n        }\n\n        if (customId === 'close_ticket_btn') {\n            if (!isStaffOrAdmin(member)) return interaction.reply({ content: '❌ لا يمكنك إغلاق التذكرة. صلاحية الإغلاق متاحة فقط لطاقم العمل من رتبة Staff وما فوق.', ephemeral: true });\n            await interaction.reply({ content: 'سيتم إغلاق وحذف التذكرة خلال 5 ثوانٍ...', ephemeral: false });\n            const logEmbed = new EmbedBuilder()\n                .setTitle('🔴 تم إغلاق تذكرة')\n                .setDescription(`تم إغلاق وحذف التذكرة بنجاح بشكل تلقائي.`)\n                .addFields(\n                    { name: 'المسؤول المغلق:', value: `${member}`, inline: true },\n                    { name: 'اسم روم التذكرة:', value: `\`${channel.name}\``, inline: true }\n                )\n                .setColor(0xE74C3C).setTimestamp();\n            await sendTicketLog(guild, logEmbed);\n            setTimeout(async () => { try { await channel.delete(); } catch (e) {} }, 5000);\n        }\n\n        if (customId === 'call_member_btn') {\n            if (!isStaffOrAdmin(member)) return interaction.reply({ content: '❌ هذا الزر مخصص فقط لطاقم العمل والإدارة.', ephemeral: true });\n            if (!creatorId) return interaction.reply({ content: '❌ لم أتمكن من العثور على صاحب التذكرة لإرسال نداء له.', ephemeral: true });\n            await interaction.reply({ content: `🔔 نداء: يرجى التواجد في التذكرة للتحدث مع الإدارة <@${creatorId}>!` });\n        }\n\n        if (customId === 'request_middleman_btn') {\n            const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');\n            const modal = new ModalBuilder().setCustomId('request_middleman_modal').setTitle('طلب وسيط معتمد للصفقة ⚖️');\n            const sellerInput = new TextInputBuilder().setCustomId('seller_id').setLabel('آي دي (ID) البائع بالكامل').setStyle(TextInputStyle.Short).setPlaceholder('مثال: 123456789012345678').setRequired(true);\n            const dealInput = new TextInputBuilder().setCustomId('deal_details').setLabel('تفاصيل السلعة / الصفقة').setStyle(TextInputStyle.Paragraph).setPlaceholder('مثال: بيع حساب تيك توك مقابل كاش وبطاقات...').setRequired(true);\n            const priceInput = new TextInputBuilder().setCustomId('deal_price').setLabel('المبلغ وطريقة الدفع المتفق عليها').setStyle(TextInputStyle.Short).setPlaceholder('مثال: 50 دولار عبر الـ PayPal').setRequired(true);\n            modal.addComponents(new ActionRowBuilder().addComponents(sellerInput), new ActionRowBuilder().addComponents(dealInput), new ActionRowBuilder().addComponents(priceInput));\n            return interaction.showModal(modal);\n        }\n\n        if (customId === 'claim_deal_btn') {\n            if (!isStaffOrAdmin(member)) return interaction.reply({ content: '❌ هذا الإجراء مخصص للوسطاء المعتمدين والإدارة فقط.', ephemeral: true });\n            await interaction.reply({ content: `💼 تم استلام عملية الوساطة الحالية ومتابعتها بواسطة الوسيط: ${member}` });\n        }\n\n        if (customId === 'complete_deal_btn') {\n            if (!isStaffOrAdmin(member)) return interaction.reply({ content: '❌ هذا الإجراء مخصص للوسطاء المعتمدين والإدارة فقط.', ephemeral: true });\n            await interaction.reply({ content: `✅ تم إتمام وتسليم الصفقة بنجاح تحت إشراف الوسيط: ${member}!\\nسيتم أرشفة وإغلاق الروم خلال 10 ثوانٍ...` });\n            setTimeout(() => channel.delete().catch(() => {}), 10000);
        }

        if (customId === 'cancel_deal_btn') {
            if (!isStaffOrAdmin(member)) return interaction.reply({ content: '❌ هذا الإجراء مخصص للوسطاء المعتمدين والإدارة فقط.', ephemeral: true });
            await interaction.reply({ content: `❌ تم إلغاء الصفقة والوساطة بواسطة الوسيط: ${member}.\\nسيتم أرشفة وإغلاق الروم خلال 10 ثوانٍ...` });
            setTimeout(() => channel.delete().catch(() => {}), 10000);
        }

        if (customId === 'join_giveaway_btn') {
            const gw = activeGiveaways.get(interaction.message.id);
            if (!gw) return interaction.reply({ content: '❌ انتهت هذه المسابقة أو لم تعد صالحة.', ephemeral: true });
            if (gw.participants.includes(member.id)) return interaction.reply({ content: '❌ أنت مشارك بالفعل في هذا الجيف اواي مسبقاً!', ephemeral: true });
            const userData = await getUserData(guild.id, member.id);
            if (userData.level < gw.levelRequirement) {
                return interaction.reply({ content: `❌ لا يمكنك المشاركة. المستوى المطلوب هو **${gw.levelRequirement}** على الأقل (مستواك الحالي: **${userData.level}**).`, ephemeral: true });
            }
            gw.participants.push(member.id);
            await interaction.reply({ content: '✅ تم تسجيل مشاركتك بنجاح في الجيف اواي، نتمنى لك التوفيق! 🎁', ephemeral: true });
        }
    }

    if (interaction.isModalSubmit()) {
        const { guild, member, customId, fields } = interaction;

        if (customId === 'request_middleman_modal') {
            await interaction.deferReply({ ephemeral: true });
            const sellerId = fields.getTextInputValue('seller_id').trim();
            const dealDetails = fields.getTextInputValue('deal_details');
            const dealPrice = fields.getTextInputValue('deal_price');
            const sellerMember = await guild.members.fetch(sellerId).catch(() => null);

            let category = guild.channels.cache.find(c => c.name === '⚖️ | BRQ - Meditators' && c.type === ChannelType.GuildCategory);
            if (!category) category = await guild.channels.create({ name: '⚖️ | BRQ - Meditators', type: ChannelType.GuildCategory });

            const staffRole = guild.roles.cache.find(r => r.name === 'Staff');
            const mmRole = guild.roles.cache.find(r => r.name === 'Middleman (الوسيط)');

            const overwrites = [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ];
            if (sellerMember) overwrites.push({ id: sellerMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
            if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
            if (mmRole) overwrites.push({ id: mmRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });

            try {
                const mmChannel = await guild.channels.create({
                    name: `وساطة-${member.user.username}`,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: overwrites
                });
                const dealEmbed = new EmbedBuilder()
                    .setTitle('⚖️ صفقة تجارية معلقة - تذكرة وساطة رسمية ⚖️')
                    .setDescription('يرجى الانتظار لحين استلام الصفقة من قبل أحد الوسطاء المعتمدين.')
                    .setColor(0x00AAAA)
                    .addFields(
                        { name: '👤 صاحب الطلب (المشتري):', value: `${member} (${member.id})`, inline: true },
                        { name: '👤 الطرف الآخر (البائع):', value: sellerMember ? `${sellerMember} (${sellerId})` : `\`لم يُعثر على الآي دي المدخل: ${sellerId}\``, inline: true },
                        { name: '📦 تفاصيل الصفقة:', value: `\`\`\`${dealDetails}\`\`\`` },
                        { name: '💰 قيمة الصفقة وطريقة الدفع:', value: `\`${dealPrice}\`` }
                    );
                const mmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_deal_btn').setLabel('استلام الصفقة 🔒').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('complete_deal_btn').setLabel('إتمام الصفقة ✅').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('cancel_deal_btn').setLabel('إلغاء الصفقة ❌').setStyle(ButtonStyle.Danger)
                );
                await mmChannel.send({ content: `<@&${mmRole ? mmRole.id : ''}> نداء تذكرة وساطة جديدة.`, embeds: [dealEmbed], components: [mmRow] });
                await interaction.followUp({ content: `✅ تم إنشاء تذكرة الوساطة بنجاح: ${mmChannel}`, ephemeral: true });
            } catch (e) {
                console.error(e);
                await interaction.followUp({ content: '❌ حدث خطأ غير متوقع أثناء فتح تذكرة الوساطة.', ephemeral: true });
            }
        }

        if (customId === 'publish_rules_modal') {
            const title = fields.getTextInputValue('rules_title');
            const content = fields.getTextInputValue('rules_content');
            const rulesChannel = guild.channels.cache.find(c => c.name.includes('القوانين') || c.name.includes('rules'));
            if (!rulesChannel) return interaction.reply({ content: '❌ لم أتمكن من العثور على روم القوانين.', ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle(title).setDescription(content).setColor(0x0099FF)
                .setThumbnail(guild.iconURL({ dynamic: true }) || null)
                .setFooter({ text: `تم النشر بواسطة: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() }).setTimestamp();
            try {
                await rulesChannel.send({ embeds: [embed] });
                await interaction.reply({ content: `✅ تم نشر القوانين والتعليمات بنجاح داخل الروم: ${rulesChannel}`, ephemeral: true });
            } catch (e) { await interaction.reply({ content: `❌ حدث خطأ: ${e.message}`, ephemeral: true }); }
        }
    }

    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, member, channel } = interaction;
        const isAdministrator = member.permissions.has(PermissionFlagsBits.Administrator);

        if (commandName === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('دليل وأوامر بوت سيرفر BRQ Community 🤖')
                .setDescription('مرحباً بك في قائمة المساعدة المخصصة للتحكم بكافة أنظمة البوت.')
                .setColor(0xa855f7)
                .setThumbnail(guild.iconURL({ dynamic: true }) || null)
                .addFields(
                    { name: '🛡️ أوامر الإدارة العامة', value: '`/setup_server` • لتهيئة السيرفر وإنشاء الرومات والرتب والجوائز.\n`/setup_ticket` • لإرسال بانل التذاكر التفاعلي.\n`/setup_middleman_panel` • لإرسال بانل الوسطاء التفاعلي.\n`/delete_all_channels` • لمسح كافة الرومات بالسيرفر يدوياً.\n`/delete_channel` • لحذف روم محدد.\n`/delete_all_roles` • لمسح جميع الرتب التلقائية بالسيرفر.\n`/publish_rules` • لنشر قوانين السيرفر كبطاقة إمبد.' },
                    { name: '📊 أوامر التفاعل والمستويات والعملات', value: '`/rank` • لعرض بطاقة المستوى وعدد رسائل العضو كصورة مخصصة.\n`/set_level_channel` • لتخصيص روم إشعارات زيادة المستوى.\n`/set_islamic_channel` • لتخصيص روم النشر الإسلامي التلقائي.\n`/add_role_reward` • لربط رتبة بعدد رسائل محدد للأعضاء.\n`/daily` • للحصول على مكافأتك اليومية بالعملات.\n`/coins` • لعرض رصيدك ببنك ديسكورد.\n`/transfer` • لتحويل العملات للأعضاء.\n`/shop` • لعرض متجر رتب السيرفر.\n`/buy` • لشراء رتبة من المتجر الافتراضي.' },
                    { name: '🎫 أوامر نظام التذاكر والوسطاء', value: '`/add` • لإدخال عضو للتذكرة.\n`/remove` • لإزالة عضو من التذكرة.\n`/claim` • لاستلام تذكرة لمتابعتها.\n`/unclaim` • لترك التذكرة ليعود المشرفين لاستلامها.\n`/rename` • لتعديل اسم روم التذكرة.\n`/close` • لإغلاق وحذف التذكرة الحالية.' },
                    { name: '🎁 أوامر التوزيع والـ Giveaways', value: '`/giveaway_start` • لبدء جيف اواي تفاعلي بشروط المستويات والتفاعل بالسيرفر.' },
                    { name: '🔨 أوامر الإشراف الأساسية', value: '`/ban` • لحظر عضو من السيرفر.\n`/timeout` • لإعطاء تايم أوت (كتم مؤقت) لعضو.' }
                ).setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'giveaway_start') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const prize = options.getString('prize');
            const duration = options.getInteger('duration_minutes');
            const winnersCount = options.getInteger('winners_count');
            const levelReq = options.getInteger('level_requirement') || 0;
            await interaction.reply({ content: '⏳ جاري بدء ونشر الـ Giveaway...', ephemeral: true });
            const endTime = Date.now() + duration * 60 * 1000;
            const embed = new EmbedBuilder()
                .setTitle('🎁 سحب وجيف اواي تفاعلي جديد! 🎁')
                .setDescription(`🏆 **الجائزة المقدمة:** **${prize}**\n⏱️ **المدة الزمنية:** **${duration}** دقيقة\n⭐ **الحد الأدنى لمستوى التفاعل للدخول:** المستوى **${levelReq === 0 ? 'مفتوح للجميع 🔓' : levelReq}**`)
                .setColor(0xfbbf24).setTimestamp(endTime);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway_btn').setLabel('المشاركة في التوزيع 🎁').setStyle(ButtonStyle.Success));
            const msg = await channel.send({ embeds: [embed], components: [row] });
            activeGiveaways.set(msg.id, { prize, levelRequirement: levelReq, winnersCount, participants: [] });
            setTimeout(async () => {
                const gw = activeGiveaways.get(msg.id);
                if (!gw) return;
                const winners = [];
                const participants = gw.participants;
                if (participants.length > 0) {
                    const tempParticipants = [...participants];
                    for (let i = 0; i < Math.min(gw.winnersCount, participants.length); i++) {
                        const randomIndex = Math.floor(Math.random() * tempParticipants.length);
                        winners.push(`<@${tempParticipants.splice(randomIndex, 1)[0]}>`);
                    }
                }
                const endedEmbed = new EmbedBuilder().setTitle('🎉 انتهى السحب التفاعلي والـ Giveaway! 🎉').setDescription(`🏆 **الجائزة الموزعة:** **${gw.prize}**\n\n👥 **الفائزين المحظوظين:**\n${winners.length > 0 ? winners.join('\n') : 'لا يوجد فائزين'}`).setColor(0x94a3b8);
                const disabledRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway_btn').setLabel('انتهت المسابقة ❌').setStyle(ButtonStyle.Secondary).setDisabled(true));
                await msg.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => {});
                if (winners.length > 0) await channel.send(`🎉 مبارك الفوز لـ ${winners.join(', ')} بجائزة: **${gw.prize}**!`);
                activeGiveaways.delete(msg.id);
            }, duration * 60 * 1000);
        }

        if (commandName === 'daily') {
            const userData = await getUserData(guild.id, interaction.user.id);
            const now = new Date();
            if (userData.lastDaily) {
                const cooldown = 24 * 60 * 60 * 1000;
                const diff = now - new Date(userData.lastDaily);
                if (diff < cooldown) {
                    const timeLeft = cooldown - diff;
                    return interaction.reply({ content: `❌ لقد استلمت مكافأتك اليومية بالفعل! يرجى الانتظار **${Math.floor(timeLeft / (60 * 60 * 1000))} ساعة** للمطالبة بها مجدداً.`, ephemeral: true });
                }
            }
            const dailyAmount = Math.floor(Math.random() * 301) + 200;
            userData.coins += dailyAmount;
            userData.lastDaily = now;
            await saveUserData(guild.id, interaction.user.id, userData);
            await interaction.reply({ content: `🪙 تم استلام مكافأتك اليومية بنجاح! تم إيداع **${dailyAmount} BRQ Coins** في حسابك.` });
        }

        if (commandName === 'coins') {
            const targetUser = options.getUser('user') || interaction.user;
            const userData = await getUserData(guild.id, targetUser.id);
            await interaction.reply({ content: `💰 رصيد الحساب المالي لـ ${targetUser} الحالي هو: **${userData.coins} BRQ Coins**.` });
        }

        if (commandName === 'transfer') {
            const targetUser = options.getUser('user');
            const amount = options.getInteger('amount');
            if (targetUser.id === interaction.user.id) return interaction.reply({ content: '❌ لا يمكنك تحويل العملات إلى حسابك الشخصي!', ephemeral: true });
            if (amount <= 0) return interaction.reply({ content: '❌ يرجى كتابة مبلغ تحويل صحيح.', ephemeral: true });
            const senderData = await getUserData(guild.id, interaction.user.id);
            if (senderData.coins < amount) return interaction.reply({ content: `❌ رصيدك الحالي غير كافٍ.`, ephemeral: true });
            const receiverData = await getUserData(guild.id, targetUser.id);
            senderData.coins -= amount;
            receiverData.coins += amount;
            await saveUserData(guild.id, interaction.user.id, senderData);
            await saveUserData(guild.id, targetUser.id, receiverData);
            await interaction.reply({ content: `✅ تم بنجاح تحويل **${amount} BRQ Coins** إلى العضو ${targetUser}.` });
        }

        if (commandName === 'shop') {
            const embed = new EmbedBuilder()
                .setTitle('🛒 متجر رتب السيرفر التفاعلي | BRQ Shop 🛒')
                .setColor(0x06b6d4)
                .addFields(
                    { name: '🟢 الرتب المتاحة للشراء:', value: '• **Level 5 Member** ⬅️ القيمة: `1500` عملة\n• **Level 10 Member** ⬅️ القيمة: `3000` عملة\n• **Level 20 Member** ⬅️ القيمة: `6000` عملة' },
                    { name: '✨ رتب الـ VIP الفاخرة:', value: '• **VIP Elite** ⬅️ القيمة: `15000` عملة\n• **VIP Legendary** ⬅️ القيمة: `30000` عملة\n• **VIP Mythic** ⬅️ القيمة: `50000` عملة' }
                );
            await interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'buy') {
            const targetRole = options.getRole('role');
            const shopPrices = { \"Level 5 Member\": 1500, \"Level 10 Member\": 3000, \"Level 20 Member\": 6000, \"VIP Elite\": 15000, \"VIP Legendary\": 30000, \"VIP Mythic\": 50000 };
            const price = shopPrices[targetRole.name];
            if (!price) return interaction.reply({ content: '❌ هذه الرتبة غير معروضة للبيع.', ephemeral: true });
            if (member.roles.cache.has(targetRole.id)) return interaction.reply({ content: '❌ أنت تمتلك هذه الرتبة بالفعل!', ephemeral: true });
            const userData = await getUserData(guild.id, interaction.user.id);
            if (userData.coins < price) return interaction.reply({ content: `❌ رصيدك غير كافٍ.`, ephemeral: true });
            try {
                userData.coins -= price;
                await saveUserData(guild.id, interaction.user.id, userData);
                await member.roles.add(targetRole);
                await interaction.reply({ content: `🎉 مبارك! لقد قمت بشراء رتبة **${targetRole.name}** وتم خصم **${price} BRQ Coins**.` });
            } catch (e) { await interaction.reply({ content: '❌ فشل منح الرتبة، تأكد من ترتيب رتبة البوت.', ephemeral: true }); }
        }

        if (commandName === 'set_level_channel') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const targetChannel = options.getChannel('channel');
            try {
                const config = await getGuildConfig(guild.id);
                config.levelChannelId = targetChannel.id;
                await saveGuildConfig(guild.id, config);
                await interaction.reply({ content: `✅ تم بنجاح تحديد الغرفة ${targetChannel} لإشعارات زيادة المستوى.`, ephemeral: true });
            } catch (e) { await interaction.reply({ content: '❌ فشل الإعداد', ephemeral: true }); }
        }

        if (commandName === 'set_islamic_channel') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const targetChannel = options.getChannel('channel');
            try {
                const config = await getGuildConfig(guild.id);
                config.islamicChannelId = targetChannel.id;
                await saveGuildConfig(guild.id, config);
                await interaction.reply({ content: `✅ تم بنجاح تحديد الغرفة ${targetChannel} لنشر الآيات والأذكار.`, ephemeral: true });
            } catch (e) { await interaction.reply({ content: '❌ فشل الإعداد', ephemeral: true }); }
        }

        if (commandName === 'add_role_reward') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const targetRole = options.getRole('role');
            const messagesNeeded = options.getInteger('messages_needed');
            try {
                const config = await getGuildConfig(guild.id);
                if (!config.roleRewards) config.roleRewards = [];
                config.roleRewards = config.roleRewards.filter(r => r.roleId !== targetRole.id);
                config.roleRewards.push({ roleId: targetRole.id, messagesNeeded });
                await saveGuildConfig(guild.id, config);
                await interaction.reply({ content: `✅ تم بنجاح ربط الرتبة **${targetRole.name}** بـ **${messagesNeeded}** رسالة.`, ephemeral: true });
            } catch (e) { await interaction.reply({ content: '❌ فشل الربط', ephemeral: true }); }
        }

        if (commandName === 'rank') {
            await interaction.deferReply();
            const targetUser = options.getUser('user') || interaction.user;
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return interaction.followUp({ content: '❌ لم يتم العثور على هذا العضو.' });
            try {
                const userData = await getUserData(guild.id, targetUser.id);
                const nextLevelXP = userData.level * 150;
                const config = await getGuildConfig(guild.id);
                let rewardStatusText = 'لا توجد جوائز متبقية 👑';
                if (config && config.roleRewards && config.roleRewards.length > 0) {
                    const sortedRewards = [...config.roleRewards].sort((a, b) => a.messagesNeeded - b.messagesNeeded);
                    const nextReward = sortedRewards.find(r => userData.messageCount < r.messagesNeeded);
                    if (nextReward) {
                        const remaining = nextReward.messagesNeeded - userData.messageCount;
                        const role = guild.roles.cache.get(nextReward.roleId);
                        rewardStatusText = `بقي ${remaining} رسالة للوصول إلى: [ ${role ? role.name : 'رتبة'} ]`;
                    }
                }
                const canvas = createCanvas(1280, 543);
                const ctx = canvas.getContext('2d');
                const bg = await loadImage('./input_file_22.jpeg').catch(() => null);
                if (bg) ctx.drawImage(bg, 0, 0, 1280, 543);
                else { ctx.fillStyle = '#111726'; ctx.fillRect(0, 0, 1280, 543); }

                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 20;

                const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
                const avatarImage = await loadImage(avatarUrl).catch(() => null);
                ctx.save();
                ctx.beginPath();
                ctx.arc(190, 271.5, 95, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                if (avatarImage) ctx.drawImage(avatarImage, 95, 176.5, 190, 190);
                ctx.restore();

                ctx.shadowBlur = 0;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 38px sans-serif';
                ctx.fillText(targetUser.username, 360, 130);
                ctx.fillStyle = '#38bdf8';
                ctx.font = '24px sans-serif';
                ctx.fillText(`المستوى الحالي: ${userData.level}`, 360, 195);
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`الخبرة التراكمية: ${userData.xp} / ${nextLevelXP} XP`, 360, 255);
                ctx.fillText(`مجموع رسائل اليوم الكلي: ${userData.messageCount} رسالة`, 360, 315);
                ctx.fillStyle = '#22d3ee';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText(rewardStatusText, 360, 375);
                ctx.fillStyle = '#a855f7';
                ctx.font = 'bold 22px sans-serif';
                ctx.fillText(`ID: ${targetUser.id}`, 980, 60);

                const barWidth = 850;
                const barHeight = 24;
                const barX = 360;
                const barY = 430;
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barWidth, barHeight, 10);
                ctx.fill();
                const progressPercent = Math.min(userData.xp / nextLevelXP, 1);
                if (progressPercent > 0) {
                    const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
                    progressGradient.addColorStop(0, '#0ea5e9');
                    progressGradient.addColorStop(1, '#a855f7');
                    ctx.fillStyle = progressGradient;
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, barWidth * progressPercent, barHeight, 10);
                    ctx.fill();
                }
                const buffer = canvas.toBuffer('image/png');
                const attachment = new AttachmentBuilder(buffer, { name: `rank-${targetUser.id}.png` });
                await interaction.followUp({ files: [attachment] });
            } catch (err) { console.error(err); await interaction.followUp({ content: '❌ حدث خطأ' }); }
        }

        if (commandName === 'ban') {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ لا تملك صلاحية حظر الأعضاء.', ephemeral: true });
            const target = options.getMember('member');
            const reason = options.getString('reason') || 'لا يوجد سبب';
            if (!target) return interaction.reply({ content: '❌ لم يتم العثور على هذا العضو.', ephemeral: true });
            try {
                await target.ban({ reason });
                await interaction.reply({ content: `✅ تم حظر ${target} بنجاح. السبب: ${reason}` });
            } catch (e) { await interaction.reply({ content: `❌ فشل الحظر: ${e.message}`, ephemeral: true }); }
        }

        if (commandName === 'timeout') {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ لا تملك صلاحية كتم الأعضاء.', ephemeral: true });
            const target = options.getMember('member');
            const minutes = options.getInteger('minutes');
            const reason = options.getString('reason') || 'لا يوجد سبب';
            if (!target) return interaction.reply({ content: '❌ لم يتم العثور على هذا العضو.', ephemeral: true });
            try {
                const duration = minutes * 60 * 1000;
                await target.timeout(duration, reason);
                await interaction.reply({ content: `✅ تم كتم ${target} بنجاح لـ ${minutes} دقيقة.` });
            } catch (e) { await interaction.reply({ content: `❌ فشل الكتم: ${e.message}`, ephemeral: true }); }
        }

        if (commandName === 'delete_all_channels') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            await interaction.reply({ content: '⏳ جاري مسح القنوات...', ephemeral: true });
            try {
                const channels = await guild.channels.fetch();
                for (const ch of channels.values()) { if (ch) await ch.delete().catch(() => {}); }
            } catch (e) { console.error(e); }
        }

        if (commandName === 'delete_channel') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const targetCh = options.getChannel('channel');
            try { await targetCh.delete(); await interaction.reply({ content: `✅ تم الحذف!`, ephemeral: true }); } catch (e) { await interaction.reply({ content: '❌ فشل', ephemeral: true }); }
        }

        if (commandName === 'delete_all_roles') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            await interaction.reply({ content: '⏳ جاري مسح الرتب...', ephemeral: true });
            try {
                const roles = await guild.roles.fetch();
                for (const role of roles.values()) {
                    if (role.id !== guild.roles.everyone.id && !role.managed && role.editable) {
                        await role.delete().catch(() => {});
                        await sleep(150);
                    }
                }
                await interaction.followUp({ content: '✅ تم مسح الرتب بنجاح!', ephemeral: true });
            } catch (e) { console.error(e); }
        }

        if (commandName === 'setup_server') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            await interaction.reply({ content: '⏳ جاري تهيئة السيرفر بالكامل وإنشاء 100 رتبة وبناء الرومات وتوزيع الصلاحيات الصارمة، يرجى الانتظار...', ephemeral: true });
            try {
                const createdManagementRoles = {};
                for (const roleName of MANAGEMENT_ROLES) {
                    const role = await guild.roles.create({ name: roleName, color: 0x3498DB });
                    createdManagementRoles[roleName] = role;
                    await sleep(150);
                }
                const createdMemberRoles = {};
                for (const roleName of MEMBER_ROLES) {
                    // how\n\n// for items
                    const role = await guild.roles.create({ name: roleName, color: 0x2ECC71 });
                    createdMemberRoles[roleName] = role;
                    await sleep(150);
                }
                const ownerRole = createdManagementRoles[\"Owner\"];
                const highAdminRole = createdManagementRoles[\"High Admin\"];
                const adminRole = createdManagementRoles[\"Admin\"];
                const staffRole = createdManagementRoles[\"Staff\"];
                const middlemanRole = createdManagementRoles[\"Middleman (الوسيط)\"];
                const mmManagerRole = createdManagementRoles[\"Middleman Manager\"];

                for (const group of STRUCTURE) {
                    let category = null;
                    let overwrites = [];
                    if (group.category === \"👑 | Owner\") {
                        overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
                        if (ownerRole) overwrites.push({ id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                    } else if (group.category === \"🛠️ | Staff\" || group.category === \"🛠️ | Logo\") {
                        overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
                        if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (highAdminRole) overwrites.push({ id: highAdminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (ownerRole) overwrites.push({ id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                    } else if (group.category === \"⚖️ | BRQ - Meditators\") {
                        overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
                        if (middlemanRole) overwrites.push({ id: middlemanRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (mmManagerRole) overwrites.push({ id: mmManagerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        if (ownerRole) overwrites.push({ id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                    }
                    if (group.category) {
                        category = await guild.channels.create({ name: group.category, type: ChannelType.GuildCategory, permissionOverwrites: overwrites });
                        await sleep(500);
                    }
                    for (const ch of group.channels) {
                        await guild.channels.create({
                            name: ch.name,
                            type: ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
                            parent: category ? category.id : null,
                            userLimit: ch.userLimit || undefined,
                            permissionOverwrites: category ? category.permissionOverwrites.cache.map(o => o) : []
                        });
                        await sleep(500);
                    }
                }

                const config = await getGuildConfig(guild.id);
                config.roleRewards = [];
                const defaultRewardsLayout = [
                    { name: \"Level 1 Member\", messages: 50 },
                    { name: \"Level 5 Member\", messages: 150 },
                    { name: \"Level 10 Member\", messages: 300 },
                    { name: \"Level 15 Member\", messages: 500 },
                    { name: \"Level 20 Member\", messages: 750 },
                    { name: \"Level 25 Member\", messages: 1000 },
                    { name: \"VIP Elite\", messages: 1500 },
                    { name: \"VIP Legendary\", messages: 2000 },
                    { name: \"VIP Mythic\", messages: 3000 }
                ];
                let rewardListDescription = '';
                for (const item of defaultRewardsLayout) {
                    const role = createdMemberRoles[item.name];
                    if (role) {
                        config.roleRewards.push({ roleId: role.id, messagesNeeded: item.messages });
                        rewardListDescription += `• عند الوصول إلى **${item.messages}** رسالة ⬅️ تُمنح تلقائياً رتبة **${role.name}**\\n`;
                    }
                }
                await saveGuildConfig(guild.id, config);

                const guideCategory = guild.channels.cache.find(c => c.name === '🌍 | Start' && c.type === ChannelType.GuildCategory);
                const guideChannel = await guild.channels.create({ name: '🔒・إرشادات • المستويات', type: ChannelType.GuildText, parent: guideCategory ? guideCategory.id : null });
                const guideEmbed = new EmbedBuilder()
                    .setTitle('📊 دليل ومكافآت نظام المستويات والتفاعل بالسيرفر')
                    .setDescription('تم تفعيل نظام تفاعلي متطور يمنحكم نقاط خبرة ورتباً بشكل ذاتي عند تفاعلكم لضمان الشفافية والوضوح للجميع.')
                    .setColor(0xa855f7)
                    .addFields(
                        { name: '📈 كيف يعمل نظام المستويات؟', value: 'كل رسالة ترسلها في رومات السيرفر تمنحك نقاط خبرة عشوائية وتزيد رسائلك. تفقّد بطاقتك الشخصية وصورتك عبر الأمر: `/rank`' },
                        { name: '🎁 مكافآت الرتب التفاعلية التلقائية (Milestones):', value: rewardListDescription || 'سيتم إدراج الرتب هنا تلقائياً.' },
                        { name: '🏆 الترقية الفورية والجوائز:', value: 'يقوم البوت تلقائياً بتحديث رتبتك ومنحك الرتب التفاعلية بمجرد بلوغك لعدد الرسائل الموضح أعلاه فوراً مع منشن وإشعار مصور رائع.' }
                    );
                await guideChannel.send({ embeds: [guideEmbed] });
                await interaction.followUp({ content: '✅ تم التهيئة بالكامل بنجاح!', ephemeral: true });
            } catch (e) { console.error(e); await interaction.followUp({ content: `❌ حدث خطأ: ${e.message}`, ephemeral: true }); }
        }

        if (commandName === 'setup_ticket') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle('تذكرة الدعم الفني | Tickets Panel 🎫')
                .setDescription('يرجى فتح تذكرة عبر الضغط على الزر أدناه وسيقوم فريق العمل بتقديم المساعدة.')
                .setColor(0x0099FF);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('إنشاء تذكرة 🎫').setStyle(ButtonStyle.Success));
            try {
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ تم إرسال لوحة التحكم بالتذاكر بنجاح!', ephemeral: true });
            } catch (e) { await interaction.reply({ content: '❌ خطأ', ephemeral: true }); }
        }

        if (commandName === 'setup_middleman_panel') {
            if (!isAdministrator) return interaction.reply({ content: '❌ هذا الأمر مخصص للإداريين فقط!', ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle('⚖️ بوابة صفقات الوسطاء المعتمدين الآمنة ⚖️')
                .setDescription('تجنب النصب! يرجى الضغط على الزر بالأسفل لفتح تذكرة طلب وساطة رسمية للتنسيق تحت إشراف طاقم وسطائنا المعتمدين.')
                .setColor(0x00AAAA);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('request_middleman_btn').setLabel('طلب وسيط معتمد ⚖️').setStyle(ButtonStyle.Primary));
            try {
                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ تم إرسال لوحة الوسطاء بنجاح!', ephemeral: true });
            } catch (e) { await interaction.reply({ content: '❌ خطأ', ephemeral: true }); }
        }
    }
});

// تشغيل وتمرير البيانات للداش بورد
const startDashboard = require('./server.js');
startDashboard(client, getGuildConfig, saveGuildConfig);

const TOKEN = process.env.DISCORD_TOKEN || 'ضع_توكن_البوت_الخاص_بِك_هنا';
client.login(TOKEN);\n(TOKEN);"
  }
]