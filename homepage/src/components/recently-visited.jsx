import { useEffect, useState } from "preact/hooks";
export function RecentlyVisited() {
  const [recentPages, setRecentPages] = useState([]);

  useEffect(() => {
chrome.storage.local.get("recentPages").then(({ recentPages })=>{

  setRecentPages(recentPages);
});
  }, []);

  return (
    <ul>
      {recentPages.map((recentPage) => {
        <li key={recentPage.title}>
          <a href={recentPage.url}>{recentPage.title}</a>
        </li>;
      })}
    </ul>
  );
}
