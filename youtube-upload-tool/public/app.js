const signedOutSection = document.getElementById('signed-out');
const signedInSection = document.getElementById('signed-in');
const authError = document.getElementById('auth-error');

const params = new URLSearchParams(window.location.search);
if (params.get('error')) {
  authError.textContent = 'Sign-in failed: ' + params.get('error');
  authError.hidden = false;
}

fetch('/api/session')
  .then((r) => r.json())
  .then(({ authenticated }) => {
    signedOutSection.hidden = authenticated;
    signedInSection.hidden = !authenticated;
  });

const form = document.getElementById('upload-form');
const submitBtn = document.getElementById('submit-btn');
const progressArea = document.getElementById('progress-area');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressLabel = document.getElementById('upload-progress-label');
const youtubeProgress = document.getElementById('youtube-progress');
const youtubeProgressLabel = document.getElementById('youtube-progress-label');
const statusMessage = document.getElementById('status-message');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  progressArea.hidden = false;
  statusMessage.textContent = '';
  uploadProgress.value = 0;
  youtubeProgress.value = 0;
  uploadProgressLabel.textContent = '0%';
  youtubeProgressLabel.textContent = '0%';

  const uploadId = crypto.randomUUID();
  const formData = new FormData(form);

  const source = new EventSource(`/api/upload/${uploadId}/progress`);
  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.phase === 'youtube_upload') {
      youtubeProgress.value = data.percent;
      youtubeProgressLabel.textContent = `${data.percent}%`;
    } else if (data.phase === 'thumbnail') {
      statusMessage.textContent = 'Setting thumbnail...';
    } else if (data.phase === 'done') {
      youtubeProgress.value = 100;
      youtubeProgressLabel.textContent = '100%';
      statusMessage.innerHTML = `Done! <a href="${data.url}" target="_blank" rel="noopener">View on YouTube</a>`;
      submitBtn.disabled = false;
      source.close();
    } else if (data.phase === 'error') {
      statusMessage.textContent = `Error: ${data.message}`;
      submitBtn.disabled = false;
      source.close();
    }
  };
  source.onerror = () => {
    // Connection closed by server after completion/error is expected; ignore silently.
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/upload/${uploadId}`);
  xhr.upload.onprogress = (evt) => {
    if (evt.lengthComputable) {
      const percent = Math.round((evt.loaded / evt.total) * 100);
      uploadProgress.value = percent;
      uploadProgressLabel.textContent = `${percent}%`;
    }
  };
  xhr.onload = () => {
    if (xhr.status >= 400) {
      let message = 'Upload failed.';
      try {
        message = JSON.parse(xhr.responseText).error || message;
      } catch (_) {}
      statusMessage.textContent = message;
      submitBtn.disabled = false;
      source.close();
    }
  };
  xhr.onerror = () => {
    statusMessage.textContent = 'Network error during upload.';
    submitBtn.disabled = false;
    source.close();
  };
  xhr.send(formData);
});
