const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Meta Webhook 驗證 (GET)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "BE_WHATSAPP_TOKEN"; // 設為您自己的密鑰
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// 2. 接收 WhatsApp 訊息並呼叫 Gemini 回覆 (POST)
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  
  if (message && message.type === 'text') {
    console.log('收到家長訊息：', message.text.body);
    // 這裡可以呼叫 Gemini API 處理回覆，並透過 Meta API 傳回 WhatsApp
  }
});

app.listen(PORT, () => console.log(`🚀 WhatsApp AI 伺服器運行中：http://localhost:${PORT}`));
