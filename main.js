import * as THREE from 'three';

// 1. Criar a Cena
const scene = new THREE.Scene();

// 2. Criar a Câmera (Campo de visão, Proporção, Corte Próximo, Corte Distante)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 3. Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. O Cubo Azul
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Azul puro
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. Função de Animação (Loop)
function animate() {
    requestAnimationFrame(animate);

    // Adiciona uma rotação básica para dar profundidade
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();

// Ajustar a tela caso o usuário redimensione o navegador
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});