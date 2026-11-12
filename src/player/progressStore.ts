import AsyncStorage from '@react-native-async-storage/async-storage';
import type {CourseProgress} from '../types';

/**
 * 進度倉（AsyncStorage 持久化，app 重啟不丟）。
 * 正式版換成 backend GET runtime，介面一致。
 */
const KEY = 'scormdemo.progress.v1';
const map = new Map<string, CourseProgress>();
let hydrated = false;
const waiting: (() => void)[] = [];

AsyncStorage.getItem(KEY)
  .then(raw => {
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, CourseProgress>;
      for (const [id, p] of Object.entries(obj)) {
        map.set(id, p);
      }
    }
  })
  .catch(() => {})
  .finally(() => {
    hydrated = true;
    waiting.forEach(fn => fn());
    waiting.length = 0;
  });

function persist() {
  const obj: Record<string, CourseProgress> = {};
  for (const [id, p] of map.entries()) {
    obj[id] = p;
  }
  AsyncStorage.setItem(KEY, JSON.stringify(obj)).catch(() => {});
}

export const progressStore = {
  /** 啟動後首次磁盤讀取完成前回調掛起，避免閃回空列表 */
  ready(): Promise<void> {
    if (hydrated) {
      return Promise.resolve();
    }
    return new Promise(resolve => waiting.push(resolve));
  },
  get(id: string): CourseProgress | undefined {
    return map.get(id);
  },
  set(id: string, p: CourseProgress): void {
    map.set(id, {...p});
    persist();
  },
};
