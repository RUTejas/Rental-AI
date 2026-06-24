"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/services/api";
import { Captcha } from "@/components/Captcha";

type SignupRole = "admin" | "user";

export function SignupForm({ role }: { role: SignupRole }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", adminId: "" });
  const [captcha, setCaptcha] = useState({ token: "", answer: 0 });
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!captcha.token || !captcha.answer) return toast.error("Complete the security verification first.");
    setLoading(true);
    try {
      const response = await api.post(`/auth/${role}/signup`, { ...form, captchaToken: captcha.token, captchaAnswer: captcha.answer });
      toast.success(response.data.message || "Registration submitted successfully.");
      setForm({ name: "", email: "", phone: "", password: "", adminId: "" });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || "Registration could not be completed.");
    } finally { setLoading(false); }
  };

  const title = role === "admin" ? "Request admin access" : "Create your tenant account";
  return <main className="min-h-screen bg-[#0B1117] text-[#FAFAF8] grid place-items-center p-5">
    <form onSubmit={submit} className="dark-card w-full max-w-lg p-7 md:p-10 space-y-5">
      <Link href="/" className="text-[#C89B5E] text-sm">← RentWise AI</Link>
      <div><h1 className="text-3xl font-bold">{title}</h1><p className="text-[#9CA3AF] mt-2">Secure, role-scoped rental administration.</p></div>
      <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" className="auth-input" />
      <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email address" className="auth-input" />
      <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Phone number" className="auth-input" />
      {role === "user" && <input required value={form.adminId} onChange={(e) => update("adminId", e.target.value)} placeholder="Your admin invitation ID" className="auth-input" />}
      <input required minLength={8} type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Password (8+ characters)" className="auth-input" />
      <Captcha onVerify={(token, answer) => setCaptcha({ token, answer })} />
      <button disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">{loading ? "Submitting…" : "Submit registration"}</button>
      <p className="text-center text-sm text-[#9CA3AF]">Already registered? <Link className="text-[#C89B5E]" href="/login">Sign in</Link></p>
    </form>
  </main>;
}
