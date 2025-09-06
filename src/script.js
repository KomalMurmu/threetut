// Orbit Visualizer with Spinning Earth and Orbit Paths
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Earth
const earthGeometry = new THREE.SphereGeometry(5, 32, 32);
const earthTexture = new THREE.TextureLoader().load('earth.7b6c6755.jpg'); // Make sure earth.jpg is in your public/assets folder or correct path
const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 20 });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);
earth.rotation.z = 0.41; // Tilt for realism


// Lighting
const light = new THREE.PointLight(0xffffff, 200); // Increased intensity
light.position.set(0, 0, 20); // In front of the earth
scene.add(light);
const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

// Light helper
const lightHelper = new THREE.PointLightHelper(light, 1);
scene.add(lightHelper);



camera.position.z = 20;

// Satellite logic
let satellites = [];

function createSatellite(params) {
  const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: params.color })
  );
  scene.add(satellite);

  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(generateOrbitPath(params)),
    new THREE.LineBasicMaterial({ color: params.color })
  );
  scene.add(orbit);

  return { mesh: satellite, orbit, ...params };
}

function generateOrbitPath(params) {
  const points = [];
  const a = params.semiMajorAxis;
  const e = params.eccentricity;
  const i = THREE.MathUtils.degToRad(params.inclination);
  const raan = THREE.MathUtils.degToRad(params.raan);
  const argPeri = THREE.MathUtils.degToRad(params.argPeriapsis);

  for (let theta = 0; theta <= 2 * Math.PI; theta += 0.05) {
    const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = 0;

    const pos = new THREE.Vector3(x, y, z);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), i);
    pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), argPeri);
    points.push(pos);
  }
  return points;
}

// GUI
const gui = new GUI();
const controlParams = {
  name: 'Satellite 1',
  semiMajorAxis: 10,
  eccentricity: 0,
  inclination: 0,
  raan: 0,
  argPeriapsis: 0,
  trueAnomaly: 0,
  speed: 0.01,
  color: '#ff0000',
  addSatellite: () => {
    const sat = createSatellite({
      name: controlParams.name,
      semiMajorAxis: controlParams.semiMajorAxis,
      eccentricity: controlParams.eccentricity,
      inclination: controlParams.inclination,
      raan: controlParams.raan,
      argPeriapsis: controlParams.argPeriapsis,
      trueAnomaly: controlParams.trueAnomaly,
      speed: controlParams.speed,
      color: controlParams.color
    });
    satellites.push(sat);
    addSatelliteFolder(sat);
  }
};

const controlFolder = gui.addFolder('Controls');
controlFolder.add(controlParams, 'name');
controlFolder.add(controlParams, 'semiMajorAxis', 1, 50);
controlFolder.add(controlParams, 'eccentricity', 0, 1);
controlFolder.add(controlParams, 'inclination', 0, 180);
controlFolder.add(controlParams, 'raan', 0, 360);
controlFolder.add(controlParams, 'argPeriapsis', 0, 360);
controlFolder.add(controlParams, 'trueAnomaly', 0, 360);
controlFolder.add(controlParams, 'speed', 0.001, 0.1);
controlFolder.addColor(controlParams, 'color');
controlFolder.add(controlParams, 'addSatellite');

function addSatelliteFolder(sat) {
  const folder = gui.addFolder(sat.name);
  folder.add(sat, 'semiMajorAxis', 1, 50).onChange(() => updateOrbit(sat));
  folder.add(sat, 'eccentricity', 0, 1).onChange(() => updateOrbit(sat));
  folder.add(sat, 'inclination', 0, 180).onChange(() => updateOrbit(sat));
  folder.add(sat, 'raan', 0, 360).onChange(() => updateOrbit(sat));
  folder.add(sat, 'argPeriapsis', 0, 360).onChange(() => updateOrbit(sat));
  folder.add(sat, 'trueAnomaly', 0, 360);
  folder.add(sat, 'speed', 0.001, 0.1);
  folder.addColor(sat, 'color').onChange(val => {
    sat.mesh.material.color.set(val);
    sat.orbit.material.color.set(val);
  });
  folder.add({ delete: () => deleteSatellite(sat, folder) }, 'delete').name('Delete Satellite');
}

function updateOrbit(sat) {
  scene.remove(sat.orbit);
  const newOrbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(generateOrbitPath(sat)),
    new THREE.LineBasicMaterial({ color: sat.color })
  );
  scene.add(newOrbit);
  sat.orbit = newOrbit;
}

function deleteSatellite(sat, folder) {
  scene.remove(sat.mesh);
  scene.remove(sat.orbit);
  folder.destroy();
  satellites = satellites.filter(s => s !== sat);
}

// Animation
function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.002;
  satellites.forEach(sat => {
    sat.trueAnomaly += sat.speed;
    const theta = THREE.MathUtils.degToRad(sat.trueAnomaly);
    const a = sat.semiMajorAxis;
    const e = sat.eccentricity;
    const i = THREE.MathUtils.degToRad(sat.inclination);
    const raan = THREE.MathUtils.degToRad(sat.raan);
    const argPeri = THREE.MathUtils.degToRad(sat.argPeriapsis);

    const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = 0;

    const pos = new THREE.Vector3(x, y, z);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), i);
    pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), argPeri);

    sat.mesh.position.copy(pos);
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();
