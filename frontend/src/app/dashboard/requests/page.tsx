import { ResourceTable } from "@/components/ResourceTable";
export default function RequestsPage() { return <ResourceTable title="Requests & issues" description="Review rental, property, agreement, and document requests." endpoint="/requests" fields={["category", "priority", "status", "description", "createdAt"]} />; }
