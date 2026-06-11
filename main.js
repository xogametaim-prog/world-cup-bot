/**
 * Bot Version: 3.9.1v (Mafia Game & Ticket System Edition)
 * Developer: ta_im1 | Team: TRL
 */

const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits, ChannelType } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot Online! World Cup 2026 Bot v3.9.1v Active.'));
app.listen(port);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

const BOT_VERSION = "3.9.1v";
const footerText = { text: "World Cup 2026 Bot | v3.9.1v | TRL" };

// 🎫 نظام التذاكر
client.on('messageCreate', async message => {
    if (message.content === '.wr') {
        const channel = await message.guild.channels.create({
            name: `ticket-${message.author.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: message.guild.roles.cache.find(r => r.name === 'Ticket')?.id || message.guild.id, allow: [PermissionFlagsBits.ViewChannel] }
            ]
        });
        message.reply(`✅ تم إنشاء روم التذكرة: ${channel}`);
    }

    // 📢 نظام الإرسال الإداري (DM)
    if (message.content.startsWith('/dm')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const args = message.content.split(' ');
        const target = message.mentions.users.first();
        const msg = args.slice(2).join(' ');
        if (target) { target.send(msg).catch(() => message.reply('❌ تعذر الإرسال')); }
        else { message.guild.members.cache.forEach(m => { if (!m.user.bot) m.send(msg).catch(() => {}); }); }
        message.reply('✅ تم الإرسال.');
    }
});

// 🕵️‍♂️ نظام لعبة المافيا (.m)
let mafiaGame = { active: false, players: [], status: 'waiting' };

client.on('messageCreate', async message => {
    if (message.content === '.m') {
        if (mafiaGame.active) return message.reply('⚠️ اللعبة بدأت بالفعل!');
        mafiaGame = { active: true, players: [], status: 'waiting' };
        
        const embed = new EmbedBuilder()
            .setTitle('🕵️‍♂️ لعبة المافيا المونديالية')
            .setDescription('شرح اللعبة: فريق المافيا يحاول تصفية المدنيين، والمسعف ينقذ المصابين، والحكم يكشف الحقائق.\n\nاضغط دخول للمشاركة (تحتاج 4 لاعبين فأكثر).')
            .setFooter(footerText);
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('join_mafia').setLabel('دخول').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('leave_mafia').setLabel('خروج').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('info_mafia').setLabel('info').setStyle(ButtonStyle.Primary)
        );
        
        const msg = await message.channel.send({ embeds: [embed], components: [row] });
        
        const collector = msg.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async i => {
            if (i.customId === 'join_mafia') {
                if (!mafiaGame.players.includes(i.user.id)) { mafiaGame.players.push(i.user.id); i.reply({ content: '✅ انضممت!', ephemeral: true }); }
            } else if (i.customId === 'leave_mafia') {
                mafiaGame.players = mafiaGame.players.filter(p => p !== i.user.id);
                i.reply({ content: '❌ خرجت من اللعبة.', ephemeral: true });
            } else if (i.customId === 'info_mafia') {
                i.reply({ content: '📜 شرح: المافيا تقتل ليلاً، المسعف يحمي، الحكم يراقب. الهدف: النجاة!', ephemeral: true });
            }
        });
        
        collector.on('end', async () => {
            if (mafiaGame.players.length < 4) return message.channel.send('❌ العدد غير كافٍ (أقل من 4).');
            message.channel.send(`🎮 بدأت اللعبة بـ ${mafiaGame.players.length} لاعبين!`);
        });
    }
});

client.login(process.env.TOKEN);
