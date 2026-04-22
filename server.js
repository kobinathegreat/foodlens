const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API proxy route ──
app.post('/analyze', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const prompt = `You are a food expert and nutritionist. Analyze this food image and respond ONLY with valid JSON (no markdown, no extra text):
{
  "name": "Food name",
  "emoji": "relevant emoji",
  "description": "1-2 sentence description",
  "recipe": {
    "ingredients": ["ingredient with amount"],
    "steps": ["step description"]
  },
  "buy": {
    "stores": [
      {"name": "Store","icon": "emoji","note": "short tip","bg": "#hexcolor"}
    ],
    "tips": "2-3 sentences of shopping advice"
  },
  "nutrition": {
    "calories": "number only e.g. 250",
    "protein": "number only e.g. 12",
    "carbs": "number only e.g. 30",
    "fat": "number only e.g. 8",
    "fiber": "number only e.g. 5",
    "vitamins": "key vitamin name"
  },
  "benefits": [
    {"icon": "emoji","title": "title","desc": "short description"}
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const food = JSON.parse(text);
    res.json({ success: true, food });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FoodLens running on port ${PORT}`));
