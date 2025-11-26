/**
 * Adds header to table, and requests the html from background worker.
 */
async function init() {
  // Get the current URL's query string
  const params = new URLSearchParams(window.location.search);
  const scr = params.get("scr");

  switch (scr) {
    case "table": {
      improveTablePage();
      break;
    }
    case "fixturelist": {
      improveFixturesPage();
      break;
    }
    case "teamresult": {
      improveTeamResultsPage();
      break;
    }
  }
}
init();

function downloadCalendar(table) {
  // first get the trows for match games
  const trows = Array.from(
    table.querySelectorAll("tbody tr:has(td:nth-of-type(2))")
  );

  let ics =
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "CALSCALE:GREGORIAN\n" +
    "PRODID:-//Ibis+//EN\n";

  // td order is
  // date | competition | fixture | results (if any) | location
  for (const row of trows) {
    const date = row.querySelector("td:nth-child(1)").textContent;
    const fixture = row.querySelector("td:nth-child(3)").textContent;
    const location = row.querySelector("td:last-child").textContent;
    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    ics +=
      "BEGIN:VEVENT\n" +
      `UID:${uuidv4()}\n` +
      `DTSTAMP:${formatDate(startDate)}\n` +
      `DTSTART:${formatDate(startDate)}\n` +
      `DTEND:${formatDate(endDate)}\n` +
      `SUMMARY:${fixture}\n` +
      `LOCATION:${location}\n` +
      "END:VEVENT\n";
  }

  ics += "END:VCALENDAR";

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download =
    document
      .querySelector("h1")
      .textContent.replaceAll("Lagets matcher säsongen ", "")
      .trim() + ".ics";
  a.click();
  URL.revokeObjectURL(url);
}

function addDownloadButton(table) {
  // Add calendar events for all matches
  const btn = document.createElement("button");
  btn.textContent = "Lägg till i kalender";
  btn.id = "fixtures-download";

  const theadRow = table.querySelector("thead tr:nth-child(1)");
  const headerTd = theadRow.querySelector("td");
  const headerTdColspan = parseInt(headerTd.getAttribute("colspan")) || 1;
  headerTd.setAttribute("colspan", headerTdColspan - 2);
  // add td to place button in
  const buttonHeaderTd = document.createElement("td");
  buttonHeaderTd.setAttribute("colspan", 2);
  theadRow.append(buttonHeaderTd);
  buttonHeaderTd.appendChild(btn);

  btn.addEventListener("click", () => {
    downloadCalendar(table);
  });
}

function improveFixturesPage() {
  const fixturesTable = Array.from(
    document.querySelectorAll(".clCommonGrid")
  ).at(1);
  addDownloadButton(fixturesTable);
}

function improveTeamResultsPage() {
  const table = document.querySelector(".clCommonGrid");
  addDownloadButton(table);
}

// Format date into ICS-compatible UTC format
function formatDate(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

function improveTablePage() {
  const params = new URLSearchParams(window.location.search);
  const leagueId = params.get("ftid");

  const teamLinks = document.querySelectorAll('.clGrid a[href*="flid="]');
  const table = document.querySelector(".clCommonGrid.clTblStandings");
  // Get the header row (thead)
  const headerRow = table.querySelector("thead tr:nth-child(2)");

  // Create a new <th> for the "Last 5" column
  const formHeaderCell = document.createElement("th");
  formHeaderCell.textContent = "5 Senaste";
  headerRow.appendChild(formHeaderCell);

  // Find the <td> element that have the text "Totalt"
  const td = document.querySelector(
    "table.clTblStandings thead tr:nth-child(1) td:nth-child(2)"
  );

  // increment the colspan so it extends over new column
  const current = parseInt(td.getAttribute("colspan")) || 1;
  td.setAttribute("colspan", current + 1);

  const tableData = Array.from(teamLinks)
    .map((link, idx) => {
      const tr = table.querySelector(`tbody tr:nth-child(${idx + 1})`);
      // Remove teams that have opted out of the league.
      if (tr.textContent.includes("Utgått")) {
        return null;
      }
      const td = tr.querySelector("td:nth-child(9)");

      return {
        teamName: link.innerHTML.trim(),
        placement: idx + 1,
        points: Number(td.textContent),
      };
    })
    .filter((row) => !!row);

  chrome.runtime.sendMessage({
    action: "getTeamForm",
    table: tableData,
    leagueId,
  });
}

// Fix all links to players to work (by using the stats.innebandy.se link)
document.querySelectorAll("a[href]").forEach((a) => {
  if (a.href.includes("?scr=playercareer")) {
    const fplid = new URL(a.href).searchParams.get("fplid");
    a.href = `https://stats.innebandy.se/spelare/${fplid}`;
    const newText = a.textContent.replaceAll("(Saknas år)", "");
    a.textContent = newText;
  }
});

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

    const table = document.querySelector(".clCommonGrid.clTblStandings");
    const prevStandings = [];

    let position = 1;
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
        const scoreTextRaw = scoreEl ? scoreEl.textContent.trim() : "";
        const scoreText = scoreTextRaw.replace(/[^0-9-]/g, "");
        const matchTd = tr.querySelector("td:nth-child(3)");
        const matchDesc = matchTd?.textContent.trim() || "";
        const matchLink = matchTd.querySelector("a").href;

        const [homeTeam, awayTeam] = matchDesc
          .split("-")
          .map((t) => t.replaceAll(" ", ""));
        const [homeScore, awayScore] = scoreText
          .split("-")
          .map((s) => parseInt(s.trim(), 10));

        let code = "D";
        // 1 point for draw, 3 for win (2 if after extension of play) 0 for loss (1 if after extension)
        let point = 1;

        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          const isHome = spacelessTeamName === homeTeam;
          const won =
            (isHome && homeScore > awayScore) ||
            (!isHome && awayScore > homeScore);
          const lost =
            (isHome && homeScore < awayScore) ||
            (!isHome && awayScore < homeScore);

          if (won) {
            code = "W";
            point = 3;
            if (scoreTextRaw.includes("e.förl.")) {
              point = 2;
            }
          } else if (lost) {
            code = "L";
            point = 0;
            if (scoreTextRaw.includes("e.förl.")) {
              point = 1;
            }
          }
        }

        return {
          teamName: tableResult.teamName,
          result: code,
          tooltip: `${matchDesc} (${scoreTextRaw})`,
          point,
          matchLink,
        };
      });

      // get the row in tbody
      const tbody = table.querySelector("tbody");
      const tr = tbody.querySelector(`tr:nth-child(${tableResult.placement})`);

      addLast5ToTable(tr, results);
      const prevPoints = getPointsBeforeLastGame(results, tableData, position);
      prevStandings.push({
        points: prevPoints,
        teamName: tableResult.teamName,
      });

      position++;
    }

    const prevStandingsSorted = prevStandings.sort(
      (teamA, teamB) => teamB.points - teamA.points
    );

    const tableMovements = getTableMovements(prevStandingsSorted, tableData);
    for (const tableMovement of tableMovements) {
      // find the Plac. column and add the movement indicator
      const td = table.querySelector(
        `tbody tr:nth-child(${tableMovement.placement}) td`
      );
      td.className = "placement";

      const newDiv = document.createElement("div");
      newDiv.innerHTML =
        tableMovement.movement === "UP"
          ? movementUpSvg
          : tableMovement.movement === "DOWN"
          ? movementDownSvg
          : movementSameSvg;
      td.append(newDiv);
    }
  }
});

function getPointsBeforeLastGame(results, tableData, position) {
  const currentPoints = tableData.at(position - 1)?.points;
  if (!currentPoints) {
    return 0;
  }
  return currentPoints - results.at(-1).point;
}

/**
 * Given previous and current standings, returns movement symbols for each team.
 * @param {Array<{teamName: string, points: number}>} prevStandings
 * @param {Array<{teamName: string, points: number}>} currentStandings
 * @returns {Array<{teamName: string, movement: 'UP' | 'DOWN' | 'SAME', diff: number}>}
 */
function getTableMovements(prevStandings, currentStandings) {
  // Build lookup: teamName → previous position
  const prevPositions = {};
  prevStandings.forEach((team, index) => {
    prevPositions[team.teamName] = index + 1;
  });

  // Compare positions between previous and current standings
  return currentStandings.map((team, index) => {
    const currentPos = index + 1;
    const prevPos = prevPositions[team.teamName] ?? currentPos; // fallback if new team
    const diff = prevPos - currentPos; // positive = moved up

    let movement = "SAME";
    if (diff > 0) movement = "UP";
    else if (diff < 0) movement = "DOWN";

    return { teamName: team.teamName, movement, diff, placement: currentPos };
  });
}

function addLast5ToTable(tr, results) {
  const newTd = document.createElement("td");
  tr.append(newTd);
  const newDiv = document.createElement("div");
  newDiv.className = "match-result-container";

  let idx = 0;
  for (const match of results) {
    const aLink = document.createElement("a");
    aLink.className = `match-result ${match.result}`;
    aLink.title = match.tooltip;

    const resultSvg =
      match.result === "W" ? winSvg : match.result === "L" ? lossSvg : drawSvg;
    aLink.innerHTML = resultSvg;
    aLink.href = match.matchLink;

    newDiv.appendChild(aLink);
    idx++;
  }
  newTd.appendChild(newDiv);
}

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

const movementDownSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10px" height="10px" viewBox="0 0 24 24" fill="#ea4335">
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.29289 8.29289C4.68342 7.90237 5.31658 7.90237 5.70711 8.29289L12 14.5858L18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L4.29289 9.70711C3.90237 9.31658 3.90237 8.68342 4.29289 8.29289Z"/>
</svg>`;
const movementUpSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10px" height="10px" viewBox="0 0 24 24" fill="#34a853">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12 7C12.2652 7 12.5196 7.10536 12.7071 7.29289L19.7071 14.2929C20.0976 14.6834 20.0976 15.3166 19.7071 15.7071C19.3166 16.0976 18.6834 16.0976 18.2929 15.7071L12 9.41421L5.70711 15.7071C5.31658 16.0976 4.68342 16.0976 4.29289 15.7071C3.90237 15.3166 3.90237 14.6834 4.29289 14.2929L11.2929 7.29289C11.4804 7.10536 11.7348 7 12 7Z"/>
</svg>`;
const movementSameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10px" height="10px" viewBox="0 0 24 24" fill="#a4a79b">
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="#000000"/>
</svg>`;

function uuidv4() {
  return new Date().getMilliseconds().toString();
}
