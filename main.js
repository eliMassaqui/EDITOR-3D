import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 1. Cena Branca de Estúdio
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// 2. Câmera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);

// 3. Renderizador com Configurações de Produção
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// --- MELHORIA DE REALISMO ---
renderer.toneMapping = THREE.ReinhardToneMapping; // Melhora o contraste de luzes fortes
renderer.toneMappingExposure = 1.5;               // Ajusta a exposição global
document.body.appendChild(renderer.domElement);

// 4. Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 5. ILUMINAÇÃO DE ESTÚDIO MELHORADA
// A. Luz Ambiente (Luz de preenchimento suave)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

// B. Luz Principal (Key Light) - Cria sombras e define o volume
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(2, 4, 4);
scene.add(keyLight);

// C. Luz de Preenchimento (Fill Light) - Suaviza sombras do lado oposto
const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-2, 1, 2);
scene.add(fillLight);

// D. Luz de Contorno (Rim Light) - Destaca a silhueta do servo contra o fundo branco
const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, 2, -4);
scene.add(rimLight);

// 6. Carregamento com Foco "Macro"
const loader = new GLTFLoader();

loader.load(
    '/models/Micro Servo Horn.glb', 
    (gltf) => {
        const model = gltf.scene;

        // Ativar reflexos e brilho no material original do GLB
        model.traverse((node) => {
            if (node.isMesh) {
                node.material.envMapIntensity = 1.5;
            }
        });

        // --- LÓGICA DE CENTRALIZAÇÃO ---
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        camera.position.z = cameraZ * 1.2; 
        camera.updateProjectionMatrix();
        
        scene.add(model);
        console.log("Modelo centralizado com iluminação de estúdio.");
    }
);

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