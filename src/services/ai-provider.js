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
  const modelName = model || DEFAULT_MODELS.gemini;
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
    throw new Error(`Google Gemini API Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textOutput) {
    throw new Error('Gemini API returned an empty response or was blocked by safety filters.');
  }

  return cleanJsonText(textOutput);
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
    default:
      throw new Error(`Unsupported AI provider: ${provider}. Supported: gemini, groq, openrouter`);
  }

  try {
    const parsedData = JSON.parse(rawJson);
    return parsedData;
  } catch (err) {
    console.error('Failed to parse AI response as JSON. Raw output was:', rawJson);
    throw new Error(`Failed to parse AI assessment result as JSON: ${err.message}`);
  }
}
