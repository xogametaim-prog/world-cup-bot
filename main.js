const express = require("express");
const {
    Client,
    GatewayIntentBits,
    Events
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("World Cup 2026 Bot Online");
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case "worldcup":
            await interaction.reply(
                "🏆 كأس العالم 2026 سيقام في الولايات المتحدة وكندا والمكسيك."
            );
            break;

        case "teams":
            await interaction.reply(
                "🌍 سيتم جلب قائمة المنتخبات من API-Football."
            );
            break;

        case "schedule":
            await interaction.reply(
                "📅 سيتم عرض جدول المباريات من API-Football."
            );
            break;

        case "stadiums":
            await interaction.reply(
                "🏟️ سيتم عرض الملاعب المستضيفة."
            );
            break;

        case "pick_team":
            await interaction.reply(
                "⚽ نظام اختيار المنتخب سيتم تفعيله قريبًا."
            );
            break;

        case "my_team":
            await interaction.reply(
                "📋 سيتم عرض منتخبك المختار."
            );
            break;

        case "guess_team":
            await interaction.reply(
                "🎮 لعبة خمن المنتخب."
            );
            break;

        case "leaderboard":
            await interaction.reply(
                "🏅 لوحة المتصدرين."
            );
            break;
    }
});

client.login(process.env.DISCORD_TOKEN);