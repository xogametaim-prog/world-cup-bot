# ==================== main.py ====================
import discord
from discord.ext import commands, tasks
from discord import app_commands
import asyncio
import random
import time
import os
import sys
import traceback
import threading
from flask import Flask
from tickets import TicketButton, رتبة_التذاكر_المسموح_لها
from shop_data import *

تطبيق_فلاسك = Flask(__name__)

@تطبيق_فلاسك.route('/')
def الصفحة_الرئيسية():
    return "البوت شغال!"

def تشغيل_الخادم():
    تطبيق_فلاسك.run(host='0.0.0.0', port=8080)

التوكن = os.getenv("DISCORD_TOKEN")
if التوكن is None:
    print("❌ التوكن غير موجود")
    sys.exit(1)

الصلاحيات = discord.Intents.default()
الصلاحيات.message_content = True
الصلاحيات.members = True

البوت = commands.Bot(command_prefix="!", intents=الصلاحيات)

@tasks.loop(minutes=5)
async def رسائل_تلقائية():
    async with aiosqlite.connect("ticket_data.db") as db:
        cursor = await db.execute("SELECT قناة_الرسائل_التلقائية FROM اعدادات_السيرفر WHERE تم_الاعداد = 1")
        rows = await cursor.fetchall()
    
    for row in rows:
        channel_id = row[0]
        if channel_id:
            channel = البوت.get_channel(int(channel_id))
            if channel:
                رسالة = random.choice(الرسائل_التلقائية)
                await channel.send(رسالة)

@رسائل_تلقائية.before_loop
async def before_رسائل_تلقائية():
    await البوت.wait_until_ready()

@البوت.event
async def on_ready():
    print(f"✅ البوت دخل باسم: {البوت.user}")
    رسائل_تلقائية.start()
    try:
        await البوت.tree.sync()
        print(f"🔄 تم مزامنة الأوامر")
    except Exception as e:
        print(f"❌ فشل المزامنة: {e}")

@البوت.event
async def on_message(message):
    if message.author.bot:
        return
    update_message_count(str(message.author.id))
    mission_text = None
    if "اعمل" in str(message.content):
        mission_text = "اعمل"
    elif "هجوم" in str(message.content) or "attack" in str(message.content).lower():
        mission_text = "اهاجم"
    elif "سرقة" in str(message.content) or "rob" in str(message.content).lower():
        mission_text = "اسرق"
    if mission_text:
        advance_mission_progress(str(message.author.id), mission_text)
    await البوت.process_commands(message)

@البوت.event
async def on_guild_join(guild):
    embed = discord.Embed(
        title="⚙️ إعداد البوت",
        description="مرحباً! لإعداد البوت في سيرفرك، يرجى استخدام الأمر `/اعدادات` لتحديد:\n- الرتبة المسؤولة عن التذاكر\n- قناة لوحة التذاكر\n- قناة الرسائل التلقائية",
        color=0x5865F2
    )
    for channel in guild.text_channels:
        if channel.permissions_for(guild.me).send_messages:
            await channel.send(embed=embed)
            break

@البوت.tree.command(name="اعدادات", description="إعداد البوت في السيرفر")
@app_commands.describe(role="الرتبة المسؤولة عن التذاكر", panel_channel="قناة لوحة التذاكر", auto_channel="قناة الرسائل التلقائية")
async def اعدادات_البوت(interaction: discord.Interaction, role: discord.Role, panel_channel: discord.TextChannel, auto_channel: discord.TextChannel):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
        return
    
    async with aiosqlite.connect("ticket_data.db") as db:
        await db.execute('''CREATE TABLE IF NOT EXISTS اعدادات_السيرفر (
            guild_id TEXT PRIMARY KEY,
            رتبة_التذاكر TEXT,
            قناة_البانل TEXT,
            قناة_الرسائل_التلقائية TEXT,
            تم_الاعداد BOOLEAN DEFAULT 0
        )''')
        await db.execute("INSERT OR REPLACE INTO اعدادات_السيرفر (guild_id, رتبة_التذاكر, قناة_البانل, قناة_الرسائل_التلقائية, تم_الاعداد) VALUES (?, ?, ?, ?, 1)",
                        (str(interaction.guild_id), str(role.id), str(panel_channel.id), str(auto_channel.id)))
        await db.commit()
    
    global رتبة_التذاكر_المسموح_لها
    رتبة_التذاكر_المسموح_لها = role.id
    
    embed = discord.Embed(title="🛡️ نظام التذاكر", description="اضغط الزر لفتح تذكرة", color=0x5865F2)
    view = TicketButton()
    await panel_channel.send(embed=embed, view=view)
    
    await interaction.response.send_message(f"✅ تم إعداد البوت بنجاح!\nالرتبة: {role.mention}\nقناة البانل: {panel_channel.mention}\nقناة الرسائل: {auto_channel.mention}", ephemeral=True)

@البوت.tree.command(name="بنل", description="إرسال لوحة التذاكر")
async def بنل(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
        return
    embed = discord.Embed(title="🛡️ نظام التذاكر", description="اضغط الزر لفتح تذكرة", color=0x5865F2)
    view = TicketButton()
    await interaction.channel.send(embed=embed, view=view)
    await interaction.response.send_message("✅ تم إرسال لوحة التذاكر!", ephemeral=True)

@البوت.tree.command(name="help", description="عرض جميع الأوامر")
async def help_cmd(interaction: discord.Interaction):
    embed = discord.Embed(title="🤖 قائمة الأوامر", color=0x5865F2)
    embed.add_field(name="💰 الاقتصاد", value="`/رصيدي` `/يومي` `/ساعي` `/اعمل` `/الاغنياء`", inline=False)
    embed.add_field(name="🛒 المتجر العادي", value="`/المتجر` `/اشتري` `/مخزني`", inline=False)
    embed.add_field(name="🔫 السوق السوداء", value="`/بلاك_ماركت` `/شراء_بلاك`", inline=False)
    embed.add_field(name="👥 الفرق", value="`/تعيين_فريق` `/تفعيل_فريق` `/فرقي` `/دخول_فريق`", inline=False)
    embed.add_field(name="⚔️ القتال", value="`/هجوم @لاعب`", inline=False)
    embed.add_field(name="💰 السرقة", value="`/سرقة @لاعب`", inline=False)
    embed.add_field(name="📋 المهام", value="`/مهامي` `/تسليم_مهمة`", inline=False)
    embed.add_field(name="🎫 التذاكر", value="`/اعدادات` `/بنل`", inline=False)
    embed.add_field(name="📊 الإحصائيات", value="`/brq`", inline=False)
    embed.add_field(name="🔗 روابط", value=f"[دعم السيرفر]({رابط_السيرفر})", inline=False)
    embed.set_footer(text=f"تم تطوير هذا البوت بواسطة {اسم_المطور} | {معرف_المطور}")
    await interaction.response.send_message(embed=embed)

@البوت.tree.command(name="رصيدي", description="عرض رصيدك")
async def رصيدي(interaction: discord.Interaction):
    u = init_user(str(interaction.user.id))
    embed = discord.Embed(title=f"محفظة {interaction.user.display_name}", color=0x00AE86)
    embed.add_field(name="🪙 العملات", value=u["coins"], inline=True)
    embed.add_field(name="💎 الرصيد المميز", value=u["credits"], inline=True)
    await interaction.response.send_message(embed=embed)

@البوت.tree.command(name="يومي", description="مكافأة يومية")
async def يومي(interaction: discord.Interaction):
    uid = str(interaction.user.id)
    u = init_user(uid)
    now = int(time.time())
    if now - u["last_daily"] < ثواني_اليوم:
        remaining = ثواني_اليوم - (now - u["last_daily"])
        h = remaining // 3600
        m = (remaining % 3600) // 60
        await interaction.response.send_message(f"⏳ انتظر {h} ساعة {m} دقيقة", ephemeral=True)
        return
    update_user(uid, last_daily=now, coins=u["coins"]+مكافأة_يومية_عملات, credits=u["credits"]+مكافأة_يومية_رصيد)
    await interaction.response.send_message(f"🎁 +{مكافأة_يومية_عملات} عملة و +{مكافأة_يومية_رصيد} رصيد")

@البوت.tree.command(name="ساعي", description="مكافأة كل ساعة")
async def ساعي(interaction: discord.Interaction):
    uid = str(interaction.user.id)
    u = init_user(uid)
    now = int(time.time())
    if now - u["last_hourly"] < ثواني_الساعة:
        remaining = ثواني_الساعة - (now - u["last_hourly"])
        m = remaining // 60
        await interaction.response.send_message(f"⏳ انتظر {m} دقيقة", ephemeral=True)
        return
    update_user(uid, last_hourly=now, coins=u["coins"]+مكافأة_ساعية_عملات)
    await interaction.response.send_message(f"⏲️ +{مكافأة_ساعية_عملات} عملة")

@البوت.tree.command(name="اعمل", description="اعمل لكسب عملات")
async def اعمل(interaction: discord.Interaction):
    earn = random.randint(الحد_الأدنى_للعمل, الحد_الأقصى_للعمل)
    uid = str(interaction.user.id)
    u = init_user(uid)
    update_user(uid, coins=u["coins"]+earn)
    advance_mission_progress(uid, "اعمل")
    await interaction.response.send_message(f"💼 كسبت {earn} عملة")

@البوت.tree.command(name="الاغنياء", description="أغنى 10 لاعبين")
async def الاغنياء(interaction: discord.Interaction):
    rows = get_all_users()
    sorted_rows = sorted(rows, key=lambda x: x[1], reverse=True)[:10]
    if not sorted_rows:
        await interaction.response.send_message("لا يوجد مستخدمون بعد")
        return
    desc = ""
    for i, (uid, coins) in enumerate(sorted_rows):
        user = await البوت.fetch_user(int(uid))
        name = user.display_name if user else "مجهول"
        desc += f"{i+1}. **{name}** — {coins} 🪙\n"
    embed = discord.Embed(title="🏆 قائمة الأغنياء", description=desc, color=0xFFD700)
    await interaction.response.send_message(embed=embed)

@البوت.tree.command(name="المتجر", description="عرض المتجر العادي")
async def المتجر(interaction: discord.Interaction):
    embed = discord.Embed(title="🛒 المتجر العادي", color=0x3498db)
    for i in range(1, 14):
        item = المتجر_العادي[i]
        embed.add_field(name=f"{i}. {item['name']}", value=f"🪙 {item['coinPrice']} | 💎 {item['creditPrice']}", inline=True)
    await interaction.response.send_message(embed=embed)

@البوت.tree.command(name="مخزني", description="عرض مخزونك")
async def مخزني(interaction: discord.Interaction):
    uid = str(interaction.user.id)
    inv = get_inventory(uid)
    if not inv:
        await interaction.response.send_message("📦 مخزونك فارغ", ephemeral=True)
        return
    desc = ""
    for