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

print("🚀 بدء تشغيل البوت...")

try:
    # ========== Flask ==========
    flask_app = Flask(__name__)

    @flask_app.route('/')
    def home():
        return "Bot is running!"

    def run_flask():
        flask_app.run(host='0.0.0.0', port=8080)

    # ========== التوكن ==========
    TOKEN = os.getenv("DISCORD_TOKEN")
    if TOKEN is None:
        print("❌ DISCORD_TOKEN not set")
        sys.exit(1)

    # ========== إعدادات اللعبة ==========
    START_COINS = 1000
    START_CREDITS = 0
    START_TEAM_HP = 100
    DAILY_COINS = 500
    DAILY_CREDITS = 10
    HOURLY_COINS = 100
    WORK_MIN = 50
    WORK_MAX = 200
    DAY_SECONDS = 86400
    HOUR_SECONDS = 3600
    MAX_TEAM_NAME = 20
    DEFAULT_PUNCH_DAMAGE = 5

    WEAPON_DAMAGE = {2: 20, 7: 40, 9: 15, 12: 25, 16: 35, 23: 30}

    # ========== قاعدة البيانات ==========
    DB_PATH = "game_data.db"

    async def init_db():
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute('''CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                coins INTEGER DEFAULT 1000,
                credits INTEGER DEFAULT 0,
                last_daily INTEGER DEFAULT 0,
                last_hourly INTEGER DEFAULT 0,
                active_team INTEGER DEFAULT 0
            )''')
            await db.execute('''CREATE TABLE IF NOT EXISTS teams (
                user_id TEXT,
                slot INTEGER,
                name TEXT DEFAULT '',
                health INTEGER DEFAULT 100,
                PRIMARY KEY (user_id, slot)
            )''')
            await db.execute('''CREATE TABLE IF NOT EXISTS inventory (
                user_id TEXT,
                item_id INTEGER,
                quantity INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, item_id)
            )''')
            await db.execute('''CREATE TABLE IF NOT EXISTS shop (
                item_id INTEGER PRIMARY KEY,
                name TEXT,
                coin_price INTEGER,
                credit_price INTEGER,
                description TEXT
            )''')
            cursor = await db.execute("SELECT COUNT(*) FROM shop")
            count = (await cursor.fetchone())[0]
            if count == 0:
                items = [
                    (1, "🍎 تفاحة سحرية", 100, 5, "تستعيد 20 صحة"),
                    (2, "🗡️ سيف حديدي", 250, 10, "+20 ضرر"),
                    (3, "🛡️ درع فولاذي", 200, 8, "+8 دفاع"),
                    (4, "💎 ياقوتة", 500, 20, "حجر كريم"),
                    (5, "🧪 جرعة شفاء", 80, 3, "تشفي 50 صحة"),
                    (6, "📜 درع قديم", 300, 12, "مهارة جديدة"),
                    (7, "🐉 ناب تنين", 1000, 40, "+40 ضرر"),
                    (8, "👑 تاج الملوك", 2000, 80, "سلطة ملكية"),
                    (9, "⚡ حذاء البرق", 400, 15, "+15 ضرر"),
                    (10, "🔮 كرة بلورية", 350, 14, "تكشف الأسرار"),
                    (11, "🧥 عباءة الظلال", 450, 18, "تخفي"),
                    (12, "🏹 قوس إلف", 600, 25, "+25 ضرر"),
                    (13, "🍄 عيش غراب ذهبي", 150, 6, "تأثير عشوائي"),
                    (14, "🧙 قبعة الساحر", 700, 28, "+15 سحر"),
                    (15, "⛏️ فأس قزم", 500, 20, "تعدين"),
                    (16, "🐺 رفيق ذئب", 1200, 50, "+35 ضرر"),
                    (17, "🕯️ شمعة الحقيقة", 180, 7, "تكشف الأكاذيب"),
                    (18, "🧩 مفتاح غامض", 250, 10, "يفتح الأبواب"),
                    (19, "💀 كتاب الموتى", 1500, 60, "يستحضر الموتى"),
                    (20, "🧪 إكسير الحياة", 3000, 120, "يطيل العمر"),
                    (21, "🎣 صنارة صيد", 200, 8, "تصطاد سمكاً"),
                    (22, "🏔️ درع الجليد", 800, 32, "مقاومة البرد"),
                    (23, "🔥 عصا النار", 900, 36, "+30 ضرر"),
                    (24, "🌀 تميمة الريح", 550, 22, "يتحكم بالرياح"),
                    (25, "🌟 شظية نجم", 400, 16, "يحقق الأمنيات")
                ]
                await db.executemany("INSERT INTO shop VALUES (?,?,?,?,?)", items)
            await db.commit()

    async def get_user(user_id):
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT coins, credits, last_daily, last_hourly, active_team FROM users WHERE user_id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
                if row is None:
                    await db.execute("INSERT INTO users (user_id, coins, credits) VALUES (?, ?, ?)", (user_id, START_COINS, START_CREDITS))
                    await db.execute("INSERT OR IGNORE INTO teams (user_id, slot, health) VALUES (?, 0, ?), (?, 1, ?)", (user_id, START_TEAM_HP, user_id, START_TEAM_HP))
                    await db.commit()
                    return {"coins": START_COINS, "credits": START_CREDITS, "last_daily": 0, "last_hourly": 0, "active_team": 0}
                return {"coins": row[0], "credits": row[1], "last_daily": row[2], "last_hourly": row[3], "active_team": row[4]}

    async def update_user(user_id, **kwargs):
        async with aiosqlite.connect(DB_PATH) as db:
            for key, val in kwargs.items():
                await db.execute(f"UPDATE users SET {key} = ? WHERE user_id = ?", (val, user_id))
            await db.commit()

    async def get_team(user_id, slot, include_health=False):
        async with aiosqlite.connect(DB_PATH) as db:
            if include_health:
                async with db.execute("SELECT name, health FROM teams WHERE user_id = ? AND slot = ?", (user_id, slot)) as cursor:
                    row = await cursor.fetchone()
                    return (row[0], row[1]) if row else ("", START_TEAM_HP)
            else:
                async with db.execute("SELECT name FROM teams WHERE user_id = ? AND slot = ?", (user_id, slot)) as cursor:
                    row = await cursor.fetchone()
                    return row[0] if row else ""

    async def set_team(user_id, slot, name):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("INSERT OR REPLACE INTO teams (user_id, slot, name, health) VALUES (?, ?, ?, COALESCE((SELECT health FROM teams WHERE user_id=? AND slot=?), ?))",
                             (user_id, slot, name, user_id, slot, START_TEAM_HP))
            await db.commit()

    async def update_team_health(user_id, slot, new_health):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("UPDATE teams SET health = ? WHERE user_id = ? AND slot = ?", (new_health, user_id, slot))
            await db.commit()

    async def get_all_users():
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT user_id, coins FROM users") as cursor:
                return await cursor.fetchall()

    async def add_inventory(user_id, item_id, qty):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + ?",
                             (user_id, item_id, qty, qty))
            await db.commit()

    async def get_inventory(user_id):
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT item_id, quantity FROM inventory WHERE user_id = ?", (user_id,)) as cursor:
                return await cursor.fetchall()

    async def get_shop_item(item_id):
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT item_id, name, coin_price, credit_price, description FROM shop WHERE item_id = ?", (item_id,)) as cursor:
                row = await cursor.fetchone()
                return {"id": row[0], "name": row[1], "coinPrice": row[2], "creditPrice": row[3], "desc": row[4]} if row else None

    async def get_all_shop():
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT item_id, name, coin_price, credit_price, description FROM shop ORDER BY item_id") as cursor:
                rows = await cursor.fetchall()
                return [{"id": r[0], "name": r[1], "coinPrice": r[2], "creditPrice": r[3], "desc": r[4]} for r in rows]

    async def get_best_weapon(user_id):
        inv = await get_inventory(user_id)
        best = DEFAULT_PUNCH_DAMAGE
        for item_id, qty in inv:
            if qty > 0 and item_id in WEAPON_DAMAGE:
                best = max(best, WEAPON_DAMAGE[item_id])
        return best

    # ========== إعداد البوت (مع INTENTS الصحيحة) ==========
    intents = discord.Intents.default()
    intents.message_content = True   # ضروري جداً
    intents.members = True

    bot = commands.Bot(command_prefix="!", intents=intents)

    # ========== الأوامر ==========
    @bot.tree.command(name="رصيدي", description="عرض رصيدك")
    async def balance(interaction: discord.Interaction):
        user = await get_user(str(interaction.user.id))
        embed = discord.Embed(title=f"محفظة {interaction.user.display_name}", color=0x00AE86)
        embed.add_field(name="🪙 العملات", value=user["coins"], inline=True)
        embed.add_field(name="💎 الرصيد المميز", value=user["credits"], inline=True)
        await interaction.response.send_message(embed=embed)

    @bot.tree.command(name="يومي", description="مكافأة يومية")
    async def daily(interaction: discord.Interaction):
        uid = str(interaction.user.id)
        user = await get_user(uid)
        now = int(time.time())
        if now - user["last_daily"] < DAY_SECONDS:
            remaining = DAY_SECONDS - (now - user["last_daily"])
            h = remaining // 3600
            m = (remaining % 3600) // 60
            await interaction.response.send_message(f"⏳ انتظر {h} ساعة {m} دقيقة", ephemeral=True)
            return
        await update_user(uid, last_daily=now, coins=user["coins"]+DAILY_COINS, credits=user["credits"]+DAILY_CREDITS)
        await interaction.response.send_message(f"🎁 +{DAILY_COINS} عملة و +{DAILY_CREDITS} رصيد")

    @bot.tree.command(name="ساعي", description="مكافأة كل ساعة")
    async def hourly(interaction: discord.Interaction):
        uid = str(interaction.user.id)
        user = await get_user(uid)
        now = int(time.time())
        if now - user["last_hourly"] < HOUR_SECONDS:
            remaining = HOUR_SECONDS - (now - user["last_hourly"])
            m = remaining // 60
            await interaction.response.send_message(f"⏳ انتظر {m} دقيقة", ephemeral=True)
            return
        await update_user(uid, last_hourly=now, coins=user["coins"]+HOURLY_COINS)
        await interaction.response.send_message(f"⏲️ +{HOURLY_COINS} عملة")

    @bot.tree.command(name="اعمل", description="اعمل لكسب عملات")
    async def work(interaction: discord.Interaction):
        earn = random.randint(WORK_MIN, WORK_MAX)
        uid = str(interaction.user.id)
        user = await get_user(uid)
        await update_user(uid, coins=user["coins"]+earn)
        await interaction.response.send_message(f"💼 كسبت {earn} عملة")

    @bot.tree.command(name="الاغنياء", description="أغنى 10 لاعبين")
    async def leaderboard(interaction: discord.Interaction):
        rows = await get_all_users()
        sorted_rows = sorted(rows, key=lambda x: x[1], reverse=True)[:10]
        if not sorted_rows:
            await interaction.response.send_message("لا يوجد مستخدمون بعد")
            return
        desc = ""
        for i, (uid, coins) in enumerate(sorted_rows):
            user = await bot.fetch_user(int(uid))
            name = user.display_name if user else "مجهول"
            desc += f"{i+1}. **{name}** — {coins} 🪙\n"
        embed = discord.Embed(title="🏆 قائمة الأغنياء", description=desc, color=0xFFD700)
        await interaction.response.send_message(embed=embed)

    @bot.tree.command(name="المتجر", description="عرض المتجر")
    async def shop(interaction: discord.Interaction):
        items = await get_all_shop()
        embed = discord.Embed(title="🛒 المتجر", description="اشتري بـ `/اشتري [الرقم] [عملات/رصيد] [الكمية]`\nالرصيد المميز يعطي ضعف الكمية", color=0x3498db)
        for item in items[:12]:
            embed.add_field(name=f"{item['id']}. {item['name']}", value=f"🪙 {item['coinPrice']} | 💎 {item['creditPrice']}\n{item['desc']}", inline=True)
        await interaction.response.send_message(embed=embed)

    @bot.tree.command(name="اشتري", description="شراء سلعة")
    @app_commands.choices(currency=[
        app_commands.Choice(name="عملات", value="coins"),
        app_commands.Choice(name="رصيد مميز", value="credits")
    ])
    async def buy(interaction: discord.Interaction, item_id: int, currency: str, quantity: int = 1):
        if quantity < 1:
            quantity = 1
        item = await get_shop_item(item_id)
        if not item:
            await interaction.response.send_message("❌ رقم سلعة خاطئ", ephemeral=True)
            return
        uid = str(interaction.user.id)
        user = await get_user(uid)
        if currency == "coins":
            price = item["coinPrice"]
            multiplier = 1
        else:
            price = item["creditPrice"]
            multiplier = 2
        cost = price * quantity
        if currency == "coins":
            if user["coins"] < cost:
                await interaction.response.send_message(f"❌ تحتاج {cost} عملة", ephemeral=True)
                return
            await update_user(uid, coins=user["coins"] - cost)
        else:
            if user["credits"] < cost:
                await interaction.response.send_message(f"❌ تحتاج {cost} رصيد", ephemeral=True)
                return
            await update_user(uid, credits=user["credits"] - cost)
        received = quantity * multiplier
        await add_inventory(uid, item_id, received)
        await interaction.response.send_message(f"✅ اشتريت {received} × {item['name']}")

    @bot.tree.command(name="مخزني", description="عرض مخزونك")
    async def inventory(interaction: discord.Interaction):
        uid = str(interaction.user.id)
        inv = await get_inventory(uid)
        if not inv:
            await interaction.response.send_message("📦 مخزونك فارغ", ephemeral=True)
            return
        desc = ""
        for item_id, qty in inv[:10]:
            item = await get_shop_item(item_id)
            if item:
                desc += f"• {item['name']} x{qty}\n"
        embed = discord.Embed(title=f"مخزون {interaction.user.display_name}", description=desc, color=0x2ecc71)
        await interaction.response.send_message(embed=embed)

    @bot.tree.command(name="تعيين_فريق", description="تسمية فريقك")
    @app_commands.choices(slot=[
        app_commands.Choice(name="الفريق الأول", value=1),
        app_commands.Choice(name="الفريق الثاني", value=2)
    ])
    async def set_team(interaction: discord.Interaction, slot: int, name: str):
        if len(name) > MAX_TEAM_NAME:
            name = name[:MAX_TEAM_NAME]
        uid = str(interaction.user.id)
        await set_team(uid, slot-1, name)
        await interaction.response.send_message(f"✅ تم تسمية الفريق {slot} → {name}")

    @bot.tree.command(name="تفعيل_فريق", description="تفعيل فريق")
    @app_commands.choices(slot=[
        app_commands.Choice(name="الفريق الأول", value=1),
        app_commands.Choice(name="الفريق الثاني", value=2)
    ])
    async def activate_team(interaction: discord.Interaction, slot: int):
        uid = str(interaction.user.id)
        await update_user(uid, active_team=slot-1)
        team_name = await get_team(uid, slot-1) or "بدون اسم"
        await interaction.response.send_message(f"🔁 تم تفعيل الفريق {slot} ({team_name})")

    @bot.tree.command(name="فرقي", description="عرض فرقك")
    async def my_teams(interaction: discord.Interaction):
        uid = str(interaction.user.id)
        t1_name, t1_hp = await get_team(uid, 0, include_health=True)
        t2_name, t2_hp = await get_team(uid, 1, include_health=True)
        user = await get_user(uid)
        embed = discord.Embed(title=f"فرق {interaction.user.display_name}", color=0x9b59b6)
        embed.add_field(name="الفريق الأول", value=f"{t1_name or 'غير محدد'}\n❤️ HP: {t1_hp}", inline=False)
        embed.add_field(name="الفريق الثاني", value=f"{t2_name or 'غير محدد'}\n❤️ HP: {t2_hp}", inline=False)
        embed.add_field(name="الفريق النشط", value=f"الفريق {user['active_team']+1}", inline=False)
        await interaction.response.send_message(embed=embed)

    @bot.tree.command(name="هجوم", description="مهاجمة فريق خصم")
    async def attack(interaction: discord.Interaction, target: discord.Member):
        if target.id == interaction.user.id:
            await interaction.response.send_message("❌ لا يمكنك مهاجمة نفسك", ephemeral=True)
            return
        attacker_id = str(interaction.user.id)
        target_id = str(target.id)
        attacker_data = await get_user(attacker_id)
        target_data = await get_user(target_id)
        attacker_team = attacker_data["active_team"]
        target_team = target_data["active_team"]
        attacker_name, _ = await get_team(attacker_id, attacker_team, include_health=True)
        target_name, target_hp = await get_team(target_id, target_team, include_health=True)
        if target_hp <= 0:
            await interaction.response.send_message(f"❌ فريق {target.display_name} هُزم بالفعل!", ephemeral=True)
            return
        damage = await get_best_weapon(attacker_id)
        new_hp = max(0, target_hp - damage)
        await update_team_health(target_id, target_team, new_hp)
        try:
            await target.send(f"⚔️ **فريقك `{target_name}` تعرض للهجوم من {interaction.user.display_name}!**\n💥 الضرر: {damage}\n❤️ HP المتبقية: {new_hp}")
        except:
            pass
        embed = discord.Embed(title="⚔️ نتيجة الهجوم", color=0xFF4500)
        embed.add_field(name="المهاجم", value=f"{interaction.user.display_name} (فريق: {attacker_name or 'بدون اسم'})", inline=False)
        embed.add_field(name="الخصم", value=f"{target.display_name} (فريق: {target_name or 'بدون اسم'})", inline=False)
        embed.add_field(name="الضرر", value=str(damage), inline=True)
        embed.add_field(name="HP المتبقية", value=str(new_hp), inline=True)
        if new_hp == 0:
            embed.add_field(name="💀 النتيجة", value="تم هزيمة الفريق!", inline=False)
        await interaction.response.send_message(embed=embed)

    @bot.tree.command(name="help", description="عرض جميع الأوامر")
    async def help_cmd(interaction: discord.Interaction):
        embed = discord.Embed(title="🤖 قائمة الأوامر", color=0x5865F2)
        embed.add_field(name="💰 الاقتصاد", value="`/رصيدي`, `/يومي`, `/ساعي`, `/اعمل`, `/الاغنياء`", inline=False)
        embed.add_field(name="🛒 المتجر", value="`/المتجر`, `/اشتري`, `/مخزني`", inline=False)
        embed.add_field(name="👥 الفرق", value="`/تعيين_فريق`, `/تفعيل_فريق`, `/فرقي`", inline=False)
        embed.add_field(name="⚔️ القتال", value="`/هجوم @لاعب`", inline=False)
        await interaction.response.send_message(embed=embed)

    # ========== تشغيل البوت مع مزامنة محسنة ==========
    @bot.event
    async def on_ready():
        print(f"✅ Bot online: {bot.user}")
        print(f"📡 Bot ID: {bot.user.id}")
        print(f"📊 Connected to {len(bot.guilds)} servers")
        
        # مزامنة الأوامر مع طباعة العدد
        print("🔄 Syncing slash commands...")
        try:
            synced = await bot.tree.sync()
            print(f"✅ Synced {len(synced)} commands successfully!")
            print("📋 Command list:")
            for cmd in synced:
                print(f"   • /{cmd.name} - {cmd.description}")
        except Exception as e:
            print(f"❌ Failed to sync commands: {e}")
        
        print("🎉 Bot is ready to use!")

    async def main():
        print("🚀 Initializing database...")
        await init_db()
        print("✅ Database ready")