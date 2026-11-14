import { LoadError } from "@/components/load-error";

export default function NotFound() {
  return <LoadError message="페이지를 찾을 수 없어요." showHome />;
}
