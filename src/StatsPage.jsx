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

export default function StatsPage() {
  const [movies, setMovies] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [dodoCounts, setDodoCounts] = useState({ theo: 0, pauline: 0 });
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

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("film").select("*");
      if (!data) return;
      setMovies(data);

      // Genre data for pie chart
      const genreCount = {};
      data.forEach((film) => {
        film.genre?.split(", ").forEach((g) => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      });
      setGenreData(
        Object.entries(genreCount).map(([name, value]) => ({ name, value }))
      );

      // Dodo counts
      const theo = data.filter((f) => f.theo_slept).length;
      const pauline = data.filter((f) => f.pauline_slept).length;
      setDodoCounts({ theo, pauline });

      // Place counts
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

      // Frequency calculations
      const now = new Date();
      const byMonth = {};
      const byYear = {};
      let duration = 0;
      data.forEach((f) => {
        if (f.runtime_minutes) duration += f.runtime_minutes;
        if (!f.watched_at) return;
        const date = new Date(f.watched_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const yearKey = `${date.getFullYear()}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        byYear[yearKey] = (byYear[yearKey] || 0) + 1;
      });
      setTotalDuration(duration);
      const thisMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      setFrequencies({
        thisMonth: byMonth[thisMonthKey] || 0,
        perMonth: +(data.length / Object.keys(byMonth).length).toFixed(2),
        perYear: +(data.length / Object.keys(byYear).length).toFixed(2)
      });
      const { data: suggestions } = await supabase.from("suggestion").select("*");
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
    📊 Statistiques officielles du comité Pauline & Théo
  </h1>

  <div className="flex justify-center sm:justify-end gap-4">
    <Link
      to="/"
      className="inline-block text-sm px-4 py-2 rounded-full bg-[#ffb703] text-[#023047] font-semibold shadow hover:bg-[#fb8500] transition"
    >
      ⬅️ Retour au classement
    </Link>

    <Link
      to="/suggestions"
      className="inline-block text-sm px-4 py-2 rounded-full bg-[#8ecae6] text-[#023047] font-semibold shadow hover:bg-[#219ebc] transition"
    >
      💡 Voir les suggestions
    </Link>
  </div>
</div>


      <div className="grid grid-cols-5 grid-rows-4 gap-4 h-[90%]">
        {/* Camembert genre */}
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

        {/* Dodos */}
        <div className="col-span-3 row-start-4 bg-white p-4 rounded shadow flex items-center justify-around">
          <h2 className="text-lg font-semibold">😴 Dodos d’énorme bébé Cadum</h2>
          <p className="text-sm text-[#003049]">Pauline : <strong>{dodoCounts.pauline}</strong></p>
          <p className="text-sm text-[#003049]">Théo : <strong>{dodoCounts.theo}</strong></p>
        </div>

        {/* Statistiques fusionnées */}
        <div className="col-start-4 col-span-2 row-span-4 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2 font-playfair text-[#003049]">Nos moyennes de visionnage ensemble</h2>
          <p className="text-sm text-[#003049]">🎥 Ce mois-ci : <strong>{frequencies.thisMonth}</strong> films</p>
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
            ⏱️ Temps total passé à regarder des films ensemble : <strong>{Math.floor(totalDuration / 60)}h {totalDuration % 60}min</strong>
            </p>
            <p className="text-sm text-[#003049]">🎀 Films proposés par Pauline : <strong>{suggestionStats.totalPauline}</strong></p>
            <p className="text-sm text-[#003049]">💀 Films proposés par Théo : <strong>{suggestionStats.totalTheo}</strong></p>
            <p className="text-sm text-[#003049]">✅ Films de Pauline vus : <strong>{suggestionStats.viewedPauline}</strong></p>
            <p className="text-sm text-[#003049]">✅ Films de Théo vus : <strong>{suggestionStats.viewedTheo}</strong></p>
        </div>
      </div>
    </div>
  );
}
