const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

function getDB() { return JSON.parse(fs.readFileSync('./db.json', 'utf8')); }
function saveDB(db) { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

module.exports = {
  // 1. أمر الباند
  'ban': {
    name: 'ban',
    shortcuts: ['باند', 'حظر', 'ب'],
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('حظر عضو من السيرفر')
      .addUserOption(opt => opt.setName('user').setDescription('العضو المراد حظره').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    executeSlash: async (interaction) => {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      await interaction.guild.members.ban(user, { reason });
      interaction.reply(`✅ تم حظر الحساب ${user.tag} بنجاح من السيرفر.`);
    },
    executeMessage: async (message, args) => {
      const user = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
      if (!user) return message.reply('❌ يرجى منشن العضو أو كتابة الآيدي الخاص به.');
      const reason = args.slice(1).join(' ') || 'بدون سبب';
      await message.guild.members.ban(user, { reason });
      message.reply(`✅ تم حظر الحساب **${user.tag}** بنجاح.`);
    }
  },

  // 2. أمر فك الباند
  'unban': {
    name: 'unban',
    shortcuts: ['فك-باند', 'ف-ب'],
    data: new SlashCommandBuilder()
      .setName('unban')
      .setDescription('إلغاء حظر عضو من السيرفر')
      .addStringOption(opt => opt.setName('userid').setDescription('آيدي الحساب المراد إلغاء حظره').setRequired(true)),
    executeSlash: async (interaction) => {
      const userId = interaction.options.getString('userid');
      await interaction.guild.members.unban(userId);
      interaction.reply(`✅ تم فك الحظر عن الآيدي \`${userId}\` بنجاح.`);
    },
    executeMessage: async (message, args) => {
      if (!args[0]) return message.reply('❌ يرجى إدخال آيدي الحساب لفك الحظر.');
      await message.guild.members.unban(args[0]);
      message.reply(`✅ تم فك الحظر عن الآيدي \`${args[0]}\` بنجاح.`);
    }
  },

  // 3. أمر الطرد
  'kick': {
    name: 'kick',
    shortcuts: ['طرد', 'ط'],
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('طرد عضو من السيرفر')
      .addUserOption(opt => opt.setName('user').setDescription('العضو المراد طرده').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    executeSlash: async (interaction) => {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ العضو ليس موجوداً في السيرفر.', ephemeral: true });
      await member.kick(reason);
      interaction.reply(`✅ تم طرد العضو ${user.tag} من السيرفر.`);
    },
    executeMessage: async (message, args) => {
      const user = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
      if (!user) return message.reply('❌ يرجى تحديد العضو عن طريق المنشن أو الآيدي.');
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return message.reply('❌ العضو غير متواجد.');
      const reason = args.slice(1).join(' ') || 'بدون سبب';
      await member.kick(reason);
      message.reply(`✅ تم طرد العضو **${user.tag}** بنجاح.`);
    }
  },

  // 4. أمر الميوت
  'mute': {
    name: 'mute',
    shortcuts: ['ميوت', 'اسكات', 'م'],
    data: new SlashCommandBuilder()
      .setName('mute')
      .setDescription('إعطاء ميوت (تايم آوت) لعضو')
      .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(opt => opt.setName('time').setDescription('الوقت بالدقائق').setRequired(true)),
    executeSlash: async (interaction) => {
      const user = interaction.options.getUser('user');
      const time = interaction.options.getInteger('time');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ العضو غير متواجد.', ephemeral: true });
      await member.timeout(time * 60 * 1000, 'أمر ميوت إداري');
      interaction.reply(`✅ تم إعطاء ميوت للعضو ${user.tag} لمدة ${time} دقيقة.`);
    },
    executeMessage: async (message, args) => {
      const user = message.mentions.users.first();
      const time = parseInt(args[1]);
      if (!user || isNaN(time)) return message.reply('❌ الإستخدام الصحيح: `ميوت @العضو الدقائق` أو `mute @user 10`');
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return message.reply('❌ العضو غير متواجد.');
      await member.timeout(time * 60 * 1000, 'أمر ميوت إداري');
      message.reply(`✅ تم إعطاء ميوت للعضو **${user.tag}** لمدة ${time} دقيقة.`);
    }
  },

  // 5. أمر فك الميوت
  'unmute': {
    name: 'unmute',
    shortcuts: ['فك-ميوت', 'ف-م'],
    data: new SlashCommandBuilder()
      .setName('unmute')
      .setDescription('إزالة الميوت والتايم آوت عن العضو فوراً')
      .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    executeSlash: async (interaction) => {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ العضو غير متواجد.', ephemeral: true });
      await member.timeout(null);
      interaction.reply(`✅ تم فك الميوت عن العضو ${user.tag}.`);
    },
    executeMessage: async (message, args) => {
      const user = message.mentions.users.first();
      if (!user) return message.reply('❌ يرجى منشن العضو لفك الميوت.');
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return message.reply('❌ العضو غير متواجد.');
      await member.timeout(null);
      message.reply(`✅ تم فك الميوت عن العضو **${user.tag}**.`);
    }
  },

  // 6. أمر التحذير
  'warn': {
    name: 'warn',
    shortcuts: ['تحذير', 'ت'],
    data: new SlashCommandBuilder()
      .setName('warn')
      .setDescription('توجيه تحذير رسمي للعضو')
      .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    executeSlash: async (interaction) => {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      const db = getDB();
      if (!db.warns[user.id]) db.warns[user.id] = [];
      db.warns[user.id].push({ guild: interaction.guild.id, reason, date: new Date().toLocaleDateString() });
      saveDB(db);
      interaction.reply(`⚠️ تم تسجيل تحذير ضد العضو ${user.tag} بسبب: ${reason}`);
    },
    executeMessage: async (message, args) => {
      const user = message.mentions.users.first();
      if (!user) return message.reply('❌ يرجى منشن العضو المراد تحذيره.');
      const reason = args.slice(1).join(' ') || 'بدون سبب';
      const db = getDB();
      if (!db.warns[user.id]) db.warns[user.id] = [];
      db.warns[user.id].push({ guild: message.guild.id, reason, date: new Date().toLocaleDateString() });
      saveDB(db);
      message.reply(`⚠️ تم تسجيل تحذير ضد العضو **${user.tag}** بسبب: ${reason}`);
    }
  },

  // 7. أمر مسح الرسائل والتطهير
  'clear': {
    name: 'clear',
    shortcuts: ['مسح', 'تطهير', 'ص'],
    data: new SlashCommandBuilder()
      .setName('clear')
      .setDescription('مسح وتطهير كمية محددة من الرسائل بالشات')
      .addIntegerOption(opt => opt.setName('amount').setDescription('عدد الرسائل (1 - 100)').setRequired(true)),
    executeSlash: async (interaction) => {
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ يرجى اختيار رقم بين 1 و 100.', ephemeral: true });
      await interaction.channel.bulkDelete(amount, true);
      interaction.reply({ content: `🧹 تم مسح وتطهير **${amount}** رسالة بنجاح!`, ephemeral: true });
    },
    executeMessage: async (message, args) => {
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ يرجى كتابة عدد رسائل صحيح بين 1 و 100 للمسح.');
      await message.channel.bulkDelete(amount, true);
      const replyMsg = await message.channel.send(`🧹 تم مسح وتطهير **${amount}** رسالة بنجاح!`);
      setTimeout(() => replyMsg.delete().catch(() => null), 3000);
    }
  },

  // 8. أمر قفل الروم
  'lock': {
    name: 'lock',
    shortcuts: ['قفل', 'ق'],
    data: new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالية ومنع الأعضاء من الكتابة'),
    executeSlash: async (interaction) => {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      interaction.reply('🔒 تم قفل هذه الروم بنجاح، لا يمكن للأعضاء الكتابة حالياً.');
    },
    executeMessage: async (message) => {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      message.reply('🔒 تم قفل هذه الروم بنجاح.');
    }
  },

  // 9. أمر فتح الروم
  'unlock': {
    name: 'unlock',
    shortcuts: ['فتح', 'ف'],
    data: new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم المغلقة للسماح للأعضاء بالكتابة'),
    executeSlash: async (interaction) => {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      interaction.reply('🔓 تم فتح الروم بنجاح، بإمكان الأعضاء الكتابة الآن.');
    },
    executeMessage: async (message) => {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
      message.reply('🔓 تم فتح الروم بنجاح.');
    }
  },

  // 10. أمر عرض الإنفو الفخم الخاص بك (Taim / TRL.dev)
  'info': {
    name: 'info',
    shortcuts: ['انفو', 'معلومات', 'ا'],
    data: new SlashCommandBuilder().setName('info').setDescription('عرض ملف المطور الشخصي لـ تيم ومعلومات فريق TRL.dev'),
    executeSlash: async (interaction) => {
      const embed = createInfoEmbed();
      interaction.reply({ embeds: [embed] });
    },
    executeMessage: async (message) => {
      const embed = createInfoEmbed();
      message.reply({ embeds: [embed] });
    }
  }
};

// تابع لإنشاء إيمبد معلومات المطور تيم وفريق TRL.dev
function createInfoEmbed() {
  return new EmbedBuilder()
    .setTitle('📋 الملف الشخصي والمعلومات الأساسية')
    .setColor('#7289da')
    .setThumbnail('https://i.imgur.com/wSTFkRM.png') // رابط صورة افتراضي أو ضع أي رابط تريده
    .addFields(
      { name: '👤 الاسم', value: 'تيم (Taim)', inline: true },
      { name: '🛠️ المسمى التقني', value: 'مؤسس وقائد فريق TRL.dev (Lead Developer)', inline: true },
      { name: '📧 البريد الإلكتروني', value: 'hacked909h@gmail.com', inline: false },
      { name: '⚡ المهارات والقدرات التقنية', value: '• تطوير وبرمجة بوتات منصة Discord و Twitch\n• تصميم وتطوير مواقع الويب والتطبيقات (HTML, CSS, JavaScript)\n• تطوير وبناء الألعاب الرقمية\n• إتقان لغات البرمجة: Python, JavaScript\n• التعامل مع أدوات التطوير: GitHub, Replit, Google AI Studio' },
      { name: '🚀 المشاريع والإنجازات (تحت مظلة TRL.dev)', value: '• **بوتات إدارة الخوادم والأنظمة:** تطوير وبرمجة بوتات مخصصة لإدارة خوادم الديسكورد والتحكم بالصلاحيات الإدارية، حماية السيرفرات، وأنظمة التحقق الفوري.\n• **بوت كأس العالم:** تطوير بوت متخصص بمتابعة وجدولة مباريات كأس العالم، تزويد المستخدمين بالنتائج وتفاصيل البطولة تلقائياً.\n• **بوت Gangster bot:** بناء وتطوير البوت الخاص بالفريق وتحديث ميزاته البرمجية باستمرار.\n• **لوحات التحكم الذكية (Dashboards):** تصميم وبرمجة لوحات تحكم ويب لربط البوتات وإدارتها بسهولة عبر الإنترنت.' }
    )
    .setFooter({ text: 'system bot for all • Powered by TRL.dev' })
    .setTimestamp();
}
