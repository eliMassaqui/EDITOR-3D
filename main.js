import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

// Importação dos módulos especializados
import { ExplosionEngine } from './ExplosionEngine.js';
import { MaterialManager } from './MaterialManager.js';
import { EnvironmentManager } from './EnvironmentManager.js';

// --- 1. INSTÂNCIAS E CONFIGURAÇÃO ---
const scene = new THREE.Scene();
const engine = new ExplosionEngine();
const matManager = new MaterialManager();
const envManager = new EnvironmentManager(scene); // Aplica o fundo escuro e Rim Light

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Mantemos sombras desativadas para leveza, focando no contraste de luz
renderer.shadowMap.enabled = false;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Ajuste de ToneMapping para cores vibrantes no escuro
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.4; 
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Grid sutil para não poluir o fundo escuro
let gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
scene.add(gridHelper);

// --- 2. ESTADO E INTERFACE (GUI) ---
let currentModel = null;
let selectedMesh = null;

const gui = new GUI({ title: 'WANDI STUDIO - INSPEÇÃO' });
const state = {
    partName: '',
    preset: 'Padrão',
    color: '#ffffff',
    metalness: 0.5,
    roughness: 0.5,
    opacity: 1.0,
    wireframe: false,
    explosion: 0,
    exposure: 1.4,
    bgColor: '#1a1a1a', // Fundo escuro para realçar detalhes
    resetView: () => {
        if (currentModel) resetCamera(engine.metadata.size, engine.metadata.maxDim);
    }
};

const partsFolder = gui.addFolder('Hierarquia');
const matFolder = gui.addFolder('Material PBR');
const viewFolder = gui.addFolder('Ambiente Técnico');

viewFolder.add(state, 'explosion', 0, 1).name('Explosão').onChange(v => engine.apply(v));
viewFolder.add(state, 'exposure', 0, 3).name('Intensidade Luz').onChange(v => envManager.setExposure(renderer, v));
viewFolder.addColor(state, 'bgColor').name('Cor do Fundo').onChange(v => envManager.setBackgroundColor(v));
viewFolder.add(state, 'resetView').name('Focar Modelo');

// --- 3. LÓGICA DE SELEÇÃO E MATERIAIS ---
function selectPart(mesh) {
    // Remove brilho da peça anterior
    if (selectedMesh) selectedMesh.material.emissive?.setHex(0x000000);
    if (!mesh) { matFolder.hide(); return; }

    selectedMesh = mesh;
    
    // Sincroniza GUI
    state.partName = mesh.name;
    state.color = '#' + mesh.material.color.getHexString();
    state.metalness = mesh.material.metalness || 0;
    state.roughness = mesh.material.roughness || 0;
    state.opacity = mesh.material.opacity ?? 1.0;
    state.wireframe = mesh.material.wireframe || false;

    // Destaca a peça selecionada com um leve emissivo
    if (selectedMesh.material.emissive) selectedMesh.material.emissive.setHex(0x333333);

    rebuildMaterialGUI();
    matFolder.show();
}

function rebuildMaterialGUI() {
    matFolder.children.forEach(c => c.destroy());
    
    matFolder.add(state, 'partName').name('ID').disable();
    matFolder.add(state, 'preset', Object.keys(matManager.presets)).name('Material').onChange(v => {
        Object.assign(state, matManager.presets[v]);
        matManager.applyToMesh(selectedMesh, state);
    });

    matFolder.addColor(state, 'color').name('Cor').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'metalness', 0, 1).name('Metal').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'roughness', 0, 1).name('Rugosidade').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'opacity', 0, 1).name('Transparência').onChange(() => matManager.applyToMesh(selectedMesh, state)).listen();
    matFolder.add(state, 'wireframe').name('Estrutura (Wire)').onChange(() => matManager.applyToMesh(selectedMesh, state));
}

// --- 4. CARREGAMENTO (Sua Lógica Original) ---
const loader = new GLTFLoader();

function loadModel(url) {
    loader.load(url, (gltf) => {
        if (currentModel) {
            scene.remove(currentModel);
            currentModel.traverse(n => { if(n.isMesh) { n.geometry.dispose(); n.material.dispose(); }});
        }

        currentModel = gltf.scene;
        const meta = engine.analyzeModel(currentModel);

        // Lógica de centralização respeitada
        currentModel.position.x -= meta.center.x;
        currentModel.position.y -= (meta.center.y - meta.size.y / 2);
        currentModel.position.z -= meta.center.z;

        scene.add(currentModel);

        // Grid adaptativo
        scene.remove(gridHelper);
        gridHelper = new THREE.GridHelper(meta.maxDim * 4, 20, 0x444444, 0x222222);
        scene.add(gridHelper);

        // UI de Peças
        state.explosion = 0;
        partsFolder.children.forEach(c => c.destroy());
        partsFolder.add(state, 'partName', engine.getMeshNames()).name('Selecionar Peça').onChange(n => {
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
    camera.updateProjectionMatrix();
}

// --- 5. LOOP E EVENTOS ---
window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lil-gui') || e.target.closest('#ui-container')) return;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
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

// Evento de Exportação
document.getElementById('export-btn')?.addEventListener('click', () => {
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