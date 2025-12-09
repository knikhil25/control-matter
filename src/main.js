import './style.css';
import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';
import { HandInput } from './HandInput.js';

class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.handInput = null;
        this.clock = new THREE.Clock();

        this.initThree();
        this.initSystem();
        this.initUI();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        // Fog for depth
        this.scene.fog = new THREE.FogExp2(0x050510, 0.05);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 8;
        this.camera.position.y = 2;
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initSystem() {
        this.particles = new ParticleSystem(this.scene);
        this.handInput = new HandInput();

        // Status UI handler
        const statusEl = document.getElementById('status-indicator');
        this.handInput.init((state, msg) => {
            statusEl.textContent = msg;
            statusEl.className = 'status-' + state;
        });
    }

    initUI() {
        // Shape Selectors
        const buttons = document.querySelectorAll('.shape-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const shape = e.target.getAttribute('data-shape');
                this.particles.generateShape(shape);
            });
        });

        // Color Picker
        const colorPicker = document.getElementById('color-picker');
        colorPicker.addEventListener('input', (e) => {
            this.particles.setColor(e.target.value);
        });

        // --- New UI Logic ---
        this.initDragAndDrop();
        this.initMinimize();
    }

    initDragAndDrop() {
        const panel = document.getElementById('controls-panel');
        const header = panel.querySelector('.panel-header');

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = panel.getBoundingClientRect();
            // On first drag, switch from bottom/right to left/top positioning
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
            panel.style.left = `${rect.left}px`;
            panel.style.top = `${rect.top}px`;

            initialLeft = rect.left;
            initialTop = rect.top;

            header.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            panel.style.left = `${initialLeft + dx}px`;
            panel.style.top = `${initialTop + dy}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            header.style.cursor = 'grab';
        };

        header.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    initMinimize() {
        const panel = document.getElementById('controls-panel');
        const minimizeBtn = document.getElementById('minimize-btn');
        const icon = document.getElementById('minimized-icon');

        minimizeBtn.addEventListener('click', () => {
            // Calculate travel distance to icon
            const panelRect = panel.getBoundingClientRect();
            const iconRect = icon.getBoundingClientRect(); // Icon is hidden but positioned

            // We need to show icon momentarily to get accurate rect if display:none
            // But we made it hidden with opacity/scale, so rect should be valid if display!=none
            // If display:none, we need to handle it. style.css uses opacity/scale for .hidden usually? 
            // Checked style.css: #minimized-icon.hidden { display: none; } -> rect will be 0.

            // Temporary show to measure
            icon.style.display = 'flex';
            const destRect = icon.getBoundingClientRect();
            icon.style.display = ''; // Revert to class control

            const dx = (destRect.left + destRect.width / 2) - (panelRect.left + panelRect.width / 2);
            const dy = (destRect.top + destRect.height / 2) - (panelRect.top + panelRect.height / 2);

            // Apply Genie transform
            panel.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.5s ease';
            panel.style.transform = `translate(${dx}px, ${dy}px) scale(0.1)`;
            panel.style.opacity = '0';
            panel.style.pointerEvents = 'none';

            setTimeout(() => {
                icon.classList.remove('hidden');
            }, 300); // Show icon halfway through
        });

        icon.addEventListener('click', () => {
            icon.classList.add('hidden');

            // Reset panel
            // Wait slight delay for icon to shrink
            setTimeout(() => {
                panel.style.transform = '';
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
            }, 100);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const tension = this.handInput.getTension();

        // Optional: Smooth camera movement based on mouse or time
        const time = this.clock.getElapsedTime();
        this.camera.position.x = Math.sin(time * 0.1) * 2;
        this.camera.lookAt(0, 0, 0);

        if (this.particles) {
            this.particles.update(tension);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

new App();
