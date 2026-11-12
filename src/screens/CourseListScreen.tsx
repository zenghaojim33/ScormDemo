import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import coursesData from '../data/courses.json';
import type {Course, CourseProgress} from '../types';
import {colors, formatLearningTime, statusMeta} from '../theme';

const courses = coursesData as Course[];

interface Props {
  onSelect: (course: Course) => void;
  onQuizJump: (course: Course) => void;
  getProgress: (id: string) => CourseProgress | undefined;
}

export default function CourseListScreen({onSelect, onQuizJump, getProgress}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCORM 課程</Text>
        <Text style={styles.headerSubtitle}>
          {courses.length} 門課程 · SCORM 1.2 · 單元測試包
        </Text>
      </View>
      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item, index}) => {
          const progress = getProgress(item.id);
          const status = statusMeta[progress?.status ?? 'not-attempted'];
          const time = formatLearningTime(item.typicalLearningTime);
          return (
            <TouchableOpacity
              style={[styles.card, index === courses.length - 1 && styles.cardLast]}
              activeOpacity={0.7}
              onPress={() => onSelect(item)}>
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SCORM {item.scormVersion}</Text>
                </View>
                <View style={[styles.badge, {backgroundColor: status.bg}]}>
                  <Text style={[styles.badgeText, {color: status.fg}]}>
                    {status.label}
                  </Text>
                </View>
                {progress?.score && (
                  <View style={[styles.badge, {backgroundColor: '#FEF0C7'}]}>
                    <Text style={[styles.badgeText, {color: '#B54708'}]}>
                      {progress.score.raw} 分
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.title}>{item.itemTitle ?? item.packageTitle}</Text>
              <Text style={styles.meta}>
                {time ? time + ' · ' : ''}
                {item.scormType === 'sco' ? '單一 SCO' : item.scormType}
                {progress?.suspendData ? ' · 可續玩' : ''}
              </Text>
              <TouchableOpacity
                style={styles.quizJumpButton}
                activeOpacity={0.7}
                onPress={() => onQuizJump(item)}>
                <Text style={styles.quizJumpText}>🧪 直達 Quiz（跳過學習）</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 24,
  },
  headerTitle: {
    color: colors.headerText,
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 6,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardLast: {
    marginBottom: 40,
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  quizJumpButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDD07A',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#FFFAEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quizJumpText: {
    color: '#B54708',
    fontSize: 12,
    fontWeight: '600',
  },
});
