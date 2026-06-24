import { ResourceTable } from "@/components/ResourceTable";
export default function RentalsPage() { return <ResourceTable title="Rental records" description="Manage active rental records without payment collection or tracking." endpoint="/rentals" fields={["status", "startDate", "endDate", "createdAt"]} />; }
