/* ======================================================
   IJACM – CURRENT ISSUE SCRIPT
   Static | Vercel Compatible | CSV Driven
   ====================================================== */

let allArticles = [];
const itemsPerPage = 9;
let currentPage = 1;
let totalPages = 1;

const CSV_PATH = "../data.csv";

/* ==============================
   FETCH CSV FILE
================================ */
fetch(CSV_PATH)
  .then(res => res.text())
  .then(csvText => {
    if (!csvText.trim()) {
      showEmptyState();
      return;
    }

    allArticles = parseCSV(csvText);

    if (allArticles.length === 0) {
      showEmptyState();
      return;
    }

    // Keep ONLY latest month & year (current issue)
    const latestDate = allArticles[0].dateObj;
    const latestMonth = latestDate.getMonth();
    const latestYear = latestDate.getFullYear();

    allArticles = allArticles.filter(a =>
      a.dateObj.getMonth() === latestMonth &&
      a.dateObj.getFullYear() === latestYear
    );

    totalPages = Math.max(1, Math.ceil(allArticles.length / itemsPerPage));
    displayArticles(1);
    renderPagination();
  })
  .catch(err => {
    console.error("CSV Load Error:", err);
    showEmptyState();
  });

/* ==============================
   CSV PARSER
================================ */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const articles = [];

  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split("-").map(p => p.trim());
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

    const rawAuthors = (row[1] || "").replace(/^"|"$/g, "").trim();
    const authors = parseAuthors(rawAuthors);

    const publishedDateStr = (row[5] || "").trim();

    articles.push({
      title: (row[0] || "").trim(),
      authors,
      issue: (row[2] || "").trim(),
      doi: (row[3] || "").trim(),
      paperFile: (row[4] || "").trim(), // IMPORTANT
      publishedDateStr,
      dateObj: parseDate(publishedDateStr)
    });
  }

  // Latest first
  articles.sort((a, b) => b.dateObj - a.dateObj);
  return articles;
}

/* ==============================
   CSV LINE SPLITTER
================================ */
function splitCSVLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }

  fields.push(field);
  return fields.map(f => f.trim());
}

/* ==============================
   AUTHOR PARSER
================================ */
function parseAuthors(raw) {
  if (!raw) return [];

  if (raw.includes(";"))
    return raw.split(";").map(a => a.trim()).filter(Boolean).slice(0, 6);

  if (raw.includes("|"))
    return raw.split("|").map(a => a.trim()).filter(Boolean).slice(0, 6);

  if (/\band\b/i.test(raw))
    return raw.split(/\band\b/i).map(a => a.trim()).filter(Boolean).slice(0, 6);

  const parts = raw.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length > 1 && parts.length <= 6) return parts;

  return [raw];
}

/* ==============================
   EMPTY STATE
================================ */
function showEmptyState() {
  const container = document.getElementById("articles");
  if (!container) return;

  container.innerHTML = `
    <div class="loading">
      <p>No papers published in the current issue yet.</p>
    </div>
  `;
}

/* ==============================
   DISPLAY ARTICLES
================================ */
function displayArticles(page = 1) {
  currentPage = page;
  const container = document.getElementById("articles");
  if (!container) return;

  container.innerHTML = "";

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = allArticles.slice(start, end);

  if (pageItems.length === 0) {
    showEmptyState();
    return;
  }

  pageItems.forEach(a => {
    const authorsText = a.authors.join(", ");

    const viewBtn = a.paperFile
      ? `<a href="/paper/${a.paperFile}" target="_blank" class="btn btn-primary">
           <i class="fas fa-file-pdf"></i> View Paper
         </a>`
      : `<button class="btn btn-secondary" disabled>Paper N/A</button>`;

    const card = document.createElement("div");
    card.className = "article-card";
    card.innerHTML = `
      <span class="article-badge">RESEARCH ARTICLE</span>
      <div class="article-content">
        <h3>${a.title}</h3>

        <div class="article-meta">
          <span class="article-authors">${authorsText}</span>
          <span>${a.publishedDateStr}</span>
        </div>

        <div class="article-doi">
          <strong>DOI:</strong> ${a.doi || "N/A"}
        </div>

        <div class="article-actions">
          ${viewBtn}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  updateHeaderInfo();
}

/* ==============================
   HEADER INFO
================================ */
function updateHeaderInfo() {
  if (!allArticles.length) return;

  const latest = allArticles[0].dateObj;
  const month = latest.toLocaleString("default", { month: "long" });
  const year = latest.getFullYear();

  const header = document.getElementById("current-issue-date");
  if (header) {
    header.textContent = `Latest Issue – ${month} ${year}`;
  }
}

/* ==============================
   PAGINATION
================================ */
function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;

  container.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("div");
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;

    btn.onclick = () => {
      displayArticles(i);
      renderPagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    container.appendChild(btn);
  }
}
