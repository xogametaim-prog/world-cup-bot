# ==================== management.py ====================
import discord
from discord.ext import commands
from discord import app_commands
import aiosqlite
import asyncio
import random
import time
import logging
from datetime import datetime

logger = logging.getLogger('discord_bot')

class EmbedHelper:
    @staticmethod
    def create(title=None, description=None, color=None, fields=None, footer_text=None, image_url=None, thumbnail_url=None, author_name=None, author_icon=None):
        try:
            if color is None: color = 0x3498db
            if isinstance(color, str): color = int(color.replace("#", ""), 16)
            embed = discord.Embed(title=title, description=description, color=color)
            if image_url: embed.set_image(url=image_url)
            if thumbnail_url: embed.set_thumbnail(url=thumbnail_url)
            if author_name: embed.set_author(name=author_name, icon_url=author_icon)
            if fields:
                for f in fields: embed.add_field(name=f.get("name", ""), value=f.get("value", ""), inline=f.get("inline", True))
            if footer_text: embed.set_footer(text=footer_text)
            embed.timestamp = datetime.utcnow()
            return embed
        except Exception as e:
            logger.error(f"❌ EmbedHelper.create: {e}")
            return discord.Embed(description="حدث خطأ.", color=0xFF0000)

    @staticmethod
    async def send(target, title=None, description=None, color=None, fields=None, footer_text=None, image_url=None, thumbnail_url=None, author_name=None, author_icon=None, is_ephemeral=False, view=None):
        try:
            embed = EmbedHelper.create(title=title, description=description, color=color, fields=fields, footer_text=footer_text, image_url=image_url, thumbnail_url=thumbnail_url, author_name=author_name, author_icon=author_icon)
            if hasattr(target, 'response'):
                if target.response.is_done(): await target.followup.send(embed=embed, ephemeral=is_ephemeral, view=view)
                else: await target.response.send_message(embed=embed, ephemeral=is_ephemeral, view=view)
            else: await target.send(embed=embed, view=view)
            return embed
        except Exception as e:
            logger.error(f"❌ EmbedHelper.send: {e}")
            try:
                fb = discord.Embed(description="حدث خطأ.", color=0xFF0000)
                if hasattr(target, 'response'):
                    if target.response.is_done(): await target.followup.send(embed=fb, ephemeral=True)
                    else: await target.response.send_message(embed=fb, ephemeral=True)
                else: await target.send(embed=fb)
            except: pass
            return None

class Management(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.giveaway_tasks = {}

    async def init_db(self):
        async with aiosqlite.connect("server_data.db") as db:
            await db.execute('''CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                welcome_channel_id TEXT
            )''')
            await db.execute('''CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                user_id TEXT,
                warn_count INTEGER DEFAULT 0,
                reason TEXT
            )''')
            await db.execute('''CREATE TABLE IF NOT EXISTS auto_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                trigger_word TEXT,
                response_text TEXT
            )''')
            await db.execute('''CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                channel_id TEXT,
                message_id TEXT,
                title TEXT,
                description TEXT,
                emoji TEXT,
                end_time INTEGER,
                winners_count INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT 1
            )''')
            await db.commit()
        logger.info("✅ تم تهيئة قاعدة البيانات (جميع الجداول)")

    @commands.Cog.listener()
    async def on_ready(self):
        await self.init_db()
        await self.restore_giveaways()
        logger.info("✅ Management جاهز")

    async def restore_giveaways(self):
        async with aiosqlite.connect("server_data.db") as db:
            cursor = await db.execute("SELECT * FROM giveaways WHERE is_active = 1")
            rows = await cursor.fetchall()
        for row in rows:
            gid, cid, mid, title, desc, emoji, end_time, winners, _ = row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9]
            remaining = end_time - time.time()
            if remaining <= 0:
                await self.end_giveaway(gid, cid, mid, title, emoji, winners)
            else:
                task = asyncio.create_task(self._schedule_giveaway(gid, cid, mid, title, emoji, winners, remaining))
                self.giveaway_tasks[f"{gid}-{mid}"] = task

    async def _schedule_giveaway(self, gid, cid, mid, title, emoji, winners, delay):
        await asyncio.sleep(delay)
        await self.end_giveaway(gid, cid, mid, title, emoji, winners)

    async def end_giveaway(self, guild_id, channel_id, message_id, title, emoji, winners_count):
        guild = self.bot.get_guild(int(guild_id))
        if not guild: return
        channel = guild.get_channel(int(channel_id))
        if not channel: return
        try: msg = await channel.fetch_message(int(message_id))
        except: msg = None
        participants = []
        if msg:
            for reaction in msg.reactions:
                if str(reaction.emoji) == emoji:
                    async for user in reaction.users():
                        if not user.bot: participants.append(user)
                    break
        winners_list = []
        if participants:
            actual = min(winners_count, len(participants))
            winners_list = random.sample(participants, actual)
        txt = "\n".join([w.mention for w in winners_list]) if winners_list else "لا يوجد فائزين"
        embed = EmbedHelper.create(title=f"🎉 انتهى القيف أوي: {title}", description=f"**الفائزين:**\n{txt}", color=0xFFD700)
        if msg: await msg.reply(embed=embed)
        else: await channel.send(embed=embed)
        async with aiosqlite.connect("server_data.db") as db:
            await db.execute("UPDATE giveaways SET is_active = 0 WHERE guild_id = ? AND message_id = ?", (guild_id, message_id))
            await db.commit()
        key = f"{guild_id}-{message_id}"
        if key in self.giveaway_tasks: del self.giveaway_tasks[key]

    @commands.Cog.listener()
    async def on_guild_join(self, guild):
        try:
            target = None
            for ch in guild.text_channels:
                if ch.permissions_for(guild.me).send_messages:
                    target = ch; break
            if target:
                embed = EmbedHelper.create(title="👋 شكراً لإضافتي!", description=f"أهلاً بك في **{guild.name}**!\nاستخدم **/set_welcome** لتعيين قناة الترحيب.", color=0x00AAFF)
                await target.send(embed=embed)
        except Exception as e:
            logger.error(f"❌ on_guild_join: {e}")

    @commands.Cog.listener()
    async def on_member_join(self, member):
        try:
            if member.bot: return
            g = member.guild
            async with aiosqlite.connect("server_data.db") as db:
                cur = await db.execute("SELECT welcome_channel_id FROM guild_settings WHERE guild_id = ?", (str(g.id),))
                row = await cur.fetchone()
            if row and row[0]:
                ch = g.get_channel(int(row[0]))
                if ch:
                    before = g.member_count - 1
                    now = g.member_count
                    embed = EmbedHelper.create(title="🎉 عضو جديد!", description=f"أهلاً {member.mention} في **{g.name}**!", color=0x00FF00, fields=[{"name": "👥 قبل دخولك", "value": str(before), "inline": True}, {"name": "👥 بعد دخولك", "value": str(now), "inline": True}], thumbnail_url=member.display_avatar.url)
                    await ch.send(embed=embed)
        except Exception as e:
            logger.error(f"❌ on_member_join: {e}")

    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author.bot or not message.guild: return
        try:
            async with aiosqlite.connect("server_data.db") as db:
                cur = await db.execute("SELECT response_text FROM auto_responses WHERE guild_id = ? AND LOWER(trigger_word) = LOWER(?)", (str(message.guild.id), message.content.strip()))
                row = await cur.fetchone()
            if row: await message.reply(row[0], mention_author=False)
        except Exception as e:
            logger.error(f"❌ auto_response: {e}")

    @app_commands.command(name="set_welcome", description="تحديد قناة الترحيب")
    @app_commands.describe(channel="قناة الترحيب")
    @app_commands.default_permissions(administrator=True)
    async def set_welcome(self, interaction: discord.Interaction, channel: discord.TextChannel):
        try:
            await interaction.response.defer(ephemeral=True)
            async with aiosqlite.connect("server_data.db") as db:
                await db.execute("INSERT OR REPLACE INTO guild_settings (guild_id, welcome_channel_id) VALUES (?, ?)", (str(interaction.guild_id), str(channel.id)))
                await db.commit()
            await interaction.followup.send(embed=EmbedHelper.create(description=f"✅ تم تعيين {channel.mention} كقناة ترحيب!", color=0x00FF00), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ set_welcome: {e}")

    @app_commands.command(name="اضافة_اختصار", description="إضافة رد تلقائي")
    @app_commands.describe(trigger="الكلمة المفتاحية", response="الرد")
    @app_commands.default_permissions(administrator=True)
    async def add_response(self, interaction: discord.Interaction, trigger: str, response: str):
        try:
            await interaction.response.defer(ephemeral=True)
            async with aiosqlite.connect("server_data.db") as db:
                await db.execute("INSERT INTO auto_responses (guild_id, trigger_word, response_text) VALUES (?, ?, ?)", (str(interaction.guild_id), trigger.strip(), response))
                await db.commit()
            await interaction.followup.send(embed=EmbedHelper.create(description=f"✅ تم إضافة الاختصار: `{trigger}`", color=0x00FF00), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ add_response: {e}")

    @app_commands.command(name="حذف_اختصار", description="حذف رد تلقائي")
    @app_commands.describe(trigger="الكلمة المفتاحية")
    @app_commands.default_permissions(administrator=True)
    async def remove_response(self, interaction: discord.Interaction, trigger: str):
        try:
            await interaction.response.defer(ephemeral=True)
            async with aiosqlite.connect("server_data.db") as db:
                await db.execute("DELETE FROM auto_responses WHERE guild_id = ? AND trigger_word = ?", (str(interaction.guild_id), trigger.strip()))
                await db.commit()
            await interaction.followup.send(embed=EmbedHelper.create(description=f"✅ تم حذف الاختصار: `{trigger}`", color=0x00FF00), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ remove_response: {e}")

    @app_commands.command(name="الاختصارات", description="عرض جميع الاختصارات")
    async def list_responses(self, interaction: discord.Interaction):
        try:
            await interaction.response.defer(ephemeral=True)
            async with aiosqlite.connect("server_data.db") as db:
                cur = await db.execute("SELECT trigger_word, response_text FROM auto_responses WHERE guild_id = ?", (str(interaction.guild_id),))
                rows = await cur.fetchall()
            if not rows:
                await interaction.followup.send(embed=EmbedHelper.create(description="لا توجد اختصارات.", color=0xFFA500), ephemeral=True)
                return
            txt = "\n".join([f"**{t}** → {r}" for t, r in rows])
            await interaction.followup.send(embed=EmbedHelper.create(title="📋 الاختصارات", description=txt, color=0x3498db), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ list_responses: {e}")

    @commands.command(name="ت", aliases=["warn"])
    @commands.has_permissions(moderate_members=True)
    async def warn_user(self, ctx, member: discord.Member, *, reason="بدون سبب"):
        try:
            async with aiosqlite.connect("server_data.db") as db:
                cur = await db.execute("SELECT warn_count FROM warnings WHERE guild_id = ? AND user_id = ?", (str(ctx.guild.id), str(member.id)))
                row = await cur.fetchone()
                if row:
                    nc = row[0] + 1
                    await db.execute("UPDATE warnings SET warn_count = ?, reason = ? WHERE guild_id = ? AND user_id = ?", (nc, reason, str(ctx.guild.id), str(member.id)))
                else:
                    nc = 1
                    await db.execute("INSERT INTO warnings (guild_id, user_id, warn_count, reason) VALUES (?, ?, ?, ?)", (str(ctx.guild.id), str(member.id), 1, reason))
                await db.commit()
            embed = EmbedHelper.create(title="⚠️ تحذير", description=f"تم تحذير {member.mention}", color=0xFFA500, fields=[{"name": "📋 السبب", "value": reason, "inline": False}, {"name": "🔢 التحذيرات", "value": str(nc), "inline": True}, {"name": "👮 بواسطة", "value": ctx.author.mention, "inline": True}])
            await ctx.send(embed=embed)
            try: await member.send(embed=EmbedHelper.create(title=f"⚠️ تحذير في {ctx.guild.name}", description=f"**السبب:** {reason}\n**التحذيرات:** {nc}", color=0xFFA500))
            except: pass
        except Exception as e:
            logger.error(f"❌ warn: {e}")

    @commands.command(name="شيلت", aliases=["unwarn"])
    @commands.has_permissions(moderate_members=True)
    async def unwarn_user(self, ctx, member: discord.Member):
        try:
            async with aiosqlite.connect("server_data.db") as db:
                cur = await db.execute("SELECT warn_count FROM warnings WHERE guild_id = ? AND user_id = ?", (str(ctx.guild.id), str(member.id)))
                row = await cur.fetchone()
                if not row or row[0] <= 0:
                    await EmbedHelper.send(ctx, description=f"❌ {member.mention} ليس لديه تحذيرات!", color=0xFF0000)
                    return
                nc = row[0] - 1
                if nc <= 0: await db.execute("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?", (str(ctx.guild.id), str(member.id)))
                else: await db.execute("UPDATE warnings SET warn_count = ? WHERE guild_id = ? AND user_id = ?", (nc, str(ctx.guild.id), str(member.id)))
                await db.commit()
            await EmbedHelper.send(ctx, description=f"✅ تم إزالة تحذير من {member.mention} (المتبقي: {max(0, nc)})", color=0x00FF00)
        except Exception as e:
            logger.error(f"❌ unwarn: {e}")

    @app_commands.command(name="تحذيرات", description="عرض قائمة المحذرين")
    async def list_warnings(self, interaction: discord.Interaction):
        try:
            await interaction.response.defer(ephemeral=True)
            async with aiosqlite.connect("server_data.db") as db:
                cur = await db.execute("SELECT user_id, warn_count, reason FROM warnings WHERE guild_id = ? AND warn_count > 0 ORDER BY warn_count DESC", (str(interaction.guild_id),))
                rows = await cur.fetchall()
            if not rows:
                await interaction.followup.send(embed=EmbedHelper.create(description="✅ لا يوجد محذرين!", color=0x00FF00), ephemeral=True)
                return
            txt = ""
            for uid, cnt, rsn in rows:
                m = interaction.guild.get_member(int(uid))
                txt += f"{m.mention if m else f'<@{uid}>'} - **{cnt}** - {rsn}\n"
            await interaction.followup.send(embed=EmbedHelper.create(title="📋 المحذرين", description=txt, color=0xFFA500), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ list_warnings: {e}")

    @app_commands.command(name="giveaway", description="إنشاء قيف أوي")
    @app_commands.describe(title="العنوان", description="الوصف", duration="المدة بالدقائق", winners="عدد الفائزين", emoji="إيموجي التفاعل")
    @app_commands.default_permissions(administrator=True)
    async def giveaway(self, interaction: discord.Interaction, title: str, description: str, duration: int, winners: int = 1, emoji: str = "🎉"):
        try:
            await interaction.response.defer()
            end = int(time.time() + (duration * 60))
            embed = EmbedHelper.create(title=f"🎉 {title}", description=f"{description}\n\n**المدة:** {duration} دقيقة\n**الفائزين:** {winners}\n**تفاعل بـ:** {emoji}", color=0x9B59B6, fields=[{"name": "⏰ ينتهي", "value": f"<t:{end}:R>", "inline": True}, {"name": "👤 بواسطة", "value": interaction.user.mention, "inline": True}], footer_text="تفاعل للإشتراك!")
            await interaction.followup.send(embed=embed)
            msg = await interaction.original_response()
            await msg.add_reaction(emoji)
            async with aiosqlite.connect("server_data.db") as db:
                await db.execute("INSERT INTO giveaways (guild_id, channel_id, message_id, title, description, emoji, end_time, winners_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)", (str(interaction.guild_id), str(interaction.channel_id), str(msg.id), title, description, emoji, end, winners))
                await db.commit()
            task = asyncio.create_task(self._schedule_giveaway(str(interaction.guild_id), str(interaction.channel_id), str(msg.id), title, emoji, winners, duration * 60))
            self.giveaway_tasks[f"{interaction.guild_id}-{msg.id}"] = task
        except Exception as e:
            logger.error(f"❌ giveaway: {e}")

    @app_commands.command(name="join", description="انضمام البوت للروم الصوتي")
    async def join_voice(self, interaction: discord.Interaction):
        try:
            await interaction.response.defer()
            if not interaction.user.voice or not interaction.user.voice.channel:
                await interaction.followup.send(embed=EmbedHelper.create(description="❌ يجب أن تكون في روم صوتي!", color=0xFF0000), ephemeral=True)
                return
            channel = interaction.user.voice.channel
            permissions = channel.permissions_for(interaction.guild.me)
            if not permissions.connect or not permissions.speak:
                await interaction.followup.send(embed=EmbedHelper.create(description="❌ لا أملك صلاحية الانضمام أو التحدث في هذا الروم!", color=0xFF0000), ephemeral=True)
                return
            if interaction.guild.voice_client:
                if interaction.guild.voice_client.channel == channel:
                    await interaction.followup.send(embed=EmbedHelper.create(description="✅ أنا موجود بالفعل في رومك!", color=0x00FF00), ephemeral=True)
                    return
                await interaction.guild.voice_client.disconnect()
            await channel.connect()
            await interaction.followup.send(embed=EmbedHelper.create(description=f"✅ تم الانضمام إلى {channel.mention}", color=0x00FF00))
        except discord.errors.ClientException as e:
            logger.error(f"❌ join_voice ClientException: {e}")
            await interaction.followup.send(embed=EmbedHelper.create(description=f"❌ خطأ في الاتصال: {str(e)}", color=0xFF0000), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ join_voice: {type(e).__name__}: {e}")
            await interaction.followup.send(embed=EmbedHelper.create(description="❌ فشل الانضمام للروم الصوتي. تأكد من تثبيت PyNaCl!", color=0xFF0000), ephemeral=True)

    @app_commands.command(name="leave", description="مغادرة البوت للروم الصوتي")
    async def leave_voice(self, interaction: discord.Interaction):
        try:
            await interaction.response.defer()
            if interaction.guild.voice_client:
                await interaction.guild.voice_client.disconnect()
                await interaction.followup.send(embed=EmbedHelper.create(description="✅ تم مغادرة الروم الصوتي", color=0x00FF00))
            else:
                await interaction.followup.send(embed=EmbedHelper.create(description="❌ لست في روم صوتي!", color=0xFF0000), ephemeral=True)
        except Exception as e:
            logger.error(f"❌ leave_voice: {e}")

    @app_commands.command(name="help", description="عرض قائمة المساعدة")
    async def help_command(self, interaction: discord.Interaction):
        embed = EmbedHelper.create(title="📚 قائمة المساعدة", description="بوت خدمي متكامل", color=0x3498db, fields=[{"name": "⚙️ الإدارة", "value": "`/set_welcome` `/اضافة_اختصار` `/حذف_اختصار` `/الاختصارات`", "inline": False}, {"name": "⚠️ التحذيرات", "value": "`+ت @عضو` `+شيلت @عضو` `/تحذيرات`", "inline": False}, {"name": "🎉 القيف أوي", "value": "`/giveaway`", "inline": False}, {"name": "🔊 الصوتيات", "value": "`/join` `/leave`", "inline": False}], footer_text="شغال 24 ساعة")
        await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot):
    await bot.add_cog(Management(bot))