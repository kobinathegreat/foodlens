export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    res.status(200).json({ success: true, food });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
}
