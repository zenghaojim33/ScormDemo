/**
 * SCORM 1.2 元素/事件解釋字典（點 log 彈出的說明用）。
 * 內容 = spec 語義 + 在這個 demo 裡實際觀察到的行為。
 */

interface ElementDoc {
  /** 一句話含義 */
  summary: string;
  /** 誰寫/誰讀 */
  rw: 'content→LMS' | 'LMS→content' | '雙向';
  /** 實務說明（這門課/這類內容的行為） */
  detail: string;
  /** 值的格式說明，可選 */
  format?: string;
}

const cmiDocs: Record<string, ElementDoc> = {
  'cmi.core.student_id': {
    summary: '學員在 LMS 裡的帳號 ID',
    rw: 'LMS→content',
    detail:
      '內容啟動時讀它來顯示/記錄「誰在上課」。由 LMS（我們）在啟動前 seed，內容只能讀不能寫。demo 裡固定是 demo-learner，正式版就是你們 backend 的 user id。',
  },
  'cmi.core.student_name': {
    summary: '學員姓名',
    rw: 'LMS→content',
    detail:
      'SCORM 1.2 規定格式是「Last, First」（英文姓在前逗號）。中文內容多半只是拿來顯示，不太理會格式。',
  },
  'cmi.core.lesson_status': {
    summary: '這個 SCO 的學習狀態（最重要的一個欄位）',
    rw: 'content→LMS',
    detail:
      '內容自己回報：passed / failed / completed / incomplete / browsed / not attempted 六種。1.2 把「完成沒有」和「及格沒有」塞在同一個欄位——passed/failed 同時隱含 completed。做完測驗後它會變成 passed 或 completed；列表頁的狀態徽章就是吃這個值。若內容只給分數不給狀態，可以用 mastery_score 推導（scorm-again 的 mastery_override）。',
    format: 'passed | failed | completed | incomplete | browsed | not attempted',
  },
  'cmi.core.score.raw': {
    summary: '這個 SCO 的整體分數（通常＝測驗分數）',
    rw: 'content→LMS',
    detail:
      '由內容計算後回報，一般是測驗答對換算的分數，但語義上由內容作者定義。配合 score.min / score.max 才知道落在哪個區間；1.2 沒有 scaled 分數，要自己用 (raw-min)/(max-min) 正規化。',
  },
  'cmi.core.score.min': {
    summary: '分數下限',
    rw: 'content→LMS',
    detail: '通常是 0。和 raw / max 一起出現，用來正規化分數區間。',
  },
  'cmi.core.score.max': {
    summary: '分數上限',
    rw: 'content→LMS',
    detail: '通常是 100。有些內容會用實際題目總分。',
  },
  'cmi.core.session_time': {
    summary: '本次上課已持續的時間',
    rw: 'content→LMS',
    detail:
      '這門課每秒寫一次（你在 console 看到它連續跳就是這個），內容自己計時，結束時 LMS 用它累加進 total_time。是唯寫元素——內容只寫不讀。',
    format: 'HH:MM:SS',
  },
  'cmi.core.total_time': {
    summary: '歷史累計上課時間',
    rw: 'LMS→content',
    detail:
      '1.2 裡內容只能讀不能寫；LMS 在 session 結束時把 session_time 累加進去，下次啟動還原給內容。scorm-again 會幫忙維護。',
    format: 'HH:MM:SS（spec 是 HHHH:MM:SS.SS）',
  },
  'cmi.core.lesson_location': {
    summary: '書籤位置（跳頁用的字串）',
    rw: '雙向',
    detail:
      '內容寫「我離開時在第幾頁/第幾段」，下次啟動 LMS 原樣還原，內容讀回來自己跳。這門課其實不寫它（書籤全放在 suspend_data 裡），所以你大概不會在 console 看到它。',
    format: '≤255 字元的任意字串（語義由內容自訂）',
  },
  'cmi.core.exit': {
    summary: '離開方式宣告',
    rw: 'content→LMS',
    detail:
      '內容在 LMSFinish 前寫：suspend =「我之後要回來續讀」；空字串 =「正常結束」（例如測驗做完、課程看完）。LMS 依據它決定下次 entry 給 resume 還是 ab-initio。你在 console 看到 suspend 就代表這次離開會存書籤。',
    format: 'suspend | logout | time-out | "" ',
  },
  'cmi.core.entry': {
    summary: '本次進入模式（LMS 告訴內容的）',
    rw: 'LMS→content',
    detail:
      'ab-initio = 第一次新鮮人；resume = 接續上次（書籤已還原）；"" = review 模式（看完結的課）。由我們（LMS 側）在啟動前設定，demo 裡由 bootstrap 的 seed 邏輯決定。',
  },
  'cmi.suspend_data': {
    summary: '續讀用的大塊狀態 blob（書籤的本體）',
    rw: '雙向',
    detail:
      '內容把「做到哪、答了什麼、UI 狀態」全部塞進這個字串，離開前寫、下次啟動讀回。這門課把它用 LZString 壓縮成 base64（所以看起來是亂碼，開頭通常是 N4Ig…），對 LMS 完全 opaque——原樣存、原樣還原就好。1.2 上限 4096 字元。',
    format: '≤4096 字元（2004 是 64000）',
  },
  'cmi.interactions': {
    summary: '逐題作答紀錄（測驗明細）',
    rw: 'content→LMS',
    detail:
      '內容每答一題就寫一筆 cmi.interactions.n.*：題目 id、學員答案、對錯（result）、反應時間等。分數不是由它算出來的（內容自己算好寫 score.raw），它只是給 LMS 做錯題分析用的明細。',
  },
  'cmi.interactions.n.id': {
    summary: '第 n 題的題目識別碼',
    rw: 'content→LMS',
    detail: '內容自訂的題號/題 id，用來在報表裡對應到具體題目。',
  },
  'cmi.interactions.n.type': {
    summary: '題型',
    rw: 'content→LMS',
    detail: 'choice（選擇）、true-false、matching、fill-in、likert、sequencing、performance、numeric 共八種。',
  },
  'cmi.interactions.n.student_response': {
    summary: '學員的作答內容',
    rw: 'content→LMS',
    detail: '格式依題型不同：choice 是答案字母、true-false 是 TRUE/FALSE……原樣保存即可。',
  },
  'cmi.interactions.n.result': {
    summary: '這題的判結果',
    rw: 'content→LMS',
    detail: 'correct / wrong / unanticipated / neutral，或數值。做錯題分析、正確率統計就是吃這個。',
  },
  'cmi.interactions.n.time': {
    summary: '這題作答的時間點',
    rw: 'content→LMS',
    detail: 'HH:MM:SS，內容回報的當地時間。',
  },
  'cmi.interactions.n.weighting': {
    summary: '這題的分數權重',
    rw: 'content→LMS',
    detail: '題目在總分裡佔的比重；不寫視同 0。',
  },
  'cmi.interactions.n.latency': {
    summary: '這題花了多久作答',
    rw: 'content→LMS',
    detail: '內容計的答題耗時，可用來判斷學員卡關。',
  },
  'cmi.objectives': {
    summary: '教學目標（子能力點）紀錄',
    rw: 'content→LMS',
    detail:
      '內容可以把課程拆成幾個 objective 分別回報狀態/分數（例如「風險認知」80 分、「分散投資」60 分）。這門課沒有用到，你不會在 console 看到。',
  },
};

const apiDocs: Record<string, ElementDoc> = {
  LMSInitialize: {
    summary: '內容說「我開始上課了」',
    rw: 'content→LMS',
    detail:
      'SCO 啟動後第一個呼叫，成功回 "true"，之後才能 SetValue/GetValue。每個 session 只能 Initialize 一次，重複呼叫會回 error 101。你看到綠點亮起就是它成功了。',
  },
  LMSFinish: {
    summary: '內容說「我下課了」',
    rw: 'content→LMS',
    detail:
      '結束 session；呼叫後 API 進入 terminated 狀態，所有後續呼叫都會被拒（error 301）。內容應該在這之前寫完 exit、commit 完最後一次資料。',
  },
  LMSCommit: {
    summary: '內容說「把資料存起來」',
    rw: 'content→LMS',
    detail:
      '要求 LMS 把目前 CMI 狀態持久化。正式 LMS 裡這就是 POST 到 backend 的時機；demo 沒有 backend，所以顯示「state 回傳 app」。這門課自己每 ~15 秒 commit 一次，加上 scorm-again 的 autocommit 15 秒後備，所以 console 裡它挺常出現。',
  },
  LMSGetValue: {
    summary: '內容向 LMS 讀取某個欄位',
    rw: 'content→LMS',
    detail:
      '點任何 Get 行，下面會解釋那個元素是什麼。啟動時的幾次讀取通常就是內容在還原續讀狀態（suspend_data、學員資訊）。',
  },
  LMSSetValue: {
    summary: '內容向 LMS 寫入某個欄位',
    rw: 'content→LMS',
    detail:
      '點任何 Set 行，下面會解釋那個元素是什麼。scorm-again 會做資料模型驗證（格式、範圍、唯讀元素），不合法的寫入會回 error 並且你會在 console 看到紅色 Log。',
  },
  LMSGetLastError: {
    summary: '查詢上一個呼叫的錯誤碼',
    rw: 'content→LMS',
    detail: '內容每次呼叫後例行公事地檢查錯誤碼（0 = 沒事），正常情況下 console 不會顯示它（太吵）。',
  },
};

export interface Explanation {
  title: string;
  summary: string;
  rw: string;
  detail: string;
  format?: string;
}

/**
 * 從 console log 的 element / 事件名找解釋。
 * 支援前綴比對：cmi.interactions.n.* → cmi.interactions；
 * 也試著對時間類連續元素直接命中。
 */
export function explain(elOrEvent: string): Explanation | null {
  const key = elOrEvent.trim();
  const direct = cmiDocs[key] ?? apiDocs[key];
  if (direct) {
    return {title: key, ...direct};
  }
  // interactions.n → interactions 家族
  const m = key.match(/^(cmi\.interactions)\.\d+/);
  if (m) {
    // 試更細的尾欄位（id/type/result…）
    const leaf = key.replace(/^(cmi\.interactions)\.\d+\./, '');
    const leafDoc = cmiDocs[`cmi.interactions.n.${leaf}`];
    if (leafDoc) {
      return {title: key, ...leafDoc};
    }
    return {title: key, ...cmiDocs['cmi.interactions']};
  }
  // 其他未知 cmi.*：回通用說明
  if (key.startsWith('cmi.')) {
    return {
      title: key,
      summary: 'SCORM 1.2 資料模型元素',
      rw: '雙向',
      detail:
        '這個欄位這門課沒有用到（或較少見）。SCORM 1.2 的資料模型主要就是 cmi.core.*（狀態/分數/時間/書籤）、suspend_data、interactions（逐題）與 objectives（子目標）幾族。可以在 SCORM 1.2 spec 的「Data Model」章節查到它的精確定義。',
    };
  }
  return null;
}
