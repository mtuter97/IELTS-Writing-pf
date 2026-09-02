export const IELTS_TASK_TYPES = {
  TASK_1_ACADEMIC: 'task_1_academic',
  TASK_1_GENERAL: 'task_1_general',
  TASK_2: 'task_2'
};

export const MIN_WORD_COUNTS = {
  [IELTS_TASK_TYPES.TASK_1_ACADEMIC]: 150,
  [IELTS_TASK_TYPES.TASK_1_GENERAL]: 150,
  [IELTS_TASK_TYPES.TASK_2]: 250
};

export const RECOMMENDED_TIMES_MINUTES = {
  [IELTS_TASK_TYPES.TASK_1_ACADEMIC]: 20,
  [IELTS_TASK_TYPES.TASK_1_GENERAL]: 20,
  [IELTS_TASK_TYPES.TASK_2]: 40
};

export const IELTS_CRITERIA = {
  TASK_1: ['Task Achievement', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy'],
  TASK_2: ['Task Response', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy']
};

export const CRITERIA_KEYS = {
  TR: 'task_response', // or task_achievement
  CC: 'coherence_cohesion',
  LR: 'lexical_resource',
  GRA: 'grammatical_range_accuracy'
};

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  GROQ: 'groq',
  OPENROUTER: 'openrouter',
  YOU: 'you'
};

export const DEFAULT_MODELS = {
  gemini: 'gemini-3.6-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'google/gemini-2.5-flash',
  you: 'you-smart'
};

/**
 * Calculates official IELTS overall band score from 4 criteria.
 * Rules:
 * Average of 4 criteria rounded to nearest half or whole band:
 * - If ends in .25, round UP to .5
 * - If ends in .75, round UP to next whole band (e.g. 6.75 -> 7.0)
 * - If ends in .125, round down to .0 (e.g. 6.125 -> 6.0)
 * - If ends in .375, round up to .5 (e.g. 6.375 -> 6.5)
 * - If ends in .625, round down to .5 (e.g. 6.625 -> 6.5)
 * - If ends in .875, round up to next whole (e.g. 6.875 -> 7.0)
 */
export function calculateOfficialBand(scores) {
  const values = [
    scores.task_response || scores.task_achievement || 0,
    scores.coherence_cohesion || 0,
    scores.lexical_resource || 0,
    scores.grammatical_range_accuracy || 0
  ];
  
  const rawAvg = values.reduce((sum, v) => sum + v, 0) / 4;
  
  // Official IELTS rounding logic
  const integerPart = Math.floor(rawAvg);
  const decimalPart = rawAvg - integerPart;
  
  let roundedDecimal = 0;
  if (decimalPart < 0.25) {
    roundedDecimal = 0.0;
  } else if (decimalPart < 0.75) {
    roundedDecimal = 0.5;
  } else {
    roundedDecimal = 1.0;
  }
  
  return Number((integerPart + roundedDecimal).toFixed(1));
}
