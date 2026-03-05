import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface ThreeDrawCanvasProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
  className?: string;
}

export const ThreeDrawCanvas: React.FC<ThreeDrawCanvasProps> = ({
  width = 800,
  height = 600,
  backgroundColor = '#1a1a1a',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(backgroundColor);
    scene.background = bgColor;
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add a sample geometry
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    // Animation loop
    let animationId: number;
    const animate = (): void => {
      animationId = requestAnimationFrame(animate);

      if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = (): void => {
      const newWidth = containerRef.current?.clientWidth || width;
      const newHeight = containerRef.current?.clientHeight || height;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return (): void => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      containerRef.current?.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [width, height, backgroundColor]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};
