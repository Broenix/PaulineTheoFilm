
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function SerieRanker() {
  const [series, setSeries] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [rank, setRank] = useState("");
  const [formData, setFormData] = useState({
    watched_at: "",
    watched_place: "Chez Théo",
    custom_place: "",
    theo_slept: false,
    pauline_slept: false,
    viewing_parts: 1,
    viewing_multiple: false,
  });
  const [showRankHint, setShowRankHint] = useState(false);
  const [addedCounter, setAddedCounter] = useState(1);
  const [sortByChrono, setSortByChrono] = useState(false);

  useEffect(() => {
    if (!rank) { setShowRankHint(false); return; }
    const t = setTimeout(() => setShowRankHint(true), 300);
    return () => clearTimeout(t);
  }, [rank]);

  useEffect(() => {
    const fetchSeries = async () => {
      const { data, error } = await supabase
        .from("serie")
        .select("*")
        .order(sortByChrono ? "watched_at" : "rank", { ascending: true });

      if (!error && data) {
        setSeries(data);
        const maxIndex = data.reduce((max, f) => Math.max(max, f.added_index || 0), 0);
        setAddedCounter(maxIndex + 1);
      }
    };
    fetchSeries();
  }, [sortByChrono]);

  const searchSeries = async (q) => {
    if (!q) return;
    const res = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    setResults(data.results || []);
  };

  const handleSubmitSerie = async () => {
    if (!selectedShow || isNaN(parseInt(rank))) return;

    const detailRes = await fetch(
      `https://api.themoviedb.org/3/tv/${selectedShow.id}?api_key=${TMDB_API_KEY}`
    );
    const detail = await detailRes.json();

    const place = formData.watched_place === "Autre" ? formData.custom_place : formData.watched_place;

    await supabase.rpc("shift_ranks_series", { from_rank: parseInt(rank) });

    const episodeRuntime = Array.isArray(detail.episode_run_time) && detail.episode_run_time.length > 0
      ? detail.episode_run_time[0]
      : null;

    const totalEpisodes = (detail.number_of_episodes ?? null);
    const approxTotalMinutes = episodeRuntime && totalEpisodes ? episodeRuntime * totalEpisodes : null;

    const newSerie = {
      title: selectedShow.name,
      poster: `https://image.tmdb.org/t/p/w200${selectedShow.poster_path}`,
      rank: parseInt(rank),
      added_index: addedCounter,
      watched_at: formData.watched_at,
      watched_place: place,
      episode_runtime: episodeRuntime,
      season_count: detail.number_of_seasons ?? null,
      episode_count: totalEpisodes,
      approx_total_minutes: approxTotalMinutes,
      genre: detail.genres?.map((g) => g.name).join(", ") || null,
      original_language: detail.original_language || null,
      added_at: new Date().toISOString(),
      theo_slept: formData.theo_slept,
      pauline_slept: formData.pauline_slept,
      viewing_parts: formData.viewing_parts || 1,
    };

    const { error } = await supabase.from("serie").insert([newSerie]);

    if (!error) {
      // Marquer les suggestions comme vues si elles correspondent
      await supabase
        .from("serie_suggestion")
        .update({ viewed: true })
        .eq("tmdb_id", selectedShow.id);

      const { data: updatedData } = await supabase
        .from("serie")
        .select("*")
        .order("rank", { ascending: true });
      setSeries(updatedData || []);
      setAddedCounter((prev) => prev + 1);
      setQuery("");
      setResults([]);
      setRank("");
      setSelectedShow(null);
      setFormData({ watched_at: "", watched_place: "Chez Théo", custom_place: "", theo_slept: false, pauline_slept: false, viewing_parts: 1, viewing_multiple: false });
    }
  };

  const podium = series.slice(0, 3);
  const rest = series.slice(3);

  const medal = { 0: "🥇", 1: "🥈", 2: "🥉" };

  return (
    <div className="max-w-5xl mx-auto p-4 bg-[#fdf0d5] min-h-screen">
      <div className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-playfair text-[#003049]">
          Les meilleures <span className="underline">séries</span> de la terre
        </h1>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <Link to="/" className="text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition">🎬 Voir les films</Link>
          <Link to="/series-stats" className="text-sm px-4 py-2 rounded-full bg-[#ffb703] text-[#023047] font-semibold shadow hover:bg-[#fb8500] transition">📊 Stats séries</Link>
          <Link to="/series-suggestions" className="text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition">💡 Suggestions séries</Link>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-6">
        <div className="relative max-w-sm mx-auto">
          <input
            type="text"
            className="w-full pl-10 pr-10 py-2 rounded-full shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ffb703] bg-white text-[#333] text-sm transition-transform duration-150 ease-out focus:scale-[1.02]"
            placeholder="🔍 Rechercher une série"
            value={query}
            onChange={(e) => { setQuery(e.target.value); searchSeries(e.target.value); }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">📺</span>
          {query && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 text-xl" onClick={() => setQuery("")} aria-label="Effacer la recherche">×</button>
          )}
        </div>

        {results.length > 0 && !selectedShow && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4 max-h-[400px] overflow-y-auto pr-1">
            {results.map((tv) => (
              <div
                key={tv.id}
                onClick={() => setSelectedShow(tv)}
                className="cursor-pointer border rounded shadow p-1 bg-[#ffc2d1] hover:bg-[#ffb3c6]"
              >
                <img src={`https://image.tmdb.org/t/p/w200${tv.poster_path}`} alt={tv.name} className="w-full h-[150px] object-cover rounded" />
                <p className="text-xs mt-1 text-center font-semibold">{tv.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedShow && (
        <div className="border p-6 rounded-xl shadow-lg bg-white mb-6 space-y-4">
          <h2 className="text-2xl font-bold text-[#003049]">📺 Ajouter une série</h2>
          <p className="text-lg font-semibold text-[#669bbc]">{selectedShow.name}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col text-sm font-medium text-[#003049]">
              🎖️ Rang :
              {showRankHint && (
                <div className="mt-1 text-sm text-gray-600 bg-[#f1faee] border border-[#a8dadc] rounded-md px-3 py-2 shadow-sm">
                  🧠 Donc, au-dessus de :{" "}
                  <strong>{series.find((m) => m.rank === parseInt(rank))?.title || "…"}</strong><br />
                  et en dessous de :{" "}
                  <strong>{series.find((m) => m.rank === parseInt(rank) - 1)?.title || "début de la liste"}</strong>
                </div>
              )}
              <input type="number" className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner" value={rank} onChange={(e) => setRank(e.target.value)} />
            </label>

            <label className="flex flex-col text-sm font-medium text-[#003049]">
              📅 Date :
              <input type="date" className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner" value={formData.watched_at} onChange={(e) => setFormData((f) => ({ ...f, watched_at: e.target.value }))} />
            </label>

            <label className="flex flex-col text-sm font-medium text-[#003049]">
              📍 Lieu :
              <select className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner" value={formData.watched_place} onChange={(e) => setFormData((f) => ({ ...f, watched_place: e.target.value }))}>
                <option>Chez Théo</option>
                <option>Chez Pauline</option>
                <option>Au cinéma</option>
                <option>Autre</option>
              </select>
            </label>

            {formData.watched_place === "Autre" && (
              <input type="text" placeholder="Précisez le lieu..." className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner col-span-2" value={formData.custom_place} onChange={(e) => setFormData((f) => ({ ...f, custom_place: e.target.value }))} />
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <label className="text-sm text-[#003049]">
              <input type="checkbox" checked={formData.theo_slept} onChange={(e) => setFormData((f) => ({ ...f, theo_slept: e.target.checked }))} className="mr-2" />
              🛏️ Théo a fait un dodo d’énorme bébé
            </label>
            <label className="text-sm text-[#003049]">
              <input type="checkbox" checked={formData.pauline_slept} onChange={(e) => setFormData((f) => ({ ...f, pauline_slept: e.target.checked }))} className="mr-2" />
              🛌 Pauline a fait un dodo d’énorme bébé
            </label>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <label className="text-sm text-[#003049] flex items-center">
              <input
                type="checkbox"
                checked={formData.viewing_multiple}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    viewing_multiple: e.target.checked,
                    viewing_parts: e.target.checked ? 2 : 1,
                  }))
                }
                className="mr-2"
              />
              🎬 Vu en plusieurs fois ?
            </label>

            {formData.viewing_multiple && (
              <input
                type="number"
                min="2"
                className="border p-2 rounded bg-[#fdf0d5] shadow-inner w-24"
                value={formData.viewing_parts}
                onChange={(e) => setFormData((f) => ({ ...f, viewing_parts: parseInt(e.target.value) }))}
                placeholder="Nb"
              />
            )}
          </div>

          <button onClick={handleSubmitSerie} className="w-full mt-4 px-6 py-3 bg-[#ffb703] text-[#023047] font-bold rounded-full hover:bg-[#fb8500] transition-transform hover:scale-105 shadow-md">
            ➕ Ajouter la série à la liste
          </button>
        </div>
      )}

      <div className="text-center mb-6">
        <button onClick={() => setSortByChrono((prev) => !prev)} className="text-sm text-[#003049] underline hover:text-[#ffb3c6]">
          {sortByChrono ? "Voir par rang de préférence" : "Voir en ordre chronologique"}
        </button>
      </div>

      {/* Podium */}
      {!sortByChrono && (
        <div className="flex justify-center items-end gap-4 mb-10">
          {podium.map((show, index) => {
            const isFirst = index === 0;
            const heightClass = isFirst ? "h-72 sm:h-80" : "h-60 sm:h-64";
            const widthClass = isFirst ? "w-48 sm:w-56" : "w-36 sm:w-40";
            const marginTop = isFirst ? "mt-0" : "mt-8";
            const orderClass = index === 1 ? "order-1" : isFirst ? "order-2" : "order-3";

            return (
              <motion.div key={show.id} className={`relative flex flex-col items-center group ${marginTop} ${orderClass}`}>
                <div className="absolute -top-5 bg-[#ffc2d1] text-xl px-3 py-1 rounded-full shadow-md z-20">
                  {medal[index]}
                </div>
                <img src={show.poster} alt={show.title} className={`rounded shadow-xl object-cover ${heightClass} ${widthClass}`} />

                <div className="absolute left-1/1 -translate-x-1/2 mt-2 p-2 bg-white border rounded shadow-lg hidden group-hover:flex gap-2 z-40 before:absolute before:top-[-6px] before:left-1/2 before:-translate-x-1/2 before:w-3 before:h-3 before:bg-white before:rotate-45 before:border-l before:border-t before:border-gray-300">
                  <div className="text-sm max-w-xs text-left">
                    <p className="font-medium">{show.title}</p>
                    <p className="text-gray-500">Ajouté en {show.added_index}ᵉ</p>
                    <p className="text-gray-500">📅 {show.watched_at}</p>
                    <p className="text-gray-500">📍 {show.watched_place}</p>
                    <p className="text-gray-500">🧩 {show.season_count} saisons, {show.episode_count} épisodes</p>
                    {show.episode_runtime && <p className="text-gray-500">🕒 {show.episode_runtime} min / épisode</p>}
                    {show.approx_total_minutes && <p className="text-gray-500">⏱️ ~{Math.round(show.approx_total_minutes/60)}h au total</p>}
                    <p className="text-gray-500">🎞️ {show.genre}</p>
                    <p className="text-gray-500">🛏️ Théo : {show.theo_slept ? "Oui" : "Non"}</p>
                    <p className="text-gray-500">🛌 Pauline : {show.pauline_slept ? "Oui" : "Non"}</p>
                    <p className="text-gray-500">🎬 Vu en {show.viewing_parts || 1} fois</p>
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
          {(sortByChrono ? series : rest).map((show) => (
            <motion.li
              key={show.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="group relative border rounded-lg p-3 shadow bg-[#fff]"
            >
              <span className="font-semibold text-lg text-[#669bbc]">
                {show.rank} - {show.title}
              </span>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: -8 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max max-w-xs p-3 bg-white border border-gray-200 rounded-xl shadow-xl z-30 group-hover:flex hidden gap-3 pointer-events-none"
              >
                <img src={show.poster} alt={show.title} className="w-20 h-auto rounded shadow" />
                <div className="text-sm text-left text-gray-700">
                  <p className="font-semibold text-[#003049]">{show.title}</p>
                  <p className="text-gray-500">Ajouté en {show.added_index}ᵉ</p>
                  <p className="text-gray-500">📅 {show.watched_at}</p>
                  <p className="text-gray-500">📍 {show.watched_place}</p>
                  <p className="text-gray-500">🧩 {show.season_count} saisons, {show.episode_count} épisodes</p>
                  {show.episode_runtime && <p className="text-gray-500">🕒 {show.episode_runtime} min / épisode</p>}
                  <p className="text-gray-500">🎞️ {show.genre}</p>
                  <p className="text-gray-500">🛏️ Théo : {show.theo_slept ? "Oui" : "Non"}</p>
                  <p className="text-gray-500">🛌 Pauline : {show.pauline_slept ? "Oui" : "Non"}</p>
                </div>
              </motion.div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
