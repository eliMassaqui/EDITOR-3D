import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

import { ExplosionEngine } from './ExplosionEngine.js';
import { MaterialManager } from './MaterialManager.js';
import { EnvironmentManager } from './EnvironmentManager.js';

// --- ELEMENTO TOOLTIP (ACOLHEDOR) ---
const tooltip = document.createElement('div');
tooltip.style.cssText = `
    position: fixed;
    pointer-events: none;
    padding: 10px 16px;
    background: rgba(15, 15, 15, 0.85);
    backdrop-filter: blur(8px);
    color: #fff;
    border-left: 4px solid #bf00ff;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 13px;
    display: none;
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
`;
document.body.appendChild(tooltip);

// --- 1. SETUP DA CENA ---
const scene = new THREE.Scene();
const engine = new ExplosionEngine();
const matManager = new MaterialManager();
const envManager = new EnvironmentManager(scene);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.4; 
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Adição do Grid (Plano Cartesiano) para referência visual
const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
scene.add(gridHelper);

// --- 2. ESTADO ---
let currentModel = null;
let selectedMesh = null;

const gui = new GUI({ title: 'WANDI STUDIO' });
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
    bgColor: '#1a1a1a',
    resetView: () => { if (currentModel) resetCamera(); },
    export3D: () => { if (currentModel) matManager.exportFullModel(currentModel); }
};

const partsFolder = gui.addFolder('Hierarquia');
const matFolder = gui.addFolder('Propriedades do Material');
const viewFolder = gui.addFolder('Cena & Exportação');
matFolder.hide();

// --- 3. LÓGICA DE SELEÇÃO E INTERAÇÃO ---
function selectPart(mesh) {
    // Limpeza de seleção anterior (sem brilho roxo para não afetar a cor)
    if (!mesh || !mesh.isMesh) {
        selectedMesh = null;
        state.partName = '';
        matFolder.hide();
        tooltip.style.display = 'none';
        return;
    }

    selectedMesh = mesh;

    // Sincronização dos dados para o GUI
    state.partName = mesh.name || "Peça sem nome";
    state.color = '#' + mesh.material.color.getHexString();
    state.metalness = mesh.material.metalness ?? 0.5;
    state.roughness = mesh.material.roughness ?? 0.5;
    state.opacity = mesh.material.opacity ?? 1.0;
    state.wireframe = mesh.material.wireframe ?? false;

    updateMaterialMenu();

    // Tooltip informativo
    tooltip.innerHTML = `<span style="color: #bf00ff; font-weight: bold;">ITEM:</span> ${state.partName}`;
    tooltip.style.display = 'block';
}

function updateMaterialMenu() {
    // Remove duplicatas limpando a pasta antes de reconstruir
    [...matFolder.children].forEach(c => c.destroy());

    matFolder.show();
    matFolder.add(state, 'partName').name('ID').disable();
    
    const apply = () => matManager.applyToMesh(selectedMesh, state);

    matFolder.add(state, 'preset', Object.keys(matManager.presets)).name('Preset').onChange(v => {
        Object.assign(state, matManager.presets[v]);
        apply();
    });

    matFolder.addColor(state, 'color').name('Cor Real').onChange(apply).listen();
    matFolder.add(state, 'metalness', 0, 1, 0.01).name('Metálico').onChange(apply).listen();
    matFolder.add(state, 'roughness', 0, 1, 0.01).name('Rugosidade').onChange(apply).listen();
    matFolder.add(state, 'opacity', 0, 1, 0.01).name('Opacidade').onChange(apply).listen();
    matFolder.add(state, 'wireframe').name('Wireframe').onChange(apply);
}

// --- 4. CARREGAMENTO E POSICIONAMENTO ---
const loader = new GLTFLoader();

function loadModel(url) {
    loader.load(url, (gltf) => {
        if (currentModel) scene.remove(currentModel);
        
        currentModel = gltf.scene;
        
        // Lógica para colocar o objeto SOBRE o plano cartesiano (Y=0)
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        
        // X e Z centralizados na origem, Y ajustado para a base tocar o grid
        currentModel.position.x = -center.x;
        currentModel.position.y = -box.min.y; 
        currentModel.position.z = -center.z;
        
        scene.add(currentModel);

        // Analisa para explosão e reconstrói hierarquia
        engine.analyzeModel(currentModel);
        
        [...partsFolder.children].forEach(c => c.destroy());
        partsFolder.add(state, 'partName', engine.getMeshNames()).name('Localizar').onChange(name => {
            currentModel.traverse(m => { if(m.name === name) selectPart(m); });
        });

        resetCamera();
    });
}

function resetCamera() {
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const dist = maxDim * 2.2;
    camera.position.set(dist, dist, dist);
    
    // Foca no centro da altura do objeto para uma rotação agradável
    controls.target.set(0, size.y / 2, 0);
    camera.updateProjectionMatrix();
}

// --- 5. EVENTOS E LOOP ---
window.addEventListener('pointermove', (e) => {
    if (selectedMesh) {
        tooltip.style.left = (e.clientX + 20) + 'px';
        tooltip.style.top = (e.clientY - 20) + 'px';
    }
});

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lil-gui')) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    if (currentModel) {
        const hits = raycaster.intersectObject(currentModel, true);
        selectPart(hits.length > 0 ? hits[0].object : null);
    }
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// UI de Controle Geral
viewFolder.add(state, 'explosion', 0, 1).name('Explodir').onChange(v => engine.apply(v));
viewFolder.add(state, 'exposure', 0, 3).name('Luz').onChange(v => envManager.setExposure(renderer, v));
viewFolder.addColor(state, 'bgColor').name('Fundo').onChange(v => envManager.setBackgroundColor(v));
viewFolder.add(state, 'resetView').name('Focar Objeto');
viewFolder.add(state, 'export3D').name('📥 EXPORTAR PARA BLENDER');

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadModel(URL.createObjectURL(file));
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});