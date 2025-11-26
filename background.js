/** 
 * Given a message, returns the html for the given league. Sends table back and forth to determine order to execute (placement first)
 * message: {
 *            tableData: {
                teamName: string;
                placement: number;
              }[]
              leagueId:string;
            }
*/
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "getTeamForm") {
    const fixtureURL = `http://statistik.innebandy.se/ft.aspx?scr=fixturelist&ftid=${message.leagueId}`;
    const table = message.table;

    try {
      const res = await fetch(fixtureURL);
      const html = await res.text();

      // Send the HTML to content.js for parsing
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "parseHTML",
          html: html,
          table: table,
        });
      });
      sendResponse(true);

      // Return true to keep the message channel open while awaiting the sendResponse
      return true; // This tells Chrome to keep the port open
    } catch (err) {
      sendResponse(false); // Send empty array in case of error
    }
    return true;
  } else if (message.action === "getTable") {
    const fixtureURL = `http://statistik.innebandy.se/ft.aspx?scr=table&ftid=${message.leagueId}`;
    const table = message.table;

    try {
      const res = await fetch(fixtureURL);
      const html = await res.text();

      // Send the HTML to content.js for parsing
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "parseHTML",
          html: html,
          table: table,
        });
      });
      sendResponse(true);

      // Return true to keep the message channel open while awaiting the sendResponse
      return true; // This tells Chrome to keep the port open
    } catch (err) {
      sendResponse(false); // Send empty array in case of error
    }
    return true;
  }
});

// global.js

// Max antal sidor vi lagrar
const MAX_RECENT = 10;

// Lyssna på alla sidvisningar
chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    console.info("details", details);
    try {
      const url = new URL(details.url);
      console.info("url.pathname", url.pathname);
      if (url.pathname === "/" || url.pathname === "/Error.aspx") {
        return;
      }

      // Hämta titel från content script (eller fallback till URL)
      chrome.tabs.sendMessage(
        details.tabId,
        { type: "GET_PAGE_TITLE" },
        async (title) => {
          if (chrome.runtime.lastError) {
            // content script kanske inte finns → använd URL som titel
            title = url.pathname;
          }

          // Läs befintliga
          const data = await chrome.storage.local.get(["recentPages"]);
          const list = data.recentPages || [];

          // Skapa nytt objekt
          const entry = {
            url: details.url,
            title: title || url.pathname,
            visitedAt: Date.now(),
          };

          // Ta bort ev. duplikat
          const filtered = list.filter((p) => p.url !== entry.url);

          // Lägg till först
          filtered.unshift(entry);

          // Begränsa storlek
          const trimmed = filtered.slice(0, MAX_RECENT);

          console.info("trimmed", trimmed);
          // Spara igen
          await chrome.storage.local.set({ recentPages: trimmed });
        }
      );
    } catch (err) {
      console.error("Error logging visit:", err);
    }
  },
  {
    url: [{ hostEquals: "statistik.innebandy.se" }],
  }
);
