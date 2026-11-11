import React, {useEffect, useState} from 'react';
import {Linking, StatusBar} from 'react-native';
import CourseListScreen from './src/screens/CourseListScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import {progressStore} from './src/player/progressStore';
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
  const [, setProgressVersion] = useState(0);

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

  // scormdemo://course/<id> 深链（测试与外部跳转用）
  useEffect(() => {
    const open = (url: string) => {
      const m = url.match(/^scormdemo:\/\/course\/(.+)$/);
      if (!m) {
        return;
      }
      const course = courses.find(c => c.id === decodeURIComponent(m[1]));
      if (course) {
        setSelected(course);
      }
    };
    Linking.getInitialURL().then(url => url && open(url));
    const sub = Linking.addEventListener('url', ({url}) => open(url));
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      {selected == null ? (
        <CourseListScreen
          getProgress={id => progressStore.get(id)}
          onSelect={setSelected}
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
