import discord
from discord.ext import commands
from discord import app_commands
import aiosqlite
import asyncio
import random
import time
import os
import sys
import traceback
import threading
from flask import Flask
from datetime import datetime

تطبيق_فلاسك = Flask(name)

@تطبيق_فلاسك.route('/')
def الصفحة_الرئيسية():
return "البوت شغال!"

def تشغيل_الخادم():
تطبيق_فلاسك.run(host='0.0.0.0', port=8080)

التوكن = os.getenv("DISCORD_TOKEN")
if التوكن is None:
print("❌ التوكن غير موجود")
sys.exit(1)

رتبة_الأونر = 1507815463172833331
قناة_التسجيل = None

عملات_البداية = 1000
رصيد_البداية = 0
صحة_الفريق_البدائية = 200
مكافأة_يومية_عملات = 500
مكافأة_يومية_رصيد = 10
مكافأة_ساعية_عملات = 100
الحد_الأدنى_للعمل = 50
الحد_الأقصى_للعمل = 200
مدة_السرقة = 600
نسبة_السرقة = 0.2
مدة_التخفي = 1800
الحد_الأقصى_لاسم_الفريق = 20
ثواني_اليوم = 86400
ثواني_الساعة = 3600
ضرر_اللكمة_الأساسي = 10

أضرار_الأسلحة = {2: 25, 7: 50, 9: 20, 12: 35, 16: 45, 23: 40}
رابط_السيرفر = "https://discord.gg/gzFVT4zXKU"
اسم_المطور = "taim"
معرف_المطور = "ta_im1@"
مسار_قاعدة_البيانات = "game_data.db"
مسار_تذاكر_البيانات = "ticket_data.db"

async def تهيئة_قاعدة_البيانات():
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute('''CREATE TABLE IF NOT EXISTS المستخدمين (
user_id TEXT PRIMARY KEY,
عملات INTEGER DEFAULT 1000,
رصيد INTEGER DEFAULT 0,
اخر_يومي INTEGER DEFAULT 0,
اخر_ساعي INTEGER DEFAULT 0,
الفريق_النشط INTEGER DEFAULT 0,
اخر_سرقة INTEGER DEFAULT 0
)''')
await قاعدة.execute('''CREATE TABLE IF NOT EXISTS الفرق (
user_id TEXT,
slot INTEGER,
الاسم TEXT DEFAULT '',
الصحة INTEGER DEFAULT 200,
مخفي_حتى INTEGER DEFAULT 0,
PRIMARY KEY (user_id, slot)
)''')
await قاعدة.execute('''CREATE TABLE IF NOT EXISTS المخزون (
user_id TEXT,
item_id INTEGER,
الكمية INTEGER DEFAULT 0,
PRIMARY KEY (user_id, item_id)
)''')
await قاعدة.execute('''CREATE TABLE IF NOT EXISTS المتجر (
item_id INTEGER PRIMARY KEY,
الاسم TEXT,
سعر_عملات INTEGER,
سعر_رصيد INTEGER,
الوصف TEXT
)''')
await قاعدة.execute('''CREATE TABLE IF NOT EXISTS السوق_السوداء (
item_id INTEGER PRIMARY KEY,
الاسم TEXT,
سعر_عملات INTEGER,
سعر_رصيد INTEGER,
الوصف TEXT,
الصفحة INTEGER
)''')
await قاعدة.execute('''CREATE TABLE IF NOT EXISTS المهام (
user_id TEXT PRIMARY KEY,
مهمة1 TEXT, مهمة2 TEXT, مهمة3 TEXT,
تقدم1 INTEGER, تقدم2 INTEGER, تقدم3 INTEGER,
مكتمل1 INTEGER, مكتمل2 INTEGER, مكتمل3 INTEGER,
اخر_تصفير INTEGER
)''')

async def init_ticket_db():
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute('''CREATE TABLE IF NOT EXISTS ticket_config (
guild_id TEXT PRIMARY KEY,
category_id TEXT,
log_channel_id TEXT,
panel_channel_id TEXT,
panel_message_id TEXT,
embed_title TEXT DEFAULT '🛡️ فتح تذكرة جديدة',
embed_description TEXT DEFAULT 'اضغط على الزر أدناه لفتح تذكرة وسيقوم فريق الدعم بالتواصل معك قريباً.',
embed_color TEXT DEFAULT '5865F2',
auto_close_hours INTEGER DEFAULT 24
)''')
await db.execute('''CREATE TABLE IF NOT EXISTS tickets (
ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
guild_id TEXT,
channel_id TEXT,
creator_id TEXT,
creator_name TEXT,
claimer_id TEXT,
status TEXT DEFAULT 'open',
created_at INTEGER,
closed_at INTEGER,
closed_by TEXT,
reason TEXT
)''')
await db.execute('''CREATE TABLE IF NOT EXISTS staff_roles (
guild_id TEXT,
role_id TEXT,
role_type TEXT,
PRIMARY KEY (guild_id, role_id)
)''')
await db.execute('''CREATE TABLE IF NOT EXISTS blacklist (
guild_id TEXT,
user_id TEXT,
reason TEXT,
banned_at INTEGER,
PRIMARY KEY (guild_id, user_id)
)''')
await db.execute('''CREATE TABLE IF NOT EXISTS tags (
guild_id TEXT,
tag_name TEXT,
tag_content TEXT,
created_by TEXT,
PRIMARY KEY (guild_id, tag_name)
)''')
await db.execute('''CREATE TABLE IF NOT EXISTS auto_close_settings (
guild_id TEXT PRIMARY KEY,
enabled INTEGER DEFAULT 0,
hours INTEGER DEFAULT 24
)''')
await db.execute('''CREATE TABLE IF NOT EXISTS language_settings (
guild_id TEXT PRIMARY KEY,
language TEXT DEFAULT 'en'
)''')
await db.commit()

async def get_ticket_config(guild_id):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT category_id, log_channel_id, panel_channel_id, panel_message_id, embed_title, embed_description, embed_color, auto_close_hours FROM ticket_config WHERE guild_id = ?", (str(guild_id),)) as cursor:
row = await cursor.fetchone()
if row:
return {
"category_id": row[0],
"log_channel_id": row[1],
"panel_channel_id": row[2],
"panel_message_id": row[3],
"embed_title": row[4],
"embed_description": row[5],
"embed_color": row[6],
"auto_close_hours": row[7]
}
return None

async def save_ticket_config(guild_id, category_id=None, log_channel_id=None, panel_channel_id=None, panel_message_id=None, embed_title=None, embed_description=None, embed_color=None, auto_close_hours=None):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
existing = await get_ticket_config(guild_id)
if existing:
await db.execute("UPDATE ticket_config SET category_id = COALESCE(?, category_id), log_channel_id = COALESCE(?, log_channel_id), panel_channel_id = COALESCE(?, panel_channel_id), panel_message_id = COALESCE(?, panel_message_id), embed_title = COALESCE(?, embed_title), embed_description = COALESCE(?, embed_description), embed_color = COALESCE(?, embed_color), auto_close_hours = COALESCE(?, auto_close_hours) WHERE guild_id = ?",
(category_id, log_channel_id, panel_channel_id, panel_message_id, embed_title, embed_description, embed_color, auto_close_hours, str(guild_id)))
else:
await db.execute("INSERT INTO ticket_config (guild_id, category_id, log_channel_id, panel_channel_id, panel_message_id, embed_title, embed_description, embed_color, auto_close_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
(str(guild_id), category_id, log_channel_id, panel_channel_id, panel_message_id, embed_title or '🛡️ فتح تذكرة جديدة', embed_description or 'اضغط على الزر أدناه لفتح تذكرة وسيقوم فريق الدعم بالتواصل معك قريباً.', embed_color or '5865F2', auto_close_hours or 24))
await db.commit()

async def create_ticket_channel(guild, creator, category_id):
ticket_number = 1
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT COUNT(*) FROM tickets WHERE guild_id = ?", (str(guild.id),)) as cursor:
count = (await cursor.fetchone())[0]
ticket_number = count + 1

async def log_ticket_event(bot, guild_id, event_type, details):
config = await get_ticket_config(guild_id)
if not config or not config["log_channel_id"]:
return

async def is_staff(member, guild_id):
if member.guild_permissions.administrator:
return True

async def is_blacklisted(guild_id, user_id):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT * FROM blacklist WHERE guild_id = ? AND user_id = ?", (str(guild_id), str(user_id))) as cursor:
return await cursor.fetchone() is not None

async def add_to_blacklist(guild_id, user_id, reason, banned_by):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute("INSERT OR REPLACE INTO blacklist (guild_id, user_id, reason, banned_at) VALUES (?, ?, ?, ?)",
(str(guild_id), str(user_id), reason, int(datetime.now().timestamp())))
await db.commit()

async def remove_from_blacklist(guild_id, user_id):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute("DELETE FROM blacklist WHERE guild_id = ? AND user_id = ?", (str(guild_id), str(user_id)))
await db.commit()

async def get_ticket_info(channel_id):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT ticket_id, creator_id, creator_name, claimer_id, status, created_at FROM tickets WHERE channel_id = ?", (str(channel_id),)) as cursor:
row = await cursor.fetchone()
if row:
return {
"ticket_id": row[0],
"creator_id": row[1],
"creator_name": row[2],
"claimer_id": row[3],
"status": row[4],
"created_at": row[5]
}
return None

async def update_ticket_status(channel_id, status, claimer_id=None, closed_by=None, reason=None):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
if status == "claimed":
await db.execute("UPDATE tickets SET status = ?, claimer_id = ? WHERE channel_id = ?", (status, claimer_id, str(channel_id)))
elif status == "closed":
await db.execute("UPDATE tickets SET status = ?, closed_at = ?, closed_by = ?, reason = ? WHERE channel_id = ?", 
(status, int(datetime.now().timestamp()), closed_by, reason, str(channel_id)))
elif status == "reopened":
await db.execute("UPDATE tickets SET status = ?, closed_at = NULL, closed_by = NULL, reason = NULL WHERE channel_id = ?", (status, str(channel_id)))
else:
await db.execute("UPDATE tickets SET status = ? WHERE channel_id = ?", (status, str(channel_id)))
await db.commit()

async def create_ticket_record(guild_id, channel_id, creator_id, creator_name):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute("INSERT INTO tickets (guild_id, channel_id, creator_id, creator_name, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
(str(guild_id), str(channel_id), str(creator_id), creator_name, int(datetime.now().timestamp())))
await db.commit()

async def add_staff_role(guild_id, role_id, role_type):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute("INSERT OR REPLACE INTO staff_roles (guild_id, role_id, role_type) VALUES (?, ?, ?)", (str(guild_id), str(role_id), role_type))
await db.commit()

async def remove_staff_role(guild_id, role_id):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute("DELETE FROM staff_roles WHERE guild_id = ? AND role_id = ?", (str(guild_id), str(role_id)))
await db.commit()

async def get_all_staff_roles(guild_id):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT role_id, role_type FROM staff_roles WHERE guild_id = ?", (str(guild_id),)) as cursor:
return await cursor.fetchall()

class TicketButton(discord.ui.View):
def init(self, config):
super().init(timeout=None)
self.config = config

class TicketControlView(discord.ui.View):
def init(self):
super().init(timeout=None)

async def احصل_على_مستخدم(المعرف):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT عملات, رصيد, اخر_يومي, اخر_ساعي, الفريق_النشط, اخر_سرقة FROM المستخدمين WHERE user_id = ?", (المعرف,)) as مؤشر:
الصف = await مؤشر.fetchone()
if الصف is None:
await قاعدة.execute("INSERT INTO المستخدمين (user_id, عملات, رصيد) VALUES (?, ?, ?)", (المعرف, عملات_البداية, رصيد_البداية))
await قاعدة.execute("INSERT OR IGNORE INTO الفرق (user_id, slot, الاسم, الصحة) VALUES (?, 0, '', ?), (?, 1, '', ?)", (المعرف, صحة_الفريق_البدائية, المعرف, صحة_الفريق_البدائية))
await قاعدة.commit()
return {"عملات": عملات_البداية, "رصيد": رصيد_البداية, "اخر_يومي": 0, "اخر_ساعي": 0, "الفريق_النشط": 0, "اخر_سرقة": 0}
return {"عملات": الصف[0], "رصيد": الصف[1], "اخر_يومي": الصف[2], "اخر_ساعي": الصف[3], "الفريق_النشط": الصف[4], "اخر_سرقة": الصف[5] if len(الصف) > 5 else 0}

async def تحديث_مستخدم(المعرف, **kwargs):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
for مفتاح, قيمة in kwargs.items():
await قاعدة.execute(f"UPDATE المستخدمين SET {مفتاح} = ? WHERE user_id = ?", (قيمة, المعرف))
await قاعدة.commit()

async def احصل_على_فريق(المعرف, الرقم, مع_الصحة=False):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
if مع_الصحة:
async with قاعدة.execute("SELECT الاسم, الصحة, مخفي_حتى FROM الفرق WHERE user_id = ? AND slot = ?", (المعرف, الرقم)) as مؤشر:
الصف = await مؤشر.fetchone()
return (الصف[0], الصف[1], الصف[2]) if الصف else ("", صحة_الفريق_البدائية, 0)
else:
async with قاعدة.execute("SELECT الاسم FROM الفرق WHERE user_id = ? AND slot = ?", (المعرف, الرقم)) as مؤشر:
الصف = await مؤشر.fetchone()
return الصف[0] if الصف else ""

async def تعيين_فريق(المعرف, الرقم, الاسم):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("INSERT OR REPLACE INTO الفرق (user_id, slot, الاسم, الصحة) VALUES (?, ?, ?, COALESCE((SELECT الصحة FROM الفرق WHERE user_id=? AND slot=?), ?))",
(المعرف, الرقم, الاسم, المعرف, الرقم, صحة_الفريق_البدائية))
await قاعدة.commit()

async def تحديث_صحة_الفريق(المعرف, الرقم, صحة_جديدة):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("UPDATE الفرق SET الصحة = ? WHERE user_id = ? AND slot = ?", (صحة_جديدة, المعرف, الرقم))
await قاعدة.commit()

async def تحديث_اختفاء_الفريق(المعرف, الرقم, حتى):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("UPDATE الفرق SET مخفي_حتى = ? WHERE user_id = ? AND slot = ?", (حتى, المعرف, الرقم))
await قاعدة.commit()

async def احصل_على_كل_المستخدمين():
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT user_id, عملات FROM المستخدمين") as مؤشر:
return await مؤشر.fetchall()

async def أضف_إلى_المخزون(المعرف, رقم_السلعة, كمية):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("INSERT INTO المخزون (user_id, item_id, الكمية) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET الكمية = الكمية + ?",
(المعرف, رقم_السلعة, كمية, كمية))
await قاعدة.commit()

async def احذف_من_المخزون(المعرف, رقم_السلعة, كمية):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("UPDATE المخزون SET الكمية = الكمية - ? WHERE user_id = ? AND item_id = ?", (كمية, المعرف, رقم_السلعة))
await قاعدة.commit()

async def احصل_على_المخزون(المعرف):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT item_id, الكمية FROM المخزون WHERE user_id = ?", (المعرف,)) as مؤشر:
return await مؤشر.fetchall()

async def احصل_على_سلعة_من_المتجر(رقم_السلعة):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT item_id, الاسم, سعر_عملات, سعر_رصيد, الوصف FROM المتجر WHERE item_id = ?", (رقم_السلعة,)) as مؤشر:
الصف = await مؤشر.fetchone()
return {"id": الصف[0], "name": الصف[1], "coinPrice": الصف[2], "creditPrice": الصف[3], "desc": الصف[4]} if الصف else None

async def احصل_على_كل_المتجر():
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT item_id, الاسم, سعر_عملات, سعر_رصيد, الوصف FROM المتجر ORDER BY item_id") as مؤشر:
الصفوف = await مؤشر.fetchall()
return [{"id": ص[0], "name": ص[1], "coinPrice": ص[2], "creditPrice": ص[3], "desc": ص[4]} for ص in الصفوف]

async def احصل_على_سلع_السوق_السوداء(الصفحة):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT item_id, الاسم, سعر_عملات, سعر_رصيد, الوصف FROM السوق_السوداء WHERE الصفحة = ? ORDER BY item_id", (الصفحة,)) as مؤشر:
الصفوف = await مؤشر.fetchall()
return [{"id": ص[0], "name": ص[1], "coinPrice": ص[2], "creditPrice": ص[3], "desc": ص[4]} for ص in الصفوف]

async def احصل_على_سلعة_من_السوق_السوداء(رقم_السلعة):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT item_id, الاسم, سعر_عملات, سعر_رصيد, الوصف FROM السوق_السوداء WHERE item_id = ?", (رقم_السلعة,)) as مؤشر:
الصف = await مؤشر.fetchone()
return {"id": الصف[0], "name": الصف[1], "coinPrice": الصف[2], "creditPrice": الصف[3], "desc": الصف[4]} if الصف else None

async def احصل_على_الأسلحة_المتاحة(المعرف):
المخزون = await احصل_على_المخزون(المعرف)
الأسلحة = []

async def يمتلك_سلعة(المعرف, رقم_السلعة):
المخزون = await احصل_على_المخزون(المعرف)
for رقم, كمية in المخزون:
if رقم == رقم_السلعة and كمية > 0:
return True
return False

async def ارسال_تسجيل(البوت, العنوان, الوصف, اللون=0xFF4500):
if قناة_التسجيل:
القناة = البوت.get_channel(قناة_التسجيل)
if القناة:
تضمين = discord.Embed(title=العنوان, description=الوصف, color=اللون, timestamp=datetime.now())
await القناة.send(embed=تضمين)

الصلاحيات = discord.Intents.default()
الصلاحيات.message_content = True
الصلاحيات.members = True

البوت = commands.Bot(command_prefix="!", intents=الصلاحيات)

class السوق_السوداء_View(discord.ui.View):
def init(self, الصفحة_الحالية: int = 1):
super().init(timeout=120)
self.الصفحة_الحالية = الصفحة_الحالية

@البوت.tree.command(name="help", description="عرض جميع الأوامر")
async def مساعدة(التفاعل: discord.Interaction):
تضمين = discord.Embed(title="🤖 قائمة أوامر البوت", color=0x5865F2)
تضمين.add_field(name="💰 الاقتصاد", value="/رصيدي /يومي /ساعي /اعمل /الاغنياء", inline=False)
تضمين.add_field(name="🛒 المتجر العادي", value="/المتجر /اشتري /مخزني", inline=False)
تضمين.add_field(name="🔫 السوق السوداء", value="/بلاك_ماركت /شراء_بلاك", inline=False)
تضمين.add_field(name="👥 الفرق", value="/تعيين_فريق /تفعيل_فريق /فرقي /دخول_فريق", inline=False)
تضمين.add_field(name="⚔️ القتال", value="/هجوم @لاعب (اختر سلاحك من المخزون)", inline=False)
تضمين.add_field(name="💰 السرقة", value="/سرقة @لاعب (كل 10 دقائق)", inline=False)
تضمين.add_field(name="📋 المهام", value="/مهامي /تسليم_مهمة", inline=False)
تضمين.add_field(name="ℹ️ معلومات البوت", value="/وصف (روابط المطور وسيرفر الدعم)", inline=False)
تضمين.add_field(name="👑 الإدارة", value="/اعطاء_فلوس /حذف_فريق /اذاعة (للأونر فقط)", inline=False)
تضمين.add_field(name="🎫 نظام التذاكر", value="/setup /panel /addadmin /addsupport /removesupport /blacklist /stats", inline=False)
تضمين.add_field(name="🔗 روابط", value=f"دعم السيرفر", inline=False)
تضمين.set_footer(text=f"تم تطوير هذا البوت بواسطة {اسم_المطور} | {معرف_المطور}")
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="رصيدي", description="عرض رصيدك")
async def رصيدي(التفاعل: discord.Interaction):
المستخدم = await احصل_على_مستخدم(str(التفاعل.user.id))
تضمين = discord.Embed(title=f"محفظة {التفاعل.user.display_name}", color=0x00AE86)
تضمين.add_field(name="🪙 العملات", value=المستخدم["عملات"], inline=True)
تضمين.add_field(name="💎 الرصيد المميز", value=المستخدم["رصيد"], inline=True)
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="يومي", description="مكافأة يومية")
async def يومي(التفاعل: discord.Interaction):
المعرف = str(التفاعل.user.id)
المستخدم = await احصل_على_مستخدم(المعرف)
الآن = int(time.time())
if الآن - المستخدم["اخر_يومي"] < ثواني_اليوم:
الباقي = ثواني_اليوم - (الآن - المستخدم["اخر_يومي"])
await التفاعل.response.send_message(f"⏳ انتظر {الباقي//3600} ساعة", ephemeral=True)
return
await تحديث_مستخدم(المعرف, اخر_يومي=الآن, عملات=المستخدم["عملات"]+مكافأة_يومية_عملات, رصيد=المستخدم["رصيد"]+مكافأة_يومية_رصيد)
await التفاعل.response.send_message(f"🎁 +{مكافأة_يومية_عملات} عملة و +{مكافأة_يومية_رصيد} رصيد")

@البوت.tree.command(name="ساعي", description="مكافأة كل ساعة")
async def ساعي(التفاعل: discord.Interaction):
المعرف = str(التفاعل.user.id)
المستخدم = await احصل_على_مستخدم(المعرف)
الآن = int(time.time())
if الآن - المستخدم["اخر_ساعي"] < ثواني_الساعة:
الباقي = ثواني_الساعة - (الآن - المستخدم["اخر_ساعي"])
await التفاعل.response.send_message(f"⏳ انتظر {الباقي//60} دقيقة", ephemeral=True)
return
await تحديث_مستخدم(المعرف, اخر_ساعي=الآن, عملات=المستخدم["عملات"]+مكافأة_ساعية_عملات)
await التفاعل.response.send_message(f"⏲️ +{مكافأة_ساعية_عملات} عملة")

@البوت.tree.command(name="اعمل", description="اعمل لكسب عملات")
async def اعمل(التفاعل: discord.Interaction):
كسب = random.randint(الحد_الأدنى_للعمل, الحد_الأقصى_للعمل)
المعرف = str(التفاعل.user.id)
المستخدم = await احصل_على_مستخدم(المعرف)
await تحديث_مستخدم(المعرف, عملات=المستخدم["عملات"]+كسب)
await التفاعل.response.send_message(f"💼 كسبت {كسب} عملة")

@البوت.tree.command(name="الاغنياء", description="أغنى 10 لاعبين")
async def الاغنياء(التفاعل: discord.Interaction):
الصفوف = await احصل_على_كل_المستخدمين()
مرتبة = sorted(الصفوف, key=lambda x: x[1], reverse=True)[:10]
if not مرتبة:
await التفاعل.response.send_message("لا يوجد مستخدمون بعد")
return
الوصف = ""
for i, (المعرف, عملات) in enumerate(مرتبة):
try:
المستخدم = await البوت.fetch_user(int(المعرف))
الاسم = المستخدم.display_name if المستخدم else "مجهول"
except:
الاسم = "مجهول"
الوصف += f"{i+1}. {الاسم} — {عملات} 🪙\n"
تضمين = discord.Embed(title="🏆 قائمة الأغنياء", description=الوصف, color=0xFFD700)
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="المتجر", description="عرض المتجر العادي")
async def المتجر(التفاعل: discord.Interaction):
العناصر = await احصل_على_كل_المتجر()
تضمين = discord.Embed(title="🛒 المتجر العادي", color=0x3498db)
for عنصر in العناصر[:13]:
تضمين.add_field(name=f"{عنصر['id']}. {عنصر['name']}", value=f"🪙 {عنصر['coinPrice']} | 💎 {عنصر['creditPrice']}", inline=True)
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="مخزني", description="عرض مخزونك")
async def مخزني(التفاعل: discord.Interaction):
المعرف = str(التفاعل.user.id)
المخزون = await احصل_على_المخزون(المعرف)
if not المخزون:
await التفاعل.response.send_message("📦 مخزونك فارغ", ephemeral=True)
return
الوصف = ""
for رقم, كمية in المخزون[:10]:
السلعة = await احصل_على_سلعة_من_المتجر(رقم)
if السلعة:
الوصف += f"• {السلعة['name']} x{كمية}\n"
تضمين = discord.Embed(title=f"مخزون {التفاعل.user.display_name}", description=الوصف, color=0x2ecc71)
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="بلاك_ماركت", description="عرض السوق السوداء (50 سلعة)")
async def بلاك_ماركت(التفاعل: discord.Interaction):
العناصر = await احصل_على_سلع_السوق_السوداء(1)
تضمين = discord.Embed(title="🔫 السوق السوداء - الصفحة 1/5", color=0xFF0000)
for عنصر in العناصر:
تضمين.add_field(name=f"{عنصر['id']}. {عنصر['name']}", value=f"🪙 {عنصر['coinPrice']} | 💎 {عنصر['creditPrice']}", inline=True)

@البوت.tree.command(name="شراء_بلاك", description="شراء سلعة من السوق السوداء")
@app_commands.choices(العملة=[
app_commands.Choice(name="عملات", value="coins"), 
app_commands.Choice(name="رصيد مميز", value="credits")
])
async def شراء_بلاك(التفاعل: discord.Interaction, رقم_السلعة: int, العملة: str):
السلعة = await احصل_على_سلعة_من_السوق_السوداء(رقم_السلعة)
if not السلعة:
await التفاعل.response.send_message("❌ رقم سلعة خاطئ", ephemeral=True)
return
المعرف = str(التفاعل.user.id)
المستخدم = await احصل_على_مستخدم(المعرف)
if العملة == "coins":
السعر = السلعة["coinPrice"]
else:
السعر = السلعة["creditPrice"]

@البوت.tree.command(name="تعيين_فريق", description="تسمية فريقك")
@app_commands.choices(الرقم=[
app_commands.Choice(name="الفريق الأول", value=1), 
app_commands.Choice(name="الفريق الثاني", value=2)
])
async def تعيين_فريق_امر(التفاعل: discord.Interaction, الرقم: int, الاسم: str):
if len(الاسم) > الحد_الأقصى_لاسم_الفريق:
الاسم = الاسم[:الحد_الأقصى_لاسم_الفريق]
await تعيين_فريق(str(التفاعل.user.id), الرقم-1, الاسم)
await التفاعل.response.send_message(f"✅ تم تسمية الفريق {الرقم} ← {الاسم}")

@البوت.tree.command(name="تفعيل_فريق", description="تفعيل فريق")
@app_commands.choices(الرقم=[
app_commands.Choice(name="الفريق الأول", value=1), 
app_commands.Choice(name="الفريق الثاني", value=2)
])
async def تفعيل_فريق(التفاعل: discord.Interaction, الرقم: int):
المعرف = str(التفاعل.user.id)
await تحديث_مستخدم(المعرف, الفريق_النشط=الرقم-1)
await التفاعل.response.send_message(f"🔁 تم تفعيل الفريق {الرقم}")

@البوت.tree.command(name="فرقي", description="عرض فرقك")
async def فرقي(التفاعل: discord.Interaction):
المعرف = str(التفاعل.user.id)
اسم1, صحة1, تخفي1 = await احصل_على_فريق(المعرف, 0, True)
اسم2, صحة2, تخفي2 = await احصل_على_فريق(المعرف, 1, True)
المستخدم = await احصل_على_مستخدم(المعرف)
تضمين = discord.Embed(title=f"فرق {التفاعل.user.display_name}", color=0x9b59b6)
تضمين.add_field(name="الفريق الأول", value=f"{اسم1 or 'غير محدد'}\n❤️ الصحة: {صحة1}\n👻 مخفي: {'نعم' if تخفي1 > time.time() else 'لا'}", inline=False)
تضمين.add_field(name="الفريق الثاني", value=f"{اسم2 or 'غير محدد'}\n❤️ الصحة: {صحة2}\n👻 مخفي: {'نعم' if تخفي2 > time.time() else 'لا'}", inline=False)
تضمين.add_field(name="الفريق النشط", value=f"الفريق {المستخدم['الفريق_النشط']+1}", inline=False)
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="دخول_فريق", description="اختيار فريق من القائمة")
async def دخول_فريق(التفاعل: discord.Interaction):
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT user_id, slot, الاسم FROM الفرق WHERE الاسم != '' LIMIT 25") as مؤشر:
الفرق = await مؤشر.fetchall()
if not الفرق:
await التفاعل.response.send_message("لا توجد فرق متاحة للانضمام", ephemeral=True)
return
العرض = discord.ui.View()
القائمة = discord.ui.Select(placeholder="اختر فريقاً للانضمام...")
for فريق in الفرق:
try:
المستخدم = await البوت.fetch_user(int(فريق[0]))
الاسم = المستخدم.display_name if المستخدم else "مجهول"
except:
الاسم = "مجهول"
القائمة.add_option(label=فريق[2], description=f"بواسطة {الاسم}", value=f"{فريق[0]}|{فريق[1]}")
async def رد_القائمة(تفاعل_الزر):
القيمة = تفاعل_الزر.data["values"][0]
المالك, الرقم = القيمة.split("|")
await تحديث_مستخدم(str(تفاعل_الزر.user.id), الفريق_النشط=int(الرقم))
await تفاعل_الزر.response.send_message("✅ تم الانضمام للفريق!", ephemeral=True)
القائمة.callback = رد_القائمة
العرض.add_item(القائمة)
await التفاعل.response.send_message("📋 اختر فريقاً:", view=العرض, ephemeral=True)

class قائمة_اختيار_السلاح(discord.ui.Select):
def init(self, المهاجم_id, الخصم_member, الأسلحة_المتاحة, البوت_instance):
self.المهاجم_id = المهاجم_id
self.الخصم = الخصم_member
self.الأسلحة = الأسلحة_المتاحة
self.البوت = البوت_instance

@البوت.tree.command(name="هجوم", description="مهاجمة فريق خصم باختيار سلاح من مخزونك")
async def هجوم(التفاعل: discord.Interaction, الخصم: discord.Member):
if الخصم.id == التفاعل.user.id:
await التفاعل.response.send_message("❌ لا يمكنك مهاجمة نفسك", ephemeral=True)
return

@البوت.tree.command(name="سرقة", description="سرقة أموال من فريق خصم")
async def سرقة(التفاعل: discord.Interaction, الخصم: discord.Member):
if الخصم.id == التفاعل.user.id:
await التفاعل.response.send_message("❌ لا يمكنك سرقة نفسك", ephemeral=True)
return
معرف_السارق = str(التفاعل.user.id)
معرف_الضحية = str(الخصم.id)
بيانات_السارق = await احصل_على_مستخدم(معرف_السارق)
بيانات_الضحية = await احصل_على_مستخدم(معرف_الضحية)
الآن = int(time.time())
if الآن - بيانات_السارق["اخر_سرقة"] < مدة_السرقة:
المتبقي = مدة_السرقة - (الآن - بيانات_السارق["اخر_سرقة"])
await التفاعل.response.send_message(f"⏳ يمكنك السرقة مرة أخرى بعد {المتبقي//60} دقيقة", ephemeral=True)
return
فريق_الضحية = بيانات_الضحية["الفريق_النشط"]
_, _, تخفي_الضحية = await احصل_على_فريق(معرف_الضحية, فريق_الضحية, True)
if تخفي_الضحية > time.time():
await التفاعل.response.send_message(f"❌ فريق {الخصم.display_name} في حالة تخفي!", ephemeral=True)
return
المبلغ_المسروق = max(10, int(بيانات_الضحية["عملات"] * نسبة_السرقة))
await تحديث_مستخدم(معرف_الضحية, عملات=بيانات_الضحية["عملات"] - المبلغ_المسروق)
await تحديث_مستخدم(معرف_السارق, عملات=بيانات_السارق["عملات"] + المبلغ_المسروق, اخر_سرقة=الآن)
await ارسال_تسجيل(البوت, "💰 سرقة جديدة", f"السارق: {التفاعل.user.display_name}\nالضحية: {الخصم.display_name}\nالمبلغ: {المبلغ_المسروق} عملة")
await التفاعل.response.send_message(f"💰 نجحت في سرقة {المبلغ_المسروق} عملة من {الخصم.display_name}!")

@البوت.tree.command(name="تخفي", description="إخفاء فريقك 30 دقيقة")
async def تخفي(التفاعل: discord.Interaction):
المعرف = str(التفاعل.user.id)
if not await يمتلك_سلعة(المعرف, 26):
await التفاعل.response.send_message("❌ لا تمتلك كتاب التخفي!", ephemeral=True)
return
المستخدم = await احصل_على_مستخدم(المعرف)
حتى = int(time.time()) + مدة_التخفي
await تحديث_اختفاء_الفريق(المعرف, المستخدم["الفريق_النشط"], حتى)
await احذف_من_المخزون(المعرف, 26, 1)
await التفاعل.response.send_message("👻 تم إخفاء فريقك لمدة 30 دقيقة! لن يتمكن أحد من مهاجمتك أو سرقتك.")

@البوت.tree.command(name="مهامي", description="عرض مهامك")
async def مهامي(التفاعل: discord.Interaction):
المعرف = str(التفاعل.user.id)
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
async with قاعدة.execute("SELECT مهمة1, مهمة2, مهمة3, تقدم1, تقدم2, تقدم3, اخر_تصفير FROM المهام WHERE user_id = ?", (المعرف,)) as مؤشر:
الصف = await مؤشر.fetchone()
الآن = int(time.time())
if الصف is None or الآن - (الصف[6] if الصف[6] else 0) > 3 * ثواني_اليوم:
قائمة_المهام = ["اعمل 5 مرات", "اهاجم 3 لاعبين", "اجمع 500 عملة", "اشترِ سلاحاً", "اسرق لاعباً", "استخدم تخفي"]
مختارة = random.sample(قائمة_المهام, 3)
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("INSERT OR REPLACE INTO المهام (user_id, مهمة1, مهمة2, مهمة3, تقدم1, تقدم2, تقدم3, مكتمل1, مكتمل2, مكتمل3, اخر_تصفير) VALUES (?,?,?,?,0,0,0,0,0,0,?)", 
(المعرف, مختارة[0], مختارة[1], مختارة[2], الآن))
الصف = (مختارة[0], مختارة[1], مختارة[2], 0, 0, 0, الآن)
تضمين = discord.Embed(title="📋 مهامك", color=0xF1C40F)
تضمين.add_field(name="1️⃣ " + الصف[0], value=f"التقدم: {الصف[3]}", inline=False)
تضمين.add_field(name="2️⃣ " + الصف[1], value=f"التقدم: {الصف[4]}", inline=False)
تضمين.add_field(name="3️⃣ " + الصف[2], value=f"التقدم: {الصف[5]}", inline=False)
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="تسليم_مهمة", description="تسليم مهمة مكتملة وكسب مكافأة")
async def تسليم_مهمة(التفاعل: discord.Interaction, رقم_المهمة: int):
if رقم_المهمة not in [1, 2, 3]:
await التفاعل.response.send_message("❌ رقم المهمة يجب أن يكون 1 أو 2 أو 3", ephemeral=True)
return

@البوت.tree.command(name="اعطاء_فلوس", description="منح أموال للاعب (للأونر فقط)")
async def اعطاء_فلوس(التفاعل: discord.Interaction, اللاعب: discord.User, العملات: int = 0, الرصيد: int = 0):
if التفاعل.user.id != رتبة_الأونر:
await التفاعل.response.send_message("❌ هذا الأمر مخصص لمالك البوت فقط!", ephemeral=True)
return
معرف_اللاعب = str(اللاعب.id)
بيانات = await احصل_على_مستخدم(معرف_اللاعب)
await تحديث_مستخدم(معرف_اللاعب, عملات=بيانات["عملات"] + العملات, رصيد=بيانات["رصيد"] + الرصيد)
await التفاعل.response.send_message(f"✅ تم منح {اللاعب.display_name}:\n🪙 {العملات} عملة\n💎 {الرصيد} رصيد مميز.")

@البوت.tree.command(name="حذف_فريق", description="تصفير بيانات فريق لاعب (للأونر فقط)")
async def حذف_فريق(التفاعل: discord.Interaction, اللاعب: discord.User):
if التفاعل.user.id != رتبة_الأونر:
await التفاعل.response.send_message("❌ هذا الأمر مخصص لمالك البوت فقط!", ephemeral=True)
return
معرف_اللاعب = str(اللاعب.id)
async with aiosqlite.connect(مسار_قاعدة_البيانات) as قاعدة:
await قاعدة.execute("DELETE FROM الفرق WHERE user_id = ?", (معرف_اللاعب,))
await قاعدة.execute("INSERT OR IGNORE INTO الفرق (user_id, slot, الاسم, الصحة) VALUES (?, 0, '', ?), (?, 1, '', ?)", 
(معرف_اللاعب, صحة_الفريق_البدائية, معرف_اللاعب, صحة_الفريق_البدائية))
await قاعدة.commit()
await التفاعل.response.send_message(f"✅ تم حذف وتصفير جميع فرق اللاعب {اللاعب.display_name} بنجاح.")

@البوت.tree.command(name="اذاعة", description="إرسال رسالة لجميع مستخدمي البوت (للأونر فقط)")
async def اذاعة(التفاعل: discord.Interaction, الرسالة: str):
if التفاعل.user.id != رتبة_الأونر:
await التفاعل.response.send_message("❌ هذا الأمر مخصص لمالك البوت فقط!", ephemeral=True)
return
await التفاعل.response.defer(ephemeral=True)
المستخدمين = await احصل_على_كل_المستخدمين()
عداد = 0
for عضو in المستخدمين:
try:
مستخدم_ديسكورد = await البوت.fetch_user(int(عضو[0]))
if مستخدم_ديسكورد:
await مستخدم_ديسكورد.send(f"📢 إشعار إداري من إدارة اللعبة:\n\n{الرسالة}")
عداد += 1
await asyncio.sleep(0.5)
except:
continue
await التفاعل.followup.send(f"✅ تم إرسال الإذاعة بنجاح إلى {عداد} لاعب.")

@البوت.tree.command(name="وصف", description="روابط الدعم ومعلومات المطور")
async def وصف(التفاعل: discord.Interaction):
تضمين = discord.Embed(title="ℹ️ معلومات حول نظام اللعبة", color=0x00FFFF)
تضمين.add_field(name="👑 المطور الأساسي", value=f"{اسم_المطور} ({معرف_المطور})", inline=True)
تضمين.add_field(name="🔗 سيرفر الدعم والمجتمع", value=f"اضغط هنا للانضمام للـ BRQ", inline=True)
تضمين.set_footer(text="صنع بكل حب لتطوير مجتمع الألعاب")
await التفاعل.response.send_message(embed=تضمين)

@البوت.tree.command(name="اشتري", description="شراء سلعة (العناصر العلاجية تشفيك فوراً!)")
@app_commands.choices(العملة=[
app_commands.Choice(name="عملات", value="coins"), 
app_commands.Choice(name="رصيد مميز", value="credits")
])
async def اشتري(التفاعل: discord.Interaction, رقم_السلعة: int, العملة: str, الكمية: int = 1):
if الكمية < 1:
الكمية = 1

@البوت.tree.command(name="setup", description="إعداد نظام التذاكر (الأونر فقط)")
@app_commands.describe(category="الفئة التي ستُنشأ بها التذاكر", log_channel="قناة السجلات", auto_close_hours="عدد ساعات الإغلاق التلقائي")
async def setup_ticket(interaction: discord.Interaction, category: discord.CategoryChannel, log_channel: discord.TextChannel = None, auto_close_hours: int = 24):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="panel", description="إعادة إرسال لوحة التذاكر")
async def panel(interaction: discord.Interaction):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="addadmin", description="إضافة رتبة أونر مساعد")
@app_commands.describe(role="الرتبة المراد إضافتها")
async def add_admin(interaction: discord.Interaction, role: discord.Role):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="removeadmin", description="إزالة رتبة أونر مساعد")
@app_commands.describe(role="الرتبة المراد إزالتها")
async def remove_admin(interaction: discord.Interaction, role: discord.Role):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="addsupport", description="إضافة رتبة دعم")
@app_commands.describe(role="الرتبة المراد إضافتها")
async def add_support(interaction: discord.Interaction, role: discord.Role):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="removesupport", description="إزالة رتبة دعم")
@app_commands.describe(role="الرتبة المراد إزالتها")
async def remove_support(interaction: discord.Interaction, role: discord.Role):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="viewstaff", description="عرض قائمة الموظفين")
async def view_staff(interaction: discord.Interaction):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="blacklist", description="حظر مستخدم من استخدام التذاكر")
@app_commands.describe(user="المستخدم المراد حظره", reason="سبب الحظر")
async def blacklist_user(interaction: discord.Interaction, user: discord.User, reason: str = "لا يوجد سبب"):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="unblacklist", description="إلغاء حظر مستخدم من التذاكر")
@app_commands.describe(user="المستخدم المراد إلغاء حظره")
async def unblacklist_user(interaction: discord.Interaction, user: discord.User):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="stats", description="إحصائيات نظام التذاكر")
async def stats_ticket(interaction: discord.Interaction):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT COUNT(*) FROM tickets WHERE guild_id = ?", (str(interaction.guild_id),)) as cursor:
total = (await cursor.fetchone())[0]

@البوت.tree.command(name="add", description="إضافة مستخدم إلى التذكرة")
@app_commands.describe(user="المستخدم المراد إضافته")
async def add_user(interaction: discord.Interaction, user: discord.Member):
if not await is_staff(interaction.user, interaction.guild_id) and str(interaction.user.id) != (await get_ticket_info(interaction.channel.id))["creator_id"]:
await interaction.response.send_message("❌ ليس لديك صلاحية لإضافة مستخدمين!", ephemeral=True)
return

@البوت.tree.command(name="remove", description="إزالة مستخدم من التذكرة")
@app_commands.describe(user="المستخدم المراد إزالته")
async def remove_user(interaction: discord.Interaction, user: discord.Member):
if not await is_staff(interaction.user, interaction.guild_id) and str(interaction.user.id) != (await get_ticket_info(interaction.channel.id))["creator_id"]:
await interaction.response.send_message("❌ ليس لديك صلاحية لإزالة مستخدمين!", ephemeral=True)
return

@البوت.tree.command(name="rename", description="تغيير اسم التذكرة")
@app_commands.describe(new_name="الاسم الجديد للتذكرة")
async def rename_ticket(interaction: discord.Interaction, new_name: str):
if not await is_staff(interaction.user, interaction.guild_id):
await interaction.response.send_message("❌ ليس لديك صلاحية لتغيير اسم التذكرة!", ephemeral=True)
return

@البوت.tree.command(name="reopen", description="إعادة فتح تذكرة مغلقة")
async def reopen_ticket(interaction: discord.Interaction):
if not await is_staff(interaction.user, interaction.guild_id):
await interaction.response.send_message("❌ ليس لديك صلاحية لإعادة فتح التذكرة!", ephemeral=True)
return

@البوت.tree.command(name="claim", description="استلام تذكرة")
async def claim_ticket(interaction: discord.Interaction):
if not await is_staff(interaction.user, interaction.guild_id):
await interaction.response.send_message("❌ ليس لديك صلاحية لاستلام التذكرة!", ephemeral=True)
return

@البوت.tree.command(name="unclaim", description="إلغاء استلام التذكرة")
async def unclaim_ticket(interaction: discord.Interaction):
if not await is_staff(interaction.user, interaction.guild_id):
await interaction.response.send_message("❌ ليس لديك صلاحية لإلغاء استلام التذكرة!", ephemeral=True)
return

@البوت.tree.command(name="close", description="إغلاق التذكرة الحالية")
async def close_ticket(interaction: discord.Interaction, reason: str = None):
if not await is_staff(interaction.user, interaction.guild_id) and str(interaction.user.id) != (await get_ticket_info(interaction.channel.id))["creator_id"]:
await interaction.response.send_message("❌ ليس لديك صلاحية لإغلاق هذه التذكرة!", ephemeral=True)
return

@البوت.tree.command(name="closerequest", description="طلب إغلاق التذكرة من فريق الدعم")
async def closerequest(interaction: discord.Interaction, reason: str = None):
ticket_info = await get_ticket_info(interaction.channel.id)
if not ticket_info or ticket_info["creator_id"] != str(interaction.user.id):
await interaction.response.send_message("❌ هذه التذكرة ليست ملكك!", ephemeral=True)
return

@البوت.tree.command(name="notes", description="عرض ملاحظات التذكرة")
async def notes_ticket(interaction: discord.Interaction):
if not await is_staff(interaction.user, interaction.guild_id):
await interaction.response.send_message("❌ ليس لديك صلاحية لعرض الملاحظات!", ephemeral=True)
return

@البوت.tree.command(name="on-call", description="عرض الموظفين المتاحين")
async def on_call(interaction: discord.Interaction):
staff_roles = await get_all_staff_roles(interaction.guild_id)
if not staff_roles:
await interaction.response.send_message("لا يوجد موظفين مسجلين!", ephemeral=True)
return

@البوت.tree.command(name="open", description="فتح تذكرة جديدة")
async def open_ticket(interaction: discord.Interaction):
config = await get_ticket_config(interaction.guild_id)
if not config or not config["panel_channel_id"]:
await interaction.response.send_message("❌ نظام التذاكر لم يتم إعداده بعد!", ephemeral=True)
return

@البوت.tree.command(name="switchpanel", description="تبديل لوحة التذاكر")
@app_commands.describe(channel="القناة الجديدة للوحة")
async def switchpanel(interaction: discord.Interaction, channel: discord.TextChannel):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="transfer", description="نقل التذكرة إلى موظف آخر")
@app_commands.describe(user="الموظف المستهدف")
async def transfer_ticket(interaction: discord.Interaction, user: discord.Member):
if not await is_staff(interaction.user, interaction.guild_id):
await interaction.response.send_message("❌ ليس لديك صلاحية لنقل التذكرة!", ephemeral=True)
return

@البوت.tree.command(name="edit", description="تعديل رسالة الإعدادات")
@app_commands.describe(title="العنوان الجديد", description="الوصف الجديد", color="اللون (Hex)")
async def edit_panel(interaction: discord.Interaction, title: str = None, description: str = None, color: str = None):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="about", description="معلومات عن البوت")
async def about(interaction: discord.Interaction):
embed = discord.Embed(
title="🤖 معلومات عن البوت",
description="بوت متخصص في إدارة التذاكر لدعم السيرفرات",
color=0x5865F2
)
embed.add_field(name="📦 الإصدار", value="1.0.0", inline=True)
embed.add_field(name="👑 المطور", value=اسم_المطور, inline=True)
embed.add_field(name="📞 التواصل", value=معرف_المطور, inline=True)
await interaction.response.send_message(embed=embed)

@البوت.tree.command(name="gdpr", description="إدارة بياناتك (حذف بيانات التذاكر)")
async def gdpr(interaction: discord.Interaction):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
await db.execute("DELETE FROM tickets WHERE creator_id = ?", (str(interaction.user.id),))
await db.commit()
await interaction.response.send_message("✅ تم حذف جميع بيانات تذاكرك بنجاح!", ephemeral=True)

@البوت.tree.command(name="invite", description="رابط دعوة البوت")
async def invite(interaction: discord.Interaction):
embed = discord.Embed(
title="🔗 رابط دعوة البوت",
description=f"اضغط هنا لدعوة البوت",
color=0x5865F2
)
await interaction.response.send_message(embed=embed)

@البوت.tree.command(name="jumptotop", description="الانتقال إلى أعلى التذكرة")
async def jumptotop(interaction: discord.Interaction):
await interaction.response.send_message("⬆️ انتقل إلى أعلى", ephemeral=True)
messages = [message async for message in interaction.channel.history(limit=1, oldest_first=True)]
if messages:
await interaction.followup.send(f"انتقل إلى أول رسالة", ephemeral=True)

@البوت.tree.command(name="autoclose", description="إعداد الإغلاق التلقائي للتذاكر")
@app_commands.describe(enabled="تفعيل/تعطيل", hours="عدد الساعات")
async def auto_close(interaction: discord.Interaction, enabled: bool, hours: int = 24):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="language", description="تغيير لغة البوت")
@app_commands.choices(lang=[
app_commands.Choice(name="العربية", value="ar"),
app_commands.Choice(name="English", value="en")
])
async def set_language(interaction: discord.Interaction, lang: str):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="managetags", description="إدارة العلامات السريعة")
@app_commands.choices(action=[
app_commands.Choice(name="إضافة", value="add"),
app_commands.Choice(name="حذف", value="remove"),
app_commands.Choice(name="عرض", value="list")
])
@app_commands.describe(action="الإجراء", name="اسم العلامة", content="محتوى العلامة")
async def manage_tags(interaction: discord.Interaction, action: str, name: str = None, content: str = None):
if not interaction.user.guild_permissions.administrator:
await interaction.response.send_message("❌ هذا الأمر مخصص للأونر فقط!", ephemeral=True)
return

@البوت.tree.command(name="tag", description="استخدام علامة سريعة")
@app_commands.describe(name="اسم العلامة")
async def use_tag(interaction: discord.Interaction, name: str):
async with aiosqlite.connect(مسار_تذاكر_البيانات) as db:
async with db.execute("SELECT tag_content FROM tags WHERE guild_id = ? AND tag_name = ?", (str(interaction.guild_id), name.lower())) as cursor:
row = await cursor.fetchone()

@البوت.event
async def on_ready():
print(f"✅ تم تشغيل البوت بنجاح باسم: {البوت.user}")
await تهيئة_قاعدة_البيانات()
await init_ticket_db()
try:
المزامنة = await البوت.tree.sync()
print(f"🔄 تم مزامنة {len(المزامنة)} من الأوامر المائلة Slash Commands!")
except Exception as e:
print(f"❌ فشل مزامنة الأوامر المائلة: {e}")

if name == "main":
خيط_الويب = threading.Thread(target=تشغيل_الخادم)
خيط_الويب.daemon = True
خيط_الويب.start()
