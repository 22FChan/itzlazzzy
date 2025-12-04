/* ------------------------------
  GLOBAL CONSTANTS
--------------------------------*/
// Constants derived from CSS for correct zoom calculation
const ORIGINAL_PAGE_HEIGHT = 1123; 
const BASE_GAP = 24; 
let zoomLevel = 1.0;
let thumbnailTimer;


/* ------------------------------
  ZOOM SYSTEM (Problem 1 Fix)
--------------------------------*/
function applyZoom() {
  const grid = document.querySelector(".page-grid");
  if (!grid) return;

  // Calculate compensation for unscaled height:
  // Compensation = Original Height - (Original Height * Zoom Level)
  const compensationMargin = ORIGINAL_PAGE_HEIGHT * (1 - zoomLevel);
  
  // The margin-bottom needs to be negative compensation + scaled gap
  const correctedMarginBottom = -compensationMargin + (BASE_GAP * zoomLevel); 
  
  document.querySelectorAll(".page").forEach(page => {
    page.style.transform = `scale(${zoomLevel})`;
    page.style.transformOrigin = "top center";
    // Apply the calculated margin-bottom for correct spacing
    page.style.marginBottom = `${correctedMarginBottom}px`; 
  });
  
  // Set grid gap to 0 since margin-bottom is now handling vertical spacing
  grid.style.setProperty("--page-gap", `0px`); 
}

/* ------------------------------
  PAGINATION FROM RAW CONTENT
--------------------------------*/
function paginate() {
  const grid = document.querySelector(".page-grid");
  const raw = document.getElementById("raw-content");
  if (!grid || !raw) return;

  const dummy = document.createElement("div");
  dummy.className = "page";
  dummy.style.visibility = "hidden";
  dummy.style.position = "absolute";
  dummy.style.left = "-99999px";
  dummy.innerHTML = "&nbsp;";
  grid.appendChild(dummy);

  const maxPageHeight = dummy.clientHeight;
  grid.removeChild(dummy);

  function createPage() {
    const p = document.createElement("div");
    p.className = "page";
    grid.appendChild(p);
    return p;
  }

  function blockShouldStayTogether(node) {
    return (
      node.tagName === "H1" ||
      node.tagName === "H2" ||
      node.tagName === "H3" ||
      node.tagName === "PRE" ||
      node.classList?.contains("formula") ||
      node.classList?.contains("ascii-art") ||
      node.tagName === "TABLE" ||
      node.tagName === "UL" ||
      node.tagName === "OL"
    );
  }

  function measureHeightWith(node, page) {
    page.appendChild(node);
    const tooTall = page.scrollHeight > maxPageHeight;
    page.removeChild(node);
    return tooTall;
  }

  let currentPage = createPage();

  const nodes = Array.from(raw.childNodes).filter(
    (n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent.trim())
  );

  for (const node of nodes) {
    if (blockShouldStayTogether(node)) {
      if (measureHeightWith(node, currentPage)) {
        currentPage = createPage();
      }
      currentPage.appendChild(node);
    } else {
      currentPage.appendChild(node);
      if (currentPage.scrollHeight > maxPageHeight) {
        currentPage.removeChild(node);
        currentPage = createPage();
        currentPage.appendChild(node);
      }
    }
  }

  raw.remove();
}

/* ------------------------------
  PAGE THUMBNAILS (Problem 2 Fix: Debounced)
--------------------------------*/

// Debounce wrapper: delays execution of the heavy _generateThumbnailsImpl
function generateThumbnailsDebounced() {
  // Set a 1-second delay (1000ms) to ensure it only runs once 
  // after the user has stopped zooming/interacting.
  clearTimeout(thumbnailTimer); 
  thumbnailTimer = setTimeout(_generateThumbnailsImpl, 1000); 
}

// The actual heavy thumbnail generation logic
function _generateThumbnailsImpl() {
  const sidebar = document.getElementById("thumbnailSidebar");
  const pages = document.querySelectorAll(".page");

  if (!sidebar) return;
  sidebar.innerHTML = ""; // clear

  pages.forEach((page, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "thumbnail-item";

    const canvas = document.createElement("canvas");
    const displayWidth = 140;
    const displayHeight = 200;
    canvas.width = displayWidth * 2;
    canvas.height = displayHeight * 2;
    canvas.className = "thumbnail";
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";

    if (window.html2canvas) {
      // html2canvas is the source of the lag
      html2canvas(page, { scale: 0.4 }).then(c => {
        const ctx = canvas.getContext("2d");
        ctx.drawImage(c, 0, 0, canvas.width, canvas.height);
      });
    } else {
      canvas.style.background = "#0b1218";
    }

    canvas.onclick = () => {
      page.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const label = document.createElement("div");
    label.className = "thumbnail-label";
    label.textContent = `Page ${index + 1}`;

    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    sidebar.appendChild(wrapper);
  });
}


/* ------------------------------
  INITIALIZATION & EVENT HANDLERS
--------------------------------*/

// Run initial functions
paginate();
applyZoom();
generateThumbnailsDebounced();
setTimeout(generateThumbnailsDebounced, 600);


document.getElementById("zoomIn").onclick = () => {
  zoomLevel += 0.1;
  applyZoom();
  generateThumbnailsDebounced(); // Use the debounced function
};

document.getElementById("zoomOut").onclick = () => {
  zoomLevel = Math.max(0.2, zoomLevel - 0.1);
  applyZoom();
  generateThumbnailsDebounced(); // Use the debounced function
};

document.getElementById("zoomReset").onclick = () => {
  zoomLevel = 1.0;
  applyZoom();
  generateThumbnailsDebounced(); // Use the debounced function
};

/* ------------------------------
  FIT WIDTH + FIT PAGE
--------------------------------*/
document.getElementById("fitWidth").onclick = () => {
  const page = document.querySelector(".page");
  const container = document.querySelector(".viewer-container");
  if (!page || !container) return;
  // Account for sidebar width (180px) and some padding (40px)
  zoomLevel = (container.clientWidth - 220) / page.clientWidth; 
  applyZoom();
  generateThumbnailsDebounced(); // Use the debounced function
};

document.getElementById("fitPage").onclick = () => {
  const page = document.querySelector(".page");
  if (!page) return;
  // Calculate fit based on window height
  zoomLevel = (window.innerHeight - 140) / page.clientHeight; 
  applyZoom();
  generateThumbnailsDebounced(); // Use the debounced function
};

/* ------------------------------
  SETTINGS PANEL & THEME
--------------------------------*/
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const settingsClose = document.getElementById("settingsClose");
const glowSwitch = document.getElementById("glowSwitch");
const backdropChips = Array.from(document.querySelectorAll("[data-bg-choice]"));
const textColorChips = Array.from(document.querySelectorAll("[data-text-color]"));
const pageBgChips = Array.from(document.querySelectorAll("[data-page-bg]"));

function toggleSettingsPanel(forceOpen) {
  if (!settingsPanel) return;
  const shouldOpen = forceOpen ?? !settingsPanel.classList.contains("open");
  settingsPanel.classList.toggle("open", shouldOpen);
  settingsPanel.setAttribute("aria-hidden", (!shouldOpen).toString());
}

function setActive(chips, isActive) {
  chips.forEach(chip => chip.classList.toggle("active", isActive(chip)));
}

function applyGlow(enabled) {
  document.body.classList.toggle("glow-off", !enabled);
  generateThumbnailsDebounced();
}

function applyBackground(choice) {
  if (!choice) return;
  document.body.dataset.bg = choice;
  setActive(backdropChips, chip => chip.dataset.bgChoice === choice);
}

function applyTextColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty("--page-text", color);
  setActive(textColorChips, chip => chip.dataset.textColor === color);
  generateThumbnailsDebounced();
}

function applyPageBackground(surface) {
  if (!surface) return;
  document.documentElement.style.setProperty("--page-surface", surface);
  setActive(pageBgChips, chip => chip.dataset.pageBg === surface);
  generateThumbnailsDebounced();
}

settingsButton?.addEventListener("click", () => toggleSettingsPanel());
settingsClose?.addEventListener("click", () => toggleSettingsPanel(false));

if (glowSwitch) {
  applyGlow(glowSwitch.checked);
  glowSwitch.addEventListener("change", () => applyGlow(glowSwitch.checked));
}

if (backdropChips.length) {
  applyBackground(document.body.dataset.bg || backdropChips[0]?.dataset.bgChoice);
  backdropChips.forEach(chip => {
    chip.addEventListener("click", () => applyBackground(chip.dataset.bgChoice));
  });
}

if (textColorChips.length) {
  const initialText = textColorChips.find(chip => chip.classList.contains("active"))?.dataset.textColor
    || getComputedStyle(document.documentElement).getPropertyValue("--page-text").trim()
    || textColorChips[0]?.dataset.textColor;
  applyTextColor(initialText);
  textColorChips.forEach(chip => {
    chip.addEventListener("click", () => applyTextColor(chip.dataset.textColor));
  });
}

if (pageBgChips.length) {
  const initialSurface = pageBgChips.find(chip => chip.classList.contains("active"))?.dataset.pageBg
    || getComputedStyle(document.documentElement).getPropertyValue("--page-surface").trim()
    || pageBgChips[0]?.dataset.pageBg;
  applyPageBackground(initialSurface);
  pageBgChips.forEach(chip => {
    chip.addEventListener("click", () => applyPageBackground(chip.dataset.pageBg));
  });
}

document.addEventListener("click", evt => {
  if (!settingsPanel || !settingsButton) return;
  if (!settingsPanel.contains(evt.target) && !settingsButton.contains(evt.target)) {
    toggleSettingsPanel(false);
  }
});

/* ------------------------------
  KEYBOARD SHORTCUTS
--------------------------------*/
document.addEventListener("keydown", e => {
  if (e.key === "+") document.getElementById("zoomIn").click();
  if (e.key === "-") document.getElementById("zoomOut").click();
  if (e.key === "0") document.getElementById("zoomReset").click();
  if (e.key === "d" && glowSwitch) {
    glowSwitch.checked = !glowSwitch.checked;
    glowSwitch.dispatchEvent(new Event("change"));
  }
  if (e.key === "Escape") toggleSettingsPanel(false);
});
