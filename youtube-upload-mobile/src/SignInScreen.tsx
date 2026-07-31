import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { signIn } from './auth';

export default function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const result = await signIn();
    setLoading(false);
    if (result.ok) {
      onSignedIn();
    } else {
      setError(result.error);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>YouTube Upload Tool</Text>
      <Text style={styles.subtitle}>
        Sign in with a Google account that has a YouTube channel to upload videos.
      </Text>
      <Pressable style={styles.button} onPress={handleSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in with Google</Text>}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  subtitle: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#ff0000', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#ff6b6b', marginTop: 16, textAlign: 'center' },
});
