"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "@/store/authStore";
import { api } from "@/services/api";

type DocumentItem = { id: string; documentType: string; originalName: string; status: string; createdAt: string; rejectionReason?: string | null };
export default function DocumentsPage() {
  const { user } = useAuthStore(); const [documents, setDocuments] = useState<DocumentItem[]>([]); const [type, setType] = useState("Aadhaar"); const [uploading, setUploading] = useState(false); const [loading, setLoading] = useState(true);
  const endpoint = user?.role === "user" ? "/user/documents" : "/documents";
  const load = async () => { setLoading(true); try { const { data } = await api.get(endpoint); const payload = data.data; setDocuments(payload.documents || payload || []); } catch { toast.error("Could not load documents"); } finally { setLoading(false); } };
  useEffect(() => { if (user) void load(); }, [user, endpoint]);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 50 * 1024 * 1024) return toast.error("Files must be 50 MB or smaller"); const body = new FormData(); body.append("document", file); body.append("documentType", type); setUploading(true); try { await api.post("/user/documents", body, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Document submitted for verification"); void load(); } catch (error: unknown) { toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Upload failed"); } finally { setUploading(false); event.target.value = ""; } };
  return <section className="space-y-7"><div><h1 className="text-3xl font-bold text-[#FAFAF8]">Documents</h1><p className="mt-2 text-[#9CA3AF]">Private, role-controlled document verification.</p></div>
    {user?.role === "user" && <div className="dark-card flex flex-col gap-4 p-6 md:flex-row md:items-end"><label className="flex-1 text-sm text-[#9CA3AF]">Document type<select value={type} onChange={(e) => setType(e.target.value)} className="auth-input mt-2"><option>Aadhaar</option><option>PAN</option><option>Driving License</option><option>Passport</option><option>Employment Proof</option><option>Other</option></select></label><label className="btn-primary cursor-pointer px-5 py-3 text-center">{uploading ? "Uploading…" : <><FileUp className="mr-2 inline" size={18} />Upload file</>}<input disabled={uploading} onChange={upload} accept=".pdf,.jpg,.jpeg,.png" className="hidden" type="file" /></label></div>}
    <div className="dark-card overflow-x-auto">{loading ? <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin text-[#C89B5E]" /></div> : documents.length === 0 ? <div className="p-12 text-center text-[#9CA3AF]">No documents have been uploaded.</div> : <table className="w-full text-left text-sm"><thead className="border-b border-[#2A3441] text-[#9CA3AF]"><tr><th className="p-4">Type</th><th className="p-4">File</th><th className="p-4">Status</th><th className="p-4">Uploaded</th></tr></thead><tbody>{documents.map((document) => <tr className="border-b border-[#2A3441]/60" key={document.id}><td className="p-4 text-[#FAFAF8]">{document.documentType}</td><td className="p-4 text-[#FAFAF8]">{document.originalName}</td><td className="p-4 text-[#C89B5E]">{document.status}{document.rejectionReason ? ` — ${document.rejectionReason}` : ""}</td><td className="p-4 text-[#9CA3AF]">{new Date(document.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>}</div></section>;
}
