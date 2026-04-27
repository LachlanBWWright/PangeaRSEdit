import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User } from "lucide-react";
import { getMe, signOut, getGoogleSignInUrl } from "@/api/authApi";
import { toast } from "sonner";
import type { UserProfile } from "@/api/apiSchemas";

export function UserMenu() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMe()
      .then((result) => {
        setUser(result.isOk() ? result.value : null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target instanceof Node ? e.target : null)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = () => {
    setMenuOpen(false);
    const toastId = "sign-out";
    toast.loading("Signing out…", { id: toastId });
    signOut().then((result) => {
      if (result.isOk()) {
        setUser(null);
        toast.success("Signed out", { id: toastId });
      } else {
        toast.error("Sign out failed", {
          id: toastId,
          description: result.error.message,
        });
      }
    });
  };

  if (loading) return null;

  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="flex items-center gap-2 text-white border-slate-600 hover:border-slate-400"
        onClick={() => {
          window.location.href = getGoogleSignInUrl(window.location.href);
        }}
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        size="sm"
        variant="ghost"
        className="flex items-center gap-2 text-white"
        onClick={() => setMenuOpen((o) => !o)}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <User className="w-4 h-4" />
        )}
        <span className="hidden sm:inline max-w-[120px] truncate">
          {user.displayName}
        </span>
      </Button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-slate-700 bg-slate-800 shadow-lg py-1">
          <div className="px-3 py-2 text-sm text-slate-300 border-b border-slate-700">
            <p className="font-medium">{user.displayName}</p>
            {user.email && (
              <p className="text-xs text-slate-400">{user.email}</p>
            )}
          </div>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white hover:bg-slate-700 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
