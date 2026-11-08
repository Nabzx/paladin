import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Two-tier pixel type, same reasoning a display/body pairing always
// has: Press Start 2P is the iconic blocky face but unreadable at the
// small sizes the Mission Log's running text needs, so it's reserved
// for short labels (panel titles, agent names, button text). VT323 is
// the readable pixel-terminal face for everything longer.
const pixelDisplay = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel-display",
  subsets: ["latin"],
});

const pixelBody = VT323({
  weight: "400",
  variable: "--font-pixel-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PALADIN-Station",
  description: "An orbital edge-compute facility under fire, five agents keeping it alive.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixelDisplay.variable} ${pixelBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
