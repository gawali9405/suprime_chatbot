# Telegram Bot with Supabase Integration

A complete Node.js Telegram bot that implements a QR code → Telegram channel → bot chat → message storage flow using Supabase as the database.

## 🚀 Features

- **QR Code Generation**: Web interface for generating Telegram channel QR codes
- **Telegram Bot**: Full-featured bot with inline keyboards and message handling
- **Supabase Integration**: Stores all user messages and metadata in Supabase
- **Auto-replies**: Automatic responses to user messages
- **Admin Notifications**: Real-time notifications to admin when users send messages
- **Contact Sharing**: Support for phone number collection
- **Webhook Support**: Production-ready webhook endpoint

## 📋 User Flow

1. **User Scans QR Code** - QR code contains link to Telegram channel
2. **Redirects to Telegram Channel** - User joins the channel
3. **Bot Invitation** - Channel shows link to start chat with @enquiry_chat_bot
4. **User Starts Chat** - User taps "Start" and receives welcome message
5. **User Sends Message** - User types query/feedback
6. **Webhook Processing** - Message received and processed by Node.js server
7. **Storage & Reply** - Message stored in Supabase + auto-reply sent
8. **Admin Panel** - Admin views messages in Supabase dashboard

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

The `.env` file is already configured with your credentials:
 

### 3. Supabase Database Setup

1. Go to your Supabase project: https://maqvnzockazbnrovcysm.supabase.co
2. Navigate to SQL Editor
3. Run the SQL commands from `supabase-setup.sql` to create the required tables:
   - `users` table - stores user information
   - `messages` table - stores all user messages

### 4. Start the Application

```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The server will start on http://localhost:3000

## 📱 Bot Commands & Features

### Available Commands
- `/start` - Initialize bot and show welcome message with options

### Interactive Features
- **📱 Share Phone Number** - Collects user contact information
- **❓ Ask a Question** - Prompts user to ask questions
- **💬 General Inquiry** - General feedback collection

### Message Types Supported
- Text messages
- Contact sharing (phone numbers)
- Callback queries (button presses)

## 🌐 API Endpoints

### QR Code Generation
```
POST /api/generate-qr
Body: {
  "channelUsername": "YourChannel",
  "text": "https://t.me/YourChannel"
}
```

### Get Messages (Admin)
```
GET /api/messages
Response: { "success": true, "messages": [...] }
```

### Get Users (Admin)
```
GET /api/users
Response: { "success": true, "users": [...] }
```

### Health Check
```
GET /health
Response: { "status": "OK", "timestamp": "...", "bot": "enquiry_chat_bot" }
```

## 📊 Database Schema

### Users Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (BIGINT) - Telegram user ID
- chat_id (BIGINT) - Telegram chat ID
- username (VARCHAR) - Telegram username
- first_name (VARCHAR) - User's first name
- last_name (VARCHAR) - User's last name
- last_interaction (TIMESTAMP) - Last activity time
- created_at (TIMESTAMP) - Account creation time
```

### Messages Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (BIGINT) - Telegram user ID
- chat_id (BIGINT) - Telegram chat ID
- message_type (VARCHAR) - 'text', 'contact', etc.
- content (TEXT) - Message content
- metadata (JSONB) - Additional message data
- timestamp (TIMESTAMP) - Message time
- created_at (TIMESTAMP) - Record creation time
```

## 🔧 Development vs Production

### Development Mode
- Uses polling to receive messages
- Runs on localhost:3000
- Detailed console logging

### Production Mode
- Uses webhooks for message delivery
- Set `NODE_ENV=production`
- Update webhook URL in server.js

## 📱 Telegram Channel Setup

1. Create a Telegram channel
2. Add a pinned message or description with:
   ```
   📩 Need help? Start a chat with our bot: @enquiry_chat_bot
   
   Click here to get started: https://t.me/enquiry_chat_bot
   ```

## 🎯 Admin Features

### Supabase Dashboard Access
- View all user messages in real-time
- Filter by user, chat, or message type
- Export data for analysis
- Monitor user engagement

### Telegram Admin Notifications
- Real-time message alerts sent to admin Telegram account
- Includes user info and message content
- Helps with quick response to urgent inquiries

## 🔒 Security Features

- Row Level Security (RLS) enabled on Supabase tables
- Environment variables for sensitive data
- Input validation and error handling
- Rate limiting considerations for production

## 🚀 Deployment

### For Production Deployment:

1. **Update Webhook URL** in `server.js`:
   ```javascript
   const WEBHOOK_URL = `https://yourdomain.com/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
   ```

2. **Set Environment Variables**:
   ```bash
   NODE_ENV=production
   ```

3. **Deploy to your preferred platform** (Heroku, Vercel, Railway, etc.)

4. **Set Telegram Webhook**:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://yourdomain.com/webhook/<YOUR_BOT_TOKEN>"}'
   ```

## 📞 Support

- **Bot Username**: @enquiry_chat_bot
- **Admin Telegram ID**: 1327379599
- **Supabase Project**: maqvnzockazbnrovcysm.supabase.co

## 🎉 Getting Started

1. Run `npm install`
2. Set up Supabase tables using `supabase-setup.sql`
3. Start the server with `npm run dev`
4. Visit http://localhost:3000 to generate QR codes
5. Test the bot by messaging @enquiry_chat_bot
6. Check Supabase dashboard for stored messages

Your Telegram bot is now ready to handle user inquiries and store them in Supabase! 🚀
