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
  const candidateModels = ['gemini-3.6-flash', model, 'gemini-2.5-flash'].filter(Boolean);
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
  const candidateModels = [model, 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'allam-2-7b'].filter(Boolean);
  const uniqueModels = [...new Set(candidateModels)];
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  let lastError = null;
  for (const modelName of uniqueModels) {
    try {
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
        lastError = new Error(`Groq API Error (${response.status}) on ${modelName}: ${errorBody}`);
        continue;
      }

      const data = await response.json();
      const textOutput = data?.choices?.[0]?.message?.content;

      if (textOutput) {
        return cleanJsonText(textOutput);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Groq API returned an empty completion on all models.');
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
  const combinedPrompt = `${systemPrompt}\n\nCRITICAL INSTRUCTION: You must evaluate this text and return ONLY a valid JSON object strictly matching the schema with NO extra text or markdown formatting.\n\n${userPrompt}`;

  const endpoints = [
    {
      url: 'https://api.you.com/v1/research',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: { input: combinedPrompt }
    },
    {
      url: 'https://api.you.com/v1/answer',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: { query: combinedPrompt }
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
        let rawText = '';
        if (typeof data?.output?.content === 'string') {
          rawText = data.output.content;
        } else if (typeof data?.output === 'string') {
          rawText = data.output;
        } else if (typeof data?.answer === 'string') {
          rawText = data.answer;
        } else if (typeof data?.response === 'string') {
          rawText = data.response;
        } else if (typeof data?.choices?.[0]?.message?.content === 'string') {
          rawText = data.choices[0].message.content;
        }

        if (rawText) {
          return cleanJsonText(rawText);
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
 * Unified Evaluator Dispatcher with Multi-Provider Auto-Fallback
 */
export async function evaluateWithAI({ provider, apiKey, model, systemPrompt, userPrompt, allSettings = {} }) {
  async function runProvider(prov, key, mdl) {
    switch (prov.toLowerCase()) {
      case 'you':
      case 'youcom':
        return await callYouCom({ apiKey: key, systemPrompt, userPrompt });
      case 'gemini':
      case 'google':
        return await callGemini({ apiKey: key, model: mdl || 'gemini-2.5-flash', systemPrompt, userPrompt });
      case 'groq':
        return await callGroq({ apiKey: key, model: mdl || 'llama-3.3-70b-versatile', systemPrompt, userPrompt });
      case 'openrouter':
        return await callOpenRouter({ apiKey: key, model: mdl || 'google/gemini-2.5-flash', systemPrompt, userPrompt });
      default:
        throw new Error(`Unsupported AI provider: ${prov}`);
    }
  }

  // Priority queue: Requested provider first, then other available providers as fallbacks
  const providersToTry = [];
  const primaryProv = provider || 'you';
  providersToTry.push({
    provider: primaryProv,
    apiKey: apiKey || allSettings.you_api_key || allSettings.gemini_api_key,
    model: model
  });

  // Register fallbacks
  if (primaryProv !== 'you' && allSettings.you_api_key) {
    providersToTry.push({ provider: 'you', apiKey: allSettings.you_api_key, model: allSettings.you_model });
  }
  if (primaryProv !== 'gemini' && allSettings.gemini_api_key) {
    providersToTry.push({ provider: 'gemini', apiKey: allSettings.gemini_api_key, model: 'gemini-2.5-flash' });
  }
  if (primaryProv !== 'groq' && allSettings.groq_api_key) {
    providersToTry.push({ provider: 'groq', apiKey: allSettings.groq_api_key, model: allSettings.groq_model });
  }
  if (primaryProv !== 'openrouter' && allSettings.openrouter_api_key) {
    providersToTry.push({ provider: 'openrouter', apiKey: allSettings.openrouter_api_key, model: allSettings.openrouter_model });
  }

  let lastError = null;
  for (const candidate of providersToTry) {
    if (!candidate.apiKey) continue;
    try {
      const rawJson = await runProvider(candidate.provider, candidate.apiKey, candidate.model);
      const parsedData = JSON.parse(rawJson);
      if (parsedData && (parsedData.scores || parsedData.detailed_mistakes)) {
        return parsedData;
      }
    } catch (err) {
      console.warn(`[AI Engine] Provider '${candidate.provider}' encountered issue: ${err.message}. Trying next available provider...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All AI providers failed to evaluate. Please verify your API keys in settings.');
}
