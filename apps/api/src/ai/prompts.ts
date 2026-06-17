/**
 * AI explanation modes and prompt construction. Pure functions (no I/O) so they are trivially
 * unit-testable and reused across the tutor, content and "explain this" features. The master
 * spec requires every content item to support these eight modes.
 */

export const EXPLANATION_MODES = [
  'eli5',
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'teacher',
  'exam',
  'practical',
] as const;

export type ExplanationMode = (typeof EXPLANATION_MODES)[number];

/** Human instructions appended to the system prompt for each mode. */
export const MODE_INSTRUCTIONS: Record<ExplanationMode, string> = {
  eli5: 'Explain like the reader is five years old. Use simple words, short sentences, and a friendly analogy. Avoid jargon entirely.',
  beginner: 'Explain for a complete beginner. Define any term you introduce. Keep it concrete and encouraging.',
  intermediate: 'Explain for someone with some background. You may use standard terminology with brief definitions.',
  advanced: 'Explain for an advanced learner. Use precise terminology, discuss edge cases and trade-offs.',
  expert: 'Explain for a domain expert. Be terse and rigorous; assume deep prior knowledge and reference underlying principles.',
  teacher: 'Explain as a teacher preparing to teach this. Include learning objectives, a suggested sequence, and common misconceptions.',
  exam: 'Explain in exam-preparation style. Provide the key points to memorize, likely questions, and concise model answers.',
  practical: 'Explain with a hands-on, practical focus. Provide steps, a worked example, and how to apply it in the real world.',
};

export function isExplanationMode(value: string): value is ExplanationMode {
  return (EXPLANATION_MODES as readonly string[]).includes(value);
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Builds messages for explaining a piece of content in a given mode and language. */
export function buildExplainPrompt(
  content: string,
  mode: ExplanationMode,
  language = 'English',
): PromptMessage[] {
  return [
    {
      role: 'system',
      content:
        `You are an expert educator. ${MODE_INSTRUCTIONS[mode]} ` +
        `Respond in ${language}.`,
    },
    { role: 'user', content: `Explain the following content:\n\n${content}` },
  ];
}

/** Builds messages for the AI tutor: a subject-aware, Socratic helper. */
export function buildTutorPrompt(
  question: string,
  opts: { subject?: string; mode?: ExplanationMode; language?: string } = {},
): PromptMessage[] {
  const mode = opts.mode ?? 'beginner';
  const subject = opts.subject ? ` The subject is ${opts.subject}.` : '';
  return [
    {
      role: 'system',
      content:
        `You are a patient AI tutor.${subject} ${MODE_INSTRUCTIONS[mode]} ` +
        `Encourage the learner and check understanding. Respond in ${opts.language ?? 'English'}.`,
    },
    { role: 'user', content: question },
  ];
}

/** Builds a JSON-mode prompt for generating quiz questions. */
export function buildQuizPrompt(topic: string, count: number, language = 'English'): PromptMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are an assessment author. Produce multiple-choice questions as strict JSON ' +
        'matching: {"questions":[{"prompt":string,"options":[string],"correctIndex":number}]}. ' +
        `Write in ${language}. Output JSON only, no prose.`,
    },
    { role: 'user', content: `Create ${count} multiple-choice questions about: ${topic}` },
  ];
}

/** Builds a prompt for summarizing long text (reports, articles). */
export function buildSummaryPrompt(text: string, maxWords = 150, language = 'English'): PromptMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert summarizer. Summarize clearly in at most ${maxWords} words. Respond in ${language}.`,
    },
    { role: 'user', content: text },
  ];
}

/** Builds a prompt for auto-categorizing content into one of the provided categories. */
export function buildCategorizePrompt(text: string, categories: string[]): PromptMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are a precise content classifier. Choose the single best category from the list ' +
        `and reply with only that category name. Categories: ${categories.join(', ')}.`,
    },
    { role: 'user', content: text },
  ];
}
