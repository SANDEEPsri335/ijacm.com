document.addEventListener("DOMContentLoaded", function () {

  // 1. Detect Environment (Root vs Pages)
  const isPagesDir = window.location.pathname.includes("/pages/");
  const componentPath = isPagesDir ? "../components/" : "components/";

  // 2. Load Component Function
  function loadComponent(file, elementId, callback) {
    const element = document.getElementById(elementId);
    if (!element) return;

    fetch(componentPath + file)
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.text();
      })
      .then(data => {
        // Adjust paths
        let processedData = data;
        if (isPagesDir) {
          // Fix assets
          processedData = processedData.replace(/src="assets\//g, 'src="../assets/');
          // Fix index link
          processedData = processedData.replace(/href="index.html"/g, 'href="../index.html"');
          // Fix pages links (remove pages/ prefix since we are already therein)
          processedData = processedData.replace(/href="pages\//g, 'href="');
          // Fix sitemap link
          processedData = processedData.replace(/href="sitemap.xml"/g, 'href="../sitemap.xml"');
        }

        element.innerHTML = processedData;
        if (callback) callback();
      })
      .catch(error => console.error('Error loading component:', error));
  }

  // 3. Initialize Components
  loadComponent("header.html", "header-placeholder");
  loadComponent("footer.html", "footer-placeholder");
  loadComponent("navbar.html", "navbar-placeholder", function () {
    initNavbar();
  });

});

function initNavbar() {
  highlightActiveLink();
  setupMobileMenu();
}

function highlightActiveLink() {
  const currentFile = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-container > a");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentFile || (currentFile === "" && href === "index.html") || (currentFile === "index.html" && href === "index.html") || (currentFile === "" && href === "../index.html")) {
      link.classList.add("active");
    }
  });
}


function setupMobileMenu() {
  // 1. Hamburger Menu Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navContainer = document.querySelector('.nav-container');

  if (menuToggle && navContainer) {
    menuToggle.addEventListener('click', () => {
      navContainer.classList.toggle('active');
    });
  }

  // 2. Dropdown Toggle Logic (Mobile & Desktop Click)
  document.querySelectorAll('.dropbtn').forEach(btn => {
    btn.addEventListener('click', e => {
      if (window.innerWidth <= 1000) { // Only prevent default on mobile/tablet to allow hover on desktop if desirable, though CSS handles desktop hover
        e.preventDefault();
        const dropdown = btn.closest('.dropdown');
        if (dropdown) {
          dropdown.classList.toggle('active');
        }
      } else {
        // On desktop, we might want click to do nothing if it's just a toggle, 
        // or navigate if it's a link. The current href is javascript:void(0) so it's fine.
        e.preventDefault();
      }
    });
  });

  // 3. Close menu when clicking outside (Optional but good UX)
  document.addEventListener('click', (e) => {
    if (navContainer && navContainer.classList.contains('active')) {
      if (!navContainer.contains(e.target) && !menuToggle.contains(e.target)) {
        navContainer.classList.remove('active');
      }
    }
  });

  // Load Latest Articles if on Homepage
  loadLatestArticles();
}

function loadLatestArticles() {
  const container = document.getElementById('latest-articles-container');
  if (!container) return;

  // Determine path to data.csv (handle root vs pages)
  const isPagesDir = window.location.pathname.includes("/pages/");
  const dataPath = isPagesDir ? "../data.csv" : "data.csv";

  fetch(dataPath)
    .then(res => res.text())
    .then(csvText => {
      const articles = parseCSV(csvText);

      // Sort desc by date
      articles.sort((a, b) => b.dateObj - a.dateObj);

      // Take top 3-6
      // Take top 3
      const latest = articles.slice(0, 3);

      container.innerHTML = "";
      latest.forEach(a => {
        const linkDisplay = a.url
          ? `<a href="${a.url}" target="_blank" style="margin-top:10px; display:inline-block; font-size:0.9rem; color:#1a73e8; font-weight:600;">Read More &rarr;</a>`
          : "";

        container.innerHTML += `
          <div class="article-card">
            <h3 class="article-title">${a.title}</h3>
            <p class="article-authors">${a.authors}</p>
            <div style="font-size:0.85rem; color:#666; margin-top:5px;">
              <i class="far fa-calendar-alt"></i> ${a.publishedDateStr}
            </div>
            ${linkDisplay}
          </div>
        `;
      });
    })
    .catch(err => {
      console.error("Error loading latest articles:", err);
      container.innerHTML = "<p style='color:white; text-align:center;'>Failed to load articles.</p>";
    });
}

// Re-using robustness from specific page scripts
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const articles = [];

  const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.trim().split("-").map(p => p.trim());
    if (parts.length !== 3) return new Date(0);
    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1].toLowerCase()] ?? 0;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  };

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length < 6) continue;

    const dateStr = (row[5] || "").trim();
    // Helper to parse authors
    const rawAuthors = (row[1] || "").trim().replace(/^"|"$/g, "");
    let authors = rawAuthors;
    // Simple robust parsing for display
    if (authors.includes(';')) authors = authors.split(';').join(', ');

    articles.push({
      title: (row[0] || "").trim(),
      authors: authors,
      url: (row[4] || "").trim(),
      publishedDateStr: dateStr,
      dateObj: parseDate(dateStr)
    });
  }
  return articles;
}

function splitCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field); field = '';
    } else { field += ch; }
  }
  fields.push(field);
  return fields.map(f => f.trim());
}