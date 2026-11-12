import {SCORM12_SOURCE} from './scorm12Source';
import {LZSTRING_SOURCE} from './lzStringSource';

/**
 * 傳給 WebView 的還原狀態（來自上次 session 的 snapshot）。
 * 對應 SCORM 1.2 的 cmi.core.* 元素，原樣存、原樣還原（opaque）。
 */
export interface SeedState {
  lessonStatus?: string;
  scoreRaw?: string;
  scoreMin?: string;
  scoreMax?: string;
  suspendData?: string;
  totalTime?: string;
}

/**
 * 產生 documentStart 注入腳本：
 * 1. 載入 scorm-again（UMD → this.Scorm12API）
 * 2. 用上次的 state seed CMI（resume）或建一個 ab-initio learner
 * 3. window.API = api（內容的 lms.js 會在自己的 window 上找到它）
 * 4. 掛上事件 listener，全部經 postMessage 橋回 RN
 */
export function buildBootstrapScript(seed: SeedState | null): string {
  const seedJson = JSON.stringify(seed ?? null);
  return `
;(function(){
  if (window.__SCORM_BOOTSTRAP__) { return; }
  window.__SCORM_BOOTSTRAP__ = true;
  ${SCORM12_SOURCE}
  ${LZSTRING_SOURCE}
  var seed = ${seedJson};
  function post(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (e) {}
  }
  function trunc(v) {
    if (v === null || v === undefined) { return ''; }
    var s = String(v);
    return s.length > 160 ? s.slice(0, 160) + '…(' + s.length + ' chars)' : s;
  }
  var api = new Scorm12API({
    lmsCommitUrl: false,
    autocommit: true,
    autocommitSeconds: 15,
    logLevel: 'ERROR',
    onLogMessage: function(level, msg) {
      post({ kind: 'log', level: String(level), msg: trunc(msg) });
    },
  });
  var core = {
    student_id: 'demo-learner',
    student_name: 'Demo, Anson',
    entry: seed ? 'resume' : 'ab-initio',
  };
  if (seed) {
    if (seed.lessonStatus) { core.lesson_status = seed.lessonStatus; }
    if (seed.suspendData) { core.suspend_data = seed.suspendData; }
    if (seed.totalTime) { core.total_time = seed.totalTime; }
    if (seed.scoreRaw) {
      core.score = { raw: seed.scoreRaw, min: seed.scoreMin || '0', max: seed.scoreMax || '100' };
    }
  }
  try {
    api.loadFromJSON({ cmi: { core: core } });
  } catch (e) {
    post({ kind: 'log', level: 'ERROR', msg: 'loadFromJSON failed: ' + e });
  }
  window.API = api;

  // session_time 是 write-only 元素（讀回會 throw），從 SetValue 事件流側錄最新值
  var lastSessionTime = '';
  // 內容私有格式的解碼（僅 demo 觀察用）：suspend_data = LZString(base64(JSON))
  function decodeSuspendData(raw) {
    try {
      if (!raw) {
        return '';
      }
      return LZString.decompressFromBase64(raw) || '';
    } catch (e) {
      return '';
    }
  }
  // 從 scorm-again CMI model 撈逐題作答記錄（cmi.interactions.N.*）
  function readInteractions() {
    try {
      var arr = api.cmi.interactions;
      var children = arr && arr.childArray ? arr.childArray : [];
      return children.map(function(it, i) {
        function val(v) { return v === null || v === undefined ? '' : String(v); }
        var correct = [];
        try {
          var cr = it.correct_responses;
          var crArr = cr && cr.childArray ? cr.childArray : [];
          for (var j = 0; j < crArr.length; j++) { correct.push(val(crArr[j].pattern)); }
        } catch (e) {}
        return {
          index: i,
          id: val(it.id),
          type: val(it.type),
          weighting: val(it.weighting),
          correctResponses: correct,
          studentResponse: val(it.student_response),
          result: val(it.result),
          latency: val(it.latency),
          time: val(it.time),
        };
      });
    } catch (e) { return []; }
  }
  function snapshot() {
    var suspendRaw = api.cmi.suspend_data || '';
    return {
      lessonStatus: api.cmi.core.lesson_status,
      scoreRaw: api.cmi.core.score.raw,
      scoreMin: api.cmi.core.score.min,
      scoreMax: api.cmi.core.score.max,
      suspendData: suspendRaw,
      suspendDecoded: decodeSuspendData(suspendRaw),
      sessionTime: lastSessionTime,
      totalTime: api.cmi.core.total_time,
      interactions: readInteractions(),
    };
  }
  function postState() {
    try {
      post({ kind: 'state', payload: snapshot() });
    } catch (e) {}
  }

  api.on('LMSInitialize', function() {
    post({ kind: 'event', ev: 'LMSInitialize', tone: 'init', msg: 'LMSInitialize("") → "true"' });
    post({ kind: 'phase', phase: 'initialized' });
  });
  api.on('LMSFinish', function() {
    post({ kind: 'event', ev: 'LMSFinish', tone: 'term', msg: 'LMSFinish("") — session ended' });
    post({ kind: 'phase', phase: 'terminated' });
    postState();
  });
  api.on('LMSCommit', function() {
    var snap = snapshot();
    post({ kind: 'event', ev: 'LMSCommit', tone: 'commit',
      msg: 'LMSCommit() — demo 無 backend，state 回傳 app（'
        + snap.interactions.length + ' 題 interactions）' });
    // 點擊 commit 行可展開的完整提交內容
    post({ kind: 'commit', payload: snap });
    postState();
  });
  api.on('LMSSetValue.cmi.*', function(el, val) {
    if (el === 'cmi.core.session_time') {
      lastSessionTime = String(val);
    }
    post({ kind: 'set', el: el, val: trunc(val) });
  });
  api.on('LMSGetValue.cmi.*', function(el, val) {
    post({ kind: 'get', el: el, val: trunc(val) });
  });

  post({ kind: 'phase', phase: 'ready' });
  post({
    kind: 'log',
    level: 'INFO',
    msg: 'scorm-again Scorm12API 已注入 (documentStart)，window.API 就緒；entry=' + core.entry,
  });

})();
`;
}
