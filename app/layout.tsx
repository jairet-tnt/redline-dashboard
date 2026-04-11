import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Redline Dashboard",
  description: "Dashboard de Performance — Redline CrossFit Equipment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto border-t border-gray-200 bg-white">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              © 2026 Redline CrossFit Equipment
            </p>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors underline decoration-gray-300"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
