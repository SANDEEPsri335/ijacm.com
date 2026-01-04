document.addEventListener("DOMContentLoaded", () => {
  fetch("/data.csv", { cache: "no-store" })
    .then(res => res.text())
    .then(csvText => {
      const articles = parseCSV(csvText);
      initializePage(articles);
    })
    .catch(err => {
      console.error("Error loading CSV:", err);
      document.getElementById("volumes-container").innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Error Loading Archives</h3>
          <p>Please try again later.</p>
        </div>
      `;
    });
});

/* ==============================
   DATE HELPERS
================================ */
const monthMap = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = monthMap[parts[1].toLowerCase()];
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;

  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

/* ==============================
   CSV PARSER (SIMPLE & STABLE)
================================ */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const articles = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = lines[i]
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map(v => v.replace(/^"|"$/g, "").trim());

    if (row.length < 6) continue;

    const dateObj = parseDate(row[5]);
    if (!dateObj) continue;

    articles.push({
      title: row[0],
      authors: row[1],
      issue: row[2],
      doi: row[3],
      paperFile: row[4],
      publishedDateStr: row[5],
      dateObj,
      year: dateObj.getFullYear(),
      month: dateObj.getMonth()
    });
  }
  return articles;
}

/* ==============================
   PAGE INITIALIZATION
================================ */
function initializePage(articles) {
  const container = document.getElementById("volumes-container");
  const yearFilter = document.getElementById("year-filter");
  const volumeFilter = document.getElementById("volume-filter");
  const statsBadge = document.getElementById("stats-badge");

  if (!articles.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <h3>No Archives Found</h3>
      </div>
    `;
    statsBadge.textContent = "0 Articles";
    return;
  }

  // GROUP BY YEAR + MONTH
  const groups = {};
  articles.forEach(a => {
    const key = `${a.year}-${a.month}`;
    if (!groups[key]) {
      groups[key] = { year: a.year, month: a.month, articles: [] };
    }
    groups[key].articles.push(a);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [y1, m1] = a.split("-").map(Number);
    const [y2, m2] = b.split("-").map(Number);
    return y1 !== y2 ? y1 - y2 : m1 - m2;
  });

  sortedKeys.forEach((key, index) => {
    groups[key].volumeNumber = index + 1;
    groups[key].articles.sort((a, b) => b.dateObj - a.dateObj);
  });

  statsBadge.textContent = `${articles.length} Articles | ${sortedKeys.length} Issues`;

  function render(filterYear = "all", filterVol = "all") {
    container.innerHTML = "";
    let hasContent = false;

    [...sortedKeys].reverse().forEach(key => {
      const group = groups[key];
      if (filterYear !== "all" && group.year.toString() !== filterYear) return;
      if (filterVol !== "all" && group.volumeNumber.toString() !== filterVol) return;

      hasContent = true;
      const monthName = monthNames[group.month];

      const accordion = document.createElement("div");
      accordion.className = "volume-accordion";

      accordion.innerHTML = `
        <button class="volume-header">
          <span>
            Volume ${group.volumeNumber} Issue ${group.volumeNumber} • ${monthName} ${group.year}
          </span>
          <span>
            <span class="volume-badge">${group.articles.length} Articles</span>
            <i class="fas fa-chevron-down"></i>
          </span>
        </button>

        <div class="volume-content">
          <div class="articles-grid">
            ${group.articles.map(a => `
              <div class="article-card">
                <div class="article-header">
                  <div class="article-title">${a.title}</div>
                  <div class="article-authors">${a.authors}</div>
                </div>

                <div class="article-meta">
                  <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    ${a.publishedDateStr}
                  </div>
                  <div class="meta-item">
                    <i class="fas fa-fingerprint"></i>
                    ${a.doi}
                  </div>
                </div>

                <div class="article-actions">
                  ${a.paperFile
                    ? `<a href="/paper/${a.paperFile}" target="_blank" class="btn-view">
                         <i class="fas fa-eye"></i> View Paper
                       </a>`
                    : `<button class="btn-view" disabled>Paper N/A</button>`
                  }
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      const header = accordion.querySelector(".volume-header");
      const content = accordion.querySelector(".volume-content");

      header.addEventListener("click", () => {
        header.classList.toggle("active");
        content.classList.toggle("show");
      });

      container.appendChild(accordion);
    });

    if (!hasContent) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-filter"></i>
          <h3>No Matches</h3>
          <p>Try adjusting your filters.</p>
        </div>
      `;
    }
  }

  render();

  yearFilter.onchange = e => render(e.target.value, volumeFilter.value);
  volumeFilter.onchange = e => render(yearFilter.value, e.target.value);
}
