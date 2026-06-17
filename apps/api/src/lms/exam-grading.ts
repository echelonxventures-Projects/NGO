/**
 * Pure exam grading for objective (MCQ) exams. Subjective/essay/viva/coding/file-upload exams
 * are graded manually by a teacher. Kept pure for unit testing.
 */
export interface ExamQuestion {
  prompt: string;
  options?: string[];
  correctIndex?: number;
  points?: number;
}

export interface ExamGradeResult {
  earned: number;
  total: number;
  score: number; // percentage 0..100
  passed: boolean;
}

export function gradeMcqExam(
  questions: ExamQuestion[],
  answers: Record<string, number>,
  passingPct: number,
): ExamGradeResult {
  let earned = 0;
  let total = 0;
  questions.forEach((q, i) => {
    const points = q.points ?? 1;
    total += points;
    if (q.correctIndex !== undefined && answers[String(i)] === q.correctIndex) {
      earned += points;
    }
  });
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { earned, total, score, passed: score >= passingPct };
}
