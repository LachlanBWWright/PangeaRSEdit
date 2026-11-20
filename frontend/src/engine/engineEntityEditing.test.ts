import { describe, expect, it } from "vitest";
import { engineFile, parseScene, replaceEngineScene } from "./enginePackage";
import { createWorkshopPackage } from "./workshopPackage";
import { changeEngineEntity, dropEngineEntity, moveEngineEntity, newEngineEntity } from "./engineEntityEditing";

describe("generic scene actor authoring", () => {
  it("creates and edits an actor with a stable Lua lookup ID", () => {
    const packageData = createWorkshopPackage();
    const file = engineFile(packageData, "scenes/arena.json");
    expect(file).toBeDefined();
    if (!file) return;
    const parsed = parseScene(file);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    const entity = newEngineEntity(parsed.value);
    const scene = { ...parsed.value, entities: [...parsed.value.entities, entity] };
    expect(newEngineEntity(scene).id).not.toBe(entity.id);
    const moved = moveEngineEntity(scene, entity.id, "x", 175);
    expect(moved.entities.at(-1)?.position.x).toBe(175);
    expect(moveEngineEntity(moved, entity.id, "x", 175)).toBe(moved);
    const physical = changeEngineEntity(moved, entity.id, { body: { mode: "dynamic", halfExtents: { x: 10, y: 30, z: 10 }, layer: "solid", gravity: -980, collision: true } });
    const grounded = dropEngineEntity(physical, entity.id);
    expect(grounded.entities.at(-1)?.position.y).toBe(30 * entity.scale);
    expect(replaceEngineScene(packageData, file.path, grounded).isOk()).toBe(true);
  });
  it("rejects unresolved models, duplicate IDs, zero scale and malformed physics", () => {
    const packageData = createWorkshopPackage();
    const file = engineFile(packageData, "scenes/arena.json");
    if (!file) return;
    const parsed = parseScene(file);
    if (parsed.isErr()) return;
    const entity = newEngineEntity(parsed.value);
    expect(replaceEngineScene(packageData, file.path, { ...parsed.value, entities: [{ ...entity, model: "absent" }] }).isErr()).toBe(true);
    expect(replaceEngineScene(packageData, file.path, { ...parsed.value, entities: [entity, entity] }).isErr()).toBe(true);
    expect(replaceEngineScene(packageData, file.path, { ...parsed.value, entities: [{ ...entity, scale: 0 }] }).isErr()).toBe(true);
    expect(replaceEngineScene(packageData, file.path, { ...parsed.value, entities: [{ ...entity, body: { mode: "dynamic", halfExtents: { x: 0, y: 1, z: 1 } } }] }).isErr()).toBe(true);
  });
});
