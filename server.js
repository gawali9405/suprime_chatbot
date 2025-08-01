const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_ANON_KEY
);

// Telegram Bot setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// Set webhook URL (replace with your actual domain in production)
const WEBHOOK_URL = `https://your-domain.com/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;

// For development, we'll use polling instead of webhook
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  bot.startPolling();
  console.log('Bot started with polling for development');
} else {
  bot.setWebHook(WEBHOOK_URL);
  console.log(`Webhook set to: ${WEBHOOK_URL}`);
}

// Initialize Supabase tables
async function initializeTables() {
  console.log('Checking Supabase connection...');
  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' });
    if (error) {
      console.log('Tables may not exist. Please create them in Supabase dashboard.');
      console.log('Required tables: users, messages');
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.error('Supabase connection error:', err);
  }
}

// Bot message handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'Unknown';
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';

  // Store user info in Supabase
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        chat_id: chatId,
        username: username,
        first_name: firstName,
        last_name: lastName,
        last_interaction: new Date().toISOString()
      },
      {
        onConflict: 'user_id'   
      }
    );

    if (error) {
      console.error('Error storing user:', error);
    }
  } catch (err) {
    console.error('Supabase error:', err);
  }

  const welcomeMessage = `🎉 Welcome ${firstName}! 

I'm your enquiry chat bot. I'm here to help you with any questions or feedback you might have.

You can:
📝 Ask me any question
💬 Share your feedback
📱 Contact our support team

How can I assist you today?`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📱 Share Phone Number', callback_data: 'share_phone' },
          { text: '❓ Ask a Question', callback_data: 'ask_question' }
        ],
        [
          { text: '💬 General Inquiry', callback_data: 'general_inquiry' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, welcomeMessage, options);
});

// Handle callback queries (button presses)
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = message.chat.id;

  let responseMessage = '';

  switch (data) {
    case 'share_phone':
      responseMessage = '📱 Please share your phone number using the button below, or simply type it in the chat.';
      bot.sendMessage(chatId, responseMessage, {
        reply_markup: {
          keyboard: [
            [{ text: 'Share Phone Number', request_contact: true }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
      break;
    case 'ask_question':
      responseMessage = '❓ Please type your question and I\'ll do my best to help you!';
      bot.sendMessage(chatId, responseMessage);
      break;
    case 'general_inquiry':
      responseMessage = '💬 Please share your inquiry or feedback. I\'m here to listen!';
      bot.sendMessage(chatId, responseMessage);
      break;
  }

  // Answer the callback query to remove loading state
  bot.answerCallbackQuery(callbackQuery.id);
});

// Handle contact sharing
bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;
  const userId = msg.from.id;
  const username = msg.from.username || 'Unknown';
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';

  // Store/update user info in Supabase first
  try {
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        chat_id: chatId,
        username: username,
        first_name: firstName,
        last_name: lastName,
        last_interaction: new Date().toISOString()
      },
      {
        onConflict: 'user_id'   
      }
    );

    if (userError) {
      console.error('Error storing user:', userError);
    }
  } catch (err) {
    console.error('Supabase user error:', err);
  }

  // Store contact info in Supabase
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: msg.from.id,
        chat_id: chatId,
        message_type: 'contact',
        content: `Phone: ${contact.phone_number}`,
        metadata: JSON.stringify({
          first_name: contact.first_name,
          last_name: contact.last_name,
          user_id: contact.user_id
        }),
        timestamp: new Date().toISOString()
      }
    );

    if (error) {
      console.error('Error storing contact:', error);
    }
  } catch (err) {
    console.error('Supabase error:', err);
  }

  bot.sendMessage(chatId, '📱 Thank you for sharing your contact information! Our team will reach out to you soon.');
});

// Handle all text messages
bot.on('message', async (msg) => {
  // Skip if it's a command or contact
  if (msg.text && msg.text.startsWith('/') || msg.contact) {
    return;
  }

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const messageText = msg.text || '';
  const username = msg.from.username || 'Unknown';
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';

  // Store/update user info in Supabase first
  try {
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        chat_id: chatId,
        username: username,
        first_name: firstName,
        last_name: lastName,
        last_interaction: new Date().toISOString()
      });

    if (userError) {
      console.error('Error storing user:', userError);
    }
  } catch (err) {
    console.error('Supabase user error:', err);
  }

  // Store message in Supabase
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        chat_id: chatId,
        message_type: 'text',
        content: messageText,
        metadata: JSON.stringify({
          username: username,
          first_name: msg.from.first_name,
          last_name: msg.from.last_name,
          message_id: msg.message_id
        }),
        timestamp: new Date().toISOString()
      },
      {
        onConflict: 'user_id'
      }
    );

    if (error) {
      console.error('Error storing message:', error);
    } else {
      console.log('Message stored successfully in Supabase');
    }
  } catch (err) {
    console.error('Supabase error:', err);
  }

  // Auto-reply to user
  const autoReply = `✅ Thank you for your message! 

Your inquiry has been received and our team will review it shortly. We appreciate your patience and will get back to you as soon as possible.

If you have any urgent matters, please don't hesitate to send another message.`;

  bot.sendMessage(chatId, autoReply);

  // Notify admin (optional)
  if (process.env.ADMIN_TELEGRAM_ID) {
    const adminNotification = `🔔 New message received:

👤 From: ${msg.from.first_name} ${msg.from.last_name} (@${username})
💬 Message: ${messageText}
🕒 Time: ${new Date().toLocaleString()}
🆔 Chat ID: ${chatId}`;

    bot.sendMessage(process.env.ADMIN_TELEGRAM_ID, adminNotification);
  }
});

// Webhook endpoint for production
app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// QR Code generation endpoint
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { text, channelUsername } = req.body;
    
    // Default to provided channel or use custom text
    const qrText = text || `https://t.me/${channelUsername || 'enquiry_chat_bot'}`;
    
    const qrCodeDataURL = await QRCode.toDataURL(qrText, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({ 
      success: true, 
      qrCode: qrCodeDataURL,
      text: qrText
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate QR code' 
    });
  }
});

// API endpoint to get all messages (for admin)
app.get('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ success: true, messages: data });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// API endpoint to get users with their latest messages
app.get('/api/users', async (req, res) => {
  try {
    // Get users with their latest message
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('last_interaction', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Get latest message for each user
    const usersWithMessages = await Promise.all(
      users.map(async (user) => {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('content, timestamp, sender_type')
          .eq('user_id', user.user_id)
          .order('timestamp', { ascending: false })
          .limit(1);

        return {
          ...user,
          latest_message: messages && messages.length > 0 ? {
            message_text: messages[0].content,
            created_at: messages[0].timestamp,
            sender_type: messages[0].sender_type
          } : null
        };
      })
    );

    res.json({ success: true, users: usersWithMessages });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// API endpoint to send message to a specific user
app.post('/api/send-message', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and message are required' 
      });
    }

    // Get user's chat_id from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('chat_id, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Send message via Telegram bot
    await bot.sendMessage(userData.chat_id, message);

    // Store the admin message in the messages table
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        chat_id: userData.chat_id,
        message_type: 'text',
        content: message,
        sender_type: 'admin', // Important to indicate it's from admin
        metadata: JSON.stringify({
          from: 'admin',
          sent_by: 'dashboard'
        }),
        timestamp: new Date().toISOString()
      });

    if (messageError) {
      console.error('Error storing admin message:', messageError);
    }

    res.json({ 
      success: true, 
      message: `Message sent to ${userData.first_name} ${userData.last_name}` 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message' 
    });
  }
});


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    bot: process.env.BOT_USERNAME 
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Telegram Bot: @${process.env.BOT_USERNAME}`);
  console.log(`📊 Supabase Project: ${process.env.SUPABASE_PROJECT_URL}`);
  console.log(`🌐 QR Code Generator: http://localhost:${PORT}`);
  
  // Initialize tables
  await initializeTables();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
