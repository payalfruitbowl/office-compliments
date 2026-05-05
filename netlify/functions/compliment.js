exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, role, trait, tone } = body;

  if (!name || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and role are required.' }) };
  }

  const toneInstructions = {
    'warm-funny': 'Be warm, wholesome, and genuinely funny — light humour that makes someone smile and feel appreciated.',
    'heartfelt': 'Be sincere, touching, and deeply heartfelt — the kind of thing that would make someone tear up in a good way.',
    'roasty': 'Be playfully sarcastic and roast them gently — funny, slightly savage but ultimately affectionate. Make it the highlight of their day. Deadpan delivery, unexpected comparisons, absurdist humour.',
    'professional': 'Be polished and professional — appropriate for a work Slack or LinkedIn shoutout, but still charming.',
  };

  const toneGuide = toneInstructions[tone] || toneInstructions['roasty'];
  const traitLine = trait ? ` They are known for being: ${trait}.` : '';

  const prompt = `Write a witty office compliment for ${name}, a ${role}.${traitLine}

Tone: ${toneGuide}

Rules:
- 2 sentences MAX. Short, punchy, no fluff.
- One sharp observation + one killer closing line.
- Specific to their role — no generic praise.
- Wit over warmth. Clever over cheesy.
- No hashtags, emojis, or bullet points — just crisp prose.
- Output ONLY the compliment, nothing else.`;

  // Detect which API to use based on key prefix
  const apiKey = process.env.GROK_API_KEY || '';

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GROK_API_KEY environment variable is not set in Netlify.' }) };
  }

  const isGroq = apiKey.startsWith('gsk_');

  const apiUrl = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions';

  const model = isGroq ? 'llama-3.3-70b-versatile' : 'grok-3';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a sharp, witty office compliment generator. You write short, punchy, memorable compliments that are funny and sarcastic but leave people feeling genuinely good about themselves and their day.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('API error:', err);
      return { statusCode: 502, body: JSON.stringify({ error: 'AI API error. Check your API key.' }) };
    }

    const data = await response.json();
    const compliment = data.choices?.[0]?.message?.content?.trim();

    if (!compliment) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No compliment returned from API.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compliment }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
