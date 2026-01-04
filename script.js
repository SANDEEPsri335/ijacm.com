/* ======================================================
   IJACM – SHARED SCRIPT (FIXED)
   Header/Footer/Nav + Latest Articles
   ====================================================== */

document.addEventListener("DOMContentLoaded", function () {

  // 1. Detect Environment (Root vs Pages)
  const isPagesDir = window.location.pathname.includes("/pages/");
  const componentPath = isPagesDir ? "../components/" : "components/";

  function loadComponent(file, elementId, callback) {
    const element = document.getElementById(elementId);
    if (!element) return;

    fetch(componentPath + file)
      .then(res => res.text())
      .then(data => {
        let processedData = data;

        if (isPagesDir) {
          processedData = processedData.replace(/src="assets\//g, 'src="../assets/');
          processedData = processedData.replace(/href="index.html"/g, 'href="../index.html"');
          processedData = processedData.replace(/href="pages\//g, 'href="');
          processedData = processedData.replace(/href="sitemap.xml"/g, 'href="../sitemap.xml"');
        }

        element.innerHTML = processedData;
        if (callback) callback();
      })
      .catch(err => console.error("Component load error:", err));
  }

  loadComponent("header.html", "header-placeholder");
  loadComponent("footer.html", "footer-placeholder");
  loadComponent("navbar.html", "navbar-placeholder", initNavbar);
});

function initNavbar() {
  highlightActiveLink();
  setupMobileMenu();
  loadLatestArticles(); // ✅ FIXED version
}

function highlightActiveLink() {
  const currentFile = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav-container > a").forEach(link => {
    if (link.getAttribute("href") === currentFile) {
      link.classList.add("active");
    }
  });
}

function setupMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navContainer = document.querySelector('.nav-container');

  if (menuToggle && navContainer) {
    menuToggle.addEventListener('click', () => {
      navContainer.classList.toggle('active');
    });
  }
}

/* ======================================================
   ✅ FIXED: LATEST ARTICLES (HEADER-BASED CSV)
   ====================================================== */

function loadLatestArticles() {
  const container = document.getElementById("latest-articles-container");
  if (!container) return;

  const isPagesDir = window.location.pathname.includes("/pages/");
  const dataPath = isPagesDir ? "../data.csv" : "/data.csv";

  fetch(dataPath)
    .then(res => res.text())
    .then(text => {
      if (!text.trim()) {
        container.innerHTML = "<p>No articles yet.</p>";
        return;
      }

      const articles = parseCSVWithHeaders(text);

      // Sort latest first (by Published_Date text – safe enough for homepage)
      articles.reverse();

      const latest = articles.slice(0, 3);
      container.innerHTML = "";

      latest.forEach(a => {
        container.innerHTML += `
          <div class="article-card">
            <h3 class="article-title">${a.title}</h3>
            <p class="article-authors">${a.author}</p>
            <div style="font-size:0.85rem;color:#666;margin-top:4px;">
              ${a.publishedDate}
            </div>
            ${
              a.paperFile
                ? `<a href="/paper/${a.paperFile}"
                     target="_blank"
                     style="margin-top:8px;display:inline-block;
                            font-size:0.9rem;font-weight:600;color:#1a73e8;">
                     View Paper →
                   </a>`
                : `<span style="color:#999;">Paper N/A</span>`
            }
          </div>
        `;
      });
    })
    .catch(err => {
      console.error("Latest Articles Error:", err);
      container.innerHTML = "<p>Failed to load articles.</p>";
    });
}

/* ======================================================
   HEADER-BASED CSV PARSER (SHARED)
   ====================================================== */

function parseCSVWithHeaders(text) {
  const lines = text.trim().split(/\r?\n/);
  const sep = lines[0].includes(",") ? "," : "\t";

  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(sep).map(v => v.trim());
    const row = {};

    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    rows.push({
      title: row["Title"] || "Untitled",
      author: row["Author"] || "N/A",
      paperFile: row["Paper_File"] || "",
      publishedDate: row["Published_Date"] || "N/A"
    });
  }

  return rows;
}
