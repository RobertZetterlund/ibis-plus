
import { useEffect, useState,useMemo } from "preact/hooks";
export function Favorites() {
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    chrome.storage.local.get("favorites").then(({ favorites })=> {

      setFavorites(favorites);
    });
  }, []);


  const favoritesList = useMemo(() => {
    return Array.from(Object.values(favorites)).sort((aFav,bFav) => (
        aFav.favoritedAt.getMilliseconds() - bFav.favoritedAt.getMilliseconds()
    ))
  },[favorites])


  return (
    <ul>
      {favoritesList.map((recentPage) => 
        <li key={recentPage.title}>
          <a href={recentPage.url}>{recentPage.title}</a>
        </li>
      )}
    </ul>
  );
}
