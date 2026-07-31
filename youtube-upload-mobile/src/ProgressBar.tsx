import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
      </View>
      <Text style={styles.percent}>{Math.round(percent)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  label: { color: '#ccc', fontSize: 13, marginBottom: 4 },
  track: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#ff0000' },
  percent: { color: '#888', fontSize: 12, marginTop: 2, textAlign: 'right' },
});
