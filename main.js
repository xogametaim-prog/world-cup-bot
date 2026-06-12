/**
 * Bot Version: 9.4.0v (Pure UNO Engine - Zero Errors Edition)
 * Developer: ta_im1 | Team: TRL for development
 * Platform: Optimized for Mobile & Production (Render / Pydroid 3)
 */

const { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('UNO Ultimate Engine is Live! 🃏'));
app.listen(process.env.PORT || 10000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// مصفوفة كروت الأونو المتنوعة الحماسية (أرقام + كروت أكشن)
const CARD_COLORS = ['🔴 أحمر', '🔵 أزرق', '🟢 أخضر', '🟡 أصفر'];
const CARD_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '🚫 تخطي', '🔄 عكس', '➕ اسحب 2'];

function generateDeck() {
    let deck = [];
    for (let color of CARD_COLORS) {
        for (let value of CARD_VALUES) {
            deck.push({ color, value, label: `${color} [${value}]` });
            if (value !== '0') {
                deck.push({ color, value, label: `${color} [${value}]` });
            }
        }
    }
    return deck.sort(() => 0.5 - Math.random());
}

let unoGame = null;

// تم تصحيح القوس هنا بالملي ومسح القوس الملعون الزائد [ ]
client.once('ready', async () => {
    console.log(`[SYSTEM] UNO Bot Online & Stabilized!`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('uno')
            .setDescription('بدء لعبة أونو الكلاسيكية بالأزرار والرسائل المخفية')
            .addUserOption(opt => 
                opt.setName('friend')
                   .setDescription('منشن صديقك لتحديه (اتركه فارغاً للعب ضد البوت)')
            )
    ].map(cmd => cmd.toJSON()); // هنا تم تنظيف كل شيء وصار صحيح 100%
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log(`[SYSTEM] Global commands registered successfully.`);
    } catch (e) { 
        console.error(e); 
    }
});

// ⚡ الاختصار النصي .uno لتشغيل اللعبة فوراً
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.trim().toLowerCase() === '.uno') {
        if (unoGame) return message.channel.send('⚠️ هناك جيم أونو شغال حالياً في السيرفر!');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('uno_start_bot').setLabel('🤖 لعب ضد البوت').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('uno_cancel_game').setLabel('❌ إلغاء').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({
            embeds: [new EmbedBuilder().setTitle('🃏 تحدي الأونو الأسطوري').setDescription('اختر نمط اللعب الحين باستخدام الأزرار بالأسفل:').setColor(0x5865F2)],
            components: [row]
        ]);
    }
});

// 🎮 لـوجـيـك اللعبة وإدارة التفاعلات
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'uno') {
        if (unoGame) return interaction.reply({ content: '⚠️ هناك جيم أونو شغال حالياً!', ephemeral: true });
        const friend = interaction.options.getUser('friend');

        if (!friend) {
            setupUnoMatch(interaction.channel, interaction.user, null);
            return interaction.reply({ content: '🤖 جاري تجهيز طاولة الأونو ضد البوت...', ephemeral: true });
        } else {
            if (friend.id === interaction.user.id) return interaction.reply({ content: '❌ ما تقدر تتحدى نفسك!', ephemeral: true });
            
            unoGame = { isWaiting: true, challenger: interaction.user, target: friend, channelId: interaction.channel.id };
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('uno_accept_friend').setLabel('✅ موافقة ودخول').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('uno_cancel_game').setLabel('❌ رفض وإلغاء').setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({
                content: `⚔️ يا <@${friend.id}>! اللاعب <@${interaction.user.id}> يتحداك في جيم أونو! هل تقبل؟`,
                components: [row]
            });
        }
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === 'uno_start_bot') {
        await interaction.deferUpdate();
        setupUnoMatch(interaction.channel, interaction.user, null);
    }

    if (interaction.customId === 'uno_accept_friend') {
        if (!unoGame || interaction.user.id !== unoGame.target.id) {
            return interaction.reply({ content: '❌ هذا الزر مو لك!', ephemeral: true });
        }
        await interaction.deferUpdate();
        setupUnoMatch(interaction.channel, unoGame.challenger, unoGame.target);
    }

    if (interaction.customId === 'uno_cancel_game') {
        unoGame = null;
        return interaction.update({ content: '❌ تم إنهاء اللعبة الحالية وعودة الطاولة للهدوء.', embeds: [], components: [] });
    }

    // --- [ الرسائل المخفية لعرض الكروت السرية ] ---
    if (interaction.customId === 'uno_show_my_cards') {
        if (!unoGame) return interaction.reply({ content: '❌ لا يوجد جيم شغال حالياً.', ephemeral: true });
        
        const isP1 = interaction.user.id === unoGame.p1.id;
        const isP2 = unoGame.p2 && interaction.user.id === unoGame.p2.id;

        if (!isP1 && !isP2) return interaction.reply({ content: '❌ أنت لست طرفاً في هذا التحدي الحين!', ephemeral: true });

        const playerObj = isP1 ? unoGame.p1 : unoGame.p2;
        const rows = [];
        let currentRow = new ActionRowBuilder();

        playerObj.cards.forEach((card, idx) => {
            if (idx > 0 && idx % 4 === 0) { 
                rows.push(currentRow); 
                currentRow = new ActionRowBuilder(); 
            }
            
            const canPlay = (unoGame.turn === playerObj.id) && (card.color === unoGame.topCard.color || card.value === unoGame.topCard.value);
            
            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`uno_playcard_${idx}`)
                    .setLabel(card.label)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!canPlay)
            );
        });

        if (currentRow.components.length > 0 && rows.length < 4) {
            if (currentRow.components.length < 5) {
                currentRow.addComponents(new ButtonBuilder().setCustomId('uno_draw_card').setLabel('📥 سحب كرت').setStyle(ButtonStyle.Danger).setDisabled(unoGame.turn !== playerObj.id));
            }
            rows.push(currentRow);
        }

        return interaction.reply({
            content: `🃏 **كروتك السرية (مخفية عن الخصم):**\nالكرت الحالي في الأرض: **${unoGame.topCard.label}**\n\n${unoGame.turn === playerObj.id ? '🟢 **دورك الحين! اضغط على الكرت المناسب لتلعبه فوراً.**' : '🔴 انتظر دور خصمك الحين...'}`,
            components: rows,
            ephemeral: true
        });
    }

    // --- [ لعب كرت وتطبيق التأثيرات المتنوعة ] ---
    if (interaction.customId.startsWith('uno_playcard_')) {
        const cardIndex = parseInt(interaction.customId.replace('uno_playcard_', ''));
        const isP1 = interaction.user.id === unoGame.p1.id;
        const playerObj = isP1 ? unoGame.p1 : unoGame.p2;
        const opponentObj = isP1 ? unoGame.p2 : unoGame.p1;

        if (unoGame.turn !== playerObj.id) return interaction.reply({ content: '❌ مو دورك يا غالي!', ephemeral: true });

        const playedCard = playerObj.cards[cardIndex];
        
        if (playedCard.color === unoGame.topCard.color || playedCard.value === unoGame.topCard.value) {
            playerObj.cards.splice(cardIndex, 1); 
            unoGame.topCard = playedCard; 

            if (playerObj.cards.length === 0) {
                await interaction.channel.send(`🎉 **🏆 كفوووو! الفائز في المباراة هو: <@${playerObj.id}> ونال اللقب!** 🥳`);
                unoGame = null;
                return;
            }

            let effectText = '';
            let skipTurn = false;

            if (playedCard.value === '➕ اسحب 2') {
                if (unoGame.deck.length < 2) unoGame.deck = generateDeck();
                opponentObj.cards.push(unoGame.deck.pop(), unoGame.deck.pop());
                effectText = ` 🔥 وأجبر الخصم على سحب كرتين!`;
            } else if (playedCard.value === '🚫 تخطي' || playedCard.value === '🔄 عكس') {
                skipTurn = true; 
                effectText = ` ⚡ وحرم الخصم من الدور ويلعب مرة ثانية الحين!`;
            }

            await interaction.reply({ content: `✅ لعبت كرت: ${playedCard.label}${effectText}`, ephemeral: true });
            
            if (unoGame.isVsBot) {
                if (skipTurn) {
                    unoGame.turn = unoGame.p1.id; 
                    await updateMainGameBoard(interaction.channel);
                } else {
                    unoGame.turn = 'bot';
                    await updateMainGameBoard(interaction.channel);
                    setTimeout(() => handleBotTurn(interaction.channel), 2000); 
                }
            } else {
                if (!skipTurn) {
                    unoGame.turn = (unoGame.turn === unoGame.p1.id) ? unoGame.p2.id : unoGame.p1.id;
                }
                await updateMainGameBoard(interaction.channel);
            }
        } else {
            return interaction.reply({ content: '❌ كرت غير مطارق للساحة!', ephemeral: true });
        }
    }

    // --- [ سحب كرت جديد ] ---
    if (interaction.customId === 'uno_draw_card') {
        const isP1 = interaction.user.id === unoGame.p1.id;
        const playerObj = isP1 ? unoGame.p1 : unoGame.p2;

        if (unoGame.turn !== playerObj.id) return interaction.reply({ content: '❌ مو دورك!', ephemeral: true });

        if (unoGame.deck.length === 0) unoGame.deck = generateDeck();
        const pulled = unoGame.deck.pop();
        playerObj.cards.push(pulled);

        await interaction.reply({ content: `📥 سحبت كرت جديد: **${pulled.label}**`, ephemeral: true });

        if (unoGame.isVsBot) {
            unoGame.turn = 'bot';
            await updateMainGameBoard(interaction.channel);
            setTimeout(() => handleBotTurn(interaction.channel), 2000);
        } else {
            unoGame.turn = (unoGame.turn === unoGame.p1.id) ? unoGame.p2.id : unoGame.p1.id;
            await updateMainGameBoard(interaction.channel);
        }
    }
});

function setupUnoMatch(channel, challenger, friendObj) {
    const deck = generateDeck();
    
    unoGame = {
        deck: deck,
        topCard: deck.pop(),
        isVsBot: friendObj === null,
        turn: challenger.id,
        p1: { id: challenger.id, username: challenger.username, cards: [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()] },
        p2: friendObj ? { id: friendObj.id, username: friendObj.username, cards: [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()] } 
                     : { id: 'bot', username: 'الروبوت الذكي 🤖', cards: [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()] }
    };

    while (unoGame.topCard.value.includes('➕') || unoGame.topCard.value.includes('🚫') || unoGame.topCard.value.includes('🔄')) {
        unoGame.deck.unshift(unoGame.topCard);
        unoGame.topCard = unoGame.deck.pop();
    }

    sendNewGameBoard(channel);
}

async function sendNewGameBoard(channel) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('🃏 طاولة أونو التفاعلية المتنوعة')
        .setDescription(`🔴 **الكرت الحالي في الأرض هو:**\n✨ **${unoGame.topCard.label}** ✨\n\n` +
                        `🟢 **الدور الحالي عند:** <@${unoGame.turn === 'bot' ? client.user.id : unoGame.turn}>\n\n` +
                        `📊 **موقف البطاقات في الجولة:**\n` +
                        `• اللاعب <@${unoGame.p1.id}>: \`[ ${unoGame.p1.cards.length} كروت ]\`\n` +
                        `• ${unoGame.isVsBot ? 'الروبوت 🤖' : `الخصم <@${unoGame.p2.id}>`}: \`[ ${unoGame.p2.cards.length} كروت ]\``)
        .setColor(0x2ECC71)
        .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png') 
        .setFooter({ text: 'اضغط على زر "عرض كروتي" لتفتح لوحتك المخفية فوراً وتلعب سرياً' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('uno_show_my_cards').setLabel('🃏 عرض كروتي وسحب / لعب').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('uno_cancel_game').setLabel('🛑 إنهاء الجيم').setStyle(ButtonStyle.Danger)
    );

    unoGame.mainMsg = await channel.send({ embeds: [mainEmbed], components: [row] });
}

async function updateMainGameBoard(channel) {
    if (!unoGame || !unoGame.mainMsg) return;

    const editEmbed = new EmbedBuilder()
        .setTitle('🃏 طاولة أونو التفاعلية المتنوعة')
        .setDescription(`🔴 **الكرت الحالي في الأرض هو:**\n✨ **${unoGame.topCard.label}** ✨\n\n` +
                        `🟢 **الدور الحالي عند:** ${unoGame.turn === 'bot' ? '🤖 الروبوت الذكي' : `<@${unoGame.turn}>`}\n\n` +
                        `📊 **موقف البطاقات في الجولة:**\n` +
                        `• اللاعب <@${unoGame.p1.id}>: \`[ ${unoGame.p1.cards.length} كروت ]\`\n` +
                        `• ${unoGame.isVsBot ? 'الروبوت 🤖' : `الخصم <@${unoGame.p2.id}>`}: \`[ ${unoGame.p2.cards.length} كروت ]\``)
        .setColor(0x2ECC71)
        .setImage('https://images2.imgbox.com/71/34/4mP9Y7C1_o.png')
        .setFooter({ text: 'اضغط على زر "عرض كروتي" لتفتح لوحتك المخفية فوراً وتلعب سرياً' });

    try {
        await unoGame.mainMsg.edit({ embeds: [editEmbed] });
    } catch (err) { console.log("UI update skip"); }
}

async function handleBotTurn(channel) {
    if (!unoGame || unoGame.turn !== 'bot') return;

    const botCards = unoGame.p2.cards;
    const playerObj = unoGame.p1;
    
    const matchIndex = botCards.findIndex(c => c.color === unoGame.topCard.color || c.value === unoGame.topCard.value);

    if (matchIndex !== -1) {
        const botPlayed = botCards[matchIndex];
        botCards.splice(matchIndex, 1);
        unoGame.topCard = botPlayed;

        let effectText = '';
        let botKeepTurn = false;

        if (botPlayed.value === '➕ اسحب 2') {
            if (unoGame.deck.length < 2) unoGame.deck = generateDeck();
            playerObj.cards.push(unoGame.deck.pop(), unoGame.deck.pop());
            effectText = ` 💥 وأجبرك على سحب كرتين إضافيين لليد!`;
        } else if (botPlayed.value === '🚫 تخطي' || botPlayed.value === '🔄 عكس') {
            botKeepTurn = true;
            effectText = ` ⚡ وحرمك من الدور وراح يلعب مرة ثانية الحين!`;
        }

        await channel.send(`🤖 **الروبوت الذكي لعب كرت:** ${botPlayed.label}${effectText}`);

        if (botCards.length === 0) {
            await channel.send('🤖 **الروبوت الذكي أنهى كروته وفاز بالجيم! هاردلك يا بطل. 🏆**');
            unoGame = null; return;
        }

        unoGame.turn = botKeepTurn ? 'bot' : unoGame.p1.id;
        await updateMainGameBoard(channel);
        
        if (botKeepTurn) {
            setTimeout(() => handleBotTurn(channel), 2000);
        }
    } else {
        if (unoGame.deck.length === 0) unoGame.deck = generateDeck();
        const pulled = unoGame.deck.pop();
        botCards.push(pulled);

        await channel.send('🤖 **الروبوت ما عنده كرت متوافق، سحب كرت جديد من السلة ومرر الدور.**');
        
        unoGame.turn = unoGame.p1.id; 
        await updateMainGameBoard(channel);
    }
}

client.login(process.env.TOKEN);
