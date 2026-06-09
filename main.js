// ================= IMPORTS =================

const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const {
Client,
GatewayIntentBits,
Events,
ActionRowBuilder,
StringSelectMenuBuilder,
EmbedBuilder
} = require("discord.js");

// ================= WEB SERVER =================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
res.send("World Cup 2026 Bot Online");
});

app.listen(PORT, () => {
console.log("Web server running on port ${PORT}");
});

// ================= DATABASE =================

const db = new sqlite3.Database("./worldcup.db");

db.run("CREATE TABLE IF NOT EXISTS users ( userId TEXT PRIMARY KEY, team TEXT NOT NULL )");

db.run("CREATE TABLE IF NOT EXISTS guilds ( guildId TEXT PRIMARY KEY, language TEXT NOT NULL )");

db.run("CREATE TABLE IF NOT EXISTS leaderboard ( userId TEXT PRIMARY KEY, points INTEGER DEFAULT 0 )");

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

// ================= FLAGS GAME =================

const guessTeams = [
{ name: "Argentina", code: "ar" },
{ name: "Brazil", code: "br" },
{ name: "France", code: "fr" },
{ name: "Spain", code: "es" },
{ name: "Germany", code: "de" },
{ name: "Portugal", code: "pt" },
{ name: "Netherlands", code: "nl" },
{ name: "Belgium", code: "be" },
{ name: "Croatia", code: "hr" },
{ name: "Morocco", code: "ma" },
{ name: "Japan", code: "jp" },
{ name: "South Korea", code: "kr" },
{ name: "Mexico", code: "mx" },
{ name: "USA", code: "us" },
{ name: "Canada", code: "ca" },
{ name: "Uruguay", code: "uy" },
{ name: "Italy", code: "it" },
{ name: "Turkey", code: "tr" },
{ name: "Saudi Arabia", code: "sa" }
];

// ================= LANGUAGES =================

const texts = {

ar: {
help: "📖 قائمة الأوامر",
pick: "⚽ اختر منتخبك",
alreadyPicked: "❌ اخترت منتخبك مسبقاً",
myTeam: "🏆 منتخبك:",
noTeam: "❌ لم تختر منتخباً",
guess: "🎮 خمن المنتخب",
languageSaved: "✅ تم حفظ اللغة العربية"
},

en: {
help: "📖 Commands List",
pick: "⚽ Choose your team",
alreadyPicked: "❌ You already selected a team",
myTeam: "🏆 Your Team:",
noTeam: "❌ No team selected",
guess: "🎮 Guess The Team",
languageSaved: "✅ English language saved"
}

};

// ================= CLIENT =================

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

client.once(
Events.ClientReady,
(readyClient) => {

console.log(
"Logged in as ${readyClient.user.tag}"
);

}
);
// ================= INTERACTIONS =================

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

// ================= SLASH COMMANDS =================

if (interaction.isChatInputCommand()) {

const lang = await getLanguage(interaction.guild.id);
const t = texts[lang];

// ===== HELP =====

if (interaction.commandName === "help") {

const embed = new EmbedBuilder()
.setTitle(t.help)
.setDescription("/help /worldcup /teams /pick_team /my_team /guess_team /leaderboard /language /broadcast");

return interaction.reply({
embeds: [embed]
});

}

// ===== WORLDCUP =====

if (interaction.commandName === "worldcup") {

return interaction.reply(
lang === "ar"
? "🏆 كأس العالم 2026 سيقام في أمريكا وكندا والمكسيك."
: "🏆 FIFA World Cup 2026 will be hosted by USA, Canada and Mexico."
);

}

// ===== TEAMS =====

if (interaction.commandName === "teams") {

return interaction.reply(
teams.join(" • ")
);

}

// ===== LANGUAGE =====

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

// ===== PICK TEAM =====

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

// ===== MY TEAM =====

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

// ===== GUESS TEAM =====

if (interaction.commandName === "guess_team") {

const randomTeam =
guessTeams[
Math.floor(
Math.random() * guessTeams.length
)
];

const imageUrl =
"https://flagcdn.com/w640/${randomTeam.code}.png";

const embed =
new EmbedBuilder()
.setTitle("🎮 Guess The Team")
.setDescription("اكتب اسم المنتخب الظاهر في الصورة")
.setImage(imageUrl);

return interaction.reply({
embeds: [embed]
});

}

// ===== LEADERBOARD =====

if (interaction.commandName === "leaderboard") {

db.all(
"SELECT * FROM leaderboard ORDER BY points DESC LIMIT 10",
[],
(err, rows) => {

if (!rows?.length) {

return interaction.reply(
"لا يوجد متصدرون بعد."
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

// ===== BROADCAST =====

if (interaction.commandName === "broadcast") {

const message =
interaction.options.getString("message");

await interaction.reply({
content: "📨 جاري الإرسال...",
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
content: "✅ تم الإرسال إلى ${sent} عضو",
ephemeral: true
});

}

}

// ================= SELECT MENU =================

if (interaction.isStringSelectMenu()) {

if (interaction.customId === "team_select") {

const team =
interaction.values[0];

db.get(
"SELECT * FROM users WHERE userId = ?",
[interaction.user.id],
(err, row) => {

if (row) {

return interaction.reply({
content: "❌ لا يمكنك تغيير المنتخب.",
ephemeral: true
});

}

db.run(
"INSERT INTO users(userId, team) VALUES(?, ?)",
[
interaction.user.id,
team
]
);

interaction.reply({
content:
"✅ تم اختيار ${team}",
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