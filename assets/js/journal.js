// assets/js/journal.js

const JOURNAL_STORAGE_KEY = "timewell_journal_entries_v1";

let journalEntries = [];
let currentEntryId = null;
let autosaveTimeout = null;

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

function setStatus(text, color) {
  const statusEl = document.getElementById("journal-status");
  if (!statusEl) return;
  statusEl.textContent = text;
  if (color) statusEl.style.color = color;
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

  setStatus("Ready for a new thought.", "#22c55e");
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

  setStatus("Loaded entry.", "#22c55e");
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
      setStatus("Nothing to save yet.", "#f97373");
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
    setStatus("Saved. Future you will remember this.", "#22c55e");
  } else {
    setStatus("Autosaved.", "#22c55e");
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => saveEntry(false), 2000);
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
  clearEditor();
  setStatus("Entry deleted.", "#f97373");
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

  if (newBtn) newBtn.addEventListener("click", clearEditor);
  if (saveBtn) saveBtn.addEventListener("click", () => saveEntry(true));
  if (deleteBtn) deleteBtn.addEventListener("click", deleteEntry);
  if (exportBtn) exportBtn.addEventListener("click", exportEntries);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

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
