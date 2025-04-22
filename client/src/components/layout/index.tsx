import React from 'react';
import { Link } from 'wouter';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              Mindat Explorer
            </a>
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link href="/explorer">
              <a className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                Explorer
              </a>
            </Link>
            <Link href="/knowledge-base">
              <a className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                Knowledge Base
              </a>
            </Link>
            <Link href="/saved-requests">
              <a className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                Saved Requests
              </a>
            </Link>
            <Link href="/crystal-test">
              <a className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                Crystal Test
              </a>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      
      <footer className="bg-white dark:bg-slate-800 shadow-sm py-4">
        <div className="container mx-auto px-4 text-center text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Mindat Explorer</p>
        </div>
      </footer>
    </div>
  );
}