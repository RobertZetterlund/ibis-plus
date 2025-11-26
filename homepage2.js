// remove the windows homescreen
document.querySelector("#container").remove();

// then render the recently visited links, favorited teams/leagues
// leagues section, teams section.

// Show the SSL tables for both women and mens

// then allow to specify region and further search

document.title = "IBIS+";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_PAGE_TITLE") {
    sendResponse(document.title);
  }
});

function formatTime(ts) {
  const date = new Date(ts);
  return date.toLocaleString("sv-SE", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPageIcon(url) {
  if (url.includes("flid=")) return "📊"; // liga-tabell
  if (url.includes("feid=")) return "🏑"; // lag
  if (url.includes("fmid=")) return "⚔️"; // match
  if (url.includes("spelare")) return "🧍"; // spelare
  return "📄"; // fallback
}

async function renderRecentPages() {
  const body = document.body;
  const container = document.createElement("ul");
  container.innerHTML = "<em>Laddar...</em>";
  body.append(container);

  const { recentPages } = await chrome.storage.local.get("recentPages");

  if (!recentPages || recentPages.length === 0) {
    container.innerHTML = "<em>Inga besök registrerade än.</em>";
    return;
  }

  container.innerHTML = "";

  recentPages.forEach((item) => {
    const listitem = document.createElement("li");
    const aLink = document.createElement("a");
    listitem.append(aLink);

    aLink.className = "recent-item";
    aLink.href = item.url;

    aLink.innerHTML = `
            <span class="recent-icon">${getPageIcon(item.url)}</span>
            <span class="recent-title">${item.title}</span>
            <span class="recent-time">${formatTime(item.visitedAt)}</span>
        `;

    container.appendChild(listitem);
  });
}

async function renderFavoritePages() {
  const container = document.createElement("ul");
  container.innerHTML = "<em>Laddar...</em>";
  document.body.append(container);

  const { favorites } = await chrome.storage.local.get("favorites");
  const favs = favorites || {};

  // Nothing stored?
  if (Object.keys(favs).length === 0) {
    container.innerHTML = "<em>Inga favoriter ännu.</em>";
    return;
  }

  container.innerHTML = "";

  // Sort by most recently favorited first
  const entries = Object.entries(favs).sort(
    (a, b) => b[1].favoritedAt - a[1].favoritedAt
  );

  for (const [url, data] of entries) {
    const listitem = document.createElement("li");
    const aLink = document.createElement("a");
    listitem.append(aLink);

    aLink.className = "recent-item";
    aLink.href = url;

    aLink.innerHTML = `
            <span class="recent-icon">${getPageIcon(url)}</span>
            <span class="recent-title">${data.title}</span>
        `;

    container.appendChild(listitem);
  }
}

// Kör direkt när popup laddas
renderRecentPages();
renderFavoritePages();
// Finally allow rendering
document.documentElement.style.display = "block";
document.body.style.display = "block";

const STAR_FILLED = `
<svg viewBox="0 0 24 24" width="20" height="20" fill="#f7d207">
  <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.728L19.335 24 12 19.897 4.665 24l1.399-8.966L0 9.306l8.332-1.151z"></path>
</svg>`;
