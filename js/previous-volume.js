const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.trim().split("-");
    if (parts.length !== 3) return new Date(0);

    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1].toLowerCase()] || 0;
    let year = parseInt(parts[2], 10);

    // Handle 2-digit years
    if (year < 100) year += 2000;

    return new Date(year, month, day);
}

document.addEventListener("DOMContentLoaded", () => {
    fetch("../data.csv")
        .then(res => res.text())
        .then(csvText => {
            const articles = parseCSV(csvText);
            renderPreviousVolumes(articles);
        })
        .catch(err => console.error("Error loading CSV:", err));
});

function parseCSV(text) {
    const lines = text.trim().split("\n");
    const articles = [];

    for (let i = 1; i < lines.length; i++) {
        // Handle "CR" or empty lines
        if (!lines[i].trim()) continue;

        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ""));

        if (row.length < 6) continue;

        const dateStr = row[5] || "";
        const dateObj = parseDate(dateStr);
        if (!dateObj || isNaN(dateObj.getTime())) {
            console.warn(`Skipping row ${i}: Invalid Date "${dateStr}"`);
            continue;
        }

        // Construct a grouping key: "Month YYYY" (e.g., "Nov 2025")
        // Also store raw values for sorting
        const monthIndex = dateObj.getMonth();
        const year = dateObj.getFullYear();

        if (isNaN(monthIndex) || isNaN(year)) {
            console.warn(`Skipping row ${i}: NaN Date parsing results for "${dateStr}"`);
            continue;
        }

        const article = {
            title: row[0] || "",
            authors: row[1] || "",
            issue: row[2] || "",
            doi: row[3] || "",
            url: row[4] || "",
            publishedDateStr: dateStr,
            dateObj: dateObj,
            year: year,
            month: monthIndex,
            issueNo: row[2] || "1" // Default or read from CSV
        };
        articles.push(article);
    }
    return articles;
}

function renderPreviousVolumes(articles) {
    const container = document.getElementById("volumes-container");
    container.innerHTML = "";

    if (articles.length === 0) {
        container.innerHTML = "<p>No articles found.</p>";
        return;
    }

    // 1. Identify the LATEST month/year present in the data to exclude it
    // Get max date
    let maxDate = new Date(0);
    articles.forEach(a => {
        if (a.dateObj > maxDate) maxDate = a.dateObj;
    });
    // 2. Group articles by "YYYY-M" for sorting, then display as "Volume X, Issue Y - Month YYYY"
    const groups = {};

    articles.forEach(a => {
        const key = `${a.year}-${a.month}`; // Sorting key

        if (!groups[key]) {
            groups[key] = {
                year: a.year,
                month: a.month,
                issue: a.issueNo,
                articles: []
            };
        }
        groups[key].articles.push(a);
    });

    // 3. Sort groups for numbering (Ascending order of time: Oldest first)
    const chronologicalKeys = Object.keys(groups).sort((k1, k2) => {
        const [y1, m1] = k1.split('-').map(Number);
        const [y2, m2] = k2.split('-').map(Number);
        if (y1 !== y2) return y1 - y2;
        return m1 - m2;
    });

    if (chronologicalKeys.length === 0) {
        container.innerHTML = "<p>No previous volumes yet.</p>";
        return;
    }

    // 4. Render Descending (Newest First) using generated numbers
    for (let i = chronologicalKeys.length - 1; i >= 0; i--) {
        const key = chronologicalKeys[i];
        const group = groups[key];
        const monthName = monthNames[group.month];

        // Generated Number: Oldest is 1
        const volIssueNum = i + 1;

        const displayTitle = `Volume ${volIssueNum} Issue ${volIssueNum} ${monthName}-${group.year}`;

        // Sort articles in this group by date desc
        group.articles.sort((a, b) => b.dateObj - a.dateObj);

        const accordionItem = document.createElement("div");
        accordionItem.className = "accordion-item";

        const header = document.createElement("button");
        header.className = "accordion-header";
        header.textContent = displayTitle;
        header.onclick = function () {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            if (content.classList.contains("show")) {
                content.classList.remove("show");
            } else {
                content.classList.add("show");
            }
        };

        const contentDiv = document.createElement("div");
        contentDiv.className = "accordion-content";

        group.articles.forEach(a => {
            const linkDisplay = a.url ?
                `<a href="${a.url}" target="_blank" style="display:inline-block; padding:8px 15px; background-color:#1a73e8; color:white; text-decoration:none; border-radius:4px; margin-top:5px; font-size:14px;">View Page</a>` :
                "";

            contentDiv.innerHTML += `
        <div class="previous-article-card" style="border-bottom:1px solid #ccc; padding:15px; text-align: left; color: black;">
          <h3 style="margin: 0 0 5px 0; color: black;">${a.title}</h3>
          <p style="margin: 0 0 5px 0; color: black;"><b>${a.authors}</b></p>
          <p style="margin: 0 0 10px 0; color: #555;">Issue: ${a.issue} | DOI: ${a.doi} | Published: ${a.publishedDateStr}</p>
          ${linkDisplay}
        </div>
      `;
        });

        accordionItem.appendChild(header);
        accordionItem.appendChild(contentDiv);
        container.appendChild(accordionItem);
    }
}
