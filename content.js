/**
 * Adds header to table, and requests the html from background worker.
 */
async function init() {
  // Get the current URL's query string
  const params = new URLSearchParams(window.location.search);
  const leagueId = params.get("ftid");

  // Check if it matches the desired parameters
  if (!(params.get("scr") === "table" && leagueId)) {
    return;
  }

  const teamLinks = document.querySelectorAll('.clGrid a[href*="flid="]');
  const table = document.querySelector(".clCommonGrid.clTblStandings");
  // Get the header row (thead)
  const headerRow = table.querySelector("thead tr:nth-child(2)");

  // Create a new <th> for the "Last 5" column
  const formHeaderCell = document.createElement("th");
  formHeaderCell.textContent = "5 Senaste";
  headerRow.appendChild(formHeaderCell);

  // Find the <td> elements that have the text "Totalt"
  const cells = Array.from(
    document.querySelectorAll("table.clTblStandings thead td")
  ).filter((td) => td.textContent.trim() === "Totalt");

  // increment the colspan so it extends over new column
  cells.forEach((td) => {
    // Get the current colspan (default to 1 if missing)
    const current = parseInt(td.getAttribute("colspan")) || 1;
    td.setAttribute("colspan", current + 1);
  });

  const tableData = Array.from(teamLinks).map((link, idx) => ({
    teamName: link.innerHTML.trim(),
    placement: idx + 1,
  }));

  chrome.runtime.sendMessage({
    action: "getTeamForm",
    table: tableData,
    leagueId,
  });
}
init();

// Listen for the parsed HTML from background.js, given the data, populates the rows.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseHTML") {
    const { html, table: tableData } = message;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // find all match rows that contain scores
    const matchRows = [...doc.querySelectorAll(".clGrid tr")].filter((tr) =>
      tr.querySelector(".clScore")
    );

    for (const tableResult of tableData) {
      // spaceless because sometimes the formatting is different between table and play-program view.
      const spacelessTeamName = tableResult.teamName.replaceAll(" ", "");

      // filter matches involving this team
      const teamMatches = matchRows.filter((tr) =>
        tr.textContent.replaceAll(" ", "").includes(spacelessTeamName)
      );

      // get last 5 matches
      const last5 = teamMatches.slice(-5);

      const results = last5.map((tr) => {
        const scoreEl = tr.querySelector(".clScore");
        const scoreText = (scoreEl ? scoreEl.textContent.trim() : "").replace(
          /[^0-9-]/g,
          ""
        );
        const matchDesc =
          tr.querySelector("td:nth-child(3)")?.textContent.trim() || "";

        const [homeTeam, awayTeam] = matchDesc
          .split("-")
          .map((t) => t.replaceAll(" ", ""));
        const [homeScore, awayScore] = scoreText
          .split("-")
          .map((s) => parseInt(s.trim(), 10));

        let symbol = "-";
        let code = "D";

        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          const isHome = spacelessTeamName === homeTeam;
          const won =
            (isHome && homeScore > awayScore) ||
            (!isHome && awayScore > homeScore);
          const lost =
            (isHome && homeScore < awayScore) ||
            (!isHome && awayScore < homeScore);

          if (won) {
            symbol = "W";
            code = "W";
          } else if (lost) {
            symbol = "X";
            code = "L";
          }
        }

        return {
          teamName: tableResult.teamName,
          symbol,
          result: code,
          tooltip: `${matchDesc} (${scoreText})`,
        };
      });

      const table = document.querySelector(".clCommonGrid.clTblStandings");

      // get the row in tbody
      const tbody = table.querySelector("tbody");
      const tr = tbody.querySelector(`tr:nth-child(${tableResult.placement})`);
      const newTd = document.createElement("td");
      tr.append(newTd);
      const newDiv = document.createElement("div");
      newDiv.className = "match-result-container";

      let idx = 0;
      for (const match of results) {
        const span = document.createElement("span");
        span.className = `match-result ${match.result}`;
        span.title = match.tooltip;

        const resultSvg =
          match.result === "W"
            ? winSvg
            : match.result === "L"
            ? lossSvg
            : drawSvg;
        span.innerHTML = resultSvg;

        newDiv.appendChild(span);
        idx++;
      }
      newTd.appendChild(newDiv);
    }
  }
});

const winSvg = `<svg aria-hidden="true" viewBox="0 0 22 22" height=12>
    <path class="oUnRP" d="M11 3a8 8 0 1 1 0 16 8 8 0 0 1 0-16"></path>
    <path class="outline" clip-rule="evenodd" d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16" fill-rule="evenodd"></path>
    <path
      class="hIg8Hb"
      d="M9.2 12.28 7.12 10.2 6 11.32l3.2 3.2 6.4-6.4L14.48 7z"
    ></path>
  </svg>`;
const drawSvg = `<svg aria-hidden="true" viewBox="0 0 22 22" height=12>
    <path
      class="bI5Fmd"
      clip-rule="evenodd"
      d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16"
      fill-rule="evenodd"
    ></path>
    <path class="outline" clip-rule="evenodd" d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16" fill-rule="evenodd"></path>
    <path
      class="hIg8Hb"
      clip-rule="evenodd"
      d="M8 10h6v2H8z"
      fill-rule="evenodd"
    ></path>
  </svg>
`;
const lossSvg = ` <svg aria-hidden="true" viewBox="0 0 22 22" height=12>
<path
class="yIOzif"
clip-rule="evenodd"
d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16"
fill-rule="evenodd"
></path>
<path class="outline" clip-rule="evenodd" d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16" fill-rule="evenodd"></path>
    <path
      class="hIg8Hb"
      clip-rule="evenodd"
      d="M13.263 14.394 11 12.131l-2.263 2.263-1.131-1.131L9.869 11 7.606 8.737l1.131-1.131L11 9.869l2.263-2.263 1.131 1.131L12.131 11l2.263 2.263z"
      fill-rule="evenodd"
    ></path>
  </svg>`;
