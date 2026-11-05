import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { FilterProvider } from '@/context/FilterContext';

export const metadata: Metadata = {
  title: 'Mes Recettes de Cuisine | Carnet Gourmand',
  description: 'Votre carnet de recettes moderne et intelligent. Importez par lien ou par simple copier-coller.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-stone-800">
        <FilterProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500 no-print">
            <p>© {new Date().getFullYear()} carnet de recettes — Conçu avec passion pour la bonne cuisine.</p>
          </footer>
        </FilterProvider>
      </body>
    </html>
  );
}
