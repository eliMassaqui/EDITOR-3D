import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

// --- 1. CONFIGURAÇÃO DA CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Fundo Branco Estúdio

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 2. GUIAS VISUAIS (DINÂMICOS) ---
let gridHelper = new THREE.GridHelper(10, 10, 0xbbbbbb, 0xdddddd);
scene.add(gridHelper);

// --- 3. ILUMINAÇÃO ORIGINAL ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(5, 10, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-5, 2, 5);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, 5, -10);
scene.add(rimLight);

// --- 4. ESTADO E INTERFACE ---
let currentModel = null;
let selectedMesh = null;
let meshesDict = {};

const gui = new GUI({ title: 'Wandi Studio Editor' });
const editorState = {
    partName: '',
    color: '#ffffff',
    metalness: 0.5,
    roughness: 0.5,
    resetView: () => resetCamera()
};

const partsFolder = gui.addFolder('Hierarquia');
const matFolder = gui.addFolder('Material PBR');
gui.add(editorState, 'resetView').name('Centralizar Câmera');

// --- 5. LÓGICA DE SELEÇÃO ---
function selectPart(mesh) {
    if (selectedMesh) selectedMesh.material.emissive.setHex(0x000000);
    if (!mesh) { matFolder.hide(); return; }

    selectedMesh = mesh;
    if (selectedMesh.material) {
        selectedMesh.material = selectedMesh.material.clone();
    }
    selectedMesh.material.emissive.setHex(0x222222);

    editorState.partName = mesh.name;
    editorState.color = '#' + selectedMesh.material.color.getHexString();
    editorState.metalness = selectedMesh.material.metalness || 0;
    editorState.roughness = selectedMesh.material.roughness || 0;

    matFolder.children.forEach(c => c.destroy());
    matFolder.addColor(editorState, 'color').name('Cor').onChange(v => selectedMesh.material.color.set(v));
    matFolder.add(editorState, 'metalness', 0, 1).name('Metal').onChange(v => selectedMesh.material.metalness = v);
    matFolder.add(editorState, 'roughness', 0, 1).name('Rugosidade').onChange(v => selectedMesh.material.roughness = v);
    matFolder.show();
}

// --- 6. IMPORTAÇÃO E CENTRALIZAÇÃO PERFEITA ---
const loader = new GLTFLoader();

function loadModel(url) {
    loader.load(url, (gltf) => {
        // Limpeza de memória
        if (currentModel) {
            scene.remove(currentModel);
            currentModel.traverse(n => { if(n.isMesh) { n.geometry.dispose(); n.material.dispose(); }});
        }

        currentModel = gltf.scene;
        meshesDict = {};
        const names = [];

        currentModel.traverse((node) => {
            if (node.isMesh) {
                node.name = node.name || `Peça_${node.id}`;
                meshesDict[node.name] = node;
                names.push(node.name);
                node.material.envMapIntensity = 1.5;
            }
        });

        // CÁLCULO DE CAIXA DELIMITADORA
        const box = new THREE.Box3().setFromObject(currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // POSICIONAMENTO: Centro em X/Z e BASE no Y=0
        currentModel.position.x += (currentModel.position.x - center.x);
        currentModel.position.z += (currentModel.position.z - center.z);
        currentModel.position.y -= box.min.y; // Alinha base no zero
        currentModel.position.y += 0.01;      // Pequeno offset para não piscar no grid

        scene.add(currentModel);

        // AJUSTE DINÂMICO DO GRID (Largo e proporcional)
        scene.remove(gridHelper);
        const maxDim = Math.max(size.x, size.y, size.z);
        gridHelper = new THREE.GridHelper(maxDim * 4, 20, 0xbbbbbb, 0xdddddd);
        scene.add(gridHelper);

        // ATUALIZAR INTERFACE
        partsFolder.children.forEach(c => c.destroy());
        partsFolder.add(editorState, 'partName', names).name('Selecionar Peça').onChange(n => selectPart(meshesDict[n]));

        resetCamera(size, maxDim);
        selectPart(null);
    });
}

function resetCamera(size, maxDim) {
    if (!currentModel) return;
    const fov = camera.fov * (Math.PI / 180);
    // Distância para ver o objeto completo com margem
    let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5;

    camera.position.set(dist, dist, dist);
    
    // Foca em 40% da altura do objeto para uma perspectiva natural
    const targetY = size ? size.y * 0.4 : 0;
    camera.lookAt(0, targetY, 0);
    controls.target.set(0, targetY, 0);
    
    camera.updateProjectionMatrix();
    controls.update();
}

// --- 7. EVENTOS ---
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