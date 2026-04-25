import type {
  BoundingBox,
  TunnelData,
  TunnelItem,
  TunnelSection,
  TunnelSectionMesh,
} from "@/data/tunnelParser/types";

export function createEmptySectionMesh(): TunnelSectionMesh {
  const emptyBoundingBox: BoundingBox = {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
    isEmpty: true,
  };

  return {
    bBox: emptyBoundingBox,
    numPoints: 0,
    numTriangles: 0,
    points: [],
    normals: [],
    uvs: [],
    triangles: [],
  };
}

export function createEmptyTunnelSection(): TunnelSection {
  return {
    tunnelMesh: createEmptySectionMesh(),
    waterMesh: createEmptySectionMesh(),
  };
}

export function updateTunnelItemAtIndex(
  tunnelData: TunnelData,
  index: number,
  item: TunnelItem,
): TunnelData {
  const items = [...tunnelData.items];
  items[index] = item;
  return {
    ...tunnelData,
    items,
    header: { ...tunnelData.header, numItems: items.length },
  };
}

export function deleteTunnelItemAtIndex(
  tunnelData: TunnelData,
  index: number,
): TunnelData {
  const items = tunnelData.items.filter((_, itemIndex) => itemIndex !== index);
  return {
    ...tunnelData,
    items,
    header: { ...tunnelData.header, numItems: items.length },
  };
}

export function addTunnelItem(
  tunnelData: TunnelData,
  item: TunnelItem,
): { data: TunnelData; newIndex: number } {
  const items = [...tunnelData.items, item];
  return {
    data: {
      ...tunnelData,
      items,
      header: { ...tunnelData.header, numItems: items.length },
    },
    newIndex: items.length - 1,
  };
}

export function addTunnelSection(
  tunnelData: TunnelData,
  afterIndex?: number,
): { data: TunnelData; insertedIndex: number } {
  const insertIndex =
    afterIndex !== undefined ? afterIndex + 1 : tunnelData.sections.length;
  const section = createEmptyTunnelSection();
  const sections = [
    ...tunnelData.sections.slice(0, insertIndex),
    section,
    ...tunnelData.sections.slice(insertIndex),
  ];

  return {
    data: {
      ...tunnelData,
      sections,
      header: { ...tunnelData.header, numSections: sections.length },
    },
    insertedIndex: insertIndex,
  };
}

export function canDeleteTunnelSection(tunnelData: TunnelData): boolean {
  return tunnelData.sections.length > 1;
}

export function deleteTunnelSection(
  tunnelData: TunnelData,
  index: number,
): TunnelData {
  const sections = tunnelData.sections.filter(
    (_, sectionIndex) => sectionIndex !== index,
  );
  const items = tunnelData.items.map((item) => {
    if (item.sectionNum > index) {
      return { ...item, sectionNum: item.sectionNum - 1 };
    }
    if (item.sectionNum === index) {
      return { ...item, sectionNum: Math.max(0, index - 1) };
    }
    return item;
  });

  return {
    ...tunnelData,
    sections,
    items,
    header: { ...tunnelData.header, numSections: sections.length },
  };
}

export function duplicateTunnelSection(
  tunnelData: TunnelData,
  index: number,
): { data: TunnelData; duplicatedIndex: number } | null {
  const sourceSection = tunnelData.sections[index];
  if (!sourceSection) {
    return null;
  }

  const clone = structuredClone(sourceSection);
  const sections = [
    ...tunnelData.sections.slice(0, index + 1),
    clone,
    ...tunnelData.sections.slice(index + 1),
  ];
  const items = tunnelData.items.map((item) =>
    item.sectionNum > index
      ? { ...item, sectionNum: item.sectionNum + 1 }
      : item,
  );

  return {
    data: {
      ...tunnelData,
      sections,
      items,
      header: { ...tunnelData.header, numSections: sections.length },
    },
    duplicatedIndex: index + 1,
  };
}
