const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ==================== WEB SERVER (for hosting platforms like Render) ====================
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
    console.log(`✅ Infraction #${data.case} logged to JSON.`);
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
    console.log(`✅ Promotion #${data.case} logged to JSON.`);
  } catch (err) {
    console.error('Error logging promotion:', err);
  }
}

function voidInfraction(caseNum, staffId, staffTag) {
  try {
    const logs = loadLogs(infractionsPath);
    const index = logs.findIndex(log => log.case === caseNum);

    if (index === -1) {
      return { success: false, message: 'Infraction not found.' };
    }

    if (logs[index].status === 'voided') {
      return { success: false, message: 'This infraction is already voided.' };
    }

    logs[index].status = 'voided';
    logs[index].voidedBy = staffId;
    logs[index].voidedByTag = staffTag;
    logs[index].voidedAt = new Date().toISOString();

    saveLogs(infractionsPath, logs);
    console.log(`✅ Infraction #${caseNum} has been voided.`);
    return { success: true, infraction: logs[index] };
  } catch (err) {
    console.error('Error voiding infraction:', err);
    return { success: false, message: 'An error occurred while voiding the infraction.' };
  }
}

// ==================== TIME FORMAT ====================
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDiscordTimestamp(isoString) {
  const date = new Date(isoString);
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:R>`;
}

// ==================== SESSION CHANNEL STATUS ====================
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
    if (channel && channel.isTextBased()) {
      if (channel.permissionsFor(client.user)?.has('ManageChannels')) {
        if (channel.name !== newName) {
          await channel.setName(newName);
          console.log(`✅ Session channel renamed to: ${newName}`);
        }
      } else {
        console.warn('⚠️ Bot does not have Manage Channels permission to rename the sessions channel.');
      }
    }
  } catch (err) {
    console.error('❌ Failed to rename session channel:', err.message);
  }
}

// ==================== HELPER: Create Infraction Embed ====================
function createInfractionEmbed(infraction, page, totalPages, requester) {
  const statusText = infraction.status === 'voided' ? 'Voided' : 'Active';

  const embed = new EmbedBuilder()
    .setColor(infraction.status === 'voided' ? 0x888888 : 0xFF4444)
    .setTitle(`Case #${infraction.case} - ${infraction.punishment}`)
    .setThumbnail(SERVER_LOGO_URL)
    .addFields(
      { name: 'Date', value: getDiscordTimestamp(infraction.timestamp), inline: true },
      { name: 'Issuer', value: `<@${infraction.staffId}> (${infraction.staffTag})`, inline: true },
      { name: 'Reason', value: infraction.reason, inline: false },
      { name: 'Status', value: statusText, inline: true }
    );

  if (infraction.notes && infraction.notes !== 'None') {
    embed.addFields({ name: 'Notes', value: infraction.notes, inline: false });
  }

  if (infraction.status === 'voided' && infraction.voidedBy) {
    embed.addFields({
      name: 'Voided By',
      value: `<@${infraction.voidedBy}> (${infraction.voidedByTag}) at ${getDiscordTimestamp(infraction.voidedAt)}`,
      inline: false
    });
  }

  embed.setFooter({
    text: `Page ${page} of ${totalPages} • Requested by: ${requester}`,
    iconURL: requester.avatarURL ? requester.avatarURL({ dynamic: true, size: 128 }) : undefined,
  });

  return embed;
}

// ==================== CLIENT ====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// ==================== READY ====================
client.once('ready', () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`New Jersey | Helper ready for New Jersey State Roleplay`);
});

// ==================== INTERACTION HANDLER ====================
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    // Handle slash commands
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in the New Jersey State Roleplay server.',
        ephemeral: true,
      });
    }

    const member = interaction.member;
    const hasStaffRole = member.roles.cache.has(STAFF_ROLE_ID);
    const isStaffCommand = ['infract', 'promote', 'activity-test', 'rp-start', 'rp-stop', 'infractions', 'void-infraction'].includes(interaction.commandName);

    if (isStaffCommand && !hasStaffRole) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command. Only staff with the required role can use it.',
        ephemeral: true,
      });
    }

    const time = getCurrentTime();

    try {
      if (interaction.commandName === 'infract') {
        const targetUser = interaction.options.getUser('user');
        const punishment = interaction.options.getString('punishment');
        const reason = interaction.options.getString('reason');
        const notes = interaction.options.getString('notes') || 'None';

        const caseNum = getNextCase('infraction');

        const channel = await client.channels.fetch(INFRACTION_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: '❌ Infraction channel not found or inaccessible.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0xFF4444)
          .setAuthor({
            name: targetUser.username,
            iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
          })
          .setTitle("You've been infracted")
          .setThumbnail(SERVER_LOGO_URL)
          .setDescription(
            `> **Infraction Details**\n` +
            `> **Staff:** <@${interaction.user.id}>\n` +
            `> **Punishment:** ${punishment}\n` +
            `> **Reason:** ${reason}\n` +
            `> **Case:** ${caseNum}\n` +
            `> **Notes:** ${notes}`
          )
          .setImage(BANNER_URL)
          .setFooter({
            text: `Issued by: ${interaction.user.username} • Today at ${time}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
          });

        await channel.send({
          content: `<@${targetUser.id}>`,
          embeds: [embed]
        });

        await logInfraction({
          case: caseNum,
          userId: targetUser.id,
          userTag: targetUser.tag,
          staffId: interaction.user.id,
          staffTag: interaction.user.tag,
          punishment: punishment,
          reason: reason,
          notes: notes
        });

        await interaction.reply({
          content: `✅ Infraction #${caseNum} successfully issued to ${targetUser.tag}.`,
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'promote') {
        const targetUser = interaction.options.getUser('user');
        const newRole = interaction.options.getRole('new_role');
        const reason = interaction.options.getString('reason');
        const notes = interaction.options.getString('notes') || 'None';

        const caseNum = getNextCase('promotion');

        const channel = await client.channels.fetch(PROMOTION_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: '❌ Promotion channel not found or inaccessible.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x44FF44)
          .setAuthor({
            name: targetUser.username,
            iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
          })
          .setTitle("You've been promoted")
          .setThumbnail(SERVER_LOGO_URL)
          .setDescription(
            `> **Staff Promotion**\n` +
            `> **Staff:** <@${interaction.user.id}>\n` +
            `> **New Role:** <@&${newRole.id}>\n` +
            `> **Reason:** ${reason}\n` +
            `> **Case:** ${caseNum}\n` +
            `> **Notes:** ${notes}`
          )
          .setImage(BANNER_URL)
          .setFooter({
            text: `Issued by: ${interaction.user.username} • Today at ${time}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
          });

        await channel.send({
          content: `<@${targetUser.id}>`,
          embeds: [embed]
        });

        // Assign the role
        try {
          const guildMember = await interaction.guild.members.fetch(targetUser.id);
          if (!guildMember.roles.cache.has(newRole.id)) {
            await guildMember.roles.add(newRole);
            console.log(`✅ Role ${newRole.name} assigned to ${targetUser.tag}`);
          }
        } catch (roleErr) {
          console.error('Failed to assign role:', roleErr);
          await interaction.followUp({
            content: `⚠️ Infraction logged but failed to assign the role. Please assign <@&${newRole.id}> manually to ${targetUser.tag}.`,
            ephemeral: true,
          });
        }

        await logPromotion({
          case: caseNum,
          userId: targetUser.id,
          userTag: targetUser.tag,
          staffId: interaction.user.id,
          staffTag: interaction.user.tag,
          newRoleId: newRole.id,
          newRoleName: newRole.name,
          reason: reason,
          notes: notes
        });

        await interaction.reply({
          content: `✅ Promotion #${caseNum} successfully issued to ${targetUser.tag}.`,
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'activity-test') {
        const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: '❌ Sessions channel not found or inaccessible.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x00BFFF)
          .setThumbnail(SERVER_LOGO_URL)
          .setTitle("Activity Test")
          .setDescription(
            `React with the emoji below! \n\n` +
            `**Required:** 15 persons\n\n` +
            `Staff: <@${interaction.user.id}> **• Today at ${time}**`
          );

        const message = await channel.send({ embeds: [embed] });
        await message.react('✅');

        await updateSessionChannelStatus('yellow');

        await interaction.reply({
          content: '✅ Activity test announced successfully in the sessions channel.',
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'rp-start') {
        const code = interaction.options.getString('code');

        const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: '❌ Sessions channel not found or inaccessible.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setThumbnail(SERVER_LOGO_URL)
          .setTitle("New Jersey State Roleplay - RP Start")
          .setDescription(
            `Server Code: **${code}**\n\n` +
            `**[JOIN NOW](http://erlc.gg/join/${code})**\n\n` +
            `The server is **active!** You can join now.\n\n` +
            `**Have a nice roleplay!**\n\n` +
            `Staff: <@${interaction.user.id}> **• Today at ${time}**`
          );

        await channel.send({ embeds: [embed] });

        await updateSessionChannelStatus('green');

        await interaction.reply({
          content: `✅ RP Start announced successfully with code **${code}**.`,
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'rp-stop') {
        const notes = interaction.options.getString('notes');

        const channel = await client.channels.fetch(SESSION_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: '❌ Sessions channel not found or inaccessible.',
            ephemeral: true,
          });
        }

        let description = 
          `The RP session has ended.\n\n` +
          `The server is now **inactive**.\n\n` +
          `Thank you everyone for participating! See you in the next session.`;

        if (notes) {
          description += `\n\n**Notes:** ${notes}`;
        }

        description += `\n\nStaff: <@${interaction.user.id}> **• Today at ${time}**`;

        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setThumbnail(SERVER_LOGO_URL)
          .setTitle("New Jersey State Roleplay - RP Stop")
          .setDescription(description);

        await channel.send({ embeds: [embed] });

        await updateSessionChannelStatus('red');

        await interaction.reply({
          content: '✅ RP session ended successfully. Channel status updated to 🔴.',
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'infractions') {
        const targetUser = interaction.options.getUser('user');

        const logs = loadLogs(infractionsPath);
        let filtered = logs;

        if (targetUser) {
          filtered = logs.filter(log => log.userId === targetUser.id);
        }

        filtered = filtered.sort((a, b) => b.case - a.case);

        if (filtered.length === 0) {
          return interaction.reply({
            content: targetUser 
              ? `No infractions found for ${targetUser.tag}.` 
              : 'No infractions found in the system.',
            ephemeral: true,
          });
        }

        // Show last 5 for staff overview
        const toShow = filtered.slice(0, 5);
        let description = '';

        toShow.forEach(log => {
          const status = log.status === 'voided' ? ' (Voided)' : '';
          description += `**Case #${log.case}** - ${log.punishment}${status}\n`;
          description += `> User: <@${log.userId}>\n`;
          description += `> Reason: ${log.reason}\n`;
          description += `> Staff: <@${log.staffId}>\n\n`;
        });

        const embed = new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle(targetUser ? `Infractions for ${targetUser.tag}` : 'Recent Infractions')
          .setDescription(description || 'No infractions to display.')
          .setFooter({ text: `Showing ${toShow.length} of ${filtered.length} infractions` });

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'void-infraction') {
        const caseNum = interaction.options.getInteger('case');

        const result = voidInfraction(caseNum, interaction.user.id, interaction.user.tag);

        if (!result.success) {
          return interaction.reply({
            content: `❌ ${result.message}`,
            ephemeral: true,
          });
        }

        const infractionChannel = await client.channels.fetch(INFRACTION_CHANNEL_ID);
        if (infractionChannel && infractionChannel.isTextBased()) {
          await infractionChannel.send(
            `Infraction #${caseNum} has been voided by ${interaction.user.username}`
          );
        }

        await interaction.reply({
          content: `✅ Infraction #${caseNum} has been voided.`,
          ephemeral: true,
        });
      }

      else if (interaction.commandName === 'my-infractions') {
        const userId = interaction.user.id;
        const logs = loadLogs(infractionsPath);
        const userInfractions = logs
          .filter(log => log.userId === userId)
          .sort((a, b) => b.case - a.case);

        if (userInfractions.length === 0) {
          return interaction.reply({
            content: 'You have no infractions on record.',
            ephemeral: true,
          });
        }

        let currentPage = 0;
        const totalPages = userInfractions.length;

        const generateEmbed = (page) => {
          const inf = userInfractions[page];
          const requester = interaction.member || interaction.user;
          return createInfractionEmbed(inf, page + 1, totalPages, requester);
        };

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('◀ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === totalPages - 1)
          );

        const message = await interaction.reply({
          embeds: [generateEmbed(currentPage)],
          components: [row],
          ephemeral: true,
          fetchReply: true,
        });

        const collector = message.createMessageComponentCollector({
          time: 120000,
        });

        collector.on('collect', async (i) => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'This is not your pagination.', ephemeral: true });
          }

          if (i.customId === 'prev' && currentPage > 0) {
            currentPage--;
          } else if (i.customId === 'next' && currentPage < totalPages - 1) {
            currentPage++;
          }

          const newRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages - 1)
            );

          await i.update({
            embeds: [generateEmbed(currentPage)],
            components: [newRow],
          });
        });

        collector.on('end', () => {
          // Disable buttons after timeout
          const disabledRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
          message.edit({ components: [disabledRow] }).catch(() => {});
        });
      }
    } catch (error) {
      console.error('Command error:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ An unexpected error occurred while processing the command.',
          ephemeral: true,
        });
      }
    }
  }
});

// ==================== LOGIN ====================
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('Failed to login:', err);
  process.exit(1);
});
