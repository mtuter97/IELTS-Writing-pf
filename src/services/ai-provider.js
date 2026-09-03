import { DEFAULT_MODELS } from '../config/constants.js';

/**
 * Robust JSON text cleaner to handle cases where LLM includes markdown backticks or commentary
 */
export function cleanJsonText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  
  let cleaned = rawText.trim();
  
  // Remove markdown code fences ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  
  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

/**
 * Google AI Studio (Gemini REST API)
 */
async function callGemini({ apiKey, model, systemPrompt, userPrompt }) {
  const candidateModels = [model, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].filter(Boolean);
  const uniqueModels = [...new Set(candidateModels)];

  let lastError = null;
  for (const modelName of uniqueModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\n---\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2, // low temperature for consistent, strict rubric scoring
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = new Error(`Google Gemini API Error (${response.status}) on ${modelName}: ${errorBody}`);
        continue;
      }

      const data = await response.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textOutput) {
        return cleanJsonText(textOutput);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Gemini API failed on all candidate models.');
}

/**
 * Groq Cloud (OpenAI-compatible endpoint)
 */
async function callGroq({ apiKey, model, systemPrompt, userPrompt }) {
  const modelName = model || DEFAULT_MODELS.groq;
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textOutput = data?.choices?.[0]?.message?.content;

  if (!textOutput) {
    throw new Error('Groq API returned an empty completion.');
  }

  return cleanJsonText(textOutput);
}

/**
 * OpenRouter (OpenAI-compatible endpoint)
 */
async function callOpenRouter({ apiKey, model, systemPrompt, userPrompt }) {
  const modelName = model || DEFAULT_MODELS.openrouter;
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const payload = {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ielts-feedback.local',
      'X-Title': 'IELTS Writing Feedback Tool'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textOutput = data?.choices?.[0]?.message?.content;

  if (!textOutput) {
    throw new Error('OpenRouter API returned an empty completion.');
  }

  return cleanJsonText(textOutput);
}

/**
 * You.com Platform API (https://you.com/platform)
 */
async function callYouCom({ apiKey, systemPrompt, userPrompt }) {
  const combinedPrompt = `${systemPrompt}\n\nIMPORTANT: You must return ONLY a valid JSON object strictly matching the schema with NO markdown code blocks or extra text.\n\n${userPrompt}`;

  const endpoints = [
    {
      url: 'https://api.you.com/v1/answer',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: { input: combinedPrompt }
    },
    {
      url: 'https://api.you.com/v1/research',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: { input: combinedPrompt, research_effort: 'standard' }
    },
    {
      url: 'https://api.you.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: {
        model: 'you-smart',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }
    }
  ];

  let lastError = null;
  for (const ep of endpoints) {
    try {
      const response = await fetch(ep.url, {
        method: 'POST',
        headers: ep.headers,
        body: JSON.stringify(ep.body)
      });

      if (response.ok) {
        const data = await response.json();
        const textOutput = data?.answer || data?.output || data?.response || data?.choices?.[0]?.message?.content || (typeof data === 'string' ? data : null);
        if (textOutput) {
          return cleanJsonText(textOutput);
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`You.com (${ep.url}) error ${response.status}: ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to obtain response from You.com Platform API.');
}

/**
 * Unified Evaluator Dispatcher
 */
export async function evaluateWithAI({ provider, apiKey, model, systemPrompt, userPrompt }) {
  if (!apiKey) {
    throw new Error(`API key for provider '${provider}' is missing. Please set it in Settings or .env`);
  }

  let rawJson = '';
  switch (provider.toLowerCase()) {
    case 'gemini':
    case 'google':
      rawJson = await callGemini({ apiKey, model, systemPrompt, userPrompt });
      break;
    case 'groq':
      rawJson = await callGroq({ apiKey, model, systemPrompt, userPrompt });
      break;
    case 'openrouter':
      rawJson = await callOpenRouter({ apiKey, model, systemPrompt, userPrompt });
      break;
    case 'you':
    case 'youcom':
      rawJson = await callYouCom({ apiKey, systemPrompt, userPrompt });
      break;
    default:
      throw new Error(`Unsupported AI provider: ${provider}. Supported: gemini, groq, openrouter, you`);
  }

  try {
    const parsedData = JSON.parse(rawJson);
    return parsedData;
  } catch (err) {
    console.error('Failed to parse AI response as JSON. Raw output was:', rawJson);
    throw new Error(`Failed to parse AI assessment result as JSON: ${err.message}`);
  }
}
