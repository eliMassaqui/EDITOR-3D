import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        this.presets = {
            'Padrão': { metalness: 0.5, roughness: 0.5, color: '#ffffff', opacity: 1.0 },
            'Alumínio': { metalness: 1.0, roughness: 0.1, color: '#d1d5db', opacity: 1.0 },
            'Aço Escovado': { metalness: 0.8, roughness: 0.35, color: '#9ca3af', opacity: 1.0 },
            'Plástico ABS': { metalness: 0.0, roughness: 0.5, color: '#262626', opacity: 1.0 },
            'Vidro (Ghost)': { metalness: 0.0, roughness: 0.0, color: '#ffffff', opacity: 0.2 },
            'Fibra Carbono': { metalness: 0.1, roughness: 0.2, color: '#171717', opacity: 1.0 }
        };
    }

    applyToMesh(mesh, state) {
        if (!mesh) return;
        // Clone para evitar que alteração em uma peça mude todas as outras do modelo original
        if (!mesh.material.isCloned) {
            mesh.material = mesh.material.clone();
            mesh.material.isCloned = true;
        }

        const mat = mesh.material;
        mat.transparent = true;
        mat.color.set(state.color);
        mat.metalness = state.metalness;
        mat.roughness = state.roughness;
        mat.opacity = state.opacity;
        mat.wireframe = state.wireframe;
    }

    exportConfig(model) {
        const config = {
            studio: "Wandi Studio",
            timestamp: new Date().toISOString(),
            parts: []
        };

        model.traverse(node => {
            if (node.isMesh) {
                config.parts.push({
                    name: node.name,
                    material: {
                        color: '#' + node.material.color.getHexString(),
                        metalness: node.material.metalness,
                        roughness: node.material.roughness,
                        opacity: node.material.opacity,
                        wireframe: node.material.wireframe
                    }
                });
            }
        });

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wandi_setup_${Date.now()}.json`;
        link.click();
    }
}