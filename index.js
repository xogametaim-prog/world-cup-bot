/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                      SYSTEM BOT - ULTIMATE FIX                       ║
 * ║         Developed by Taim (Lead Developer & Founder)                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const { 
  Client, GatewayIntentBits, REST, Routes, EmbedBuilder, 
  PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  StringSelectMenuBuilder, ChannelType, SlashCommandBuilder 
} = require('discord.js');
const fs = require('fs');
const http = require('http');

// [1] سيرفر وهمي للأب تايم
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('System Bot is Online! 🚀');
});
server.listen(process.env.PORT || 3000);

// [2] إعداد البوت والـ Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// تأكد 100% أن هذه القيم صحيحة
const TOKEN = process.env.TOKEN; 
const CLIENT_ID = "1254845579979329618"; // آيدي بوتك

// دالة الداتا بيز
function getDB() {
  try { return JSON.parse(fs.readFileSync('./db.json', 'utf8')); }
  catch(e) { return { warns: {}, vouchers: {}, replies: {}, tickets: {}, ticketConfig: {}, userMessages: {}, levelConfig: {} }; }
}
function saveDB(db) { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

// [3] تعريف الأوامر
const commands = [
  new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('إعداد لوحة التكتات بقائمة منسدلة')
    .addStringOption(o => o.setName('title').setRequired(true).setDescription('العنوان'))
    .addStringOption(o => o.setName('description').setRequired(true).setDescription('الوصف'))
    .addStringOption(o => o.setName('options').setRequired(true).setDescription('الأقسام (مثال: دعم,شكاوي)'))
    .addRoleOption(o => o.setName('staff-role').setRequired(true).setDescription('رتبة الإدارة'))
    .addStringOption(o => o.setName('image').setDescription('رابط الصورة')),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('إرسال إيمبد احترافي')
    .addStringOption(o => o.setName('title').setRequired(true).setDescription('العنوان'))
    .addStringOption(o => o.setName('description').setRequired(true).setDescription('الوصف'))
    .addStringOption(o => o.setName('image').setDescription('رابط الصورة')),

  new SlashCommandBuilder()
    .setName('setup-levels')
    .setDescription('إعداد نظام الـ 10 رتب')
    .addChannelOption(o => o.setName('log-channel').setRequired(true).setDescription('روم التبريكات'))
    .addRoleOption(o => o.setName('role1').setRequired(true).setDescription('رتبة 1')).addIntegerOption(o => o.setName('messages1').setRequired(true).setDescription('رسائل 1')),

  new SlashCommandBuilder()
    .setName('voucher')
    .setDescription('تحديد روم السجل')
    .addChannelOption(o => o.setName('channel').setRequired(true).setDescription('الروم')),

  new SlashCommandBuilder()
    .setName('info')
    .setDescription('معلومات المطور تيم')
].map(command => command.toJSON());

// [4] حدث التشغيل وتسجيل الأوامر
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} جاهز للعمل!`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('⏳ جاري تحديث الأوامر...');
    
    // تسجيل الأوامر بشكل "عالمي"
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    
    console.log('🎉 تم تحديث الأوامر بنجاح! جرب الحين اكتب / بالسيرفر.');
  } catch (err) {
    console.error('❌ فشل تسجيل الأوامر:', err);
  }
});

// [5] استقبال الأوامر
client.on('interactionCreate', async interaction => {
  const db = getDB();
  const guildId = interaction.guildId;

  if (interaction.isChatInputCommand()) {
    // الحماية: فقط الإدارة تستخدم الأوامر إلا أمر info
    const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    if (interaction.commandName !== 'info' && !hasAdmin) {
      return interaction.reply({ content: '❌ للأدمن فقط!', ephemeral: true });
    }

    if (interaction.commandName === 'info') {
      await interaction.reply('👨‍💻 المطور: تيم | فريق TRL.dev');
    }

    if (interaction.commandName === 'embed') {
      const embed = new EmbedBuilder()
        .setTitle(interaction.options.getString('title'))
        .setDescription(interaction.options.getString('description'))
        .setColor('#00ffcc');
      const img = interaction.options.getString('image');
      if (img) embed.setImage(img);
      await interaction.channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ تم الإرسال', ephemeral: true });
    }
    
    // يمكنك إضافة باقي الأوامر هنا بنفس الطريقة
  }

  // نظام التكت (القائمة المنسدلة)
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_select_')) {
    // كود فتح التكت اللي شرحناه سابقاً
    await interaction.reply({ content: '⏳ جاري فتح تذكرتك...', ephemeral: true });
  }
});

client.login(TOKEN);
