import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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
        if (!mesh || !mesh.isMesh) return;
        
        if (!mesh.material.isCloned) {
            mesh.material = mesh.material.clone();
            mesh.material.isCloned = true;
        }

        const mat = mesh.material;
        mat.transparent = state.opacity < 1.0;
        mat.color.set(state.color);
        mat.metalness = state.metalness;
        mat.roughness = state.roughness;
        mat.opacity = state.opacity;
        mat.wireframe = state.wireframe;
        
        // Mantém emissivo zerado para garantir fidelidade total à cor escolhida
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
    }

    exportFullModel(model) {
        if (!model) return;

        model.traverse(node => {
            if (node.isMesh && node.material) {
                node.material.emissive.setHex(0x000000);
                node.material.emissiveIntensity = 0;
            }
        });

        const exporter = new GLTFExporter();
        exporter.parse(model, (result) => {
            const blob = new Blob([result], { type: 'application/octet-stream' });
            const saveLink = document.createElement('a');
            saveLink.href = URL.createObjectURL(blob);
            saveLink.download = `wandi_export_${Date.now()}.glb`;
            saveLink.click();
        }, (err) => console.error(err), { binary: true });
    }
}