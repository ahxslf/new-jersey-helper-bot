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
        type: 6,
        required: true,
      },
      {
        name: 'punishment',
        description: 'The type of punishment (e.g. Warning, Kick, Ban, etc.)',
        type: 3,
        required: true,
      },
      {
        name: 'reason',
        description: 'The reason for the infraction',
        type: 3,
        required: true,
      },
      {
        name: 'notes',
        description: 'Additional notes (optional)',
        type: 3,
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
        type: 6,
        required: true,
      },
      {
        name: 'new_role',
        description: 'The new role to assign (select a role)',
        type: 8,
        required: true,
      },
      {
        name: 'reason',
        description: 'The reason for the promotion',
        type: 3,
        required: true,
      },
      {
        name: 'notes',
        description: 'Additional notes (optional)',
        type: 3,
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
        type: 3,
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
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'infractions',
    description: 'View infractions for a user (Staff only)',
    options: [
      {
        name: 'user',
        description: 'The user whose infractions to view (leave empty for recent)',
        type: 6,
        required: false,
      },
    ],
  },
  {
    name: 'void-infraction',
    description: 'Void an existing infraction by case number (Staff only)',
    options: [
      {
        name: 'case',
        description: 'The case number to void',
        type: 4,
        required: true,
      },
    ],
  },
  {
    name: 'my-infractions',
    description: 'View your own infractions (private)',
    options: [],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
