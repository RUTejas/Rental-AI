"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { FileWarning, Loader2 } from "lucide-react";

type RecordValue = Record<string, unknown>;

const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
const display = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return "Details available";
  if (typeof value === "string" && value.includes("T")) return new Date(value).toLocaleDateString();
  return String(value);
};

export function ResourceTable({ title, description, endpoint, fields }: { title: string; description: string; endpoint: string; fields: string[] }) {
  const [items, setItems] = useState<RecordValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(endpoint).then(({ data }) => {
      const payload = data.data;
      const list = Array.isArray(payload) ? payload : Object.values(payload).find(Array.isArray);
      setItems((list || []) as RecordValue[]);
    }).catch((requestError: unknown) => {
      setError((requestError as { response?: { data?: { message?: string } } }).response?.data?.message || "Unable to load this information.");
    }).finally(() => setLoading(false));
  }, [endpoint]);

  return <section className="space-y-7">
    <div><h1 className="text-3xl font-bold text-[#FAFAF8]">{title}</h1><p className="mt-2 text-[#9CA3AF]">{description}</p></div>
    <div className="dark-card overflow-x-auto">
      {loading ? <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-[#C89B5E]" /></div> : error ? <div className="p-10 text-center text-[#D97706]"><FileWarning className="mx-auto mb-3" />{error}</div> : items.length === 0 ? <div className="p-12 text-center text-[#9CA3AF]">Nothing to show yet.</div> :
        <table className="w-full text-left text-sm"><thead className="border-b border-[#2A3441] text-[#9CA3AF]"><tr>{fields.map((field) => <th className="p-4 font-medium whitespace-nowrap" key={field}>{label(field)}</th>)}</tr></thead><tbody>{items.map((item, index) => <tr key={String(item.id || index)} className="border-b border-[#2A3441]/70 last:border-0 hover:bg-white/[.02]">{fields.map((field) => <td className="p-4 text-[#FAFAF8] whitespace-nowrap" key={field}>{display(item[field])}</td>)}</tr>)}</tbody></table>}
    </div>
  </section>;
}
