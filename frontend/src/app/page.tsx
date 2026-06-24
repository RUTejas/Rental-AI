"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import { ArrowRight, ShieldCheck, Home as HomeIcon, Zap, FileText, CheckCircle } from "lucide-react";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  return (
    <div ref={containerRef} className="relative w-full bg-[#0B1117] text-[#FAFAF8] overflow-hidden selection:bg-[#C89B5E] selection:text-[#0B1117]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 mix-blend-difference">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C89B5E] to-[#B66A4B] flex items-center justify-center">
            <HomeIcon className="w-4 h-4 text-[#0B1117]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#FAFAF8]">RentWise AI</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium hover:text-[#C89B5E] transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-semibold rounded-full btn-primary">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative h-screen flex flex-col items-center justify-center text-center px-4 pt-20"
      >
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C89B5E] rounded-full blur-[150px]" />
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1F3D35] rounded-full blur-[150px]" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 max-w-5xl"
        >
          <span className="inline-block py-1 px-3 mb-6 border border-[#C89B5E]/30 rounded-full text-xs font-medium text-[#C89B5E] uppercase tracking-wider backdrop-blur-sm">
            Intelligent Property Management
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1] mb-8 text-reveal">
            The Future of <br className="hidden md:block" /> Rental Ecosystems
          </h1>
          <p className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience seamless multi-admin control, AI-driven document verification, and intelligent e-agreements wrapped in a premium digital environment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="px-8 py-4 rounded-full btn-primary flex items-center gap-2 text-lg">
              Explore Platform <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#features" className="px-8 py-4 rounded-full btn-secondary text-lg">
              Discover Features
            </Link>
          </div>
        </motion.div>
      </motion.section>

      {/* Cinematic Transition Section: Features */}
      <section id="features" className="relative py-32 px-4 md:px-12 lg:px-24 bg-[#121A22] z-10 rounded-t-[40px] md:rounded-t-[80px] shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#FAFAF8]">Intelligent Core <span className="text-[#C89B5E]">Features</span></h2>
            <p className="text-[#9CA3AF] max-w-xl text-lg">Our AI-enabled infrastructure automates the heavy lifting of rental management, providing unparalleled security and efficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="dark-card p-8 group hover:-translate-y-2 transition-transform duration-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#1F3D35] flex items-center justify-center mb-6 border border-[#2F7D5C]/30 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck className="w-7 h-7 text-[#7E9B87]" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">AI Document Verification</h3>
              <p className="text-[#9CA3AF] leading-relaxed">
                Instant OCR-based validation of tenant IDs and financial documents. Fraud detection and automatic data extraction built-in.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="dark-card p-8 group hover:-translate-y-2 transition-transform duration-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#B66A4B]/10 flex items-center justify-center mb-6 border border-[#B66A4B]/30 group-hover:scale-110 transition-transform duration-500">
                <FileText className="w-7 h-7 text-[#B66A4B]" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Smart E-Agreements</h3>
              <p className="text-[#9CA3AF] leading-relaxed">
                Dynamic generation of legally compliant rental contracts with digital signatures, highlighted clauses, and AI summaries.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="dark-card p-8 group hover:-translate-y-2 transition-transform duration-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#C89B5E]/10 flex items-center justify-center mb-6 border border-[#C89B5E]/30 group-hover:scale-110 transition-transform duration-500">
                <Zap className="w-7 h-7 text-[#C89B5E]" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Multi-Tier Hierarchy</h3>
              <p className="text-[#9CA3AF] leading-relaxed">
                Master Admin oversight with autonomous Sub-Admin controls. Tenants experience a secure, isolated, and premium portal.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visual Showcase / Role Highlight */}
      <section className="py-32 bg-[#0B1117] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-24 flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex-1"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Designed for <br/> <span className="text-[#C89B5E]">Property Leaders</span></h2>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C89B5E] shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-semibold mb-2">Master Admin Control</h4>
                  <p className="text-[#9CA3AF]">Complete platform visibility, analytics, and admin management from a command-center dashboard.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C89B5E] shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-semibold mb-2">Admin Efficiency</h4>
                  <p className="text-[#9CA3AF]">Manage properties, review AI-verified tenant applications, and process e-agreements effortlessly.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C89B5E] shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-semibold mb-2">Tenant Transparency</h4>
                  <p className="text-[#9CA3AF]">A beautiful portal for tenants to view active rentals, signed documents, and submit categorized requests.</p>
                </div>
              </li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex-1 relative w-full aspect-square md:aspect-[4/3] rounded-[32px] overflow-hidden border border-[#C89B5E]/20 bg-[#121A22] shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#121A22] to-[#1F3D35] opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center text-[#9CA3AF]/30 font-serif text-2xl">
              [ Dashboard Visualization ]
            </div>
            {/* We can add an actual image or abstract shapes here later */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#C89B5E] rounded-tl-full blur-[100px] opacity-20" />
          </motion.div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="relative py-24 bg-hero-gradient border-t border-[#1F3D35]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to elevate your <br/> rental portfolio?</h2>
          <p className="text-xl text-[#9CA3AF] mb-12">Join the next generation of property management.</p>
          <Link href="/register" className="px-10 py-5 rounded-full btn-primary text-xl inline-flex items-center gap-3">
            Start Managing Now <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
        <div className="absolute bottom-8 left-0 right-0 text-center text-[#6B7280] text-sm">
          &copy; {new Date().getFullYear()} RentWise AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
