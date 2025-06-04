import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function BackgroundCarousel() {
  const [posters, setPosters] = useState([]);
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    const fetchPosters = async () => {
      const { data, error } = await supabase.from("film").select("poster");
      if (!error) {
        setPosters(data.map(f => f.poster));
      }
    };
    fetchPosters();
  }, []);

  useEffect(() => {
    const updateRowCount = () => {
      const rowHeight = 160; // hauteur approximative de chaque ligne
      setRowCount(Math.ceil(window.innerHeight / rowHeight));
    };
    updateRowCount();
    window.addEventListener("resize", updateRowCount);
    return () => window.removeEventListener("resize", updateRowCount);
  }, []);

  if (posters.length === 0) return null;

  return (
    <div className="background-carousel">
      {Array.from({ length: rowCount }).map((_, rowIdx) => {
        const shuffledPosters = shuffleArray(posters);
        const repeated = Array(50).fill(shuffledPosters).flat(); // super long pour éviter toute saccade

        return (
          <div className="carousel-row-wrapper" key={rowIdx}>
            <div className={`carousel-track ${rowIdx % 2 === 0 ? "left" : "right"}`}>
              {repeated.map((poster, i) => (
                <img src={poster} alt="" key={`${rowIdx}-${i}`} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
