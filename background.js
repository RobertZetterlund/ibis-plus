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
  }
});
