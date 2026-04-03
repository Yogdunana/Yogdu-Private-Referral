'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search,
  LogOut,
  User,
  Menu,
  X,
  Send,
  FileText,
  Shield,
  Home,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { JwtPayload } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  CONTRIBUTOR: '投稿者',
  USER: '普通用户',
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('已退出登录');
      router.push('/login');
    } catch {
      toast.error('退出登录失败');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/?keyword=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  const navLinks = [
    { href: '/', label: '首页', icon: Home, show: true },
    { href: '/favorites', label: '我的收藏', icon: Heart, show: true },
    { href: '/submit', label: '投稿', icon: Send, show: user?.role === 'CONTRIBUTOR' || user?.role === 'ADMIN' },
    { href: '/my-submissions', label: '我的投稿', icon: FileText, show: user?.role === 'CONTRIBUTOR' || user?.role === 'ADMIN' },
    { href: '/admin/review', label: '管理后台', icon: Shield, show: user?.role === 'ADMIN' },
  ].filter((link) => link.show);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4 gap-4">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              悠
            </div>
            <span className="font-bold text-lg hidden sm:inline">悠渡脉选</span>
          </Link>

          {/* Center: Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索职位..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </form>

          {/* Right: Nav links + User menu */}
          <nav className="flex items-center gap-1">
            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1.5"
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="ml-1">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role ? ROLE_LABELS[user.role] : ''}
                  </p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="size-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                      悠
                    </div>
                    悠渡脉选
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-1">
                  {/* Mobile search */}
                  <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="搜索职位..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </form>

                  {/* User info */}
                  <div className="px-3 py-2 mb-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user?.role ? ROLE_LABELS[user.role] : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nav links */}
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={pathname === link.href ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-2"
                      >
                        <link.icon className="size-4" />
                        {link.label}
                      </Button>
                    </Link>
                  ))}

                  <div className="pt-2 border-t mt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      退出登录
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} <a href="https://github.com/Yogdunana" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Yogdunana-悠渡</a>. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
