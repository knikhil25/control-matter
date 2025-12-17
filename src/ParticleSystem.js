import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 15000;
        this.particles = null;
        this.geometry = null;
        this.material = null;

        // State
        this.currentShape = 'heart';
        this.baseColor = new THREE.Color('#00ffff');
        this.expansion = 0; // 0 = normal, 1 = fully expanded/exploded

        // Animation targets
        this.originalPositions = new Float32Array(this.particleCount * 3);
        this.targetPositions = new Float32Array(this.particleCount * 3);

        this.init();
    }

    init() {
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);

        // Initial random positions
        for (let i = 0; i < this.particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 10;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Store initial positions for reference
        this.originalPositions.set(positions);
        this.targetPositions.set(positions);

        // Create texture for particle
        const textureLoader = new THREE.TextureLoader();
        // Using a data URI for a simple glow texture to avoid external dependency issues if possible, 
        // or just procedurally make a circle. simpler to use a canvas generated texture.
        const sprite = this.createCircleTexture();

        this.material = new THREE.PointsMaterial({
            color: this.baseColor,
            size: 0.15,
            map: sprite,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        this.generateShape('heart');
    }

    createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        return new THREE.CanvasTexture(canvas);
    }

    setColor(hexColor) {
        this.baseColor.set(hexColor);
        this.material.color.set(hexColor);
    }

    generateShape(shapeName) {
        this.currentShape = shapeName;
        const positions = this.targetPositions;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            let x, y, z;

            if (shapeName === 'heart') {
                // Heart formula
                const t = Math.random() * Math.PI * 2;
                const u = Math.random() * Math.PI; // distribution fix needed for uniform points but random is ok
                // 3D Heart variants exist. Simple parametric:
                // x = 16sin^3(t)
                // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
                // extruded or volume? Let's do a filled volume approx or surface.
                // Let's us a volumetric distribution for better look.

                // Revised heart surface
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                // Basic sphere to start? No, specific heart math.
                // (x^2+9/4y^2+z^2-1)^3 - x^2z^3 - 9/80y^2z^3 = 0 is implicit.

                // Easier: Parametric curve with noise
                const r = (Math.random() * 0.5 + 0.5);
                // 2D heart projected + depth
                const angle = Math.random() * Math.PI * 2;
                const hx = 16 * Math.pow(Math.sin(angle), 3);
                const hy = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
                const hz = (Math.random() - 0.5) * 4; // Thickness

                const scale = 0.2 * r; // Scale down and randomize radius fill
                x = hx * scale;
                y = hy * scale;
                z = hz; // Flattened 3d heart
            }
            else if (shapeName === 'flower') {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const r = 2 * Math.sin(5 * theta); // Rose curve logic
                const rad = 3 * (0.5 + 0.5 * Math.random());

                x = rad * Math.sin(theta) * Math.cos(r);
                y = rad * Math.cos(theta) * Math.cos(r);
                z = (Math.random() - 0.5) * 2;
            }
            else if (shapeName === 'saturn') {
                if (i < this.particleCount * 0.7) {
                    // Planet
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const r = 2;
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta);
                    z = r * Math.cos(phi);
                } else {
                    // Rings
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 3 + Math.random() * 2;
                    x = dist * Math.cos(angle);
                    y = (Math.random() - 0.5) * 0.2; // Thin
                    z = dist * Math.sin(angle);

                    // Tilt rings
                    const tilt = Math.PI / 6;
                    const x2 = x;
                    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
                    const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
                    x = x2; y = y2; z = z2;
                }
            }
            else if (shapeName === 'sun') {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                let r;

                if (i < this.particleCount * 0.9) {
                    // Main sphere
                    r = 2.5 + Math.random() * 0.4;
                } else {
                    // Solar flare outward particles
                    r = 3.5 + Math.random() * 1.2;
                }

                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.sin(phi) * Math.sin(theta);
                z = r * Math.cos(phi);
            }
            else if (shapeName === 'buddha') {
                // Approximating seated figure with spheres
                // Head, Body, Legs
                const section = Math.random();
                if (section < 0.2) { // Head
                    const r = 0.8;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta) + 2.5;
                    z = r * Math.cos(phi);
                } else if (section < 0.6) { // Body
                    const r = 1.2;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    x = r * Math.sin(phi) * Math.cos(theta); // scale x for shoulders?
                    y = r * Math.sin(phi) * Math.sin(theta) * 1.5 + 0.5;
                    z = r * Math.cos(phi) * 0.8;
                } else { // Legs/Base
                    const r = 2.0;
                    const theta = Math.random() * Math.PI; // Semi circle front
                    const width = 2.5;
                    x = (Math.random() - 0.5) * 4;
                    y = (Math.random() - 0.5) * 1 - 1.5;
                    z = (Math.random() - 0.5) * 2;
                    // Simple generic blob for now
                }
            }
            else if (shapeName === 'fireworks') {
                // Sphere but we will explode it later
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 0.2; // Start small
                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.sin(phi) * Math.sin(theta);
                z = r * Math.cos(phi);
            }

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;
        }
    }

    update(tension) {
        // tension: 0 to 1.
        // 0 = relaxed (normal shape)
        // 1 = tense (expanded or exploded)

        // Smoothly interpolate current positions to target
        const positions = this.geometry.attributes.position.array;
        const lerpSpeed = 0.05;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            let tx = this.targetPositions[i3];
            let ty = this.targetPositions[i3 + 1];
            let tz = this.targetPositions[i3 + 2];

            // Apply tension effect
            if (this.currentShape === 'fireworks') {
                // For fireworks, tension = time acts as explosion expansion
                // If tension is high, expand radially
                const dirX = tx;
                const dirY = ty;
                const dirZ = tz;
                // Normalize mostly
                // Simple: just multiply target by tension * factor
                const expansion = 1 + tension * 20;
                tx *= expansion;
                ty *= expansion;
                tz *= expansion;
            } else {
                // Standard breath/expansion
                // Add noise or scale
                const expansion = 1 + tension * 1.5; // Expand up to 2.5x
                // Also add some jitter if high tension
                const jitter = tension * 0.05;
                tx = tx * expansion + (Math.random() - 0.5) * jitter;
                ty = ty * expansion + (Math.random() - 0.5) * jitter;
                tz = tz * expansion + (Math.random() - 0.5) * jitter;
            }

            // Lerp
            positions[i3] += (tx - positions[i3]) * lerpSpeed;
            positions[i3 + 1] += (ty - positions[i3 + 1]) * lerpSpeed;
            positions[i3 + 2] += (tz - positions[i3 + 2]) * lerpSpeed;
        }

        this.geometry.attributes.position.needsUpdate = true;

        // Rotate entire system slightly
        this.particles.rotation.y += 0.002;
    }
}
