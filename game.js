const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const rewindBtn = document.getElementById("rewindBtn");
const forwardBtn = document.getElementById("forwardBtn");
const seekSlider = document.getElementById("seekSlider");
const volumeSlider = document.getElementById("volumeSlider");
const speedSelect = document.getElementById("speedSelect");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const fileInput = document.getElementById("fileInput");
const playlistEl = document.getElementById("playlist");
const trackTitleEl = document.getElementById("trackTitle");
const trackSourceEl = document.getElementById("trackSource");
const coverArtEl = document.getElementById("coverArt");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const playerStateEl = document.getElementById("playerState");
const visualizer = document.getElementById("visualizer");
const canvasContext = visualizer.getContext("2d");

const tracks = [
  {
    title: "DNA - Kendrick Lamar",
    artist: "Kendrick Lamar",
    source: "Built-in tape",
    url: "dna_kendrick_lamar.mp3",
    cover: "",
    licenseUrl: "",
    duration: ""
  },
  {
    title: "Slow Down",
    artist: "Bobby V",
    source: "Built-in tape",
    url: "bobby-v-slow-down-12-version-128-ytshorts.savetube.me.mp3",
    cover: "",
    licenseUrl: "",
    duration: ""
  },
  {
    title: "Candy Rain",
    artist: "Soul for Real",
    source: "Built-in tape",
    url: "Candy Rain - Soul for Real .mp3",
    cover: "",
    licenseUrl: "",
    duration: ""
  },
  {
    title: "Freaky in the Club",
    artist: "R. Kelly",
    source: "Built-in tape",
    url: "r-kelly-freaky-in-the-club-128-ytshorts.savetube.me.mp3",
    cover: "",
    licenseUrl: "",
    duration: ""
  }
];

let activeTrackIndex = 0;
let isSeeking = false;
let isShuffleOn = false;
let isRepeatOn = false;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let visualizerFrame = null;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function cleanFileName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
}

function renderPlaylist() {
  playlistEl.innerHTML = "";

  tracks.forEach((track, index) => {
    const button = document.createElement("button");
    button.className = `track ${index === activeTrackIndex ? "active" : ""}`.trim();
    button.type = "button";
    button.addEventListener("click", () => loadTrack(index, true));

    const trackIndex = document.createElement("span");
    const trackCover = document.createElement("img");
    const trackName = document.createElement("span");
    const trackTitle = document.createElement("span");
    const trackArtist = document.createElement("span");
    const trackTime = document.createElement("span");

    trackIndex.className = "track-index";
    trackCover.className = "track-cover";
    trackName.className = "track-name";
    trackTitle.className = "track-title";
    trackArtist.className = "track-artist";
    trackTime.className = "track-time";

    trackIndex.textContent = String(index + 1).padStart(2, "0");
    trackCover.alt = "";
    if (track.cover) {
      trackCover.src = track.cover;
    }
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || track.source;
    trackTime.textContent = track.duration || "--:--";

    trackName.append(trackTitle, trackArtist);
    button.append(trackIndex, trackCover, trackName, trackTime);

    playlistEl.appendChild(button);
  });
}

function updateTrackDetails() {
  const track = tracks[activeTrackIndex];
  trackTitleEl.textContent = track.title;
  trackSourceEl.textContent = track.artist ? `${track.artist} - ${track.source}` : track.source;
  if (track.cover) {
    coverArtEl.src = track.cover;
  } else {
    coverArtEl.removeAttribute("src");
  }
  playerStateEl.textContent = audio.paused ? "Stopped" : "Playing";
  renderPlaylist();
}

function setTrackAudioSource(track) {
  audio.removeAttribute("crossorigin");
  audio.src = track.url;
}

function loadTrack(index, shouldPlay = false) {
  const wasPlaying = !audio.paused;

  if (visualizerFrame) {
    cancelAnimationFrame(visualizerFrame);
    visualizerFrame = null;
  }

  activeTrackIndex = index;
  setTrackAudioSource(tracks[activeTrackIndex]);
  audio.load();
  updateTrackDetails();

  if (shouldPlay || wasPlaying) {
    playAudio();
  }
}

async function playAudio() {
  setupVisualizer();

  try {
    await audio.play();
    playBtn.textContent = "Pause";
    playBtn.setAttribute("aria-label", "Pause");
    playerStateEl.textContent = "Playing";
    if (analyser) {
      if (visualizerFrame) {
        cancelAnimationFrame(visualizerFrame);
      }

      drawVisualizer();
    }
  } catch (error) {
    playerStateEl.textContent = "Tap Play";
  }
}

function pauseAudio() {
  audio.pause();
  playBtn.textContent = "Play";
  playBtn.setAttribute("aria-label", "Play");
  playerStateEl.textContent = "Paused";
}

function togglePlay() {
  if (audio.paused) {
    playAudio();
  } else {
    pauseAudio();
  }
}

function getNextIndex(direction = 1) {
  if (isShuffleOn && tracks.length > 1) {
    let randomIndex = activeTrackIndex;

    while (randomIndex === activeTrackIndex) {
      randomIndex = Math.floor(Math.random() * tracks.length);
    }

    return randomIndex;
  }

  return (activeTrackIndex + direction + tracks.length) % tracks.length;
}

function skipTrack(direction) {
  loadTrack(getNextIndex(direction), true);
}

function updateProgress() {
  if (!isSeeking && Number.isFinite(audio.duration)) {
    seekSlider.value = String((audio.currentTime / audio.duration) * 100);
  }

  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
}

function setupVisualizer() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
  }

  if (!sourceNode) {
    sourceNode = audioContext.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function drawVisualizer() {
  if (!analyser) {
    return;
  }

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  canvasContext.clearRect(0, 0, visualizer.width, visualizer.height);
  canvasContext.fillStyle = "rgba(9, 12, 15, 0.55)";
  canvasContext.fillRect(0, 0, visualizer.width, visualizer.height);

  const barWidth = visualizer.width / data.length;

  data.forEach((value, index) => {
    const barHeight = (value / 255) * visualizer.height;
    const x = index * barWidth;
    const y = visualizer.height - barHeight;
    const hue = index % 2 === 0 ? "#73fbd3" : "#ff4f9a";

    canvasContext.fillStyle = hue;
    canvasContext.fillRect(x + 2, y, Math.max(3, barWidth - 5), barHeight);
  });

  visualizerFrame = requestAnimationFrame(drawVisualizer);
}

function drawIdleVisualizer() {
  canvasContext.clearRect(0, 0, visualizer.width, visualizer.height);
  canvasContext.fillStyle = "rgba(9, 12, 15, 0.7)";
  canvasContext.fillRect(0, 0, visualizer.width, visualizer.height);

  for (let i = 0; i < 32; i++) {
    const height = 20 + ((i * 17) % 90);
    const x = i * 20;

    canvasContext.fillStyle = i % 2 === 0 ? "#73fbd3" : "#f9c846";
    canvasContext.fillRect(x, visualizer.height - height, 10, height);
  }
}

playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", () => skipTrack(-1));
nextBtn.addEventListener("click", () => skipTrack(1));

rewindBtn.addEventListener("click", () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
});

forwardBtn.addEventListener("click", () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
});

seekSlider.addEventListener("input", () => {
  isSeeking = true;
  const previewTime = (Number(seekSlider.value) / 100) * (audio.duration || 0);
  currentTimeEl.textContent = formatTime(previewTime);
});

seekSlider.addEventListener("change", () => {
  audio.currentTime = (Number(seekSlider.value) / 100) * (audio.duration || 0);
  isSeeking = false;
});

volumeSlider.addEventListener("input", () => {
  audio.volume = Number(volumeSlider.value);
});

speedSelect.addEventListener("change", () => {
  audio.playbackRate = Number(speedSelect.value);
});

shuffleBtn.addEventListener("click", () => {
  isShuffleOn = !isShuffleOn;
  shuffleBtn.setAttribute("aria-pressed", String(isShuffleOn));
});

repeatBtn.addEventListener("click", () => {
  isRepeatOn = !isRepeatOn;
  repeatBtn.setAttribute("aria-pressed", String(isRepeatOn));
});

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);

  files.forEach((file) => {
    tracks.push({
      title: cleanFileName(file.name),
      artist: "Local file",
      source: "Local tape",
      url: URL.createObjectURL(file),
      cover: "",
      licenseUrl: "",
      duration: ""
    });
  });

  renderPlaylist();
  fileInput.value = "";
});

audio.addEventListener("loadedmetadata", () => {
  tracks[activeTrackIndex].duration = formatTime(audio.duration);
  updateProgress();
  renderPlaylist();
});

audio.addEventListener("timeupdate", updateProgress);

audio.addEventListener("play", () => {
  playBtn.textContent = "Pause";
  playerStateEl.textContent = "Playing";
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "Play";

  if (audio.currentTime < audio.duration) {
    playerStateEl.textContent = "Paused";
  }

  if (visualizerFrame) {
    cancelAnimationFrame(visualizerFrame);
    visualizerFrame = null;
  }
});

audio.addEventListener("waiting", () => {
  playerStateEl.textContent = "Buffering";
});

audio.addEventListener("stalled", () => {
  playerStateEl.textContent = "Loading";
});

audio.addEventListener("canplay", () => {
  if (!audio.paused) {
    playerStateEl.textContent = "Playing";
  }
});

audio.addEventListener("error", () => {
  playerStateEl.textContent = "Audio error";
});

audio.addEventListener("ended", () => {
  if (isRepeatOn) {
    audio.currentTime = 0;
    playAudio();
    return;
  }

  if (tracks.length === 1) {
    audio.currentTime = 0;
    playerStateEl.textContent = "Stopped";
    return;
  }

  skipTrack(1);
});

document.addEventListener("keydown", (event) => {
  const tagName = document.activeElement.tagName.toLowerCase();

  if (tagName === "input" || tagName === "select" || tagName === "button") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  }

  if (event.key === "ArrowLeft") {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  }

  if (event.key === "ArrowRight") {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  }
});

audio.volume = Number(volumeSlider.value);
audio.playbackRate = Number(speedSelect.value);
setTrackAudioSource(tracks[activeTrackIndex]);
renderPlaylist();
updateTrackDetails();
drawIdleVisualizer();
