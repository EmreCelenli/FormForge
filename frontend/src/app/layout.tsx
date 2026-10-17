import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageState";
import { Navbar } from "@/components/Navbar";
import { UploadProvider } from "@/components/UploadState";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormForge",
  description: "Form meets precision.",
};

const themeScript = `try{var t=localStorage.getItem("formforge-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <LanguageProvider>
          <UploadProvider>
            <Navbar />
            {children}
          </UploadProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
