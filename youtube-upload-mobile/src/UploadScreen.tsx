import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import ProgressBar from './ProgressBar';
import { clearToken, getStoredToken } from './auth';
import { uploadVideo, pollUploadStatus, PickedFile, UploadStatus } from './upload';

const PRIVACY_OPTIONS: Array<{ value: 'private' | 'unlisted' | 'public'; label: string }> = [
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'public', label: 'Public' },
];

export default function UploadScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const [video, setVideo] = useState<PickedFile | null>(null);
  const [thumbnail, setThumbnail] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('private');

  const [uploading, setUploading] = useState(false);
  const [clientProgress, setClientProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setVideo({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      if (!title) setTitle(asset.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const pickThumbnail = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setThumbnail({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    }
  };

  const handleUpload = async () => {
    if (!video) return;
    const token = await getStoredToken();
    if (!token) {
      onSignedOut();
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setClientProgress(0);
    setStatus(null);

    const { uploadId, done } = uploadVideo(
      token,
      video,
      thumbnail,
      { title, description, tags, privacyStatus },
      setClientProgress
    );

    const stopPolling = pollUploadStatus(uploadId, (s) => {
      setStatus(s);
      if (s.phase === 'error') {
        setErrorMessage(s.message);
        setUploading(false);
      }
    });

    try {
      await done;
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed.');
      setUploading(false);
      stopPolling();
      return;
    }
    // Server->YouTube progress and completion arrive via polling; stop the
    // timer once pollUploadStatus itself observes a terminal phase.
  };

  const isDone = status?.phase === 'done';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <View style={styles.topbar}>
        <Text style={styles.signedIn}>Signed in</Text>
        <Pressable
          onPress={async () => {
            await clearToken();
            onSignedOut();
          }}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Video</Text>
      <Pressable style={styles.pickerButton} onPress={pickVideo} disabled={uploading}>
        <Text style={styles.pickerButtonText}>{video ? video.name : 'Choose video file'}</Text>
      </Pressable>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        editable={!uploading}
        placeholder="Video title"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        maxLength={5000}
        editable={!uploading}
        multiline
        placeholder="Video description"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Tags (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={tags}
        onChangeText={setTags}
        editable={!uploading}
        placeholder="tag1, tag2, tag3"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Privacy</Text>
      <View style={styles.privacyRow}>
        {PRIVACY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.privacyOption, privacyStatus === opt.value && styles.privacyOptionSelected]}
            onPress={() => setPrivacyStatus(opt.value)}
            disabled={uploading}
          >
            <Text
              style={[
                styles.privacyOptionText,
                privacyStatus === opt.value && styles.privacyOptionTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Thumbnail (optional)</Text>
      <Pressable style={styles.pickerButton} onPress={pickThumbnail} disabled={uploading}>
        <Text style={styles.pickerButtonText}>{thumbnail ? thumbnail.name : 'Choose thumbnail image'}</Text>
      </Pressable>

      <Pressable
        style={[styles.uploadButton, (!video || uploading) && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={!video || uploading}
      >
        <Text style={styles.uploadButtonText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
      </Pressable>

      {uploading || status ? (
        <View style={styles.progressArea}>
          <ProgressBar label="Uploading to server" percent={clientProgress} />
          <ProgressBar
            label="Publishing to YouTube"
            percent={status?.phase === 'youtube_upload' ? status.percent : isDone ? 100 : 0}
          />
          {status?.phase === 'thumbnail' ? <Text style={styles.statusText}>Setting thumbnail…</Text> : null}
          {isDone && status?.phase === 'done' ? (
            <Text style={styles.statusText}>Done! {status.url}</Text>
          ) : null}
        </View>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 20, paddingBottom: 60 },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  signedIn: { color: '#aaa' },
  signOut: { color: '#aaa', textDecorationLine: 'underline' },
  label: { color: '#ccc', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    color: '#f1f1f1',
    padding: 10,
    fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  pickerButton: {
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 12,
  },
  pickerButtonText: { color: '#ccc' },
  privacyRow: { flexDirection: 'row', gap: 8 },
  privacyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  privacyOptionSelected: { backgroundColor: '#ff0000', borderColor: '#ff0000' },
  privacyOptionText: { color: '#ccc' },
  privacyOptionTextSelected: { color: '#fff', fontWeight: '600' },
  uploadButton: {
    backgroundColor: '#ff0000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  uploadButtonDisabled: { backgroundColor: '#5a1a1a' },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  progressArea: { marginTop: 24 },
  statusText: { color: '#9ad', fontSize: 13, marginTop: 4 },
  error: { color: '#ff6b6b', marginTop: 16 },
});
