import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { ExplosionEngine } from './ExplosionEngine.js';
import { MaterialManager } from './MaterialManager.js';

// --- Inicialização ---
const engine = new ExplosionEngine();
const matManager = new MaterialManager();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let gridHelper = new THREE.GridHelper(10, 10, 0xbbbbbb, 0xdddddd);
scene.add(gridHelper);

// --- Luzes ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
light1.position.set(5, 10, 5);
scene.add(light1);

// --- GUI e Estado ---
let currentModel = null;
let selectedMesh = null;
const gui = new GUI({ title: 'Wandi Studio - Controles' });

const state = {
    partName: '',
    preset: 'Padrão',
    color: '#ffffff',
    metalness: 0.5,
    roughness: 0.5,
    opacity: 1.0,
    wireframe: false,
    explosion: 0,
    resetView: () => {
        if (currentModel) resetCamera(engine.metadata.size, engine.metadata.maxDim);
    }
};

const partsFolder = gui.addFolder('Hierarquia');
const matFolder = gui.addFolder('Engenharia de Material');
const viewFolder = gui.addFolder('Visualização');

viewFolder.add(state, 'explosion', 0, 1).name('Explosão Técnica').onChange(v => engine.apply(v));
viewFolder.add(state, 'resetView').name('Centralizar Câmera');

function selectPart(mesh) {
    if (selectedMesh) selectedMesh.material.emissive?.setHex(0x000000);
    if (!mesh) { matFolder.hide(); return; }

    selectedMesh = mesh;
    // Sincronizar estado com a peça
    state.partName = mesh.name;
    state.color = '#' + mesh.material.color.getHexString();
    state.metalness = mesh.material.metalness || 0;
    state.roughness = mesh.material.roughness || 0;
    state.opacity = mesh.material.opacity ?? 1;
    state.wireframe = mesh.material.wireframe || false;

    if (selectedMesh.material.emissive) selectedMesh.material.emissive.setHex(0x222222);

    updateMaterialGUI();
    matFolder.show();
}

function updateMaterialGUI() {
    matFolder.children.forEach(c => c.destroy());
    
    matFolder.add(state, 'partName').name('ID').disable();
    
    matFolder.add(state, 'preset', Object.keys(matManager.presets)).name('Preset').onChange(v => {
        const p = matManager.presets[v];
        Object.assign(state, p);
        matManager.applyToMesh(selectedMesh, state);
    });

    matFolder.addColor(state, 'color').name('Cor').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'metalness', 0, 1).name('Metal').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'roughness', 0, 1).name('Rugosidade').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'opacity', 0, 1).name('Opacidade (Ghost)').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'wireframe').name('Wireframe').onChange(() => matManager.applyToMesh(selectedMesh, state));
}

// --- Funções de Câmera e Carga ---
function loadModel(url) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
        if (currentModel) scene.remove(currentModel);
        currentModel = gltf.scene;

        const meta = engine.analyzeModel(currentModel);
        
        // Alinhamento Original
        currentModel.position.x -= meta.center.x;
        currentModel.position.y -= (meta.center.y - meta.size.y / 2);
        currentModel.position.z -= meta.center.z;

        scene.add(currentModel);

        // Reset Grid
        scene.remove(gridHelper);
        gridHelper = new THREE.GridHelper(meta.maxDim * 4, 20, 0xbbbbbb, 0xdddddd);
        scene.add(gridHelper);

        // Update UI
        partsFolder.children.forEach(c => c.destroy());
        partsFolder.add(state, 'partName', engine.getMeshNames()).name('Peça').onChange(n => {
            currentModel.traverse(m => { if(m.name === n) selectPart(m); });
        });

        resetCamera(meta.size, meta.maxDim);
    });
}

function resetCamera(size, maxDim) {
    if (!currentModel) return;
    const fov = camera.fov * (Math.PI / 180);
    let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5;
    camera.position.set(dist, dist, dist);
    const targetY = size ? size.y * 0.4 : 0;
    camera.lookAt(0, targetY, 0);
    controls.target.set(0, targetY, 0);
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

document.getElementById('export-btn').addEventListener('click', () => {
    if (currentModel) matManager.exportConfig(currentModel);
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