import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GhostTRACE — AI Agent Execution & Reasoning Trace Inspector",
  description:
    "Interactive DAG visualizer for LLM reasoning chains, tool execution paths, and counterfactual ghost/phantom branches.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full w-full bg-[#070b12] text-slate-100 overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
