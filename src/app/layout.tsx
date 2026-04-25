import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snapzule — Selfie Puzzle Game",
  description:
    "Take a selfie and solve it as a jigsaw puzzle! A fun browser-based game powered by your webcam.",
  keywords: ["selfie puzzle", "jigsaw game", "webcam game", "snapzule"],
  openGraph: {
    title: "Snapzule — Selfie Puzzle Game",
    description: "Snap. Shuffle. Solve. A selfie puzzle game.",
    url: "https://snapzule.outshorts.in",
    siteName: "Snapzule",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
