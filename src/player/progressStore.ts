import type {CourseProgress} from '../types';

/**
 * Demo 用 in-memory 進度倉（app 重啟即清空）。
 * 正式版換成 AsyncStorage / backend GET runtime，介面一致。
 */
const map = new Map<string, CourseProgress>();

export const progressStore = {
  get(id: string): CourseProgress | undefined {
    return map.get(id);
  },
  set(id: string, p: CourseProgress): void {
    map.set(id, {...p});
  },
};
