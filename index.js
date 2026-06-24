const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const fs = require('fs');
const http = require('http'); // لمنع إغلاق ريندر
const config = require('./config.json');

// حل مشكلة ريندر (فتح بورت وهمي لتفادي الـ Port Scan Timeout)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('System Bot For All Is Running Perfectly! 🚀\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Web server is bypass-listening on port ${PORT}`);
});

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

// قراءة الأوامر من مجلد commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const cmds = require(`./commands/${file}`);
  for (const key in cmds) {
    client.commands.set(key, cmds[key]);
    if (cmds[key].data) {
      commandsData.push(cmds[key].data.toJSON());
    }
  }
}

// تسجيل أوامر السلاش تلقائياً باسم البوت المتصل فوراً
client.once('ready', async () => {
  console.log(`🤖 ${client.user.username} is online and ready for all servers!`);
  
  const rest = new REST({ version: '10' }).setToken(client.token);
  try {
    console.log('🔄 Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error deploying slash commands:', error);
  }
});

// حدث دخول السيرفر الجديد
client.on('guildCreate', async (guild) => {
  try {
    const controlRole = await guild.roles.create({
      name: 'System Control',
      color: '#ff0000',
      reason: 'رتبة التحكم بإعدادات وأوامر بوت system bot for all',
    });

    const highestRole = guild.roles.cache
      .filter(r => r.id !== guild.roles.everyone.id && !r.managed)
      .sort((a, b) => b.position - a.position)
      .first();

    const channel = guild.channels.cache
      .filter(c => c.type === 0 && c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages))
      .first();

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle('📥 تم دخول البوت بنجاح! | system bot for all')
        .setDescription(`مرحباً بكم في نظام الإدارة الشامل.\n\n🛠️ تم إنشاء رتبة جديدة باسم **${controlRole}** تلقائياً، يمكنك إعطاؤها لمن تريد ليتحكم بكامل أوامر البوت.\n\n🌐 **لوحة التحكم (Dashboard):** قريباً .`)
        .setColor('#00ffcc')
        .setTimestamp();

      const mentionMsg = highestRole ? `👋 منشن لأعلى رتبة في السيرفر: ${highestRole}` : '👋 مرحباً بإدارة السيرفر!';
      await channel.send({ content: mentionMsg, embeds: [embed] });
    }
  } catch (err) {
    console.error('حدث خطأ أثناء إعدادات دخول السيرفر:', err);
  }
});

// التعامل مع التفاعلات وأزرار التكت الذكية
client.on('interactionCreate', async interaction => {
  const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));

  // 1. التعامل مع أوامر السلاش العادية
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasRole = interaction.member.roles.cache.some(r => r.name === 'System Control');

    if (interaction.commandName !== 'info' && !hasAdmin && !hasRole) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة أو لمن يمتلك رتبة `System Control` فقط!', ephemeral: true });
    }

    try {
      await command.executeSlash(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر السلاش.', ephemeral: true });
    }
    return;
  }

  // 2. معالجة الضغط على أزرار فتح التذاكر (Ticket Generation)
  if (interaction.isButton() && interaction.customId.startsWith('ticket_btn_')) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!db.tickets) db.tickets = {};
    const hasOpenTicket = Object.values(db.tickets).some(t => t.ownerId === userId && t.guildId === guildId && t.status === 'open');
    if (hasOpenTicket) {
      return interaction.reply({ content: '❌ لا يمكنك فتح أكثر من تذكرة واحدة في نفس الوقت!', ephemeral: true });
    }

    const btnConfig = db.ticketConfig?.[guildId]?.[interaction.customId];
    const allowedRoleId = btnConfig ? btnConfig.roleId : null;
    const typeName = btnConfig ? btnConfig.name : 'تذكرة';

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...(allowedRoleId ? [{ id: allowedRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
      ]
    });

    db.tickets[ticketChannel.id] = {
      guildId,
      ownerId: userId,
      claimedBy: null,
      status: 'open',
      roleId: allowedRoleId
    };
    fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التكت 🛡️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التكت 🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ping_owner').setLabel('نداء صاحب التكت 🔔').setStyle(ButtonStyle.Secondary)
    );

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎫 تذكرة جديدة | قسم: ${typeName}`)
      .setDescription(`مرحباً بك ${interaction.user} في تذكرتك.\nالرجاء كتابة مشكلتك هنا وانتظار طاقم الإدارة المختص.\n\n⚠️ **مخصص فقط لـ:** ${allowedRoleId ? `<@&${allowedRoleId}>` : 'الإدارة العامة'}`)
      .setColor('#3498db')
      .setTimestamp();

    await ticketChannel.send({ content: `${interaction.user} | ${allowedRoleId ? `<@&${allowedRoleId}>` : ''}`, embeds: [welcomeEmbed], components: [controlRow] });
    await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح في قناة: ${ticketChannel}`, ephemeral: true });
    return;
  }

  // 3. معالجة أزرار العمليات (داخل التكت نفسها)
  if (interaction.isButton()) {
    const channelId = interaction.channel.id;
    const ticket = db.tickets?.[channelId];
    if (!ticket) return;

    if (interaction.customId === 'claim_ticket') {
      const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      const hasTicketRole = ticket.roleId ? interaction.member.roles.cache.has(ticket.roleId) : interaction.member.roles.cache.some(r => r.name === 'System Control');

      if (!hasAdmin && !hasTicketRole) {
        return interaction.reply({ content: '❌ ليس لديك الصلاحية أو الرتبة المطلوبة لاستلام هذه التذكرة!', ephemeral: true });
      }

      const claimCount = Object.values(db.tickets).filter(t => t.claimedBy === interaction.user.id && t.status === 'open').length;
      if (claimCount >= 10) {
        return interaction.reply({ content: '❌ لقد وصلت للحد الأقصى المسموح لك به (10 تذاكر مستلمة في وقت واحد)!', ephemeral: true });
      }

      ticket.claimedBy = interaction.user.id;
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

      await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
      if (ticket.roleId) {
        await interaction.channel.permissionOverwrites.edit(ticket.roleId, { SendMessages: true, ViewChannel: true });
      }

      await interaction.reply({ content: `🛡️ تم استلام التذكرة بنجاح بواسطة المسؤول: ${interaction.user}` });
    }

    if (interaction.customId === 'close_ticket') {
      ticket.status = 'closed';
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

      await interaction.reply('🔒 سيتم إغلاق التذكرة وحذف القناة خلال 5 ثوانٍ...');
      setTimeout(async () => {
        await interaction.channel.delete().catch(() => null);
      }, 5000);
    }

    if (interaction.customId === 'ping_owner') {
      await interaction.reply({ content: `🔔 نداء لصاحب التذكرة: <@${ticket.ownerId}>، يرجى التواجد في الشات لمتابعة طلبك!` });
    }
  }
});

// التعامل مع اختصارات الشات والردود التلقائية
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const text = message.content.trim().toLowerCase();

  const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
  if (db.replies && db.replies[message.guild.id] && db.replies[message.guild.id][text]) {
    const autoResponse = db.replies[message.guild.id][text];
    return message.reply({ content: `${message.author} ${autoResponse}` });
  }

  const args = text.split(/ +/);
  const firstWord = args.shift();

  const command = client.commands.find(cmd => cmd.name === firstWord || (cmd.shortcuts && cmd.shortcuts.includes(firstWord)));
  if (!command) return;

  const hasAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
  const hasRole = message.member.roles.cache.some(r => r.name === 'System Control');

  if (command.name !== 'info' && !hasAdmin && !hasRole) {
    return message.reply('❌ هذا الأمر مخصص للإدارة أو لمن يمتلك رتبة `System Control` فقط!');
  }

  try {
    await command.executeMessage(message, args);
  } catch (error) {
    console.error(error);
    message.reply('❌ حدث خطأ أثناء تنفيذ هذا الاختصار.');
  }
});

client.login(process.env.TOKEN || config.token);
