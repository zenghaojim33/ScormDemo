export interface Course {
  id: string;
  /** 下載包解壓後的資料夾名（對應 LMS 後端的 package 目錄） */
  folder: string;
  packageTitle: string;
  itemTitle: string | null;
  scormVersion: '1.2' | '2004' | string;
  /** imsmanifest.xml 裡 resource 的 href，相對於 package 根目錄 */
  launchUrl: string;
  scormType: string;
  masteryScore: number | null;
  /** ISO 8601 duration / HH:MM:SS，來自 lom.typicallearningtime */
  typicalLearningTime: string | null;
}

export type CourseStatus = 'not-attempted' | 'in-progress' | 'completed' | 'passed' | 'failed';

export interface CourseProgress {
  status: CourseStatus;
  score?: {raw: number; min: number; max: number};
  /** cmi.core.lesson_location（書籤位置，內容自訂語義） */
  location?: string;
  lastPlayedAt?: string;
  /** resume 用 snapshot（原樣存、原樣還原） */
  suspendData?: string;
  totalTime?: string;
  /** 上次回報的原始 lesson_status */
  lastStatus?: string;
}
