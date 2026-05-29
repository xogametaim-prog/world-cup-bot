# ==================== tickets.py ====================
import discord
from discord.ext import commands
import asyncio
import aiosqlite
import time

رتبة_التذاكر_المسموح_لها = 0

async def is_authorized(user):
    if user.guild_permissions.administrator:
        return True
    if رتبة_التذاكر_المسموح_لها:
        role = user.guild.get_role(رتبة_التذاكر_المسموح_لها)
        if role and role in user.roles:
            return True
    return False

class تأكيد_الإغلاق(discord.ui.View):
    def __init__(self, channel, user):
        super().__init__(timeout=60)
        self.channel = channel
        self.user = user
    
    @discord.ui.button(label="نعم، أغلق التذكرة", style=discord.ButtonStyle.danger)
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.user:
            await interaction.response.send_message("❌ هذا التأكيد ليس لك!", ephemeral=True)
            return
        await interaction.response.send_message("🔒 جاري حذف التذكرة...")
        async with aiosqlite.connect("ticket_data.db") as db:
            await db.execute("DELETE FROM تذاكر WHERE channel_id = ?", (str(self.channel.id),))
            await db.commit()
        await asyncio.sleep(1)
        await self.channel.delete()
    
    @discord.ui.button(label="لا، إلغاء", style=discord.ButtonStyle.secondary)
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.user:
            await interaction.response.send_message("❌ هذا التأكيد ليس لك!", ephemeral=True)
            return
        await interaction.response.send_message("✅ تم إلغاء العملية", ephemeral=True)
        self.stop()

class TicketControlView(discord.ui.View):
    def __init__(self, creator_id, creator_name):
        super().__init__(timeout=None)
        self.creator_id = creator_id
        self.creator_name = creator_name
    
    @discord.ui.button(label="📌 استلام التذكرة", style=discord.ButtonStyle.success)
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not await is_authorized(interaction.user):
            await interaction.response.send_message("❌ ليس لديك صلاحية لاستلام هذه التذكرة!", ephemeral=True)
            return
        async with aiosqlite.connect("ticket_data.db") as db:
            await db.execute("UPDATE تذاكر SET status = 'claimed', claimer_id = ? WHERE channel_id = ?", (str(interaction.user.id), str(interaction.channel.id)))
            await db.commit()
        await interaction.response.send_message(f"✅ تم استلام التذكرة بواسطة {interaction.user.mention}")
    
    @discord.ui.button(label="🔒 إغلاق التذكرة", style=discord.ButtonStyle.danger)
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not await is_authorized(interaction.user):
            await interaction.response.send_message("❌ ليس لديك صلاحية لإغلاق هذه التذكرة!", ephemeral=True)
            return
        view = تأكيد_الإغلاق(interaction.channel, interaction.user)
        embed = discord.Embed(
            title="⚠️ تأكيد إغلاق التذكرة",
            description="هل أنت متأكد أنك تريد إغلاق وحذف هذه التذكرة؟ هذا الإجراء لا يمكن التراجع عنه.",
            color=0xFFA500
        )
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

class TicketButton(discord.ui.View):
    def __init__(self, embed_title, embed_description, embed_color):
        super().__init__(timeout=None)
        self.embed_title = embed_title
        self.embed_description = embed_description
        self.embed_color = embed_color
    
    @discord.ui.button(label="🎫 فتح تذكرة", style=discord.ButtonStyle.primary)
    async def create(self, interaction: discord.Interaction, button: discord.ui.Button):
        async with aiosqlite.connect("ticket_data.db") as db:
            cursor = await db.execute("SELECT channel_id FROM تذاكر WHERE guild_id = ? AND creator_id = ? AND status = 'open'", (str(interaction.guild_id), str(interaction.user.id)))
            existing = await cursor.fetchone()
            if existing:
                await interaction.response.send_message(f"❌ لديك تذكرة مفتوحة بالفعل! <#{existing[0]}>", ephemeral=True)
                return
        
        category = discord.utils.get(interaction.guild.categories, name="تذاكر")
        if not category:
            category = await interaction.guild.create_category("تذاكر")
        
        overwrites = {
            interaction.guild.default_role: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True, embed_links=True, add_reactions=True),
            interaction.guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True)
        }
        
        async with aiosqlite.connect("ticket_data.db") as db:
            cursor = await db.execute("SELECT رتبة_التذاكر FROM اعدادات_السيرفر WHERE guild_id = ?", (str(interaction.guild_id),))
            row = await cursor.fetchone()
            if row and row[0]:
                role = interaction.guild.get_role(int(row[0]))
                if role:
                    overwrites[role] = discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True, embed_links=True, add_reactions=True)
        
        channel = await interaction.guild.create_text_channel(
            name=f"تذكرة-{interaction.user.name}",
            category=category,
            overwrites=overwrites
        )
        
        embed = discord.Embed(
            title=self.embed_title,
            description=f"مرحباً {interaction.user.mention}\n\n{self.embed_description}",
            color=int(self.embed_color, 16)
        )
        view = TicketControlView(str(interaction.user.id), interaction.user.display_name)
        await channel.send(embed=embed, view=view)
        
        async with aiosqlite.connect("ticket_data.db") as db:
            await db.execute("INSERT INTO تذاكر (channel_id, guild_id, creator_id, creator_name, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
                            (str(channel.id), str(interaction.guild_id), str(interaction.user.id), interaction.user.display_name, int(time.time())))
            await db.commit()
        
        await interaction.response.send_message(f"✅ تم فتح تذكرة: {channel.mention}", ephemeral=True)