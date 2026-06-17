/**
 * Pure quiz auto-grading, separated from the service for unit testing.
 * A question is correct only when the learner's selected option ids exactly match the
 * question's correct option ids (order-independent). Score is a weighted percentage by
 * points, rounded to the nearest integer.
 */
export interface GradableQuestion {
  id: string;
  correct: string[];
  points: number;
}

export type AnswerMap = Record<string, string | string[]>;

function normalize(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map(String).sort();
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export interface GradeResult {
  score: number; // 0..100
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
}

export function gradeQuiz(
  questions: GradableQuestion[],
  answers: AnswerMap,
  passingScore: number,
): GradeResult {
  const totalPoints = questions.reduce((s, q) => s + Math.max(0, q.points), 0);
  let earnedPoints = 0;
  let correctCount = 0;

  for (const q of questions) {
    const given = normalize(answers[q.id]);
    const correct = normalize(q.correct);
    if (correct.length > 0 && sameSet(given, correct)) {
      earnedPoints += Math.max(0, q.points);
      correctCount += 1;
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  return { score, passed: score >= passingScore, earnedPoints, totalPoints, correctCount };
}
