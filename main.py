import discord
from discord.ext import commands
from discord import app_commands
import asyncio
import random
import time
import threading
from flask import Flask
from config import TOKEN, WEAPON_DAMAGE, DEFAULT_PUNCH_DAMAGE
from database import init_db, get_user, update_user, get_team, set_team, update_team_health, get_all_users, add_inventory, get_inventory, get_shop_item, get_all_shop

# Flask для Render
app = Flask(__name__)
@app.route('/')
def home():
    return "Bot is running!"

def run_flask():
    app.run(host='0.0.0.0', port=8080)

# إعداد البوت
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

async def get_best_weapon(user_id):
    inv = await get_inventory(user_id)
    best = DEFAULT_PUNCH_DAMAGE
    for item_id, qty in inv:
        if qty > 0 and item_id in WEAPON_DAMAGE:
            best = max(best, WEAPON_DAMAGE[item_id])
    return best

# ========== الأوامر ==========
@bot.tree.command(name="مساعدة", description="عرض جميع الأوامر")
async def help_cmd(interaction: discord.Interaction):
    embed = discord.Embed(title="🤖 قائمة الأوامر", color=0x5865F2)
    embed.add_field(name="💰 الاقتصاد", value="`/رصيدي`, `/يومي`, `/ساعي`, `/اعمل`, `/الاغنياء`", inline=False)
    embed.add_field(name="🛒 المتجر", value="`/المتجر`, `/اشتري`, `/مخزني`", inline=False)
    embed.add_field(name="👥 الفرق", value="`/تعيين_فريق`, `/تفعيل_فريق`, `/فرقي`", inline=False)
    embed.add_field(name="⚔️ القتال", value="`/هجوم @لاعب`", inline=False)
    await interaction.response.send_message(embed=embed)

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
    if now - user["last_daily"] < 86400:
        await interaction.response.send_message("⏳ انتظر 24 ساعة", ephemeral=True)
        return
    await update_user(uid, last_daily=now, coins=user["coins"]+500, credits=user["credits"]+10)
    await interaction.response.send_message("🎁 +500 عملة و +10 رصيد")

@bot.tree.command(name="ساعي", description="مكافأة كل ساعة")
async def hourly(interaction: discord.Interaction):
    uid = str(interaction.user.id)
    user = await get_user(uid)
    now = int(time.time())
    if now - user["last_hourly"] < 3600:
        await interaction.response.send_message("⏳ انتظر ساعة", ephemeral=True)
        return
    await update_user(uid, last_hourly=now, coins=user["coins"]+100)
    await interaction.response.send_message("⏲️ +100 عملة")

@bot.tree.command(name="اعمل", description="اعمل لكسب عملات")
async def work(interaction: discord.Interaction):
    earn = random.randint(50, 200)
    uid = str(interaction.user.id)
    user = await get_user(uid)
    await update_user(uid, coins=user["coins"]+earn)
    await interaction.response.send_message(f"💼 كسبت {earn} عملة")

@bot.tree.command(name="الاغنياء", description="أغنى 10 لاعبين")
async def leaderboard(interaction: discord.Interaction):
    rows = await get_all_users()
    sorted_rows = sorted(rows, key=lambda x: x[1], reverse=True)[:10]
    desc = "\n".join([f"{i+1}. <@{uid}> — {coins} 🪙" for i, (uid, coins) in enumerate(sorted_rows)])
    await interaction.response.send_message(embed=discord.Embed(title="🏆 قائمة الأغنياء", description=desc, color=0xFFD700))

@bot.tree.command(name="المتجر", description="عرض المتجر")
async def shop(interaction: discord.Interaction):
    items = await get_all_shop()
    embed = discord.Embed(title="🛒 المتجر", color=0x3498db)
    for item in items[:12]:
        embed.add_field(name=f"{item['id']}. {item['name']}", value=f"🪙 {item['coinPrice']} | 💎 {item['creditPrice']}", inline=True)
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="اشتري", description="شراء سلعة")
@app_commands.choices(currency=[
    app_commands.Choice(name="عملات", value="coins"),
    app_commands.Choice(name="رصيد مميز", value="credits")
])
async def buy(interaction: discord.Interaction, item_id: int, currency: str, quantity: int = 1):
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
    await add_inventory(uid, item_id, quantity * multiplier)
    await interaction.response.send_message(f"✅ اشتريت {quantity * multiplier} × {item['name']}")

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
    await interaction.response.send_message(embed=discord.Embed(title=f"مخزون {interaction.user.display_name}", description=desc, color=0x2ecc71))

@bot.tree.command(name="تعيين_فريق", description="تسمية فريقك")
@app_commands.choices(slot=[
    app_commands.Choice(name="الفريق الأول", value=1),
    app_commands.Choice(name="الفريق الثاني", value=2)
])
async def set_team_cmd(interaction: discord.Interaction, slot: int, name: str):
    await set_team(str(interaction.user.id), slot-1, name[:20])
    await interaction.response.send_message(f"✅ تم تسمية الفريق {slot} → {name}")

@bot.tree.command(name="تفعيل_فريق", description="تفعيل فريق")
@app_commands.choices(slot=[
    app_commands.Choice(name="الفريق الأول", value=1),
    app_commands.Choice(name="الفريق الثاني", value=2)
])
async def activate_team_cmd(interaction: discord.Interaction, slot: int):
    await update_user(str(interaction.user.id), active_team=slot-1)
    await interaction.response.send_message(f"🔁 تم تفعيل الفريق {slot}")

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
    
    _, target_hp = await get_team(target_id, target_team, include_health=True)
    if target_hp <= 0:
        await interaction.response.send_message(f"❌ فريق {target.display_name} هُزم بالفعل!", ephemeral=True)
        return
    
    damage = await get_best_weapon(attacker_id)
    new_hp = max(0, target_hp - damage)
    await update_team_health(target_id, target_team, new_hp)
    
    try:
        await target.send(f"⚔️ تعرض فريقك للهجوم من {interaction.user.display_name}!\n💥 الضرر: {damage}\n❤️ HP المتبقية: {new_hp}")
    except:
        pass
    
    await interaction.response.send_message(f"⚔️ هاجمت {target.display_name} وتسببت بـ {damage} ضرر! (HP متبقي: {new_hp})")

# ========== تشغيل البوت ==========
@bot.event
async def on_ready():
    print(f"✅ Bot online as {bot.user}")
    await bot.tree.sync()

async def main():
    await init_db()
    threading.Thread(target=run_flask, daemon=True).start()
    await bot.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(main())