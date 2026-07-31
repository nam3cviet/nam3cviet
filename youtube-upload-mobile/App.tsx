import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getStoredToken } from './src/auth';
import SignInScreen from './src/SignInScreen';
import UploadScreen from './src/UploadScreen';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    getStoredToken().then((token) => {
      setSignedIn(!!token);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      {signedIn ? (
        <UploadScreen onSignedOut={() => setSignedIn(false)} />
      ) : (
        <SignInScreen onSignedIn={() => setSignedIn(true)} />
      )}
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' },
});
