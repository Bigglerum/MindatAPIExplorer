import { Link, useLocation } from "wouter";
import { Database, Newspaper, Code, BookOpen, Search, Home, Grid3X3, Book } from "lucide-react";

const menuItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/explorer", label: "API Explorer", icon: Code },
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { path: "/saved-requests", label: "Saved Requests", icon: Newspaper },
  { path: "/search", label: "Search", icon: Search },
  { path: "/rruff", label: "RRUFF Database", icon: Database },
  { path: "/crystal-classes", label: "Crystal Classes", icon: Grid3X3 },
  { path: "/mineral-reference", label: "Reference Data", icon: Book },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center font-bold text-xl">
            <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              Mindat API Explorer
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="md:hidden">
            {/* Mobile menu button could go here */}
            <span>Menu</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <div className="container">
          Mindat API Explorer &copy; {new Date().getFullYear()} | 
          <a href="https://www.mindat.org/api.php" className="underline ml-1" target="_blank" rel="noopener noreferrer">
            Mindat API Documentation
          </a>
        </div>
      </footer>
    </div>
  );
}