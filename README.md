# 🤖 Three.js Robotics Viewer

Este projeto é um visualizador 3D de alta performance desenvolvido com Three.js e Vite, focado na exibição realista de componentes de robótica (como o Micro Servo Horn).

---

## 🚀 Tecnologias Utilizadas

* **Three.js** — Motor 3D
* **Vite** — Build tool e servidor de desenvolvimento
* **GLTFLoader** — Importação de modelos `.glb`
* **OrbitControls** — Interação de câmera com o mouse

---

## 🛠️ Passos para Configuração (Desenvolvimento)

### 1. Instalação de Dependências

```bash
npm install three
```

### 2. Estrutura de Pastas Crítica

Para que o modelo seja carregado corretamente no build, os arquivos devem seguir esta estrutura:

```
projeto/
├── public/
│   └── models/
│       └── Micro Servo Horn.glb
├── src/
│   └── main.js
├── index.html
└── vite.config.js
```

---

## ⚙️ Configuração do Vite

Arquivo `vite.config.js`:

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
})
```

Isso permite que o build funcione corretamente usando caminhos relativos.

---

## 💡 Implementações

### 💡 1. Iluminação de Estúdio (Three‑Point Lighting)

Para destacar volumes e detalhes das peças técnicas:

* **Key Light** — luz principal responsável por sombras e volume
* **Fill Light** — suaviza as sombras
* **Rim Light** — cria contorno separando o objeto do fundo

---

### 🎯 2. Centralização Automática do Modelo

O sistema calcula automaticamente o **Bounding Box** do modelo importado.

Isso garante que:

* O objeto seja centralizado em **(0,0,0)**
* A câmera ajuste automaticamente o zoom
* O modelo sempre preencha corretamente a tela

Independentemente da escala do arquivo `.glb`.

---

## 🏗️ Produção e Deploy

### Gerar o Build

```bash
npm run build
```

### Testar a Versão de Produção

```bash
npm run preview
```

---

## 🌐 Execução em Outros PCs (Sem Node.js)

Após o build, a pasta **dist** torna‑se independente.

Para executar usando apenas Python:

```bash
cd dist
python -m http.server 8000
```

Depois acesse:

```
http://localhost:8000
```

---

## 📝 Notas de Engenharia

### ⚠️ CORS Policy

Os navegadores bloqueiam carregamento de módulos usando `file://`.

Sempre utilize um **servidor local**:

* Vite dev server
* Python http.server

---

### 🎨 Tone Mapping

O projeto utiliza **ReinhardToneMapping** para evitar estouro de luz em fundos brancos, mantendo fidelidade nas texturas e materiais.
