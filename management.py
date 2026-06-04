# ==================== management.py ====================
import discord
from discord.ext import commands
from discord import app_commands
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
            return None

# ==================== قاعدة معرفة البوتات ====================
قاعدة_البوتات = {
    "ألعاب": {
        "الوصف": "🎮 بوتات ألعاب وتسلية لزيادة المتعة في سيرفرك",
        "القائمة": [
            {"الاسم": "Mudae", "الوصف": "بوت شخصيات الأنمي الشهير، استدعي شخصياتك المفضلة وتزوجها!", "الرابط": "https://top.gg/bot/432610292342587392"},
            {"الاسم": "Dank Memer", "الوصف": "بوت اقتصاد وميمز، اجمع فلوس واشتري أغراض واضحك مع أصدقائك", "الرابط": "https://top.gg/bot/270904126974590976"},
            {"الاسم": "OwO Bot", "الوصف": "بوت حيوانات وصيد، قاتل وحوش واجمع حيوانات نادرة", "الرابط": "https://top.gg/bot/408785106942164992"},
            {"الاسم": "Epic RPG", "الوصف": "بوت أر بي جي متكامل، مغامرات وقتالات وتطوير شخصية", "الرابط": "https://top.gg/bot/555955826880413696"},
            {"الاسم": "Pokétwo", "الوصف": "بوت بوكيمون تفاعلي، امسك بوكيمونات وتطور وتقاتل", "الرابط": "https://top.gg/bot/716390085896962058"}
        ]
    },
    "إدارة": {
        "الوصف": "⚙️ بوتات إدارة وحماية لتنظيم سيرفرك",
        "القائمة": [
            {"الاسم": "ProBot", "الوصف": "بوت إداري متكامل: ترحيب، رتب تلقائية، نظام لفلز، أوامر إدارة", "الرابط": "https://top.gg/bot/282859044593598464"},
            {"الاسم": "MEE6", "الوصف": "أشهر بوت إداري: لفلز، ترحيب، أوامر مودريشن، تنبيهات", "الرابط": "https://top.gg/bot/159985870458322944"},
            {"الاسم": "Wick", "الوصف": "بوت حماية قوي: مانع سبام، مانع لينكات، حماية من الهاكر", "الرابط": "https://top.gg/bot/536991182035746816"},
            {"الاسم": "Carl-bot", "الوصف": "بوت إداري متعدد الميزات: رياكشن رولز، لوج، أوامر تلقائية", "الرابط": "https://top.gg/bot/235148962103951360"},
            {"الاسم": "Dyno", "الوصف": "بوت إداري قديم وقوي: مودريشن، أوتو رول، ميوزك سابقاً", "الرابط": "https://top.gg/bot/155149108183695360"}
        ]
    },
    "موسيقى": {
        "الوصف": "🎵 بوتات موسيقى لتشغيل الأغاني في الرومات الصوتية",
        "القائمة": [
            {"الاسم": "Jockie Music", "الوصف": "بوت موسيقى متعدد يدعم سبوتيفاي وساوند كلاود", "الرابط": "https://top.gg/bot/411916947773587456"},
            {"الاسم": "FredBoat", "الوصف": "بوت موسيقى كلاسيكي وسهل الاستخدام", "الرابط": "https://top.gg/bot/184405311681986560"},
            {"الاسم": "Chip", "الوصف": "بوت موسيقى بجودة عالية وتحكم كامل", "الرابط": "https://top.gg/bot/618125824682590208"}
        ]
    },
    "دعم": {
        "الوصف": "🎫 بوتات تذاكر ودعم فني لتنظيم المساعدة",
        "القائمة": [
            {"الاسم": "Ticket Tool", "الوصف": "أشهر بوت تذاكر: افتح تذكرة بضغطة زر ونظم الدعم", "الرابط": "https://top.gg/bot/557628352828014614"},
            {"الاسم": "Helper.gg", "الوصف": "بوت دعم متكامل: تذاكر، تقييم، ردود جاهزة", "الرابط": "https://top.gg/bot/736879146549706753"},
            {"الاسم": "Tickets", "الوصف": "بوت تذاكر بسيط وسريع مع لوحة تحكم", "الرابط": "https://top.gg/bot/508391840525975553"}
        ]
    },
    "اقتصاد": {
        "الوصف": "💰 بوتات اقتصاد ومتاجر لبناء نظام فلوس وهمي",
        "القائمة": [
            {"الاسم": "UnbelievaBoat", "الوصف": "بوت اقتصاد متكامل: فلوس، بنوك، محلات، وظايف", "الرابط": "https://top.gg/bot/292953586492145673"},
            {"الاسم": "Kiai", "الوصف": "بوت اقتصاد بمميزات عربية: فلوس، متجر، هدايا", "الرابط": "https://top.gg/bot/528746905007652884"}
        ]
    },
    "ترحيب": {
        "الوصف": "👋 بوتات ترحيب مخصصة لاستقبال الأعضاء الجدد",
        "القائمة": [
            {"الاسم": "Welcome Bot", "الوصف": "بوت ترحيب بصور وخلفيات مخصصة لكل عضو", "الرابط": "https://top.gg/bot/672906221648642048"},
            {"الاسم": "Sapphire", "الوصف": "بوت ترحيب مع بطاقات تعريفية جميلة", "الرابط": "https://top.gg/bot/728871097257525250"}
        ]
    },
    "سوشيال": {
        "الوصف": "📱 بوتات تواصل اجتماعي لربط السيرفر بالعالم",
        "القائمة": [
            {"الاسم": "DisPing", "الوصف": "بوت ينبّه السيرفر عند بث يوتيوب أو تويتش", "الرابط": "https://top.gg/bot/825271118712373249"},
            {"الاسم": "Notifiarr", "الوصف": "بوت إشعارات من يوتيوب وتويتش وغيره", "الرابط": "https://top.gg/bot/740104040721448990"}
        ]
    }
}

قائمة_الأنواع = list(قاعدة_البوتات.keys())

def البحث_عن_بوتات(النوع_أو_الفكرة):
    النوع = النوع_أو_الفكرة.strip()
    if النوع in قاعدة_البوتات:
        return قاعدة_البوتات[النوع]
    for مفتاح, قيمة in قاعدة_البوتات.items():
        if النوع in مفتاح or مفتاح in النوع:
            return قيمة
    for مفتاح, قيمة in قاعدة_البوتات.items():
        for بوت in قيمة["القائمة"]:
            if النوع.lower() in بوت["الاسم"].lower() or النوع.lower() in بوت["الوصف"].lower():
                return {
                    "الوصف": f"🔍 نتائج البحث عن '{النوع}'",
                    "القائمة": [بوت]
                }
    return None

# ==================== الـ Cog ====================
class Management(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self):
        logger.info("✅ Management جاهز (مستشار البوتات)")

    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author.bot or not message.guild: return
        msg = message.content.strip()
        if any(phrase in msg for phrase in ["أبي بوت", "بدي بوت", "ابغى بوت", "بوت اقتراح", "اقترح بوت"]):
            embed = EmbedHelper.create(
                title="🤖 مستشار البوتات",
                description=f"أهلاً {message.author.mention}!\nيمكنك استخدام أمر **/اقتراح_بوت** وتحديد نوع البوت الذي تبحث عنه.\n\n**الأنواع المتاحة:** {', '.join(قائمة_الأنواع)}",
                color=0x9B59B6,
                footer_text="اكتب النوع فقط واقترح لك الأفضل!"
            )
            await message.reply(embed=embed, mention_author=False)

    @app_commands.command(name="اقتراح_بوت", description="يقترح لك أفضل البوتات حسب النوع")
    @app_commands.describe(النوع="نوع البوت (مثلاً: ألعاب، إدارة، موسيقى، دعم)")
    async def اقتراح_بوت(self, interaction: discord.Interaction, النوع: str):
        await interaction.response.defer()
        try:
            النتيجة = البحث_عن_بوتات(النوع)
            if not النتيجة:
                embed = EmbedHelper.create(
                    title="❌ لم أجد نتائج",
                    description=f"عذراً، لم أجد بوتات تطابق '{النوع}'.\n\n**الأنواع المتاحة:** {', '.join(قائمة_الأنواع)}\n\nجرب كتابة نوع آخر!",
                    color=0xFF0000
                )
                await interaction.followup.send(embed=embed)
                return

            fields = []
            for i, بوت in enumerate(النتيجة["القائمة"][:10], 1):
                fields.append({
                    "name": f"{i}. {بوت['الاسم']}",
                    "value": f"{بوت['الوصف']}\n[🔗 دعوة البوت]({بوت['الرابط']})",
                    "inline": False
                })

            embed = EmbedHelper.create(
                title=f"🤖 أفضل بوتات {النوع}",
                description=f"**{النتيجة['الوصف']}**\n\nإليك أفضل {len(النتيجة['القائمة'])} بوتات في هذه الفئة:",
                color=0x9B59B6,
                fields=fields,
                footer_text="اضغط على الرابط لدعوة البوت • bot"
            )
            await interaction.followup.send(embed=embed)
        except Exception as e:
            logger.error(f"❌ اقتراح_بوت: {e}")
            await interaction.followup.send(embed=EmbedHelper.create(description="❌ حدث خطأ داخلي!", color=0xFF0000))

    @app_commands.command(name="help", description="قائمة المساعدة")
    async def help_command(self, interaction: discord.Interaction):
        embed = EmbedHelper.create(
            title="📚 المساعدة - مستشار البوتات",
            description="مرحباً بك في بوت اقتراح البوتات الذكي!",
            color=0x3498db,
            fields=[
                {"name": "🤖 أمر الاقتراح", "value": "`/اقتراح_بوت` - اكتب نوع البوت ويقترح لك الأفضل", "inline": False},
                {"name": "💬 في الشات", "value": "اكتب 'أبي بوت' أو 'بدي بوت' في الشات", "inline": False},
                {"name": "📂 الأنواع المتاحة", "value": ", ".join(قائمة_الأنواع), "inline": False}
            ],
            footer_text="بوت مستشار البوتات • شغال 24 ساعة"
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot):
    await bot.add_cog(Management(bot))