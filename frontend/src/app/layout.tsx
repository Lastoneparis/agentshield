import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentShield - AI Agent Security Middleware',
  description: 'Real-time security monitoring dashboard for AI agents interacting with Web3 wallets',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-bg text-white font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
