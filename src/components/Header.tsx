import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Search, User } from "lucide-react";
import NotificationCenter from "@/components/NotificationCenter";

const Header = () => {
  const { user, signOut } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="font-bold text-xl text-white">
              LOV Esports
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link to="/" className="text-slate-300 hover:text-white">
                Home
              </Link>
              <Link to="/tournaments" className="text-slate-300 hover:text-white">
                Tournaments
              </Link>
              <Link to="/leaderboard" className="text-slate-300 hover:text-white">
                Leaderboard
              </Link>
              <Link to="/brackets" className="text-slate-300 hover:text-white">
                Brackets
              </Link>
              <Link to="/archive" className="text-slate-300 hover:text-white">
                Archive
              </Link>
            </nav>
          </div>

          {/* Right side - Search, Notifications, User menu */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search..."
                className="bg-slate-800 border-slate-700 text-sm text-slate-300 placeholder:text-slate-500 pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            {/* Notifications */}
            {user && <NotificationCenter />}

            {/* User menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name} />
                      <AvatarFallback>{user?.user_metadata?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button>Log In</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile navigation */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Explore LOV Esports
              </SheetDescription>
            </SheetHeader>
            <nav className="grid gap-4 text-lg font-semibold pt-10">
              <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-home"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </Link>
              <Link to="/tournaments" className="flex items-center gap-2 text-slate-300 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-trophy"
                >
                  <path d="M6 9H4.5a.5.5 0 0 0 0 1H6v11H4a2 2 0 0 1-2-2V7.5a.5.5 0 0 0 1 0V9h10V7.5a.5.5 0 0 0 1 0V9h10V7.5a.5.5 0 0 0 1 0v11a2 2 0 0 1-2 2H18v-11h1.5a.5.5 0 0 0 0-1H18" />
                  <circle cx="12" cy="3" r="3" />
                </svg>
                Tournaments
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-2 text-slate-300 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-bar-chart-3"
                >
                  <path d="M3 3v18h18" />
                  <rect width="8" height="12" x="3" y="9" rx="1" />
                  <rect width="8" height="8" x="13" y="13" rx="1" />
                </svg>
                Leaderboard
              </Link>
              <Link to="/brackets" className="flex items-center gap-2 text-slate-300 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-bracket"
                >
                  <path d="M4 7V4a2 2 0 0 1 2-2" />
                  <path d="M20 7V4a2 2 0 0 0-2-2" />
                  <path d="M20 17v3a2 2 0 0 0 2 2" />
                  <path d="M4 17v3a2 2 0 0 1-2 2" />
                </svg>
                Brackets
              </Link>
              <Link to="/archive" className="flex items-center gap-2 text-slate-300 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-archive"
                >
                  <rect width="20" height="4" x="2" y="3" rx="2" />
                  <path d="M4 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7" />
                  <line x1="12" x2="12" y1="12" y2="17" />
                </svg>
                Archive
              </Link>
              {user ? (
                <>
                  <Link to="/profile" className="flex items-center gap-2 text-slate-300 hover:text-white">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link to="/admin" className="flex items-center gap-2 text-slate-300 hover:text-white">
                    <Settings className="w-4 h-4" />
                    Admin
                  </Link>
                  <Button variant="ghost" onClick={() => signOut()} className="justify-start">
                    Log out
                  </Button>
                </>
              ) : (
                <Link to="/login" className="flex items-center gap-2 text-slate-300 hover:text-white">
                  <User className="w-4 h-4" />
                  Log In
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
