const { REST, Routes } = require('discord.js');
require('dotenv').config();
const { CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  {
    name: 'infract',
    description: 'Issue an infraction to a user (Staff only)',
    options: [
      {
        name: 'user',
        description: 'The user to receive the infraction',
        type: 6, // USER
        required: true,
      },
      {
        name: 'punishment',
        description: 'The type of punishment (e.g. Warning, Kick, Ban, etc.)',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'reason',
        description: 'The reason for the infraction',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'notes',
        description: 'Additional notes (optional)',
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: 'promote',
    description: 'Promote a staff member (Staff only)',
    options: [
      {
        name: 'user',
        description: 'The staff member to promote',
        type: 6, // USER
        required: true,
      },
      {
        name: 'new_role',
        description: 'The new role to assign (select a role)',
        type: 8, // ROLE
        required: true,
      },
      {
        name: 'reason',
        description: 'The reason for the promotion',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'notes',
        description: 'Additional notes (optional)',
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: 'activity-test',
    description: 'Host an activity test session (Staff only)',
    options: [],
  },
  {
    name: 'rp-start',
    description: 'Announce an RP session start (Staff only)',
    options: [
      {
        name: 'code',
        description: 'The ER:LC server code (e.g. rZeOZ)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'rp-stop',
    description: 'End the current RP session (Staff only)',
    options: [
      {
        name: 'notes',
        description: 'Reason or additional notes for stopping the RP (optional)',
        type: 3, // STRING
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // Register commands for the specific guild (faster for testing)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();