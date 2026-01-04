/* ======================================================
   IJACM – CURRENT ISSUE (HEADER-BASED + INDEX FALLBACK)
   ====================================================== */

const CSV_PATH = "/data.csv";
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
  .then(text => {
    if (!text.trim()) {
      showEmptyState();
      return;
    }

    allArticles = parseCSVWithHeaders(text);

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
   CSV PARSER (ROBUST)
================================ */
function parseCSVWithHeaders(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // IMPORTANT: handle comma OR tab safely
    const values = lines[i]
      .split(/,|\t/)
      .map(v => v.replace(/^"|"$/g, "").trim());

    rows.push({
      title: values[0] || "Untitled",
      author: values[1] || "N/A",

      // ✅ THIS IS THE KEY (OLD LOGIC)
      issueNo: values[2] || "N/A",
      doi: values[3] || "N/A",

      paperFile: values[4] || "",
      publishedDate: values[5] || "N/A"
    });
  }

  return rows;
}


/* ==============================
   RENDER ARTICLES (UNCHANGED)
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

    const viewBtn = article.paperFile
      ? `<a href="/paper/${article.paperFile}"
             target="_blank"
             class="btn btn-primary">
           <i class="fas fa-file-pdf"></i> View Paper
         </a>`
      : `<button class="btn btn-secondary" disabled>Paper N/A</button>`;

    card.innerHTML = `
      <span class="article-badge">RESEARCH ARTICLE</span>

      <div class="article-content">
        <h3>${article.title}</h3>

        <div class="article-meta">
          <span class="article-authors">
            <strong>Author:</strong> ${article.author}
          </span>
          <span>
            <strong>Published:</strong> ${article.publishedDate}
          </span>
        </div>

        <p><strong>Issue:</strong> ${article.issueNo}</p>

        <div class="article-doi">
          <strong>DOI:</strong> ${article.doi}
        </div>

        <div class="article-actions">
          ${viewBtn}
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
