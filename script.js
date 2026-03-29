/* ═══════════════════════════════════════════
   SECTION 1 — CONSTANTS AND DATA
   ═══════════════════════════════════════════ */

const IMAGE_SIZE = { width: 1600, height: 900 };

const hotspotCoords = {
  window:    { x: 0.54 * IMAGE_SIZE.width, y: 0.35 * IMAGE_SIZE.height },
  monitor:   { x: 0.87 * IMAGE_SIZE.width, y: 0.18 * IMAGE_SIZE.height },
  papers:    { x: 0.42 * IMAGE_SIZE.width, y: 0.55 * IMAGE_SIZE.height },
  bookshelf: { x: 0.13 * IMAGE_SIZE.width, y: 0.48 * IMAGE_SIZE.height },
  bed:       { x: 0.85 * IMAGE_SIZE.width, y: 0.65 * IMAGE_SIZE.height },
  light:     { x: 0.50 * IMAGE_SIZE.width, y: 0.13 * IMAGE_SIZE.height },
};

const heartPoint = {
  x: (hotspotCoords.papers.x + hotspotCoords.window.x) / 2,
  y: (hotspotCoords.papers.y + hotspotCoords.window.y) / 2,
};

const whisperCopy = {
  monitor: {
    eyebrow: "Monitor // Dream Projects",
    title: "Dream Projects",
    content: `
      <p>The machine glow holds experiments Husain keeps returning to:</p>
      <ul>
        <li><strong>Monsoon Pulse:</strong> rainfall anomaly modeling from noisy regional weather streams.</li>
        <li><strong>Night Shift Classifier:</strong> lightweight vision model for low-light scene understanding.</li>
        <li><strong>Signal Atlas:</strong> an ML notebook-to-story engine for explaining model behavior in plain language.</li>
      </ul>
    `,
  },
  papers: {
    eyebrow: "Desk Surface // Skills",
    title: "Skills",
    content: `
      <p>Skills he keeps sharpening in ML and data work:</p>
      <ul>
        <li>Python, SQL, statistics, feature engineering, model evaluation</li>
        <li>Scikit-learn, PyTorch basics, experiment tracking, data storytelling</li>
        <li>Reproducible pipelines and a practical deployment mindset</li>
      </ul>
    `,
  },
  bookshelf: {
    eyebrow: "Bookshelf // Notes",
    title: "Blog observations",
    content: `
      <p>Small thoughts, logged between training runs:</p>
      <ul>
        <li>"The best feature is sometimes the one you almost deleted."</li>
        <li>"Metrics improve twice: once in code, once in communication."</li>
        <li>"Uncertainty is not failure; it is where better questions begin."</li>
      </ul>
    `,
  },
  bed: {
    eyebrow: "Bed // About Husain",
    title: "About Husain",
    content: `
      <p>CS undergraduate at RTU Kota, currently building his path through data science and machine learning projects.</p>
      <p>He enjoys translating messy real-world data into stories with direction, and prototypes ideas quickly before polishing them for impact.</p>
      <p>When the room is quiet, he is usually refining one more model or one more sentence.</p>
    `,
  },
  window: {
    eyebrow: "Window // Hero Moment",
    title: "Husain Bohra",
    content: `
      <p style="font-size:1.1rem;color:#edf1ff;margin-bottom:6px;">Data Scientist in the making</p>
      <p style="font-family:'Space Grotesk',sans-serif;font-size:1.25rem;color:#ffd089;">"I find signal in the noise."</p>
      <p>
        CS Undergraduate, RTU Kota<br />
        <a href="https://github.com/Husain-Bohra" target="_blank" rel="noreferrer">github.com/Husain-Bohra</a>
      </p>
    `,
  },
};

const VOLUME = {
  night: 0.99,
  day: 0.99,
  transition: 0.8,
};

const DRAG_THRESHOLD_PX = 12;

/* ═══════════════════════════════════════════
   SECTION 2 — DOM REFERENCES
   ═══════════════════════════════════════════ */

let bgVideo = document.getElementById("bg-video");
const whiteout = document.getElementById("whiteout");
const landing = document.getElementById("landing");
const lightToggle = document.getElementById("light-toggle");

const hotspots = Array.from(document.querySelectorAll(".hotspot"));
const card = document.getElementById("whisper-card");
const closeCardBtn = document.getElementById("close-card");

const cardEyebrow = document.getElementById("card-eyebrow");
const cardTitle = document.getElementById("card-title");
const cardContent = document.getElementById("card-content");

const roomContainer = document.getElementById("room-container");
const roomMap = document.getElementById("room-map");
const diagEl = document.getElementById("diag");

/* ═══════════════════════════════════════════
   SECTION 3 — STATE VARIABLES
   ═══════════════════════════════════════════ */

let activeKey = null;
let pendingCardTimer = null;
let suppressCloseUntil = 0;

let mapX = 0;
let mapY = 0;

let isPointerDown = false;
let isDragging = false;
let dragPointerId = null;
let lastPointerX = 0;
let lastPointerY = 0;
let dragDistance = 0;

let isDay = false;
let isTransitioning = false;
let userHasInteracted = false;
let intentionalPause = false;
let lastKnownTime = 0;
let frozenCheckTimer = null;
let consecutiveFreezes = 0;
let keepAliveBackoff = 0;
let currentVideoSrc = "./assets/nighttime.mp4";
let transitionFallbackTimer = null;
const videoBlobUrls = {};
let blobsReady = false;

/* ═══════════════════════════════════════════
   SECTION 4 — INITIALIZATION
   ═══════════════════════════════════════════ */

const isMobile = window.innerWidth <= 768
  || /Mobi|Android/i.test(navigator.userAgent);

/* ═══════════════════════════════════════════
   SECTION 5 — DIAGNOSTIC SYSTEM
   ═══════════════════════════════════════════ */

const diagLog = [];
const MAX_DIAG = 25;

function diag(msg) {
  if (!isMobile || !diagEl) return;
  const t = (performance.now() / 1000).toFixed(1);
  diagLog.push(`[${t}s] ${msg}`);
  if (diagLog.length > MAX_DIAG) diagLog.shift();
  diagEl.textContent = diagLog.join("\n");
}

const TRACKED_EVENTS = [
  "play", "playing", "pause", "ended", "stalled",
  "waiting", "error", "suspend", "emptied", "loadeddata", "canplay"
];

function attachDiagListeners(vid) {
  TRACKED_EVENTS.forEach(evt => {
    vid.addEventListener(evt, () => {
      diag(`${evt} p=${vid.paused} t=${vid.currentTime.toFixed(1)} rs=${vid.readyState} ns=${vid.networkState}`);
    });
  });
}

/* ═══════════════════════════════════════════
   SECTION 5b — VIDEO BLOB PRELOADER
   ═══════════════════════════════════════════ */

function videoSrc(filename) {
  return videoBlobUrls[filename] || `./assets/${filename}`;
}

async function preloadVideoBlobs() {
  if (!isMobile) return;
  diag("preloading video blobs...");
  const files = ["nighttime.mp4", "daytime.mp4", "transition.mp4"];
  await Promise.all(files.map(async (file) => {
    try {
      const resp = await fetch(`./assets/${file}`);
      const blob = await resp.blob();
      videoBlobUrls[file] = URL.createObjectURL(blob);
      diag(`blob: ${file} (${(blob.size / 1024).toFixed(0)}KB)`);
    } catch (e) {
      diag(`blob FAIL: ${file} ${e.message}`);
    }
  }));
  blobsReady = true;

  currentVideoSrc = videoSrc("nighttime.mp4");
  intentionalPause = true;
  bgVideo.src = currentVideoSrc;
  bgVideo.load();
  intentionalPause = false;
  bgVideo.play().catch(() => {});
  diag("swapped to blob source");
  startCanvasRenderer();
}

/* ═══════════════════════════════════════════
   SECTION 5c — CANVAS RENDERER (MOBILE)
   ═══════════════════════════════════════════ */

let bgCanvas = null;
let bgCtx = null;
let canvasActive = false;

function startCanvasRenderer() {
  if (!isMobile || canvasActive) return;

  bgCanvas = document.createElement("canvas");
  bgCanvas.width = 1600;
  bgCanvas.height = 900;
  bgCanvas.className = "room-bg";
  bgCanvas.id = "bg-canvas";

  bgVideo.parentNode.insertBefore(bgCanvas, bgVideo);

  bgVideo.style.position = "absolute";
  bgVideo.style.width = "1px";
  bgVideo.style.height = "1px";
  bgVideo.style.opacity = "0";

  bgCtx = bgCanvas.getContext("2d");
  canvasActive = true;

  let lastDrawTime = 0;
  let sameFrameCount = 0;
  let lastFrameTime = -1;

  function drawLoop() {
    if (!canvasActive) return;

    if (bgVideo.readyState >= 2) {
      bgCtx.drawImage(bgVideo, 0, 0, 1600, 900);

      const ct = bgVideo.currentTime;
      if (Math.abs(ct - lastFrameTime) < 0.001) {
        sameFrameCount++;
        if (sameFrameCount === 60) {
          diag(`canvas: stuck t=${ct.toFixed(2)}, seeking`);
          bgVideo.currentTime = ct + 0.05;
          bgVideo.play().catch(() => {});
        }
        if (sameFrameCount === 180) {
          diag(`canvas: hard stuck, reloading`);
          bgVideo.load();
          bgVideo.play().catch(() => {});
          sameFrameCount = 0;
        }
      } else {
        sameFrameCount = 0;
      }
      lastFrameTime = ct;
    }

    requestAnimationFrame(drawLoop);
  }

  requestAnimationFrame(drawLoop);
  diag("canvas renderer started");
}

/* ═══════════════════════════════════════════
   SECTION 6 — FUNCTIONS
   ═══════════════════════════════════════════ */

function positionHotspots() {
  hotspots.forEach((spot) => {
    const key = spot.dataset.key;
    const point = hotspotCoords[key];
    if (!point) return;

    spot.style.left = `${point.x}px`;
    spot.style.top = `${point.y}px`;
  });
}

function getMapBounds() {
  const vw = roomContainer ? roomContainer.clientWidth : window.innerWidth;
  const vh = roomContainer ? roomContainer.clientHeight : window.innerHeight;
  const minX = Math.min(0, vw - IMAGE_SIZE.width);
  const maxX = Math.max(0, vw - IMAGE_SIZE.width);
  const minY = Math.min(0, vh - IMAGE_SIZE.height);
  const maxY = Math.max(0, vh - IMAGE_SIZE.height);
  return { minX, maxX, minY, maxY };
}

function applyMapTransform() {
  if (!roomMap) return;
  roomMap.style.transform = `translate(${mapX}px, ${mapY}px)`;
}

function clampMapToBounds() {
  const { minX, maxX, minY, maxY } = getMapBounds();
  mapX = Math.max(minX, Math.min(maxX, mapX));
  mapY = Math.max(minY, Math.min(maxY, mapY));
}

function centerMapOnHeart() {
  if (!roomContainer) return;
  const vw = roomContainer.clientWidth;
  const vh = roomContainer.clientHeight;
  mapX = vw / 2 - heartPoint.x;
  mapY = vh / 2 - heartPoint.y;
  clampMapToBounds();
  applyMapTransform();
}

function renderCard(key) {
  const copy = whisperCopy[key];
  if (!copy) return;

  const updateCard = () => {
    cardEyebrow.textContent = copy.eyebrow;
    cardTitle.textContent = copy.title;
    cardContent.innerHTML = copy.content;
    card.classList.add("open");
  };

  if (card.classList.contains("open")) {
    card.classList.remove("open");
    if (pendingCardTimer) window.clearTimeout(pendingCardTimer);
    pendingCardTimer = window.setTimeout(updateCard, 220);
  } else {
    updateCard();
  }

  hotspots.forEach((spot) => {
    spot.classList.toggle("is-active", spot.dataset.key === key);
  });
}

function activateHotspot(key) {
  if (activeKey === key) return;
  activeKey = key;
  renderCard(activeKey);
}

function closeCard() {
  card.classList.remove("open");
  hotspots.forEach((spot) => spot.classList.remove("is-active"));
  activeKey = null;
  if (pendingCardTimer) window.clearTimeout(pendingCardTimer);
  pendingCardTimer = null;
}

/* ═══════════════════════════════════════════
   SECTION 7 — VIDEO RECOVERY SYSTEM
   ═══════════════════════════════════════════ */

function keepVideoAlive() {
  if (intentionalPause || !userHasInteracted || bgVideo.ended) return;
  if (keepAliveBackoff > 0) {
    keepAliveBackoff--;
    return;
  }
  keepAliveBackoff = 2;
  diag("keepAlive: retry play()");
  bgVideo.play().catch((e) => {
    diag(`keepAlive FAIL: ${e.name}`);
  });
}

function onVideoEnded() {
  if (isTransitioning) {
    finishTransition();
    return;
  }
  diag("manual-loop: seek→0");
  bgVideo.currentTime = 0;
  bgVideo.play().catch((e) => {
    diag(`loop-play FAIL: ${e.name}`);
  });
}

function onVideoError() {
  const err = bgVideo.error;
  diag(`VIDEO ERROR: code=${err?.code} msg=${err?.message}`);
  if (isTransitioning) {
    finishTransition();
  }
}

function attachVideoListeners(vid) {
  attachDiagListeners(vid);
  vid.addEventListener("pause", keepVideoAlive);
  vid.addEventListener("ended", onVideoEnded);
  vid.addEventListener("error", onVideoError);
}

function replaceVideoElement() {
  diag("NUCLEAR: destroying + recreating <video>");
  intentionalPause = true;
  stopFrozenCheck();

  const parent = bgVideo.parentNode;

  const newVideo = document.createElement("video");
  newVideo.id = "bg-video";
  newVideo.className = "room-bg";
  newVideo.src = currentVideoSrc;
  newVideo.muted = true;
  newVideo.playsInline = true;
  newVideo.preload = "auto";
  newVideo.setAttribute("playsinline", "");
  newVideo.setAttribute("muted", "");
  newVideo.setAttribute("preload", "auto");

  if (canvasActive) {
    newVideo.style.position = "absolute";
    newVideo.style.width = "1px";
    newVideo.style.height = "1px";
    newVideo.style.opacity = "0";
  }

  bgVideo.removeAttribute("src");
  bgVideo.load();
  parent.insertBefore(newVideo, bgVideo);
  bgVideo.remove();

  bgVideo = newVideo;
  attachVideoListeners(bgVideo);

  intentionalPause = false;
  bgVideo.play().catch((e) => {
    diag(`nuclear-play FAIL: ${e.name}`);
  });
  startFrozenCheck();
}

function startFrozenCheck() {
  stopFrozenCheck();
  lastKnownTime = bgVideo.currentTime;
  consecutiveFreezes = 0;
  frozenCheckTimer = setInterval(() => {
    if (intentionalPause || bgVideo.paused || bgVideo.ended || !userHasInteracted) {
      lastKnownTime = bgVideo.currentTime;
      consecutiveFreezes = 0;
      return;
    }
    if (Math.abs(bgVideo.currentTime - lastKnownTime) < 0.01) {
      consecutiveFreezes++;
      diag(`FROZEN #${consecutiveFreezes} t=${bgVideo.currentTime.toFixed(2)} rs=${bgVideo.readyState} ns=${bgVideo.networkState}`);
      if (consecutiveFreezes >= 3) {
        replaceVideoElement();
      } else if (consecutiveFreezes >= 2) {
        diag("escalate: load() + seek + play()");
        const t = bgVideo.currentTime;
        bgVideo.load();
        bgVideo.currentTime = t;
        bgVideo.play().catch(() => {});
      } else {
        bgVideo.play().catch(() => {});
      }
    } else {
      consecutiveFreezes = 0;
    }
    lastKnownTime = bgVideo.currentTime;
  }, 1500);
}

function stopFrozenCheck() {
  if (frozenCheckTimer) {
    clearInterval(frozenCheckTimer);
    frozenCheckTimer = null;
  }
}

/* ═══════════════════════════════════════════
   SECTION 8 — DAY/NIGHT TOGGLE
   ═══════════════════════════════════════════ */

function finishTransition() {
  if (!isTransitioning) return;
  if (transitionFallbackTimer) {
    clearTimeout(transitionFallbackTimer);
    transitionFallbackTimer = null;
  }

  intentionalPause = true;
  isDay = !isDay;
  const targetFile = isDay ? "daytime.mp4" : "nighttime.mp4";
  currentVideoSrc = videoSrc(targetFile);
  bgVideo.src = currentVideoSrc;
  bgVideo.load();
  intentionalPause = false;
  bgVideo.play().catch(() => {});
  startFrozenCheck();
  isTransitioning = false;
  diag(`transition → ${currentVideoSrc.split("/").pop()}`);
}

function toggleDayNight() {
  if (isTransitioning) return;
  isTransitioning = true;
  intentionalPause = true;
  stopFrozenCheck();

  whiteout.classList.add("active");

  bgVideo.src = videoSrc("transition.mp4");
  bgVideo.load();
  intentionalPause = false;
  bgVideo.play().catch(() => {});

  setTimeout(() => {
    whiteout.classList.remove("active");
  }, 800);

  transitionFallbackTimer = setTimeout(finishTransition, 10000);
  diag("toggle: started transition");
}

/* ═══════════════════════════════════════════
   SECTION 9 — MAP PANNING
   ═══════════════════════════════════════════ */

function onPointerDown(e) {
  if (e.target && e.target.closest(".hotspot")) return;
  if (!roomContainer || !roomMap) return;
  if (e.target && e.target.closest(".whisper-card")) return;

  roomContainer.classList.add("dragging");
  isPointerDown = true;
  isDragging = false;
  dragPointerId = e.pointerId;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  dragDistance = 0;
}

function onPointerMove(e) {
  if (!isPointerDown || e.pointerId !== dragPointerId) return;
  const dx = e.clientX - lastPointerX;
  const dy = e.clientY - lastPointerY;
  dragDistance += Math.hypot(dx, dy);

  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  if (!isDragging) {
    if (dragDistance < DRAG_THRESHOLD_PX) return;
    isDragging = true;
  }

  if (isDragging) {
    mapX += dx;
    mapY += dy;
    clampMapToBounds();
    applyMapTransform();
    e.preventDefault();
  }
}

function onPointerUp(e) {
  if (!isPointerDown || e.pointerId !== dragPointerId) return;
  isPointerDown = false;
  dragPointerId = null;

  if (isDragging) {
    suppressCloseUntil = performance.now() + 200;
  }

  isDragging = false;
  dragDistance = 0;
  roomContainer.classList.remove("dragging");
}

/* ═══════════════════════════════════════════
   SECTION 10 — EVENT LISTENERS
   ═══════════════════════════════════════════ */

attachVideoListeners(bgVideo);

landing.addEventListener("click", () => {
  userHasInteracted = true;
  diag("landing click — userHasInteracted=true");
  if (!isMobile) {
    bgVideo.volume = VOLUME.night;
    bgVideo.removeAttribute("muted");
    bgVideo.muted = false;
  }
  bgVideo.play().catch((e) => {
    diag(`landing-play FAIL: ${e.name}`);
  });
  startCanvasRenderer();
  startFrozenCheck();
  landing.classList.add("fade-out");
  setTimeout(() => landing.remove(), 800);
});

hotspots.forEach((spot) => {
  const key = spot.dataset.key;
  spot.addEventListener("click", (e) => {
    e.stopPropagation();
    if (performance.now() < suppressCloseUntil) return;
    activateHotspot(key);
  });
});

closeCardBtn.addEventListener("click", () => {
  closeCard();
});

document.addEventListener("click", (event) => {
  if (performance.now() < suppressCloseUntil) return;
  const target = event.target;
  if (target && (target.closest(".hotspot") || target.closest(".whisper-card"))) {
    return;
  }
  closeCard();
});

lightToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDayNight();
});

if (roomContainer) {
  roomContainer.addEventListener("pointerdown", onPointerDown);
  roomContainer.addEventListener("pointermove", onPointerMove, { passive: false });
  roomContainer.addEventListener("pointerup", onPointerUp);
  roomContainer.addEventListener("pointercancel", onPointerUp);
}

window.addEventListener("resize", () => {
  if (isPointerDown || isDragging) return;
  clampMapToBounds();
  applyMapTransform();
});

window.addEventListener("load", () => {
  positionHotspots();
  centerMapOnHeart();
  diag(`init: mobile=${isMobile} src=${bgVideo.src.split("/").pop()} muted=${bgVideo.muted}`);
  preloadVideoBlobs();
});
