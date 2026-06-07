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
.setDescription("عرض الملاعب المستضيفة"),

new SlashCommandBuilder()
.setName("pick_team")
.setDescription("اختر منتخبك المفضل"),

new SlashCommandBuilder()
.setName("my_team")
.setDescription("عرض منتخبك المختار"),

new SlashCommandBuilder()
.setName("guess_team")
.setDescription("لعبة خمن المنتخب"),

new SlashCommandBuilder()
.setName("leaderboard")
.setDescription("ترتيب اللاعبين"),

new SlashCommandBuilder()
.setName("matches_today")
.setDescription("مباريات اليوم"),

new SlashCommandBuilder()
.setName("top_scorers")
.setDescription("هدافي البطولة"),

new SlashCommandBuilder()
.setName("group_table")
.setDescription("ترتيب المجموعات"),

new SlashCommandBuilder()
.setName("team_info")
.setDescription("معلومات منتخب"),

new SlashCommandBuilder()
.setName("predict_winner")
.setDescription("توقع بطل كأس العالم"),

new SlashCommandBuilder()
.setName("my_prediction")
.setDescription("عرض توقعك للبطل"),

new SlashCommandBuilder()
.setName("quiz")
.setDescription("سؤال عشوائي عن كأس العالم"),

new SlashCommandBuilder()
.setName("facts")
.setDescription("معلومة عشوائية عن كأس العالم")

].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
try {

console.log("Started refreshing application commands.");

await rest.put(
Routes.applicationCommands(process.env.CLIENT_ID),
{ body: commands }
);

console.log("Successfully reloaded application commands.");

} catch (error) {
console.error(error);
}
})();