import { Suspense } from "react";
import { GroupSettings } from "@/components/group-settings";

async function Settings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupSettings id={id} />;
}

export default function GroupSettingsPage({ params }: PageProps<"/g/[id]/settings">) {
  return (
    <Suspense fallback={<p className="p-6">불러오는 중</p>}>
      <Settings params={params} />
    </Suspense>
  );
}
