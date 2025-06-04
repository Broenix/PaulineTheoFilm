import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Link } from "react-router-dom";
export const TMDB_API_KEY = "4787b0870f0ed437f43d75b333537bdc";


export default function SuggestionsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [proposer, setProposer] = useState("Théo");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const { data, error } = await supabase
      .from("suggestion")
      .select("*")
      .eq("viewed", false)
      .order("added_at", { ascending: false });

    if (!error) setSuggestions(data);
  };

  const searchMovies = async (q) => {
    if (!q) return;
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        q
      )}`
    );
    const data = await res.json();
    setResults(data.results || []);
  };

  const handleSuggest = async () => {
    if (!selectedMovie) return;

    const newSuggestion = {
      movie_id: selectedMovie.id,
      title: selectedMovie.title,
      poster: `https://image.tmdb.org/t/p/w200${selectedMovie.poster_path}`,
      proposer,
      viewed: false,
      added_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("suggestion").insert([newSuggestion]);
    if (!error) {
      setQuery("");
      setResults([]);
      setSelectedMovie(null);
      fetchSuggestions();
    }
  };

  const countByPerson = (name) =>
    suggestions.filter((s) => s.proposer === name).length;

  return (
    <div className="min-h-screen bg-[#fdf0d5]/90 backdrop-blur-md p-6">
      <h1 className="text-3xl font-playfair text-center text-[#003049] mb-6">
        🎁 Propositions de films
      </h1>
      <div className="flex justify-center gap-4 mb-6">
  <Link
    to="/"
    className="inline-block text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition"
  >
    🎬 Retour au classement
  </Link>
  <Link
    to="/stats"
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
            searchMovies(e.target.value);
          }}
          placeholder="🔍 Rechercher un film"
          className="w-full pl-10 pr-10 py-2 rounded-full shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ffb703] bg-white text-[#333] text-sm transition-transform duration-150 ease-out focus:scale-[1.02]"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🎬</span>
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
      {results.length > 0 && !selectedMovie && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
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

      {/* Sélection + ajout */}
      {selectedMovie && (
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
            ➕ Ajouter {selectedMovie.title}
          </button>
        </div>
      )}

      {/* Compteurs */}
      <div className="flex justify-center gap-6 mb-6 text-[#003049] font-semibold">
        <p>🎀 Pauline a proposé : {countByPerson("Pauline")} films</p>
        <p>💀 Théo a proposé : {countByPerson("Théo")} films</p>
      </div>

      {/* Grille des suggestions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {suggestions.map((s) => (
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
    </div>
  );
}
