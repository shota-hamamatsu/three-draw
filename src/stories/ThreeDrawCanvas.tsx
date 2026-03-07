import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { DrawControls, type DrawControlsModes } from '../controls/DrawControls';
import GUI from 'lil-gui';

export interface ThreeDrawCanvasProps {
  canvasStyle?: React.CSSProperties;
  /** optional drawing modes to register with the controls */
  modes?: DrawControlsModes<string>;
  /** the mode that should be active when the canvas is initialized */
  initialMode?: string | null;
  initialCameraPosition?: THREE.Vector3;
}

export const ThreeDrawCanvas: React.FC<ThreeDrawCanvasProps> = ({
  canvasStyle: _canvasStyle,
  modes,
  initialMode = null,
  initialCameraPosition = new THREE.Vector3(0, 5, 5),
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<DrawControls | null>(null);
  const [scene] = useState(new THREE.Scene());
  const [camera] = useState(() => {
    const cam = new THREE.PerspectiveCamera();
    cam.position.copy(initialCameraPosition);
    return cam;
  });
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axisHelperRef = useRef<THREE.AxesHelper | null>(null);
  const lightRef = useRef<THREE.AmbientLight | null>(null);

  /**
   * canvas styles with defaults
   */
  const canvasStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      ..._canvasStyle,
    }),
    [_canvasStyle]
  );

  // setup
  useEffect(() => {
    if (!canvasRef.current) return;
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      context: canvasRef.current.getContext('webgl2') ?? undefined,
      antialias: true,
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    // Controls setup
    const controls = new DrawControls({
      modes: modes ?? {},
      camera,
      domElement: renderer.domElement,
      drawingTarget: scene,
    });

    // if an initial mode was provided, activate it right away
    if (initialMode !== null) {
      controls.setCurrentMode(initialMode);
    }
    controlsRef.current = controls;

    // Handle window resize
    const handleResize = (): void => {
      if (!canvasRef.current || !rendererRef.current) {
        return;
      }
      const newWidth = canvasRef.current.clientWidth;
      const newHeight = canvasRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight, false);
    };

    // set initial size in case container already has dimensions
    handleResize();

    window.addEventListener('resize', handleResize);

    // Cleanup
    return (): void => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [modes, initialMode]);

  // scene setup (helpers, lighting, etc.)
  useEffect(() => {
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    const gridHelper = new THREE.GridHelper(10, 10);
    const axisHelper = new THREE.AxesHelper(10);
    lightRef.current = light;
    gridHelperRef.current = gridHelper;
    axisHelperRef.current = axisHelper;
    scene.add(light, gridHelper, axisHelper);

    return () => {
      lightRef.current = null;
      gridHelperRef.current = null;
      axisHelperRef.current = null;
      scene.remove(light, gridHelper, axisHelper);
      light.dispose();
      gridHelper.geometry.dispose();
      axisHelper.geometry.dispose();
    };
  }, []);

  // GUI setup
  useEffect(() => {
    if (!controlsRef.current || !gridHelperRef.current || !axisHelperRef.current) return;
    const gui = new GUI();

    const modesFolder = gui.addFolder('Modes');
    // Create a proxy object for mode control to avoid readonly issues
    const modeControl = { mode: controlsRef.current.currentMode || '' };
    modesFolder
      .add(modeControl, 'mode', [null, ...Object.keys(controlsRef.current.modes)])
      .name('Active Mode')
      .onChange((value: string) => {
        controlsRef.current?.setCurrentMode(value || null);
      })
      .listen();

    const controlsFolder = gui.addFolder('Controls');
    const controlsControl = { planeRotation: controlsRef.current.planeRotation };
    controlsFolder
      .add(controlsControl.planeRotation, 'x', -Math.PI, Math.PI, 0.1)
      .name('Plane Rotation X').onChange((value: number) => {
        const newEuler = new THREE.Euler(value, controlsControl.planeRotation.y, controlsControl.planeRotation.z);
        controlsRef.current?.setPlaneRotation(newEuler);
        gridHelperRef.current?.setRotationFromEuler(newEuler);
      })
      .listen();
    controlsFolder
      .add(controlsControl.planeRotation, 'y', -Math.PI, Math.PI, 0.1)
      .name('Plane Rotation Y').onChange((value: number) => {
        const newEuler = new THREE.Euler(controlsControl.planeRotation.x, value, controlsControl.planeRotation.z);
        controlsRef.current?.setPlaneRotation(newEuler);
        gridHelperRef.current?.setRotationFromEuler(newEuler);
      })
      .listen();
    controlsFolder
      .add(controlsControl.planeRotation, 'z', -Math.PI, Math.PI, 0.1)
      .name('Plane Rotation Z').onChange((value: number) => {
        const newEuler = new THREE.Euler(controlsControl.planeRotation.x, controlsControl.planeRotation.y, value);
        controlsRef.current?.setPlaneRotation(newEuler);
        gridHelperRef.current?.setRotationFromEuler(newEuler);
      })
      .listen();

    const helpersFolder = gui.addFolder('Helpers').close();
    helpersFolder
      .add(gridHelperRef.current, 'visible')
      .name('Grid Helper')
      .listen();
    helpersFolder
      .add(axisHelperRef.current, 'visible')
      .name('Axes Helper')
      .listen();
  }, []);

  return <canvas ref={canvasRef} style={canvasStyle} />;
};
