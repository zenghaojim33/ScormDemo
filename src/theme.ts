import type {CourseStatus} from '../types';

export const colors = {
  bg: '#F2F4F7',
  card: '#FFFFFF',
  text: '#101828',
  textSecondary: '#667085',
  border: '#EAECF0',
  accent: '#1849A9',
  accentSoft: '#EFF4FF',
  headerBg: '#0C111D',
  headerText: '#FFFFFF',
};

export const statusMeta: Record<CourseStatus, {label: string; bg: string; fg: string}> = {
  'not-attempted': {label: '未開始', bg: '#F2F4F7', fg: '#667085'},
  'in-progress': {label: '進行中', bg: '#FEF0C7', fg: '#B54708'},
  completed: {label: '已完成', bg: '#D1FADF', fg: '#027A48'},
  passed: {label: '已通過', bg: '#D1FADF', fg: '#027A48'},
  failed: {label: '未通過', bg: '#FEE4E2', fg: '#B42318'},
};

/** "01:00:00" -> "約 60 分鐘" */
export function formatLearningTime(t: string | null): string | null {
  if (!t) {
    return null;
  }
  const parts = t.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) {
    return null;
  }
  const minutes = parts.length === 3 ? parts[0] * 60 + parts[1] : parts[0];
  if (minutes <= 0) {
    return null;
  }
  return `約 ${minutes} 分鐘`;
}
