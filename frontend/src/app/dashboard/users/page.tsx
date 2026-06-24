import { ResourceTable } from "@/components/ResourceTable";
export default function UsersPage() { return <ResourceTable title="Tenant management" description="View and manage the tenant accounts assigned to your workspace." endpoint="/admin/users" fields={["name", "email", "phone", "status", "createdAt"]} />; }
