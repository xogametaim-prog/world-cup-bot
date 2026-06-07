const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [

new SlashCommandBuilder()
  .setName("worldcup")
  .setDescription("معلومات كأس العالم 2026"),

new SlashCommandBuilder()
  .setName("teams")
  .setDescription("عرض المنتخبات المشاركة"),

new SlashCommandBuilder()
  .setName("schedule")
  .setDescription("عرض جدول المباريات"),

new SlashCommandBuilder()
  .setName("stadiums")
  .setDescription("عرض الملاعب"),

new SlashCommandBuilder()
  .setName("pick_team")
  .setDescription("اختر منتخبك (مرة واحدة فقط)"),

new SlashCommandBuilder()
  .setName("my_team")
  .setDescription("عرض منتخبك المختار"),

new SlashCommandBuilder()
  .setName("guess_team")
  .setDescription("لعبة خمن المنتخب"),

new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("ترتيب اللاعبين")

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Deploying ALL slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("All slash commands loaded ✔");
  } catch (err) {
    console.error(err);
  }
})();