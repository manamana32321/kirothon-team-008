import { GroupSettings } from "@/components/group-settings";

export default async function GroupSettingsPage({ params }: PageProps<"/g/[id]/settings">) {
  const { id } = await params;
  return <GroupSettings id={id} />;
}
