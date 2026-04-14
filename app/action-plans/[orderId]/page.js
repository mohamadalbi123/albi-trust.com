import { redirect } from "next/navigation";

export default async function ActionPlanViewPage({ params }) {
  const { orderId } = await params;
  redirect(`/api/action-plans/${orderId}/download`);
}
