/* ======================================================
   IJACM – CURRENT ISSUE (GUARANTEED VERSION)
   Rule: Every CSV row = One visible article box
   ====================================================== */

const CSV_PATH = "/data.csv";   // IMPORTANT: absolute path
const ITEMS_PER_PAGE = 9;

let allArticles = [];
let currentPage = 1;

/* ==============================
   FETCH CSV
================================ */
fetch(CSV_PATH)
  .then(res => {
    if (!res.ok) throw new Error("CSV not found");
    return res.text();
  })
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

    renderArticles();
    renderPagination();
  })
  .catch(err => {
    console.error("CSV Load Error:", err);
    showEmptyState();
  });

/* ==============================
   PARSE CSV (COMMA BASED)
================================ */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const articles = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length < 6) continue;

    articles.push({
      title: row[0].trim(),
      author: row[1].trim(),
      issue: row[2].trim(),
      doi: row[3].trim(),
      paperFile: row[4].trim(),
      publishedDate: row[5].trim()
    });
  }

  return articles;
}

/* ==============================
   SAFE CSV LINE SPLITTER
================================ */
function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/* ==============================
   RENDER ARTICLES
================================ */
function renderArticles() {
  const container = document.getElementById("articles");
  container.innerHTML = "";

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = allArticles.slice(start, end);

  pageItems.forEach(article => {
    const card = document.createElement("div");
    card.className = "article-card";

    card.innerHTML = `
      <span class="article-badge">RESEARCH ARTICLE</span>
      <div class="article-content">
        <h3>${article.title}</h3>

        <div class="article-meta">
          <span class="article-authors">${article.author}</span>
          <span>${article.publishedDate}</span>
        </div>

        <div class="article-doi">
          <strong>DOI:</strong> ${article.doi || "N/A"}
        </div>

        <div class="article-actions">
          ${
            article.paperFile
              ? `<a href="/paper/${article.paperFile}" target="_blank"
                   class="btn btn-primary">
                   <i class="fas fa-file-pdf"></i> View Paper
                 </a>`
              : `<button class="btn btn-secondary" disabled>Paper N/A</button>`
          }
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  updateHeader();
}

/* ==============================
   HEADER UPDATE
================================ */
function updateHeader() {
  const header = document.getElementById("current-issue-date");
  if (header) {
    header.textContent = `Total Papers Published: ${allArticles.length}`;
  }
}

/* ==============================
   PAGINATION
================================ */
function renderPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.ceil(allArticles.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("div");
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;

    btn.onclick = () => {
      currentPage = i;
      renderArticles();
      renderPagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    pagination.appendChild(btn);
  }
}

/* ==============================
   EMPTY STATE
================================ */
function showEmptyState() {
  const container = document.getElementById("articles");
  container.innerHTML = `
    <div class="loading">
      <p>No articles available.</p>
    </div>
  `;
}
