import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import {Toaster} from "react-hot-toast"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
    title: "MLOps Studio",
    description: "Train, deploy, and manage machine learning models",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
        <body>
            <Toaster
                toastOptions={{
                    style: {
                        background : "#1a1a1a",
                        color : "#ededed"
                    }
                }}
            />
            <AuthProvider>{children}</AuthProvider>
        </body>
        </html>
    );
}