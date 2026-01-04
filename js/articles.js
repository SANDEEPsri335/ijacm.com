let articles = [];
let visibleCount = 10;

fetch("../data/articles.json")
  .then(res => res.json())
  .then(data => {
    articles = data;
    renderArticles();
  });

function renderArticles() {
  const container = document.getElementById("articles-container");
  container.innerHTML = "";

  articles.slice(0, visibleCount).forEach(a => {
    container.innerHTML += `
      <div style="border-bottom:1px solid #ccc; padding:15px;">
        <h3>${a.title}</h3>
        <p><strong>${a.authors}</strong></p>
        <p>Article ID: ${a.article_id} | Pages: ${a.pages}</p>
        <p><em>${a.journal}</em>, Vol ${a.volume}, Issue ${a.issue}</p>
        <p>Published On: ${formatDate(a.published_on)}</p>
        <p>DOI: <a href="${a.doi}" target="_blank">${a.doi}</a></p>
        <a href="${a.pdf}" target="_blank">Download PDF</a>
      </div>
    `;
  });

  document.getElementById("viewMoreBtn").style.display =
    visibleCount < articles.length ? "inline-block" : "none";
}

document.getElementById("viewMoreBtn").onclick = () => {
  visibleCount = articles.length;
  renderArticles();
};

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}