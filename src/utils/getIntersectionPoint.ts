import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * Get the intersection point of the mouse ray with the drawing plane.
 * @param event - The mouse event containing the screen coordinates of the mouse pointer.
 * @param camera - The camera used to calculate the ray from the mouse position.
 * @param plane - The plane with which the ray will be intersected to find the drawing point.
 * @returns - The intersection point in 3D space, or null if there is no intersection.
 */
export function getIntersectionPoint(
  event: MouseEvent,
  camera: THREE.Camera,
  plane: THREE.Plane
): THREE.Vector3 | null {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersection = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, intersection)) {
    return intersection;
  }
  return null;
}
