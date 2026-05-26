import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "WorkMate - Smart Carpenter & Workshop Management System",
  description: "Manage multi-site construction and carpentry projects, track worker attendance in real-time, record salary advances, and generate professional PDF payroll receipts.",
  keywords: "carpentry manager, construction software, worker attendance app, salary calculator, workshop payroll, contractor tracker",
  authors: [{ name: "WorkMate Team" }],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-wood-gradient wood-grain min-h-screen text-stone-100">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
