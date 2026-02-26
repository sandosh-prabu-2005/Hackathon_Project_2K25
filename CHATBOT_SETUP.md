# 🤖 DISA-Buddy Chatbot Integration Guide

## Overview
You now have a fully integrated floating chatbot at the bottom-right of the Home page that connects to a Node.js/Express server with Google Gemini AI.

## What Was Added

### 1. **ChatBot Component** (`src/components/ChatBot.tsx`)
- Floating toggle button at bottom-right corner
- Full-featured chat window with message history
- Real-time communication with the server
- Loading indicators and error handling
- Responsive design (works on mobile too)

### 2. **Chat API Client** (`src/api/client.jsx`)
- `chatApi.sendMessage()` - Sends user message to server
- `chatApi.health()` - Checks if server is running
- Automatic error handling

### 3. **Styles** (`src/styles/ChatBot.css`)
- Beautiful gradient UI matching Aithon theme
- Smooth animations and transitions
- Mobile-responsive design
- Loading animations

### 4. **Server Integration** (`server/index.js`)
- Express server on port 4000
- Connects to Google Gemini API
- `/api/chat` endpoint for messages
- `/health` endpoint for status checks
- Multilingual disaster safety assistance

### 5. **Home Page Update** (`src/pages/Home.tsx`)
- ChatBot component imported and rendered
- Appears at bottom-right of the page

## Quick Start

### Step 1: Get Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com)
2. Click "Get API Key" → "Create API Key in new project"
3. Copy your API key

### Step 2: Configure Server
```bash
cd server
npm install
```

Create `.env` file in the `server/` directory:
```env
GEMINI_API_KEY=your_api_key_here
```

### Step 3: Start the Server
```bash
npm start
```
You should see: `Server is running on port 4000`

### Step 4: Run the React App (in another terminal)
```bash
# From project root
npm run dev
```

### Step 5: Test It Out
1. Open http://localhost:5173 (or your dev server URL)
2. Go to Home page
3. Click the chatbot button at bottom-right 💬
4. Ask about disaster safety!

## Features

✅ **Ask About:**
- Earthquakes, floods, cyclones, landslides
- Disaster preparedness and safety
- Emergency recovery guidance
- Official emergency numbers in India

✅ **Multilingual:**
- English, Hindi, Tamil, Telugu, Kannada, etc.
- Responds in the same language you ask

✅ **Smart Fallbacks:**
- Mock responses if API quota exceeded
- Graceful error handling
- Connection error messages

## File Structure

```
Project/
├── server/
│   ├── index.js                 # Express server with Gemini integration
│   ├── package.json
│   ├── .env                     # Your API key goes here
│   └── README.md                # Server-specific docs
│
├── src/
│   ├── components/
│   │   └── ChatBot.tsx          # Main chatbot component
│   ├── api/
│   │   └── client.jsx           # Chat API methods
│   ├── styles/
│   │   └── ChatBot.css          # Chatbot styling
│   └── pages/
│       └── Home.tsx             # Updated with ChatBot import
│
└── README.md                     # This file
```

## API Endpoints

### Chat Message
```bash
POST http://localhost:4000/api/chat
Content-Type: application/json

{
  "message": "How do I prepare for a cyclone?"
}

Response: "Text response from DISA-Buddy..."
```

### Health Check
```bash
GET http://localhost:4000/health

Response:
{
  "ok": true,
  "version": "1.0",
  "hasKey": true
}
```

## Environment Variables

**Server `.env` file:**
```env
GEMINI_API_KEY=your_google_gemini_api_key
```

**Frontend `.env` (already configured):**
- Uses `localhost:4000` by default
- Change by modifying the fetch URL in `ChatBot.tsx`

## Customization

### Change Chatbot Appearance
Edit `src/styles/ChatBot.css`:
- Colors: Modify gradient colors in `.chatbot-toggle`, `.chatbot-header`
- Size: Adjust width/height in `.chatbot-container`
- Position: Modify `bottom: 30px; right: 30px;` in `.chatbot-toggle`

### Change Chatbot Language/Behavior
Edit the `MASTER_PROMPT` in `server/index.js` to customize:
- Bot personality
- Supported topics
- Response style
- Emergency numbers

### Change Server Port
In `server/index.js`:
```javascript
app.listen(4000, () => {  // Change 4000 to your port
  console.log('Server is running on port 4000');
});
```

Then update `ChatBot.tsx`:
```typescript
const response = await fetch('http://localhost:YOUR_PORT/api/chat', {
```

## Troubleshooting

### ❌ "Connection error" when chatting
- Check server is running on port 4000
- Verify no firewall blocking port 4000
- Check browser console for detailed errors

### ❌ Empty responses from bot
- Verify `.env` has correct Gemini API key
- Check server terminal for error messages
- Try asking about specific disaster topics

### ❌ "API quota exceeded"
- Check your Gemini API quota at [Google AI Studio](https://aistudio.google.com)
- Free tier has rate limits
- Server automatically uses mock responses as fallback

### ❌ Chatbot doesn't appear
- Clear browser cache
- Check if ChatBot component is imported in Home.tsx
- Open browser console for any errors

### ❌ Server won't start
```bash
# Error: Port 4000 already in use?
# On Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -i :4000
kill -9 <PID>
```

## Running in Production

### Build Frontend
```bash
npm run build
```

### Production Server
```bash
# Install dependencies
cd server
npm install --production

# Set environment variable
export GEMINI_API_KEY=your_key  # or set in .env

# Start server
npm start
```

### Deploy with Docker (Optional)
Create `Dockerfile` in server/`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY index.js .
EXPOSE 4000
CMD ["node", "index.js"]
```

## API Keys & Security

### Important ⚠️
- **Never** commit `.env` file to git
- Add `.env` to `.gitignore`
- Rotate API keys regularly
- Use environment variables in production
- Keep API key secret

### For Multiple Environments

**Development (.env.local):**
```env
GEMINI_API_KEY=dev_key_here
```

**Production (.env.production):**
```env
GEMINI_API_KEY=prod_key_here
```

## Performance Tips

1. **Cache responses** - Store frequent Q&As
2. **Rate limit** - Add rate limiting middleware
3. **Message history** - Clear old messages in state
4. **Server clustering** - Use PM2 for multiple workers

## Next Steps

1. ✅ Test chatbot functionality
2. ✅ Customize prompts for your use case
3. ✅ Add authentication if needed
4. ✅ Deploy server to cloud (Render, Railway, Heroku, etc.)
5. ✅ Monitor API usage and costs
6. ✅ Add chat history storage (database)

## Support

For issues:
1. Check terminal logs (both npm dev and server)
2. Open browser DevTools (F12) → Console tab
3. Check Google Gemini API status
4. Review server README.md for detailed docs

## License

Part of the Aithon Disaster Intelligence Platform.

---

**Need help?** Check the server's README.md for server-specific documentation!
