import { Suspense } from "react";
import { GroupView } from "@/components/group-view";

async function Group({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupView id={id} />;
}

export default function GroupPage({ params }: PageProps<"/g/[id]">) {
  return (
    <Suspense fallback={<p className="p-6">불러오는 중</p>}>
      <Group params={params} />
    </Suspense>
  );
}
