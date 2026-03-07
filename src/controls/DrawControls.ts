import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { getIntersectionPoint } from '../utils/getIntersectionPoint';

/**
 * DrawControlsMode defines the structure for a drawing mode, including the mode name and event handlers for mouse interactions.
 */
export interface DrawControlsMode<TMode extends string = string> {
  /**
   * The name of the drawing mode. This is used to identify the mode and switch between different drawing modes.
   */
  mode: TMode;
  /**
   * Handle mouse down event to start the drawing operation.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   * @param controls - The instance of DrawControls that is managing the drawing operation.
   */
  onMouseDown: (event: MouseEvent, controls: DrawControls<TMode>) => void;
  /**
   * Handle mouse move event to update the drawing operation.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   * @param controls - The instance of DrawControls that is managing the drawing operation.
   */
  onMouseMove: (event: MouseEvent, controls: DrawControls<TMode>) => void;
  /**
   * Handle mouse up event to end the drawing operation.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   * @param controls - The instance of DrawControls that is managing the drawing operation.
   */
  onMouseUp: (event: MouseEvent, controls: DrawControls<TMode>) => void;
  /**
   * Cancel the current drawing operation.
   * This can be used to abort the drawing process if needed (e.g., when the user presses the Escape key).
   */
  cancel: () => void;
  /**
   * Dispose the resources used by this drawing mode.
   * This can be used to clean up any temporary objects or event listeners when switching modes or when the controls are disposed.
   */
  dispose: () => void;
}

/**
 * DrawControls is a utility class that combines OrbitControls with custom drawing functionality.
 * It allows users to draw on a specified plane in the 3D scene while still being able to orbit around the scene using OrbitControls.
 * The drawing plane can be rotated to allow for drawing on different planes (e.g., XY, XZ, YZ).
 * The class manages mouse events to switch between drawing mode and orbiting mode seamlessly.
 */
export type DrawControlsModes<TMode extends string> = {
  [mode in TMode]: DrawControlsMode<mode>;
};

export type DrawControlsOptions<TMode extends string> = {
  /**
   * Drawing modes. The key is the mode name, and the value is the event handlers for that mode.
   */
  modes: DrawControlsModes<TMode>;
  /**
   * Camera
   */
  camera: THREE.Camera;
  /**
   * DOM element to attach event listeners to
   */
  domElement: HTMLElement;
  /**
   * The object3D to which drawn objects will be added
   */
  drawingTarget: THREE.Object3D;
  /**
   * Drawing plane rotation (default: no rotation, i.e. XY plane)
   */
  planeRotation?: THREE.Euler;
};

export class DrawControls<TMode extends string = string> {
  /**
   * Drawing modes. The key is the mode name, and the value is the event handlers for that mode.
   */
  private _modes: DrawControlsModes<TMode>;
  /**
   * Current drawing mode. If null, it means no drawing mode is active and only orbiting is possible.
   */
  private _currentMode: DrawControlsMode<TMode> | null = null;
  /**
   * Camera
   */
  private _camera: THREE.Camera;
  /**
   * OrbitControls
   */
  private _orbitControls: OrbitControls;
  /**
   * Drawing plane(the plane on which the user draws)
   */
  private _drawingPlane: THREE.Plane;
  /**
   * The Rotation of the drawing plane
   */
  private _planeRotation: THREE.Euler;
  /**
   * The object3D to which drawn objects will be added
   */
  private _drawingTarget: THREE.Object3D;

  constructor(options: DrawControlsOptions<TMode>) {
    const {
      modes,
      camera,
      domElement,
      drawingTarget,
      planeRotation = new THREE.Euler(0, 0, 0),
    } = options;
    this._orbitControls = new OrbitControls(camera, domElement);
    this._camera = camera;
    this._modes = modes;
    this._drawingTarget = drawingTarget;
    this._planeRotation = planeRotation;
    // The normal of the drawing plane is initially set to be perpendicular to the Camera's up vector and then rotated by the specified planeRotation
    const normal = camera.up.clone().applyEuler(this._planeRotation);
    this._drawingPlane = new THREE.Plane(normal, 0);
    this._connectEventListeners();
  }

  /**
   * Connect event listeners to the DOM element.
   */
  private _connectEventListeners() {
    if (!this._orbitControls.domElement) return;
    this._orbitControls.domElement.addEventListener('mousedown', this._onMouseDown);
    this._orbitControls.domElement.addEventListener('mousemove', this._onMouseMove);
    this._orbitControls.domElement.addEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Disconnect event listeners from the DOM element.
   */
  private _disconnectEventListeners() {
    if (!this._orbitControls.domElement) return;
    this._orbitControls.domElement.removeEventListener('mousedown', this._onMouseDown);
    this._orbitControls.domElement.removeEventListener('mousemove', this._onMouseMove);
    this._orbitControls.domElement.removeEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Set the current drawing mode. If modeName is null, it means no drawing mode is active and only orbiting is possible.
   * @param modeName - The name of the drawing mode to activate, or null to deactivate drawing mode and enable orbiting only.
   * @returns - true if the mode was successfully set, false if the specified modeName does not exist in the modes configuration.
   */
  public setCurrentMode(modeName: TMode | null): boolean {
    // If modeName is null, disable drawing mode and enable orbiting only
    if (modeName === null) {
      this._currentMode = null;
      return true;
    }
    const mode = this._modes[modeName];
    if (!mode) {
      console.warn(`DrawControls: Mode "${modeName}" not found.`);
      return false;
    }
    this._currentMode = mode;
    return true;
  }

  /**
   * Set the drawing target object3D. This is the object to which drawn objects will be added.
   * @param target - The new drawing target object3D.
   */
  public setDrawingTarget(target: THREE.Object3D) {
    // Cancel the current drawing operation if there is an active mode
    this._currentMode?.cancel();
    this._drawingTarget = target;
  }

  /**
   * Set the rotation of the drawing plane.
   * @param rotation - The new rotation of the drawing plane.
   */
  public setPlaneRotation(rotation: THREE.Euler) {
    this._planeRotation = rotation;
    const normal = this._orbitControls.object.up.clone().applyEuler(this._planeRotation);
    this._drawingPlane.set(normal, 0);
  }

  /**
   * Set the camera used by the controls.
   * This will update the camera used for both orbiting and calculating the drawing plane.
   */
  public setCamera(camera: THREE.Camera) {
    this._orbitControls.object = camera;
    this._camera = camera;
    this._orbitControls.update();
  }

  /**
   * Get the intersection point of the mouse ray with the drawing plane.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   * @returns - The intersection point in 3D space, or null if there is no intersection.
   */
  public getIntersectionPoint(event: MouseEvent): THREE.Vector3 | null {
    return getIntersectionPoint(event, this._camera, this._drawingPlane);
  }

  /**
   * This method is transfarred from OrbitControls.
   * It should be called in the animation loop to update the controls.
   */
  public update() {
    this._orbitControls.update();
  }

  /**
   * Dispose the controls and clean up resources.
   * This should be called when the controls are no longer needed to prevent memory leaks.
   */
  public dispose() {
    this._orbitControls.dispose();
    Object.values(this._modes).forEach((mode) =>
      (mode as DrawControlsMode<TMode> | undefined)?.dispose()
    );
    // disconnect event listeners
    this._disconnectEventListeners();
  }

  /**
   * Handle mouse down event. If a drawing mode is active, it will call the onMouseDown handler of the current drawing mode.
   * If no drawing mode is active, it will pass the event to OrbitControls to handle orbiting.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   */
  private _onMouseDown = (event: Event) => {
    this._currentMode?.onMouseDown(event as MouseEvent, this);
  };

  /**
   * Handle mouse move event. If a drawing mode is active, it will call the onMouseMove handler of the current drawing mode.
   * If no drawing mode is active, it will pass the event to OrbitControls to handle orbiting.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   */
  private _onMouseMove = (event: Event) => {
    this._currentMode?.onMouseMove(event as MouseEvent, this);
  };

  /**
   * Handle mouse up event. If a drawing mode is active, it will call the onMouseUp handler of the current drawing mode.
   * If no drawing mode is active, it will pass the event to OrbitControls to handle orbiting.
   * @param event - The mouse event containing the screen coordinates of the mouse pointer.
   */
  private _onMouseUp = (event: Event) => {
    this._currentMode?.onMouseUp(event as MouseEvent, this);
  };

  /**
   * Get the drawing modes. The key is the mode name, and the value is the event handlers for that mode.
   */
  public get modes(): DrawControlsModes<TMode> {
    return this._modes;
  }

  /**
   * Get the drawing target object3D. This is the object to which drawn objects will be added.
   * @returns - The current drawing target object3D.
   */
  public get drawingTarget(): THREE.Object3D {
    return this._drawingTarget;
  }

  /**
   * Get the camera used by the controls.
   */
  public get camera(): THREE.Camera {
    return this._camera;
  }

  /**
   * Get the rotation of the drawing plane.
   */
  public get planeRotation(): THREE.Euler {
    return this._planeRotation;
  }

  /**
   * Get the current drawing mode. If null is returned, it means no drawing mode is active and only orbiting is possible.
   */
  public get currentMode(): TMode | null {
    return this._currentMode?.mode || null;
  }

  /**
   * Get the OrbitControls instance used for orbiting.
   * This can be used to access OrbitControls methods and properties directly if needed.
   */
  public get controls(): OrbitControls {
    return this._orbitControls;
  }
}
