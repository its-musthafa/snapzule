import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snapzule - Selfie Puzzle Game",
  description:
    "Snap a selfie and solve it as a puzzle using hand gestures. A modern retro experience in your browser.",
  keywords: [
    "selfie puzzle",
    "jigsaw game",
    "webcam game",
    "snapzule",
    "mediapipe",
  ],
  openGraph: {
    title: "Snapzule - Selfie Puzzle Game",
    description: "Snap. Shuffle. Solve. A retro-brutalist selfie puzzle game.",
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
      <body>{children}</body>
    </html>
  );
}
