document.addEventListener("DOMContentLoaded", () => {
  fetch("../data.csv")
    .then(res => {
      if (!res.ok) throw new Error("CSV not found");
      return res.text();
    })
    .then(csvText => {
      const articles = parseCSVWithHeaders(csvText);
      initializePage(articles);
    })
    .catch(err => {
      console.error("Error loading CSV:", err);
      document.getElementById("volumes-container").innerHTML = `
        <div class="empty-state">
          <h3>Error Loading Archives</h3>
          <p>Please try again later.</p>
        </div>
      `;
    });
});

/* ======================================================
   CONSTANTS
====================================================== */
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ======================================================
   HEADER-BASED CSV PARSER (BULLETPROOF)
====================================================== */
function parseCSVWithHeaders(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const separator = lines[0].includes(",") ? "," : "\t";
  const headers = lines[0].split(separator).map(h => h.trim());

  const articles = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(separator).map(v => v.trim());
    const row = {};

    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const dateObj = parseDate(row["Published_Date"]);
    if (!dateObj) continue;

    articles.push({
      title: row["Title"] || "Untitled",
      authors: row["Author"] || "Unknown Author",
      issueNo: row["Issue_No"] || "N/A",
      doi: row["DOI"] || "N/A",
      paperFile: row["Paper_File"] || "",
      publishedDateStr: row["Published_Date"],
      dateObj,
      year: dateObj.getFullYear(),
      month: dateObj.getMonth()
    });
  }

  return articles;
}

/* ======================================================
   DATE PARSER (DD-MMM-YY)
====================================================== */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const month = monthMap[parts[1].toLowerCase()];
  let year = parseInt(parts[2], 10);

  if (year < 100) year += 2000;
  if (isNaN(day) || month === undefined || isNaN(year)) return null;

  return new Date(year, month, day);
}

/* ======================================================
   INITIALIZE PAGE
====================================================== */
function initializePage(articles) {
  const container = document.getElementById("volumes-container");
  const yearFilter = document.getElementById("year-filter");
  const volumeFilter = document.getElementById("volume-filter");
  const statsBadge = document.getElementById("stats-badge");

  if (!articles.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Archives Found</h3>
      </div>
    `;
    statsBadge.textContent = "0 Articles";
    return;
  }

  /* ===== GROUP BY YEAR + MONTH ===== */
  const groups = {};
  articles.forEach(a => {
    const key = `${a.year}-${a.month}`;
    if (!groups[key]) {
      groups[key] = { articles: [] };
    }
    groups[key].articles.push(a);
  });

  /* ===== SORT GROUPS (OLDEST → NEWEST) ===== */
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [y1, m1] = a.split("-").map(Number);
    const [y2, m2] = b.split("-").map(Number);
    return y1 !== y2 ? y1 - y2 : m1 - m2;
  });

  sortedKeys.forEach((key, index) => {
    groups[key].volumeNumber = index + 1;
    groups[key].articles.sort((a, b) => b.dateObj - a.dateObj);
  });

  /* ===== POPULATE FILTERS ===== */
  [...new Set(articles.map(a => a.year))]
    .sort((a, b) => b - a)
    .forEach(y => {
      yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    });

  sortedKeys.map(k => groups[k].volumeNumber).reverse().forEach(v => {
    volumeFilter.innerHTML += `<option value="${v}">Volume ${v}</option>`;
  });

  statsBadge.textContent = `${articles.length} Articles | ${sortedKeys.length} Issues`;

  /* ======================================================
     RENDER FUNCTION
  ====================================================== */
  function render(filterYear = "all", filterVol = "all") {
    container.innerHTML = "";
    let hasContent = false;

    [...sortedKeys].reverse().forEach(key => {
      const group = groups[key];
      const firstDate = group.articles[0].dateObj;

      const safeMonth = monthNames[firstDate.getMonth()];
      const safeYear = firstDate.getFullYear();

      if (filterYear !== "all" && safeYear.toString() !== filterYear) return;
      if (filterVol !== "all" && group.volumeNumber.toString() !== filterVol) return;

      hasContent = true;

      const accordion = document.createElement("div");
      accordion.className = "volume-accordion";

      accordion.innerHTML = `
        <button class="volume-header">
          <span>Volume ${group.volumeNumber} Issue ${group.volumeNumber} • ${safeMonth} ${safeYear}</span>
          <span class="volume-badge">${group.articles.length} Articles</span>
        </button>

        <div class="volume-content">
          <div class="articles-grid">
            ${group.articles.map(article => `
              <div class="article-card">
                <h4>${article.title}</h4>
                <div class="article-authors">${article.authors}</div>
                <div class="article-meta">
                  <span>${article.publishedDateStr}</span>
                  <span>${article.doi}</span>
                </div>
                <div class="article-actions">
                  ${article.paperFile
                    ? `<a href="/paper/${article.paperFile}" target="_blank" class="btn-view">
                         View Paper
                       </a>`
                    : `<span class="text-muted">Paper N/A</span>`
                  }
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      container.appendChild(accordion);

      accordion.querySelector(".volume-header").onclick = () => {
        accordion.classList.toggle("active");
      };
    });

    if (!hasContent) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Matches</h3>
          <p>Try adjusting filters.</p>
        </div>
      `;
    }
  }

  render();
  yearFilter.onchange = e => render(e.target.value, volumeFilter.value);
  volumeFilter.onchange = e => render(yearFilter.value, e.target.value);
}
