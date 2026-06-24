"use client";

import { useEffect, useState } from "react";
import useAuthStore from "@/store/authStore";
import { 
  Users, Building, FileText,
  AlertCircle, ShieldCheck, Clock
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import api from "@/services/api";

// Interfaces for Dashboard Data based on roles
interface DashboardStats {
  totalUsers?: number;
  totalAdmins?: number;
  totalProperties?: number;
  activeRentals?: number;
  pendingRequests?: number;
  revenue?: number;
}

export default function DashboardOverview() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Since we are mocking the dashboard stats if no API exists yet,
        // let's attempt to fetch if endpoints are ready, otherwise use dummy data
        setIsLoading(true);
        if (user?.role === 'master_admin') {
          // Master Admin specific endpoint
          const { data } = await api.get('/master/dashboard');
          setStats(data.data);
        } else if (user?.role === 'admin') {
          // Admin specific endpoint
          const { data } = await api.get('/admin/dashboard');
          setStats(data.data);
        } else {
          // User specific endpoint
          const { data } = await api.get('/user/dashboard');
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats, using fallback data", error);
        // Fallback dummy data for visualization
        setStats({
          totalUsers: 142,
          totalAdmins: 8,
          totalProperties: 45,
          activeRentals: 38,
          pendingRequests: 12,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#C89B5E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Animation variants
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#FAFAF8] mb-2">
          {user?.role === 'master_admin' ? "Master Control Center" : 
           user?.role === 'admin' ? "Admin Dashboard" : 
           "Tenant Portal"}
        </h1>
        <p className="text-[#9CA3AF]">
          Welcome back, {user?.name}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {user?.role === 'master_admin' && (
          <motion.div variants={item} className="dark-card p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#C89B5E]/10 rounded-full blur-xl group-hover:bg-[#C89B5E]/20 transition-colors" />
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center border border-[#374151]">
                <ShieldCheck className="w-6 h-6 text-[#C89B5E]" />
              </div>
              <h3 className="text-[#9CA3AF] font-medium">Total Admins</h3>
            </div>
            <div className="text-3xl font-bold text-[#FAFAF8]">{stats?.totalAdmins || 0}</div>
          </motion.div>
        )}

        {(user?.role === 'master_admin' || user?.role === 'admin') && (
          <>
            <motion.div variants={item} className="dark-card p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#7E9B87]/10 rounded-full blur-xl group-hover:bg-[#7E9B87]/20 transition-colors" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center border border-[#374151]">
                  <Building className="w-6 h-6 text-[#7E9B87]" />
                </div>
                <h3 className="text-[#9CA3AF] font-medium">Properties</h3>
              </div>
              <div className="text-3xl font-bold text-[#FAFAF8]">{stats?.totalProperties || 0}</div>
            </motion.div>

            <motion.div variants={item} className="dark-card p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#3F6C8F]/10 rounded-full blur-xl group-hover:bg-[#3F6C8F]/20 transition-colors" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center border border-[#374151]">
                  <Users className="w-6 h-6 text-[#3F6C8F]" />
                </div>
                <h3 className="text-[#9CA3AF] font-medium">Active Tenants</h3>
              </div>
              <div className="text-3xl font-bold text-[#FAFAF8]">{stats?.totalUsers || 0}</div>
            </motion.div>
          </>
        )}

        <motion.div variants={item} className="dark-card p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#B66A4B]/10 rounded-full blur-xl group-hover:bg-[#B66A4B]/20 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center border border-[#374151]">
              <FileText className="w-6 h-6 text-[#B66A4B]" />
            </div>
            <h3 className="text-[#9CA3AF] font-medium">Active Rentals</h3>
          </div>
          <div className="text-3xl font-bold text-[#FAFAF8]">{stats?.activeRentals || 0}</div>
        </motion.div>

        <motion.div variants={item} className="dark-card p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#D97706]/10 rounded-full blur-xl group-hover:bg-[#D97706]/20 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center border border-[#374151]">
              <AlertCircle className="w-6 h-6 text-[#D97706]" />
            </div>
            <h3 className="text-[#9CA3AF] font-medium">Pending Requests</h3>
          </div>
          <div className="text-3xl font-bold text-[#FAFAF8]">{stats?.pendingRequests || 0}</div>
        </motion.div>
      </motion.div>

      {/* Main Content Area - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Recent Activity / Feed */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 dark-card p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#FAFAF8]">Recent Activity</h2>
            <button className="text-sm text-[#C89B5E] hover:underline font-medium">View All</button>
          </div>
          
          <div className="space-y-6">
            {/* Dummy Activity Items */}
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-[#1A232D] transition-colors border border-transparent hover:border-[#2A3441]">
                <div className="w-10 h-10 rounded-full bg-[#1F2937] border border-[#374151] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#9CA3AF]" />
                </div>
                <div>
                  <p className="text-[#FAFAF8] font-medium mb-1">
                    {i === 0 ? "E-Agreement signed by John Doe" : 
                     i === 1 ? "New maintenance request for Apt 4B" : 
                     "Identity document verified for Alice Smith"}
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {i === 0 ? "2 hours ago" : i === 1 ? "5 hours ago" : "Yesterday"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Column - Quick Actions / Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-6"
        >
          <div className="dark-card p-6 bg-gradient-to-br from-[#121A22] to-[#1F3D35]">
            <h3 className="text-lg font-bold text-[#FAFAF8] mb-2">AI System Status</h3>
            <div className="flex items-center gap-2 text-[#7E9B87] font-medium mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7E9B87] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#7E9B87]"></span>
              </span>
              All Systems Operational
            </div>
            <p className="text-sm text-[#9CA3AF] mb-6">
              OCR, Agreement Generation, and Request Classification engines are running optimally.
            </p>
            <button className="w-full py-3 bg-[#1F2937] hover:bg-[#374151] text-[#FAFAF8] rounded-xl font-medium transition-colors border border-[#374151]">
              View AI Logs
            </button>
          </div>

          <div className="dark-card p-6">
            <h3 className="text-lg font-bold text-[#FAFAF8] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {user?.role === 'master_admin' && (
                <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1A232D] hover:bg-[#1F2937] border border-[#2A3441] text-[#FAFAF8] font-medium transition-colors">
                  + Add New Admin
                </button>
              )}
              {(user?.role === 'master_admin' || user?.role === 'admin') && (
                <>
                  <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1A232D] hover:bg-[#1F2937] border border-[#2A3441] text-[#FAFAF8] font-medium transition-colors">
                    + Add New Property
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1A232D] hover:bg-[#1F2937] border border-[#2A3441] text-[#FAFAF8] font-medium transition-colors">
                    Draft E-Agreement
                  </button>
                </>
              )}
              {user?.role === 'user' && (
                <>
                  <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1A232D] hover:bg-[#1F2937] border border-[#2A3441] text-[#FAFAF8] font-medium transition-colors">
                    Submit Request
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1A232D] hover:bg-[#1F2937] border border-[#2A3441] text-[#FAFAF8] font-medium transition-colors">
                    View My Agreement
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
