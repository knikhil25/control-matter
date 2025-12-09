import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandInput {
    constructor() {
        this.handLandmarker = null;
        this.webcamRunning = false;
        this.video = document.getElementById('webcam'); // We create this dynamically
        this.lastVideoTime = -1;
        this.results = undefined;
        this.tension = 0; // 0 (Closed) to 1 (Open)

        // Status callback
        this.onStatusChange = null;
    }

    async init(statusCallback) {
        this.onStatusChange = statusCallback;
        this.onStatusChange('loading', 'Loading AI Model...');

        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 2
            });

            this.onStatusChange('waiting', 'Requesting Camera...');
            await this.startWebcam();
        } catch (e) {
            console.error(e);
            this.onStatusChange('error', 'Camera/AI Error');
        }
    }

    async startWebcam() {
        if (!this.handLandmarker) return;

        // Create hidden video element
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.style.display = 'none'; // hidden
        document.body.appendChild(video);
        this.video = video;

        const constraints = {
            video: {
                width: 640,
                height: 480
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            this.video.addEventListener('loadeddata', () => {
                this.webcamRunning = true;
                this.onStatusChange('active', 'Tracking Active');
                this.predictWebcam();
            });
        } catch (err) {
            this.onStatusChange('error', 'Camera Denied');
        }
    }

    async predictWebcam() {
        if (this.lastVideoTime !== this.video.currentTime) {
            this.lastVideoTime = this.video.currentTime;
            this.results = this.handLandmarker.detectForVideo(this.video, performance.now());
            this.processResults();
        }
        window.requestAnimationFrame(() => this.predictWebcam());
    }

    processResults() {
        if (!this.results || !this.results.landmarks) return;

        // New Logic: Depth/Push-Pull based on Hand Size
        // "Pull backward" (Far/Small) -> Expand (Tension 1)
        // "Push forward" (Close/Big) -> Contract (Tension 0)

        if (this.results.landmarks.length > 0) {
            let totalSize = 0;

            for (const landmarks of this.results.landmarks) {
                // Calculate bounding box width as proxy for depth/size
                let minX = 1, maxX = 0;
                for (const lm of landmarks) {
                    if (lm.x < minX) minX = lm.x;
                    if (lm.x > maxX) maxX = lm.x;
                }
                const width = maxX - minX;

                // Calibration: 
                // Very close/Big hand: width ~ 0.3 - 0.4?
                // Far/Small hand: width ~ 0.05 - 0.1?
                // Let's normalize. 
                // range: 0.1 (Far) to 0.3 (Close)
                // If width < 0.1 -> Far -> Value 1
                // If width > 0.3 -> Close -> Value 0

                // Linear map
                // val = (width - 0.3) / (0.1 - 0.3) 
                // val = (width - 0.3) / -0.2
                let val = (width - 0.3) / (0.1 - 0.3);
                val = Math.max(0, Math.min(1, val)); // Clamp

                totalSize += val;
            }

            this.tension = totalSize / this.results.landmarks.length;
        } else {
            // No hands: Maintain current or drift?
            // Drift to expanded (1) state for nice view?
            this.tension = this.tension * 0.95 + 1.0 * 0.05;
        }
    }

    dist(p1, p2) {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }

    getTension() {
        // Invert tension if we want Closed = High Tension?
        // User req: "closing... control scaling"
        // Let's return the normalized 0-1 value where 1 = Open, 0 = Closed
        // The consumer (ParticleSystem) can interpret it.
        return this.tension;
    }
}
