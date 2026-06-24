const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Routes, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType 
} = require('discord.js');
const fs = require('fs');
const http = require('http');
const config = require('./config.json');

// تشغيل سيرفر ويب وهمي للحفاظ على استمرارية البوت على ريندر
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('System Bot Operational 🚀\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
const commandsData = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const cmds = require(`./commands/${file}`);
  for (const key in cmds) {
    client.commands.set(key, cmds[key]);
    if (cmds[key].data) commandsData.push(cmds[key].data.toJSON());
  }
}

client.once('ready', async () => {
  console.log(`🤖 Connected as ${client.user.username}`);
  const rest = new REST({ version: '10' }).setToken(client.token);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
    console.log('✅ Registered All Commands Smoothly.');
  } catch (error) { console.error(error); }
});

// استقبال التفاعلات (أمر السلاش، القائمة المنسدلة، أزرار التكت)
client.on('interactionCreate', async interaction => {
  const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasRole = interaction.member.roles.cache.some(r => r.name === 'System Control');
    if (interaction.commandName !== 'info' && !hasAdmin && !hasRole) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة أو لمن يمتلك رتبة `System Control` فقط!', ephemeral: true });
    }
    try { await command.executeSlash(interaction); } catch (e) { console.error(e); }
    return;
  }

  // أولاً: فتح التكت عند الاختيار من القائمة المنسدلة
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_select_')) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const selectedValue = interaction.values[0];

    if (!db.tickets) db.tickets = {};
    const hasOpenTicket = Object.values(db.tickets).some(t => t.ownerId === userId && t.guildId === guildId && t.status === 'open');
    if (hasOpenTicket) {
      return interaction.reply({ content: '❌ لا يمكنك فتح أكثر من تذكرة واحدة في نفس الوقت!', ephemeral: true });
    }

    const configData = db.ticketConfig?.[guildId]?.[selectedValue];
    if (!configData) return interaction.reply({ content: '❌ حدث خطأ في التعرف على إعدادات هذا القسم.', ephemeral: true });

    const { roleId, name: sectionName } = configData;

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${sectionName}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...(roleId ? [{ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
      ]
    });

    db.tickets[ticketChannel.id] = {
      guildId,
      ownerId: userId,
      claimedBy: null,
      status: 'open',
      roleId: roleId
    };
    fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التكت 🛡️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التكت 🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ping_owner').setLabel('نداء العضو 🔔').setStyle(ButtonStyle.Secondary)
    );

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎫 تذكرة جديدة | قسم: ${sectionName}`)
      .setDescription(`مرحباً بك ${interaction.user} في تذكرتك المخصصة.\nالرجاء كتابة تفاصيل مشكلتك هنا بوضوح وانتظار الدعم المسؤول.\n\n⚠️ **الدعم المسؤول:** <@&${roleId}>`)
      .setColor('#3498db')
      .setTimestamp();

    await ticketChannel.send({ content: `${interaction.user} | <@&${roleId}>`, embeds: [welcomeEmbed], components: [controlRow] });
    await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح في قناة: ${ticketChannel}`, ephemeral: true });
    return;
  }

  // ثانياً: أزرار التحكم داخل التكت وحماية زر الإغلاق لـ تيم
  if (interaction.isButton()) {
    const channelId = interaction.channel.id;
    const ticket = db.tickets?.[channelId];
    if (!ticket) return;

    const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasTicketRole = ticket.roleId ? interaction.member.roles.cache.has(ticket.roleId) : interaction.member.roles.cache.some(r => r.name === 'System Control');

    if (interaction.customId === 'claim_ticket') {
      if (!hasAdmin && !hasTicketRole) {
        return interaction.reply({ content: '❌ ليس لديك الصلاحية لاستلام هذه التذكرة!', ephemeral: true });
      }
      ticket.claimedBy = interaction.user.id;
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
      await interaction.reply({ content: `🛡️ تم استلام التذكرة بنجاح بواسطة المسؤول: ${interaction.user}` });
    }

    if (interaction.customId === 'close_ticket') {
      // حماية منع العضو العادي من الإغلاق نهائياً
      if (!hasAdmin && !hasTicketRole) {
        return interaction.reply({ content: '❌ عذراً، لا تمتلك الصلاحية لإغلاق التكت. الإغلاق متاح فقط لطاقم الدعم المسؤول!', ephemeral: true });
      }

      ticket.status = 'closed';
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
      await interaction.reply('🔒 سيتم إغلاق التذكرة وحذف القناة خلال 5 ثوانٍ...');
      setTimeout(async () => { await interaction.channel.delete().catch(() => null); }, 5000);
    }

    if (interaction.customId === 'ping_owner') {
      await interaction.reply({ content: `🔔 نداء لصاحب التذكرة: <@${ticket.ownerId}>` });
    }
  }
});

// كاونتر احتساب الرسائل وترقية الليفلات
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
  const guildId = message.guild.id;
  const userId = message.author.id;

  // احتساب الرسائل وحفظها بـ db.json
  if (!db.userMessages) db.userMessages = {};
  if (!db.userMessages[guildId]) db.userMessages[guildId] = {};
  if (!db.userMessages[guildId][userId]) db.userMessages[guildId][userId] = 0;

  db.userMessages[guildId][userId] += 1;
  const currentCount = db.userMessages[guildId][userId];
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

  // فحص والتحقق من ترقية ليفلات الرتب
  const serverLevelConfig = db.levelConfig?.[guildId];
  if (serverLevelConfig && serverLevelConfig.roles && serverLevelConfig.roles.length > 0) {
    let eligibleRoleInfo = null;
    for (const rInfo of serverLevelConfig.roles) {
      if (currentCount >= rInfo.requiredMessages) {
        eligibleRoleInfo = rInfo;
      }
    }

    if (eligibleRoleInfo) {
      const targetRole = message.guild.roles.cache.get(eligibleRoleInfo.roleId);
      if (targetRole && !message.member.roles.cache.has(targetRole.id)) {
        try {
          // إعطاء الرتبة الجديدة مع بقاء وحفظ الرتب القديمة للعضو
          await message.member.roles.add(targetRole);

          const logChannel = message.guild.channels.cache.get(serverLevelConfig.channelId);
          if (logChannel) {
            await logChannel.send({
              content: `🎉 مبروك ${message.author}، وصلت لـ \`${eligibleRoleInfo.requiredMessages}\` رسالة وحصلت على رتبة **${targetRole.name}**! وسوف تظل رتبك السابقة محفوظة معك دائماً.`
            });
          }
        } catch (err) { console.error(err); }
      }
    }
  }

  // نظام الردود التلقائية
  const text = message.content.trim().toLowerCase();
  if (db.replies?.[guildId]?.[text]) {
    return message.reply({ content: `${db.replies[guildId][text]}` });
  }
});

client.login(process.env.TOKEN || config.token);
