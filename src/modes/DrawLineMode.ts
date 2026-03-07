import type { DrawControls, DrawControlsMode } from '../controls/DrawControls';
import * as THREE from 'three';

export const DRAW_LINE_MODE = 'line' as const;

export class DrawLineMode implements DrawControlsMode {
  public readonly mode = DRAW_LINE_MODE;
  private _points: THREE.Vector3[] = [];
  private _currentLine: THREE.Line | null = null;

  constructor() { }

  public onMouseDown(event: MouseEvent, controls: DrawControls): void {
    // only start on left-button
    if (event.button !== 0) return;
    const point = controls.getIntersectionPoint(event);
    if (!point) return;
    controls.controls.enabled = false; // disable orbit controls while drawing
    // start a new line with a duplicate point for geometry initialization
    this._points = [point.clone()];

    console.log('Starting line at', point);

    const geometry = new THREE.BufferGeometry().setFromPoints([point.clone(), point.clone()]);
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const line = new THREE.Line(geometry, material);
    this._currentLine = line;
    controls.drawingTarget.add(line);
  }

  public onMouseMove(event: MouseEvent, controls: DrawControls): void {
    if (!this._currentLine) return;

    const point = controls.getIntersectionPoint(event);
    if (!point) return;

    this._points.push(point.clone());

    // update geometry in place using helper
    this._currentLine.geometry.dispose();
    this._currentLine.geometry = new THREE.BufferGeometry().setFromPoints(this._points);
    this._currentLine.geometry.attributes.position.needsUpdate = true;

    console.log('Updated line with point', point, this._points);
  }

  public onMouseUp(event: MouseEvent, controls: DrawControls): void {
    controls.controls.enabled = true; // enable orbit controls after drawing
    if (event.button !== 0) return;
    // finish drawing
    this._currentLine = null;
    this._points = [];
    console.log('Finished line');
  }

  public cancel(): void {
    if (this._currentLine) {
      // remove from scene
      this._currentLine.parent?.remove(this._currentLine);
      this._currentLine.geometry.dispose();
      (this._currentLine.material as THREE.Material).dispose();
      this._currentLine = null;
    }
    this._points = [];
    console.log('Cancelled line');
  }

  public dispose(): void {
    // cancel any ongoing operation; final lines stay in scene
    this.cancel();
    console.log('Disposed line mode');
  }
}
