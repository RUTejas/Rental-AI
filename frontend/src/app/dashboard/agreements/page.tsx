import { ResourceTable } from "@/components/ResourceTable";
export default function AgreementsPage() { return <ResourceTable title="E-agreements" description="Track draft, sent, accepted, and approved rental agreements." endpoint="/agreements" fields={["status", "agreementVersion", "digitalAcceptanceStatus", "expiryDate", "createdAt"]} />; }
