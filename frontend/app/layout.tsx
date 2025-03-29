import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CodeShare - Live VS Code for Teaching and Collabs",
  description:
    "Teaching code? Running a workshop? Or just helping a friend debug? Share your VS Code workspace live on the web - no zip files, just real-time vibes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full antialiased">
        <main
          className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}
        >
          {children}
        </main>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          theme="dark"
          expand={false}
          duration={4000}
        />
      </body>
    </html>
  );
}
