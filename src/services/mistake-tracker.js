import { getStudentEssays } from './storage.js';

/**
 * Compiles all past mistakes for a student across their submitted essays
 */
export async function getStudentMistakeHistory(studentId, preloadedEssays = null) {
  if (!studentId) return { totalEssays: 0, frequentMistakes: [], mistakeTags: {} };

  const essays = preloadedEssays || (await getStudentEssays(studentId)) || [];
  const mistakeCounts = {};
  const categoryCounts = { GRA: 0, LR: 0, CC: 0, TR: 0, OTHER: 0 };

  for (const essay of essays) {
    const mistakes = essay.feedback?.detailed_mistakes || [];
    for (const m of mistakes) {
      const tag = m.rule_tag || 'UNCATEGORIZED_ERROR';
      const cat = m.category || 'OTHER';
      
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (!mistakeCounts[tag]) {
        mistakeCounts[tag] = {
          rule_tag: tag,
          rule_friendly_name: m.rule_friendly_name || tag,
          category: cat,
          count: 0,
          micro_lesson: m.rule_micro_lesson || '',
          examples: []
        };
      }
      mistakeCounts[tag].count += 1;
      if (mistakeCounts[tag].examples.length < 3) {
        mistakeCounts[tag].examples.push({
          essay_id: essay.id,
          date: essay.created_at,
          snippet: m.original_snippet,
          correction: m.suggested_correction
        });
      }
    }
  }

  const frequentMistakes = Object.values(mistakeCounts)
    .sort((a, b) => b.count - a.count);

  return {
    totalEssays: essays.length,
    totalMistakes: Object.values(categoryCounts).reduce((a, b) => a + b, 0),
    categoryCounts,
    frequentMistakes,
    mistakeTags: mistakeCounts
  };
}

/**
 * Cross-references new evaluation mistakes with student's past history
 * Marks duplicates as `is_recurring: true` and attaches occurrence count
 */
export async function correlateAndAnnotateMistakes(studentId, newMistakes, preloadedEssays = null) {
  if (!studentId || !Array.isArray(newMistakes)) {
    return (newMistakes || []).map(m => ({ ...m, is_recurring: false, history_count: 1 }));
  }

  const history = await getStudentMistakeHistory(studentId, preloadedEssays);
  const pastTags = history.mistakeTags || {};

  return newMistakes.map(m => {
    const tag = m.rule_tag;
    const previousOccurrences = pastTags[tag] ? pastTags[tag].count : 0;
    const isRecurring = previousOccurrences > 0;
    
    return {
      ...m,
      is_recurring: isRecurring,
      history_count: previousOccurrences + 1,
      recurrence_alert: isRecurring
        ? `⚠️ تكرر هذا الخطأ معك (${previousOccurrences + 1}) مرات في مقالات سابقة!`
        : null
    };
  });
}
