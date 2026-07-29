"use client";

import { useEffect, useState } from "react";
import type { Entity } from "@/lib/types";
import { initials, plainText } from "@/lib/text";
import { PortraitPlaceholder } from "@/components/os/icons";

export function Portrait({
  entity,
  className,
  imageUrl,
}: {
  entity: Entity;
  className: string;
  imageUrl?: string;
}) {
  const [src, setSrc] = useState(imageUrl ?? entity.images[0]);
  useEffect(() => setSrc(imageUrl ?? entity.images[0]), [entity.id, imageUrl, entity.images]);

  if (!src) {
    return (
      <PortraitPlaceholder seed={entity.fileNo.length} initials={initials(entity.name)} className={className} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={plainText(entity.name)}
      className={`${className} object-cover`}
      onError={() => setSrc(undefined as unknown as string)}
    />
  );
}
