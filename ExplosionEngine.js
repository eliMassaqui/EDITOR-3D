import * as THREE from 'three';

/**
 * ExplosionEngine: Inteligência geométrica para sistemas robóticos.
 */
export class ExplosionEngine {
    constructor() {
        this.explosionMap = new Map();
        this.metadata = {
            center: new THREE.Vector3(),
            size: new THREE.Vector3(),
            maxDim: 0
        };
    }

    /**
     * Analisa a geometria para definir vetores de explosão e limites da câmera.
     */
    analyzeModel(model) {
        this.explosionMap.clear();

        const box = new THREE.Box3().setFromObject(model);
        box.getCenter(this.metadata.center);
        box.getSize(this.metadata.size);
        this.metadata.maxDim = Math.max(this.metadata.size.x, this.metadata.size.y, this.metadata.size.z);

        const totalVolume = this.metadata.size.x * this.metadata.size.y * this.metadata.size.z;

        model.traverse((node) => {
            if (node.isMesh) {
                node.name = node.name || `Peca_${node.id}`;

                node.geometry.computeBoundingBox();
                const meshBox = node.geometry.boundingBox;
                const meshSize = meshBox.getSize(new THREE.Vector3());
                const meshCenter = meshBox.getCenter(new THREE.Vector3());
                const volume = meshSize.x * meshSize.y * meshSize.z;

                // Lógica Original: Boost baseado no volume relativo (Escala Logarítmica)
                const relativeVolume = volume / (totalVolume + 0.00001);
                const boost = this.metadata.maxDim * (1.2 + Math.abs(Math.log10(relativeVolume + 0.00001)) * 0.2);

                this.explosionMap.set(node, {
                    origin: node.position.clone(),
                    dir: meshCenter.clone().normalize(),
                    boost: boost
                });
            }
        });

        return this.metadata;
    }

    apply(factor) {
        this.explosionMap.forEach((data, mesh) => {
            const displacement = data.boost * factor;
            mesh.position.x = data.origin.x + (data.dir.x * displacement);
            mesh.position.y = data.origin.y + (data.dir.y * displacement);
            mesh.position.z = data.origin.z + (data.dir.z * displacement);
        });
    }

    getMeshNames() {
        return Array.from(this.explosionMap.keys()).map(m => m.name);
    }
}