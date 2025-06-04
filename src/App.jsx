import MovieRanker from "./MovieRanker";
import StatsPage from "./StatsPage";
import { Routes, Route } from "react-router-dom";
import { BackgroundCarousel } from "./BackgroundCarousel";
import SuggestionsPage from "./SuggestionsPage";


export default function App() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <BackgroundCarousel />
      </div>
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<MovieRanker />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/suggestions" element={<SuggestionsPage />} />
        </Routes>
      </div>
    </>
  );
}
