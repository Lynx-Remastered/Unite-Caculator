/* Keep one audio element alive across all calculator views; start on user request. */
(() => {
  const audio = document.getElementById("bgmAudio");
  const toggle = document.getElementById("bgmToggleButton");
  const volume = document.getElementById("bgmVolume");
  const status = document.getElementById("bgmStatus");
  const volumeKey = "uniteCalculatorBgmVolume";
  let pending = false;
  let playRequest = 0;

  try {
    const saved = localStorage.getItem(volumeKey);
    const value = Number(saved);
    if (saved !== null && saved.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 100) {
      volume.value = String(value);
    }
  } catch (error) {
    // BGM also works when browser storage is unavailable.
  }

  function applyVolume() {
    audio.volume = Number(volume.value) / 100;
    audio.muted = Number(volume.value) === 0;
    volume.setAttribute("aria-valuetext", `${volume.value}%`);
    volume.title = `${volume.value}%`;
  }

  function render() {
    const active = pending || !audio.paused;
    toggle.textContent = pending ? "♪ 読込中…" : active ? "♪ BGM ON" : "♪ BGM OFF";
    toggle.setAttribute("aria-pressed", String(active));
    toggle.setAttribute("aria-label", active ? "BGMを停止" : "BGMを再生");
  }

  function showPlaybackError() {
    status.textContent = "BGMを再生できませんでした。再生ボタンで再試行できます。";
  }

  toggle.addEventListener("click", async () => {
    const request = ++playRequest;
    status.textContent = "";
    if (pending || !audio.paused) {
      pending = false;
      audio.pause();
      render();
      return;
    }

    pending = true;
    render();
    try {
      if (audio.error) audio.load();
      await audio.play();
    } catch (error) {
      // A stop or a newer play request may deliberately interrupt loading.
      if (request !== playRequest) return;
      audio.pause();
      showPlaybackError();
    } finally {
      if (request === playRequest) {
        pending = false;
        render();
      }
    }
  });

  volume.addEventListener("input", () => {
    applyVolume();
    try {
      localStorage.setItem(volumeKey, volume.value);
    } catch (error) {
      // Volume changes do not depend on saving the preference.
    }
  });

  audio.addEventListener("playing", () => {
    pending = false;
    status.textContent = "";
    render();
  });
  audio.addEventListener("pause", render);
  audio.addEventListener("error", () => {
    ++playRequest;
    pending = false;
    audio.pause();
    showPlaybackError();
    render();
  });

  applyVolume();
  render();
})();
