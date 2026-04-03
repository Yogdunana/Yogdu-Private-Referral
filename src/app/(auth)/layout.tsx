import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-8">
      {/* Logo & App Name */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
          >
            <path d="M2 12h5" />
            <path d="M17 12h5" />
            <path d="M7 7l10 10" />
            <path d="M7 17L17 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          悠渡脉选
        </h1>
        <p className="text-sm text-muted-foreground">
          发现优质机会，连接无限可能
        </p>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground/60">
        &copy; {new Date().getFullYear()}{' '}
        <a href="https://github.com/Yogdunana" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
          Yogdunana-悠渡
        </a>{' '}
        版权所有
      </p>
    </div>
  );
}
