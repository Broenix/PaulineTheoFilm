import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Link } from "react-router-dom";

const COLORS = ["#780000", "#c1121f", "#fdf0d5", "#003049", "#669bbc", "#a4de6c"];

export default function SerieStatsPage() {
  const [genreData, setGenreData] = useState([]);
  const [dodoCounts, setDodoCounts] = useState({ theo: 0, pauline: 0 });
  const [maxEpisodesSerie, setMaxEpisodesSerie] = useState(null);
  const [placeCounts, setPlaceCounts] = useState({
    theo: 0,
    pauline: 0,
    cinema: 0,
    other: 0
  });
  const [suggestionStats, setSuggestionStats] = useState({
    totalPauline: 0,
    totalTheo: 0,
    viewedPauline: 0,
    viewedTheo: 0
  });
  const [frequencies, setFrequencies] = useState({
    thisMonth: 0,
    perMonth: 0,
    perYear: 0
  });
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("serie").select("*");
      if (!data) return;

      const serieLaPlusLongue = data.reduce((prev, curr) => {
        if ((curr.episode_count || 0) > (prev?.episode_count || 0)) return curr;
        return prev;
      }, data[0]);
      setMaxEpisodesSerie(serieLaPlusLongue);

      // Genres
      const genreCount = {};
      data.forEach((serie) => {
        serie.genre?.split(", ").forEach((g) => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      });
      setGenreData(
        Object.entries(genreCount).map(([name, value]) => ({ name, value }))
      );

      // Dodos
      const theo = data.filter((f) => f.theo_slept).length;
      const pauline = data.filter((f) => f.pauline_slept).length;
      setDodoCounts({ theo, pauline });

      // Lieux
      const places = { theo: 0, pauline: 0, cinema: 0, other: 0 };
      data.forEach((f) => {
        switch (f.watched_place) {
          case "Chez Théo":
            places.theo++;
            break;
          case "Chez Pauline":
            places.pauline++;
            break;
          case "Au cinéma":
            places.cinema++;
            break;
          default:
            places.other++;
        }
      });
      setPlaceCounts(places);

      // Fréquences + durées
      const now = new Date();
      const byMonth = {};
      const byYear = {};
      let duration = 0;
      let episodes = 0;
      data.forEach((f) => {
        if (f.approx_total_minutes) duration += f.approx_total_minutes;
        if (f.episode_count) episodes += f.episode_count;
        if (!f.watched_at) return;
        const date = new Date(f.watched_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const yearKey = `${date.getFullYear()}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        byYear[yearKey] = (byYear[yearKey] || 0) + 1;
      });
      setTotalDuration(duration);
      setTotalEpisodes(episodes);
      const thisMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      setFrequencies({
        thisMonth: byMonth[thisMonthKey] || 0,
        perMonth: +(data.length / Math.max(Object.keys(byMonth).length, 1)).toFixed(2),
        perYear: +(data.length / Math.max(Object.keys(byYear).length, 1)).toFixed(2)
      });

      const { data: suggestions } = await supabase.from("serie_suggestion").select("*");
      if (suggestions) {
        const totalPauline = suggestions.filter((s) => s.proposer === "Pauline").length;
        const totalTheo = suggestions.filter((s) => s.proposer === "Théo").length;
        const viewedPauline = suggestions.filter((s) => s.proposer === "Pauline" && s.viewed).length;
        const viewedTheo = suggestions.filter((s) => s.proposer === "Théo" && s.viewed).length;
        setSuggestionStats({ totalPauline, totalTheo, viewedPauline, viewedTheo });
      }
    };
    fetch();
  }, []);

  return (
    <div className="h-screen w-full flex flex-col p-6 bg-[#fdf0d5]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-4xl font-playfair text-[#003049] text-center sm:text-left">
          📊 Statistiques officielles des séries de Pauline & Théo
        </h1>

        <div className="flex justify-center sm:justify-end gap-4">
          <Link
            to="/series"
            className="inline-block text-sm px-4 py-2 rounded-full bg-[#ffb703] text-[#023047] font-semibold shadow hover:bg-[#fb8500] transition"
          >
            ⬅️ Retour au classement
          </Link>

          <Link
            to="/series-suggestions"
            className="inline-block text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition"
          >
            💡 Voir les suggestions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 grid-rows-4 gap-4 h-[90%]">
        <div className="col-span-3 row-span-3 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2 font-playfair text-[#003049]">Genres les plus regardés</h2>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={genreData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} (${value})`}
              >
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
          <p className="text-sm text-[#003049]">📺 Ce mois-ci : <strong>{frequencies.thisMonth}</strong> séries</p>
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
          <p className="text-sm text-[#003049]">
            ⏱️ Temps total passé devant des séries ensemble : <strong>{Math.floor(totalDuration / 60)}h {Math.round(totalDuration % 60)}min</strong>
          </p>
          <p className="text-sm text-[#003049]">🧩 Total d'épisodes vus : <strong>{totalEpisodes}</strong></p>
          <p className="text-sm text-[#003049]">🎀 Séries proposées par Pauline : <strong>{suggestionStats.totalPauline}</strong></p>
          <p className="text-sm text-[#003049]">💀 Séries proposées par Théo : <strong>{suggestionStats.totalTheo}</strong></p>
          <p className="text-sm text-[#003049]">✅ Séries de Pauline vues : <strong>{suggestionStats.viewedPauline}</strong></p>
          <p className="text-sm text-[#003049]">✅ Séries de Théo vues : <strong>{suggestionStats.viewedTheo}</strong></p>
          {maxEpisodesSerie && (
            <p className="text-sm text-[#003049]">🧩 Série avec le plus d'épisodes : <strong>{maxEpisodesSerie.title}</strong> ({maxEpisodesSerie.episode_count || 0} épisodes)</p>
          )}
        </div>
      </div>
    </div>
  );
}
