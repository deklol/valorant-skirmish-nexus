# Tournament Discord Bot

A comprehensive Discord bot for tournament management and quick match creation, fully integrated with the tournament web application.

## Features

### 🏆 Tournament Management
- **Tournament Announcements**: Automatically post new tournaments with interactive signup buttons
- **Live Registration**: Sign up directly through Discord with real-time player count updates
- **Tournament Info**: View detailed tournament information, participant lists, and schedules
- **Check-in Reminders**: Automated DMs for tournament check-in periods

### ⚡ Quick Match System  
- **10-Man Queue**: Join a queue for instant balanced matches
- **Smart Balancing**: Uses the same adaptive weight system as the web app
- **Auto-Match Creation**: Automatically creates balanced teams when 10 players are queued
- **Real-time Updates**: Live queue status and player counts

### 👤 User Management
- **Registration**: Complete user onboarding flow within Discord
- **Profile Management**: View and update rank information
- **Rank Scraping**: Automatic rank verification using the web app's scraper
- **Statistics Tracking**: Tournament stats, match records, and leaderboards

### 📊 Statistics & Leaderboards
- **Personal Stats**: View wins, losses, tournament history
- **Global Leaderboards**: Server-wide rankings by tournament wins and match records
- **Rank Display**: Visual rank icons and colors matching the web app

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Discord Bot Token and Application ID
- Supabase Service Role Key
- Access to your tournament app database

### Installation

1. **Clone and Install**
   ```bash
   cd discord-bot
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Required Environment Variables**
   ```env
   # Discord Configuration
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here  
   DISCORD_GUILD_ID=your_server_id_here (optional, for faster command deployment)

   # Supabase Configuration  
   SUPABASE_URL=https://tmncfnwtqorbmxxyxhle.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Optional Configuration
   HENRIK_API_KEY=your_henrik_api_key_here (for Riot ID validation)
   ADMIN_ROLE_NAME=Tournament Admin
   QUICK_MATCH_CHANNEL_ID=channel_for_quick_matches
   TOURNAMENT_CHANNEL_ID=channel_for_tournament_announcements
   ```

4. **Database Setup**
   The bot requires a `quick_match_queue` table. Run this SQL in your Supabase database:
   
   ```sql
   CREATE TABLE public.quick_match_queue (
     id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     joined_at timestamp with time zone NOT NULL DEFAULT now(),
     is_active boolean NOT NULL DEFAULT true,
     created_at timestamp with time zone DEFAULT now()
   );

   -- Enable RLS
   ALTER TABLE public.quick_match_queue ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
   CREATE POLICY "Users can manage their own queue entries" ON public.quick_match_queue
   FOR ALL USING (auth.uid() = user_id);

   CREATE POLICY "Anyone can view active queue entries" ON public.quick_match_queue  
   FOR SELECT USING (is_active = true);
   ```

5. **Build and Start**
   ```bash
   npm run build
   npm start
   
   # For development
   npm run dev
   ```

### Discord Bot Permissions

When inviting the bot to your server, ensure it has these permissions:
- `Send Messages`
- `Use Slash Commands` 
- `Manage Messages`
- `Read Message History`
- `Send Messages in Threads`
- `Use External Emojis`
- `Add Reactions`

**Bot Invite URL Template:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878221376&scope=bot%20applications.commands
```

## Commands

### Tournament Commands
- `/tournaments [status]` - View active tournaments with optional filtering
- `/signup <tournament>` - Sign up for a tournament (with autocomplete)
- `/profile [user]` - View tournament profile and statistics  
- `/leaderboard [limit]` - View server leaderboard
- `/update-profile [current_rank] [peak_rank] [riot_id]` - Update profile information

### Quick Match Commands  
- `/quickmatch queue` - Join the quick match queue
- `/quickmatch leave` - Leave the quick match queue
- `/quickmatch status` - View current queue status

## Integration with Web App

### Database Integration
- **Shared Database**: Uses the same Supabase database as your web application
- **User Sync**: Links Discord users with web app users via `discord_id`
- **Real-time Data**: Tournament signups, rankings, and statistics sync in real-time
- **Rank Scraping**: Utilizes the web app's rank scraper edge function

### Feature Parity
- **Ranking System**: Uses identical rank mapping and weight calculations
- **Team Balancing**: Implements the same adaptive weight balancing system
- **Tournament Logic**: Follows the same signup, check-in, and match progression rules
- **Visual Design**: Rank colors, emojis, and styling match the web application

## Architecture

### File Structure
```
discord-bot/
├── src/
│   ├── commands/          # Slash commands
│   ├── events/            # Discord event handlers  
│   ├── handlers/          # Command and event loaders
│   ├── utils/             # Utilities and helpers
│   │   ├── supabase.ts    # Database integration
│   │   ├── embeds.ts      # Discord embed creators
│   │   ├── cronJobs.ts    # Scheduled tasks
│   │   └── userRegistration.ts # User onboarding
│   └── index.ts           # Bot entry point
├── package.json
└── tsconfig.json
```

### Key Features
- **TypeScript**: Full type safety and IntelliSense  
- **Modular Design**: Easy to extend with new commands and features
- **Error Handling**: Comprehensive error handling and user feedback
- **Automated Tasks**: Background jobs for tournament reminders and cleanup
- **Scalable**: Designed to handle multiple servers and high user loads

## Deployment

### Production Deployment
1. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "tournament-bot"
   pm2 save
   pm2 startup
   ```

2. Or use Docker:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist ./dist
   CMD ["node", "dist/index.js"]
   ```

### Monitoring
- Bot logs all major events and errors
- Use `pm2 logs` or your container logs to monitor activity
- Set up alerts for bot downtime or errors

## Contributing

1. Follow the existing TypeScript and Discord.js patterns
2. Add proper error handling to all new commands  
3. Update this README when adding new features
4. Test thoroughly with your tournament database

## Troubleshooting

### Common Issues
- **Commands not appearing**: Check `DISCORD_GUILD_ID` is set for faster deployment
- **Database errors**: Verify `SUPABASE_SERVICE_ROLE_KEY` has proper permissions  
- **Registration failures**: Ensure `users` table has `discord_id` column
- **Rank scraping fails**: Check if `scrape-rank` edge function is deployed

### Debug Mode
Set `NODE_ENV=development` for verbose logging and error details.

---

## Support

For issues related to:
- **Discord Bot**: Check Discord.js documentation and bot permissions
- **Database**: Verify Supabase connection and table structure  
- **Web App Integration**: Ensure edge functions and database schema are up-to-date