require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const {
Client,
GatewayIntentBits,
Events,
REST,
Routes,
SlashCommandBuilder,
ActionRowBuilder,
StringSelectMenuBuilder,
PermissionFlagsBits,
EmbedBuilder
} = require("discord.js");

// ================= EXPRESS =================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
res.send("World Cup 2026 Bot Online");
});

app.listen(PORT, () => {
console.log("Web server running on port ${PORT}");
});

// ================= SQLITE =================

const db = new sqlite3.Database("./worldcup.db");

db.serialize(() => {

db.run("CREATE TABLE IF NOT EXISTS users ( userId TEXT PRIMARY KEY, team TEXT )");

db.run("CREATE TABLE IF NOT EXISTS guilds ( guildId TEXT PRIMARY KEY, language TEXT DEFAULT 'ar' )");

db.run("CREATE TABLE IF NOT EXISTS leaderboard ( userId TEXT PRIMARY KEY, points INTEGER DEFAULT 0 )");

});

// ================= LANGUAGES =================

const texts = {

ar: {
help: "📚 قائمة الأوامر",
pick: "⚽ اختر منتخبك",
alreadyPicked: "❌ اخترت منتخباً بالفعل",
noTeam: "❌ لم تختر منتخباً بعد",
myTeam: "🏆 منتخبك:",
saved: "✅ تم حفظ اختيارك",
languageSaved: "✅ تم تغيير اللغة للعربية",
broadcastDone: "✅ تم إرسال الرسائل",
guess: "🎮 لعبة التخمين",
leaderboard: "🏅 المتصدرون"
},

en: {
help: "📚 Commands List",
pick: "⚽ Choose your team",
alreadyPicked: "❌ You already selected a team",
noTeam: "❌ No team selected",
myTeam: "🏆 Your team:",
saved: "✅ Team saved",
languageSaved: "✅ Language changed to English",
broadcastDone: "✅ Broadcast sent",
guess: "🎮 Guess The Team",
leaderboard: "🏅 Leaderboard"
}

};

// ================= TEAMS =================

const teams = [
"Argentina",
"Brazil",
"France",
"Spain",
"Germany",
"England",
"Portugal",
"Netherlands",
"Belgium",
"Croatia",
"Morocco",
"Japan",
"South Korea",
"Mexico",
"USA",
"Canada",
"Uruguay",
"Italy",
"Turkey",
"Saudi Arabia"
];

// ================= DISCORD CLIENT =================

const client = new Client({
intents: [
GatewayIntentBits.Guilds
]
});

// ================= AUTO DEPLOY COMMANDS =================

async function deployCommands() {

const commands = [

new SlashCommandBuilder()
.setName("help")
.setDescription("Show commands"),

new SlashCommandBuilder()
.setName("worldcup")
.setDescription("World Cup info"),

new SlashCommandBuilder()
.setName("teams")
.setDescription("Show teams"),

new SlashCommandBuilder()
.setName("pick_team")
.setDescription("Pick your team"),

new SlashCommandBuilder()
.setName("my_team")
.setDescription("Show your team"),

new SlashCommandBuilder()
.setName("guess_team")
.setDescription("Guess game"),

new SlashCommandBuilder()
.setName("leaderboard")
.setDescription("Leaderboard"),

new SlashCommandBuilder()
.setName("language")
.setDescription("Change language")
.addStringOption(option =>
option
.setName("lang")
.setDescription("ar or en")
.setRequired(true)
.addChoices(
{ name: "Arabic", value: "ar" },
{ name: "English", value: "en" }
)
),

new SlashCommandBuilder()
.setName("broadcast")
.setDescription("Send DM to all members")
.setDefaultMemberPermissions(
PermissionFlagsBits.Administrator
)
.addStringOption(option =>
option
.setName("message")
.setDescription("Message")
.setRequired(true)
)

].map(cmd => cmd.toJSON());

const rest = new REST({
version: "10"
}).setToken(process.env.DISCORD_TOKEN);

try {

console.log("Deploying commands...");

await rest.put(
Routes.applicationCommands(
process.env.CLIENT_ID
),
{
body: commands
}
);

console.log("Commands deployed");

} catch (err) {
console.error(err);
}

}

client.once(Events.ClientReady, async (readyClient) => {

console.log(
"Logged in as ${readyClient.user.tag}"
);

await deployCommands();

});
client.on(Events.InteractionCreate, async (interaction) => {

if (!interaction.guild) return;

function getLanguage(guildId) {
return new Promise((resolve) => {
db.get(
"SELECT language FROM guilds WHERE guildId = ?",
[guildId],
(err, row) => {
resolve(row?.language || "ar");
}
);
});
}

if (interaction.isChatInputCommand()) {

const lang = await getLanguage(
interaction.guild.id
);

const t = texts[lang];

// ================= HELP =================

if (interaction.commandName === "help") {

const embed = new EmbedBuilder()
.setTitle(t.help)
.setDescription("/help /worldcup /teams /pick_team /my_team /guess_team /leaderboard /language /broadcast");

return interaction.reply({
embeds: [embed]
});

}

// ================= WORLDCUP =================

if (interaction.commandName === "worldcup") {

return interaction.reply(
lang === "ar"
? "🏆 كأس العالم 2026 سيقام في أمريكا وكندا والمكسيك."
: "🏆 FIFA World Cup 2026 will be hosted by USA, Canada and Mexico."
);

}

// ================= TEAMS =================

if (interaction.commandName === "teams") {

return interaction.reply(
teams.join(" • ")
);

}

// ================= LANGUAGE =================

if (interaction.commandName === "language") {

const selected =
interaction.options.getString("lang");

db.run(
"INSERT OR REPLACE INTO guilds (guildId, language) VALUES (?, ?)",
[
interaction.guild.id,
selected
]
);

return interaction.reply(
selected === "ar"
? texts.ar.languageSaved
: texts.en.languageSaved
);

}

// ================= PICK TEAM =================

if (interaction.commandName === "pick_team") {

db.get(
"SELECT * FROM users WHERE userId = ?",
[interaction.user.id],
async (err, row) => {

if (row) {

return interaction.reply({
content:
"${t.alreadyPicked}: ${row.team}",
ephemeral: true
});

}

const menu =
new StringSelectMenuBuilder()
.setCustomId("team_select")
.setPlaceholder(t.pick)
.addOptions(
teams.map(team => ({
label: team,
value: team
}))
);

const rowMenu =
new ActionRowBuilder()
.addComponents(menu);

await interaction.reply({
content: t.pick,
components: [rowMenu],
ephemeral: true
});

}
);

}

// ================= MY TEAM =================

if (interaction.commandName === "my_team") {

db.get(
"SELECT * FROM users WHERE userId = ?",
[interaction.user.id],
(err, row) => {

if (!row) {

return interaction.reply({
content: t.noTeam,
ephemeral: true
});

}

interaction.reply(
"${t.myTeam} ${row.team}"
);

}
);

}

// ================= GUESS TEAM =================

if (interaction.commandName === "guess_team") {

const randomTeam =
teams[
Math.floor(
Math.random() * teams.length
)
];

return interaction.reply(
"${t.guess}\n🎯 ${randomTeam}"
);

}

// ================= LEADERBOARD =================

if (interaction.commandName === "leaderboard") {

db.all(
"SELECT * FROM leaderboard ORDER BY points DESC LIMIT 10",
[],
(err, rows) => {

if (!rows?.length) {

return interaction.reply(
"لا يوجد بيانات بعد."
);

}

const text = rows
.map(
(r, i) =>
"${i + 1}. <@${r.userId}> - ${r.points}"
)
.join("\n");

interaction.reply(text);

}
);

}

// ================= BROADCAST =================

if (
interaction.commandName === "broadcast"
) {

const message =
interaction.options.getString(
"message"
);

await interaction.reply({
content: "📨 بدأ الإرسال...",
ephemeral: true
});

const members =
await interaction.guild.members.fetch();

let sent = 0;

for (const member of members.values()) {

if (member.user.bot) continue;

try {

await member.send(message);

sent++;

} catch {}

}

interaction.followUp({
content:
"✅ تم الإرسال إلى ${sent} عضو",
ephemeral: true
});

}

}

// ================= SELECT MENU =================

if (
interaction.isStringSelectMenu()
) {

if (
interaction.customId ===
"team_select"
) {

const team =
interaction.values[0];

db.get(
"SELECT * FROM users WHERE userId = ?",
[interaction.user.id],
(err, row) => {

if (row) {

return interaction.reply({
content:
"❌ لا يمكنك تغيير المنتخب.",
ephemeral: true
});

}

db.run(
"INSERT INTO users (userId, team) VALUES (?, ?)",
[
interaction.user.id,
team
]
);

interaction.reply({
content:
"✅ ${team}",
ephemeral: true
});

}
);

}

}

});

// ================= LOGIN =================

client.login(
process.env.DISCORD_TOKEN
);