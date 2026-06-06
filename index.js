const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ==================== WEB SERVER (for Render / hosting platforms) ====================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('New Jersey | Helper is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// ==================== CONFIG ====================
const STAFF_ROLE_ID = '1511345038960099389';
const INFRACTION_CHANNEL_ID = '1511104457646018720';
const PROMOTION_CHANNEL_ID = '1511104720150986974';
const SESSION_CHANNEL_ID = '1512092319392993400';
const GUILD_ID = '1510749376593662032';

const SERVER_LOGO_URL = 'https://cdn.discordapp.com/icons/1510749376593662032/5056900317db8f6ec02e796f1835f938.webp';
const BANNER_URL = 'https://cdn.discordapp.com/attachments/980177239373140008/1512107963555385394/partners_1.png?ex=6a22e3c8&is=6a219248&hm=823f48ca844acacdf92d56999d1741370fd58b161e247f6d161206458ab1f24f';

const casesPath = path.join(__dirname, 'data', 'cases.json');
const infractionsPath = path.join(__dirname, 'data', 'infractions.json');
const promotionsPath = path.join(__dirname, 'data', 'promotions.json');

// ==================== CASE MANAGEMENT ====================
function loadCases() {
  try {
    if (fs.existsSync(casesPath)) {
      return JSON.parse(fs.readFileSync(casesPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading cases:', err);
  }
  return { infraction: 0, promotion: 0 };
}

function saveCases(cases) {
  try {
    fs.writeFileSync(casesPath, JSON.stringify(cases, null, 2));
  } catch (err) {
    console.error('Error saving cases:', err);
  }
}

function getNextCase(type) {
  const cases = loadCases();
  if (!cases[type]) cases[type] = 0;
  cases[type] += 1;
  saveCases(cases);
  return cases[type];
}

// ==================== LOG SYSTEM ====================
function loadLogs(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error loading logs from ${filePath}:`, err);
  }
  return [];
}

function saveLogs(filePath, logs) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error(`Error saving logs to ${filePath}:`, err);
  }
}

async function logInfraction(data) {
  try {
    const logs = loadLogs(infractionsPath);
    logs.push({
      ...data,
      status: 'active',
      timestamp: new Date().toISOString()
    });
    saveLogs(infractionsPath, logs);
    console.log(`✅ Infraction #${data.case} logged.`);
  } catch (err) {
    console.error('Error logging infraction:', err);
  }
}

async function logPromotion(data) {
  try {
    const logs = loadLogs(promotionsPath);
    logs.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    saveLogs(promotionsPath, logs);
    console.log(`✅ Promotion #${data.case} logged.`);
  } catch (err) {
    console.error('Error logging promotion:', err);
  }
}

function voidInfraction(caseNum, staffId, staffTag) {
  try {
    const logs = loadLogs(infractionsPath);
    const index = logs.findIndex(log => log.case === caseNum);

    if (index === -1) return { success: false, message: 'Infraction not found.' };
    if (logs[index].status === 'voided') return { success: false, message: 'This infraction is already voided.' };

    logs[index].status = 'voided';
    logs[index].voidedBy = staffId;
    logs[index].voidedByTag = staffTag;
    logs[index].voidedAt = new Date().toISOString();

    saveLogs(infractionsPath, logs);
    console.log(`✅ Infraction #${caseNum} voided.`);
    return { success: true, infraction: logs[index] };
  } catch (err) {
    console.error('Error voiding infraction:', err);
    return { success: false, message: 'Error while voiding.' };
  }
}

// ==================== TIME & TIMESTAMP ====================
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDiscordTimestamp(isoString) {
  const unix = Math.floor(new Date(isoString).getTime() / 1000);
  return `<t:${unix}:R>`;
}

// ==================== SESSION CHANNEL RENAME ====================
async function updateSessionChannelStatus(status) {
  const statusNames = {
    red: '🔴・sessions',
    yellow: '🟡・sessions',
    green: '🟢・sessions',
  };

  const newName = statusNames[status];
  if (!newName) return;

  try {
    const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.warn('Sessions channel not found or not text-based.');
      return;
    }

    const permissions = channel.permissionsFor(client.user);
    if (!permissions || !permissions.has('ManageChannels')) {
      console.warn('⚠️ Bot missing "Manage Channels" permission for sessions channel rename.');
      return;
    }

    if (channel.name !== newName) {
      await channel.setName(newName);
      console.log(`✅ Sessions channel renamed to: ${newName}`);
    }
  } catch (err) {
    console.error('❌ Failed to rename sessions channel:', err.message);
  }
}

// ==================== EMBED HELPERS (Clean & Professional) ====================
function createInfractionEmbed(data) {
  return new EmbedBuilder()
    .setColor(0xE74C3C)
    .setThumbnail(SERVER_LOGO_URL)
    .setAuthor({ name: data.targetUsername, iconURL: data.targetAvatar })
    .setTitle("You've been infracted")
    .setDescription(
      `> **Staff:** <@${data.staffId}>\n` +
      `> **Punishment:** ${data.punishment}\n` +
      `> **Reason:** ${data.reason}\n` +
      `> **Case:** ${data.case}\n` +
      `> **Notes:** ${data.notes}`
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `Issued by: ${data.staffUsername} • Today at ${data.time}`,
      iconURL: data.staffAvatar,
    });
}

function createPromotionEmbed(data) {
  return new EmbedBuilder()
    .setColor(0x2ECC71)
    .setThumbnail(SERVER_LOGO_URL)
    .setAuthor({ name: data.targetUsername, iconURL: data.targetAvatar })
    .setTitle("You've been promoted")
    .setDescription(
      `> **Staff:** <@${data.staffId}>\n` +
      `> **New Role:** <@&${data.newRoleId}>\n` +
      `> **Reason:** ${data.reason}\n` +
      `> **Case:** ${data.case}\n` +
      `> **Notes:** ${data.notes}`
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `Issued by: ${data.staffUsername} • Today at ${data.time}`,
      iconURL: data.staffAvatar,
    });
}

function createActivityTestEmbed(staffId, time) {
  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setThumbnail(SERVER_LOGO_URL)
    .setTitle("Activity Test")
    .setDescription(
      `React with the emoji below!\n\n` +
      `**Required:** 15 persons\n\n` +
      `Staff: <@${staffId}> • Today at ${time}`
    );
}

function createRPStartEmbed(code, staffId, time) {
  return new EmbedBuilder()
    .setColor(0xF1C40F)
    .setThumbnail(SERVER_LOGO_URL)
    .setTitle("New Jersey State Roleplay - RP Start")
    .setDescription(
      `**Server Code:** \`${code}\`\n\n` +
      `**[JOIN NOW](http://erlc.gg/join/${code})**\n\n` +
      `The server is **active**! You can join now.\n\n` +
      `**Have a nice roleplay!**\n\n` +
      `Staff: <@${staffId}> • Today at ${time}`
    );
}

function createRPStopEmbed(notes, staffId, time) {
  let desc = `The RP session has ended.\n\n` +
    `The server is now **inactive**.\n\n` +
    `Thank you everyone for participating! See you in the next session.`;

  if (notes) desc += `\n\n**Notes:** ${notes}`;
  desc += `\n\nStaff: <@${staffId}> • Today at ${time}`;

  return new EmbedBuilder()
    .setColor(0xE74C3C)
    .setThumbnail(SERVER_LOGO_URL)
    .setTitle("New Jersey State Roleplay - RP Stop")
    .setDescription(desc);
}

// ==================== CLIENT ====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// ==================== READY ====================
client.once('ready', () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
});

// ==================== INTERACTION HANDLER ====================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.guild) {
    return interaction.reply({ 
      content: '❌ This command can only be used in the server.', 
      flags: MessageFlags.Ephemeral 
    });
  }

  const member = interaction.member;
  const hasStaffRole = member.roles.cache.has(STAFF_ROLE_ID);
  const staffCommands = ['infract', 'promote', 'activity-test', 'rp-start', 'rp-stop', 'infractions', 'void-infraction'];

  if (staffCommands.includes(interaction.commandName) && !hasStaffRole) {
    return interaction.reply({
      content: '❌ You do not have permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const time = getCurrentTime();

  try {
    // Use flags instead of ephemeral (fixes deprecation warning)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (interaction.commandName === 'infract') {
      const targetUser = interaction.options.getUser('user');
      const punishment = interaction.options.getString('punishment');
      const reason = interaction.options.getString('reason');
      const notes = interaction.options.getString('notes') || 'None';
      const caseNum = getNextCase('infraction');

      const channel = await client.channels.fetch(INFRACTION_CHANNEL_ID);
      if (!channel) return interaction.editReply({ content: '❌ Infraction channel not found.' });

      const embed = createInfractionEmbed({
        targetUsername: targetUser.username,
        targetAvatar: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
        staffId: interaction.user.id,
        punishment,
        reason,
        case: caseNum,
        notes,
        staffUsername: interaction.user.username,
        staffAvatar: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
        time,
      });

      await channel.send({ content: `<@${targetUser.id}>`, embeds: [embed] });

      await logInfraction({
        case: caseNum,
        userId: targetUser.id,
        userTag: targetUser.tag,
        staffId: interaction.user.id,
        staffTag: interaction.user.tag,
        punishment,
        reason,
        notes,
      });

      await interaction.editReply({ content: `✅ Infraction #${caseNum} issued to ${targetUser.tag}.` });
    }

    else if (interaction.commandName === 'promote') {
      const targetUser = interaction.options.getUser('user');
      const newRole = interaction.options.getRole('new_role');
      const reason = interaction.options.getString('reason');
      const notes = interaction.options.getString('notes') || 'None';
      const caseNum = getNextCase('promotion');

      const channel = await client.channels.fetch(PROMOTION_CHANNEL_ID);
      if (!channel) return interaction.editReply({ content: '❌ Promotion channel not found.' });

      const embed = createPromotionEmbed({
        targetUsername: targetUser.username,
        targetAvatar: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
        staffId: interaction.user.id,
        newRoleId: newRole.id,
        reason,
        case: caseNum,
        notes,
        staffUsername: interaction.user.username,
        staffAvatar: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
        time,
      });

      await channel.send({ content: `<@${targetUser.id}>`, embeds: [embed] });

      // Role assignment with better error handling
      let roleMessage = '';
      try {
        const guildMember = await interaction.guild.members.fetch(targetUser.id);
        
        // Check if bot can manage the role
        const botMember = await interaction.guild.members.fetch(client.user.id);
        const rolePosition = newRole.position;
        const botHighestRole = botMember.roles.highest.position;

        if (rolePosition >= botHighestRole) {
          roleMessage = `⚠️ Could not assign role (bot's role is too low in hierarchy). Please assign <@&${newRole.id}> manually.`;
        } else if (!guildMember.roles.cache.has(newRole.id)) {
          await guildMember.roles.add(newRole);
          console.log(`✅ Role ${newRole.name} assigned to ${targetUser.tag}`);
          roleMessage = `✅ Role successfully assigned.`;
        } else {
          roleMessage = `ℹ️ User already had the role.`;
        }
      } catch (roleErr) {
        console.error('Role assignment failed:', roleErr.message);
        roleMessage = `⚠️ Failed to assign role: ${roleErr.message}. Please assign <@&${newRole.id}> manually to ${targetUser.tag}.`;
      }

      await logPromotion({
        case: caseNum,
        userId: targetUser.id,
        userTag: targetUser.tag,
        staffId: interaction.user.id,
        staffTag: interaction.user.tag,
        newRoleId: newRole.id,
        newRoleName: newRole.name,
        reason,
        notes,
      });

      await interaction.editReply({ 
        content: `✅ Promotion #${caseNum} issued to ${targetUser.tag}.\n${roleMessage}` 
      });
    }

    else if (interaction.commandName === 'activity-test') {
      const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
      if (!channel) return interaction.editReply({ content: '❌ Sessions channel not found.' });

      const embed = createActivityTestEmbed(interaction.user.id, time);
      const msg = await channel.send({ embeds: [embed] });
      await msg.react('✅');

      await updateSessionChannelStatus('yellow');
      await interaction.editReply({ content: '✅ Activity test announced.' });
    }

    else if (interaction.commandName === 'rp-start') {
      const code = interaction.options.getString('code');
      const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
      if (!channel) return interaction.editReply({ content: '❌ Sessions channel not found.' });

      const embed = createRPStartEmbed(code, interaction.user.id, time);
      await channel.send({ embeds: [embed] });

      await updateSessionChannelStatus('green');
      await interaction.editReply({ content: `✅ RP started with code **${code}**.` });
    }

    else if (interaction.commandName === 'rp-stop') {
      const notes = interaction.options.getString('notes');
      const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
      if (!channel) return interaction.editReply({ content: '❌ Sessions channel not found.' });

      const embed = createRPStopEmbed(notes, interaction.user.id, time);
      await channel.send({ embeds: [embed] });

      await updateSessionChannelStatus('red');
      await interaction.editReply({ content: '✅ RP session ended. Channel set to 🔴.' });
    }

    else if (interaction.commandName === 'infractions') {
      const targetUser = interaction.options.getUser('user');
      const logs = loadLogs(infractionsPath);
      let filtered = targetUser ? logs.filter(l => l.userId === targetUser.id) : logs;
      filtered = filtered.sort((a, b) => b.case - a.case).slice(0, 8);

      if (filtered.length === 0) {
        return interaction.editReply({ content: 'No infractions found.' });
      }

      let desc = '';
      filtered.forEach(l => {
        const status = l.status === 'voided' ? ' (Voided)' : '';
        desc += `**#${l.case}** - ${l.punishment}${status}\n> <@${l.userId}> • ${l.reason}\n\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle(targetUser ? `Infractions for ${targetUser.tag}` : 'Recent Infractions')
        .setDescription(desc)
        .setThumbnail(SERVER_LOGO_URL);

      await interaction.editReply({ embeds: [embed] });
    }

    else if (interaction.commandName === 'void-infraction') {
      const caseNum = interaction.options.getInteger('case');
      const result = voidInfraction(caseNum, interaction.user.id, interaction.user.tag);

      if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.message}` });
      }

      const infChannel = await client.channels.fetch(INFRACTION_CHANNEL_ID);
      if (infChannel) {
        await infChannel.send(`Infraction #${caseNum} has been voided by ${interaction.user.username}`);
      }

      await interaction.editReply({ content: `✅ Infraction #${caseNum} has been voided.` });
    }

    else if (interaction.commandName === 'my-infractions') {
      const userId = interaction.user.id;
      const logs = loadLogs(infractionsPath)
        .filter(l => l.userId === userId)
        .sort((a, b) => b.case - a.case);

      if (logs.length === 0) {
        return interaction.editReply({ content: 'You have no infractions.' });
      }

      let desc = '';
      logs.forEach(l => {
        const status = l.status === 'voided' ? 'Voided' : 'Active';
        desc += `**Case #${l.case} - ${l.punishment}**\n` +
                `> Date: ${getDiscordTimestamp(l.timestamp)}\n` +
                `> Issuer: <@${l.staffId}>\n` +
                `> Reason: ${l.reason}\n` +
                `> Status: ${status}\n\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('Your Infractions')
        .setDescription(desc)
        .setThumbnail(SERVER_LOGO_URL)
        .setFooter({
          text: `Requested by: ${interaction.member.displayName}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        });

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Command error:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ An unexpected error occurred.' }).catch(() => {});
    } else {
      await interaction.reply({ 
        content: '❌ An unexpected error occurred.', 
        flags: MessageFlags.Ephemeral 
      }).catch(() => {});
    }
  }
});

// ==================== LOGIN ====================
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Failed to login:', err);
  process.exit(1);
});
