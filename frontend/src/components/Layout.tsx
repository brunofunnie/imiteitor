import { Link, useLocation, Outlet } from 'react-router-dom';
import { Mic, AudioLines, List } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Vozes', icon: List },
  { to: '/generate', label: 'Gerar Áudio', icon: AudioLines },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-accent">
          <Mic className="w-6 h-6" />
          Imiteitor
        </Link>
        <nav className="flex gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to ||
              (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
