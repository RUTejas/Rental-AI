"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building, MapPin, Plus } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "@/store/authStore";
import { api } from "@/services/api";

type Property = { id: string; name: string; address: string; roomNumber?: string | null; admin?: { name: string } };

export default function PropertiesPage() {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState({ name: "", address: "", roomNumber: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const endpoint = user?.role === "master_admin" ? "/master/properties" : user?.role === "admin" ? "/admin/properties" : "/user/property";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint);
      const payload = data.data;
      setProperties(payload.properties || (payload.property ? [payload.property] : []));
    } catch (error: unknown) { toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Could not load properties"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (user) void load(); }, [user, endpoint]);
  const createProperty = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.post("/admin/properties", form);
      toast.success("Property created"); setForm({ name: "", address: "", roomNumber: "" }); setShowForm(false); void load();
    } catch (error: unknown) { toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Could not create property"); }
  };

  return <section className="space-y-7"><div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-[#FAFAF8]">Properties</h1><p className="mt-2 text-[#9CA3AF]">Your role-scoped rental portfolio.</p></div>{user?.role === "admin" && <button onClick={() => setShowForm(!showForm)} className="btn-primary flex gap-2 px-5 py-3"><Plus size={18} />Add property</button>}</div>
    {showForm && <form onSubmit={createProperty} className="dark-card grid gap-3 p-5 md:grid-cols-3"><input required className="auth-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Property name" /><input required className="auth-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" /><input className="auth-input" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="Room / flat number" /><button className="btn-primary py-3 md:col-span-3">Save property</button></form>}
    {loading ? <div className="dark-card p-12 text-center text-[#9CA3AF]">Loading properties…</div> : properties.length === 0 ? <div className="dark-card p-12 text-center text-[#9CA3AF]">No assigned properties yet.</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{properties.map((property) => <article key={property.id} className="dark-card p-6"><Building className="mb-5 text-[#C89B5E]" size={30} /><h2 className="text-xl font-bold text-[#FAFAF8]">{property.name}</h2><p className="mt-3 flex gap-2 text-sm text-[#9CA3AF]"><MapPin size={16} />{property.address}</p>{property.roomNumber && <p className="mt-3 text-sm text-[#C89B5E]">Unit {property.roomNumber}</p>}{property.admin && <p className="mt-3 text-xs text-[#9CA3AF]">Managed by {property.admin.name}</p>}</article>)}</div>}</section>;
}
