import * as THREE from "three";
import spline from "./spline";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const loader = new THREE.TextureLoader();
const wormImg = loader.load('./wormrings.png');
wormImg.wrapS = THREE.RepeatWrapping;
wormImg.wrapT = THREE.ClampToEdgeWrapping;

let paused = false;
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


/* 
worm to do:
  make sure to respawn the worms as you go back through the tunnel on repeat
  have them appear slightly sooner and fade in
  set min distance between worms
*/


// Worms
const totalWorms = 80;
const wormRadius = 0.03;
const wormLength = 0.7;
const wormSegments = 80;
const randomOffset = scale => (Math.random() - 0.5) * scale;

// Track last placed worm position to ensure a minimum distance between worms
let lastWormPos = null;
const minDistanceBetweenWorms = 1.8;
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

for (let i = 0; i < totalWorms; i++) {
  const wormShape = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -wormLength / 2),
    new THREE.Vector3(0.05 + randomOffset(0.05), 0.05 + randomOffset(0.05), -wormLength / 6),
    new THREE.Vector3(-0.05 + randomOffset(0.05), 0.05 + randomOffset(0.05), wormLength / 6),
    new THREE.Vector3(0, 0, wormLength / 2)
  ]);

  const wormGeometry = new THREE.TubeGeometry(wormShape, wormSegments, wormRadius, 36, false);
  const p = (i / totalWorms + Math.random() * 0.05) % 1;
  const center = wormholeGeometry.parameters.path.getPointAt(p);
  const tangent = wormholeGeometry.parameters.path.getTangentAt(p).normalize();

  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(tangent.dot(up)) > 0.9) up.set(1, 0, 0); // avoid parallel

  const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const side = new THREE.Vector3().crossVectors(normal, tangent).normalize();

  // distance from the center of the wormhole
  const radialOffset = 0.35 + Math.random() * 0.1;
  const angle = Math.random() * Math.PI * 2;

  const offset = new THREE.Vector3()
    .addScaledVector(normal, Math.cos(angle) * radialOffset)
    .addScaledVector(side, Math.sin(angle) * radialOffset);

  const wormPos = new THREE.Vector3().addVectors(center, offset);
  if (lastWormPos && wormPos.distanceTo(lastWormPos) < minDistanceBetweenWorms) {
    wormPos.addScaledVector(new THREE.Vector3().subVectors(wormPos, lastWormPos).normalize());
  }
  lastWormPos = wormPos;

  // Give each worm a different color
  const hue = Math.floor(Math.random() * 360) / 360;
  const saturation = 0.5 + Math.random() * 0.4;
  const wormColor = new THREE.Color().setHSL(hue, saturation, 0.7);
  const wormMaterial = new THREE.MeshStandardMaterial({
    map: wormImg,
    color: wormColor,
  });
  const worm = new THREE.Mesh(wormGeometry, wormMaterial);

  // Create head and tail
  const headTailGeometry = new THREE.SphereGeometry(wormRadius);
  const createHeadTail = (pos, tangent) => {
    const headTailMaterial = new THREE.MeshStandardMaterial({ color: wormColor });
    const mesh = new THREE.Mesh(headTailGeometry, headTailMaterial);
    mesh.position.copy(pos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent.clone().normalize());
    return mesh;
  }
  const head = createHeadTail(wormShape.getPoint(1), wormShape.getTangent(1));
  const tail = createHeadTail(wormShape.getPoint(0), wormShape.getTangent(0));
  worm.add(head);
  worm.add(tail);
  worm.position.copy(wormPos);
  scene.add(worm);
}

const updateCamera = (t) => {
  const startOffset = 0.05;
  const looptime = 15000;
  const lookAhead = 0.02;
  const progress = ((t * 0.25) % looptime) / looptime + startOffset;
  const cameraProgress = progress % 1;
  const lookAtProgress = (progress + lookAhead) % 1;
  const cameraPosition = wormholeGeometry.parameters.path.getPointAt(cameraProgress);
  const lookAt = wormholeGeometry.parameters.path.getPointAt(lookAtProgress);
  camera.position.copy(cameraPosition);
  camera.lookAt(lookAt);
};

let pauseStart = 0;
let totalPausedTime = 0;
const animate = (t = 0) => {
  requestAnimationFrame(animate);
  if (!paused) {
    const adjustedTime = t - totalPausedTime;
    updateCamera(adjustedTime);
    composer.render(scene, camera);
  }
};
animate();

// Play/pause button
const container = document.querySelector(".pause-container");
const button = document.querySelector(".btn-play-pause");
container.appendChild(renderer.domElement);

button.addEventListener("click", () => {
  if (!paused) {
    pauseStart = performance.now();
    button.innerText = "Play";
  } else {
    totalPausedTime += performance.now() - pauseStart;
    button.innerText = "Pause";
  }
  paused = !paused;
});
