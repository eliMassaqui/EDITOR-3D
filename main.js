import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

import { ExplosionEngine } from './ExplosionEngine.js';
import { MaterialManager } from './MaterialManager.js';
import { EnvironmentManager } from './EnvironmentManager.js';

// --- 1. SETUP ---
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

// --- 2. ESTADO ---
let currentModel = null;
let selectedMesh = null;
let pulseTime = 0;

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
    resetView: () => { if (currentModel) resetCamera(engine.metadata.size, engine.metadata.maxDim); },
    export3D: () => { if (currentModel) matManager.exportFullModel(currentModel); }
};

// Pastas fixas para evitar duplicação ao clicar
const partsFolder = gui.addFolder('Hierarquia');
const matFolder = gui.addFolder('Propriedades do Material');
const viewFolder = gui.addFolder('Cena & Exportação');
matFolder.hide();

// --- 3. LÓGICA DE SELEÇÃO PRECISA ---
function selectPart(mesh) {
    // 1. Reset visual da peça anterior
    if (selectedMesh && selectedMesh.material) {
        selectedMesh.material.emissive.setHex(0x000000);
        selectedMesh.material.emissiveIntensity = 0;
    }

    // 2. Validação: Apenas Meshes individuais
    if (!mesh || !mesh.isMesh) {
        selectedMesh = null;
        state.partName = '';
        matFolder.hide();
        return;
    }

    selectedMesh = mesh;
    pulseTime = 0; 

    // Sincronização dos dados reais para o GUI
    state.partName = mesh.name || "Sem Nome";
    state.color = '#' + mesh.material.color.getHexString();
    state.metalness = mesh.material.metalness ?? 0.5;
    state.roughness = mesh.material.roughness ?? 0.5;
    state.opacity = mesh.material.opacity ?? 1.0;
    state.wireframe = mesh.material.wireframe ?? false;

    updateMaterialMenu();
}

function updateMaterialMenu() {
    // LIMPEZA CRÍTICA: Remove todos os controladores antes de recriar
    const controllers = [...matFolder.children];
    controllers.forEach(c => c.destroy());

    matFolder.show();
    matFolder.add(state, 'partName').name('Peça Ativa').disable();
    
    const apply = () => matManager.applyToMesh(selectedMesh, state);

    matFolder.add(state, 'preset', Object.keys(matManager.presets)).name('Material').onChange(v => {
        Object.assign(state, matManager.presets[v]);
        apply();
    });

    matFolder.addColor(state, 'color').name('Cor Base').onChange(apply).listen();
    matFolder.add(state, 'metalness', 0, 1, 0.01).name('Metálico').onChange(apply).listen();
    matFolder.add(state, 'roughness', 0, 1, 0.01).name('Rugosidade').onChange(apply).listen();
    matFolder.add(state, 'opacity', 0, 1, 0.01).name('Opacidade').onChange(apply).listen();
    matFolder.add(state, 'wireframe').name('Wireframe').onChange(apply);
}

// --- 4. CARREGAMENTO ---
const loader = new GLTFLoader();

function loadModel(url) {
    loader.load(url, (gltf) => {
        if (currentModel) scene.remove(currentModel);
        
        currentModel = gltf.scene;
        const meta = engine.analyzeModel(currentModel);
        
        // Centralização técnica
        currentModel.position.set(-meta.center.x, -(meta.center.y - meta.size.y / 2), -meta.center.z);
        scene.add(currentModel);

        // Atualiza Lista de Peças (Hierarquia)
        const hierarchyControllers = [...partsFolder.children];
        hierarchyControllers.forEach(c => c.destroy());
        
        partsFolder.add(state, 'partName', engine.getMeshNames()).name('Localizar').onChange(name => {
            currentModel.traverse(m => { if(m.name === name) selectPart(m); });
        });

        resetCamera(meta.size, meta.maxDim);
    });
}

function resetCamera(size, maxDim) {
    const dist = maxDim * 2.2;
    camera.position.set(dist, dist, dist);
    controls.target.set(0, size ? size.y * 0.3 : 0, 0);
    camera.updateProjectionMatrix();
}

// --- 5. INTERAÇÃO E LOOP ---
window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lil-gui')) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    if (currentModel) {
        const intersects = raycaster.intersectObject(currentModel, true);
        // Pegamos apenas o primeiro objeto (o mais próximo)
        selectPart(intersects.length > 0 ? intersects[0].object : null);
    }
});

function animate() {
    requestAnimationFrame(animate);
    
    // Efeito Visual de Seleção (Roxo Vivo) - Não afeta a cor base
    if (selectedMesh && selectedMesh.material && selectedMesh.material.emissive) {
        pulseTime += 0.06;
        const intensity = (Math.sin(pulseTime) * 0.2) + 0.3; 
        selectedMesh.material.emissive.setHex(0xbf00ff); 
        selectedMesh.material.emissiveIntensity = intensity;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// UI Geral
viewFolder.add(state, 'explosion', 0, 1).name('Explosão').onChange(v => engine.apply(v));
viewFolder.add(state, 'exposure', 0, 3).name('Luz').onChange(v => envManager.setExposure(renderer, v));
viewFolder.addColor(state, 'bgColor').name('Fundo').onChange(v => envManager.setBackgroundColor(v));
viewFolder.add(state, 'resetView').name('Focar');
viewFolder.add(state, 'export3D').name('📥 BAIXAR MODELO (.GLB)');

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadModel(URL.createObjectURL(file));
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});