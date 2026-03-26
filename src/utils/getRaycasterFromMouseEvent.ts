import * as THREE from 'three';

const raycaster = new THREE.Raycaster();

/**
 * Gets a THREE.Raycaster from the mouse event, 
 * taking into account the position of the mouse relative to the drawing target's DOM element and the camera.
 * @param event - The original mouse event containing the screen coordinates of the mouse pointer.
 * @param camera - The camera used to perform raycasting.
 * @param domElement - The DOM element to which the mouse event is relative.
 * @returns A THREE.Raycaster configured to intersect objects under the mouse pointer.
 */
export function getRaycasterFromMouseEvent(event: MouseEvent, camera: THREE.Camera, domElement?: HTMLElement | SVGElement): THREE.Raycaster {
    if (!domElement) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        raycaster.params.Line = { threshold: 0.12 };
        return raycaster;
    }

    const rect = domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);
    raycaster.params.Line = { threshold: 0.12 };
    return raycaster;
}