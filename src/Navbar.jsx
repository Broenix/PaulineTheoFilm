import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "🎬 Films" },
  { to: "/stats", label: "📊 Stats films" },
  { to: "/suggestions", label: "💡 Suggestions films" },
  { to: "/series", label: "📺 Séries" },
  { to: "/series-stats", label: "📊 Stats séries" },
  { to: "/series-suggestions", label: "💡 Suggestions séries" },
];

export function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-30 bg-[#003049]/95 backdrop-blur-sm shadow-md">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 px-4 py-2">
        {links.map(({ to, label }) => {
          const isActive = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`text-xs sm:text-sm px-3 py-1.5 rounded-full font-semibold shadow transition ${
                isActive
                  ? "bg-[#ffb703] text-[#023047]"
                  : "bg-[#8ecae6] text-[#023047] hover:bg-[#219ebc]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
