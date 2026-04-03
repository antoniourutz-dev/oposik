import type { PracticeMode } from '../../practiceTypes';

export type DailyReportDayType =
  | 'consolidation'
  | 'pressure'
  | 'recovery'
  | 'pattern'
  | 'growth';

export type DailyReportInsightSeverity = 'low' | 'medium' | 'high';

export type DailyReport = {
  dateLabel: string;
  weekdayTitle: string;
  dayType: DailyReportDayType;
  subtitle: string;
  questionsSeen: number;
  correctAnswers: number;
  accuracyRate: number;
  avgResponseSeconds: number;
  totalStudyMinutes: number;
  dominantMode: PracticeMode;
  dominantModeLabel: string;
  reviewedCount: number;
  newCount: number;
  mostWorkedLabel: string;
  weakestLabel: string;
  compositionNote: string;
  primaryInsight: {
    title: string;
    summary: string;
    severity: DailyReportInsightSeverity;
    badge: 'estable' | 'alerta' | 'progreso' | 'recuperación';
  };
  closingNote: string;
};
