import discord
from discord.ext import commands
import os
import sys
import threading
from flask import Flask

# ========== خادم ويب لـ Render ==========
app = Flask(__name__)

@app.route('/')
def home():
    return "Bot is running!"

def run_webserver():
    app.run(host='0.0.0.0', port=8080)

# ========== التوكن من متغير البيئة ==========
TOKEN = os.getenv("DISCORD_TOKEN")
if TOKEN is None:
    print("❌ DISCORD_TOKEN environment variable not set.")
    sys.exit(1)

# ========== إعداد البوت ==========
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

# ========== أمر بسيط للاختبار ==========
@bot.event
async def on_ready():
    print(f"✅ Bot is online as {bot.user}")
    print(f"✅ Bot ID: {bot.user.id}")
    print(f"✅ Connected to {len(bot.guilds)} servers")

@bot.command()
async def ping(ctx):
    await ctx.send(f"Pong! Latency: {round(bot.latency * 1000)}ms")

# ========== التشغيل ==========
def main():
    # تشغيل خادم Flask في الخلفية
    thread = threading.Thread(target=run_webserver, daemon=True)
    thread.start()
    print("✅ Web server started on port 8080")
    
    # تشغيل البوت
    bot.run(TOKEN)

if __name__ == "__main__":
    main()