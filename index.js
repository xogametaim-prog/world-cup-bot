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

    // شرط: منع فتح أكثر من تكت وحدة في نفس الوقت للعضو
    if (!db.tickets) db.tickets = {};
    const hasOpenTicket = Object.values(db.tickets).some(t => t.ownerId === userId && t.guildId === guildId && t.status === 'open');
    if (hasOpenTicket) {
      return interaction.reply({ content: '❌ لا يمكنك فتح أكثر من تذكرة واحدة في نفس الوقت!', ephemeral: true });
    }

    const btnConfig = db.ticketConfig?.[guildId]?.[interaction.customId];
    const allowedRoleId = btnConfig ? btnConfig.roleId : null;
    const typeName = btnConfig ? btnConfig.name : 'تذكرة';

    // إنشاء قناة التكت داخل السيرفر
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...(allowedRoleId ? [{ id: allowedRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
      ]
    });

    // حفظ بيانات التكت المفتوحة
    db.tickets[ticketChannel.id] = {
      guildId,
      ownerId: userId,
      claimedBy: null,
      status: 'open',
      roleId: allowedRoleId
    };
    fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

    // أزرار التحكم والعمليات داخل التكت
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

    // زر استلام التكت
    if (interaction.customId === 'claim_ticket') {
      // التحقق من الصلاحية (أن يمتلك الرتبة المحددة للتكت أو يكون Admin)
      const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      const hasTicketRole = ticket.roleId ? interaction.member.roles.cache.has(ticket.roleId) : interaction.member.roles.cache.some(r => r.name === 'System Control');

      if (!hasAdmin && !hasTicketRole) {
        return interaction.reply({ content: '❌ ليس لديك الصلاحية أو الرتبة المطلوبة لاستلام هذه التذكرة!', ephemeral: true });
      }

      // شرط: ألا يتعدى استلام الموظف أكثر من 10 تكتات في نفس الوقت
      const claimCount = Object.values(db.tickets).filter(t => t.claimedBy === interaction.user.id && t.status === 'open').length;
      if (claimCount >= 10) {
        return interaction.reply({ content: '❌ لقد وصلت للحد الأقصى المسموح لك به (10 تذاكر مستلمة في وقت واحد)!', ephemeral: true });
      }

      ticket.claimedBy = interaction.user.id;
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

      // تعديل صلاحيات القناة لتثبيت المسؤول المستلم وحذف الرتب العامة لعدم التداخل
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
      if (ticket.roleId) {
        await interaction.channel.permissionOverwrites.edit(ticket.roleId, { SendMessages: true, ViewChannel: true });
      }

      await interaction.reply({ content: `🛡️ تم استلام التذكرة بنجاح بواسطة المسؤول: ${interaction.user}` });
    }

    // زر إغلاق التكت
    if (interaction.customId === 'close_ticket') {
      ticket.status = 'closed';
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

      await interaction.reply('🔒 سيتم إغلاق التذكرة وحذف القناة خلال 5 ثوانٍ...');
      setTimeout(async () => {
        await interaction.channel.delete().catch(() => null);
      }, 5000);
    }

    // زر نداء فتح التكت (منشن صاحب التذكرة)
    if (interaction.customId === 'ping_owner') {
      await interaction.reply({ content: `🔔 نداء لصاحب التذكرة: <@${ticket.ownerId}>، يرجى التواجد في الشات لمتابعة طلبك!` });
    }
  }
});
