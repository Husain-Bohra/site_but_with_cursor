const IMAGE_SIZE = { width: 1600, height: 900 };

const hotspotMaps = {
  // Coordinates are stored as percentages of the GIF frame size (1600x900).
  // They are converted to screen-space using the same object-fit: cover
  // "scale + centered offset" math in `positionHotspots()`.
  desktop: {
    window: { xPct: 0.54, yPct: 0.35 },
    monitor: { xPct: 0.87, yPct: 0.18 },
    papers: { xPct: 0.42, yPct: 0.55 }, // Desk
    bookshelf: { xPct: 0.13, yPct: 0.48 },
    bed: { xPct: 0.85, yPct: 0.65 },
  },
  tablet: {
    window: { xPct: 0.54, yPct: 0.35 },
    monitor: { xPct: 0.75, yPct: 0.22 },
    papers: { xPct: 0.45, yPct: 0.58 }, // Desk
    bookshelf: { xPct: 0.22, yPct: 0.48 },
    bed: { xPct: 0.78, yPct: 0.68 },
  },
  mobile: {
    window: { xPct: 0.54, yPct: 0.32 },
    monitor: { xPct: 0.38, yPct: 0.58 },
    papers: { xPct: 0.52, yPct: 0.65 }, // Desk
    bookshelf: { xPct: 0.32, yPct: 0.42 },
    bed: { xPct: 0.68, yPct: 0.75 },
  },
};

function getHotspotPoint(key) {
  const w = window.innerWidth;
  const map =
    w > 1024 ? hotspotMaps.desktop : w >= 768 ? hotspotMaps.tablet : hotspotMaps.mobile;
  return map[key];
}

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

const scene = document.getElementById("scene");
const hotspots = Array.from(document.querySelectorAll(".hotspot"));
const card = document.getElementById("whisper-card");
const closeCardBtn = document.getElementById("close-card");
const cardEyebrow = document.getElementById("card-eyebrow");
const cardTitle = document.getElementById("card-title");
const cardContent = document.getElementById("card-content");

let activeKey = null;
let pendingCardTimer = null;

function positionHotspots() {
  hotspots.forEach((spot) => {
    const key = spot.dataset.key;
    const point = getHotspotPoint(key);
    if (!point) return;

    // Map GIF-relative coordinates onto the visible container
    // using the same geometry as object-fit: cover (centered).
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const scale = Math.max(
      viewportW / IMAGE_SIZE.width,
      viewportH / IMAGE_SIZE.height
    );

    const renderedW = IMAGE_SIZE.width * scale;
    const renderedH = IMAGE_SIZE.height * scale;
    const offsetX = (viewportW - renderedW) / 2;
    const offsetY = (viewportH - renderedH) / 2;

    const x = offsetX + point.xPct * IMAGE_SIZE.width * scale;
    const y = offsetY + point.yPct * IMAGE_SIZE.height * scale;

    spot.style.left = `${(x / viewportW) * 100}%`;
    spot.style.top = `${(y / viewportH) * 100}%`;
  });
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
  spot.addEventListener("click", () => activateHotspot(key));
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
  const target = event.target;
  if (target && (target.closest(".hotspot") || target.closest(".whisper-card"))) {
    return;
  }
  closeCard();
});

window.addEventListener("resize", positionHotspots);
window.addEventListener("load", () => {
  positionHotspots();
});

positionHotspots();
