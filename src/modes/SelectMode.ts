import type { DrawControls, DrawControlsMode } from '../controls/DrawControls';
import * as THREE from 'three';

/**
 * SelectMode allows users to select and drag existing objects in the scene.
 */
export const SELECT_MODE = 'select' as const;

/**
 * SelectionChangeReason indicates why the selection changed, 
 * which can be useful for consumers to determine how to respond to the change 
 * - `replace`: The selection was replaced with a new set of objects.
 * - `add`: Objects were added to the current selection.
 * - `remove`: Objects were removed from the current selection.
 * - `clear`: The selection was cleared.
 */
export type SelectionChangeReason = 'replace' | 'add' | 'remove' | 'clear';

/**
 * SelectModeSelectionChangeEvent is emitted when the selection changes, 
 * providing details about the new selection, what was added or removed, the reason for the change, 
 * and the original mouse event that triggered it.
 * - `selected`: The new array of selected objects.
 * - `added`: The objects that were added to the selection (empty if reason is 'replace' or 'clear').
 * - `removed`: The objects that were removed from the selection (empty if reason is 'replace' or 'clear').
 * - `reason`: The reason for the selection change, which can be 'replace', 'add', 'remove', or 'clear'.
 * - `sourceEvent`: The original MouseEvent that triggered the selection change.
 */
export type SelectModeSelectionChangeEvent = {
    selected: THREE.Object3D[];
    added: THREE.Object3D[];
    removed: THREE.Object3D[];
    reason: SelectionChangeReason;
    sourceEvent: MouseEvent;
};

/**
 * SelectModeDragEvent is emitted during dragging of selected objects, providing details about the current selection,
 * the delta movement since the drag started, and the original mouse event that triggered it.
 * - `selected`: The current array of selected objects being dragged.
 * - `delta`: The movement delta from the drag start point to the current point in world coordinates.
 * - `sourceEvent`: The original MouseEvent that triggered the drag event.
 */
export type SelectModeDragEvent = {
    selected: THREE.Object3D[];
    delta: THREE.Vector3;
    sourceEvent: MouseEvent;
};

/**
 * SelectModeHandlers defines the optional event handlers that can be provided to the SelectMode for responding to selection changes and drag events.
 * - `onSelectionChange`: Called when the selection changes, receiving a SelectModeSelectionChangeEvent with details about the change.
 * - `onDragStart`: Called when a drag operation starts on selected objects, receiving a SelectModeDragEvent with details about the initial drag state.
 * - `onDrag`: Called during dragging of selected objects, receiving a SelectModeDragEvent with details about the current drag state.
 * - `onDragEnd`: Called when a drag operation ends on selected objects, receiving a SelectModeDragEvent with details about the final drag state.
 */
export type SelectModeHandlers = {
    onSelectionChange?: (event: SelectModeSelectionChangeEvent) => void;
    onDragStart?: (event: SelectModeDragEvent) => void;
    onDrag?: (event: SelectModeDragEvent) => void;
    onDragEnd?: (event: SelectModeDragEvent) => void;
};

/**
 * SelectModeOptions defines the configuration options that can be provided when creating an instance of SelectMode.
 * - `handlers`: An object containing event handlers for selection changes and drag events.
 * - `boundingBoxColor`: The color used for the bounding box helper around selected objects (default: 0xff6b00).
 * - `rectangleColor`: The color used for the rectangle edges and vertices on the selection plane (default: 0xff6b00).
 * - `rectangleVertexRadius`: The radius of the vertices on the selection plane rectangle (default: 0.05).
 */
export type SelectModeOptions = {
    handlers?: SelectModeHandlers;
    boundingBoxColor?: THREE.ColorRepresentation;
    rectangleColor?: THREE.ColorRepresentation;
    rectangleFillColor?: THREE.ColorRepresentation;
    rectangleVertexRadius?: number;
};

/**
 * SelectionVisuals encapsulates the THREE.js objects used to visually represent the combined selection of all selected objects, including:
 * - `boxHelper`: A Box3Helper that shows the combined bounding box of all selected objects.
 * - `planeRectFill`: A Mesh that fills the rectangle on the selection plane for the combined selection.
 * - `planeRectEdges`: An array of Line objects that represent the edges of the rectangle on the selection plane.
 * - `planeRectVertices`: An array of Mesh objects that represent the vertices of the rectangle on the selection plane.
 */
type SelectionVisuals = {
    boxHelper: THREE.Box3Helper;
    planeRectFill: THREE.Mesh;
    planeRectEdges: [THREE.Line, THREE.Line, THREE.Line, THREE.Line];
    planeRectVertices: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
};

/**
 * PlaneRectangle is a tuple type representing the four corners of a rectangle on the selection plane, 
 * defined as an array of four THREE.Vector3 points in the order: [bottom-left, bottom-right, top-right, top-left].
 */
type PlaneRectangle = [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];

/**
 * DragState encapsulates the state of an ongoing drag operation, including:
 * - `startPoint`: The initial point in world coordinates where the drag started.
 * - `initialPositions`: A map of the initially selected objects to their positions at the start of the drag, used to calculate new positions during dragging.
 */
type DragState = {
    startPoint: THREE.Vector3;
    initialPositions: Map<THREE.Object3D, THREE.Vector3>;
};

/**
 * PendingClearState encapsulates the state when a potential selection clear is pending, including:
 * - `startX`: The X coordinate of the mouse when the potential clear was initiated.
 * - `startY`: The Y coordinate of the mouse when the potential clear was initiated.
 * This is used to determine if a click should clear the selection or if it was part of a drag operation.
 */
type PendingClearState = {
    startX: number;
    startY: number;
};

/**
 * OVERLAY_FLAG is a unique key used in the userData of THREE.js objects to mark them as part of the selection visuals overlay, 
 * allowing the selection logic to ignore them when picking objects in the scene.
 */
const OVERLAY_FLAG = '__selectModeOverlay';
/**
 * CLICK_MOVE_TOLERANCE_PX defines the maximum distance in pixels 
 * that the mouse can move between mousedown and mouseup events for it 
 * to be considered a click that should clear the selection, rather than part of a drag operation.
 */
const CLICK_MOVE_TOLERANCE_PX = 4;

/**
 * SelectMode implements the DrawControlsMode interface to provide selection and dragging functionality for objects in a THREE.js scene.
 * It allows users to click to select objects, shift-click to add/remove from selection, and drag selected objects to move them.
 * It also provides visual feedback for selected objects using a single combined bounding box and rectangle on the selection plane.
 */
export class SelectMode implements DrawControlsMode {
    public readonly mode = SELECT_MODE;

    /**
     * An object containing event handlers for selection changes and drag events.
     */
    private _handlers: SelectModeHandlers;
    /**
     * A Set of currently selected THREE.Object3D instances in the scene.
     */
    private _selected = new Set<THREE.Object3D>();
    /**
     * The combined selection visuals for all selected objects, or null if nothing is selected.
     */
    private _visuals: SelectionVisuals | null = null;
    /**
     * The current state of an ongoing drag operation, or null if no drag is in progress.
     */
    private _dragState: DragState | null = null;
    /**
     * Configuration for the colors and sizes of the selection visuals, 
     * which can be customized through the SelectModeOptions when creating an instance of SelectMode.
     */
    private _boundingBoxColor: THREE.ColorRepresentation;
    /**
     * Configuration for the colors and sizes of the selection visuals, 
     * which can be customized through the SelectModeOptions when creating an instance of SelectMode.
     */
    private _rectangleColor: THREE.ColorRepresentation;
    /**
     * Configuration for the colors and sizes of the selection visuals,
     * which can be customized through the SelectModeOptions when creating an instance of SelectMode.
     */
    private _rectangleVertexRadius: number;
    /**
     * Configuration for the colors and sizes of the selection visuals,
     * which can be customized through the SelectModeOptions when creating an instance of SelectMode.
     */
    private _rectangleFillColor: THREE.ColorRepresentation;
    /**
     * The state when a potential selection clear is pending, 
     * which occurs when the user clicks on empty space while having a selection.
     */
    private _pendingClear: PendingClearState | null = null;

    /**
     * Creates an instance of SelectMode with the provided options, 
     * allowing customization of event handlers and visual appearance for selection.
     * @param options - An object containing configuration options for the SelectMode, including event handlers and visual settings.
     */
    constructor(options: SelectModeOptions = {}) {
        this._handlers = options.handlers ?? {};
        this._boundingBoxColor = options.boundingBoxColor ?? 0xff6b00;
        this._rectangleColor = options.rectangleColor ?? 0xff6b00;
        this._rectangleVertexRadius = options.rectangleVertexRadius ?? 0.05;
        this._rectangleFillColor = options.rectangleFillColor ?? 0xffa64d;
    }

    /**
     * Updates the event handlers for the SelectMode, 
     * allowing dynamic changes to how selection changes and drag events are handled after the mode has been created.
     * @param handlers - An object containing the new event handlers for selection changes and drag events.
     */
    public setHandlers(handlers: SelectModeHandlers): void {
        this._handlers = handlers;
    }

    /**
     * Handles the mousedown event to manage selection and initiate dragging of objects in the scene.
     * - If the left mouse button is clicked, it checks if the Shift key is held for multi-selection.
     * - It performs a raycast to determine if a selectable object was clicked on.
     * @param event - The mouse event containing the screen coordinates of the mouse pointer.
     * @param controls - The instance of DrawControls that is managing the drawing operation.
     */
    public onMouseDown(event: MouseEvent, controls: DrawControls): void {
        if (event.button !== 0) return;
        this._pendingClear = null;

        // Check if Shift key is held for multi-selection
        const isShift = event.shiftKey;
        // Perform raycast to find the topmost selectable object under the mouse pointer
        const hitObject = this._pickSelectableObject(event, controls);

        // If Shift is held, toggle the selection of the hit object without affecting other selected objects
        if (isShift) {
            if (hitObject) {
                this._toggleSelection(hitObject, controls, event);
            }
            return;
        }

        // If Shift is not held, select the hit object and prepare for dragging, or clear selection if empty space was clicked
        if (hitObject) {
            if (!this._selected.has(hitObject)) {
                this._setSelection([hitObject], controls, event, 'replace');
            }
            if (this._tryStartDrag(event, controls)) {
                controls.controls.enabled = false;
            }
            return;
        }

        // If no object was hit, and there is an existing selection,
        //  prepare to clear the selection on mouseup if it turns out to be a click rather than a drag
        if (this._tryStartDrag(event, controls)) {
            controls.controls.enabled = false;
            return;
        }

        // If we have a selection and the user clicked on empty space, we set a pending clear state.
        if (this._selected.size > 0) {
            this._pendingClear = {
                startX: event.clientX,
                startY: event.clientY,
            };
        }
    }

    /**
     * Handles the mousemove event to update the positions of selected objects during a drag operation,
     * and to determine if a pending selection clear should be canceled if the mouse moves too much.
     * @param event - The mouse event containing the screen coordinates of the mouse pointer.
     * @param controls - The instance of DrawControls that is managing the drawing operation.
     */
    public onMouseMove(event: MouseEvent, controls: DrawControls): void {
        // If there is a pending clear (the user clicked on empty space while having a selection), 
        // check if the mouse has moved beyond the tolerance threshold to cancel the pending clear
        if (this._pendingClear) {
            const moved = this._getPointerMoveDistance(event, this._pendingClear);
            if (moved > CLICK_MOVE_TOLERANCE_PX) {
                this._pendingClear = null;
            }
        }

        // If we are currently dragging selected objects, update their positions based on the mouse movement
        if (!this._dragState) return;
        const point = controls.getIntersectionPoint(event);
        if (!point) return;

        // Calculate the movement delta from the drag start point to the current point, 
        // and apply that delta to all initially selected objects to update their positions
        const delta = point.clone().sub(this._dragState.startPoint);
        this._dragState.initialPositions.forEach((startPosition, object) => {
            object.position.copy(startPosition).add(delta);
        });
        this._updateSelectionVisuals(controls);

        // Emit the onDrag event with the current selection and movement delta
        this._handlers.onDrag?.({
            selected: this.selected,
            delta,
            sourceEvent: event,
        });
    }

    /**
     * Handles the mouseup event to finalize dragging of selected objects and to clear the selection 
     * if a pending clear was in place and it was a click.
     * @param event - The mouse event containing the screen coordinates of the mouse pointer.
     * @param controls - The instance of DrawControls that is managing the drawing operation.
     */
    public onMouseUp(event: MouseEvent, controls: DrawControls): void {
        if (event.button !== 0) return;

        // If there is a pending clear, check if the mouse movement since mousedown is within the click tolerance to determine 
        // if we should clear the selection
        if (this._pendingClear) {
            const moved = this._getPointerMoveDistance(event, this._pendingClear);
            const shouldClear = moved <= CLICK_MOVE_TOLERANCE_PX;
            this._pendingClear = null;

            // If it was a click (not a drag), clear the selection
            if (shouldClear && this._selected.size > 0) {
                this._setSelection([], controls, event, 'clear');
            }
        }

        if (!this._dragState) return;

        // Calculate the final movement delta for the drag operation and emit the onDragEnd event with the final selection and delta
        const point = controls.getIntersectionPoint(event);
        const delta = point
            ? point.clone().sub(this._dragState.startPoint)
            : new THREE.Vector3();

        this._dragState = null;
        controls.controls.enabled = true;
        // Emit the onDragEnd event with the final selection and movement delta
        this._handlers.onDragEnd?.({
            selected: this.selected,
            delta,
            sourceEvent: event,
        });
    }

    /**
     * Called when the mode is entered, allowing for any necessary setup or initialization.
     */
    public enterMode(): void {
        // no setup needed when entering the mode
    }

    /**
     * Called when the mode is exited, allowing for cleanup of any ongoing operations or visuals related to the mode.
     */
    public exitMode(): void {
        this.dispose();
    }

    /**
     * Cancels any ongoing drag operation and resets the pending clear state,
     */
    public cancel(): void {
        this._dragState = null;
        this._pendingClear = null;
    }

    /**
     * Disposes of the mode by clearing the selection, canceling any ongoing operations, and disposing of any visuals.
     */
    public dispose(): void {
        this.cancel();
        this.clearSelection();
    }

    /**
     * Clears the current selection and disposes of any associated visuals.
     */
    public clearSelection(): void {
        this._pendingClear = null;
        this._selected.clear();
        this._disposeVisuals();
    }

    /**
     * Called every frame from the animation loop to keep selection visuals
     * in sync with the current state of selected objects and the drawing plane.
     * This ensures that external changes to object positions, rotations,
     * or plane rotation are immediately reflected in the visuals.
     */
    public update(controls: DrawControls): void {
        if (this._selected.size === 0) return;
        this._updateSelectionVisuals(controls);
    }

    /**
     * Returns an array of currently selected THREE.Object3D instances in the scene.
     */
    public get selected(): THREE.Object3D[] {
        return [...this._selected];
    }

    /**
     * Sets the current selection to the specified array of objects,
     * updates the selection visuals, 
     * and emits a selection change event with details about the new selection and the reason for the change.
     * @param objects - An array of THREE.Object3D instances to set as the current selection.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to update visuals and perform raycasting.
     * @param sourceEvent - The original mouse event that triggered the selection change.
     * @param reason - The reason for the selection change, used to differentiate between different types of selection updates.
     */
    private _setSelection(
        objects: THREE.Object3D[],
        controls: DrawControls,
        sourceEvent: MouseEvent,
        reason: SelectionChangeReason
    ): void {
        // Create a new Set for the next selection to ensure uniqueness and efficient lookups
        const nextSelection = new Set(objects);
        const previous = this.selected;
        const next = [...nextSelection];

        const added = next.filter((item) => !this._selected.has(item));
        const removed = previous.filter((item) => !nextSelection.has(item));

        this._selected = nextSelection;
        this._syncSelectionVisuals(controls);

        // Emit the selection change event with details about the new selection,
        //  what was added or removed, the reason for the change, and the original mouse event
        this._handlers.onSelectionChange?.({
            selected: next,
            added,
            removed,
            reason,
            sourceEvent,
        });
    }

    /**
     * Toggles the selection state of a single object when Shift-clicking,
     * allowing for multi-selection by adding or removing the object from the current selection without affecting other selected objects.
     * @param object - The THREE.Object3D instance to toggle in the selection.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to update visuals and perform raycasting.
     * @param sourceEvent - The original mouse event that triggered the selection toggle, used to provide context in the selection change event.
     */
    private _toggleSelection(
        object: THREE.Object3D,
        controls: DrawControls,
        sourceEvent: MouseEvent
    ): void {
        // If the object is already selected, we create a new selection array without that object and emit a 'remove' selection change event
        if (this._selected.has(object)) {
            const next = this.selected.filter((item) => item !== object);
            this._setSelection(next, controls, sourceEvent, 'remove');
            return;
        }

        // If the object is not currently selected, we create a new selection array that includes the existing selection plus the new object, and emit an 'add' selection change event
        const next = [...this.selected, object];
        this._setSelection(next, controls, sourceEvent, 'add');
    }

    /**
     * Attempts to start a drag operation if the mouse event intersects with the selection visuals 
     * (either the plane rectangle or the combined bounding box).
     * @param event - The original mouse event that triggered the potential drag operation.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to update visuals and perform raycasting.
     * @returns A boolean indicating whether the drag operation was successfully started.
     */
    private _tryStartDrag(event: MouseEvent, controls: DrawControls): boolean {
        if (this._selected.size === 0) return false;

        // Perform raycasting to check if the mouse event intersects with the selection visuals (plane rectangle or bounding box).
        const ray = controls.getRaycasterFromMouseEvent(event);
        const hitRect = this._hitSelectedPlaneRect(ray);
        const hitSelectedBBox = this._hitSelectedBoundingBox(ray);
        if (!hitRect && !hitSelectedBBox) return false;

        const point = controls.getIntersectionPoint(event);
        if (!point) return false;

        // If the ray intersects with the selection visuals, we prepare to start a drag operation by recording the initial positions of all selected objects and the starting point of the drag.
        const initialPositions = new Map<THREE.Object3D, THREE.Vector3>();
        this._selected.forEach((object) => {
            initialPositions.set(object, object.position.clone());
        });

        this._dragState = {
            startPoint: point,
            initialPositions,
        };

        // Emit the onDragStart event with the initial selection and a zero delta since the drag just started
        this._handlers.onDragStart?.({
            selected: this.selected,
            delta: new THREE.Vector3(),
            sourceEvent: event,
        });

        return true;
    }

    /**
     * Performs raycasting to find the topmost selectable object under the mouse pointer,
     * @param event - The original mouse event containing the screen coordinates of the mouse pointer.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to perform raycasting against the scene's drawing target.
     * @returns The topmost selectable object under the mouse pointer, or null if none is found.
     */
    private _pickSelectableObject(
        event: MouseEvent,
        controls: DrawControls
    ): THREE.Object3D | null {
        // Create a raycaster from the mouse event and perform raycasting 
        // against the children of the drawing target to find intersected objects.
        const raycaster = controls.getRaycasterFromMouseEvent(event);
        const intersections = raycaster.intersectObjects(
            controls.drawingTarget.children,
            true
        );

        // Iterate through the intersected objects to find the topmost selectable object,
        // ignoring any objects that are part of the selection visuals (marked with the OVERLAY_FLAG) 
        // or are helpers like GridHelper or AxesHelper.
        for (const hit of intersections) {
            let current: THREE.Object3D | null = hit.object;
            // Traverse up the object hierarchy to check if any parent is the drawing target,
            while (current && current.parent && current.parent !== controls.drawingTarget) {
                current = current.parent;
            }
            if (!current) continue;
            if (current.userData[OVERLAY_FLAG] === true) continue;
            if (current instanceof THREE.GridHelper || current instanceof THREE.AxesHelper) {
                continue;
            }
            return current;
        }

        return null;
    }

    /**
     * Calculates the distance in pixels that the mouse pointer has moved from the starting point of a potential click or drag operation,
     * which is used to determine whether a mouseup event should be considered a click that clears the selection or part of a drag operation.
     * @param event - The current mouse event containing the screen coordinates of the mouse pointer.
     * @param state - The state of the pending clear operation, containing the starting X and Y coordinates of the mouse when the potential click or drag was initiated.
     * @returns - The distance in pixels that the mouse pointer has moved from the starting point, calculated using the Euclidean distance formula.
     */
    private _getPointerMoveDistance(event: MouseEvent, state: PendingClearState): number {
        return Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    }

    /**
     * Checks if the raycaster intersects with any of the selection plane rectangle visuals (fill, edges, or vertices),
     * which indicates that the user is interacting with the selection plane and should be able to drag the selection.
     * @param raycaster - The THREE.Raycaster instance created from the mouse event, used to perform intersection tests against the selection visuals.
     * @returns - True if the raycaster intersects with any of the selection plane rectangle visuals, false otherwise.
     */
    private _hitSelectedPlaneRect(raycaster: THREE.Raycaster): boolean {
        if (!this._visuals) return false;
        const targets: THREE.Object3D[] = [
            this._visuals.planeRectFill,
            ...this._visuals.planeRectEdges,
            ...this._visuals.planeRectVertices,
        ];
        return raycaster.intersectObjects(targets, false).length > 0;
    }

    /**
     * Checks if the raycaster intersects with the combined bounding box of all selected objects,
     * which allows the user to start dragging the selection by clicking on the bounding box even if they miss the plane rectangle visuals.
     * @param raycaster - The THREE.Raycaster instance created from the mouse event, used to perform intersection tests against the combined bounding box of the selected objects.
     * @returns - True if the raycaster intersects with the combined bounding box of the selected objects, false otherwise.
     */
    private _hitSelectedBoundingBox(raycaster: THREE.Raycaster): boolean {
        const box = this._computeCombinedBox();
        if (box.isEmpty()) return false;
        return raycaster.ray.intersectsBox(box);
    }

    /**
     * Computes a single combined bounding box that encompasses all currently selected objects in the scene,
     * which is used for both visual feedback (the Box3Helper) and for hit testing when starting a drag operation.
     * @returns - A THREE.Box3 instance that represents the combined bounding box of all selected objects, or an empty box if there are no selected objects.
     */
    private _computeCombinedBox(): THREE.Box3 {
        const combined = new THREE.Box3();
        this._selected.forEach((object) => {
            combined.expandByObject(object);
        });
        return combined;
    }

    /**
     * Computes the corners of the rectangle on the selection plane that corresponds to the combined bounding box of the selected objects,
     * which is used for the plane rectangle visuals to provide feedback on the selection area.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to get the current plane for the selection visuals.
     */
    private _syncSelectionVisuals(controls: DrawControls): void {
        this._disposeVisuals();

        if (this._selected.size === 0) return;

        // Compute the combined bounding box of all selected objects to determine the area 
        // that the selection visuals should encompass.
        const box = this._computeCombinedBox();
        const boxHelper = new THREE.Box3Helper(box, this._boundingBoxColor);
        boxHelper.userData[OVERLAY_FLAG] = true;

        // Compute the corners of the rectangle on the selection plane based on the combined bounding box, 
        // and create the corresponding visuals (fill, edges, vertices) to represent the selection area on the plane.
        const rectCorners = this._computePlaneRect(box, controls);
        const planeRectFill = this._createPlaneRectFill(rectCorners);
        planeRectFill.userData[OVERLAY_FLAG] = true;

        // Create the edges and vertices for the plane rectangle visuals, 
        // and mark them with the OVERLAY_FLAG to exclude them from selection raycasting.
        const planeRectEdges = this._createPlaneRectEdges(rectCorners);
        planeRectEdges.forEach((edge) => {
            edge.userData[OVERLAY_FLAG] = true;
        });

        // Create the vertex visuals for the corners of the plane rectangle 
        // and mark them with the OVERLAY_FLAG to exclude them from selection raycasting.
        const planeRectVertices = this._createPlaneRectVertices(rectCorners);
        planeRectVertices.forEach((vertex) => {
            vertex.userData[OVERLAY_FLAG] = true;
        });

        // Add all the selection visuals to the drawing target so they are rendered in the scene,
        controls.drawingTarget.add(boxHelper);
        controls.drawingTarget.add(planeRectFill);
        planeRectEdges.forEach((edge) => {
            controls.drawingTarget.add(edge);
        });
        planeRectVertices.forEach((vertex) => {
            controls.drawingTarget.add(vertex);
        });

        // Store references to the selection visuals for later updates and disposal when the selection changes or is cleared.
        this._visuals = { boxHelper, planeRectFill, planeRectEdges, planeRectVertices };
    }

    /**
     * Updates the positions and sizes of the selection visuals (combined bounding box and plane rectangle) to reflect any changes in the selected objects or the drawing plane,
     * ensuring that the visuals remain accurate and aligned with the current state of the selection and the plane.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to get the current plane for the selection visuals and to perform raycasting if needed.
     */
    private _updateSelectionVisuals(controls: DrawControls): void {
        if (!this._visuals) return;

        // Update the combined bounding box visual to match the current combined bounding box of the selected objects.
        const box = this._computeCombinedBox();
        this._visuals.boxHelper.box.copy(box);

        // Recompute the corners of the rectangle on the selection plane based on the updated combined bounding box,
        // and update the positions of the plane rectangle fill, edges, and vertices to match the new corners.
        const corners = this._computePlaneRect(box, controls);
        const fillPosition = this._visuals.planeRectFill.geometry
            .attributes.position as THREE.BufferAttribute;
        corners.forEach((point, index) => {
            fillPosition.setXYZ(index, point.x, point.y, point.z);
            this._visuals!.planeRectVertices[index].position.copy(point);
        });
        fillPosition.needsUpdate = true;
        this._visuals.planeRectFill.geometry.computeBoundingSphere();

        // Update the positions of the edges of the plane rectangle to match the new corners.
        this._updatePlaneRectEdges(this._visuals.planeRectEdges, corners);
    }

    /**
     * Creates a Mesh that fills the rectangle on the selection plane based on the provided corners,
     * which provides visual feedback for the area of the selection on the plane.
     * @param corners - An array of four THREE.Vector3 points representing the corners of the rectangle on the selection plane, in the order: [bottom-left, bottom-right, top-right, top-left].
     * @returns - A THREE.Mesh instance that fills the rectangle defined by the corners, using a transparent material with the configured rectangle fill color.
     */
    private _createPlaneRectFill(corners: PlaneRectangle): THREE.Mesh {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(corners.flatMap((corner) => [corner.x, corner.y, corner.z]));
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        geometry.computeBoundingSphere();

        return new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
                color: this._rectangleFillColor,
                transparent: true,
                // Set a low opacity for the fill to allow the underlying objects to be visible 
                // while still providing feedback on the selection area.
                opacity: 0.18,
                depthWrite: false,
                side: THREE.DoubleSide,
            })
        );
    }

    /**
     * Creates an array of Line objects that represent the edges of the rectangle on the selection plane based on the provided corners,
     * which provides visual feedback for the boundaries of the selection area on the plane.
     * @param corners - An array of four THREE.Vector3 points representing the corners of the rectangle on the selection plane, in the order: [bottom-left, bottom-right, top-right, top-left].
     * @returns - An array of four THREE.Line instances that represent the edges of the rectangle defined by the corners, using a dashed line material with the configured rectangle color.
     */
    private _createPlaneRectEdges(
        corners: PlaneRectangle
    ): [THREE.Line, THREE.Line, THREE.Line, THREE.Line] {
        return [
            this._createPlaneRectEdge(corners[0], corners[1]),
            this._createPlaneRectEdge(corners[1], corners[2]),
            this._createPlaneRectEdge(corners[2], corners[3]),
            this._createPlaneRectEdge(corners[3], corners[0]),
        ];
    }

    /**
     * Creates a THREE.Line object that represents a single edge of the rectangle on the selection plane between two corners,
     * which is used as part of the visual feedback for the selection area on the plane.
     * @param start - A THREE.Vector3 representing the starting corner of the edge on the selection plane.
     * @param end - A THREE.Vector3 representing the ending corner of the edge on the selection plane.
     * @returns - A THREE.Line instance that represents the edge between the start and end corners.
     */
    private _createPlaneRectEdge(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineDashedMaterial({
            color: this._rectangleColor,
        });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        return line;
    }

    /**
     * Updates the positions of the edges of the rectangle on the selection plane to match the new corners,
     * which is called when the selection visuals need to be updated due to changes in the selected objects or the plane.
     * @param edges - An array of four THREE.Line instances that represent the edges of the rectangle on the selection plane, which will be updated to match the new corners.
     * @param corners - An array of four THREE.Vector3 points representing the new corners of the rectangle on the selection plane, in the order: [bottom-left, bottom-right, top-right, top-left].
     */
    private _updatePlaneRectEdges(
        edges: [THREE.Line, THREE.Line, THREE.Line, THREE.Line],
        corners: PlaneRectangle
    ): void {
        const segments: Array<[THREE.Vector3, THREE.Vector3]> = [
            [corners[0], corners[1]],
            [corners[1], corners[2]],
            [corners[2], corners[3]],
            [corners[3], corners[0]],
        ];

        // Update the positions of each edge to match the new segments defined by the updated corners.
        edges.forEach((edge, index) => {
            const position = edge.geometry.attributes.position;
            position.setXYZ(0, segments[index][0].x, segments[index][0].y, segments[index][0].z);
            position.setXYZ(1, segments[index][1].x, segments[index][1].y, segments[index][1].z);
            position.needsUpdate = true;
            edge.computeLineDistances();
            edge.geometry.computeBoundingSphere();
        });
    }

    /**
     * Creates FOUR THREE.Mesh objects that represent the vertices of the rectangle on the selection plane,
     * which are used as part of the visual feedback for the selection area on the plane.
     * @param corners - An array of four THREE.Vector3 points representing the corners of the rectangle on the selection plane, in the order: [bottom-left, bottom-right, top-right, top-left].
     * @returns - An array of four THREE.Mesh instances that represent the vertices of the rectangle on the selection plane.
     */
    private _createPlaneRectVertices(
        corners: PlaneRectangle
    ): [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh] {
        // A helper function to create a small sphere mesh at the given position to represent a vertex of the rectangle.
        const createVertex = (position: THREE.Vector3): THREE.Mesh => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(this._rectangleVertexRadius, 12, 12),
                new THREE.MeshBasicMaterial({ color: this._rectangleColor })
            );
            mesh.position.copy(position);
            return mesh;
        };

        return [
            createVertex(corners[0]),
            createVertex(corners[1]),
            createVertex(corners[2]),
            createVertex(corners[3]),
        ];
    }

    /**
     * Computes the corners of the rectangle on the selection plane that corresponds to the combined bounding box of the selected objects,
     * by projecting the corners of the bounding box onto the plane defined by the current plane rotation in the DrawControls.
     * @param box - A THREE.Box3 instance representing the combined bounding box of the selected objects, which will be used to compute the corresponding rectangle on the selection plane.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to get the current plane rotation and compute the plane frame for projecting the bounding box corners.
     * @returns - An array of four THREE.Vector3 points representing the corners of the rectangle on the selection plane, in the order: [bottom-left, bottom-right, top-right, top-left].
     */
    private _computePlaneRect(
        box: THREE.Box3,
        controls: DrawControls
    ): PlaneRectangle {
        // Get the orthonormal frame of the selection plane based on the current plane rotation in the DrawControls, 
        // which provides the normal (n) and the two tangent vectors (u and v) that define the plane.
        const frame = this._getPlaneFrame(controls);
        const corners = this._boxCorners(box);

        // Project the corners of the bounding box onto the plane defined by the frame
        let minU = Number.POSITIVE_INFINITY;
        let maxU = Number.NEGATIVE_INFINITY;
        let minV = Number.POSITIVE_INFINITY;
        let maxV = Number.NEGATIVE_INFINITY;

        corners.forEach((corner) => {
            const u = corner.dot(frame.u);
            const v = corner.dot(frame.v);
            minU = Math.min(minU, u);
            maxU = Math.max(maxU, u);
            minV = Math.min(minV, v);
            maxV = Math.max(maxV, v);
        });

        // A helper function to convert the (u, v) coordinates on the plane back to world coordinates using the frame
        const toPlanePoint = (u: number, v: number): THREE.Vector3 =>
            frame.u
                .clone()
                .multiplyScalar(u)
                .add(frame.v.clone().multiplyScalar(v))
                .add(frame.n.clone().multiplyScalar(0.001));

        return [
            toPlanePoint(minU, minV),
            toPlanePoint(maxU, minV),
            toPlanePoint(maxU, maxV),
            toPlanePoint(minU, maxV),
        ];
    }

    /**
     * Computes the orthonormal frame of the selection plane based on the current plane rotation in the DrawControls,
     * which consists of the normal vector (n) and two tangent vectors (u and v) that define the orientation of the plane in 3D space.
     * @param controls - The instance of DrawControls that is managing the drawing operation, used to get the current plane rotation and compute the frame vectors.
     * @returns - An object containing the normal vector (n) and the two tangent vectors (u and v) that define the orthonormal frame of the selection plane.
     */
    private _getPlaneFrame(controls: DrawControls): {
        n: THREE.Vector3;
        u: THREE.Vector3;
        v: THREE.Vector3;
    } {
        const n = controls.camera.up.clone().applyEuler(controls.planeRotation).normalize();
        // To compute the tangent vectors (u and v) for the plane, 
        // we choose an arbitrary reference vector that is not parallel to the normal (n) 
        // and use it to compute the cross products to get the orthonormal basis for the plane.
        const reference = Math.abs(n.y) < 0.98
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0);
        const u = reference.clone().cross(n).normalize();
        const v = n.clone().cross(u).normalize();

        return { n, u, v };
    }

    /**
     * Returns the eight corners of a THREE.Box3 as an array of THREE.Vector3 points, 
     * which is used to compute the rectangle on the selection plane that corresponds to the bounding box of the selected objects.
     * @param box - The THREE.Box3 instance representing the bounding box of the selected objects.
     * @returns An array of THREE.Vector3 points representing the eight corners of the bounding box.
     */
    private _boxCorners(box: THREE.Box3): THREE.Vector3[] {
        return [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        ];
    }

    /**
     * Disposes of all the selection visuals (combined bounding box, plane rectangle fill, edges, and vertices) 
     * by removing them from the scene and disposing of their geometries and materials,
     * which is called when the selection changes or is cleared to ensure that old visuals are properly cleaned up and do not cause memory leaks.
     */
    private _disposeVisuals(): void {
        if (!this._visuals) return;
        const v = this._visuals;
        // Remove all the selection visuals from their parent in the scene to stop rendering them.
        v.boxHelper.parent?.remove(v.boxHelper);
        v.planeRectFill.parent?.remove(v.planeRectFill);
        v.planeRectEdges.forEach((edge) => {
            edge.parent?.remove(edge);
        });
        v.planeRectVertices.forEach((vertex) => {
            vertex.parent?.remove(vertex);
        });
        // Dispose of the geometries and materials of all the selection visuals to free up memory and resources.
        v.boxHelper.dispose();
        v.planeRectFill.geometry.dispose();
        (v.planeRectFill.material as THREE.Material).dispose();
        v.planeRectEdges.forEach((edge) => {
            edge.geometry.dispose();
            (edge.material as THREE.Material).dispose();
        });
        v.planeRectVertices.forEach((vertex) => {
            vertex.geometry.dispose();
            (vertex.material as THREE.Material).dispose();
        });
        this._visuals = null;
    }
}
