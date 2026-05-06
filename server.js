require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/compliment', async (req, res) => {
  const { name, role, trait, tone } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required.' });
  }

  const toneInstructions = {
    'warm-funny': 'Be warm, wholesome, and genuinely funny — light humour that makes someone smile and feel appreciated.',
    'heartfelt': 'Be sincere, touching, and deeply heartfelt — the kind of thing that would make someone tear up in a good way.',
    'roasty': 'Be playfully sarcastic and roast them gently — funny, slightly savage but ultimately affectionate. Make it the highlight of their day. Deadpan delivery, unexpected comparisons, absurdist humour.',
    'professional': 'Be polished and charming — appropriate for a card, a group chat shoutout, or a LinkedIn post, but still witty.',
  };

  const toneGuide = toneInstructions[tone] || toneInstructions['roasty'];
  const traitLine = trait ? ` They are known for: ${trait}.` : '';

  // Detect if this is a personal relationship vs a job role
  const personalRelationships = ['friend', 'best friend', 'mum', 'mom', 'dad', 'sister', 'brother', 'sibling', 'cousin', 'aunt', 'uncle', 'grandma', 'grandpa', 'partner', 'spouse', 'wife', 'husband', 'boyfriend', 'girlfriend', 'roommate', 'flatmate'];
  const isPersonal = personalRelationships.some(r => role.toLowerCase().includes(r));
  const context = isPersonal ? `your ${role}` : `a ${role}`;

  const prompt = `Write a witty compliment for ${name}, who is ${context}.${traitLine}

Tone: ${toneGuide}

Rules:
- 2 sentences MAX. Short, punchy, no fluff.
- One sharp observation + one killer closing line.
- Specific to who they are or what they do — no generic praise.
- Wit over warmth. Clever over cheesy.
- No hashtags, emojis, or bullet points — just crisp prose.
- Output ONLY the compliment, nothing else.`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: 'You are a sharp, witty compliment generator for all kinds of people — colleagues, friends, family, anyone. You write short, punchy, memorable compliments that are funny and sarcastic but leave people feeling genuinely good about themselves and their day.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Grok API error:', err);
      return res.status(502).json({ error: 'Grok API error. Check your API key.' });
    }

    const data = await response.json();
    const compliment = data.choices?.[0]?.message?.content?.trim();

    if (!compliment) {
      return res.status(502).json({ error: 'No compliment returned from API.' });
    }

    res.json({ compliment });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Compliment Generator running at http://localhost:${PORT}`);
});
