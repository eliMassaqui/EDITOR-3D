import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui'; // Importação do lil-gui

// 1. Configuração Base da Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 2. Iluminação
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(2, 4, 4);
scene.add(keyLight);

// 3. Variáveis de Estado do Editor
let currentModel = null;
let meshesDict = {}; // Dicionário para guardar as peças por nome
let selectedMesh = null; // A peça atualmente selecionada

// Configuração inicial do lil-gui
const gui = new GUI({ title: 'Wandi Studio - Propriedades' });
const editorState = {
    selectedPartName: '',
    color: '#ffffff',
    metalness: 0.5,
    roughness: 0.5,
};

// Pastas do GUI
let partsFolder = gui.addFolder('Hierarquia de Peças');
let materialFolder = gui.addFolder('Material Físico (PBR)');
materialFolder.hide(); // Esconde até que uma peça seja selecionada

// Controladores do GUI que precisaremos atualizar dinamicamente
let partSelectController;
let colorController, metalnessController, roughnessController;

// 4. Lógica de Seleção Lúcida
function selectPart(mesh) {
    // A. Desmarcar a peça anterior (remover o brilho de seleção)
    if (selectedMesh) {
        selectedMesh.material.emissive.setHex(0x000000); 
    }

    if (!mesh) {
        materialFolder.hide();
        return;
    }

    selectedMesh = mesh;

    // B. Tornar o material único para não afetar outras peças
    if (selectedMesh.material) {
        selectedMesh.material = selectedMesh.material.clone();
    }

    // C. Adicionar brilho emissivo leve para feedback visual da seleção
    selectedMesh.material.emissive.setHex(0x222222);

    // D. Sincronizar o Estado do GUI com as propriedades reais da peça
    editorState.selectedPartName = mesh.name;
    editorState.color = '#' + selectedMesh.material.color.getHexString();
    editorState.metalness = selectedMesh.material.metalness || 0;
    editorState.roughness = selectedMesh.material.roughness !== undefined ? selectedMesh.material.roughness : 1;

    // E. Atualizar a Interface
    partSelectController.updateDisplay();
    materialFolder.show();
    
    // Recriar os controladores de material para garantir os callbacks corretos
    if (colorController) colorController.destroy();
    if (metalnessController) metalnessController.destroy();
    if (roughnessController) roughnessController.destroy();

    colorController = materialFolder.addColor(editorState, 'color').name('Cor Base').onChange(val => {
        selectedMesh.material.color.set(val);
    });
    metalnessController = materialFolder.add(editorState, 'metalness', 0, 1, 0.01).name('Metalicidade').onChange(val => {
        selectedMesh.material.metalness = val;
    });
    roughnessController = materialFolder.add(editorState, 'roughness', 0, 1, 0.01).name('Rugosidade').onChange(val => {
        selectedMesh.material.roughness = val;
    });
}

// 5. Carregamento do Modelo
const loader = new GLTFLoader();
function loadModel(url) {
    loader.load(url, (gltf) => {
        if (currentModel) scene.remove(currentModel);
        
        currentModel = gltf.scene;
        meshesDict = {}; // Limpa o dicionário anterior
        const partNames = []; // Array para o dropdown do lil-gui

        currentModel.traverse((node) => {
            if (node.isMesh) {
                // Se a peça do SolidWorks não tiver nome, damos um nome genérico
                const name = node.name || `Peca_${Math.random().toString(36).substr(2, 5)}`;
                node.name = name;
                meshesDict[name] = node;
                partNames.push(name);
                
                // Melhorar visualização inicial
                if(node.material) {
                    node.material.envMapIntensity = 1.0;
                    node.material.side = THREE.DoubleSide; // Previne faces transparentes do CAD
                }
            }
        });

        // Centralização
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        currentModel.position.sub(center); // Subtrai o centro para mover para a origem (0,0,0)
        
        scene.add(currentModel);

        // Atualizar a Dropdown do lil-gui
        if (partSelectController) partSelectController.destroy();
        partSelectController = partsFolder.add(editorState, 'selectedPartName', partNames)
            .name('Peça')
            .onChange(name => selectPart(meshesDict[name]));

        selectPart(null); // Reseta a seleção
        console.log(`Modelo carregado com ${partNames.length} peças.`);
    });
}

// 6. O Motor de Raycasting (Detetar Cliques)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
    // Ignorar cliques se o utilizador estiver a clicar no UI do lil-gui ou no botão HTML
    if (event.target.closest('.lil-gui') || event.target.closest('#ui-container')) return;

    // Normalizar as coordenadas do rato (-1 a +1)
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Lançar o raio a partir da câmara
    raycaster.setFromCamera(pointer, camera);

    if (currentModel) {
        // Obter interseções com as peças do modelo
        const intersects = raycaster.intersectObject(currentModel, true);

        if (intersects.length > 0) {
            // A primeira interseção é a peça mais próxima da câmara
            const clickedMesh = intersects[0].object;
            selectPart(clickedMesh);
        } else {
            // Clicou no vazio, desselecionar
            selectPart(null);
        }
    }
});

// Evento do Input de Ficheiro (Mantido igual)
const fileInput = document.getElementById('file-input');
if(fileInput) {
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) loadModel(URL.createObjectURL(file));
    });
}

// 7. Loop Principal
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