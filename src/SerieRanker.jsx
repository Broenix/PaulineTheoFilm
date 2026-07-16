import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// Petit encadré "au-dessus de / en dessous de" réutilisé pour les deux
// classements (saisons d'une série, et séries entre elles).
function RankHint({ rank, list, labelKey }) {
  if (!rank) return null;
  const r = parseInt(rank);
  if (isNaN(r)) return null;
  const above = list.find((x) => x.__rank === r);
  const below = list.find((x) => x.__rank === r - 1);
  return (
    <div className="mt-1 text-sm text-gray-600 bg-[#f1faee] border border-[#a8dadc] rounded-md px-3 py-2 shadow-sm">
      🧠 Donc, au-dessus de : <strong>{above ? above[labelKey] : "…"}</strong>
      <br />
      et en dessous de : <strong>{below ? below[labelKey] : "début de la liste"}</strong>
    </div>
  );
}

export default function SerieRanker() {
  const [mySeries, setMySeries] = useState([]); // table serie, ordonnée par rank
  const [seasonsBySerie, setSeasonsBySerie] = useState({}); // { serie_id: [seasons triées] }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // Étapes : "search" -> "season-form" -> "season-rank" -> "serie-rank"
  const [step, setStep] = useState("search");

  const [showDetail, setShowDetail] = useState(null); // détail TMDB du show choisi
  const [existingSerie, setExistingSerie] = useState(null); // ligne serie déjà existante si trouvée
  const [existingSeasons, setExistingSeasons] = useState([]); // saisons déjà enregistrées pour cette série

  const [seasonNumber, setSeasonNumber] = useState("");
  const [formData, setFormData] = useState({
    watched_at: "",
    watched_place: "Chez Théo",
    custom_place: "",
    theo_slept: false,
    pauline_slept: false,
    viewing_parts: 1,
    viewing_multiple: false,
  });

  const [seasonRank, setSeasonRank] = useState("");
  const [serieRank, setSerieRank] = useState("");
  const [pendingSeasonRow, setPendingSeasonRow] = useState(null); // données prêtes à insérer après classement
  const [pendingSerieId, setPendingSerieId] = useState(null);

  const [sortByChrono, setSortByChrono] = useState(false);

  const loadAll = async () => {
    const { data: series } = await supabase
      .from("serie")
      .select("*")
      .order("rank", { ascending: true, nullsFirst: false });
    const { data: seasons } = await supabase
      .from("serie_season")
      .select("*")
      .order("rank_in_serie", { ascending: true });

    setMySeries(series || []);
    const grouped = {};
    (seasons || []).forEach((s) => {
      if (!grouped[s.serie_id]) grouped[s.serie_id] = [];
      grouped[s.serie_id].push(s);
    });
    setSeasonsBySerie(grouped);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const searchSeries = async (q) => {
    if (!q) return;
    const res = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    setResults(data.results || []);
  };

  const pickShow = async (tv) => {
    const detailRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tv.id}?api_key=${TMDB_API_KEY}`
    );
    const detail = await detailRes.json();
    setShowDetail(detail);

    const already = mySeries.find((s) => s.tmdb_id === tv.id);
    setExistingSerie(already || null);
    setExistingSeasons(already ? (seasonsBySerie[already.id] || []) : []);

    setResults([]);
    setQuery("");
    setSeasonNumber("");
    setStep("season-form");
  };

  const resetAll = () => {
    setStep("search");
    setShowDetail(null);
    setExistingSerie(null);
    setExistingSeasons([]);
    setSeasonNumber("");
    setSeasonRank("");
    setSerieRank("");
    setPendingSeasonRow(null);
    setPendingSerieId(null);
    setFormData({
      watched_at: "",
      watched_place: "Chez Théo",
      custom_place: "",
      theo_slept: false,
      pauline_slept: false,
      viewing_parts: 1,
      viewing_multiple: false,
    });
  };

  // Étape 1 -> validation du formulaire de saison : soit on passe direct au
  // classement série (1ère saison), soit on demande le classement de la
  // saison au sein de la série d'abord.
  const submitSeasonForm = () => {
    if (!seasonNumber) return;
    const seasonInfo = showDetail.seasons.find(
      (s) => s.season_number === parseInt(seasonNumber)
    );
    const place = formData.watched_place === "Autre" ? formData.custom_place : formData.watched_place;

    const row = {
      season_number: parseInt(seasonNumber),
      watched_at: formData.watched_at,
      watched_place: place,
      theo_slept: formData.theo_slept,
      pauline_slept: formData.pauline_slept,
      viewing_parts: formData.viewing_parts || 1,
      episode_count: seasonInfo?.episode_count ?? null,
      episode_runtime: Array.isArray(showDetail.episode_run_time) && showDetail.episode_run_time.length > 0
        ? showDetail.episode_run_time[0]
        : null,
      approx_total_minutes:
        seasonInfo?.episode_count && showDetail.episode_run_time?.[0]
          ? seasonInfo.episode_count * showDetail.episode_run_time[0]
          : null,
      added_at: new Date().toISOString(),
    };

    setPendingSeasonRow(row);

    if (existingSeasons.length > 0) {
      setStep("season-rank");
    } else {
      finalizeSeasonThenGoToSerieRank(row, 1);
    }
  };

  // Insère la série (si nouvelle) + la saison à la position rank_in_serie
  // donnée, puis enchaîne sur le classement global de la série.
  const finalizeSeasonThenGoToSerieRank = async (seasonRow, rankInSerie) => {
    let serieId = existingSerie?.id;

    if (!serieId) {
      const maxIndex = mySeries.reduce((max, s) => Math.max(max, s.added_index || 0), 0);
      const { data: newSerie, error } = await supabase
        .from("serie")
        .insert([{
          tmdb_id: showDetail.id,
          title: showDetail.name,
          poster: `https://image.tmdb.org/t/p/w200${showDetail.poster_path}`,
          genre: showDetail.genres?.map((g) => g.name).join(", ") || null,
          original_language: showDetail.original_language || null,
          rank: null,
          added_index: maxIndex + 1,
          added_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error || !newSerie) return;
      serieId = newSerie.id;
    }

    if (rankInSerie <= existingSeasons.length) {
      await supabase.rpc("shift_season_ranks", { p_serie_id: serieId, from_rank: rankInSerie });
    }

    await supabase.from("serie_season").insert([{
      ...seasonRow,
      serie_id: serieId,
      rank_in_serie: rankInSerie,
    }]);

    setPendingSerieId(serieId);
    setStep("serie-rank");
  };

  const submitSeasonRank = () => {
    const r = parseInt(seasonRank);
    if (isNaN(r) || r < 1 || r > existingSeasons.length + 1) return;
    finalizeSeasonThenGoToSerieRank(pendingSeasonRow, r);
  };

  const submitSerieRank = async () => {
    const r = parseInt(serieRank);
    const maxRank = mySeries.filter((s) => s.rank != null).length + (existingSerie ? 0 : 1);
    if (isNaN(r) || r < 1 || r > maxRank) return;

    await supabase.rpc("move_serie_rank", { p_serie_id: pendingSerieId, new_rank: r });
    await loadAll();
    resetAll();
  };

  // Listes préparées pour l'affichage des indices __rank (utilisées par RankHint)
  const rankedSerieList = mySeries
    .filter((s) => s.rank != null && s.id !== pendingSerieId)
    .map((s) => ({ ...s, __rank: s.rank }));

  const seasonRankList = existingSeasons.map((s) => ({
    ...s,
    __rank: s.rank_in_serie,
    __label: `Saison ${s.season_number}`,
  }));

  const podium = mySeries.filter((s) => s.rank != null).slice(0, 3);
  const rest = mySeries.filter((s) => s.rank != null).slice(3);
  const medal = { 0: "🥇", 1: "🥈", 2: "🥉" };

  // Vue chronologique : chaque SAISON est une ligne (plus parlant qu'une
  // série entière quand le visionnage s'étale sur plusieurs sessions).
  const chronoRows = Object.entries(seasonsBySerie)
    .flatMap(([serieId, seasons]) =>
      seasons.map((s) => ({ ...s, serie: mySeries.find((m) => m.id === parseInt(serieId)) }))
    )
    .filter((r) => r.watched_at)
    .sort((a, b) => new Date(a.watched_at) - new Date(b.watched_at));

  return (
    <div className="max-w-5xl mx-auto p-4 bg-[#fdf0d5] min-h-screen">
      <div className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-playfair text-[#003049]">
          Les meilleures <span className="underline">séries</span> de la terre
        </h1>
        <p className="text-sm text-[#669bbc] mt-2">
          Classement des séries entre elles, et classement des saisons au sein de chaque série.
        </p>
      </div>

      {/* ---------- Étape 0 : recherche ---------- */}
      {step === "search" && (
        <div className="mb-6">
          <div className="relative max-w-sm mx-auto">
            <input
              type="text"
              className="w-full pl-10 pr-10 py-2 rounded-full shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ffb703] bg-white text-[#333] text-sm"
              placeholder="🔍 Rechercher une série (nouvelle ou saison suivante)"
              value={query}
              onChange={(e) => { setQuery(e.target.value); searchSeries(e.target.value); }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">📺</span>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4 max-h-[400px] overflow-y-auto pr-1 max-w-3xl mx-auto">
              {results.map((tv) => {
                const already = mySeries.find((s) => s.tmdb_id === tv.id);
                return (
                  <div
                    key={tv.id}
                    onClick={() => pickShow(tv)}
                    className="cursor-pointer border rounded shadow p-1 bg-[#ffc2d1] hover:bg-[#ffb3c6] relative"
                  >
                    {already && (
                      <span className="absolute top-1 right-1 bg-[#003049] text-white text-[10px] px-2 py-0.5 rounded-full z-10">
                        déjà vue
                      </span>
                    )}
                    <img src={`https://image.tmdb.org/t/p/w200${tv.poster_path}`} alt={tv.name} className="w-full h-[150px] object-cover rounded" />
                    <p className="text-xs mt-1 text-center font-semibold">{tv.name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- Étape 1 : formulaire de saison ---------- */}
      {step === "season-form" && showDetail && (
        <div className="bg-white p-4 rounded shadow mb-6 max-w-xl mx-auto space-y-4">
          <p className="text-lg font-semibold text-[#669bbc]">
            {showDetail.name} {existingSerie && <span className="text-sm text-gray-500">(déjà {existingSeasons.length} saison{existingSeasons.length > 1 ? "s" : ""} enregistrée{existingSeasons.length > 1 ? "s" : ""})</span>}
          </p>

          <label className="flex flex-col text-sm font-medium text-[#003049]">
            🧩 Saison :
            <select
              className="border p-2 mt-1 rounded-md bg-[#fdf0d5] shadow-inner"
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value)}
            >
              <option value="">-- choisir --</option>
              {showDetail.seasons
                .filter((s) => s.season_number > 0)
                .filter((s) => !existingSeasons.some((es) => es.season_number === s.season_number))
                .map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    Saison {s.season_number} ({s.episode_count} épisodes)
                  </option>
                ))}
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="text-sm text-[#003049]">
              <input type="checkbox" checked={formData.theo_slept} onChange={(e) => setFormData((f) => ({ ...f, theo_slept: e.target.checked }))} className="mr-2" />
              🛏️ Théo a fait un dodo d'énorme bébé
            </label>
            <label className="text-sm text-[#003049]">
              <input type="checkbox" checked={formData.pauline_slept} onChange={(e) => setFormData((f) => ({ ...f, pauline_slept: e.target.checked }))} className="mr-2" />
              🛌 Pauline a fait un dodo d'énorme bébé
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-[#003049] flex items-center">
              <input
                type="checkbox"
                checked={formData.viewing_multiple}
                onChange={(e) => setFormData((f) => ({ ...f, viewing_multiple: e.target.checked, viewing_parts: e.target.checked ? 2 : 1 }))}
                className="mr-2"
              />
              🎬 Vue en plusieurs fois ?
            </label>
            {formData.viewing_multiple && (
              <input
                type="number"
                min="2"
                className="border p-2 rounded bg-[#fdf0d5] shadow-inner w-24"
                value={formData.viewing_parts}
                onChange={(e) => setFormData((f) => ({ ...f, viewing_parts: parseInt(e.target.value) }))}
              />
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={resetAll} className="px-4 py-2 rounded-full bg-gray-200 text-[#003049] font-semibold hover:bg-gray-300 transition">
              ← Annuler
            </button>
            <button
              onClick={submitSeasonForm}
              disabled={!seasonNumber}
              className="flex-1 px-6 py-3 bg-[#ffb703] text-[#023047] font-bold rounded-full hover:bg-[#fb8500] transition-transform hover:scale-105 shadow-md disabled:opacity-50 disabled:hover:scale-100"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ---------- Étape 2 : classement de la saison au sein de la série ---------- */}
      {step === "season-rank" && (
        <div className="bg-white p-4 rounded shadow mb-6 max-w-xl mx-auto space-y-3">
          <p className="text-lg font-semibold text-[#669bbc]">
            Où placer cette saison parmi les {existingSeasons.length} déjà vues de {showDetail.name} ?
          </p>
          <RankHint rank={seasonRank} list={seasonRankList} labelKey="__label" />
          <input
            type="number"
            min="1"
            max={existingSeasons.length + 1}
            className="border p-2 rounded-md bg-[#fdf0d5] shadow-inner w-full"
            placeholder={`1 (meilleure) à ${existingSeasons.length + 1} (moins bonne)`}
            value={seasonRank}
            onChange={(e) => setSeasonRank(e.target.value)}
          />
          <button
            onClick={submitSeasonRank}
            className="w-full px-6 py-3 bg-[#ffb703] text-[#023047] font-bold rounded-full hover:bg-[#fb8500] transition-transform hover:scale-105 shadow-md"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* ---------- Étape 3 : classement de la série parmi toutes les séries ---------- */}
      {step === "serie-rank" && (
        <div className="bg-white p-4 rounded shadow mb-6 max-w-xl mx-auto space-y-3">
          <p className="text-lg font-semibold text-[#669bbc]">
            {existingSerie ? "Reclasse" : "Classe"} {showDetail.name} parmi toutes vos séries
          </p>
          <RankHint rank={serieRank} list={rankedSerieList} labelKey="title" />
          <input
            type="number"
            min="1"
            max={rankedSerieList.length + 1}
            className="border p-2 rounded-md bg-[#fdf0d5] shadow-inner w-full"
            placeholder={`1 (meilleure) à ${rankedSerieList.length + 1} (moins bonne)`}
            value={serieRank}
            onChange={(e) => setSerieRank(e.target.value)}
          />
          <button
            onClick={submitSerieRank}
            className="w-full px-6 py-3 bg-[#ffb703] text-[#023047] font-bold rounded-full hover:bg-[#fb8500] transition-transform hover:scale-105 shadow-md"
          >
            🍿 Valider le classement
          </button>
        </div>
      )}

      {step === "search" && (
        <div className="text-center mb-6">
          <button onClick={() => setSortByChrono((prev) => !prev)} className="text-sm text-[#003049] underline hover:text-[#ffb3c6]">
            {sortByChrono ? "Voir par rang de préférence" : "Voir en ordre chronologique (par saison)"}
          </button>
        </div>
      )}

      {/* ---------- Podium (classement des séries) ---------- */}
      {step === "search" && !sortByChrono && (
        <div className="flex justify-center items-end gap-4 mb-10">
          {podium.map((show, index) => {
            const isFirst = index === 0;
            const heightClass = isFirst ? "h-72 sm:h-80" : "h-60 sm:h-64";
            const widthClass = isFirst ? "w-48 sm:w-56" : "w-36 sm:w-40";
            const marginTop = isFirst ? "mt-0" : "mt-8";
            const orderClass = index === 1 ? "order-1" : isFirst ? "order-2" : "order-3";
            const seasons = seasonsBySerie[show.id] || [];

            return (
              <motion.div key={show.id} className={`relative flex flex-col items-center group ${marginTop} ${orderClass}`}>
                <div className="absolute -top-5 bg-[#ffc2d1] text-xl px-3 py-1 rounded-full shadow-md z-20">
                  {medal[index]}
                </div>
                <img src={show.poster} alt={show.title} className={`rounded shadow-xl object-cover ${heightClass} ${widthClass}`} />
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 top-full p-2 bg-white border rounded shadow-lg hidden group-hover:block z-40 w-56">
                  <p className="font-medium text-sm">{show.title}</p>
                  <p className="text-gray-500 text-xs">🎞️ {show.genre}</p>
                  <p className="text-gray-500 text-xs mt-1">{seasons.length} saison{seasons.length > 1 ? "s" : ""} vue{seasons.length > 1 ? "s" : ""} :</p>
                  {seasons.map((s) => (
                    <p key={s.id} className="text-gray-500 text-xs">
                      • S{s.season_number} (#{s.rank_in_serie}) — {s.watched_at}
                    </p>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---------- Liste complète ---------- */}
      {step === "search" && !sortByChrono && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-center text-[#003049]">Classement complet des séries</h2>
          <ul className="space-y-4 text-center">
            <AnimatePresence>
              {rest.map((show) => {
                const seasons = seasonsBySerie[show.id] || [];
                return (
                  <motion.li
                    key={show.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="group relative border rounded-lg p-3 shadow bg-[#fff]"
                  >
                    <span className="font-semibold text-lg text-[#669bbc]">
                      {show.rank} - {show.title}
                    </span>
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max max-w-xs p-3 bg-white border border-gray-200 rounded-xl shadow-xl z-30 hidden group-hover:flex gap-3 pointer-events-none">
                      <img src={show.poster} alt={show.title} className="w-20 h-auto rounded shadow" />
                      <div className="text-sm text-left text-gray-700">
                        <p className="font-semibold text-[#003049]">{show.title}</p>
                        <p className="text-gray-500">🎞️ {show.genre}</p>
                        {seasons.map((s) => (
                          <p key={s.id} className="text-gray-500 text-xs">
                            S{s.season_number} (#{s.rank_in_serie}) — {s.watched_at} — {s.watched_place}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}

      {/* ---------- Vue chronologique par saison ---------- */}
      {step === "search" && sortByChrono && (
        <ul className="space-y-3 text-center">
          {chronoRows.map((row) => (
            <li key={row.id} className="border rounded-lg p-3 shadow bg-[#fff]">
              <span className="font-semibold text-[#669bbc]">
                {row.serie?.title} — Saison {row.season_number}
              </span>
              <p className="text-xs text-gray-500">
                📅 {row.watched_at} · 📍 {row.watched_place} · classée #{row.rank_in_serie} de sa série
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
