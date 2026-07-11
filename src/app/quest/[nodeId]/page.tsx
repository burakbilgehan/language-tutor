import { QuestPlayer } from "@/components/quest/QuestPlayer";

export default async function QuestPage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  return <QuestPlayer nodeId={nodeId} />;
}
