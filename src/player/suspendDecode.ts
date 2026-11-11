/**
 * 從解碼後的 suspend_data JSON 裡掃「疑似進度」欄位。
 * 內容私有格式，key 全靠猜（slide/page/position…），僅 demo 觀察用——
 * 正式產品不應依賴這個，真進度要 SCORM 2004 的 progress_measure。
 */
export function progressHints(decodedJson?: string): string | null {
  if (!decodedJson) {
    return null;
  }
  try {
    const obj = JSON.parse(decodedJson);
    const hits: string[] = [];
    const scan = (o: unknown, prefix: string, depth: number) => {
      if (o == null || typeof o !== 'object' || depth > 2 || hits.length >= 6) {
        return;
      }
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (hits.length >= 6) {
          break;
        }
        if (
          /slide|page|step|index|progress|position|current/i.test(k) &&
          (typeof v === 'number' || typeof v === 'string') &&
          String(v).length <= 40
        ) {
          hits.push(`${prefix}${k}=${String(v)}`);
        } else if (v != null && typeof v === 'object') {
          scan(v, `${prefix}${k}.`, depth + 1);
        }
      }
    };
    scan(obj, '', 0);
    return hits.length ? hits.join('  ') : null;
  } catch {
    return null;
  }
}

/** 解釋卡用的 pretty JSON（全文，卡片內部滾動） */
export function prettyDecoded(decodedJson?: string): string | null {
  if (!decodedJson) {
    return null;
  }
  try {
    return JSON.stringify(JSON.parse(decodedJson), null, 2);
  } catch {
    return decodedJson;
  }
}
