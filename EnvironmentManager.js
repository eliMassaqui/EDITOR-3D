import * as THREE from 'three';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = {};
        this.setupAtmosphere();
        this.setupTechnicalLights();
    }

    /**
     * Fundo Escuro para Máximo Contraste
     */
    setupAtmosphere() {
        // Tom grafite profundo: profissional e menos cansativo
        const bgColor = 0x1a1a1a; 
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = null; // Mantendo limpo conforme solicitado
    }

    /**
     * Iluminação de Alto Contraste (Foco em Detalhes)
     */
    setupTechnicalLights() {
        // 1. Luz Ambiente Suave: Apenas para não ter áreas de "preto absoluto"
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // 2. Luz de Topo (Key Light): Luz branca neutra para definir volumes
        const topLight = new THREE.DirectionalLight(0xffffff, 1.4);
        topLight.position.set(5, 15, 5);
        this.scene.add(topLight);

        // 3. Luz de Preenchimento (Fill): Evita sombras duras nas laterais
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);

        // 4. Luz de Detalhe (Rim Light): Posicionada atrás para destacar as bordas
        // Isso é o que faz os detalhes da engenharia aparecerem no fundo escuro
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);

        this.lights = { ambient, topLight, fillLight, rimLight };
    }

    setExposure(renderer, value) {
        renderer.toneMappingExposure = value;
    }

    setBackgroundColor(color) {
        this.scene.background.set(new THREE.Color(color));
    }
}