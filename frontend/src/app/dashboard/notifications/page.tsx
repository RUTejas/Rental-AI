import { ResourceTable } from "@/components/ResourceTable";
export default function NotificationsPage() { return <ResourceTable title="Notifications" description="Your latest agreement, document, and request updates." endpoint="/notifications" fields={["title", "message", "type", "readStatus", "createdAt"]} />; }
