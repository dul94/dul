import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. Optimasi Font dengan display swap
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// 2. Konfigurasi Viewport (Standar Modern Next.js)
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// 3. Metadata Komprehensif & SEO-Ready
export const metadata = {
  title: {
    default: "Laporan MTC | Sistem Manajemen Pemeliharaan",
    template: "%s | Laporan MTC", // Otomatis format judul di halaman anak (misal: "Dashboard | Laporan MTC")
  },
  description:
    "Platform terpadu untuk pencatatan, pemantauan, dan pelaporan aktivitas pemeliharaan (Maintenance) secara real-time dan akurat.",
  applicationName: "Laporan MTC",
  keywords: ["Laporan MTC", "Maintenance", "Pemeliharaan", "Monitoring", "Sistem Pelaporan"],
  authors: [{ name: "Tim Engineering & MTC" }],
  robots: {
    index: false, // Ubah ke true jika aplikasi bersifat publik, false jika internal perusahaan
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Laporan MTC",
    title: "Laporan MTC | Sistem Manajemen Pemeliharaan",
    description: "Sistem pencatatan dan pelaporan aktivitas Maintenance terpadu.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans selection:bg-blue-600 selection:text-white">
        {/* Aksesibilitas: Skip to main content untuk navigasi keyboard */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Langsung ke konten utama
        </a>

        {/* Wrapper Utama (Tempat meletakkan Global Providers seperti Toast, Auth, atau QueryClient) */}
        <div id="main-content" className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}