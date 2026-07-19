import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#780000", "#c1121f", "#fdf0d5", "#003049", "#669bbc", "#a4de6c"];

export default function SerieStatsPage() {
  const [genreData, setGenreData] = useState([]);
  const [dodoCounts, setDodoCounts] = useState({ theo: 0, pauline: 0 });
  const [maxSeasonsSerie, setMaxSeasonsSerie] = useState(null);
  const [placeCounts, setPlaceCounts] = useState({ theo: 0, pauline: 0, cinema: 0, other: 0 });
  const [suggestionStats, setSuggestionStats] = useState({
    totalPauline: 0, totalTheo: 0, viewedPauline: 0, viewedTheo: 0
  });
  const [frequencies, setFrequencies] = useState({ thisMonth: 0, perMonth: 0, perYear: 0 });
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [seriesCount, setSeriesCount] = useState(0);
  const [longestWatch, setLongestWatch] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: series } = await supabase.from("serie").select("*");
      const { data: seasons } = await supabase.from("serie_season").select("*");
      if (!series || !seasons) return;
      setSeriesCount(series.length);

      // Série avec le plus de saisons vues
      const seasonCountBySerie = {};
      seasons.forEach((s) => {
        seasonCountBySerie[s.serie_id] = (seasonCountBySerie[s.serie_id] || 0) + 1;
      });
      const topSerieId = Object.entries(seasonCountBySerie).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topSerieId) {
        const topSerie = series.find((s) => s.id === parseInt(topSerieId));
        setMaxSeasonsSerie(topSerie ? { ...topSerie, seasonsWatched: seasonCountBySerie[topSerieId] } : null);
      }

      // Genres (au niveau série)
      const genreCount = {};
      series.forEach((s) => {
        s.genre?.split(", ").forEach((g) => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      });
      setGenreData(Object.entries(genreCount).map(([name, value]) => ({ name, value })));

      // Dodos, lieux, durée, épisodes : au niveau saison
      const theo = seasons.filter((s) => s.theo_slept).length;
      const pauline = seasons.filter((s) => s.pauline_slept).length;
      setDodoCounts({ theo, pauline });

      const places = { theo: 0, pauline: 0, cinema: 0, other: 0 };
      seasons.forEach((s) => {
        switch (s.watched_place) {
          case "Chez Théo": places.theo++; break;
          case "Chez Pauline": places.pauline++; break;
          case "Au cinéma": places.cinema++; break;
          default: places.other++;
        }
      });
      setPlaceCounts(places);

      const now = new Date();
      const byMonth = {};
      const byYear = {};
      let duration = 0;
      let episodes = 0;
      let longestWatch = null; // saison qui a mis le plus de jours à être finie
      seasons.forEach((s) => {
        if (s.approx_total_minutes) duration += s.approx_total_minutes;
        if (s.episode_count) episodes += s.episode_count;
        if (s.started_at && s.ended_at) {
          const days = Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 86400000);
          if (days > 0 && (!longestWatch || days > longestWatch.days)) {
            const serie = series.find((se) => se.id === s.serie_id);
            longestWatch = { days, title: serie?.title, season_number: s.season_number };
          }
        }
        if (!s.started_at) return;
        const date = new Date(s.started_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const yearKey = `${date.getFullYear()}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        byYear[yearKey] = (byYear[yearKey] || 0) + 1;
      });
      setTotalDuration(duration);
      setTotalEpisodes(episodes);
      setLongestWatch(longestWatch);
      const thisMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      setFrequencies({
        thisMonth: byMonth[thisMonthKey] || 0,
        perMonth: +(seasons.length / Math.max(Object.keys(byMonth).length, 1)).toFixed(2),
        perYear: +(seasons.length / Math.max(Object.keys(byYear).length, 1)).toFixed(2)
      });

      const { data: suggestions } = await supabase.from("serie_suggestion").select("*");
      if (suggestions) {
        setSuggestionStats({
          totalPauline: suggestions.filter((s) => s.proposer === "Pauline").length,
          totalTheo: suggestions.filter((s) => s.proposer === "Théo").length,
          viewedPauline: suggestions.filter((s) => s.proposer === "Pauline" && s.viewed).length,
          viewedTheo: suggestions.filter((s) => s.proposer === "Théo" && s.viewed).length,
        });
      }
    };
    fetch();
  }, []);

  return (
    <div className="h-screen w-full flex flex-col p-6 bg-[#fdf0d5]">
      <div className="mb-6">
        <h1 className="text-4xl font-playfair text-[#003049] text-center sm:text-left">
          📊 Statistiques officielles des séries de Pauline & Théo
        </h1>
      </div>

      <div className="grid grid-cols-5 grid-rows-4 gap-4 h-[90%]">
        <div className="col-span-3 row-span-3 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2 font-playfair text-[#003049]">Genres les plus regardés</h2>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                label={({ name, value }) => `${name} (${value})`}>
                {genreData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-3 row-start-4 bg-white p-4 rounded shadow flex items-center justify-around">
          <h2 className="text-lg font-semibold">😴 Dodos d'énorme bébé Cadum</h2>
          <p className="text-sm text-[#003049]">Pauline : <strong>{dodoCounts.pauline}</strong></p>
          <p className="text-sm text-[#003049]">Théo : <strong>{dodoCounts.theo}</strong></p>
        </div>

        <div className="col-start-4 col-span-2 row-span-4 bg-white p-4 rounded shadow overflow-y-auto">
          <h2 className="text-xl font-semibold mb-2 font-playfair text-[#003049]">Nos moyennes de visionnage ensemble</h2>
          <p className="text-sm text-[#003049]">📺 Ce mois-ci : <strong>{frequencies.thisMonth}</strong> saisons</p>
          <p className="text-sm text-[#003049]">📆 Moyenne par mois : <strong>{frequencies.perMonth}</strong></p>
          <p className="text-sm text-[#003049]">🗓️ Moyenne par an : <strong>{frequencies.perYear}</strong></p>
          <hr className="my-3" />
          <h2 className="text-xl font-semibold mb-2 font-playfair text-[#003049]">Ou que c'est qu'on mate des trucs ensemble ?</h2>
          <p className="text-sm text-[#003049]">🏠 Chez Théo : <strong>{placeCounts.theo}</strong></p>
          <p className="text-sm text-[#003049]">🏡 Chez Pauline : <strong>{placeCounts.pauline}</strong></p>
          <p className="text-sm text-[#003049]">🎬 Au cinéma : <strong>{placeCounts.cinema}</strong></p>
          <p className="text-sm text-[#003049]">📍 Autre : <strong>{placeCounts.other}</strong></p>
          <hr className="my-3" />
          <h2 className="text-xl font-semibold mb-2 font-playfair text-[#003049]">📈 Statistiques supplémentaires</h2>
          <p className="text-sm text-[#003049]">📺 Séries suivies : <strong>{seriesCount}</strong></p>
          <p className="text-sm text-[#003049]">
            ⏱️ Temps total passé devant des séries ensemble : <strong>{Math.floor(totalDuration / 60)}h {Math.round(totalDuration % 60)}min</strong>
          </p>
          <p className="text-sm text-[#003049]">🧩 Total d'épisodes vus : <strong>{totalEpisodes}</strong></p>
          <p className="text-sm text-[#003049]">🎀 Séries proposées par Pauline : <strong>{suggestionStats.totalPauline}</strong></p>
          <p className="text-sm text-[#003049]">💀 Séries proposées par Théo : <strong>{suggestionStats.totalTheo}</strong></p>
          <p className="text-sm text-[#003049]">✅ Séries de Pauline vues : <strong>{suggestionStats.viewedPauline}</strong></p>
          <p className="text-sm text-[#003049]">✅ Séries de Théo vues : <strong>{suggestionStats.viewedTheo}</strong></p>
          {maxSeasonsSerie && (
            <p className="text-sm text-[#003049]">🧩 Série la plus suivie : <strong>{maxSeasonsSerie.title}</strong> ({maxSeasonsSerie.seasonsWatched} saison{maxSeasonsSerie.seasonsWatched > 1 ? "s" : ""} vue{maxSeasonsSerie.seasonsWatched > 1 ? "s" : ""})</p>
          )}
          {longestWatch && (
            <p className="text-sm text-[#003049]">🐌 A mis le plus de temps à être finie : <strong>{longestWatch.title}</strong> saison {longestWatch.season_number} ({longestWatch.days} jour{longestWatch.days > 1 ? "s" : ""})</p>
          )}
        </div>
      </div>
    </div>
  );
}
