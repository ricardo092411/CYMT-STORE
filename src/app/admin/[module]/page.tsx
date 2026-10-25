import { notFound } from "next/navigation";
import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { getAdminModule, isAdminModuleId } from "@/lib/admin-modules";

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleId } = await params;
  if (!isAdminModuleId(moduleId) || moduleId === "camisas" || moduleId === "maquinas") notFound();

  const module = getAdminModule(moduleId);
  if (!module) notFound();

  return <AdminModulePlaceholder module={module} />;
}
