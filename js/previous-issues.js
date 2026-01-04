document.addEventListener("DOMContentLoaded", () => {
    fetch("../data.csv")
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
                    <p>Unable to load publication data. Please try again later.</p>
                </div>
            `;
        });
});

const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split("-");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1].toLowerCase()];
    let year = parseInt(parts[2], 10);

    if (isNaN(day) || month === undefined || isNaN(year)) return null;

    // Handle 2-digit years
    if (year < 100) year += 2000;

    return new Date(year, month, day);
}

function parseCSV(text) {
    const lines = text.trim().split("\n");
    const articles = [];

    // Start from 1 to skip header
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Regex to split by comma but ignore commas inside quotes
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ""));

        if (row.length < 6) continue;

        const dateStr = row[5] || "";
        const dateObj = parseDate(dateStr);

        if (!dateObj) {
            console.warn(`Skipping row ${i}: Invalid Date "${dateStr}"`);
            continue;
        }

        const article = {
            title: row[0] || "Untitled Article",
            authors: row[1] || "Unknown Author",
            issue: row[2] || "N/A",
            doi: row[3] || "N/A",
            url: row[4] || "#",
            publishedDateStr: dateStr,
            dateObj: dateObj,
            year: dateObj.getFullYear(),
            month: dateObj.getMonth()
        };
        articles.push(article);
    }
    return articles;
}

function initializePage(articles) {
    const container = document.getElementById("volumes-container");
    const yearFilter = document.getElementById("year-filter");
    const volumeFilter = document.getElementById("volume-filter");
    const statsBadge = document.getElementById("stats-badge");

    if (articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No Archives Found</h3>
                <p>There are currently no past volumes available.</p>
            </div>
        `;
        statsBadge.textContent = "0 Articles";
        return;
    }

    // --- Grouping Logic ---
    const groups = {};
    articles.forEach(a => {
        // Group Key: YYYY-MonthIndex (e.g., 2025-10 for Nov)
        const key = `${a.year}-${a.month}`;

        if (!groups[key]) {
            groups[key] = {
                year: a.year,
                month: a.month,
                articles: []
            };
        }
        groups[key].articles.push(a);
    });

    // --- Sorting Groups (Oldest First) ---
    // We sort keys to determine Volume Number correctly
    const sortedKeys = Object.keys(groups).sort((k1, k2) => {
        const [y1, m1] = k1.split('-').map(Number);
        const [y2, m2] = k2.split('-').map(Number);
        if (y1 !== y2) return y1 - y2;
        return m1 - m2;
    });

    // Assign Volume Numbers: Oldest date = Volume 1
    sortedKeys.forEach((key, index) => {
        groups[key].volumeNumber = index + 1;
        // Also perform internal sort of articles (Newest First within the group)
        groups[key].articles.sort((a, b) => b.dateObj - a.dateObj);
    });

    // --- Populate Filters ---
    const years = [...new Set(articles.map(a => a.year))].sort((a, b) => b - a);
    years.forEach(y => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearFilter.appendChild(opt);
    });

    // For simplicity in filter, we can list "Volume 1", "Volume 2", etc.
    // We'll populate this based on the available volumes
    const volumeNums = sortedKeys.map(k => groups[k].volumeNumber).reverse(); // Newest vol on top
    volumeNums.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = `Volume ${v}`;
        volumeFilter.appendChild(opt);
    });

    statsBadge.textContent = `${articles.length} Articles | ${sortedKeys.length} Issues`;

    // --- Rendering Function ---
    function render(filterYear = "all", filterVol = "all") {
        container.innerHTML = "";

        // Use sortedKeys reversed to show Newest Volumes at the top
        const keysToRender = sortedKeys.slice().reverse();

        let hasContent = false;

        keysToRender.forEach(key => {
            const group = groups[key];

            // Apply Filters
            if (filterYear !== "all" && group.year.toString() !== filterYear) return;
            if (filterVol !== "all" && group.volumeNumber.toString() !== filterVol) return;

            hasContent = true;

            const monthName = monthNames[group.month];

            // Construct Accordion Item
            const accordion = document.createElement("div");
            accordion.className = "volume-accordion";

            // NOTE: Issue Number logic tailored to month (Jan=1..Dec=12) or custom?
            // Assuming strict monthly issues: Issue # = Month Index + 1
            // Or use the one from CSV? The CSV has an "Issue_No" column, 
            // but the prompt implied a strict mapping like "Volume 2 Issue 2 Nov 2025".
            // Let's use the calculated volume and month-based issue for consistency with that prompt.

            // However, typical Journals reset Issue # each Volume? 
            // The prompt said: "Volume 2 Issue 2 Nov 2025" and "Volume 1 Issue 1 Oct 2025".
            // If Nov is Vol 3 (because Sep exist), then likely Volume increments, Issue matches Volume?
            // "if there is sep then volume 3 isssue 3 nov 2025 will come" -> implies Vol and Issue are synced or global.
            // Let's stick to the prompt's implied logic: Issue # = Volume #.

            const displayTitle = `Volume ${group.volumeNumber} Issue ${group.volumeNumber} &bull; ${monthName} ${group.year}`;

            accordion.innerHTML = `
                <button class="volume-header">
                    <span>${displayTitle}</span>
                    <div style="display:flex;align-items:center;">
                        <span class="volume-badge">${group.articles.length} Articles</span>
                        <i class="fas fa-chevron-down" style="margin-left:15px;"></i>
                    </div>
                </button>
                <div class="volume-content">
                    <div class="articles-grid">
                        ${group.articles.map(article => `
                            <div class="article-card">
                                <div class="article-header">
                                    <h4 class="article-title">${article.title}</h4>
                                    <div class="article-authors">${article.authors}</div>
                                </div>
                                <div class="article-meta">
                                    <div class="meta-item">
                                        <i class="far fa-calendar-alt"></i>
                                        <span>${article.publishedDateStr}</span>
                                    </div>
                                    <div class="meta-item">
                                        <i class="fas fa-fingerprint"></i>
                                        <span>${article.doi}</span>
                                    </div>
                                </div>
                                <div class="article-actions">
                                    ${article.url ? `
                                        <a href="${article.url}" target="_blank" class="btn-view">
                                            View Paper <i class="fas fa-external-link-alt"></i>
                                        </a>
                                    ` : '<span style="color:var(--text-muted);font-size:0.9rem;">No Link</span>'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            container.appendChild(accordion);

            // Accordion Toggle Logic
            const header = accordion.querySelector(".volume-header");
            header.addEventListener("click", () => {
                const content = accordion.querySelector(".volume-content");
                header.classList.toggle("active");
                if (content.classList.contains("show")) {
                    content.classList.remove("show");
                } else {
                    content.classList.add("show");
                }
            });
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

    // Initial Render
    render();

    // Event Listeners for Filters
    yearFilter.addEventListener("change", (e) => render(e.target.value, volumeFilter.value));
    volumeFilter.addEventListener("change", (e) => render(yearFilter.value, e.target.value));
}
