# ==================== main.py ====================
import sys
import traceback
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('discord_bot')

def handle_exception(exc_type, exc_value, exc_traceback):
    logger.error("خطأ كارثي غير متوقع:")
    logger.error("".join(traceback.format_exception(exc_type, exc_value, exc_traceback)))

sys.excepthook = handle_exception

try:
    import discord
    from discord.ext import commands
    logger.info("✅ تم استيراد discord.py بنجاح")
except Exception as e:
    logger.error(f"❌ فشل في استيراد discord.py: {e}")
    sys.exit(1)

التوكن = os.getenv("DISCORD_TOKEN")
if not التوكن:
    logger.error("❌ DISCORD_TOKEN غير موجود في متغيرات البيئة")
    sys.exit(1)

logger.info(f"✅ تم العثور على التوكن (يبدأ بـ: {التوكن[:10]}...)")

try:
    الصلاحيات = discord.Intents.default()
    الصلاحيات.message_content = True
    الصلاحيات.members = True
    البوت = commands.Bot(command_prefix="+", intents=الصلاحيات)
    logger.info("✅ تم إنشاء البوت مع الصلاحيات المطلوبة")
except Exception as e:
    logger.error(f"❌ فشل في إنشاء البوت: {e}")
    sys.exit(1)

@bot.event
async def on_ready():
    try:
        logger.info(f"✅ تم تشغيل البوت: {bot.user}")
        logger.info(f"📊 عدد السيرفرات: {len(bot.guilds)}")
        
        await bot.load_extension("cogs.management")
        logger.info("✅ تم تحميل management cog")
        
        await bot.load_extension("cogs.games")
        logger.info("✅ تم تحميل games cog")
        
        synced = await bot.tree.sync()
        logger.info(f"📡 تم مزامنة {len(synced)} أمر")
        logger.info("✅ البوت جاهز للعمل!")
    except Exception as e:
        logger.error(f"❌ خطأ في on_ready: {e}")

async def main():
    try:
        logger.info("🚀 بدء تشغيل البوت...")
        await bot.start(التوكن)
    except discord.LoginFailure:
        logger.error("❌ فشل تسجيل الدخول: التوكن غير صالح")
        sys.exit(1)
    except discord.PrivilegedIntentsRequired:
        logger.error("❌ الصلاحيات المميزة غير مفعلة")
        logger.error("اذهب إلى Discord Developer Portal > Bot > وقم بتفعيل Message Content Intent و Server Members Intent")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ خطأ غير متوقع: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    try:
        import asyncio
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("⏹️ تم إيقاف البوت يدوياً")
    except Exception as e:
        logger.error(f"❌ خطأ في تشغيل البوت: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)