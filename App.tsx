import React, {useEffect, useState} from 'react';
import {Linking, StatusBar} from 'react-native';
import CourseListScreen from './src/screens/CourseListScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import {progressStore} from './src/player/progressStore';
import {QUIZ_JUMP_SEEDS} from './src/player/quizJump';
import type {SeedState} from './src/player/bootstrap';
import coursesData from './src/data/courses.json';
import type {Course, CourseProgress} from './src/types';

const courses = coursesData as Course[];

function seedOf(p: CourseProgress | undefined): SeedState | null {
  if (!p) {
    return null;
  }
  const seed: SeedState = {
    lessonStatus: p.lastStatus,
    suspendData: p.suspendData,
    totalTime: p.totalTime,
  };
  if (p.score) {
    seed.scoreRaw = String(p.score.raw);
    seed.scoreMin = String(p.score.min);
    seed.scoreMax = String(p.score.max);
  }
  return seed.suspendData || seed.lessonStatus ? seed : null;
}

function App(): React.JSX.Element {
  const [selected, setSelected] = useState<Course | null>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [, setProgressVersion] = useState(0);

  // 等 AsyncStorage 進度恢復完成再渲染列表，避免把「有進度」誤判成無進度
  useEffect(() => {
    progressStore.ready().then(() => setStoreReady(true));
  }, []);

  const handleProgress = (courseId: string, p: CourseProgress) => {
    const prev = progressStore.get(courseId);
    progressStore.set(courseId, {
      ...p,
      suspendData: p.suspendData?.length ? p.suspendData : prev?.suspendData,
      totalTime: p.totalTime ?? prev?.totalTime,
      lastStatus: p.lastStatus ?? prev?.lastStatus,
    });
    setProgressVersion(v => v + 1);
  };

  // 開發用：偽造「已學到第一個 quiz」的 suspend_data 種子，播放器 resume 直接跳到 quiz。
  // 只在沒有進度時種子；已有進度（答到一半）則保留真實 suspend_data 正常恢復，
  // 避免每次點擊都把 quiz 內部進度重置回 Declaration。
  const handleQuizJump = (course: Course) => {
    const seed = QUIZ_JUMP_SEEDS[course.id];
    if (!seed) {
      return;
    }
    const existing = progressStore.get(course.id);
    if (!existing?.suspendData) {
      progressStore.set(course.id, {
        status: 'in-progress',
        lastStatus: 'incomplete',
        suspendData: seed.suspendData,
        totalTime: '00:10:00',
        lastPlayedAt: new Date().toISOString(),
      });
    }
    setSelected(course);
  };

  // scormdemo://course/<id> 深链（测试与外部跳转用）
  // scormdemo://quiz/<id> 深链直达 quiz（测试用）
  useEffect(() => {
    const open = (url: string) => {
      let m = url.match(/^scormdemo:\/\/course\/(.+)$/);
      if (m) {
        const course = courses.find(c => c.id === decodeURIComponent(m[1]));
        if (course) {
          setSelected(course);
        }
        return;
      }
      m = url.match(/^scormdemo:\/\/quiz\/(.+)$/);
      if (m) {
        const course = courses.find(c => c.id === decodeURIComponent(m[1]));
        if (course) {
          handleQuizJump(course);
        }
      }
    };
    Linking.getInitialURL().then(url => url && open(url));
    const sub = Linking.addEventListener('url', ({url}) => open(url));
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      {!storeReady ? null : selected == null ? (
        <CourseListScreen
          getProgress={id => progressStore.get(id)}
          onSelect={setSelected}
          onQuizJump={handleQuizJump}
        />
      ) : (
        <PlayerScreen
          course={selected}
          seed={seedOf(progressStore.get(selected.id))}
          onBack={() => setSelected(null)}
          onProgress={handleProgress}
        />
      )}
    </>
  );
}

export default App;
