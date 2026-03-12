import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { ExplosionEngine } from './ExplosionEngine.js';

// --- Instâncias e Configuração ---
const engine = new ExplosionEngine();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let gridHelper = new THREE.GridHelper(10, 10, 0xbbbbbb, 0xdddddd);
scene.add(gridHelper);

// --- Iluminação de Estúdio ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const lights = [
    new THREE.DirectionalLight(0xffffff, 1.8),
    new THREE.DirectionalLight(0xffffff, 1.0),
    new THREE.DirectionalLight(0xffffff, 1.2)
];
lights[0].position.set(5, 10, 5);
lights[1].position.set(-5, 2, 5);
lights[2].position.set(0, 5, -10);
lights.forEach(l => scene.add(l));

// --- Interface e Estado ---
let currentModel = null;
let selectedMesh = null;
const gui = new GUI({ title: 'Wandi Studio - Engenharia' });

const state = {
    partName: '',
    color: '#ffffff',
    metalness: 0.5,
    roughness: 0.5,
    explosion: 0,
    resetView: () => {
        if (currentModel) {
            const meta = engine.metadata;
            resetCamera(meta.size, meta.maxDim);
        }
    }
};

const partsFolder = gui.addFolder('Hierarquia');
const matFolder = gui.addFolder('Material PBR');
const viewFolder = gui.addFolder('Visualização');

viewFolder.add(state, 'explosion', 0, 1).name('Explosão Técnica').onChange(v => engine.apply(v));
viewFolder.add(state, 'resetView').name('Centralizar Câmera');

// --- Lógica de Seleção ---
function selectPart(mesh) {
    if (selectedMesh) selectedMesh.material.emissive.setHex(0x000000);
    if (!mesh) { matFolder.hide(); return; }

    selectedMesh = mesh;
    if (selectedMesh.material) selectedMesh.material = selectedMesh.material.clone();
    selectedMesh.material.emissive.setHex(0x222222);

    state.partName = mesh.name;
    state.color = '#' + selectedMesh.material.color.getHexString();
    state.metalness = selectedMesh.material.metalness || 0;
    state.roughness = selectedMesh.material.roughness || 0;

    matFolder.children.forEach(c => c.destroy());
    matFolder.addColor(state, 'color').name('Cor').onChange(v => selectedMesh.material.color.set(v));
    matFolder.add(state, 'metalness', 0, 1).name('Metal').onChange(v => selectedMesh.material.metalness = v);
    matFolder.add(state, 'roughness', 0, 1).name('Rugosidade').onChange(v => selectedMesh.material.roughness = v);
    matFolder.show();
}

// --- Carregamento e Centralização Original ---
const loader = new GLTFLoader();

function loadModel(url) {
    loader.load(url, (gltf) => {
        if (currentModel) {
            scene.remove(currentModel);
            currentModel.traverse(n => { if(n.isMesh) { n.geometry.dispose(); n.material.dispose(); }});
        }

        currentModel = gltf.scene;
        const meta = engine.analyzeModel(currentModel);

        // Posicionar modelo no chão e centro (Lógica Original)
        currentModel.position.x -= meta.center.x;
        currentModel.position.y -= (meta.center.y - meta.size.y / 2); // Alinha base ao grid
        currentModel.position.z -= meta.center.z;

        scene.add(currentModel);

        // Atualizar Grid
        scene.remove(gridHelper);
        gridHelper = new THREE.GridHelper(meta.maxDim * 4, 20, 0xbbbbbb, 0xdddddd);
        scene.add(gridHelper);

        // Atualizar UI
        state.explosion = 0;
        partsFolder.children.forEach(c => c.destroy());
        partsFolder.add(state, 'partName', engine.getMeshNames()).name('Peça').onChange(n => {
            currentModel.traverse(m => { if(m.name === n) selectPart(m); });
        });

        // Chama a lógica de centralização de câmera original
        resetCamera(meta.size, meta.maxDim);
    });
}

/**
 * LÓGICA ORIGINAL DE CÂMERA MANTIDA
 */
function resetCamera(size, maxDim) {
    if (!currentModel) return;
    const fov = camera.fov * (Math.PI / 180);
    let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5;
    camera.position.set(dist, dist, dist);
    
    const targetY = size ? size.y * 0.4 : 0;
    camera.lookAt(0, targetY, 0);
    controls.target.set(0, targetY, 0);
    camera.updateProjectionMatrix();
}

// --- Eventos ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lil-gui') || e.target.closest('#ui-container')) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(currentModel, true);
    selectPart(intersects.length > 0 ? intersects[0].object : null);
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadModel(URL.createObjectURL(file));
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});