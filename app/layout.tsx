import type { Metadata } from "next";
import { Rajdhani, Share_Tech_Mono, Silkscreen } from "next/font/google";
import "./globals.css";
import { THEME_KEY } from "@/lib/theme";

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
});

export const metadata: Metadata = {
  title: "FCOS — S.K.AM Advanced Magitechnologies",
  description:
    "Firmament Core Operating System. Property of S.K.AM Advanced Magitechnologies. Unauthorized access is punishable under the Concord Accords.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${shareTechMono.variable} ${silkscreen.variable}`}
      data-theme="vga"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="amber"||t==="vga")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
