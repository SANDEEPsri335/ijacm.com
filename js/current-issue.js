let allArticles = [];
const itemsPerPage = 9;
let currentPage = 1;
let totalPages = 1;

/* ==============================
   FETCH CSV FILE
================================ */
fetch("../data.csv")
  // ... (rest of search/loading logic is fine, no change needed in fetch block start)
  .then(res => res.text())
  .then(csvText => {
    allArticles = parseCSV(csvText);

    // Filter to keep ONLY the latest month's articles
    if (allArticles.length > 0) {
      // Since it's sorted descending, the first one is the latest
      const latestDate = allArticles[0].dateObj;
      const latestMonth = latestDate.getMonth();
      const latestYear = latestDate.getFullYear();

      allArticles = allArticles.filter(a =>
        a.dateObj.getMonth() === latestMonth &&
        a.dateObj.getFullYear() === latestYear
      );
    }

    totalPages = Math.max(1, Math.ceil(allArticles.length / itemsPerPage));
    displayArticles(1);
    renderPagination();
  })
  .catch(err => console.error("Error loading CSV:", err));

/* ==============================
   PARSE CSV + DATE LOGIC
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
    const parts = dateStr.trim().split("-").map(p => p.trim());
    if (parts.length !== 3) return new Date(0);

    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1].toLowerCase()] ?? 0;
    let year = parseInt(parts[2], 10);

    // Handle 2-digit years (e.g., 25 -> 2025)
    if (year < 100) {
      year += 2000;
    }

    return new Date(year, month, day);
  };

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);

    if (row.length < 6) continue;

    const publishedDateStr = (row[5] || "").trim();

    // Parse authors into an array (support ; | and ' and ' or paired 'Last, First' formats)
    const rawAuthors = (row[1] || "").trim().replace(/^"|"$/g, "");
    const authors = parseAuthors(rawAuthors);

    const article = {
      title: (row[0] || "").trim(),
      authors, // array of author names
      issue: (row[2] || "").trim(),
      doi: (row[3] || "").trim(),
      url: (row[4] || "").trim(),
      publishedDateStr,
      dateObj: parseDate(publishedDateStr)
    };

    articles.push(article);
  }

  // 🔥 Sort by latest date first
  articles.sort((a, b) => b.dateObj - a.dateObj);

  return articles;
}

// Robust CSV line splitter that respects quoted fields and escaped quotes
function splitCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped quotes ""
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields.map(f => f.trim());
}

// Parse authors field into array of up to 6 author names
function parseAuthors(raw) {
  if (!raw) return [];
  // remove surrounding quotes if any
  let s = raw.replace(/^"|"$/g, '').trim();

  // Prefer explicit separators
  if (s.includes(';')) return s.split(';').map(a => a.trim()).filter(Boolean).slice(0, 6);
  if (s.includes('|')) return s.split('|').map(a => a.trim()).filter(Boolean).slice(0, 6);
  if (/\band\b/i.test(s)) return s.split(/\band\b/i).map(a => a.trim()).filter(Boolean).slice(0, 6);

  // Handle paired 'Last, First, Last2, First2' -> join pairs
  const parts = s.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1 && parts.length % 2 === 0 && parts.length / 2 <= 6) {
    const out = [];
    for (let i = 0; i < parts.length; i += 2) {
      out.push(parts[i] + ', ' + parts[i + 1]);
    }
    return out.slice(0, 6);
  }

  // If simple comma-separated and not too many, treat commas as separators
  if (parts.length > 1 && parts.length <= 6) {
    return parts.slice(0, 6);
  }

  // fallback: single author string
  return [s].slice(0, 6);
}

/* ==============================
   DISPLAY ARTICLES (PAGINATION)
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
    container.innerHTML = `
      <div class="loading">
        <p>No articles found for this issue.</p>
      </div>
    `;
    return;
  }

  pageItems.forEach(a => {
    // Generate authors string
    const authorsDisplay = Array.isArray(a.authors) ? a.authors.join(', ') : (a.authors || '');

    // Badge logic (optional, default to Research Article)
    const badgeText = "RESEARCH ARTICLE";

    // Actions
    const downloadBtn = a.url
      ? `<a href="${a.url}" target="_blank" class="btn btn-primary"><i class="fas fa-eye"></i> View Paper</a>`
      : `<button class="btn btn-secondary" disabled>Link N/A</button>`;

    const abstractBtn = `<button class="btn btn-secondary"><i class="fas fa-info-circle"></i> Details</button>`;

    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
      <div class="article-badge">${badgeText}</div>
      <div class="article-content">
        <h3>${a.title}</h3>
        <div class="article-meta">
          <span class="article-authors"><i class="fas fa-user-edit"></i> ${authorsDisplay}</span>
          <span><i class="fas fa-file-alt"></i> Article ID: ${a.issue}</span>
        </div>
        <p>Published on ${a.publishedDateStr}</p>
        <div class="article-doi"><i class="fas fa-link"></i> DOI: ${a.doi || 'N/A'}</div>
        <div class="article-actions">
          ${downloadBtn}
          ${abstractBtn}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Update Stats in the Info Card
  updateIssueStats(pageItems);
}

function updateIssueStats(pageItems) {
  if (allArticles.length > 0) {
    const latestDate = allArticles[0].dateObj;
    const month = latestDate.toLocaleString('default', { month: 'long' });
    const year = latestDate.getFullYear();
    const dateStr = `${month} ${year}`;

    const dateElem = document.getElementById("current-issue-date");
    if (dateElem) dateElem.textContent = `Volume ${allArticles[0].issue} - ${dateStr}`;

    const pubDateElem = document.getElementById("issue-pub-date");
    if (pubDateElem) pubDateElem.textContent = allArticles[0].publishedDateStr;
  }

  const statArticles = document.getElementById("stat-articles");
  if (statArticles) statArticles.textContent = allArticles.length;

  const statAuthors = document.getElementById("stat-authors");
  if (statAuthors) {
    // Estimate unique authors
    const uniqueAuthors = new Set();
    allArticles.forEach(a => {
      if (Array.isArray(a.authors)) {
        a.authors.forEach(auth => uniqueAuthors.add(auth.trim()));
      } else {
        uniqueAuthors.add(a.authors);
      }
    });
    statAuthors.textContent = uniqueAuthors.size;
  }
}

function displayAllArticles() {
  const container = document.getElementById("articles");
  container.innerHTML = "";
  allArticles.forEach(a => {
    const linkDisplay = a.url
      ? `<a href="${a.url}" target="_blank"
           style="display:inline-block;padding:8px 15px;
           background:#1a73e8;color:#fff;text-decoration:none;
           border-radius:4px;margin-top:6px;">View Paper</a>`
      : "<span style='color:grey'>Link N/A</span>";

    const authorsDisplay = Array.isArray(a.authors) ? a.authors.join('; ') : (a.authors || '');

    container.innerHTML += `
      <div style="border-bottom:1px solid #ccc;padding:15px;">
        <h3>${a.title}</h3>
        <p><b>${authorsDisplay}</b></p>
        <p>
          Issue: ${a.issue} |
          DOI: ${a.doi} |
          Published: ${a.publishedDateStr}
        </p>
        ${linkDisplay}
      </div>
    `;
  });
}

/* ==============================
   PAGINATION CONTROLS
================================ */
/* ==============================
   PAGINATION CONTROLS
================================ */
function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;

  container.innerHTML = "";

  if (totalPages <= 1) return;

  // Helper to create buttons
  const createBtn = (content, page, isDisabled, isActive) => {
    const btn = document.createElement("button");
    btn.className = `page-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
    btn.innerHTML = content;
    btn.disabled = isDisabled;
    if (!isDisabled && !isActive) {
      btn.onclick = () => {
        displayArticles(page);
        renderPagination();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    }
    return btn;
  };

  // Prev Button
  container.appendChild(createBtn('<i class="fas fa-chevron-left"></i>', currentPage - 1, currentPage === 1, false));

  // Page Numbers
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    container.appendChild(createBtn('1', 1, false, 1 === currentPage));
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      container.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(createBtn(i, i, false, i === currentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      container.appendChild(ellipsis);
    }
    container.appendChild(createBtn(totalPages, totalPages, false, totalPages === currentPage));
  }

  // Next Button
  container.appendChild(createBtn('<i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage === totalPages, false));
}

/* ==============================
   VIEW MORE (OPTIONAL)
================================ */
const viewMoreBtn = document.getElementById("viewMore");
if (viewMoreBtn) {
  viewMoreBtn.onclick = () => {
    displayAllArticles();
    const pg = document.getElementById("pagination");
    if (pg) pg.style.display = "none";
  };
}