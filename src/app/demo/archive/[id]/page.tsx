import { ArchiveViewer } from "@/frontend/archive";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ArchiveViewer id={(await params).id} />;
}
