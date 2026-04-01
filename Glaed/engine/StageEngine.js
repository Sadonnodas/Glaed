class StageEngine {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.transformControl = null; 
        this.stageSize = { width: 12, depth: 8 }; 
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.onFixtureSelected = null;
        this.onItemDropped = null;

        this.init();
    }

    init() {
        if (!this.container) return;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a10);
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 12);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Ambient dark theatrical lighting
        this.scene.add(new THREE.AmbientLight(0x111111)); 

        // WORK LIGHTS (Toggleable)
        this.workLights = new THREE.Group();
        this.workLights.add(new THREE.AmbientLight(0x555555));
        const hl = new THREE.DirectionalLight(0xffffff, 0.6);
        hl.position.set(0, 8, 10);
        this.workLights.add(hl);
        this.scene.add(this.workLights);

        this.buildStage();

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });
        this.scene.add(this.transformControl);

        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', this.onClick.bind(this), false);
        canvas.addEventListener('dragover', (e) => e.preventDefault());
        canvas.addEventListener('drop', this.onDrop.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.animate();
    }

    toggleWorkLights(forceState) {
        this.workLights.visible = forceState !== undefined ? forceState : !this.workLights.visible;
        return this.workLights.visible;
    }

    setTransformMode(mode) {
        if (this.transformControl) {
            this.transformControl.setMode(mode);
            // CRITICAL FIX: Translate uses World Space (so arrows always point up/down/left/right)
            // Rotate and Scale use Local Space (so you scale along the object's actual axis)
            this.transformControl.setSpace(mode === 'translate' ? 'world' : 'local');
        }
    }

    buildStage() {
        if (this.stageGroup) this.scene.remove(this.stageGroup);
        this.stageGroup = new THREE.Group();
        const w = this.stageSize.width, d = this.stageSize.depth;

        const floorGeo = new THREE.PlaneGeometry(w, d);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d2510, roughness: 0.9 });
        this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.receiveShadow = true;
        this.stageGroup.add(this.floorMesh);

        const grid = new THREE.GridHelper(w, w, 0x444444, 0x222222);
        grid.position.y = 0.01;
        this.stageGroup.add(grid);

        const lipGeo = new THREE.BoxGeometry(w, 0.2, 0.4);
        const lipMat = new THREE.MeshStandardMaterial({ color: 0x1a0d05 });
        const lip = new THREE.Mesh(lipGeo, lipMat);
        lip.position.set(0, 0.1, d/2); 
        this.stageGroup.add(lip);

        this.scene.add(this.stageGroup);
    }

    addProp(type, color = 0x555555, position = {x: 0, y: 0, z: 0}) {
        let geo;
        let mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
        
        if (type === 'human') geo = new THREE.CylinderGeometry(0.3, 0.3, 1.6, 16); 
        else if (type === 'riser') geo = new THREE.BoxGeometry(2, 0.4, 2);
        else if (type === 'curtain') {
            geo = new THREE.CylinderGeometry(6, 6, 6, 32, 1, true, 0, Math.PI);
            mat.side = THREE.DoubleSide;
        }
        else geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        
        if (type === 'human') mesh.position.y += 0.8;
        else if (type === 'riser') mesh.position.y += 0.2;
        else if (type === 'curtain') mesh.position.y += 3;
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isProp = true;
        this.add(mesh);
        return mesh;
    }

    selectFixtureIn3D(fixture) {
        if (!fixture || !fixture.threeObject) {
            this.transformControl.detach();
            return;
        }
        this.transformControl.attach(fixture.threeObject);
    }

    updateMouse(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    onClick(event) {
        this.updateMouse(event);
        const interactables = [];
        this.scene.traverse(child => {
            if (child.userData && (child.userData.isProp || child.userData.fixture)) interactables.push(child);
        });

        const intersects = this.raycaster.intersectObjects(interactables, true);
        if (intersects.length > 0) {
            let clicked = intersects[0].object;
            while (clicked && !clicked.userData.isProp && !clicked.userData.fixture) clicked = clicked.parent;
            
            if (clicked && clicked.userData.isProp) {
                this.transformControl.attach(clicked);
                if (this.onFixtureSelected) this.onFixtureSelected(null);
                return;
            }
            if (clicked && clicked.userData.fixture) {
                this.transformControl.attach(clicked);
                if (this.onFixtureSelected) this.onFixtureSelected(clicked.userData.fixture);
            }
        } else {
            this.transformControl.detach();
            if (this.onFixtureSelected) this.onFixtureSelected(null);
        }
    }

    onDrop(event) {
        event.preventDefault();
        try {
            const data = JSON.parse(event.dataTransfer.getData('application/json'));
            this.updateMouse(event);
            const intersects = this.raycaster.intersectObject(this.floorMesh);
            let dropPos = { x: 0, y: 0, z: 0 };
            if (intersects.length > 0) dropPos = intersects[0].point;
            if (this.onItemDropped) this.onItemDropped(data, dropPos);
        } catch (err) {}
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
    
    add(object) { this.scene.add(object); }
    remove(object) { this.scene.remove(object); }
}