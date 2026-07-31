import { BACKEND_URL } from './config';

export type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

export type UploadMetadata = {
  title: string;
  description: string;
  tags: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
};

export type UploadStatus =
  | { phase: 'pending' }
  | { phase: 'youtube_upload'; percent: number }
  | { phase: 'thumbnail' }
  | { phase: 'done'; videoId: string; url: string }
  | { phase: 'error'; message: string };

function randomId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Uses XMLHttpRequest (rather than fetch) so we get upload progress events,
// which React Native's XHR implementation supports natively.
export function uploadVideo(
  token: string,
  video: PickedFile,
  thumbnail: PickedFile | null,
  metadata: UploadMetadata,
  onClientProgress: (percent: number) => void
): { uploadId: string; done: Promise<void> } {
  const uploadId = randomId();
  const formData = new FormData();
  formData.append('video', {
    uri: video.uri,
    name: video.name,
    type: video.mimeType || 'video/mp4',
  } as any);
  if (thumbnail) {
    formData.append('thumbnail', {
      uri: thumbnail.uri,
      name: thumbnail.name,
      type: thumbnail.mimeType || 'image/jpeg',
    } as any);
  }
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('tags', metadata.tags);
  formData.append('privacyStatus', metadata.privacyStatus);

  const done = new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/api/upload/${uploadId}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        onClientProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 400) {
        let message = 'Upload failed.';
        try {
          message = JSON.parse(xhr.responseText).error || message;
        } catch {
          // ignore parse failure, use default message
        }
        reject(new Error(message));
      } else {
        resolve();
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });

  return { uploadId, done };
}

export function pollUploadStatus(
  uploadId: string,
  onUpdate: (status: UploadStatus) => void
): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/upload/${uploadId}/status`);
      const status: UploadStatus = await res.json();
      onUpdate(status);
      if (status.phase === 'done' || status.phase === 'error') return;
    } catch {
      // transient network hiccup; keep polling
    }
    if (!stopped) setTimeout(tick, 1000);
  };

  tick();
  return () => {
    stopped = true;
  };
}
