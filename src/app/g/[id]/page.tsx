import { GroupView } from "@/components/group-view";

export default async function GroupPage({ params }: PageProps<"/g/[id]">) {
  const { id } = await params;
  return <GroupView id={id} />;
}
