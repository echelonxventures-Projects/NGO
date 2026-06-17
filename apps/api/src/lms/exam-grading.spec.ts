import { gradeMcqExam, ExamQuestion } from './exam-grading';

describe('gradeMcqExam', () => {
  const questions: ExamQuestion[] = [
    { prompt: 'Q1', options: ['a', 'b'], correctIndex: 1, points: 2 },
    { prompt: 'Q2', options: ['a', 'b'], correctIndex: 0, points: 3 },
    { prompt: 'Q3', options: ['a', 'b'], correctIndex: 1, points: 5 },
  ];

  it('awards points only for correct answers and computes percentage', () => {
    // correct: Q1 (2) + Q3 (5) = 7 of 10 = 70%
    const result = gradeMcqExam(questions, { '0': 1, '1': 1, '2': 1 }, 40);
    expect(result).toEqual({ earned: 7, total: 10, score: 70, passed: true });
  });

  it('fails when below the passing threshold', () => {
    const result = gradeMcqExam(questions, { '0': 0, '1': 1, '2': 0 }, 40);
    expect(result.earned).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('handles empty exams without dividing by zero', () => {
    expect(gradeMcqExam([], {}, 40)).toEqual({ earned: 0, total: 0, score: 0, passed: false });
  });
});
