export default async function handler(req, res) {
  // 只處理 POST 請求
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const { message } = req.body;
    
    // 檢查是否有文字訊息
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const userText = message.text.toLowerCase().trim();
    
    // 從 Google Sheets 讀取規則
    const rules = await loadRulesFromSheet();
    
    // 精確匹配
    if (rules[userText]) {
      // 找到匹配 - 發送帶 Copy 按鈕的訊息
      await sendMessageWithCopy(chatId, rules[userText]);
    } else {
      // 無法識別 - 發送普通訊息（無 Copy 按鈕）
      await sendSimpleMessage(chatId, '俺不懂你说啥😵‍💫');
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ ok: true });
  }
}

// 從 Google Sheets CSV 讀取規則
async function loadRulesFromSheet() {
  const SHEET_URL = process.env.SHEET_URL;
  
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    
    // 解析 CSV
    const lines = csvText.trim().split('\n');
    const rules = {};
    
    // 跳過第一行標題
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 處理 CSV 格式
      const parts = line.split(',');
      if (parts.length >= 2) {
        const keyword = parts[0].replace(/"/g, '').toLowerCase().trim();
        const reply = parts.slice(1).join(',').replace(/"/g, '').trim();
        if (keyword && reply) {
          rules[keyword] = reply;
        }
      }
    }
    
    console.log('Loaded rules:', rules);
    return rules;
  } catch (error) {
    console.error('Failed to load sheet:', error);
    return {};
  }
}

// 發送訊息（帶 Copy 按鈕）- 用於找到匹配的回覆
async function sendMessageWithCopy(chatId, text) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  // 將 \n 替換為真實換行符
  const formattedText = text.replace(/\\n/g, '\n');
  
  // 創建複製按鈕
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '📋 Copy',
          copy_text: {
            text: formattedText
          }
        }
      ]
    ]
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedText,
        reply_markup: replyMarkup
      })
    });
    
    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

// 發送普通訊息（無 Copy 按鈕）- 用於錯誤訊息
async function sendSimpleMessage(chatId, text) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
    
    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
