"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  FileText, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Bell,
  Search,
  ShieldAlert,
  ClipboardList,
  BellRing
} from "lucide-react";
import useAuthStore from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0B1117] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C89B5E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/properties", icon: Building, label: "Properties", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/users", icon: Users, label: "Users", roles: ["admin"] },
    { href: "/dashboard/rentals", icon: ClipboardList, label: "Rentals", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/agreements", icon: FileText, label: "E-Agreements", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/documents", icon: FileText, label: "Documents", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/requests", icon: ShieldAlert, label: "Requests", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/notifications", icon: BellRing, label: "Notifications", roles: ["master_admin", "admin", "user"] },
    { href: "/dashboard/settings", icon: Settings, label: "Settings", roles: ["master_admin", "admin", "user"] },
  ];

  const filteredLinks = navLinks.filter(link => link.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#0B1117] flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isSidebarOpen ? 0 : (window.innerWidth >= 1024 ? 0 : -300) }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-[#121A22] border-r border-[#2A3441] z-50 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C89B5E] to-[#B66A4B] flex items-center justify-center shadow-lg shadow-[#C89B5E]/20">
              <Building className="w-5 h-5 text-[#0B1117]" />
            </div>
            <span className="text-xl font-bold text-[#FAFAF8] tracking-tight">RentWise AI</span>
          </div>
          <button className="lg:hidden text-[#9CA3AF] hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-[#1F2937] rounded-xl p-4 border border-[#374151]">
            <p className="text-[#FAFAF8] font-medium truncate">{user.name}</p>
            <p className="text-xs text-[#C89B5E] mt-1 capitalize font-medium px-2 py-0.5 bg-[#C89B5E]/10 rounded inline-block">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-[#C89B5E]/10 text-[#C89B5E] font-medium" 
                    : "text-[#9CA3AF] hover:bg-[#1A232D] hover:text-[#FAFAF8]"
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#C89B5E]" : "text-[#6B7280]"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2A3441]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#9CA3AF] hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-[#0B1117]/80 backdrop-blur-md border-b border-[#2A3441] flex items-center justify-between px-6 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-[#9CA3AF] hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-[#121A22] border border-[#2A3441] text-sm text-[#FAFAF8] rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-[#C89B5E] w-64 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-[#9CA3AF] hover:text-white transition-colors bg-[#121A22] rounded-full border border-[#2A3441]">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C89B5E] rounded-full border-2 border-[#121A22]"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-[#1F2937] border border-[#374151] flex items-center justify-center text-sm font-medium text-[#C89B5E]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B1117]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
