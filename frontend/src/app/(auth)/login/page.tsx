"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";
import { api } from "@/services/api";
import { Captcha } from "@/components/Captcha";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "master">("admin");
  const [captcha, setCaptcha] = useState({ token: "", answer: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!captcha.token || !captcha.answer) {
      toast.error("Please complete the security verification");
      return;
    }
    setIsLoading(true);
    try {
      const endpoint = role === "master" ? "/auth/master/login" : `/auth/${role}/login`;
      const response = await api.post(endpoint, { email, password, captchaToken: captcha.token, captchaAnswer: captcha.answer });
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Login failed");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0B1117] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C89B5E] rounded-full blur-[180px] opacity-20 transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#1F3D35] rounded-full blur-[180px] opacity-20 transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="dark-card p-8 md:p-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#C89B5E] to-[#B66A4B] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(200,155,94,0.4)]">
                <Lock className="w-6 h-6 text-[#0B1117]" />
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-[#FAFAF8] mb-2">Welcome Back</h1>
            <p className="text-[#9CA3AF]">Sign in to your RentWise AI portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#121A22] p-1 border border-[#2A3441]">
              {(["master", "admin", "user"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-lg py-2 text-xs font-semibold capitalize transition-colors ${role === value ? "bg-[#C89B5E] text-[#0B1117]" : "text-[#9CA3AF] hover:text-white"}`}>
                  {value === "master" ? "Master" : value}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#FAFAF8] ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#6B7280]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121A22] border border-[#2A3441] text-[#FAFAF8] rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#C89B5E] focus:border-transparent transition-all"
                  placeholder="admin@rentwiseai.com"
                  required
                />
              </div>
            </div>

            <Captcha onVerify={(token, answer) => setCaptcha({ token, answer })} />

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-[#FAFAF8]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#C89B5E] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#6B7280]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121A22] border border-[#2A3441] text-[#FAFAF8] rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#C89B5E] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 mt-2 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[#9CA3AF] text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/admin/signup" className="text-[#C89B5E] font-medium hover:underline">
              Register as an admin
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
