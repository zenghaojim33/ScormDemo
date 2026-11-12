import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import type {Course, CourseProgress, CourseStatus} from '../types';
import {colors} from '../theme';
import {buildBootstrapScript, type SeedState} from '../player/bootstrap';
import ScormConsole, {type Entry} from './ScormConsole';
import {progressHints} from '../player/suspendDecode';

interface Props {
  course: Course;
  seed: SeedState | null;
  onBack: () => void;
  onProgress: (courseId: string, p: CourseProgress) => void;
}

const SERVER_ORIGIN = 'http://localhost:8088';

function toStatus(lessonStatus: string, hasSuspendData: boolean): CourseStatus {
  switch (lessonStatus) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'completed':
      return 'completed';
    case 'incomplete':
      return 'in-progress';
    default:
      return hasSuspendData ? 'in-progress' : 'not-attempted';
  }
}

function hmsToSec(s?: string): number {
  if (!s) {
    return 0;
  }
  const parts = s.split(':').map(Number);
  if (parts.some(isNaN)) {
    return 0;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

function minutesLabel(t?: string | null): string | null {
  if (!t) {
    return null;
  }
  const sec = hmsToSec(t);
  return sec > 0 ? `約 ${Math.round(sec / 60)} 分鐘` : null;
}

export default function PlayerScreen({course, seed, onBack, onProgress}: Props) {
  const webviewRef = useRef<WebView>(null);
  const entryId = useRef(0);
  const pausedRef = useRef(false);

  const [phase, setPhase] = useState<'ready' | 'initialized' | 'terminated'>('ready');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [paused, setPaused] = useState(false);
  const [counts, setCounts] = useState({set: 0, get: 0, commit: 0, err: 0});
  const [sessionTime, setSessionTime] = useState<string | undefined>(undefined);
  const [statusNow, setStatusNow] = useState<string | undefined>(seed?.lessonStatus);
  const [suspendDecoded, setSuspendDecoded] = useState<string | undefined>(undefined);

  const append = useCallback((e: Omit<Entry, 'id'>) => {
    if (pausedRef.current) {
      return;
    }
    setEntries(prev => {
      const next = [...prev, {...e, id: ++entryId.current}];
      return next.length > 400 ? next.slice(next.length - 400) : next;
    });
    setCounts(c => {
      if (e.kind === 'set') {
        return {...c, set: c.set + 1};
      }
      if (e.kind === 'get') {
        return {...c, get: c.get + 1};
      }
      if (e.kind === 'log' && e.tone === 'ERROR') {
        return {...c, err: c.err + 1};
      }
      if (e.kind === 'event' && e.tone === 'commit') {
        return {...c, commit: c.commit + 1};
      }
      return c;
    });
  }, []);

  const courseUrl =
    SERVER_ORIGIN +
    '/' +
    course.folder.split('/').map(encodeURIComponent).join('/') +
    '/' +
    course.launchUrl
      .split('/')
      .map(encodeURIComponent)
      .join('/');

  const bootstrap = useMemo(() => buildBootstrapScript(seed), [seed]);

  const onMessage = useCallback(
    (ev: {nativeEvent: {data: string}}) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.kind) {
        case 'phase':
          setPhase(msg.phase);
          append({
            kind: 'event',
            tone: 'INFO',
            text: `● WebView ${msg.phase === 'ready' ? 'bootstrap 完成' : msg.phase}`,
          });
          break;
        case 'event':
          append({
            kind: 'event',
            tone: msg.tone ?? 'INFO',
            text: msg.msg,
            el: msg.ev,
          });
          break;
        case 'set':
          append({kind: 'set', tone: 'set', text: `${msg.el} = ${msg.val}`, el: msg.el});
          break;
        case 'get':
          append({
            kind: 'get',
            tone: 'get',
            text: `${msg.el}${msg.val ? ` → ${msg.val}` : ''}`,
            el: msg.el,
          });
          break;
        case 'log':
          append({kind: 'log', tone: msg.level, text: `[${msg.level}] ${msg.msg}`});
          break;
        case 'commit': {
          const p = msg.payload ?? {};
          append({
            kind: 'event',
            tone: 'commit',
            text: `📦 本次 commit 內容（可點擊查看詳情）`,
            detail: JSON.stringify(p, null, 2),
          });
          break;
        }
        case 'state': {
          const p = msg.payload ?? {};
          setSessionTime(p.sessionTime);
          setStatusNow(p.lessonStatus);
          setSuspendDecoded(
            typeof p.suspendDecoded === 'string' ? p.suspendDecoded : undefined,
          );
          const hint = progressHints(
            typeof p.suspendDecoded === 'string' ? p.suspendDecoded : undefined,
          );
          const interactions = Array.isArray(p.interactions) ? p.interactions : [];
          append({
            kind: 'state',
            tone: 'state',
            text: `快照  lesson_status=${p.lessonStatus ?? '—'} · score=${
              p.scoreRaw ?? '—'
            } · suspend_data=${(p.suspendData || '').length}c · session=${
              p.sessionTime ?? '—'
            } · interactions=${interactions.length}${hint ? `\n       ↳ 真實進度線索: ${hint}` : ''}`,
          });
          onProgress(course.id, {
            status: toStatus(p.lessonStatus ?? '', (p.suspendData || '').length > 0),
            score:
              p.scoreRaw != null
                ? {
                    raw: Number(p.scoreRaw),
                    min: Number(p.scoreMin ?? 0),
                    max: Number(p.scoreMax ?? 100),
                  }
                : undefined,
            // 關鍵：suspend_data / total_time / lesson_status 必須隨快照存倉，
            // 否則下次進入 seed 為 null → ab-initio → 無法恢復
            suspendData: (p.suspendData || '').length ? p.suspendData : undefined,
            totalTime: p.totalTime || undefined,
            lastStatus: p.lessonStatus || undefined,
            lastPlayedAt: new Date().toISOString(),
            interactions,
          });
          break;
        }
        default:
          break;
      }
    },
    [append, course.id, onProgress],
  );

  // App 退到背景时主动 flush commit（RN 必做：kill 时没有可靠的 unload/sendBeacon）
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        webviewRef.current?.injectJavaScript(
          'window.API && typeof window.API.commit === "function" && window.API.commit(); true;',
        );
      }
    });
    return () => sub.remove();
  }, []);

  const phaseColor =
    phase === 'initialized'
      ? '#4ADE80'
      : phase === 'terminated'
      ? '#FBBF24'
      : '#8B93A7';

  // 定時進度：每次 commit 快照的 session_time / manifest 的 typicallearningtime
  const typicalSec = hmsToSec(course.typicalLearningTime);
  const done =
    statusNow === 'completed' || statusNow === 'passed';
  const pct = done
    ? 100
    : typicalSec > 0
    ? Math.min(100, Math.round((hmsToSec(sessionTime) / typicalSec) * 100))
    : 0;
  const typicalLabel = minutesLabel(course.typicalLearningTime);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>‹ 课程</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {course.itemTitle ?? course.packageTitle}
          </Text>
          <View style={styles.phaseRow}>
            <View style={[styles.phaseDot, {backgroundColor: phaseColor}]} />
            <Text style={styles.phaseText}>
              {phase === 'initialized'
                ? 'SCORM 已初始化'
                : phase === 'terminated'
                ? '已结束'
                : '等待内容初始化'}
              {seed ? ` · 种子${seed.suspendData?.length ?? 0}c` : ' · 无种子'}
              {sessionTime ? ` · 已学 ${sessionTime}` : ''}
              {typicalLabel ? ` / ${typicalLabel}` : ''}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {width: `${pct}%`, backgroundColor: done ? '#4ADE80' : '#84CAFF'},
              ]}
            />
          </View>
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={styles.webContainer}>
        <WebView
          ref={webviewRef}
          source={{uri: courseUrl}}
          injectedJavaScriptBeforeContentLoaded={bootstrap}
          onMessage={onMessage}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          onError={({nativeEvent}) =>
            append({
              kind: 'log',
              tone: 'ERROR',
              text: `[WebView] ${nativeEvent.description ?? 'load error'}`,
            })
          }
        />
      </View>

      <ScormConsole
        entries={entries}
        counts={counts}
        suspendDecoded={suspendDecoded}
        paused={paused}
        onTogglePause={() => {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
        }}
        onClear={() => {
          setEntries([]);
          setCounts({set: 0, get: 0, commit: 0, err: 0});
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C111D',
  },
  navBar: {
    backgroundColor: '#0C111D',
    paddingTop: 52,
    paddingBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    minWidth: 64,
    alignItems: 'flex-start',
  },
  backText: {
    color: '#84CAFF',
    fontSize: 15,
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  phaseText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 6,
    marginBottom: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  webContainer: {
    flex: 1,
    backgroundColor: colors.card,
  },
});
