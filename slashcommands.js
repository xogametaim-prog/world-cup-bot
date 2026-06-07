const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("pick_team")
        .setDescription("اختيار منتخبك"),

    new SlashCommandBuilder()
        .setName("my_team")
        .setDescription("عرض منتخبك")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("Deploying commands...");

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log("Commands deployed!");
    } catch (err) {
        console.error(err);
    }
})();