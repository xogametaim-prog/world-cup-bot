/**
 * Bot Version: 8.0.0v (The Ultimate Gangster-bot)
 * Developer: ta_im1 | Team: TRL for development
 * Features: Mafia Loop, UNO Engine (Ephemeral), Admin Tools, Shortcuts
 */

const { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, 
    ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Gangster-bot v8.0.0 is running! 🚀'));
app.listen(port);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// متغيرات الألعاب
let activeMafiaGame = null;
const unoGames = new Map();

client.once('ready', async () => {
    console.log(`[SYSTEM] Bot Online! Version: 8.0.0v`);
    // تسجيل الأوامر
    const commands = [
        new SlashCommandBuilder().setName('uno').setDescription('لعبة أونو').addUserOption(opt => opt.setName('friend').setDescription('تحدي صديق')),
        new SlashCommandBuilder().setName('mafia').setDescription('بدء جولة مافيا'),
        new SlashCommandBuilder().setName('info').setDescription('شرح اللعبة'),
        new SlashCommandBuilder().setName('help').setDescription('مساعدة')
    ].map(cmd => cmd.toJSON());
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// ⚡ الاختصارات النصية
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    if (message.content === '.w') {
        message.channel.send('✨ أهلاً بك في سيرفرنا الأسطوري!');
    }
    
    // الاختصار الجديد للأونو
    if (message.content === '.uno') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('uno_ai').setLabel('لعب ضد البوت').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('uno_cancel').setLabel('إلغاء').setStyle(ButtonStyle.Danger)
        );
        message.channel.send({ content: '🃏 **اختر نمط لعبة الأونو:**', components: [row] });
    }
});

// 🎮 إدارة التفاعلات (أزرار وأوامر)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'uno') {
            const target = interaction.options.getUser('friend');
            if (target) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('uno_accept').setLabel('موافقة ✅').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('uno_cancel').setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
                );
                interaction.reply({ content: `⚔️ يا <@${target.id}>، اللاعب <@${interaction.user.id}> يتحداك في أونو!`, components: [row] });
            }
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'uno_ai') {
            interaction.reply({ content: '🃏 تم بدء لعبة الأونو ضد البوت! (استخدم زر "كروتي" للعب)', ephemeral: true });
        }
        if (interaction.customId === 'uno_accept') {
            interaction.update({ content: '✅ تم قبول التحدي! بدأت اللعبة.', components: [] });
        }
        if (interaction.customId === 'uno_cancel') {
            interaction.update({ content: '❌ تم إلغاء اللعبة.', components: [] });
        }
    }
});

client.login(process.env.TOKEN);
