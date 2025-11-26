import { useState, useEffect } from "preact/hooks";
import { h, render } from 'preact';


// Make the title nicer
document.title = "IBIS+";

// Remove IBIS homepage UI
const existing = document.querySelector("#container");
if (existing) existing.remove();

// Create mount point
const root = document.createElement("div");
root.id = "ibisPlusRoot";
document.body.prepend(root);

// Helper injected to service worker
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === "GET_PAGE_TITLE") {
    respond(document.title);
  }
});

// Main App Component
export function App() {
  const [tableHtml, setTableHtml  ] = useState()

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "parseHTML") {
        const { html, table: tableData } = message;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const table= doc.querySelector('.clTblStandings')
        setTableHtml(table.outerHTML);

      }
    });
  }, [setTableHtml]);

  return (
    <>
      <header>
        <h2 style={{ marginTop: 0 }}>IBIS+</h2>
      </header>
      <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <section style={{ border: "1px solid red" }}>
          <button
            onClick={() => {
              chrome.runtime.sendMessage({
                action: "getTable",
                table: [],
                leagueId: 42065,
              });
            }}
          >
            send msg
          </button>
          {!!tableHtml && <div dangerouslySetInnerHTML={{__html: tableHtml}}/>}

        </section>
        <aside style={{ border: "1px solid blue" }}>
        </aside>
      </main>
    </>
  );
}

// Make the page visible again if previously hidden by CSS injection
document.documentElement.style.display = "block";
document.body.style.display = "block";

// Mount the app
const ibisplusroot = document.getElementById('ibisPlusRoot');
render(h(App, {}), ibisplusroot);
