import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Clipboard,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {explain, type Explanation} from '../player/elementDocs';
import {prettyDecoded} from '../player/suspendDecode';

const MONO = Platform.select({ios: 'Menlo', android: 'monospace'});

export type EntryKind = 'event' | 'set' | 'get' | 'log' | 'state';

export interface Entry {
  id: number;
  kind: EntryKind;
  tone: string;
  text: string;
  /** 可解釋的元素名或 API 事件名（有值 → 該行可點） */
  el?: string;
  /** 點擊展開的原始內容（如本次 commit 的完整快照 JSON） */
  detail?: string;
}

export const toneColor: Record<string, string> = {
  init: '#4ADE80',
  term: '#FB7185',
  commit: '#FBBF24',
  set: '#38BDF8',
  get: '#8B93A7',
  state: '#C084FC',
  ERROR: '#FB7185',
  WARN: '#FBBF24',
  INFO: '#8B93A7',
};

type Filter = 'all' | 'set' | 'get' | 'lifecycle' | 'state';

const filterLabels: {key: Filter; label: string}[] = [
  {key: 'all', label: '全部'},
  {key: 'set', label: 'SetValue'},
  {key: 'get', label: 'GetValue'},
  {key: 'lifecycle', label: '生命周期'},
  {key: 'state', label: '状态快照'},
];

interface Props {
  entries: Entry[];
  counts: {set: number; get: number; commit: number; err: number};
  /** 最新的解碼後 suspend_data（點 suspend_data 解釋卡時顯示） */
  suspendDecoded?: string;
  paused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
}

interface Row {
  entry: Entry;
  repeat: number;
}

export default function ScormConsole({
  entries,
  counts,
  suspendDecoded,
  paused,
  onTogglePause,
  onClear,
}: Props) {
  const listRef = useRef<FlatList<Row>>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [noiseReduce, setNoiseReduce] = useState(true);
  const [selected, setSelected] = useState<Explanation | null>(null);
  const [detailText, setDetailText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const decodedPretty = useMemo(
    () =>
      selected?.title === 'cmi.suspend_data' && suspendDecoded
        ? prettyDecoded(suspendDecoded)
        : null,
    [selected, suspendDecoded],
  );

  /** 降噪：同一元素的連續重複寫/讀（如每秒一次的 session_time）合併成一行 ×N */
  const merged = useMemo(() => {
    const rows: Row[] = [];
    for (const e of entries) {
      const last = rows[rows.length - 1];
      const mergeable =
        noiseReduce &&
        last != null &&
        (e.kind === 'set' || e.kind === 'get') &&
        last.entry.kind === e.kind &&
        last.entry.el != null &&
        last.entry.el === e.el;
      if (mergeable) {
        last.entry = e;
        last.repeat += 1;
      } else {
        rows.push({entry: e, repeat: 1});
      }
    }
    return rows;
  }, [entries, noiseReduce]);

  const filtered = useMemo(() => {
    const rows =
      filter === 'all'
        ? merged
        : merged.filter(row => {
            const e = row.entry;
            if (filter === 'state') {
              return e.kind === 'state';
            }
            if (filter === 'lifecycle') {
              return e.kind === 'event' || e.kind === 'log';
            }
            return e.kind === filter;
          });
    // 最新在最上面（時間倒序）
    return rows.slice().reverse();
  }, [merged, filter]);

  useEffect(() => {
    listRef.current?.scrollToOffset({offset: 0, animated: false});
  }, [filtered.length, consoleOpen]);

  const kindPrefix: Record<EntryKind, string> = {
    set: 'Set',
    get: 'Get',
    state: 'State',
    log: 'Log',
    event: 'Api',
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.bar} onPress={() => setConsoleOpen(o => !o)}>
        <Text style={styles.title}>
          SCORM Console{paused ? '（已暂停）' : ''}
        </Text>
        <View style={styles.stats}>
          <Text style={styles.statText}>Set {counts.set}</Text>
          <Text style={styles.statText}>Commit {counts.commit}</Text>
          <Text style={[styles.statText, counts.err > 0 && {color: '#FB7185'}]}>
            Err {counts.err}
          </Text>
          <TouchableOpacity
            hitSlop={6}
            onPress={() => {
              onTogglePause();
            }}>
            <Text style={styles.controlText}>{paused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={6} onPress={onClear}>
            <Text style={styles.controlText}>⌫</Text>
          </TouchableOpacity>
          <Text style={styles.controlText}>{consoleOpen ? '▾' : '▴'}</Text>
        </View>
      </Pressable>

      {consoleOpen && (
        <>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                noiseReduce ? styles.chipActive : styles.chipToggleOff,
              ]}
              onPress={() => setNoiseReduce(o => !o)}>
              <Text
                style={[
                  styles.chipText,
                  noiseReduce && styles.chipTextActive,
                ]}>
                降噪{noiseReduce ? ' ●' : ''}
              </Text>
            </TouchableOpacity>
            {filterLabels.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, filter === f.key && styles.chipActive]}
                onPress={() => setFilter(f.key)}>
                <Text
                  style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={r => String(r.entry.id)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({item}) => {
              const e = item.entry;
              const explanation = e.el ? explain(e.el) : null;
              const tappable = explanation != null || e.detail != null;
              return (
                <Pressable
                  disabled={!tappable}
                  onPress={() => {
                    if (explanation) {
                      setSelected(explanation);
                    } else if (e.detail) {
                      setDetailText(e.detail);
                    }
                  }}>
                  <Text style={styles.line}>
                    <Text style={{color: toneColor[e.tone] ?? '#8B93A7'}}>
                      {kindPrefix[e.kind]}{'  '}
                    </Text>
                    <Text
                      style={{
                        color:
                          e.kind === 'log' || e.kind === 'event'
                            ? toneColor[e.tone] ?? '#C3C9D5'
                            : e.kind === 'set'
                            ? '#C3C9D5'
                            : '#A6ADBB',
                      }}>
                      {e.text}
                    </Text>
                    {item.repeat > 1 && (
                      <Text style={styles.repeat}> ×{item.repeat}</Text>
                    )}
                    {explanation && <Text style={styles.hint}> ⌾</Text>}
                    {!explanation && e.detail != null && (
                      <Text style={styles.hint}> ▤</Text>
                    )}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                等待事件…（内容的 lms.js 调用 window.API 时会实时显示在这里）
              </Text>
            }
          />
        </>
      )}

      <Modal
        visible={detailText != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailText(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDetailText(null)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            <Pressable
              style={styles.decodeHeader}
              onPress={() => {
                if (detailText) {
                  Clipboard.setString(detailText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}>
              <Text style={styles.decodeLabel}>📦 本次 LMSCommit 提交內容</Text>
              {copied ? (
                <Text style={styles.copiedText}>已複製 ✓</Text>
              ) : (
                <Text style={styles.copyHint}>點此複製全文</Text>
              )}
            </Pressable>
            <ScrollView
              style={styles.decodeScroll}
              nestedScrollEnabled
              bounces={false}>
              <Text style={styles.decodeValue} selectable>
                {detailText}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailText(null)}>
              <Text style={styles.closeText}>關閉</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={selected != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            {/* 上半：說明文字，空間不夠時自己收縮滾動 */}
            <ScrollView
              style={styles.sheetInfo}
              nestedScrollEnabled
              bounces={false}>
              <Text style={styles.sheetKind}>SCORM 說明</Text>
              <Text style={styles.sheetTitle} selectable>
                {selected?.title}
              </Text>
              <Text style={styles.sheetSummary}>{selected?.summary}</Text>
              {selected?.format ? (
                <View style={styles.formatBox}>
                  <Text style={styles.formatLabel}>格式</Text>
                  <Text style={styles.formatValue} selectable>
                    {selected.format}
                  </Text>
                </View>
              ) : null}
              <View style={styles.rwBox}>
                <Text style={styles.rwLabel}>資料流向</Text>
                <Text style={styles.rwValue}>{selected?.rw}</Text>
              </View>
              <Text style={styles.sheetDetail}>{selected?.detail}</Text>
            </ScrollView>

            {/* 下半：解碼框，獨立滾動，不與說明區搶手勢 */}
            {decodedPretty ? (
              <View style={styles.decodeBox}>
                <Pressable
                  style={styles.decodeHeader}
                  onPress={() => {
                    Clipboard.setString(decodedPretty);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}>
                  <Text style={styles.decodeLabel}>
                    🔓 解碼（內容私有格式，僅 demo 觀察用）
                  </Text>
                  {copied ? (
                    <Text style={styles.copiedText}>已複製 ✓</Text>
                  ) : (
                    <Text style={styles.copyHint}>點此複製全文</Text>
                  )}
                </Pressable>
                <ScrollView
                  style={styles.decodeScroll}
                  nestedScrollEnabled
                  bounces={false}>
                  <Text style={styles.decodeValue} selectable>
                    {decodedPretty}
                  </Text>
                </ScrollView>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>關閉</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    backgroundColor: '#10151F',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A3342',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: MONO,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statText: {
    color: '#8B93A7',
    fontSize: 11,
    fontFamily: MONO,
  },
  controlText: {
    color: '#84CAFF',
    fontSize: 14,
    fontFamily: MONO,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  chip: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A3342',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: '#1849A9',
    borderColor: '#1849A9',
  },
  chipToggleOff: {
    backgroundColor: 'transparent',
  },
  chipText: {
    color: '#8B93A7',
    fontSize: 11,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A3342',
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  line: {
    fontFamily: MONO,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 1,
  },
  hint: {
    color: '#5A6478',
    fontSize: 11,
  },
  repeat: {
    color: '#FBBF24',
    fontSize: 11,
    fontFamily: MONO,
  },
  empty: {
    color: '#5A6478',
    fontSize: 12,
    fontFamily: MONO,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,8,16,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: '#151B28',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandleRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3342',
  },
  sheetInfo: {
    flexShrink: 1,
  },
  sheetKind: {
    color: '#84CAFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sheetTitle: {
    color: '#F2F4F7',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: MONO,
    marginBottom: 8,
  },
  sheetSummary: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  formatBox: {
    backgroundColor: '#0C111D',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  formatLabel: {
    color: '#8B93A7',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 3,
  },
  formatValue: {
    color: '#FBBF24',
    fontSize: 12,
    fontFamily: MONO,
  },
  rwBox: {
    backgroundColor: '#0C111D',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  rwLabel: {
    color: '#8B93A7',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 3,
  },
  rwValue: {
    color: '#4ADE80',
    fontSize: 12,
    fontFamily: MONO,
  },
  sheetDetail: {
    color: '#A6ADBB',
    fontSize: 13,
    lineHeight: 20,
  },
  decodeBox: {
    marginTop: 12,
    backgroundColor: '#0C111D',
    borderRadius: 8,
    padding: 10,
  },
  decodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  decodeLabel: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  copyHint: {
    color: '#84CAFF',
    fontSize: 11,
    marginLeft: 8,
  },
  copiedText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  decodeScroll: {
    height: 240,
  },
  decodeValue: {
    color: '#9FE8C3',
    fontSize: 11,
    fontFamily: MONO,
    lineHeight: 16,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: '#1849A9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
