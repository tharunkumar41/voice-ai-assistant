import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RouteProgressBar } from "@/components/route-progress-bar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voice AI Personal Assistant",
  description: "Automated missed-call workflows for small businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RouteProgressBar />
        {children}
      </body>
    </html>
  );
}
