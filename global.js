chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_PAGE_TITLE") {
    const titleElement = Array.from(document.getElementsByTagName("h1")).at(0);

    sendResponse(titleElement.textContent.trim());
  }
});

// update the title of the document
(function () {
  const h1 = document.querySelector("h1");
  if (!h1) return;

  const titleText = h1.textContent.trim();
  if (titleText.length > 0) {
    document.title = titleText;
  }
})();

/**
 * FAVORITES START
 */

const FAVORITE_KEY = "favorites";

// ---- Helpers ----
function getFavorites() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FAVORITE_KEY], (data) => {
      resolve(data[FAVORITE_KEY] || {});
    });
  });
}

function saveFavorites(map) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FAVORITE_KEY]: map }, resolve);
  });
}

// SVG creators
function createStarSVG(isFav) {
  const wrapper = document.createElement("span");
  wrapper.style.cursor = "pointer";
  wrapper.style.display = "inline-flex";
  wrapper.style.marginRight = "4px";
  wrapper.style.verticalAlign = "middle";

  wrapper.innerHTML = isFav
    ? `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="#f7d207" stroke"#f7d207">
            <path d="M12 2l2.9 6 6.6.9-4.8 4.5 1.2 6.6L12 17.8 6.1 20l1.2-6.6L2.5 8.9l6.6-.9z"></path>
        </svg>`
    : `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ccc">
            <path d="M12 2l2.9 6 6.6.9-4.8 4.5 1.2 6.6L12 17.8 6.1 20l1.2-6.6L2.5 8.9l6.6-.9z"></path>
        </svg>`;

  return wrapper;
}

// ---- Main ----
async function initFavorites() {
  const h1 = document.querySelector("h1");
  if (!h1) return;

  const url = location.href;
  const titleText = h1.textContent.trim();

  const favorites = await getFavorites();
  const isFav = !!favorites[url];

  // Create SVG star
  const star = createStarSVG(isFav);

  // Insert before h1 text
  h1.prepend(star);

  // Toggle on click
  star.addEventListener("click", async (e) => {
    e.stopPropagation();

    let favs = await getFavorites();

    if (favs[url]) {
      // Remove favorite
      delete favs[url];
      star.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ccc">
                    <path d="M12 2l2.9 6 6.6.9-4.8 4.5 1.2 6.6L12 17.8 6.1 20l1.2-6.6L2.5 8.9l6.6-.9z"></path>
                </svg>`;
    } else {
      // Add favorite
      favs[url] = {
        title: titleText,
        url,
        favoritedAt: Date.now(),
      };
      star.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#f7d207" stroke"#f7d207">
                    <path d="M12 2l2.9 6 6.6.9-4.8 4.5 1.2 6.6L12 17.8 6.1 20l1.2-6.6L2.5 8.9l6.6-.9z"></path>
                </svg>`;
    }

    await saveFavorites(favs);
  });
}

initFavorites();

/**
 * FAVORITES END
 */
