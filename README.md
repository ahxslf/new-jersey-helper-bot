# New Jersey | Helper

Discord bot for **New Jersey State Roleplay** (ER:LC server).

## Features
- `/infract` - Issue infractions (sends formatted embed to infractions channel)
- `/promote` - Issue staff promotions (sends formatted embed to promotions channel)
- `/activity-test` - Announce activity tests (sends to sessions channel + auto-reacts ✅)
- `/rp-start` - Announce RP session starts (sends to sessions channel)
- `/rp-stop` - End the current RP session (sends formatted embed + sets channel status)

All commands are **slash commands** (`/`).

Only users with the specific staff role (`1511345038960099389`) can use the commands.

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- A Discord bot token (create one at https://discord.com/developers/applications)
- The bot must be invited to your server with these permissions:
  - Send Messages
  - Embed Links
  - Attach Files (for images in embeds)
  - Add Reactions
  - Use Slash Commands (automatically)
  - **Manage Channels** (required for automatic sessions channel renaming)

### 2. Installation
```bash
cd new-jersey-helper-bot
npm install
```

### 3. Configuration
1. Copy the example env:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_client_id_here
   GUILD_ID=1510749376593662032
   ```

   - `DISCORD_TOKEN`: Your bot's token from Discord Developer Portal
   - `CLIENT_ID`: Your bot's Application ID (found in Discord Developer Portal > General Information)
   - `GUILD_ID`: Already set to the correct server ID

### 4. Register Slash Commands
Run this **once** (or whenever you change commands):
```bash
npm run deploy
```

### 5. Start the Bot
```bash
npm start
```

Or for development with auto-restart (install nodemon first):
```bash
npm install -g nodemon
nodemon index.js
```

## Channels Used
- Infractions: `1511104457646018720`
- Promotions: `1511104720150986974`
- Sessions: `1512092319392993400`

## Automatic Channel Status (Sessions Channel)
The bot **automatically renames** the sessions channel (1512092319392993400) based on status:

- **No active RP / after stop**: `🔴・sessions`
- **Activity test in progress**: `🟡・sessions`
- **RP session active** (`/rp-start`): `🟢・sessions`

This happens automatically when you use `/activity-test`, `/rp-start`, or `/rp-stop`.

**Important**: The bot needs the **Manage Channels** permission for this feature to work.

## New Command: /rp-stop
- Ends the RP session
- Posts a clean "RP Stop" embed in the sessions channel (with optional notes)
- Automatically sets the channel name back to `🔴・sessions`
- Designed to clearly signal the end of the session to members

Example embed content (bot designs the text):
- "The RP session has ended."
- "The server is now **inactive**."
- "Thank you everyone for participating! See you in the next session."
- Optional **Notes** if provided
- Staff + timestamp footer

## Embed Formats
The bot exactly matches the requested formats:
- Server logo as thumbnail (top-right)
- User avatar + username as author
- Custom "Today at HH:MM" timestamps
- Sequential case numbers (persisted in `data/cases.json`)
- Banner image for infraction/promotion
- Footer with issuer avatar and time
- Auto reaction on activity-test messages
- /rp-stop has its own clean "RP Stop" embed (no banner)

## Notes
- Case numbers are separate for infractions and promotions (both start at 1).
- `/rp-start` requires a server code (e.g. `rZeOZ`).
- `/rp-stop` accepts optional notes.
- Activity tests do **not** auto-start RP (manual as requested).
- Bot is fully in English.
- All timestamps use 24-hour format (e.g. 18:45).
- Channel renaming requires "Manage Channels" permission on the bot.

## Troubleshooting
- If commands don't appear: run `npm run deploy` again and wait a few minutes.
- Permission errors: Make sure the bot has the required role permissions and channel permissions.
- Channel not renaming: The bot needs **Manage Channels** permission in the server (or specifically for the sessions channel).
- Case numbers not saving: Check that the `data/` folder is writable.
- Avatar images not showing: Make sure the target user has an avatar set.

## Support
For the New Jersey State Roleplay server staff only.

Bot created from scratch as requested. Enjoy your roleplay sessions! 🚔
