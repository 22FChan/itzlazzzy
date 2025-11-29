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

        // Highlight active nav link based on current page
        const path = window.location.pathname.split("/").pop() || "index.html";
        const links = headerPlaceholder.querySelectorAll(".nav-link");
        links.forEach(link => {
          const href = link.getAttribute("href");
          const isHome = (path === "" || path === "index.html") && href === "index.html";
          const isJournal = (path === "journal.html") && href === "journal.html";
          if (isHome || isJournal) {
            link.classList.add("nav-link-active");
          }
        });
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
