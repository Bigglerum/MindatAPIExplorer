import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, Newspaper, Code, BookOpen, Search, Home, Grid3X3, Book, Menu, X, Map } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const menuItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/explorer", label: "API Explorer", icon: Code },
  { path: "/mineral-reference", label: "Additional Mapping", icon: Map },
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { path: "/saved-requests", label: "Saved Requests", icon: Newspaper },
  { path: "/search", label: "Search", icon: Search },
  { path: "/rruff", label: "RRUFF Database", icon: Database },
  { path: "/crystal-classes", label: "Crystal Classes", icon: Grid3X3 },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center font-bold text-xl">
            <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              Mindat API Explorer
            </span>
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-2 overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              const isAdditionalMapping = item.path === "/mineral-reference" && item.label === "Additional Mapping";
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : isAdditionalMapping
                        ? "bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded-md border-2 border-blue-300"
                        : "hover:bg-secondary/50"
                  }`}
                >
                  <Icon className={`mr-1 h-4 w-4 ${isAdditionalMapping ? "text-blue-600" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button 
                className="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-secondary"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 md:w-80 pr-0">
              <div className="flex flex-col space-y-1 pt-6 pb-10">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  const isAdditionalMapping = item.path === "/mineral-reference" && item.label === "Additional Mapping";
                  
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center rounded-l-md px-4 py-3 font-medium transition-colors",
                        isActive 
                          ? "bg-secondary text-secondary-foreground"
                          : isAdditionalMapping
                            ? "bg-blue-100 text-blue-800 font-bold border-2 border-blue-300 rounded-md"
                            : "hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isAdditionalMapping ? "text-blue-600" : ""}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
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