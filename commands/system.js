const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');

function getDB() { 
  try {
    return JSON.parse(fs.readFileSync('./db.json', 'utf8')); 
  } catch(e) {
    return { warns: {}, vouchers: {}, replies: {}, tickets: {}, ticketConfig: {}, userMessages: {}, levelConfig: {} };
  }
}
function saveDB(db) { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }

async function sendVoucher(guild, title, description, color = '#ff0000') {
  try {
    const db = getDB();
    if (!db.vouchers || !db.vouchers[guild.id]) return;
    const channelId = db.vouchers[guild.id];
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle(`📜 سجل العمليات | ${title}`)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  } catch(err) { console.error(err); }
}

module.exports = {
  // 1. نظام إعداد التذاكر بالقائمة المنسدلة والصور
  'setup-ticket': {
    name: 'setup-ticket',
    data: new SlashCommandBuilder()
      .setName('setup-ticket')
      .setDescription('إعداد لوحة التكتات بقائمة منسدلة احترافية مع دعم الصور')
      .addStringOption(o => o.setName('title').setRequired(true).setDescription('عنوان اللوحة الإيمبد'))
      .addStringOption(o => o.setName('description').setRequired(true).setDescription('وصف اللوحة والتعليمات'))
      .addStringOption(o => o.setName('image').setDescription('رابط الصورة المخصصة للوحة (اختياري)'))
      .addStringOption(o => o.setName('options').setDescription('اكتب أسماء الأقسام وافصل بينها بفاصلة (مثال: دعم فني,شكاوي,تقديم)').setRequired(true))
      .addRoleOption(o => o.setName('staff-role').setDescription('الرتبة المسؤول عن استلام هذه التذاكر').setRequired(true)),

    executeSlash: async (interaction) => {
      try {
        const title = interaction.options.getString('title');
        const desc = interaction.options.getString('description');
        const img = interaction.options.getString('image');
        const staffRole = interaction.options.getRole('staff-role');
        const rawOptions = interaction.options.getString('options').split(',');

        const db = getDB();
        if (!db.ticketConfig) db.ticketConfig = {};
        if (!db.ticketConfig[interaction.guild.id]) db.ticketConfig[interaction.guild.id] = {};

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`ticket_select_${interaction.guild.id}`)
          .setPlaceholder('Choose an option... 🎫');

        rawOptions.forEach((opt, index) => {
          const trimmed = opt.trim();
          if (trimmed.length > 0) {
            const valueId = `opt_${index}_${Date.now()}`;
            selectMenu.addOptions({
              label: trimmed,
              description: `اضغط لفتح تذكرة في قسم ${trimmed}`,
              value: valueId
            });
            // حفظ الرتبة والاسم لكل خيار بالقائمة المنسدلة
            db.ticketConfig[interaction.guild.id][valueId] = { roleId: staffRole.id, name: trimmed };
          }
        });

        saveDB(db);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor('#2f3136');
        if (img) embed.setImage(img);

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ تم إنشاء لوحة التكتات بالقائمة المنسدلة بنجاح!', ephemeral: true });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء إعداد اللوحة.', ephemeral: true });
      }
    }
  },

  // 2. أمر الـ Embed المطور لإرسال أي رسالة مع بوكس مخصص للصورة
  'embed': {
    name: 'embed',
    data: new SlashCommandBuilder()
      .setName('embed')
      .setDescription('إرسال رسالة إيمبد مخصصة مع بوكس للصورة')
      .addStringOption(o => o.setName('title').setRequired(true).setDescription('عنوان الرسالة'))
      .addStringOption(o => o.setName('description').setRequired(true).setDescription('محتوى الرسالة ووصفها'))
      .addStringOption(o => o.setName('image').setDescription('رابط الصورة (Image URL) واكتبه عادي بالبوكس')),

    executeSlash: async (interaction) => {
      try {
        const title = interaction.options.getString('title');
        const desc = interaction.options.getString('description');
        const img = interaction.options.getString('image');

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor('#5865F2')
          .setTimestamp();

        if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
          embed.setImage(img);
        }

        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ تم إرسال رسالة الإيمبد بنجاح!', ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: '❌ فشل إرسال الإيمبد، تأكد من صحة الرابط.', ephemeral: true });
      }
    }
  },

  // 3. نظام إعداد ليفلات الرسائل والـ 10 رتب
  'setup-levels': {
    name: 'setup-levels',
    data: new SlashCommandBuilder()
      .setName('setup-levels')
      .setDescription('إعداد نظام الرتب لـ 10 رتب مخصصة حسب عدد الرسائل')
      .addChannelOption(o => o.setName('log-channel').setDescription('روم إرسال التبريكات بالترقية').setRequired(true))
      .addRoleOption(o => o.setName('role1').setDescription('الرتبة 1').setRequired(true))
      .addIntegerOption(o => o.setName('messages1').setDescription('الرسائل المطلوبة للرتبة 1').setRequired(true))
      .addRoleOption(o => o.setName('role2').setDescription('الرتبة 2')).addIntegerOption(o => o.setName('messages2').setDescription('رسائل 2'))
      .addRoleOption(o => o.setName('role3').setDescription('الرتبة 3')).addIntegerOption(o => o.setName('messages3').setDescription('رسائل 3'))
      .addRoleOption(o => o.setName('role4').setDescription('الرتبة 4')).addIntegerOption(o => o.setName('messages4').setDescription('رسائل 4'))
      .addRoleOption(o => o.setName('role5').setDescription('الرتبة 5')).addIntegerOption(o => o.setName('messages5').setDescription('رسائل 5'))
      .addRoleOption(o => o.setName('role6').setDescription('الرتبة 6')).addIntegerOption(o => o.setName('messages6').setDescription('رسائل 6'))
      .addRoleOption(o => o.setName('role7').setDescription('الرتبة 7')).addIntegerOption(o => o.setName('messages7').setDescription('رسائل 7'))
      .addRoleOption(o => o.setName('role8').setDescription('الرتبة 8')).addIntegerOption(o => o.setName('messages8').setDescription('رسائل 8'))
      .addRoleOption(o => o.setName('role9').setDescription('الرتبة 9')).addIntegerOption(o => o.setName('messages9').setDescription('رسائل 9'))
      .addRoleOption(o => o.setName('role10').setDescription('الرتبة 10')).addIntegerOption(o => o.setName('messages10').setDescription('رسائل 10')),

    executeSlash: async (interaction) => {
      try {
        const logChannel = interaction.options.getChannel('log-channel');
        const db = getDB();
        if (!db.levelConfig) db.levelConfig = {};
        
        db.levelConfig[interaction.guild.id] = { channelId: logChannel.id, roles: [] };

        for (let i = 1; i <= 10; i++) {
          const role = interaction.options.getRole(`role${i}`);
          const msgs = interaction.options.getInteger(`messages${i}`);
          if (role && msgs) {
            db.levelConfig[interaction.guild.id].roles.push({ roleId: role.id, requiredMessages: msgs });
          }
        }
        db.levelConfig[interaction.guild.id].roles.sort((a, b) => a.requiredMessages - b.requiredMessages);
        saveDB(db);

        await interaction.reply({ content: `✅ تم تفعيل إعدادات الليفلات بنجاح وروم التبريكات هو: ${logChannel}`, ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء إعداد الليفلات.', ephemeral: true });
      }
    }
  },

  // أمر الفاوتشر المساعد
  'voucher': {
    name: 'voucher',
    data: new SlashCommandBuilder().setName('voucher').setDescription('تحديد روم الحالية لتكون روم سجل العمليات').addChannelOption(o => o.setName('channel').setRequired(true).setDescription('الروم')),
    executeSlash: async (interaction) => {
      const channel = interaction.options.getChannel('channel');
      const db = getDB(); if (!db.vouchers) db.vouchers = {};
      db.vouchers[interaction.guild.id] = channel.id; saveDB(db);
      await interaction.reply(`✅ تم اعتماد الروم ${channel} للـ **voucher**.`);
    }
  },

  'info': {
    name: 'info',
    data: new SlashCommandBuilder().setName('info').setDescription('عرض ملف المطور الشخصي لـ تيم والمعلومات الأساسية لـ TRL.dev'),
    executeSlash: async (interaction) => {
      const embed = new EmbedBuilder()
        .setTitle('📋 الملف الشخصي والمعلومات الأساسية')
        .setColor('#5865F2')
        .addFields(
          { name: '👤 الاسم', value: 'تيم (Taim)', inline: true },
          { name: '🛠️ المسمى التقني', value: 'مؤسس وقائد فريق TRL.dev (Lead Developer)', inline: true },
          { name: '⚡ المهارات والقدرات', value: '• تطوير وبرمجة بوتات ديسكورد و Twitch وتطبيقات الويب والألعاب الرقمية.' }
        )
        .setFooter({ text: 'system bot for all • Powered by TRL.dev' });
      await interaction.reply({ embeds: [embed] });
    }
  }
};
