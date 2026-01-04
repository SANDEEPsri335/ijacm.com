document.addEventListener("DOMContentLoaded", () => {
  fetch("/data.csv", { cache: "no-store" })
    .then(res => {
      if (!res.ok) throw new Error("CSV not found");
      return res.text();
    })
    .then(text => {
      if (text.startsWith("<")) throw new Error("HTML returned instead of CSV");
      const articles = parseCSVWithHeaders(text);
      initializePage(articles);
    })
    .catch(err => {
      console.error("ARCHIVE LOAD ERROR:", err);
      showError();
    });
});

/* ==============================
   UI ERROR
================================ */
function showError() {
  const container = document.getElementById("volumes-container");
  container.innerHTML = `
    <div class="empty-state">
      <h3>Error Loading Archives</h3>
      <p>Please try again later.</p>
    </div>
  `;
}

/* ==============================
   CONSTANTS
================================ */
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec"];

/* ==============================
   CSV PARSER (HEADER BASED)
================================ */
function parseCSVWithHeaders(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = lines[0].includes(",") ? "," : "\t";
  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(sep).map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx] || "");

    const dateObj = parseDate(row["Published_Date"]);
    if (!dateObj) continue;

    rows.push({
      title: row["Title"],
      authors: row["Author"],
      doi: row["DOI"],
      paperFile: row["Paper_File"],
      publishedDate: row["Published_Date"],
      dateObj,
      year: dateObj.getFullYear(),
      month: dateObj.getMonth()
    });
  }
  return rows;
}

/* ==============================
   DATE PARSER
================================ */
function parseDate(str) {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const months = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
    jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
  };

  const month = months[parts[1].toLowerCase()];
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/* ==============================
   PAGE RENDER
================================ */
function initializePage(articles) {
  const container = document.getElementById("volumes-container");
  const stats = document.getElementById("stats-badge");

  if (!articles.length) {
    showError();
    return;
  }

  // GROUP BY YEAR-MONTH
  const groups = {};
  articles.forEach(a => {
    const key = `${a.year}-${a.month}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  const keys = Object.keys(groups).sort().reverse();
  stats.textContent = `${articles.length} Articles | ${keys.length} Issues`;

  container.innerHTML = "";

  keys.forEach((key, index) => {
    const group = groups[key];
    const d = group[0].dateObj;

    const accordion = document.createElement("div");
    accordion.className = "volume-accordion";

    accordion.innerHTML = `
      <button class="volume-header">
        <span>
          Volume ${index + 1} • ${monthNames[d.getMonth()]} ${d.getFullYear()}
        </span>
        <span class="volume-badge">${group.length} Articles</span>
      </button>

      <div class="volume-content">
        <div class="articles-grid">
          ${group.map(a => `
            <div class="article-card">
              <h4>${a.title}</h4>
              <div>${a.authors}</div>
              <div>${a.publishedDate}</div>
              ${
                a.paperFile
                  ? `<a href="/paper/${a.paperFile}" target="_blank">View Paper</a>`
                  : `<span>Paper N/A</span>`
              }
            </div>
          `).join("")}
        </div>
      </div>
    `;

    accordion.querySelector(".volume-header").onclick = () => {
      accordion.classList.toggle("active");
    };

    container.appendChild(accordion);
  });
}
