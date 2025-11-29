// assets/js/journal.js

const JOURNAL_STORAGE_KEY = "timewell_journal_entries_v1";

let journalEntries = [];
let currentEntryId = null;
let autosaveTimeout = null;

const JOURNAL_PROMPTS = [
  "What did you do today that future you will be glad you did?",
  "If today repeated 365 times, would you like where you end up? Why or why not?",
  "What tiny decision today mattered more than it looked in the moment?",
  "What drained your energy today? What gave you energy?",
  "What are you avoiding that would take less than 10 minutes to start?",
  "What would you tell yourself one year ago?",
  "If today was a movie scene, what would the title of the scene be?",
  "What is one thing you want to remember about today in 10 years?"
];

// Simple sound hooks. Place files like assets/sounds/save.mp3 etc.
// If the files don't exist, the page will still work — sounds just won't play.
let journalSoundsEnabled = true;
const journalSounds = {};
try {
  journalSounds.save = new Audio("assets/sounds/save.mp3");
  journalSounds.autosave = new Audio("assets/sounds/autosave.mp3");
  journalSounds.newEntry = new Audio("assets/sounds/new-entry.mp3");
  journalSounds.delete = new Audio("assets/sounds/delete.mp3");
} catch (e) {
  // Audio might not be supported; fail silently.
}

function playJournalSound(name) {
  if (!journalSoundsEnabled) return;
  const s = journalSounds[name];
  if (!s) return;
  try {
    s.currentTime = 0;
    s.play();
  } catch (e) {
    // Ignore autoplay / permission issues.
  }
}


function loadJournalFromStorage() {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    journalEntries = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(journalEntries)) journalEntries = [];
  } catch (e) {
    journalEntries = [];
  }
}

function saveJournalToStorage() {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journalEntries));
  } catch (e) {
    console.error("Failed to save journal:", e);
  }
}

function generateEntryId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function getFilters() {
  const searchInput = document.getElementById("journal-search");
  const fromInput = document.getElementById("journal-from");
  const toInput = document.getElementById("journal-to");
  const sortSelect = document.getElementById("journal-sort");
  const tagCheckboxes = Array.from(document.querySelectorAll(".journal-tag-filter"));

  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const fromDate = fromInput && fromInput.value ? new Date(fromInput.value + "T00:00:00") : null;
  const toDate = toInput && toInput.value ? new Date(toInput.value + "T23:59:59") : null;
  const sort = sortSelect ? sortSelect.value : "newest";
  const tags = tagCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

  return { search, fromDate, toDate, sort, tags };
}

function entryMatchesFilters(entry, filters) {
  const { search, fromDate, toDate, tags } = filters;

  // Search
  if (search) {
    const text = ((entry.title || "") + " " + (entry.body || "")).toLowerCase();
    if (!text.includes(search)) return false;
  }

  // Date range
  if ((fromDate || toDate) && entry.createdAt) {
    const created = new Date(entry.createdAt);
    if (fromDate && created < fromDate) return false;
    if (toDate && created > toDate) return false;
  }

  // Tags
  if (tags && tags.length) {
    const entryTags = entry.tags || [];
    const hasOverlap = entryTags.some(t => tags.includes(t));
    if (!hasOverlap) return false;
  }

  return true;
}

function sortEntries(entries, sort) {
  const copy = [...entries];
  switch (sort) {
    case "oldest":
      copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "title":
      copy.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "newest":
    default:
      copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return copy;
}

function renderEntries() {
  const listEl = document.getElementById("journal-list");
  const countEl = document.getElementById("journal-count");
  if (!listEl || !countEl) return;

  const filters = getFilters();
  const filtered = sortEntries(
    journalEntries.filter(entry => entryMatchesFilters(entry, filters)),
    filters.sort
  );

  listEl.innerHTML = "";

  if (!filtered.length) {
    countEl.textContent = "No entries match these filters.";
    return;
  }

  countEl.textContent = filtered.length === 1
    ? "1 entry"
    : filtered.length + " entries";

  filtered.forEach(entry => {
    const card = document.createElement("article");
    card.className = "journal-entry-card";
    card.dataset.entryId = entry.id;

    if (entry.id === currentEntryId) {
      card.classList.add("active");
    }

    const titleRow = document.createElement("div");
    titleRow.className = "journal-entry-title-row";

    const title = document.createElement("div");
    title.className = "journal-entry-title";
    title.textContent = entry.title || "(untitled)";

    const date = document.createElement("div");
    date.className = "journal-entry-date";
    if (entry.createdAt) {
      date.textContent = new Date(entry.createdAt).toLocaleString();
    } else {
      date.textContent = "";
    }

    titleRow.appendChild(title);
    titleRow.appendChild(date);

    const preview = document.createElement("div");
    preview.className = "journal-entry-preview";
    const bodyPreview = (entry.body || "").replace(/\s+/g, " ").trim();
    preview.textContent = bodyPreview.length > 120
      ? bodyPreview.slice(0, 120) + "…"
      : bodyPreview || "No content yet.";

    const tagsRow = document.createElement("div");
    tagsRow.className = "journal-entry-tags";
    (entry.tags || []).forEach(tag => {
      const tagSpan = document.createElement("span");
      tagSpan.className = "journal-entry-tag";
      tagSpan.textContent = tag;
      tagsRow.appendChild(tagSpan);
    });

    card.appendChild(titleRow);
    card.appendChild(preview);
    if ((entry.tags || []).length) {
      card.appendChild(tagsRow);
    }

    card.addEventListener("click", () => {
      openEntry(entry.id);
    });

    listEl.appendChild(card);
  });
}

function setStatus(text, color, state) {
  const statusContainer = document.getElementById("journal-status");
  const statusTextEl = document.getElementById("journal-status-text") || statusContainer;
  const dot = document.getElementById("journal-status-dot");

  if (!statusContainer) return;

  statusTextEl.textContent = text;
  if (color) statusTextEl.style.color = color;

  if (dot) {
    dot.classList.remove("journal-status-saving", "journal-status-error", "journal-status-saved");
    if (state === "saving") {
      dot.classList.add("journal-status-saving");
    } else if (state === "error") {
      dot.classList.add("journal-status-error");
    } else {
      dot.classList.add("journal-status-saved");
    }
  }
}

function clearEditor() {
  currentEntryId = null;
  const titleInput = document.getElementById("journal-title-input");
  const bodyInput = document.getElementById("journal-body-input");
  const dateDisplay = document.getElementById("journal-date-display");
  const tagInputs = document.querySelectorAll(".journal-tag-input");

  if (titleInput) titleInput.value = "";
  if (bodyInput) bodyInput.value = "";
  if (dateDisplay) dateDisplay.textContent = "New entry (not yet saved)";
  tagInputs.forEach(cb => { cb.checked = false; });

  setStatus("Ready for a new thought.", "#22c55e", "saved");
  renderEntries();
}

function openEntry(entryId) {
  const entry = journalEntries.find(e => e.id === entryId);
  if (!entry) return;

  currentEntryId = entry.id;
  const titleInput = document.getElementById("journal-title-input");
  const bodyInput = document.getElementById("journal-body-input");
  const dateDisplay = document.getElementById("journal-date-display");
  const tagInputs = document.querySelectorAll(".journal-tag-input");

  if (titleInput) titleInput.value = entry.title || "";
  if (bodyInput) bodyInput.value = entry.body || "";
  if (dateDisplay && entry.createdAt) {
    dateDisplay.textContent = "Created " + new Date(entry.createdAt).toLocaleString();
  }

  const tags = entry.tags || [];
  tagInputs.forEach(cb => {
    cb.checked = tags.includes(cb.value);
  });

  setStatus("Loaded entry.", "#22c55e", "saved");
  renderEntries();
}

function getEditorData() {
  const titleInput = document.getElementById("journal-title-input");
  const bodyInput = document.getElementById("journal-body-input");
  const tagInputs = document.querySelectorAll(".journal-tag-input");

  const title = titleInput ? titleInput.value.trim() : "";
  const body = bodyInput ? bodyInput.value.trim() : "";
  const tags = Array.from(tagInputs)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  return { title, body, tags };
}

function saveEntry(manual = false) {
  const { title, body, tags } = getEditorData();
  if (!title && !body) {
    if (manual) {
      setStatus("Nothing to save yet.", "#f97373", "error");
    }
    return;
  }

  const nowIso = new Date().toISOString();

  if (!currentEntryId) {
    // create new
    const newEntry = {
      id: generateEntryId(),
      title,
      body,
      tags,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    journalEntries.unshift(newEntry);
    currentEntryId = newEntry.id;
  } else {
    // update existing
    const idx = journalEntries.findIndex(e => e.id === currentEntryId);
    if (idx !== -1) {
      journalEntries[idx] = {
        ...journalEntries[idx],
        title,
        body,
        tags,
        updatedAt: nowIso
      };
    }
  }

  saveJournalToStorage();
  renderEntries();

  const dateDisplay = document.getElementById("journal-date-display");
  if (dateDisplay) {
    dateDisplay.textContent = "Last saved " + new Date(nowIso).toLocaleString();
  }

  if (manual) {
    setStatus("Saved. Future you will remember this.", "#22c55e", "saved");
  } else {
    setStatus("Autosaved.", "#22c55e", "saved");
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimeout);
  setStatus("Saving...", "#eab308", "saving");
  autosaveTimeout = setTimeout(() => {
    saveEntry(false);
    playJournalSound("autosave");
  }, 2000);
}

function deleteEntry() {
  if (!currentEntryId) {
    clearEditor();
    return;
  }
  const idx = journalEntries.findIndex(e => e.id === currentEntryId);
  if (idx === -1) return;
  journalEntries.splice(idx, 1);
  saveJournalToStorage();
  playJournalSound('delete');
  clearEditor();
  setStatus("Entry deleted.", "#f97373", "error");
}

function exportEntries() {
  if (!journalEntries.length) {
    setStatus("Nothing to export yet.", "#f97373");
    return;
  }

  const dataStr = JSON.stringify(journalEntries, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "timewell-journal.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus("Exported all entries as JSON.", "#22c55e");
}

function clearFilters() {
  const searchInput = document.getElementById("journal-search");
  const fromInput = document.getElementById("journal-from");
  const toInput = document.getElementById("journal-to");
  const tagCheckboxes = document.querySelectorAll(".journal-tag-filter");

  if (searchInput) searchInput.value = "";
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";
  tagCheckboxes.forEach(cb => { cb.checked = false; });

  renderEntries();
}

function initJournalPage() {
  loadJournalFromStorage();

  const newBtn = document.getElementById("journal-new-btn");
  const saveBtn = document.getElementById("journal-save-btn");
  const deleteBtn = document.getElementById("journal-delete-btn");
  const exportBtn = document.getElementById("journal-export-btn");
  const clearFiltersBtn = document.getElementById("journal-clear-filters");
  const searchInput = document.getElementById("journal-search");
  const fromInput = document.getElementById("journal-from");
  const toInput = document.getElementById("journal-to");
  const sortSelect = document.getElementById("journal-sort");
  const tagFilters = document.querySelectorAll(".journal-tag-filter");
  const titleInput = document.getElementById("journal-title-input");
  const bodyInput = document.getElementById("journal-body-input");
  const tagInputs = document.querySelectorAll(".journal-tag-input");
  const promptBtn = document.getElementById("journal-prompt-btn");
  const todayBtn = document.getElementById("journal-today-btn");
  const soundToggle = document.getElementById("journal-sound-toggle");

  if (newBtn) newBtn.addEventListener("click", () => { clearEditor(); playJournalSound("newEntry"); });
  if (saveBtn) saveBtn.addEventListener("click", () => { saveEntry(true); playJournalSound("save"); });
  if (deleteBtn) deleteBtn.addEventListener("click", deleteEntry);
  if (exportBtn) exportBtn.addEventListener("click", exportEntries);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

  if (promptBtn) {
    promptBtn.addEventListener("click", () => {
      const bodyInput = document.getElementById("journal-body-input");
      if (!bodyInput) return;
      const randomPrompt = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
      if (!bodyInput.value.trim()) {
        bodyInput.value = randomPrompt + "\n\n";
      } else {
        bodyInput.value += "\n\n" + randomPrompt + "\n";
      }
      bodyInput.focus();
      scheduleAutosave();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      const today = new Date().toISOString().split("T")[0];
      const fromInput = document.getElementById("journal-from");
      const toInput = document.getElementById("journal-to");
      if (fromInput) fromInput.value = today;
      if (toInput) toInput.value = today;
      renderEntries();
    });
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      journalSoundsEnabled = !journalSoundsEnabled;
      soundToggle.textContent = journalSoundsEnabled ? "Sounds: On" : "Sounds: Off";
    });
  }

  if (searchInput) searchInput.addEventListener("input", renderEntries);
  if (fromInput) fromInput.addEventListener("change", renderEntries);
  if (toInput) toInput.addEventListener("change", renderEntries);
  if (sortSelect) sortSelect.addEventListener("change", renderEntries);
  tagFilters.forEach(cb => cb.addEventListener("change", renderEntries));

  if (titleInput) titleInput.addEventListener("input", scheduleAutosave);
  if (bodyInput) bodyInput.addEventListener("input", scheduleAutosave);
  tagInputs.forEach(cb => cb.addEventListener("change", scheduleAutosave));

  // Initial render
  renderEntries();

  // If there are entries, open the most recent
  if (journalEntries.length) {
    openEntry(journalEntries[0].id);
  } else {
    clearEditor();
  }
}

document.addEventListener("DOMContentLoaded", initJournalPage);
