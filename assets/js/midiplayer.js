document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("midiUploadForm");
  const fileInput = document.getElementById("midiFileInput");
  const audioEl = document.getElementById("midiPlayer");
  const filenameEl = document.getElementById("currentFilename");
  const statusEl = document.getElementById("statusText");
  const errorBox = document.getElementById("errorBox");

  if (!form) return; // safety guard if script loads on another page

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    errorBox.textContent = "";

    const file = fileInput.files[0];
    if (!file) {
      return;
    }

    filenameEl.textContent = file.name;
    statusEl.textContent = "Rendering on backend…";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://itzlazzzy-backend.onrender.com/api/midi-to-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Unknown error";
        try {
          const data = await response.json();
          message = data.error || message;
        } catch (_) {
          // ignore JSON parse error
        }

        statusEl.textContent = "Error";
        errorBox.textContent = message;
        errorBox.style.display = "block";
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      audioEl.src = url;
      statusEl.textContent = "Ready. Press play or it may auto-start.";
      audioEl.play().catch(() => {
        // Autoplay may be blocked – that's fine
      });
    } catch (err) {
      statusEl.textContent = "Error";
      errorBox.textContent = "Network or server error: " + err.message;
      errorBox.style.display = "block";
    }
  });
});
