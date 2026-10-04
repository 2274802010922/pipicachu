import { DealView } from "@/frontend/escrow";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DealView id={id} />;
}
