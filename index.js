// Auditory Masking v0.0

const AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)();
const OUTPUT_GAIN = AUDIO_CONTEXT.createGain();

const NOISE_TRACK = {
  volume: 0.2,
  fadeTime: 2,
  gainNode: AUDIO_CONTEXT.createGain(),
  source: null,
  buffer: null,
  isPlaying: false,
  noiseFile: "./audio/rain.mp3",
};

const INTERCOM_TRACK = {
  stream: null,
  source: null,
  gainNode: AUDIO_CONTEXT.createGain(),
  volume: 0.02,
  isConnected: false,
};

OUTPUT_GAIN.connect(AUDIO_CONTEXT.destination);
NOISE_TRACK.gainNode.connect(OUTPUT_GAIN);

attachEvents();

///////////////////////////////////////////////////////////////////////////////////

function attachEvents() {
  document.getElementById("playNoise").onclick = playNoise;
  document.getElementById("intercom").onclick = playIntercom;

  document.getElementById("noise-volume").onclick = (e) => {
    setNoiseVolume(e.currentTarget.value);
  };
  document.getElementById("intercom-volume").onclick = (e) => {
    setIntercomVolume(e.currentTarget.value);
  };

  document.querySelectorAll('input[name="flavor"]').forEach((radio) => {
    radio.addEventListener("change", handleFlavorChange);
  });
}

///////////////////////////////////////////////////////////////////////////////////

async function loadNoiseBuffer(path) {
  const res = await fetch(path);
  const arrayBuffer = await res.arrayBuffer();
  NOISE_TRACK.buffer = await AUDIO_CONTEXT.decodeAudioData(arrayBuffer);
}

async function playNoise() {
  if (!NOISE_TRACK.buffer) await loadNoiseBuffer(NOISE_TRACK.noiseFile);
  NOISE_TRACK.source = AUDIO_CONTEXT.createBufferSource();
  NOISE_TRACK.source.buffer = NOISE_TRACK.buffer;
  NOISE_TRACK.source.loop = true;
  NOISE_TRACK.source.connect(NOISE_TRACK.gainNode);
  NOISE_TRACK.gainNode.gain.setValueAtTime(
    NOISE_TRACK.volume,
    AUDIO_CONTEXT.currentTime
  );

  NOISE_TRACK.source.start();
  NOISE_TRACK.isPlaying = true;

  document.getElementById("playNoise").onclick = stopNoise;
  document.getElementById("noise-label").innerText = "Stop Noise";
  document.getElementById("noise-icon").innerText = "volume_off";
}

async function stopNoise() {
  if (NOISE_TRACK.source) NOISE_TRACK.source.stop();
  NOISE_TRACK.isPlaying = false;

  document.getElementById("playNoise").onclick = playNoise;
  document.getElementById("noise-label").innerText = "Start Noise";
  document.getElementById("noise-icon").innerText = "volume_up";
}

async function setNoiseVolume(volume, time = 0) {
  const now = AUDIO_CONTEXT.currentTime;
  NOISE_TRACK.gainNode.gain.cancelScheduledValues(now);
  NOISE_TRACK.gainNode.gain.linearRampToValueAtTime(volume, now + time);
}

async function handleFlavorChange(e) {
  const selected = e.target.value;

  await stopNoise();
  NOISE_TRACK.buffer = null;

  if (selected === "whitenoise") {
    NOISE_TRACK.noiseFile = "./audio/noise.wav";
  } else if (selected === "rain") {
    NOISE_TRACK.noiseFile = "./audio/rain.mp3";
  }

  playNoise();
}

///////////////////////////////////////////////////////////////////////////////////

async function loadIntercom() {
  if (INTERCOM_TRACK.stream) return;

  const constraints = {
    audio: /*isAndroid()*/ false
      ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      : true, // default on desktop
  };

  INTERCOM_TRACK.stream = await navigator.mediaDevices.getUserMedia(
    constraints
  );
  INTERCOM_TRACK.source = AUDIO_CONTEXT.createMediaStreamSource(
    INTERCOM_TRACK.stream
  );
}

async function playIntercom() {
  await AUDIO_CONTEXT.resume();
  await loadIntercom();

  if (!INTERCOM_TRACK.isConnected) {
    INTERCOM_TRACK.source.connect(INTERCOM_TRACK.gainNode);
    INTERCOM_TRACK.gainNode.connect(OUTPUT_GAIN);
    INTERCOM_TRACK.isConnected = true;
  }

  setNoiseVolume(NOISE_TRACK.volume / 2, NOISE_TRACK.fadeTime);
  document.getElementById("intercom").onclick = stopIntercom;
  document.getElementById("intercom-label").innerText = "Stop Intercom";
  document.getElementById("intercom-icon").innerText = "mic_off";
}

async function stopIntercom() {
  if (INTERCOM_TRACK.isConnected && INTERCOM_TRACK.source) {
    INTERCOM_TRACK.source.disconnect();
    INTERCOM_TRACK.isConnected = false;
  }

  setNoiseVolume(NOISE_TRACK.volume, NOISE_TRACK.fadeTime);
  document.getElementById("intercom").onclick = playIntercom;
  document.getElementById("intercom-label").innerText = "Start Intercom";
  document.getElementById("intercom-icon").innerText = "mic";
}

async function setIntercomVolume(volume, time = 0) {
  const now = AUDIO_CONTEXT.currentTime;
  INTERCOM_TRACK.gainNode.gain.cancelScheduledValues(now);
  INTERCOM_TRACK.gainNode.gain.linearRampToValueAtTime(volume, now + time);
}
