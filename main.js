import * as THREE from "three";

import spline from "./spline";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const width = window.innerWidth;
const height = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.4);
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 4, 1, 0.02);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const wormholeGeometry = new THREE.TubeGeometry(spline, 270, 0.85, 18, true);
const wireframe = new THREE.WireframeGeometry(wormholeGeometry);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xab58ff });
const tubeLines = new THREE.LineSegments(wireframe, lineMaterial);
scene.add(tubeLines);

const updateCamera = (t) => {
  const startOffset = 0.05;
  const looptime = 13000;
  const lookAhead = 0.02;
  const progress = ((t * 0.25) % looptime) / looptime + startOffset;
  const cameraProgress = progress % 1;
  const lookAtProgress = (progress + lookAhead) % 1;
  const cameraPosition = wormholeGeometry.parameters.path.getPointAt(cameraProgress);
  const lookAt = wormholeGeometry.parameters.path.getPointAt(lookAtProgress);
  camera.position.copy(cameraPosition);
  camera.lookAt(lookAt);
};

const animate = (t = 0) => {
  requestAnimationFrame(animate);
  updateCamera(t);
  composer.render(scene, camera);
}
animate();
