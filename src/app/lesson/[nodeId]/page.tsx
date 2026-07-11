import { LessonPlayer } from "@/components/lesson/LessonPlayer";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  return <LessonPlayer nodeId={nodeId} />;
}
