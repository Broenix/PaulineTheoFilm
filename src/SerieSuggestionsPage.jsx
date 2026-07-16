import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "./supabaseClient";
import { Link } from "react-router-dom";
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function SerieSuggestionsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [proposer, setProposer] = useState("Théo");
  const [suggestions, setSuggestions] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedRandom, setSelectedRandom] = useState(null);
  const [rollingPosters, setRollingPosters] = useState([]);
  const allGenres = Array.from(
    new Set(
      suggestions.flatMap((s) =>
        s.genres?.split(",").map((g) => g.trim()) || []
      )
    )
  ).sort();

  const [filters, setFilters] = useState({
    duration: "",
    genres: [],
    language: ""
  });

  const handleRandomPick = () => {
    const filtered = suggestions.filter((s) => {
      if (filters.duration && s.episode_runtime > parseInt(filters.duration)) return false;
      if (filters.genres.length > 0 && s.genres) {
        const serieGenres = s.genres.toLowerCase().split(",").map(g => g.trim());
        if (!filters.genres.some(g => serieGenres.includes(g.toLowerCase()))) return false;
      }
      if (filters.language) {
        const lang = s.original_language?.toLowerCase();
        if (filters.language === "other") {
          if (lang === "fr" || lang === "en") return false;
        } else if (lang !== filters.language.toLowerCase()) return false;
      }
      return true;
    });
    if (filtered.length === 0) return;

    const rollCount = Math.floor(Math.random() * 30) + 20;
    setIsRolling(true);
    let index = 0;

    const interval = setInterval(() => {
      setRollingPosters((prev) => {
        const next = filtered[index % filtered.length];
        const updated = [...prev.slice(-2), next];
        return updated;
      });

      index++;
      if (index >= rollCount) {
        clearInterval(interval);
        setTimeout(() => {
          const chosen = filtered[(index - 1) % filtered.length];
          setSelectedRandom(chosen);
          setIsRolling(false);

          const fireworkBurst = () => {
            const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
            const burst = () => {
              confetti({
                particleCount: 150,
                angle: Math.random() * 360,
                spread: 70 + Math.random() * 30,
                startVelocity: 60,
                gravity: 0.8,
                scalar: 1.4,
                origin: {
                  x: Math.random() * 0.9 + 0.05,
                  y: Math.random() * 0.6,
                },
                colors: [colors[Math.floor(Math.random() * colors.length)]],
              });
            };

            for (let i = 0; i < 10; i++) {
              setTimeout(burst, i * 200);
            }

            setTimeout(() => {
              for (let i = 0; i < 5; i++) {
                burst();
              }
            }, 2200);
          };

          fireworkBurst();
        }, 400);
      }
    }, 400);
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    const shouldBlockScroll = isRolling || selectedRandom !== null;
    document.body.style.overflow = shouldBlockScroll ? 'hidden' : 'auto';

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isRolling, selectedRandom]);

  const fetchSuggestions = async () => {
    const { data, error } = await supabase
      .from("serie_suggestion")
      .select("*")
      .eq("viewed", false)
      .order("added_at", { ascending: false });

    if (!error) setSuggestions(data);
  };

  const searchSeries = async (q) => {
    if (!q) return;
    const res = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    setResults(data.results || []);
  };

  const handleSuggest = async () => {
    if (!selectedShow) return;

    const detailRes = await fetch(
      `https://api.themoviedb.org/3/tv/${selectedShow.id}?api_key=${TMDB_API_KEY}`
    );
    const detail = await detailRes.json();

    const episodeRuntime = Array.isArray(detail.episode_run_time) && detail.episode_run_time.length > 0
      ? detail.episode_run_time[0]
      : null;

    const newSuggestion = {
      tmdb_id: selectedShow.id,
      title: selectedShow.name,
      poster: `https://image.tmdb.org/t/p/w200${selectedShow.poster_path}`,
      proposer,
      viewed: false,
      added_at: new Date().toISOString(),
      first_air_date: detail.first_air_date || null,
      episode_runtime: episodeRuntime,
      genres: detail.genres?.map(g => g.name).join(", ") || null,
      original_language: detail.original_language || null,
      tmdb_vote: detail.vote_average || null,
    };

    const { error } = await supabase.from("serie_suggestion").insert([newSuggestion]);
    if (!error) {
      setQuery("");
      setResults([]);
      setSelectedShow(null);
      fetchSuggestions();
    }
  };

  const countByPerson = (name) =>
    suggestions.filter((s) => s.proposer === name).length;

  return (
    <div className="min-h-screen bg-[#fdf0d5]/90 backdrop-blur-md p-6">
      <h1 className="text-3xl font-playfair text-center text-[#003049] mb-6">
        🎁 Propositions de séries
      </h1>
      <div className="flex justify-center gap-4 mb-6">
        <Link
          to="/series"
          className="inline-block text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition"
        >
          📺 Retour au classement
        </Link>
        <Link
          to="/series-stats"
          className="inline-block text-sm px-4 py-2 rounded-full bg-[#ffb703] text-[#023047] font-semibold shadow hover:bg-[#fb8500] transition"
        >
          📊 Voir les stats
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="max-w-md mx-auto mb-4 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchSeries(e.target.value);
          }}
          placeholder="🔍 Rechercher une série"
          className="w-full pl-10 pr-10 py-2 rounded-full shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ffb703] bg-white text-[#333] text-sm transition-transform duration-150 ease-out focus:scale-[1.02]"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">📺</span>
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 text-xl"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        )}
      </div>

      {/* Résultats */}
      {results.length > 0 && !selectedShow && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4 max-h-[500px] overflow-y-auto pr-1">
          {results.map((tv) => (
            <div
              key={tv.id}
              onClick={() => setSelectedShow(tv)}
              className="cursor-pointer border rounded shadow bg-white p-2 flex flex-col items-center hover:scale-[1.02] transition"
            >
              <div className="w-full h-[300px] flex items-center justify-center">
                <img
                  src={`https://image.tmdb.org/t/p/w200${tv.poster_path}`}
                  alt={tv.name}
                  className="h-full object-contain rounded"
                />
              </div>
              <p className="text-xs mt-2 text-center font-semibold text-[#003049]">{tv.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sélection + ajout */}
      {selectedShow && (
        <div className="bg-white p-4 rounded shadow mb-6 max-w-xl mx-auto">
          <p className="font-semibold mb-2">Proposé par :</p>
          <select
            value={proposer}
            onChange={(e) => setProposer(e.target.value)}
            className="border p-2 rounded bg-[#fdf0d5] mb-4"
          >
            <option>Théo</option>
            <option>Pauline</option>
          </select>

          <button
            onClick={handleSuggest}
            className="block w-full px-4 py-2 rounded bg-[#ffb703] text-[#023047] font-bold hover:bg-[#fb8500] transition"
          >
            ➕ Ajouter {selectedShow.name}
          </button>
        </div>
      )}

      {/* Compteurs */}
      <div className="flex justify-center gap-6 mb-6 text-[#003049] font-semibold">
        <p>🎀 Pauline a proposé : {countByPerson("Pauline")} séries</p>
        <p>💀 Théo a proposé : {countByPerson("Théo")} séries</p>
      </div>

      <div className="group relative max-w-4xl mx-auto mb-6">
        <div className="cursor-pointer bg-[#003049] text-white px-4 py-2 rounded-t shadow font-semibold w-fit">
          🎯 On mate quoi bb ?
        </div>

        <div className="w-full bg-white shadow rounded-b overflow-hidden transition-all duration-500 ease-in-out max-h-0 group-hover:max-h-[500px]">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4 text-[#003049]">Filtres</h2>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "⏱️ Tout", value: "" },
                  { label: "⏱️ 25min ou moins / ép.", value: "25" },
                  { label: "⏱️ 45min ou moins / ép.", value: "45" },
                  { label: "⏱️ 60min ou moins / ép.", value: "60" },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setFilters((f) => ({ ...f, duration: value }))}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      filters.duration === value
                        ? "bg-[#ffb703] text-[#023047] font-bold"
                        : "bg-[#fdf0d5] text-[#333]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="border-t pt-4">
                {allGenres.map((genre) => {
                  const isActive = filters.genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() =>
                        setFilters((f) =>
                          isActive
                            ? { ...f, genres: f.genres.filter((g) => g !== genre) }
                            : { ...f, genres: [...f.genres, genre] }
                        )
                      }
                      className={`px-3 py-1 rounded-full border text-sm ${
                        isActive
                          ? "bg-[#ffb703] text-[#023047] font-bold"
                          : "bg-[#fdf0d5] text-[#333]"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              <div className="border-t pt-4">
                {[
                  { label: "🌍 Tout", code: "" },
                  { label: "🇫🇷 Français", code: "fr" },
                  { label: "🇬🇧 Anglais", code: "en" },
                  { label: "🔤 Autre", code: "other" },
                ].map(({ label, code }) => (
                  <button
                    key={code}
                    onClick={() =>
                      setFilters((f) => ({ ...f, language: code }))
                    }
                    className={`px-3 py-1 rounded-full border text-sm ${
                      filters.language === code
                        ? "bg-[#ffb703] text-[#023047] font-bold"
                        : "bg-[#fdf0d5] text-[#333]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between flex-wrap gap-3 mt-4">
              <button
                onClick={() =>
                  setFilters({ duration: "", genres: [], language: "" })
                }
                className="text-sm px-4 py-2 rounded-full bg-[#e63946] text-white font-semibold shadow hover:bg-[#d62828] transition"
              >
                🔄 Réinitialiser les filtres
              </button>
              <button
                onClick={handleRandomPick}
                className="text-sm px-4 py-2 rounded-full bg-[#219ebc] text-white font-semibold shadow hover:bg-[#023047] transition"
              >
                🎲 Choisir une série au hasard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des suggestions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {suggestions
          .filter((s) => {
            if (filters.duration && s.episode_runtime && s.episode_runtime > parseInt(filters.duration)) {
              return false;
            }
            if (Array.isArray(filters.genres) && filters.genres.length > 0 && s.genres) {
              const serieGenres = s.genres.toLowerCase().split(",").map((g) => g.trim());
              const hasCommon = filters.genres.some((g) =>
                serieGenres.includes(g.toLowerCase())
              );
              if (!hasCommon) return false;
            }
            if (filters.language) {
              const lang = s.original_language?.toLowerCase();
              if (filters.language === "other") {
                if (lang === "fr" || lang === "en") return false;
              } else if (lang !== filters.language.toLowerCase()) {
                return false;
              }
            }
            return true;
          })
          .map((s) => (
            <div key={s.id} className="relative border rounded shadow bg-white p-2">
              <img src={s.poster} alt={s.title} className="w-full h-auto rounded" />
              <p className="text-sm text-center mt-2 text-[#003049] font-medium">
                {s.title}
              </p>
              <p className="text-xs text-center text-gray-500 italic">
                proposé par {s.proposer}
              </p>
            </div>
          ))}
      </div>

      {isRolling && (
        <div className="fixed top-0 left-0 w-full h-screen bg-black bg-opacity-90 z-50">
          <div className="pt-4 pb-8 px-4 flex justify-center mt-[200px]">
            <div className="flex gap-4 items-center backdrop-blur-sm rounded-lg">
              {rollingPosters.length >= 3 && (
                <img
                  src={rollingPosters[rollingPosters.length - 1]?.poster}
                  alt="Suivant"
                  className="w-[180px] h-[270px] object-cover rounded opacity-50 scale-90 shadow-xl transition-all duration-300"
                />
              )}
              {rollingPosters.length >= 2 && (
                <div className="w-[360px] h-[540px] bg-white p-4 rounded shadow-2xl flex items-center justify-center scale-105 transition-all duration-300">
                  <img
                    src={rollingPosters[rollingPosters.length - 2]?.poster}
                    alt="Actuel"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              )}
              {rollingPosters.length >= 3 && (
                <img
                  src={rollingPosters[rollingPosters.length - 3]?.poster}
                  alt="Précédent"
                  className="w-[180px] h-[270px] object-cover rounded opacity-50 scale-90 shadow-xl transition-all duration-300"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {selectedRandom && (
        <div className="fixed top-0 left-0 w-full h-screen bg-black bg-opacity-80 z-50">
          <div className="pt-6 pb-12 px-4 flex justify-center">
            <div className="bg-white p-6 rounded shadow-lg text-center max-w-md w-[90%]">
              <img
                src={selectedRandom.poster}
                alt={selectedRandom.title}
                className="w-full h-auto rounded mb-4"
              />
              <h2 className="text-xl font-bold mb-2 text-[#003049]">
                {selectedRandom.title}
              </h2>
              <p className="text-sm text-gray-600 mb-2 italic">
                proposé par {selectedRandom.proposer}
              </p>
              {selectedRandom.episode_runtime && <p className="text-sm">⏱️ {selectedRandom.episode_runtime} min / épisode</p>}
              <p className="text-sm">🎭 {selectedRandom.genres}</p>
              <p className="text-sm">🌍 Langue : {selectedRandom.original_language}</p>
              <button
                onClick={() => setSelectedRandom(null)}
                className="mt-4 px-4 py-2 rounded bg-[#e63946] text-white hover:bg-[#d62828] transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
