import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Adwen — Your Intelligent Study Partner",
  description: "A learner-aware, telemetry-driven study assistant for KNUST and WASSCE-track tertiary students. Adaptive quizzes, personalised study plans, and readiness tracking from your own course materials.",
  keywords: ["KNUST", "study assistant", "adaptive quiz", "WASSCE", "Ghana education", "exam preparation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
