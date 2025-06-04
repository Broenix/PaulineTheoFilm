import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function MovieRanker() {
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rank, setRank] = useState("");
  const [formData, setFormData] = useState({
    watched_at: "",
    watched_place: "Chez Théo",
    custom_place: "",
    theo_slept: false,
    pauline_slept: false,
  });
  const [showRankHint, setShowRankHint] = useState(false);
  const [addedCounter, setAddedCounter] = useState(1);
  const [sortByChrono, setSortByChrono] = useState(false);

function SparklingPauline() {
  const stars = Array.from({ length: 40 });

  return (
    <span className="sparkle-wrapper relative text-pink-500 font-extrabold inline-block">
      <span className="absolute -left-5 -top-6 text-2xl animate-bounce">🦄</span>
      <span className="absolute right-0 -top-4 text-2xl animate-ping">🌈</span>
      <span className="absolute left-1/2 top-full text-xl animate-bounce mt-1">✨</span>
      Pauline
      {stars.map((_, i) => {
        const top = Math.random() * 100;
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const scale = 0.7 + Math.random() * 1.5;
        return (
          <span
            key={i}
            className="sparkle-star"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              animationDelay: `${delay}s`,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </span>
  );
}

function DarkAuraTheo() {
  return (
    <span className="dark-aura-theo text-white font-extrabold relative inline-block">
      <span className="eyes absolute -top-0 left-3/2 flex justify-between w-10 -translate-x-1/2 pointer-events-none">
        <span className="eye-red" />
        <span className="eye-red" />
      </span>
      Théo
      <span className="aura-shadow" />
      <span className="aura-glow" />
      <span className="skull skull-1">💀</span>
      <span className="skull skull-2">💀</span>
      <span className="skull skull-3">💀</span>
      <svg className="smoke" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="40" fill="rgba(0,0,0,0.15)" />
      </svg>
    </span>
  );
}

useEffect(() => {
  if (!rank) {
    setShowRankHint(false);
    return;
  }

  const timeout = setTimeout(() => {
    setShowRankHint(true);
  }, 300); // délai avant affichage

  return () => clearTimeout(timeout); // nettoyage si rank change vite
}, [rank]);

  useEffect(() => {
    const fetchMovies = async () => {
      const { data, error } = await supabase
        .from("film")
        .select("*")
        .order(sortByChrono ? "watched_at" : "rank", { ascending: true });

      if (!error) {
        setMovies(data);
        const maxIndex = data.reduce((max, f) => Math.max(max, f.added_index || 0), 0);
        setAddedCounter(maxIndex + 1);
      }
    };
    fetchMovies();
  }, [sortByChrono]);

  const searchMovies = async (q) => {
    if (!q) return;
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    setResults(data.results || []);
  };

  const handleSubmitMovie = async () => {
    if (!selectedMovie || isNaN(parseInt(rank))) return;

    const detailRes = await fetch(
      `https://api.themoviedb.org/3/movie/${selectedMovie.id}?api_key=${TMDB_API_KEY}`
    );
    const detail = await detailRes.json();

    const place = formData.watched_place === "Autre" ? formData.custom_place : formData.watched_place;

    await supabase.rpc("shift_ranks", { from_rank: parseInt(rank) });

    const newFilm = {
      title: selectedMovie.title,
      poster: `https://image.tmdb.org/t/p/w200${selectedMovie.poster_path}`,
      rank: parseInt(rank),
      added_index: addedCounter,
      watched_at: formData.watched_at,
      watched_place: place,
      runtime_minutes: detail.runtime || null,
      genre: detail.genres.map((g) => g.name).join(", "),
      added_at: new Date().toISOString(),
      theo_slept: formData.theo_slept,
      pauline_slept: formData.pauline_slept
    };

    const { error } = await supabase.from("film").insert([newFilm]);

    if (!error) {
      // Marquer les suggestions comme vues si elles correspondent
      await supabase
        .from("suggestion")
        .update({ viewed: true })
        .eq("movie_id", selectedMovie.id);

      const { data: updatedData } = await supabase
        .from("film")
        .select("*")
        .order("rank", { ascending: true });
      setMovies(updatedData);
      setAddedCounter((prev) => prev + 1);
      setQuery("");
      setResults([]);
      setRank("");
      setSelectedMovie(null);
      setFormData({ watched_at: "", watched_place: "Chez Théo", custom_place: "", theo_slept: false, pauline_slept: false });
    }
  };

  const podium = movies.slice(0, 3);
  const rest = movies.slice(3);

  const podiumStyles = {
    0: "order-2 scale-125 z-20",
    1: "order-1 scale-110 z-10",
    2: "order-3 scale-105 z-10"
  };

  const medal = {
    0: "🥇",
    1: "🥈",
    2: "🥉"
  };

  return (
    <div className="max-w-5xl mx-auto p-4 bg-[#fdf0d5] min-h-screen">
<div className="mb-6">
  <h1 className="text-4xl sm:text-5xl font-playfair text-center text-[#003049] leading-snug">
    Les meilleurs films de la terre,<br />
    dans l'ordre, d'après <SparklingPauline /> et <DarkAuraTheo />,<br />
    suite à un accord commun<br className="hidden sm:block" />et zéro disputes.
  </h1>
</div>

<div className="flex flex-wrap justify-center gap-4 mb-8">
  <Link
    to="/stats"
    className="text-sm px-4 py-2 rounded-full bg-[#ffb703] text-[#023047] font-semibold shadow hover:bg-[#fb8500] transition"
  >
    📊 Voir les stats
  </Link>
  <Link
    to="/suggestions"
    className="text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition"
  >
    💡 Voir les suggestions de films
  </Link>
</div>




      <div className="mb-6">
<div className="relative max-w-sm mx-auto">
  <input
    type="text"
    className={`w-full pl-10 pr-10 py-2 rounded-full shadow-sm border border-gray-300 
                focus:outline-none focus:ring-2 focus:ring-[#ffb703] bg-white text-[#333] 
                text-sm transition-transform duration-150 ease-out focus:scale-[1.02]`}
    placeholder="🔍 Rechercher un film"
    value={query}
    onChange={(e) => {
      setQuery(e.target.value);
      searchMovies(e.target.value);
    }}
  />
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🎬</span>

  {query && (
    <button
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 text-xl"
      onClick={() => setQuery("")}
      aria-label="Effacer la recherche"
    >
      ×
    </button>
  )}
</div>


        {results.length > 0 && !selectedMovie && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {results.slice(0, 6).map((movie) => (
              <div
                key={movie.id}
                onClick={() => setSelectedMovie(movie)}
                className="cursor-pointer border rounded shadow p-2 bg-[#ffc2d1] hover:bg-[#ffb3c6]"
              >
                <img
                  src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-auto rounded"
                />
                <p className="text-sm mt-2 text-center font-semibold">{movie.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

{selectedMovie && (
  <div className="border p-6 rounded-xl shadow-lg bg-white mb-6 space-y-4">
    <h2 className="text-2xl font-bold text-[#003049]">🎬 Ajouter un film</h2>
    <p className="text-lg font-semibold text-[#669bbc]">{selectedMovie.title}</p>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <label className="flex flex-col text-sm font-medium text-[#003049]">
        🎖️ Rang :
        {showRankHint && (
  <div className="mt-1 text-sm text-gray-600 bg-[#f1faee] border border-[#a8dadc] rounded-md px-3 py-2 shadow-sm animate-fadeIn">
    🧠 Donc, au-dessus de :{" "}
    <strong>
      {movies.find((m) => m.rank === parseInt(rank))?.title || "…"}
    </strong>{" "}
    <br />
    et en dessous de :{" "}
    <strong>
      {movies.find((m) => m.rank === parseInt(rank) - 1)?.title || "début de la liste"}
    </strong>
  </div>
)}

        <input
          type="number"
          className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
        />
      </label>

      <label className="flex flex-col text-sm font-medium text-[#003049]">
        📅 Date :
        <input
          type="date"
          className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner"
          value={formData.watched_at}
          onChange={(e) => setFormData((f) => ({ ...f, watched_at: e.target.value }))}
        />
      </label>

      <label className="flex flex-col text-sm font-medium text-[#003049]">
        📍 Lieu :
        <select
          className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner"
          value={formData.watched_place}
          onChange={(e) => setFormData((f) => ({ ...f, watched_place: e.target.value }))}
        >
          <option>Chez Théo</option>
          <option>Chez Pauline</option>
          <option>Au cinéma</option>
          <option>Autre</option>
        </select>
      </label>

      {formData.watched_place === "Autre" && (
        <input
          type="text"
          placeholder="Précisez le lieu..."
          className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner col-span-2"
          value={formData.custom_place}
          onChange={(e) => setFormData((f) => ({ ...f, custom_place: e.target.value }))}
        />
      )}
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
      <label className="text-sm text-[#003049]">
        <input
          type="checkbox"
          checked={formData.theo_slept}
          onChange={(e) => setFormData((f) => ({ ...f, theo_slept: e.target.checked }))}
          className="mr-2"
        />
        🛏️ Théo a fait un dodo d’énorme bébé
      </label>

      <label className="text-sm text-[#003049]">
        <input
          type="checkbox"
          checked={formData.pauline_slept}
          onChange={(e) => setFormData((f) => ({ ...f, pauline_slept: e.target.checked }))}
          className="mr-2"
        />
        🛌 Pauline a fait un dodo d’énorme bébé
      </label>
    </div>

    <button
      onClick={handleSubmitMovie}
      className="w-full mt-4 px-6 py-3 bg-[#ffb703] text-[#023047] font-bold rounded-full hover:bg-[#fb8500] transition-transform hover:scale-105 shadow-md"
    >
      🍿 Ajouter le film à la liste
    </button>
  </div>
)}


      <div className="text-center mb-6">
        <button
          onClick={() => setSortByChrono((prev) => !prev)}
          className="text-sm text-[#003049] underline hover:text-[#ffb3c6]"
        >
          {sortByChrono ? "Voir par rang de préférence" : "Voir en ordre chronologique"}
        </button>
      </div>

      {/* Podium */}
{!sortByChrono && (
  <div className="flex justify-center items-end gap-4 mb-10">
    {podium.map((movie, index) => {
      const isFirst = index === 0;
      const isSecond = index === 1;
      const isThird = index === 2;

      const heightClass = isFirst
        ? "h-72 sm:h-80"
        : "h-60 sm:h-64";

      const widthClass = isFirst
        ? "w-48 sm:w-56"
        : "w-36 sm:w-40";

      const marginTop = isFirst
        ? "mt-0"
        : "mt-8"; // Décalage pour les 2e et 3e place

      const orderClass = isSecond
        ? "order-1"
        : isFirst
        ? "order-2"
        : "order-3";

      return (
        <motion.div
          key={movie.id}
          className={`relative flex flex-col items-center group ${marginTop} ${orderClass}`}
        >
          <div className="absolute -top-5 bg-[#ffc2d1] text-xl px-3 py-1 rounded-full shadow-md z-20">
            {medal[index]}
          </div>
          <img
            src={movie.poster}
            alt={movie.title}
            className={`rounded shadow-xl object-cover ${heightClass} ${widthClass}`}
          />

          {/* Info tooltip on hover */}
          <div className="absolute left-1/1 -translate-x-1/2 mt-2 p-2 bg-white border rounded shadow-lg hidden group-hover:flex gap-2 z-40 before:absolute before:top-[-6px] before:left-1/2 before:-translate-x-1/2 before:w-3 before:h-3 before:bg-white before:rotate-45 before:border-l before:border-t before:border-gray-300">
            <div className="text-sm max-w-xs text-left">
              <p className="font-medium">{movie.title}</p>
              <p className="text-gray-500">Ajouté en {movie.added_index}ᵉ</p>
              <p className="text-gray-500">📅 {movie.watched_at}</p>
              <p className="text-gray-500">📍 {movie.watched_place}</p>
              <p className="text-gray-500">🕒 {movie.runtime_minutes} min</p>
              <p className="text-gray-500">🎞️ {movie.genre}</p>
              <p className="text-gray-500">🛏️ Théo : {movie.theo_slept ? "Oui" : "Non"}</p>
              <p className="text-gray-500">🛌 Pauline : {movie.pauline_slept ? "Oui" : "Non"}</p>
            </div>
          </div>
        </motion.div>
      );
    })}
  </div>
)}

      <h2 className="text-xl font-semibold mb-4 text-center text-[#003049]">Classement complet</h2>
      <ul className="space-y-4 text-center">
        <AnimatePresence>
          {(sortByChrono ? movies : rest).map((movie) => (
            <motion.li
              key={movie.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="group relative border rounded-lg p-3 shadow bg-[#fff]"
            >
              <span className="font-semibold text-lg text-[#669bbc]">
                {movie.rank} - {movie.title}
              </span>
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: -8 }}
  exit={{ opacity: 0, y: 10 }}
  transition={{ duration: 0.2 }}
  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max max-w-xs p-3 bg-white border border-gray-200 rounded-xl shadow-xl z-30 group-hover:flex hidden gap-3 pointer-events-none"
>
  <img src={movie.poster} alt={movie.title} className="w-20 h-auto rounded shadow" />
  <div className="text-sm text-left text-gray-700">
    <p className="font-semibold text-[#003049]">{movie.title}</p>
    <p className="text-gray-500">Ajouté en {movie.added_index}ᵉ</p>
    <p className="text-gray-500">📅 {movie.watched_at}</p>
    <p className="text-gray-500">📍 {movie.watched_place}</p>
    <p className="text-gray-500">🕒 {movie.runtime_minutes} min</p>
    <p className="text-gray-500">🎞️ {movie.genre}</p>
    <p className="text-gray-500">🛏️ Théo : {movie.theo_slept ? "Oui" : "Non"}</p>
    <p className="text-gray-500">🛌 Pauline : {movie.pauline_slept ? "Oui" : "Non"}</p>
  </div>
</motion.div>

            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
