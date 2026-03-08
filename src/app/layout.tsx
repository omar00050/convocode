import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConvoCode -Visual Canvas Code Generator",
  description: "Compose visual designs on a canvas and generate runnable Node.js code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#1e1e1e] text-gray-200">{children}</body>
    </html>
  );
}
