const IMAGE_SIZE = { width: 1600, height: 900 };

// Hotspot positions in GIF-space (1600x900) pixels.
// The GIF is never cropped inside the room-map, so these map 1:1.
const hotspotCoords = {
  window: { x: 0.54 * IMAGE_SIZE.width, y: 0.35 * IMAGE_SIZE.height },
  monitor: { x: 0.87 * IMAGE_SIZE.width, y: 0.18 * IMAGE_SIZE.height },
  papers: { x: 0.42 * IMAGE_SIZE.width, y: 0.55 * IMAGE_SIZE.height },
  bookshelf: { x: 0.13 * IMAGE_SIZE.width, y: 0.48 * IMAGE_SIZE.height },
  bed: { x: 0.85 * IMAGE_SIZE.width, y: 0.65 * IMAGE_SIZE.height },
};

// Start position: center the midpoint between desk and window.
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

const hotspots = Array.from(document.querySelectorAll(".hotspot"));
const card = document.getElementById("whisper-card");
const closeCardBtn = document.getElementById("close-card");
const cardEyebrow = document.getElementById("card-eyebrow");
const cardTitle = document.getElementById("card-title");
const cardContent = document.getElementById("card-content");
const roomContainer = document.getElementById("room-container");
const roomMap = document.getElementById("room-map");

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

const DRAG_THRESHOLD_PX = 12;

function positionHotspots() {
  hotspots.forEach((spot) => {
    const key = spot.dataset.key;
    const point = hotspotCoords[key];
    if (!point) return;

    // Fixed pixel coordinates inside the room-map canvas (1600x900).
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

  // If the card is already open, we "whisper" between topics smoothly:
  // fade out first, then swap content and fade back in.
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

hotspots.forEach((spot) => {
  const key = spot.dataset.key;
  spot.addEventListener("click", (e) => {
    e.stopPropagation();
    if (performance.now() < suppressCloseUntil) return;
    activateHotspot(key);
  });
});

function closeCard() {
  card.classList.remove("open");
  hotspots.forEach((spot) => spot.classList.remove("is-active"));
  activeKey = null;
  if (pendingCardTimer) window.clearTimeout(pendingCardTimer);
  pendingCardTimer = null;
}

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

window.addEventListener("resize", () => {
  if (isPointerDown || isDragging) return;
  clampMapToBounds();
  applyMapTransform();
});

window.addEventListener("load", () => {
  positionHotspots();
  centerMapOnHeart();
});

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

if (roomContainer) {
  roomContainer.addEventListener("pointerdown", onPointerDown);
  roomContainer.addEventListener("pointermove", onPointerMove, { passive: false });
  roomContainer.addEventListener("pointerup", onPointerUp);
  roomContainer.addEventListener("pointercancel", onPointerUp);
}

// Day/night toggle
const bgVideo = document.getElementById("bg-video");
const whiteout = document.getElementById("whiteout");
const lightToggle = document.getElementById("light-toggle");

let isDay = false;
let isTransitioning = false;

hotspotCoords.light = {
  x: 0.50 * IMAGE_SIZE.width,
  y: 0.13 * IMAGE_SIZE.height
};

function toggleDayNight() {
  if (isTransitioning) return;
  isTransitioning = true;

  whiteout.classList.add("active");

  setTimeout(() => {
    bgVideo.loop = false;
    bgVideo.src = "./assets/transition.mp4";
    bgVideo.load();
    bgVideo.play();

    setTimeout(() => {
      whiteout.classList.remove("active");
    }, 400);

    bgVideo.onended = () => {
      isDay = !isDay;
      bgVideo.loop = true;
      bgVideo.src = isDay
        ? "./assets/daytime.mp4"
        : "./assets/nighttime.mp4";
      bgVideo.load();
      bgVideo.play();
      isTransitioning = false;
      bgVideo.onended = null;
    };
  }, 400);
}

lightToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDayNight();
});
