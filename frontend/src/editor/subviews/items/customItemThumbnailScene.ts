import { AmbientLight, Box3, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Group } from "three";
import { Result, err, ok, type Result as TypedResult } from "neverthrow";

export interface CustomItemThumbnail {
  readonly image: HTMLCanvasElement;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly scale?: number;
}

let renderer: WebGLRenderer | null = null;

export function renderCustomItemThumbnail(model: Group): TypedResult<CustomItemThumbnail, string> {
  if (!renderer) {
    const created = Result.fromThrowable(() => new WebGLRenderer({ alpha: true, antialias: true }), () => "Could not create item thumbnail renderer.")();
    if (created.isErr()) return err(created.error);
    renderer = created.value;
    renderer.setSize(96, 96);
  }
  const thumbnailRenderer = renderer;
  const bounds = new Box3().setFromObject(model);
  if (bounds.isEmpty()) return err("This model has no visible geometry.");
  const center = bounds.getCenter(new Vector3());
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 0.01);
  const scene = new Scene();
  scene.add(model, new AmbientLight(0xffffff, 1));
  const light = new DirectionalLight(0xffffff, 2);
  light.position.set(1, 2, 1);
  scene.add(light);
  const camera = new PerspectiveCamera(40, 1, radius / 100, radius * 20);
  camera.position.copy(center).add(new Vector3(1, 0.75, 1).normalize().multiplyScalar(radius / Math.sin(Math.PI / 9) * 1.15));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  const rendered = Result.fromThrowable(() => thumbnailRenderer.render(scene, camera), () => "Could not render item thumbnail.")();
  if (rendered.isErr()) { scene.remove(model); return err(rendered.error); }
  const image = document.createElement("canvas");
  image.width = 96; image.height = 96;
  const context = image.getContext("2d");
  if (!context) return err("Could not create item thumbnail canvas.");
  const copied = Result.fromThrowable(() => context.drawImage(thumbnailRenderer.domElement, 0, 0), () => "Could not capture item thumbnail.")();
  scene.remove(model);
  if (copied.isErr()) return err(copied.error);
  return ok({ image });
}
