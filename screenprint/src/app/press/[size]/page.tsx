import type { PressSizeId } from "@/domain/press";
import { PRESS_SIZES, PressView } from "../PressView";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRESS_SIZES.map((size) => ({ size }));
}

export default async function PressSizePage({ params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  return <PressView size={size as PressSizeId} />;
}
