// assets/js/app.js

// Main target date (can be changed by user)
var mainTarget = new Date("2070-11-02T00:00:00");

// Start of the "journey" for the progress bar
const journeyStart = new Date("2025-01-01T00:00:00");

const STORED_TARGET_KEY = "main_target_iso";
const STORED_TARGET_LABEL_KEY = "main_target_label";
const REFLECTION_STORAGE_KEY = "time_reflection_list";

let pageOpenedAt = Date.now();

// Typewriter state
const fullQuote =
  "Your time is the one currency you can never earn back. Spend it on what truly matters.";
let quoteIndex = 0;
let typingIntervalId = null;

function updateCountdown() {
  const now = new Date();
  let diff = mainTarget - now;
  if (diff <= 0) diff = 0;

  const totalMicroseconds = Math.floor(diff * 1000);
  const totalMilliseconds = Math.floor(diff);
  const totalSeconds      = Math.floor(diff / 1000);
  const totalMinutes      = Math.floor(totalSeconds / 60);
  const totalHours        = Math.floor(totalMinutes / 60);
  const totalDays         = Math.floor(totalHours / 24);
  const totalMonths       = Math.floor(totalDays / 30.4375);
  const totalYears        = Math.floor(totalMonths / 12);

  const years        = totalYears;
  const months       = Math.floor(totalMonths % 12);
  const days         = Math.floor(totalDays % 30.4375);
  const hours        = totalHours % 24;
  const minutes      = totalMinutes % 60;
  const seconds      = totalSeconds % 60;
  const milliseconds = diff % 1000;
  const microseconds = totalMicroseconds % 1000;

  const fullEl = document.getElementById("full-countdown");
  if (fullEl) {
    fullEl.innerHTML =
      `<strong>${years}</strong> years&nbsp;` +
      `<strong>${months}</strong> months&nbsp;` +
      `<strong>${days}</strong> days&nbsp;` +
      `<strong>${hours}</strong> hours&nbsp;` +
      `<strong>${minutes}</strong> minutes&nbsp;` +
      `<strong>${seconds}</strong> seconds&nbsp;` +
      `<strong>${milliseconds}</strong> ms&nbsp;` +
      `<strong>${microseconds}</strong> µs`;
  }

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString();
  };

  setText("years",        totalYears);
  setText("months",       totalMonths);
  setText("days",         totalDays);
  setText("hours",        totalHours);
  setText("minutes",      totalMinutes);
  setText("seconds",      totalSeconds);
  setText("milliseconds", totalMilliseconds);
  setText("microseconds", totalMicroseconds);

  updateProgress(now);
  updateStats(totalDays, totalHours, totalMinutes, totalSeconds);
}

function updateProgress(now) {
  const totalSpan = mainTarget - journeyStart;
  let elapsed = now - journeyStart;
  if (elapsed < 0) elapsed = 0;

  let progress = totalSpan > 0 ? (elapsed / totalSpan) * 100 : 100;
  if (progress < 0) progress = 0;
  if (progress > 100) progress = 100;

  const progressFill = document.getElementById("progress-fill");
  const progressPercent = document.getElementById("progress-percent");
  if (progressFill && progressPercent) {
    progressFill.style.width = progress.toFixed(4) + "%";
    progressPercent.textContent = progress.toFixed(4) + "%";
  }
}

// Unrealistic but calculated stats
function updateStats(totalDays, totalHours, totalMinutes, totalSeconds) {
  const el = id => document.getElementById(id);

  // Reading
  const pages = Math.floor(totalSeconds / 3);       // 1 page / 3 sec
  const books = Math.floor(pages / 250);
  const phdSyllabusPages = 50000;
  const phdTimes = Math.max(1, Math.floor(pages / phdSyllabusPages));

  if (el("stat-pages"))     el("stat-pages").textContent     = pages.toLocaleString();
  if (el("stat-books"))     el("stat-books").textContent     = books.toLocaleString();
  if (el("stat-phd-times")) el("stat-phd-times").textContent = phdTimes.toLocaleString();

  // Learning & Skills
  const seconds = totalSeconds;
  const skills = Math.max(1, Math.floor(totalHours / 10000));
  const tutorials = Math.floor(totalMinutes / 10);
  const courses = Math.floor(totalHours / 40);

  if (el("stat-seconds"))   el("stat-seconds").textContent   = seconds.toLocaleString();
  if (el("stat-skills"))    el("stat-skills").textContent    = skills.toLocaleString();
  if (el("stat-tutorials")) el("stat-tutorials").textContent = tutorials.toLocaleString();
  if (el("stat-courses"))   el("stat-courses").textContent   = courses.toLocaleString();

  // Music
  const songs = Math.floor(totalMinutes / 3);
  const songRepeats = Math.floor(totalSeconds / 180);

  if (el("stat-songs"))         el("stat-songs").textContent         = songs.toLocaleString();
  if (el("stat-song-repeats"))  el("stat-song-repeats").textContent  = songRepeats.toLocaleString();

  // Writing
  const wordsPerMinute = 40;
  const totalWords = totalMinutes * wordsPerMinute;
  const novelWords = 80000;
  const novels = Math.floor(totalWords / novelWords);
  const journalHours = totalHours;
  const journalYears = Math.floor(journalHours / (365 * 1));

  if (el("stat-novels"))        el("stat-novels").textContent        = novels.toLocaleString();
  if (el("stat-journal-years")) el("stat-journal-years").textContent = journalYears.toLocaleString();

  // Art
  const sketches = Math.floor(totalMinutes / 5);
  const paintings = Math.floor(totalDays / 2);

  if (el("stat-sketches"))  el("stat-sketches").textContent  = sketches.toLocaleString();
  if (el("stat-paintings")) el("stat-paintings").textContent = paintings.toLocaleString();

  // Programming
  const linesPerHour = 50;
  const linesCode = totalHours * linesPerHour;
  const hoursPerProject = 500;
  const projects = Math.floor(totalHours / hoursPerProject);

  if (el("stat-lines-code")) el("stat-lines-code").textContent = linesCode.toLocaleString();
  if (el("stat-projects"))   el("stat-projects").textContent   = projects.toLocaleString();

  // Fitness
  const pushups = Math.floor(totalSeconds / 2);
  const kmPerHour = 5;
  const walkKm = Math.floor(totalHours * kmPerHour);
  const earthCircumferenceKm = 40075;
  const earthLaps = Math.floor(walkKm / earthCircumferenceKm);

  if (el("stat-pushups"))    el("stat-pushups").textContent    = pushups.toLocaleString();
  if (el("stat-walk-km"))    el("stat-walk-km").textContent    = walkKm.toLocaleString();
  if (el("stat-earth-laps")) el("stat-earth-laps").textContent = earthLaps.toLocaleString();

  // Movies
  const movies = Math.floor(totalHours / 2);
  const trilogies = Math.floor(totalHours / 6);

  if (el("stat-movies"))    el("stat-movies").textContent    = movies.toLocaleString();
  if (el("stat-trilogies")) el("stat-trilogies").textContent = trilogies.toLocaleString();

  // Deep work
  const deepSessions = Math.floor(totalMinutes / 25);
  if (el("stat-deep-sessions")) el("stat-deep-sessions").textContent = deepSessions.toLocaleString();
}

// Typewriter

function resetTypewriter() {
  clearInterval(typingIntervalId);
  typingIntervalId = null;
  quoteIndex = 0;
  const quoteEl = document.getElementById("quote-text");
  if (quoteEl) {
    quoteEl.innerHTML = '<span class="caret"></span>';
  }
}

function startTypewriter() {
  const quoteEl = document.getElementById("quote-text");
  if (!quoteEl) return;

  resetTypewriter();

  typingIntervalId = setInterval(() => {
    if (quoteIndex < fullQuote.length) {
      const visibleText = fullQuote.slice(0, quoteIndex + 1);
      quoteEl.innerHTML = visibleText + '<span class="caret"></span>';
      quoteIndex++;
    } else {
      clearInterval(typingIntervalId);
      typingIntervalId = null;
    }
  }, 55);
}

// Time on page

function updateTimeOnPage() {
  const el = document.getElementById("time-on-page");
  if (!el) return;

  const diffMs = Date.now() - pageOpenedAt;
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    el.textContent = `You've already spent ${minutes} min ${seconds}s on this page.`;
  } else {
    el.textContent = `You've already spent ${seconds} seconds on this page.`;
  }
}

// Reflection

function loadReflection() {
  if (!window.localStorage) return;
  let savedList;
  try {
    const raw = localStorage.getItem(REFLECTION_STORAGE_KEY);
    savedList = raw ? JSON.parse(raw) : [];
  } catch (e) {
    savedList = [];
  }

  const previous = document.getElementById("reflection-previous");
  const previousContent = document.getElementById("reflection-previous-content");

  if (savedList && savedList.length && previous && previousContent) {
    previous.style.display = "block";
    previousContent.innerHTML = savedList
      .slice(0, 5)
      .map(text => `<div>• ${text}</div>`)
      .join("");
  }
}

function initReflection() {
  const reflectionInput = document.getElementById("reflection-input");
  const reflectionSave = document.getElementById("save-reflection");
  const reflectionSaved = document.getElementById("reflection-saved");

  if (!reflectionInput || !reflectionSave || !reflectionSaved) return;

  reflectionSave.addEventListener("click", () => {
    const text = reflectionInput.value.trim();
    if (!text) {
      reflectionSaved.textContent = "Write something first.";
      reflectionSaved.style.color = "#f97373";
      return;
    }

    if (window.localStorage) {
      let savedList;
      try {
        const raw = localStorage.getItem(REFLECTION_STORAGE_KEY);
        savedList = raw ? JSON.parse(raw) : [];
      } catch (e) {
        savedList = [];
      }

      savedList.unshift(text);
      if (savedList.length > 5) savedList = savedList.slice(0, 5);
      localStorage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify(savedList));
    }

    loadReflection();
    reflectionSaved.textContent = "Saved. Future you will thank you for this.";
    reflectionSaved.style.color = "#6ee7b7";
    reflectionInput.value = "";
  });
}

// Custom date / calendar

function initCustomDate() {
  const calendarToggle = document.getElementById("calendar-toggle");
  const customPanel = document.getElementById("custom-panel");
  const customDateInput = document.getElementById("custom-date");
  const customLabelInput = document.getElementById("custom-label");
  const customApplyBtn = document.getElementById("custom-apply");

  if (calendarToggle && customPanel) {
    calendarToggle.addEventListener("click", () => {
      customPanel.classList.toggle("hidden");
    });
  }

  if (customDateInput) {
    const todayStr = new Date().toISOString().split("T")[0];
    customDateInput.min = todayStr;
  }

  if (customApplyBtn && customDateInput) {
    customApplyBtn.addEventListener("click", () => {
      if (!customDateInput.value) return;
      const picked = new Date(customDateInput.value + "T00:00:00");
      if (isNaN(picked.getTime())) return;

      const now = new Date();
      if (picked.getTime() <= now.getTime()) return;

      mainTarget = picked;
      const labelText = (customLabelInput?.value || "").trim();

      try {
        localStorage.setItem(STORED_TARGET_KEY, picked.toISOString());
        localStorage.setItem(STORED_TARGET_LABEL_KEY, labelText);
      } catch (e) {}

      const h1 = document.querySelector(".title-row h1");
      const subtitle = document.querySelector(".subtitle");
      const dateText = picked.toLocaleDateString();
      const labelToUse = labelText || dateText;

      if (h1) h1.textContent = "Countdown to " + labelToUse;
      if (subtitle) {
        subtitle.textContent = "Time left until " + labelToUse + " from this very moment.";
      }

      customPanel.classList.add("hidden");
    });
  }

  // Restore stored target
  try {
    const savedISO = localStorage.getItem(STORED_TARGET_KEY);
    const savedLabel = localStorage.getItem(STORED_TARGET_LABEL_KEY);
    if (!savedISO) return;

    const d = new Date(savedISO);
    if (isNaN(d.getTime())) return;

    mainTarget = d;
    const h1 = document.querySelector(".title-row h1");
    const subtitle = document.querySelector(".subtitle");
    const dateText = d.toLocaleDateString();
    const labelToUse = savedLabel || dateText;

    if (h1) h1.textContent = "Countdown to " + labelToUse;
    if (subtitle) {
      subtitle.textContent = "Time left until " + labelToUse + " from this very moment.";
    }

    if (customDateInput) customDateInput.value = savedISO.slice(0, 10);
    if (customLabelInput && savedLabel) customLabelInput.value = savedLabel;
  } catch (e) {}
}

function initScrollButton() {
  const btn = document.getElementById("scroll-quote-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    document.querySelector(".reflection-section")?.scrollIntoView({ behavior: "smooth" });
  });
}

function initTypewriterObserver() {
  const quoteSection = document.querySelector(".quote-section");
  if (!quoteSection) return;

  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startTypewriter();
        } else {
          resetTypewriter();
        }
      });
    }, { threshold: 0.4 });

    observer.observe(quoteSection);
  } else {
    setTimeout(startTypewriter, 1000);
  }
}

// Initialize everything

document.addEventListener("DOMContentLoaded", () => {
  initCustomDate();
  initReflection();
  initScrollButton();
  initTypewriterObserver();
  loadReflection();

  setInterval(updateCountdown, 33); // ~30fps
  updateCountdown();

  setInterval(updateTimeOnPage, 1000);
  updateTimeOnPage();
});
