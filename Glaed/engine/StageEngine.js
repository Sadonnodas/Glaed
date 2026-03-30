
class StageEngine {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.grid = null;

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('StageEngine needs a container element.');
            return;
        }

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // 4. Grid Helper
        this.grid = new THREE.GridHelper(100, 100, 0x444444, 0x888888);
        this.scene.add(this.grid);
        
        // 5. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

        // Handle window resizing
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        // Start the render loop
        this.animate();

        console.log('StageEngine initialized.');
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}
