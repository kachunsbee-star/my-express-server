const express = require('express');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. 憑證設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ""; 
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1253729117822756"; 
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "BE_WHATSAPP_TOKEN"; 

// 初始化 Google GenAI SDK（支援 Google Cloud 的 AQ. 格式金鑰）
const ai = new GoogleGenAI({ 
  apiKey: GEMINI_API_KEY.trim(),
  vertexAI: true,
  location: 'us-central1'
});

// 2. Meta Webhook 驗證 (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook 驗證成功！');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 3. 接收 WhatsApp 訊息並呼叫 Gemini SDK (POST)
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (message && message.type === 'text') {
      const parentPhone = message.from;
      const parentQuery = message.text.body;

      console.log(`📩 收到家長 (${parentPhone}) 訊息：${parentQuery}`);

      // 提示詞與 BE 學習中心知識庫
      const promptText = `
【角色與防錯原則】
你是一位來自「BE (Bloom Education Science) 鑽石山荷里活廣場店」的專業 WhatsApp 客服助手。
核心守則：你必須嚴格根據【核心課程知識庫】內容回答。若家長查詢的問題不在資料範圍內，【切勿猜測或捏造答案】，請統一回覆：「有關呢個問題，我哋負責嘅同事稍後會親自聯絡同回覆您，感謝您嘅耐性等待！😊」

【對話流程】
1. 親切詢問學生姓名、學校、年級、有無 STEM/編程經驗。
2. 根據年級與經驗精準推薦 1-2 個 BE 課程。
3. 主動詢問方便上課的日子與時間。
4. 家長提供時間後回覆：「多謝家長嘅回覆！我哋負責嘅同事稍後會親自同您聯繫並確認時間。祝您有愉快嘅一天！😊」

【中心基本資料】
• 地址：九龍鑽石山荷里活廣場地下 G105-106 (中國銀行旁)
• 開放時間：早上 10:00 至 下午 7:00 | 電話 / WhatsApp：98656917
• 師生比例：最多 1 對 4 (1:4) 小班教學 | 提供預約免費評估。

【核心課程資料】
1. LEGO 編程課程 (3-11歲)：Ozobot/Code A Maze (3-5歲)；LEGO SPIKE Essential/Prime (5-11歲)。學費 $1,350/月（一期24堂平均 $800/月）。完成指定課程送 $3,900 LEGO 教材。
2. STEM 科學課程 (3-11歲, K1-P6)：配合 EDB 指引，12 大主題，POE 探究進路，提供實驗袍。學費 $1,250/月（一期24堂平均 $800/月）。
3. 階段性評估：每 4 個月進深任務評估，頒發證書。
4. 課後功課輔導班 (P1-S3)：全科功課、默書溫習、測考預備 ($2,550/月)。
5. BE STEM 英語課程 (3-11歲)：National Geographic 教材，銜接 Cambridge YLE。

【格式】親切廣東話、列點、Emoji、字數控制在 300 字內。

---
【家長最新訊息】：${parentQuery}
      `;

      // 使用最新 Gemini 2.5 Flash 模型
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
      });

      const replyText = response.text;
      console.log(`🤖 AI 生成回覆：\n${replyText}`);

      // 發送回覆至家長 WhatsApp
      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
        await axios.post(
          `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: parentPhone,
            text: { body: replyText },
          },
          { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
        );
        console.log('🚀 訊息已成功發送至家長 WhatsApp！');
      }
    }
  } catch (err) {
    console.error('❌ 處理訊息時出錯：', err.response?.data || err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BE WhatsApp AI 伺服器順利啟動！埠號：${PORT}`);
});
