// assets/js/layout.js
// Loads header.html and footer.html into placeholders.
// NOTE: use a local server (http://localhost:...) so fetch() works.

document.addEventListener("DOMContentLoaded", () => {
  const headerPlaceholder = document.getElementById("header-placeholder");
  const footerPlaceholder = document.getElementById("footer-placeholder");

  if (headerPlaceholder) {
    fetch("header.html")
      .then(res => res.text())
      .then(html => {
        headerPlaceholder.innerHTML = html;
      })
      .catch(() => {
        headerPlaceholder.innerHTML = "";
      });
  }

  if (footerPlaceholder) {
    fetch("footer.html")
      .then(res => res.text())
      .then(html => {
        footerPlaceholder.innerHTML = html;
      })
      .catch(() => {
        footerPlaceholder.innerHTML = "";
      });
  }
});
