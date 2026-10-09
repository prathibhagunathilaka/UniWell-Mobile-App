import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

export type LineSeries = { name: string; color: string; values: number[] };

const Y_LABEL_W = 30;
const PAD_TOP = 8;
const X_LABEL_H = 22;

// Dependency-free line chart (plain Views), so it works on iOS, Android and web without extra packages.
export function LineChart({ labels, series, height = 190 }: { labels: string[]; series: LineSeries[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const n = labels.length;
  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const yMax = rawMax <= 4 ? 4 : Math.ceil(rawMax / 4) * 4; // 4 even grid steps
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);

  const plotW = Math.max(0, width - Y_LABEL_W - 8);
  const plotH = height - PAD_TOP - X_LABEL_H;
  const x = (i: number) => Y_LABEL_W + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_TOP + plotH - (v / yMax) * plotH;

  // At most ~5 evenly spaced x labels.
  const labelEvery = Math.max(1, Math.ceil(n / 5));
  const showDots = n <= 20;

  const summary = series.map((s) => `${s.name}: ${s.values.reduce((a, b) => a + b, 0)} in total`).join('. ');

  return (
    <View accessible accessibilityLabel={`Line chart over ${n} weeks. ${summary}`}>
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 ? (
          <>
            {ticks.map((t) => (
              <View key={t} style={[styles.gridRow, { top: y(t) }]}>
                <Text style={styles.yLabel}>{Math.round(t)}</Text>
                <View style={styles.gridLine} />
              </View>
            ))}

            {series.map((s) => (
              <View key={s.name} style={StyleSheet.absoluteFill} pointerEvents="none">
                {s.values.slice(1).map((v, idx) => {
                  const x1 = x(idx);
                  const y1 = y(s.values[idx]);
                  const dx = x(idx + 1) - x1;
                  const dy = y(v) - y1;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  return (
                    <View
                      key={`${s.name}-seg-${idx}`}
                      style={{
                        position: 'absolute',
                        left: x1,
                        top: y1 - 1.25,
                        width: len,
                        height: 2.5,
                        borderRadius: 2,
                        backgroundColor: s.color,
                        // Rotate around the segment's left end.
                        transform: [{ translateX: -len / 2 }, { rotate: `${Math.atan2(dy, dx)}rad` }, { translateX: len / 2 }],
                      }}
                    />
                  );
                })}
                {showDots
                  ? s.values.map((v, idx) => (
                      <View key={`${s.name}-dot-${idx}`} style={{ position: 'absolute', left: x(idx) - 3.5, top: y(v) - 3.5, width: 7, height: 7, borderRadius: 4, backgroundColor: s.color, borderWidth: 1, borderColor: Colors.white }} />
                    ))
                  : null}
              </View>
            ))}

            {labels.map((label, i) =>
              i % labelEvery === 0 || i === n - 1 ? (
                <Text key={`${label}-${i}`} style={[styles.xLabel, { left: Math.min(Math.max(x(i) - 26, Y_LABEL_W - 10), width - 52), top: PAD_TOP + plotH + 6 }]} numberOfLines={1}>{label}</Text>
              ) : null,
            )}
          </>
        ) : null}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.name} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Simple labelled horizontal bars.
export function BarList({ rows, color = Colors.secondary, emptyText = 'Nothing to show for this period.' }: { rows: { label: string; value: number }[]; color?: string; emptyText?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return <Text style={styles.empty}>{emptyText}</Text>;
  return (
    <View style={styles.bars}>
      {rows.map((r) => (
        <View key={r.label} style={styles.barRow} accessible accessibilityLabel={`${r.label}: ${r.value}`}>
          <Text style={styles.barLabel}>{r.label}</Text>
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(r.value / max) * 100}%`, backgroundColor: color }]} /></View>
          <Text style={styles.barValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: { position: 'absolute', left: 0, right: 0, height: 0, flexDirection: 'row', alignItems: 'center' },
  yLabel: { width: Y_LABEL_W - 6, textAlign: 'right', color: Colors.muted, fontSize: 10, marginTop: -1 },
  gridLine: { flex: 1, height: 1, marginLeft: 6, backgroundColor: Colors.border },
  xLabel: { position: 'absolute', width: 52, textAlign: 'center', color: Colors.muted, fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, marginTop: Space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 4, borderRadius: 2 },
  legendText: { color: Colors.muted, fontSize: 12, fontWeight: '700' },
  empty: { color: Colors.muted, fontSize: 13 },
  bars: { gap: Space.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  barLabel: { width: 74, color: Colors.muted, fontSize: 12 },
  barTrack: { flex: 1, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: Radius.pill },
  barValue: { width: 30, textAlign: 'right', color: Colors.accent, fontSize: 12, fontWeight: '800' },
});
