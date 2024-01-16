class BallGhost extends BABYLON.Mesh {
    constructor(ball) {
        super(ball.name + "-ghost");
        this.ball = ball;
    }
}
class Ball extends BABYLON.Mesh {
    constructor(positionZero, machine) {
        super("ball");
        this.positionZero = positionZero;
        this.machine = machine;
        this.size = 0.016;
        this.velocity = BABYLON.Vector3.Zero();
        this._showPositionZeroGhost = false;
        this._timer = 0;
        this.strReaction = 0;
        this.marbleChocSound = new Sound({
            fileName: "./datas/sounds/marble-choc.wav",
            loop: false
        });
        this.marbleLoopSound = new Sound({
            fileName: "./datas/sounds/loop.wav",
            loop: true
        });
    }
    get game() {
        return this.machine.game;
    }
    get radius() {
        return this.size * 0.5;
    }
    get volume() {
        return 4 / 3 * Math.PI * Math.pow(this.size * 0.5, 3);
    }
    get mass() {
        return 7850 * this.volume;
    }
    get sectionArea() {
        return Math.PI * this.radius * this.radius;
    }
    get showPositionZeroGhost() {
        return this._showPositionZeroGhost;
    }
    setShowPositionZeroGhost(v) {
        this._showPositionZeroGhost = v;
        if (this.positionZeroGhost) {
            this.positionZeroGhost.isVisible = v;
        }
    }
    setPositionZero(p) {
        this.positionZero.copyFrom(p);
        this.positionZeroGhost.position.copyFrom(p);
    }
    select() {
        this.selectedMesh.isVisible = true;
    }
    unselect() {
        this.selectedMesh.isVisible = false;
    }
    setIsVisible(isVisible) {
        this.isVisible = isVisible;
        this.getChildMeshes().forEach(m => {
            m.isVisible = isVisible;
        });
    }
    async instantiate() {
        this.marbleLoopSound.volume = 0;
        this.marbleLoopSound.play(true);
        let data = BABYLON.CreateSphereVertexData({ diameter: this.size });
        data.applyToMesh(this);
        this.material = this.game.steelMaterial;
        if (this.positionZeroGhost) {
            this.positionZeroGhost.dispose();
        }
        this.positionZeroGhost = new BallGhost(this);
        BABYLON.CreateSphereVertexData({ diameter: this.size * 0.95 }).applyToMesh(this.positionZeroGhost);
        this.positionZeroGhost.material = this.game.ghostMaterial;
        this.positionZeroGhost.position.copyFrom(this.positionZero);
        this.positionZeroGhost.isVisible = this._showPositionZeroGhost;
        if (this.selectedMesh) {
            this.selectedMesh.dispose();
        }
        let points = [];
        for (let i = 0; i <= 32; i++) {
            let a = i / 32 * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            points.push(new BABYLON.Vector3(cosa * (this.radius + 0.005), sina * (this.radius + 0.005), 0));
        }
        this.selectedMesh = BABYLON.MeshBuilder.CreateLines("select-mesh", {
            points: points
        });
        this.selectedMesh.parent = this.positionZeroGhost;
        this.selectedMesh.isVisible = false;
        this.reset();
    }
    dispose(doNotRecurse, disposeMaterialAndTextures) {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        this.marbleLoopSound.volume = 0;
        this.marbleLoopSound.pause();
        if (this.positionZeroGhost) {
            this.positionZeroGhost.dispose();
        }
        let index = this.machine.balls.indexOf(this);
        if (index > -1) {
            this.machine.balls.splice(index, 1);
        }
    }
    reset() {
        this.position.copyFrom(this.positionZero);
        this.velocity.copyFromFloats(0, 0, 0);
        this._timer = 0;
        this.marbleLoopSound.volume = 0;
    }
    update(dt) {
        if (this.position.y < -10) {
            return;
        }
        this._timer += dt * this.game.timeFactor;
        this._timer = Math.min(this._timer, 1);
        while (this._timer > 0) {
            let m = this.mass;
            let dt = this.game.physicDT;
            this._timer -= dt;
            let weight = new BABYLON.Vector3(0, -9 * m, 0);
            let reactions = BABYLON.Vector3.Zero();
            let reactionsCount = 0;
            let forcedDisplacement = BABYLON.Vector3.Zero();
            let canceledSpeed = BABYLON.Vector3.Zero();
            this.machine.tracks.forEach(track => {
                if (Mummu.AABBAABBIntersect(this.position.x - this.radius, this.position.x + this.radius, this.position.y - this.radius, this.position.y + this.radius, this.position.z - this.radius, this.position.z + this.radius, track.AABBMin.x - this.radius, track.AABBMax.x + this.radius, track.AABBMin.y - this.radius, track.AABBMax.y + this.radius, track.AABBMin.z - this.radius, track.AABBMax.z + this.radius)) {
                    track.wires.forEach(wire => {
                        let col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5, !(track instanceof UTurnLarge));
                        if (col.hit) {
                            let colDig = col.normal.scale(-1);
                            // Move away from collision
                            forcedDisplacement.addInPlace(col.normal.scale(col.depth));
                            // Cancel depth component of speed
                            let depthSpeed = BABYLON.Vector3.Dot(this.velocity, colDig);
                            if (depthSpeed > 0) {
                                canceledSpeed.addInPlace(colDig.scale(depthSpeed));
                            }
                            // Add ground reaction
                            let reaction = col.normal.scale(-BABYLON.Vector3.Dot(weight, col.normal));
                            reactions.addInPlace(reaction);
                            reactionsCount++;
                        }
                    });
                }
            });
            this.machine.balls.forEach(ball => {
                if (ball != this) {
                    let dist = BABYLON.Vector3.Distance(this.position, ball.position);
                    if (dist < this.size) {
                        let depth = this.size - dist;
                        //this.velocity.scaleInPlace(0.3);
                        let otherSpeed = ball.velocity.clone();
                        let mySpeed = this.velocity.clone();
                        let v = this.velocity.length();
                        if (v > 0.1) {
                            this.marbleChocSound.volume = v / 5;
                            this.marbleChocSound.play();
                        }
                        this.velocity.scaleInPlace(-0.1).addInPlace(otherSpeed.scale(0.8));
                        ball.velocity.scaleInPlace(-0.1).addInPlace(mySpeed.scale(0.8));
                        //this.velocity.copyFrom(otherSpeed).scaleInPlace(.5);
                        //ball.velocity.copyFrom(mySpeed).scaleInPlace(.6);
                        let dir = this.position.subtract(ball.position).normalize();
                        this.position.addInPlace(dir.scale(depth));
                    }
                }
            });
            if (reactionsCount > 0) {
                reactions.scaleInPlace(1 / reactionsCount);
                canceledSpeed.scaleInPlace(1 / reactionsCount);
                forcedDisplacement.scaleInPlace(1 / reactionsCount);
            }
            this.strReaction = this.strReaction * 0.98;
            this.strReaction += reactions.length() * 0.02;
            this.velocity.subtractInPlace(canceledSpeed);
            this.position.addInPlace(forcedDisplacement);
            let friction = this.velocity.scale(-1).scaleInPlace(0.005);
            let acceleration = weight.add(reactions).add(friction).scaleInPlace(1 / m);
            this.velocity.addInPlace(acceleration.scale(dt));
            this.position.addInPlace(this.velocity.scale(dt));
        }
        this.marbleLoopSound.volume = this.strReaction * this.velocity.length();
    }
}
var demo1 = {
    balls: [
        { x: 0.45223644798326457, y: -0.14555925508040052 },
        { x: 0.4542039643251569, y: -0.06168364093616862 },
        { x: 0.4554387140880808, y: 0.021382350340019358 },
        { x: 0.4552031364946579, y: 0.10582023181972072 },
        { x: 0.45496577489396894, y: 0.19089755354340562 },
        { x: 0.4265645074593439, y: -0.14331937155899638 },
        { x: 0.40186220720561006, y: -0.1411542072522732 },
        { x: 0.37693605105079203, y: -0.1396427223486105 },
    ],
    parts: [
        { name: "ramp-3.1", i: -1, j: -6, mirror: true },
        { name: "ramp-3.1", i: -1, j: 4 },
        { name: "uturn-s", i: -2, j: -1, mirror: true },
        { name: "uturn-s", i: -2, j: 3, mirror: true },
        { name: "uturn-s", i: -2, j: -5, mirror: true },
        { name: "elevator-12", i: 3, j: -7 },
        { name: "ramp-1.0", i: 2, j: -6 },
        { name: "ramp-1.0", i: 2, j: 5 },
        { name: "wave", i: -1, j: -4 },
        { name: "ramp-2.1", i: -1, j: -2, mirror: true },
        { name: "uturn-l", i: 1, j: -3 },
        { name: "ramp-2.1", i: -1, j: 2, mirror: true },
        { name: "wave", i: -1, j: 0 },
        { name: "uturn-l", i: 1, j: 1 },
    ],
};
var demo2 = {
    balls: [
        { x: 0.45223644798326457, y: -0.14555925508040052 },
        { x: 0.4542039643251569, y: -0.06168364093616862 },
        { x: 0.4554387140880808, y: 0.021382350340019358 },
        { x: 0.4552031364946579, y: 0.10582023181972072 },
        { x: 0.45496577489396894, y: 0.19089755354340562 },
        { x: 0.4265645074593439, y: -0.14331937155899638 },
        { x: 0.40186220720561006, y: -0.1411542072522732 },
        { x: 0.37693605105079203, y: -0.1396427223486105 },
    ],
    parts: [
        { name: "loop", i: 0, j: -11, mirror: true },
        { name: "uturn-s", i: -1, j: -8, mirror: true },
        { name: "loop", i: 0, j: -7 },
        { name: "uturn-s", i: 2, j: -4, mirror: false },
        { name: "loop", i: 0, j: -3, mirror: true },
        { name: "uturn-s", i: -1, j: 0, mirror: true },
        { name: "loop", i: 0, j: 1 },
        { name: "elevator-17", i: 3, j: -12 },
        { name: "ramp-1.0", i: 2, j: -11 },
        { name: "ramp-1.1", i: 2, j: 4 },
    ],
};
var demo3 = {
    balls: [
        { x: 0.7063794660954964, y: -0.017640293121974498 },
        { x: -0.2545074285696747, y: 0.011180937689018683 },
        { x: -0.2758915101890289, y: 0.009329840802149077 },
        { x: -0.29715393742768725, y: 0.006889463425232776 },
        { x: -0.2338259732929349, y: 0.012309514338496433 },
        { x: 0.6846401424366063, y: -0.012845692941125794 },
        { x: 0.7279805421426728, y: -0.020679194039995234 },
        { x: 0.749056170630838, y: -0.025222985367312198 },
    ],
    parts: [
        { name: "elevator-14", i: 5, j: -13 },
        { name: "elevator-14", i: -2, j: -14, mirror: true },
        { name: "spiral", i: 0, j: -12 },
        { name: "loop", i: 3, j: -12, mirror: true },
        { name: "ramp-1.1", i: 3, j: -8 },
        { name: "uturn-s", i: 4, j: -7 },
        { name: "uturn-l", i: 0, j: -2 },
        { name: "ramp-1.1", i: -1, j: -1, mirror: true },
        { name: "uturn-s", i: 4, j: -3 },
        { name: "uturn-s", i: 1, j: -5, mirror: true },
        { name: "ramp-2.1", i: 2, j: -6, mirror: true },
        { name: "uturn-s", i: 2, j: -2, mirror: true },
        { name: "ramp-2.1", i: 2, j: -4 },
        { name: "uturn-l", i: 1, j: -7 },
        { name: "uturn-s", i: -1, j: -3, mirror: true },
        { name: "uturn-s", i: -1, j: -5, mirror: true },
        { name: "uturn-s", i: 0, j: -4 },
        { name: "ramp-1.1", i: 0, j: -6, mirror: true },
        { name: "ramp-1.1", i: -1, j: -13 },
        { name: "ramp-2.1", i: 1, j: -9, mirror: true },
        { name: "uturn-s", i: 0, j: -8, mirror: true },
        { name: "ramp-1.0", i: 3, j: -2, mirror: true },
        { name: "ramp-2.2", i: 3, j: -1 },
        { name: "rampX-2.1", i: 1, j: -9 },
    ],
};
class HelperShape {
    constructor() {
        this.show = true;
        this.showCircle = false;
        this.showGrid = false;
        this.circleRadius = 350;
        this.gridSize = 100;
    }
    setShow(b) {
        this.show = b;
        this.update();
    }
    setShowCircle(b) {
        this.showCircle = b;
        this.update();
    }
    setCircleRadius(r) {
        this.circleRadius = Math.max(Math.min(r, 500), 50);
        this.update();
    }
    setShowGrid(b) {
        this.showGrid = b;
        this.update();
    }
    setGridSize(s) {
        this.gridSize = Math.max(Math.min(s, 500), 50);
        this.gridSize = s;
        this.update();
    }
    update() {
        if (!this.svg) {
            this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.svg.setAttribute("width", "1000");
            this.svg.setAttribute("height", "1000");
            this.svg.setAttribute("viewBox", "0 0 1000 1000");
            this.svg.style.position = "fixed";
            this.svg.style.width = "min(100vw, 100vh)";
            this.svg.style.height = "min(100vw, 100vh)";
            this.svg.style.left = "calc((100vw - min(100vw, 100vh)) * 0.5)";
            this.svg.style.top = "calc((100vh - min(100vw, 100vh)) * 0.5)";
            this.svg.style.zIndex = "1";
            this.svg.style.pointerEvents = "none";
            document.body.appendChild(this.svg);
        }
        this.svg.innerHTML = "";
        if (this.show && this.showCircle) {
            let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "black");
            circle.setAttribute("stroke-width", "1");
            circle.setAttribute("cx", "500");
            circle.setAttribute("cy", "500");
            circle.setAttribute("r", this.circleRadius.toFixed(1));
            this.svg.appendChild(circle);
            for (let i = 0; i < 32; i++) {
                let graduation = document.createElementNS("http://www.w3.org/2000/svg", "line");
                graduation.setAttribute("stroke", "black");
                graduation.setAttribute("stroke-width", "1");
                graduation.setAttribute("x1", (500 + this.circleRadius - 20).toFixed(1));
                graduation.setAttribute("y1", "500");
                graduation.setAttribute("x2", (500 + this.circleRadius + 20).toFixed(1));
                graduation.setAttribute("y2", "500");
                graduation.setAttribute("transform", "rotate(" + (i * 360 / 32).toFixed(1) + " 500 500)");
                this.svg.appendChild(graduation);
            }
        }
        if (this.show && this.showGrid) {
            let count = Math.round(500 / this.gridSize);
            for (let i = 1; i < count; i++) {
                let d = i * this.gridSize;
                let lineTop = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineTop.setAttribute("stroke", "black");
                lineTop.setAttribute("stroke-width", "1");
                lineTop.setAttribute("x1", "0");
                lineTop.setAttribute("y1", (500 - d).toFixed(1));
                lineTop.setAttribute("x2", "1000");
                lineTop.setAttribute("y2", (500 - d).toFixed(1));
                this.svg.appendChild(lineTop);
                let lineBottom = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineBottom.setAttribute("stroke", "black");
                lineBottom.setAttribute("stroke-width", "1");
                lineBottom.setAttribute("x1", "0");
                lineBottom.setAttribute("y1", (500 + d).toFixed(1));
                lineBottom.setAttribute("x2", "1000");
                lineBottom.setAttribute("y2", (500 + d).toFixed(1));
                this.svg.appendChild(lineBottom);
                let lineLeft = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineLeft.setAttribute("stroke", "black");
                lineLeft.setAttribute("stroke-width", "1");
                lineLeft.setAttribute("x1", (500 - d).toFixed(1));
                lineLeft.setAttribute("y1", "0");
                lineLeft.setAttribute("x2", (500 - d).toFixed(1));
                lineLeft.setAttribute("y2", "1000");
                this.svg.appendChild(lineLeft);
                let lineRight = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineRight.setAttribute("stroke", "black");
                lineRight.setAttribute("stroke-width", "1");
                lineRight.setAttribute("x1", (500 + d).toFixed(1));
                lineRight.setAttribute("y1", "0");
                lineRight.setAttribute("x2", (500 + d).toFixed(1));
                lineRight.setAttribute("y2", "1000");
                this.svg.appendChild(lineRight);
            }
        }
        if (this.show && (this.showCircle || this.showGrid)) {
            let centerLineH = document.createElementNS("http://www.w3.org/2000/svg", "line");
            centerLineH.setAttribute("stroke", "black");
            centerLineH.setAttribute("stroke-width", "1");
            centerLineH.setAttribute("x1", "0");
            centerLineH.setAttribute("y1", "500");
            centerLineH.setAttribute("x2", "1000");
            centerLineH.setAttribute("y2", "500");
            this.svg.appendChild(centerLineH);
            let centerLineV = document.createElementNS("http://www.w3.org/2000/svg", "line");
            centerLineV.setAttribute("stroke", "black");
            centerLineV.setAttribute("stroke-width", "1");
            centerLineV.setAttribute("x1", "500");
            centerLineV.setAttribute("y1", "0");
            centerLineV.setAttribute("x2", "500");
            centerLineV.setAttribute("y2", "1000");
            this.svg.appendChild(centerLineV);
        }
    }
}
class Machine {
    constructor(game) {
        this.game = game;
        this.tracks = [];
        this.balls = [];
        this.instantiated = false;
        this.playing = false;
        this.onStopCallbacks = new Nabu.UniqueList();
        this.trackFactory = new TrackFactory(this);
    }
    async instantiate() {
        for (let i = 0; i < this.balls.length; i++) {
            await this.balls[i].instantiate();
        }
        for (let i = 0; i < this.tracks.length; i++) {
            await this.tracks[i].instantiate();
        }
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                for (let i = 0; i < this.tracks.length; i++) {
                    this.tracks[i].recomputeAbsolutePath();
                }
                this.instantiated = true;
                resolve();
            });
        });
    }
    dispose() {
        while (this.balls.length > 0) {
            this.balls[0].dispose();
        }
        while (this.tracks.length > 0) {
            this.tracks[0].dispose();
        }
        this.instantiated = false;
    }
    update() {
        if (!this.instantiated) {
            return;
        }
        if (this.playing) {
            let dt = this.game.scene.deltaTime / 1000;
            if (isFinite(dt)) {
                for (let i = 0; i < this.balls.length; i++) {
                    this.balls[i].update(dt);
                }
                for (let i = 0; i < this.tracks.length; i++) {
                    this.tracks[i].update(dt);
                }
            }
        }
    }
    play() {
        this.playing = true;
    }
    stop() {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].reset();
        }
        this.onStopCallbacks.forEach(callback => {
            callback();
        });
        this.playing = false;
    }
    async generateBaseMesh() {
        let minX = -0.15;
        let maxX = 0.15;
        let minY = -0.15;
        let maxY = 0.15;
        for (let i = 0; i < this.tracks.length; i++) {
            let track = this.tracks[i];
            minX = Math.min(minX, track.position.x - tileWidth * 0.5);
            maxX = Math.max(maxX, track.position.x + tileWidth * (track.deltaI + 0.5));
            minY = Math.min(minY, track.position.y - tileHeight * (track.deltaJ + 1));
            maxY = Math.max(maxY, track.position.y);
        }
        let w = maxX - minX;
        let h = maxY - minY;
        let u = w * 4;
        let v = h * 4;
        if (this.baseWall) {
            this.baseWall.dispose();
        }
        this.baseWall = BABYLON.MeshBuilder.CreatePlane("base-wall", { width: h + 0.2, height: w + 0.2, sideOrientation: BABYLON.Mesh.DOUBLESIDE, frontUVs: new BABYLON.Vector4(0, 0, v, u) });
        this.baseWall.position.x = (maxX + minX) * 0.5;
        this.baseWall.position.y = (maxY + minY) * 0.5;
        this.baseWall.position.z += 0.016;
        this.baseWall.rotation.z = Math.PI / 2;
        this.baseWall.material = this.game.woodMaterial;
        if (this.baseFrame) {
            this.baseFrame.dispose();
        }
        this.baseFrame = new BABYLON.Mesh("base-frame");
        this.baseFrame.position.copyFrom(this.baseWall.position);
        this.baseFrame.material = this.game.steelMaterial;
        let vertexDatas = await this.game.vertexDataLoader.get("./meshes/base-frame.babylon");
        let data = Mummu.CloneVertexData(vertexDatas[0]);
        let positions = [...data.positions];
        for (let i = 0; i < positions.length / 3; i++) {
            let x = positions[3 * i];
            let y = positions[3 * i + 1];
            if (x > 0) {
                positions[3 * i] += w * 0.5 - 0.01 + 0.1;
            }
            else if (x < 0) {
                positions[3 * i] -= w * 0.5 - 0.01 + 0.1;
            }
            if (y > 0) {
                positions[3 * i + 1] += h * 0.5 - 0.01 + 0.1;
            }
            else if (y < 0) {
                positions[3 * i + 1] -= h * 0.5 - 0.01 + 0.1;
            }
        }
        data.positions = positions;
        data.applyToMesh(this.baseFrame);
    }
    serialize() {
        let data = {
            balls: [],
            parts: []
        };
        for (let i = 0; i < this.balls.length; i++) {
            data.balls.push({
                x: this.balls[i].positionZero.x,
                y: this.balls[i].positionZero.y,
            });
        }
        for (let i = 0; i < this.tracks.length; i++) {
            data.parts.push({
                name: this.tracks[i].trackName,
                i: this.tracks[i].i,
                j: this.tracks[i].j,
                mirror: this.tracks[i].mirror
            });
        }
        return data;
    }
    deserialize(data) {
        this.balls = [];
        this.tracks = [];
        for (let i = 0; i < data.balls.length; i++) {
            let ballData = data.balls[i];
            let ball = new Ball(new BABYLON.Vector3(ballData.x, ballData.y, 0), this);
            this.balls.push(ball);
        }
        for (let i = 0; i < data.parts.length; i++) {
            let part = data.parts[i];
            let track = this.trackFactory.createTrack(part.name, part.i, part.j, part.mirror);
            this.tracks.push(track);
        }
    }
}
class MachineEditor {
    constructor(game) {
        this.game = game;
        this.items = new Map();
        this._selectedItem = "";
        this._dragOffset = BABYLON.Vector3.Zero();
        this._pointerDownX = 0;
        this._pointerDownY = 0;
        this.pointerDown = (event) => {
            this._pointerDownX = this.game.scene.pointerX;
            this._pointerDownY = this.game.scene.pointerY;
            if (this.selectedObject) {
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh instanceof BallGhost) {
                        return true;
                    }
                    else if (mesh === this.machine.baseWall) {
                        return true;
                    }
                    return false;
                });
                if (pick.hit) {
                    let pickedObject;
                    if (pick.pickedMesh instanceof BallGhost) {
                        pickedObject = pick.pickedMesh.ball;
                    }
                    else {
                        let i = Math.round(pick.pickedPoint.x / tileWidth);
                        let j = Math.floor((-pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                        pickedObject = this.machine.tracks.find(track => {
                            if (track.i <= i) {
                                if ((track.i + track.deltaI) >= i) {
                                    if (track.j <= j) {
                                        if ((track.j + track.deltaJ) >= j) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        });
                    }
                    if (pickedObject === this.selectedObject) {
                        pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                            if (mesh === this.machine.baseWall) {
                                return true;
                            }
                        });
                        if (pick.hit && pick.pickedPoint) {
                            if (this.selectedObject instanceof Track) {
                                this._dragOffset.copyFrom(this.selectedObject.position).subtractInPlace(pick.pickedPoint);
                            }
                            else if (this.selectedObject instanceof Ball) {
                                this._dragOffset.copyFrom(this.selectedObject.positionZero).subtractInPlace(pick.pickedPoint);
                            }
                        }
                        else {
                            this._dragOffset.copyFromFloats(0, 0, 0);
                        }
                        this.setDraggedObject(this.selectedObject);
                    }
                }
            }
        };
        this.pointerMove = (event) => {
            if (this.draggedObject) {
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    return mesh === this.machine.baseWall;
                });
                if (pick.hit) {
                    let point = pick.pickedPoint.add(this._dragOffset);
                    if (this.draggedObject instanceof Track) {
                        let i = Math.round(point.x / tileWidth);
                        let j = Math.floor((-point.y + 0.25 * tileHeight) / tileHeight);
                        if (i != this.draggedObject.i || j != this.draggedObject.j) {
                            this.draggedObject.setI(i);
                            this.draggedObject.setJ(j);
                            this.draggedObject.setIsVisible(true);
                            this.updateActionTile();
                        }
                    }
                    else if (this.draggedObject instanceof Ball) {
                        let p = point.clone();
                        p.z = 0;
                        this.draggedObject.setPositionZero(p);
                        this.draggedObject.setIsVisible(true);
                        this.updateActionTile();
                        if (!this.machine.playing) {
                            this.draggedObject.reset();
                        }
                    }
                }
                else {
                    this.draggedObject.setIsVisible(false);
                }
            }
        };
        this.pointerUp = (event) => {
            if (!this.draggedObject) {
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    return mesh instanceof ActionTile && this.actionTiles.indexOf(mesh) != -1;
                });
                if (pick.hit && pick.pickedMesh instanceof BABYLON.Mesh) {
                    this.onActionTilePointerUp(pick.pickedMesh);
                    return;
                }
            }
            let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                if (!this.draggedObject && mesh instanceof BallGhost) {
                    return true;
                }
                else if (mesh === this.machine.baseWall) {
                    return true;
                }
                return false;
            });
            if (pick.hit) {
                let point = pick.pickedPoint.add(this._dragOffset);
                if (this.draggedObject instanceof Track) {
                    let draggedTrack = this.draggedObject;
                    let i = Math.round(point.x / tileWidth);
                    let j = Math.floor((-point.y + 0.25 * tileHeight) / tileHeight);
                    draggedTrack.setI(i);
                    draggedTrack.setJ(j);
                    if (this.machine.tracks.indexOf(draggedTrack) === -1) {
                        this.machine.tracks.push(draggedTrack);
                    }
                    draggedTrack.setIsVisible(true);
                    draggedTrack.generateWires();
                    draggedTrack.instantiate().then(() => {
                        draggedTrack.recomputeAbsolutePath();
                        this.setSelectedObject(draggedTrack);
                        this.setDraggedObject(undefined);
                        this.setSelectedItem("");
                        this.machine.generateBaseMesh();
                    });
                }
                else if (this.draggedObject instanceof Ball) {
                    let p = point.clone();
                    p.z = 0;
                    this.draggedObject.setPositionZero(p);
                    if (this.machine.balls.indexOf(this.draggedObject) === -1) {
                        this.machine.balls.push(this.draggedObject);
                    }
                    this.draggedObject.setIsVisible(true);
                    this.draggedObject.reset();
                    this.setSelectedObject(this.draggedObject);
                    this.setDraggedObject(undefined);
                    this.setSelectedItem("");
                }
                else {
                    let dx = (this._pointerDownX - this.game.scene.pointerX);
                    let dy = (this._pointerDownY - this.game.scene.pointerY);
                    if (dx * dx + dy * dy < 10) {
                        if (pick.pickedMesh instanceof BallGhost) {
                            this.setSelectedObject(pick.pickedMesh.ball);
                        }
                        else if (pick.pickedMesh === this.machine.baseWall) {
                            let i = Math.round(pick.pickedPoint.x / tileWidth);
                            let j = Math.floor((-pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                            let pickedTrack = this.machine.tracks.find(track => {
                                if (track.i <= i) {
                                    if ((track.i + track.deltaI) >= i) {
                                        if (track.j <= j) {
                                            if ((track.j + track.deltaJ) >= j) {
                                                return true;
                                            }
                                        }
                                    }
                                }
                            });
                            this.setSelectedObject(pickedTrack);
                        }
                    }
                }
            }
        };
        this.actionTileSize = 0.018;
        this.container = document.getElementById("machine-menu");
        this.itemContainer = this.container.querySelector("#machine-editor-item-container");
    }
    get machine() {
        return this.game.machine;
    }
    get selectedItem() {
        return this._selectedItem;
    }
    setSelectedItem(s) {
        if (s != this._selectedItem) {
            let e = this.getCurrentItemElement();
            if (e) {
                e.classList.remove("selected");
            }
            this._selectedItem = s;
            e = this.getCurrentItemElement();
            if (e) {
                e.classList.add("selected");
            }
        }
    }
    get draggedObject() {
        return this._draggedTrack;
    }
    setDraggedObject(s) {
        if (s != this._draggedTrack) {
            this._draggedTrack = s;
            if (this._draggedTrack) {
                this.game.camera.detachControl();
            }
            else {
                this.game.camera.attachControl();
            }
        }
    }
    get selectedObject() {
        return this._selectedObject;
    }
    setSelectedObject(s) {
        if (this._selectedObject) {
            this._selectedObject.unselect();
        }
        if (s != this._selectedObject) {
            this._selectedObject = s;
        }
        if (this._selectedObject) {
            this._selectedObject.select();
        }
        this.updateActionTile();
    }
    async instantiate() {
        document.getElementById("machine-editor-objects").style.display = "block";
        document.getElementById("machine-file").style.display = "flex";
        let ballItem = document.createElement("div");
        ballItem.classList.add("machine-editor-item");
        ballItem.style.backgroundImage = "url(./datas/icons/ball.png)";
        ballItem.style.backgroundSize = "cover";
        ballItem.innerText = "ball";
        this.itemContainer.appendChild(ballItem);
        this.items.set("ball", ballItem);
        ballItem.addEventListener("pointerdown", () => {
            if (this.draggedObject) {
                this.draggedObject.dispose();
                this.setDraggedObject(undefined);
            }
            if (this.selectedItem === "ball") {
                this.setSelectedItem("");
            }
            else {
                this.setSelectedItem("ball");
                let ball = new Ball(BABYLON.Vector3.Zero(), this.machine);
                ball.instantiate().then(() => {
                    ball.setShowPositionZeroGhost(true);
                    ball.setIsVisible(false);
                });
                this.setDraggedObject(ball);
                this._dragOffset.copyFromFloats(0, 0, 0);
            }
        });
        for (let i = 0; i < TrackNames.length; i++) {
            let trackname = TrackNames[i];
            let item = document.createElement("div");
            item.classList.add("machine-editor-item");
            item.style.backgroundImage = "url(./datas/icons/" + trackname + ".png)";
            item.style.backgroundSize = "cover";
            item.innerText = trackname.split("-")[0];
            this.itemContainer.appendChild(item);
            this.items.set(trackname, item);
            item.addEventListener("pointerdown", () => {
                if (this.draggedObject) {
                    this.draggedObject.dispose();
                    this.setDraggedObject(undefined);
                }
                if (this.selectedItem === trackname) {
                    this.setSelectedItem("");
                }
                else {
                    this.setSelectedItem(trackname);
                    let track = this.machine.trackFactory.createTrack(this._selectedItem, -10, -10);
                    track.instantiate().then(() => {
                        track.setIsVisible(false);
                    });
                    this.setDraggedObject(track);
                    this._dragOffset.copyFromFloats(0, 0, 0);
                }
            });
        }
        document.addEventListener("keyup", (event) => {
            if (event.key === "x") {
                if (this.selectedObject) {
                    this.selectedObject.dispose();
                    this.setSelectedObject(undefined);
                    this.setDraggedObject(undefined);
                }
            }
            else if (event.key === "m") {
                if (this.draggedObject && this.draggedObject instanceof Track) {
                    this.mirrorTrackInPlace(this.draggedObject).then(track => {
                        this.setDraggedObject(track);
                    });
                }
                else if (this.selectedObject && this.selectedObject instanceof Track) {
                    this.mirrorTrackInPlace(this.selectedObject).then(track => {
                        this.setSelectedObject(track);
                    });
                }
            }
        });
        this.game.canvas.addEventListener("pointerdown", this.pointerDown);
        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);
        document.getElementById("machine-editor-save").addEventListener("click", () => {
            let data = this.machine.serialize();
            window.localStorage.setItem("last-saved-machine", JSON.stringify(data));
            Nabu.download("my-marble-machine.json", JSON.stringify(data));
        });
        document.getElementById("machine-editor-load-input").addEventListener("change", (event) => {
            let files = event.target.files;
            let file = files[0];
            if (file) {
                const reader = new FileReader();
                reader.addEventListener('load', (event) => {
                    this.machine.dispose();
                    this.machine.deserialize(JSON.parse(event.target.result));
                    this.machine.instantiate();
                    this.machine.generateBaseMesh();
                    for (let i = 0; i < this.machine.balls.length; i++) {
                        this.machine.balls[i].setShowPositionZeroGhost(true);
                    }
                });
                reader.readAsText(file);
            }
        });
        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }
        this.actionTileHPlusTop = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHPlusTop.instantiate();
        this.actionTileHPlusTop.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileHMinusTop = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHMinusTop.instantiate();
        this.actionTileHMinusTop.rotation.z = Math.PI;
        this.actionTileHMinusTop.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileWPlusRight = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWPlusRight.instantiate();
        this.actionTileWPlusRight.rotation.z = -Math.PI / 2;
        this.actionTileWPlusRight.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileWMinusRight = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWMinusRight.instantiate();
        this.actionTileWMinusRight.rotation.z = Math.PI / 2;
        this.actionTileWMinusRight.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileHDownBottom = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHDownBottom.instantiate();
        this.actionTileHDownBottom.rotation.z = Math.PI;
        this.actionTileHDownBottom.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileHUpBottom = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHUpBottom.instantiate();
        this.actionTileHUpBottom.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileWPlusLeft = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWPlusLeft.instantiate();
        this.actionTileWPlusLeft.rotation.z = Math.PI / 2;
        this.actionTileWPlusLeft.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileWMinusLeft = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWMinusLeft.instantiate();
        this.actionTileWMinusLeft.rotation.z = -Math.PI / 2;
        this.actionTileWMinusLeft.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");
        this.actionTileDelete = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileDelete.instantiate();
        this.actionTileDelete.texture.drawText("x", 20, 45, "50px 'Arial'", "white", "black");
        this.actionTileMirror = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileMirror.instantiate();
        this.actionTileMirror.texture.drawText("< >", 5, 44, "37px 'Arial'", "white", "black");
        this.actionTiles = [
            this.actionTileHPlusTop,
            this.actionTileHMinusTop,
            this.actionTileWPlusRight,
            this.actionTileWMinusRight,
            this.actionTileHDownBottom,
            this.actionTileHUpBottom,
            this.actionTileWPlusLeft,
            this.actionTileWMinusLeft,
            this.actionTileDelete,
            this.actionTileMirror
        ];
        this.updateActionTile();
    }
    dispose() {
        document.getElementById("machine-editor-objects").style.display = "none";
        document.getElementById("machine-file").style.display = "none";
        this.itemContainer.innerHTML = "";
        this.items = new Map();
        this.game.canvas.removeEventListener("pointerdown", this.pointerDown);
        this.game.canvas.removeEventListener("pointermove", this.pointerMove);
        this.game.canvas.removeEventListener("pointerup", this.pointerUp);
        this.actionTiles.forEach(tile => {
            tile.dispose();
        });
        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(false);
        }
    }
    update() {
        let ratio = this.game.engine.getRenderWidth() / this.game.engine.getRenderHeight();
        if (ratio > 1) {
            this.container.classList.add("left");
            this.container.classList.remove("bottom");
        }
        else {
            this.container.classList.add("bottom");
            this.container.classList.remove("left");
        }
    }
    async editTrackInPlace(track, i, j, w, h, mirror) {
        if (!isFinite(i)) {
            i = track.i;
        }
        if (!isFinite(j)) {
            j = track.j;
        }
        if (!mirror) {
            mirror = track.mirror;
        }
        let editedTrack = this.machine.trackFactory.createTrackWH(track.trackName, i, j, w, h, mirror);
        track.dispose();
        this.machine.tracks.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        await editedTrack.instantiate();
        editedTrack.recomputeAbsolutePath();
        this.machine.generateBaseMesh();
        return editedTrack;
    }
    async mirrorTrackInPlace(track) {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.trackName, track.i, track.j, !track.mirror);
        track.dispose();
        this.machine.tracks.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate();
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }
    getCurrentItemElement() {
        return this.items.get(this._selectedItem);
    }
    updateActionTile() {
        this.actionTiles.forEach(tile => {
            tile.setIsVisible(false);
        });
        if (this.selectedObject) {
            let s = this.actionTileSize;
            if (this.selectedObject instanceof Ball) {
                this.actionTileDelete.setIsVisible(true);
                this.actionTileDelete.position.x = 0;
                this.actionTileDelete.position.y = -this.selectedObject.radius - 1.2 * s;
                this.actionTileDelete.position.addInPlace(this.selectedObject.positionZeroGhost.position);
            }
            else if (this.selectedObject instanceof Track) {
                let s34 = 3 * s / 4;
                let xLeft = -tileWidth * 0.5;
                let xRight = tileWidth * (this.selectedObject.deltaI + 0.5);
                let xCenter = (xLeft + xRight) * 0.5;
                let yTop = tileHeight * 0.25;
                let yBottom = -tileHeight * (this.selectedObject.deltaJ + 0.75);
                let yCenter = (yTop + yBottom) * 0.5;
                this.actionTileHPlusTop.position.x = xCenter - s34;
                this.actionTileHPlusTop.position.y = yTop + s;
                this.actionTileHMinusTop.position.x = xCenter + s34;
                this.actionTileHMinusTop.position.y = yTop + s;
                this.actionTileWPlusRight.position.x = xRight + s;
                this.actionTileWPlusRight.position.y = yCenter + s34;
                this.actionTileWMinusRight.position.x = xRight + s;
                this.actionTileWMinusRight.position.y = yCenter - s34;
                this.actionTileHUpBottom.position.x = xCenter - s34;
                this.actionTileHUpBottom.position.y = yBottom - s;
                this.actionTileHDownBottom.position.x = xCenter + s34;
                this.actionTileHDownBottom.position.y = yBottom - s;
                this.actionTileWPlusLeft.position.x = xLeft - s;
                this.actionTileWPlusLeft.position.y = yCenter + s34;
                this.actionTileWMinusLeft.position.x = xLeft - s;
                this.actionTileWMinusLeft.position.y = yCenter - s34;
                this.actionTileMirror.position.x = xRight - 0.5 * s;
                this.actionTileMirror.position.y = yBottom - s;
                this.actionTileDelete.position.x = xRight - 0.5 * s;
                this.actionTileDelete.position.y = yTop + s;
                if (this.selectedObject.xExtendable) {
                    this.actionTileWMinusRight.setIsVisible(true);
                    this.actionTileWPlusRight.setIsVisible(true);
                    this.actionTileWMinusLeft.setIsVisible(true);
                    this.actionTileWPlusLeft.setIsVisible(true);
                }
                if (this.selectedObject.yExtendable) {
                    this.actionTileHMinusTop.setIsVisible(true);
                    this.actionTileHPlusTop.setIsVisible(true);
                    this.actionTileHUpBottom.setIsVisible(true);
                    this.actionTileHDownBottom.setIsVisible(true);
                }
                this.actionTileDelete.setIsVisible(true);
                this.actionTileMirror.setIsVisible(true);
                this.actionTiles.forEach(tile => {
                    tile.position.addInPlace(this.selectedObject.position);
                });
            }
        }
    }
    async onActionTilePointerUp(tile) {
        if (this.selectedObject) {
            if (tile === this.actionTileDelete) {
                this.selectedObject.dispose();
                this.setSelectedObject(undefined);
                this.setDraggedObject(undefined);
            }
            else if (this.selectedObject instanceof Track) {
                let track = this.selectedObject;
                if (tile === this.actionTileHPlusTop) {
                    if (track.yExtendable) {
                        let h = track.h + 1;
                        let j = track.j - 1;
                        let editedTrack = await this.editTrackInPlace(track, undefined, j, track.xExtendable ? track.w : undefined, h);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileHMinusTop) {
                    if (track.yExtendable) {
                        let h = track.h - 1;
                        let j = track.j + 1;
                        if (h >= 0) {
                            let editedTrack = await this.editTrackInPlace(track, undefined, j, track.xExtendable ? track.w : undefined, h);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileWPlusRight) {
                    if (track.xExtendable) {
                        let w = track.w + 1;
                        let editedTrack = await this.editTrackInPlace(track, undefined, undefined, w, track.yExtendable ? track.h : undefined);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileWMinusRight) {
                    if (track.xExtendable) {
                        let w = track.w - 1;
                        if (w >= 1) {
                            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, w, track.yExtendable ? track.h : undefined);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileHDownBottom) {
                    if (track.yExtendable) {
                        let h = track.h + 1;
                        let editedTrack = await this.editTrackInPlace(track, undefined, undefined, track.xExtendable ? track.w : undefined, h);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileHUpBottom) {
                    if (track.yExtendable) {
                        let h = track.h - 1;
                        if (h >= 0) {
                            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, track.xExtendable ? track.w : undefined, h);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileWPlusLeft) {
                    if (track.xExtendable) {
                        let i = track.i - 1;
                        let w = track.w + 1;
                        let editedTrack = await this.editTrackInPlace(track, i, undefined, w, track.yExtendable ? track.h : undefined);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileWMinusLeft) {
                    if (track.xExtendable) {
                        let i = track.i + 1;
                        let w = track.w - 1;
                        if (w >= 1) {
                            let editedTrack = await this.editTrackInPlace(track, i, undefined, w, track.yExtendable ? track.h : undefined);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileMirror) {
                    track = await this.mirrorTrackInPlace(track);
                    this.setSelectedObject(track);
                }
            }
        }
    }
}
/// <reference path="../lib/babylon.d.ts"/>
/// <reference path="../../nabu/nabu.d.ts"/>
/// <reference path="../../mummu/mummu.d.ts"/>
function addLine(text) {
    let e = document.createElement("div");
    e.classList.add("debug-log");
    e.innerText = text;
    document.body.appendChild(e);
}
var GameMode;
(function (GameMode) {
    GameMode[GameMode["MainMenu"] = 0] = "MainMenu";
    GameMode[GameMode["CreateMode"] = 1] = "CreateMode";
    GameMode[GameMode["DemoMode"] = 2] = "DemoMode";
    GameMode[GameMode["Credit"] = 3] = "Credit";
})(GameMode || (GameMode = {}));
class Game {
    constructor(canvasElement) {
        this.cameraOrtho = false;
        this.targetTimeFactor = 0.8;
        this.timeFactor = 0.1;
        this.physicDT = 0.001;
        this._animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;
        this._animateCameraTarget = Mummu.AnimationFactory.EmptyVector3Callback;
        this.onPointerEvent = (eventData, eventState) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                let pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
                    if (mesh instanceof MenuTile && this.tiles.indexOf(mesh) != -1) {
                        return true;
                    }
                    else if (mesh.parent && mesh.parent instanceof MenuTile && this.tiles.indexOf(mesh.parent) != -1) {
                        return true;
                    }
                    return false;
                });
                if (pick.hit) {
                    let tile;
                    if (pick.pickedMesh instanceof MenuTile) {
                        tile = pick.pickedMesh;
                    }
                    else if (pick.pickedMesh.parent instanceof MenuTile) {
                        tile = pick.pickedMesh.parent;
                    }
                    if (tile === this.tileCreate) {
                        this.pressTile(tile).then(async () => {
                            this.setContext(GameMode.CreateMode);
                        });
                    }
                    else if (tile === this.tileDemo1) {
                        this.pressTile(tile).then(async () => {
                            this.machine.dispose();
                            this.machine.deserialize(demo1);
                            await this.machine.instantiate();
                            await this.machine.generateBaseMesh();
                            this.setContext(GameMode.DemoMode, 1);
                        });
                    }
                    else if (tile === this.tileDemo2) {
                        this.pressTile(tile).then(async () => {
                            this.machine.dispose();
                            this.machine.deserialize(demo2);
                            await this.machine.instantiate();
                            await this.machine.generateBaseMesh();
                            this.setContext(GameMode.DemoMode, 2);
                        });
                    }
                    else if (tile === this.tileDemo3) {
                        this.pressTile(tile).then(async () => {
                            this.machine.dispose();
                            this.machine.deserialize(demo3);
                            await this.machine.instantiate();
                            await this.machine.generateBaseMesh();
                            this.setContext(GameMode.DemoMode, 3);
                        });
                    }
                    else if (tile === this.tileCredit) {
                        this.pressTile(tile).then(async () => {
                            this.setContext(GameMode.Credit);
                        });
                    }
                }
            }
        };
        Game.Instance = this;
        this.canvas = document.getElementById(canvasElement);
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
        this.engine = new BABYLON.Engine(this.canvas, true);
        BABYLON.Engine.ShadersRepository = "./shaders/";
    }
    async createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.vertexDataLoader = new Mummu.VertexDataLoader(this.scene);
        this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
        this.light = new BABYLON.HemisphericLight("light", (new BABYLON.Vector3(2, 2, -2)).normalize(), this.scene);
        this.handleMaterial = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterial.diffuseColor.copyFromFloats(0, 1, 1);
        this.handleMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterial.alpha = 0.5;
        this.handleMaterialActive = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterialActive.diffuseColor.copyFromFloats(0.5, 1, 0.5);
        this.handleMaterialActive.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterialActive.alpha = 0.5;
        this.handleMaterialHover = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterialHover.diffuseColor.copyFromFloats(0.75, 1, 0.75);
        this.handleMaterialHover.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterialHover.alpha = 0.5;
        this.insertHandleMaterial = new BABYLON.StandardMaterial("handle-material");
        this.insertHandleMaterial.diffuseColor.copyFromFloats(1, 0.5, 0.5);
        this.insertHandleMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.insertHandleMaterial.alpha = 0.5;
        this.ghostMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.ghostMaterial.diffuseColor.copyFromFloats(0.8, 0.8, 1);
        this.ghostMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.ghostMaterial.alpha = 0.3;
        this.steelMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.steelMaterial.baseColor = new BABYLON.Color3(0.5, 0.75, 1.0);
        this.steelMaterial.metallic = 1.0; // set to 1 to only use it from the metallicRoughnessTexture
        this.steelMaterial.roughness = 0.15; // set to 1 to only use it from the metallicRoughnessTexture
        this.steelMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);
        this.woodMaterial = new BABYLON.StandardMaterial("wood-material");
        this.woodMaterial.diffuseColor.copyFromFloats(0.3, 0.3, 0.3);
        this.woodMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/wood-color.jpg");
        this.woodMaterial.ambientTexture = new BABYLON.Texture("./datas/textures/wood-ambient-occlusion.jpg");
        this.woodMaterial.specularTexture = new BABYLON.Texture("./datas/textures/wood-roughness.jpg");
        this.woodMaterial.specularColor.copyFromFloats(0.2, 0.2, 0.2);
        this.woodMaterial.bumpTexture = new BABYLON.Texture("./datas/textures/wood-normal-2.png");
        this.leatherMaterial = new BABYLON.StandardMaterial("wood-material");
        this.leatherMaterial.diffuseColor.copyFromFloats(0.05, 0.02, 0.02);
        this.leatherMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.deepBlackMaterial = new BABYLON.StandardMaterial("deep-black-material");
        this.deepBlackMaterial.diffuseColor.copyFromFloats(0, 0, 0.);
        this.deepBlackMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 10 / Math.sqrt(3) }, this.scene);
        this.skybox.rotation.y = Math.PI / 2;
        let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new BABYLON.CubeTexture("./datas/skyboxes/skybox", this.scene, ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"]);
        skyboxMaterial.reflectionTexture = skyTexture;
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.skybox.material = skyboxMaterial;
        this.camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 1, BABYLON.Vector3.Zero());
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 10000;
        this.camera.lowerRadiusLimit = 0.05;
        this.camera.upperRadiusLimit = 2;
        this.camera.angularSensibilityX = 2000;
        this.camera.angularSensibilityY = 2000;
        this.camera.pinchPrecision = 10000;
        let savedTarget = window.localStorage.getItem("saved-target");
        if (savedTarget) {
            let target = JSON.parse(savedTarget);
            this.camera.target.x = target.x;
            this.camera.target.y = target.y;
            this.camera.target.z = target.z;
        }
        let savedPos = window.localStorage.getItem("saved-pos");
        if (savedPos) {
            let pos = JSON.parse(savedPos);
            this.camera.setPosition(new BABYLON.Vector3(pos.x, pos.y, pos.z));
        }
        /*
        let savedRot = window.localStorage.getItem("saved-rot");
        if (savedRot) {
            let rot = JSON.parse(savedRot);
            (this.camera as BABYLON.FreeCamera).rotation.x = rot.x;
            (this.camera as BABYLON.FreeCamera).rotation.y = rot.y;
            (this.camera as BABYLON.FreeCamera).rotation.z = rot.z;
        }
        */
        let savedCameraOrtho = window.localStorage.getItem("saved-cam-ortho");
        if (savedCameraOrtho === "true") {
            this.cameraOrtho = true;
        }
        this.camera.attachControl();
        this.camera.getScene();
        this._animateCamera = Mummu.AnimationFactory.CreateNumbers(this.camera, this.camera, ["alpha", "beta", "radius"], undefined, [true, true, false]);
        this._animateCameraTarget = Mummu.AnimationFactory.CreateVector3(this.camera, this.camera, "target");
        this.machine = new Machine(this);
        this.machineEditor = new MachineEditor(this);
        this.machine.deserialize(demo1);
        let blackboardTex = document.getElementById("blackboard-tex");
        this.tileMenuContainer = new BABYLON.Mesh("menu");
        this.tileMenuContainer.position.y = -10;
        this.tileMenuContainer.position.z = 1;
        document.getElementById("machine-buttons").style.display = "none";
        this.tileDemo1 = new MenuTile("tile-demo-1", 0.05, 0.075, this);
        await this.tileDemo1.instantiate();
        this.tileDemo1.position.x = -0.09;
        this.tileDemo1.position.y = 0.055;
        this.tileDemo1.parent = this.tileMenuContainer;
        this.tileDemo2 = new MenuTile("tile-demo-2", 0.05, 0.075, this);
        await this.tileDemo2.instantiate();
        this.tileDemo2.position.y = 0.075;
        this.tileDemo2.parent = this.tileMenuContainer;
        this.tileDemo3 = new MenuTile("tile-demo-3", 0.05, 0.075, this);
        await this.tileDemo3.instantiate();
        this.tileDemo3.position.x = 0.09;
        this.tileDemo3.position.y = 0.055;
        this.tileDemo3.parent = this.tileMenuContainer;
        this.tileCreate = new MenuTile("tile-create", 0.16, 0.05, this);
        await this.tileCreate.instantiate();
        this.tileCreate.position.x = 0;
        this.tileCreate.position.y = -0.03;
        this.tileCreate.parent = this.tileMenuContainer;
        this.tileCredit = new MenuTile("tile-credit", 0.08, 0.025, this);
        await this.tileCredit.instantiate();
        this.tileCredit.position.x = 0.07;
        this.tileCredit.position.y = -0.09;
        this.tileCredit.parent = this.tileMenuContainer;
        let creditPlaque = new MenuTile("credit-plaque", 0.2, 0.15, this);
        await creditPlaque.instantiate();
        creditPlaque.material.emissiveColor.copyFromFloats(1, 1, 1);
        creditPlaque.position.x = 0;
        creditPlaque.position.y = 0;
        creditPlaque.position.z = 0.13;
        creditPlaque.rotation.y = Math.PI;
        this.tiles = [this.tileDemo1, this.tileDemo2, this.tileDemo3, this.tileCreate, this.tileCredit];
        let doDrawTileMenuTextures = () => {
            let ctx = this.tileDemo1.texture.getContext();
            let w = this.tileDemo1.texW;
            let h = this.tileDemo1.texH;
            ctx.drawImage(blackboardTex, 0, 0);
            this.tileDemo1.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", null);
            this.tileDemo1.texture.drawText("I", 129, 270, "128px 'Serif'", "white", null);
            ctx = this.tileDemo2.texture.getContext();
            w = this.tileDemo2.texW;
            h = this.tileDemo2.texH;
            ctx.drawImage(blackboardTex, 100, 150, w, h, 0, 0, w, h);
            this.tileDemo2.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", null);
            this.tileDemo2.texture.drawText("II", 107, 270, "128px 'Serif'", "white", null);
            ctx = this.tileDemo3.texture.getContext();
            w = this.tileDemo3.texW;
            h = this.tileDemo3.texH;
            ctx.drawImage(blackboardTex, 50, 200, w, h, 0, 0, w, h);
            this.tileDemo3.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", null);
            this.tileDemo3.texture.drawText("III", 86, 270, "128px 'Serif'", "white", null);
            ctx = this.tileCreate.texture.getContext();
            w = this.tileCreate.texW;
            h = this.tileCreate.texH;
            ctx.drawImage(blackboardTex, 200, 300, w, h, 0, 0, w, h);
            this.tileCreate.texture.drawText("CREATE", 70, 140, "100px 'Serif'", "white", null);
            this.tileCreate.texture.drawText("your own machine", 70, 230, "60px 'Serif'", "#8a8674", null);
            ctx = this.tileCredit.texture.getContext();
            w = this.tileCredit.texW;
            h = this.tileCredit.texH;
            ctx.drawImage(blackboardTex, 80, 200, w, h, 0, 0, w, h);
            this.tileCredit.texture.drawText("CREDIT", 70, 100, "70px 'Serif'", "white", null);
            ctx = creditPlaque.texture.getContext();
            w = creditPlaque.texW;
            h = creditPlaque.texH;
            ctx.drawImage(blackboardTex, 80, 200, w, h, 0, 0, w, h);
            creditPlaque.texture.drawText("DESIGN, ART & CODE", 140, 200, "70px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Sven Frankson", 70, 300, "70px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Powered by BABYLONJS", 70, 450, "50px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Blackboard texture from FREEPIK", 70, 550, "50px 'Serif'", "white", null);
            creditPlaque.texture.drawText("CC0 Wood material from TEXTURECAN", 70, 650, "50px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Find license file on GitHub for related urls", 70, 750, "40px 'Serif'", "#8a8674", null);
        };
        if (blackboardTex.complete) {
            doDrawTileMenuTextures();
        }
        else {
            blackboardTex.addEventListener("load", doDrawTileMenuTextures);
        }
        await this.machine.instantiate();
        await this.machine.generateBaseMesh();
        document.getElementById("track-editor-menu").style.display = "none";
        document.getElementById("machine-play").onclick = () => {
            if (this.machine) {
                this.machine.play();
            }
        };
        document.getElementById("machine-stop").onclick = () => {
            if (this.machine) {
                this.machine.stop();
            }
        };
        document.getElementById("machine-back-main-menu").onclick = () => {
            this.setContext(GameMode.MainMenu);
        };
        //this.trackEditor = new TrackEditor(this);
        //this.trackEditor.initialize();
        /*
        setTimeout(() => {
            let data = this.machine.serialize();
            this.machine.dispose();
            setTimeout(() => {
                this.machine.deserialize(data);
                this.machine.instantiate();
                
            }, 5000);
        }, 5000);
        */
        this.setContext(GameMode.MainMenu);
        //await this.makeScreenshot("ball");
        /*
        for (let i = 0; i < TrackNames.length; i++) {
            let trackname = TrackNames[i];
            await this.makeScreenshot(trackname);
        }
        */
    }
    animate() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();
        });
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }
    async initialize() {
    }
    update() {
        let pos = this.camera.globalPosition;
        window.localStorage.setItem("saved-pos", JSON.stringify({ x: pos.x, y: pos.y, z: pos.z }));
        //let rot = (this.camera as BABYLON.FreeCamera).rotation;
        //window.localStorage.setItem("saved-rot", JSON.stringify({ x: rot.x, y: rot.y, z: rot.z }));
        let target = this.camera.target;
        window.localStorage.setItem("saved-target", JSON.stringify({ x: target.x, y: target.y, z: target.z }));
        window.localStorage.setItem("saved-cam-ortho", this.cameraOrtho ? "true" : "false");
        let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        if (this.cameraOrtho) {
            let f = this.camera.radius / 4;
            this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            this.camera.orthoTop = 1 * f;
            this.camera.orthoBottom = -1 * f;
            this.camera.orthoLeft = -ratio * f;
            this.camera.orthoRight = ratio * f;
        }
        else {
            this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        }
        if (this.mode === GameMode.MainMenu) {
            this.camera.target.x = 0;
            this.camera.target.y = 0;
        }
        this.camera.target.z = 0;
        if (this.machineEditor) {
            this.machineEditor.update();
        }
        if (this.machine) {
            this.machine.update();
        }
        let dt = this.scene.deltaTime / 1000;
        let fps = 1 / dt;
        if (fps < 30) {
            this.timeFactor *= 0.9;
        }
        else {
            this.timeFactor = this.timeFactor * 0.9 + this.targetTimeFactor * 0.1;
        }
    }
    async setContext(mode, demoIndex) {
        if (this.mode != mode) {
            if (this.mode === GameMode.MainMenu) {
                this.tileMenuContainer.position.y = -10;
                this.tileMenuContainer.position.z = 1;
                document.getElementById("machine-buttons").style.display = "flex";
                this.scene.onPointerObservable.removeCallback(this.onPointerEvent);
            }
            else if (this.mode === GameMode.CreateMode) {
                this.machineEditor.dispose();
            }
            else if (this.mode === GameMode.Credit) {
                await this.setCameraAlphaBeta(0, Math.PI * 0.5, 1 * 0.8 / this.getCameraMinFOV());
            }
            this.mode = mode;
            if (this.mode === GameMode.MainMenu) {
                this.machine.dispose();
                this.machine.deserialize(demo1);
                await this.machine.instantiate();
                await this.machine.generateBaseMesh();
                this.machine.play();
                this.tileMenuContainer.position.y = 0;
                this.tileMenuContainer.position.z = -0.03;
                document.getElementById("machine-buttons").style.display = "none";
                this.setCameraTarget(BABYLON.Vector3.Zero());
                await this.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI * 0.5, 0.35 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = -Math.PI * 0.65;
                this.camera.upperAlphaLimit = -Math.PI * 0.35;
                this.camera.lowerBetaLimit = Math.PI * 0.35;
                this.camera.upperBetaLimit = Math.PI * 0.65;
                this.scene.onPointerObservable.add(this.onPointerEvent);
            }
            else if (this.mode === GameMode.CreateMode) {
                this.machine.dispose();
                this.machine.deserialize(demo1);
                await this.machine.instantiate();
                await this.machine.generateBaseMesh();
                this.machine.stop();
                this.setCameraTarget(BABYLON.Vector3.Zero());
                await this.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI * 0.5, 0.8 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = -Math.PI * 0.95;
                this.camera.upperAlphaLimit = -Math.PI * 0.05;
                this.camera.lowerBetaLimit = Math.PI * 0.05;
                this.camera.upperBetaLimit = Math.PI * 0.95;
                this.machineEditor.instantiate();
            }
            else if (this.mode === GameMode.DemoMode) {
                if (demoIndex === 1) {
                    this.setCameraTarget(BABYLON.Vector3.Zero());
                }
                else if (demoIndex === 2) {
                    this.setCameraTarget(new BABYLON.Vector3(0.08, 0.09, 0));
                }
                else if (demoIndex === 3) {
                    this.setCameraTarget(new BABYLON.Vector3(0.22, 0.15, 0));
                }
                else {
                    this.setCameraTarget(BABYLON.Vector3.Zero());
                }
                await this.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI * 0.5, 0.8 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = -Math.PI * 0.95;
                this.camera.upperAlphaLimit = -Math.PI * 0.05;
                this.camera.lowerBetaLimit = Math.PI * 0.05;
                this.camera.upperBetaLimit = Math.PI * 0.95;
            }
            else if (this.mode === GameMode.Credit) {
                this.setCameraTarget(new BABYLON.Vector3(0, 0, 0.13));
                await this.setCameraAlphaBeta(0, Math.PI * 0.5, 1 * 0.8 / this.getCameraMinFOV());
                await this.setCameraAlphaBeta(Math.PI * 0.5, Math.PI * 0.5, 0.4 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = Math.PI * 0.2;
                this.camera.upperAlphaLimit = Math.PI * 0.8;
                this.camera.lowerBetaLimit = Math.PI * 0.2;
                this.camera.upperBetaLimit = Math.PI * 0.8;
            }
        }
    }
    async setCameraAlphaBeta(alpha, beta, radius) {
        if (!radius) {
            radius = this.camera.radius;
        }
        await this._animateCamera([alpha, beta, radius], 0.8);
    }
    async setCameraTarget(target) {
        await this._animateCameraTarget(target, 0.8);
    }
    async pressTile(tile) {
        let axis = "x";
        if (tile === this.tileCreate || tile === this.tileCredit) {
            axis = "y";
        }
        let anim = Mummu.AnimationFactory.CreateNumber(tile, tile.rotation, axis);
        await anim(-Math.PI / 16, 0.2);
        await anim(0, 0.6);
    }
    async makeScreenshot(objectName) {
        this.machine.baseWall.isVisible = false;
        this.machine.baseFrame.isVisible = false;
        this.skybox.isVisible = false;
        this.camera.alpha = -0.8 * Math.PI / 2;
        this.camera.beta = 0.75 * Math.PI / 2;
        return new Promise(resolve => {
            requestAnimationFrame(async () => {
                this.machine.dispose();
                let track;
                let ball;
                if (objectName === "ball") {
                    ball = new Ball(BABYLON.Vector3.Zero(), this.machine);
                    this.camera.target.copyFromFloats(0, 0, 0);
                    this.camera.radius = 0.1;
                }
                else {
                    track = this.machine.trackFactory.createTrack(objectName, 0, 0);
                    this.camera.radius = 0.25 + Math.max(0.15 * track.deltaI, 0);
                    this.camera.target.copyFromFloats(tileWidth * (track.deltaI * 0.55), -tileHeight * (track.deltaJ) * 0.5, 0);
                }
                if (objectName === "spiral") {
                    this.camera.target.x -= tileWidth * 0.1;
                    this.camera.target.y -= tileHeight * 0.6;
                    this.camera.radius += 0.1;
                }
                if (track) {
                    this.machine.tracks = [track];
                }
                if (ball) {
                    this.machine.balls = [ball];
                }
                await this.machine.instantiate();
                requestAnimationFrame(async () => {
                    await Mummu.MakeScreenshot({ miniatureName: objectName });
                    resolve();
                });
            });
        });
    }
    getCameraMinFOV() {
        let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        let fov = this.camera.fov;
        if (ratio > 1) {
            return fov;
        }
        return fov * ratio;
    }
}
window.addEventListener("DOMContentLoaded", () => {
    //addLine("Kulla Test Scene");
    let main = new Game("render-canvas");
    main.createScene();
    main.initialize().then(() => {
        main.animate();
    });
});
class ActionTile extends BABYLON.Mesh {
    constructor(value, s, game) {
        super(value + "-action-tile");
        this.value = value;
        this.s = s;
        this.game = game;
        this.texture = new BABYLON.DynamicTexture(this.name + "-texture", { width: 64, height: 64 });
    }
    setIsVisible(isVisible) {
        this.isVisible = isVisible;
        this.getChildMeshes().forEach(m => {
            m.isVisible = isVisible;
        });
    }
    async instantiate() {
        BABYLON.CreatePlaneVertexData({ width: this.s, height: this.s }).applyToMesh(this);
        let material = new BABYLON.StandardMaterial("test");
        material.diffuseTexture = this.texture;
        material.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.material = material;
        let frame = new BABYLON.Mesh(this.name + "-frame");
        frame.material = this.game.steelMaterial;
        frame.parent = this;
        this.game.vertexDataLoader.get("./meshes/action-tile-frame.babylon").then(vertexData => {
            let data = Mummu.CloneVertexData(vertexData[0]);
            let positions = [...data.positions];
            for (let i = 0; i < positions.length / 3; i++) {
                let x = positions[3 * i];
                let y = positions[3 * i + 1];
                let z = positions[3 * i + 2];
                if (x > 0) {
                    positions[3 * i] += this.s * 0.5 - 0.001;
                }
                else if (x < 0) {
                    positions[3 * i] -= this.s * 0.5 - 0.001;
                }
                if (y > 0) {
                    positions[3 * i + 1] += this.s * 0.5 - 0.001;
                }
                else if (y < 0) {
                    positions[3 * i + 1] -= this.s * 0.5 - 0.001;
                }
            }
            data.positions = positions;
            data.applyToMesh(frame);
        });
    }
}
class MenuTile extends BABYLON.Mesh {
    constructor(name, w, h, game) {
        super(name);
        this.w = w;
        this.h = h;
        this.game = game;
        this.texW = this.w * this.ppm;
        this.texH = this.h * this.ppm;
        this.texture = new BABYLON.DynamicTexture(this.name + "-texture", { width: this.texW, height: this.texH });
    }
    get ppm() {
        return MenuTile.ppc * 100;
    }
    async instantiate() {
        let button = BABYLON.MeshBuilder.CreateSphere("center", { diameter: 0.001 });
        this.game.vertexDataLoader.get("./meshes/button.babylon").then(vertexData => {
            vertexData[0].applyToMesh(button);
        });
        button.material = this.game.steelMaterial;
        button.parent = this;
        if (this.h >= this.w) {
            button.position.y = -this.h * 0.5 + 0.01;
        }
        else {
            button.position.x = this.w * 0.5 - 0.01;
        }
        button.rotation.x = -Math.PI * 0.5;
        BABYLON.CreatePlaneVertexData({ width: this.w, height: this.h }).applyToMesh(this);
        let material = new BABYLON.StandardMaterial("test");
        material.diffuseTexture = this.texture;
        material.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.material = material;
        let frame = new BABYLON.Mesh(this.name + "-frame");
        frame.material = this.game.steelMaterial;
        frame.parent = this;
        this.game.vertexDataLoader.get("./meshes/menu-tile-frame.babylon").then(vertexData => {
            let data = Mummu.CloneVertexData(vertexData[0]);
            let positions = [...data.positions];
            for (let i = 0; i < positions.length / 3; i++) {
                let x = positions[3 * i];
                let y = positions[3 * i + 1];
                let z = positions[3 * i + 2];
                if (x > 0) {
                    positions[3 * i] += this.w * 0.5 - 0.001;
                }
                else if (x < 0) {
                    positions[3 * i] -= this.w * 0.5 - 0.001;
                }
                if (y > 0) {
                    positions[3 * i + 1] += this.h * 0.5 - 0.001;
                }
                else if (y < 0) {
                    positions[3 * i + 1] -= this.h * 0.5 - 0.001;
                }
            }
            data.positions = positions;
            data.applyToMesh(frame);
        });
    }
}
MenuTile.ppc = 60;
class Sound {
    constructor(prop) {
        if (prop) {
            if (prop.fileName) {
                this._audioElement = new Audio(prop.fileName);
            }
            if (this._audioElement) {
                if (prop.loop) {
                    this._audioElement.loop = prop.loop;
                }
            }
        }
    }
    get volume() {
        return this._audioElement.volume;
    }
    set volume(v) {
        this._audioElement.volume = v;
    }
    play(fromBegin = true) {
        if (this._audioElement) {
            if (fromBegin) {
                this._audioElement.currentTime = 0;
            }
            try {
                this._audioElement.play();
            }
            catch (error) {
                requestAnimationFrame(() => {
                    this._audioElement.play();
                });
            }
        }
    }
    pause() {
        if (this._audioElement) {
            this._audioElement.pause();
        }
    }
}
class TrackPointHandle extends BABYLON.Mesh {
    constructor(trackPoint) {
        super("trackpoint-handle");
        this.trackPoint = trackPoint;
        this._normal = BABYLON.Vector3.Up();
        let data = BABYLON.CreateSphereVertexData({ diameter: 0.6 * this.trackPoint.track.wireGauge });
        data.applyToMesh(this);
        this.position.copyFrom(this.trackPoint.position);
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        this.setNormal(trackPoint.normal);
        this.parent = trackPoint.track;
        let normalIndicator = BABYLON.MeshBuilder.CreateCylinder("normal", { height: this.trackPoint.track.wireGauge, diameter: 0.0005, tessellation: 8 });
        normalIndicator.parent = this;
        normalIndicator.position.copyFromFloats(0, 0.6 * this.trackPoint.track.wireGauge * 0.5 + this.trackPoint.track.wireGauge * 0.5, 0);
        this.setMaterial(this.trackPoint.track.game.handleMaterial);
    }
    get normal() {
        return this._normal;
    }
    setNormal(n) {
        this._normal.copyFrom(n);
        Mummu.QuaternionFromYZAxisToRef(this._normal, this.trackPoint.dir, this.rotationQuaternion);
    }
    setMaterial(material) {
        this.material = material;
        this.getChildMeshes().forEach(m => {
            m.material = material;
        });
    }
}
class TrackEditor {
    constructor(game) {
        this.game = game;
        this.trackPointhandles = [];
        this.offset = BABYLON.Vector3.Zero();
        this.pointerDown = false;
        this.dragTrackPoint = false;
        this.dragNormal = false;
        this.onPointerEvent = (eventData, eventState) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.pointerDown = true;
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh === this.normalHandle) {
                        return true;
                    }
                    else if (mesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(mesh) != -1) {
                        return true;
                    }
                    return false;
                });
                if (pick.hit && this.hoveredTrackPointHandle && pick.pickedMesh === this.hoveredTrackPointHandle) {
                    this.dragNormal = false;
                    this.offset.copyFrom(this.hoveredTrackPointHandle.position).subtractInPlace(pick.pickedPoint);
                    Mummu.QuaternionFromYZAxisToRef(this.game.scene.activeCamera.getDirection(BABYLON.Axis.Z).scale(-1), pick.getNormal(), this.pointerPlane.rotationQuaternion);
                    this.pointerPlane.position.copyFrom(pick.pickedPoint);
                    this.game.scene.activeCamera.detachControl();
                }
                else if (pick.hit && this.selectedTrackPointHandle && pick.pickedMesh === this.normalHandle) {
                    this.dragNormal = true;
                    this.lastPickedPoint = undefined;
                    this.selectedTrackPointHandle.setNormal(this.selectedTrackPoint.normal);
                    Mummu.QuaternionFromZYAxisToRef(this.selectedTrackPointHandle.trackPoint.normal, this.selectedTrackPointHandle.trackPoint.dir, this.pointerPlane.rotationQuaternion);
                    this.pointerPlane.position.copyFrom(this.selectedTrackPointHandle.absolutePosition);
                    this.game.scene.activeCamera.detachControl();
                }
                else {
                    this.dragNormal = false;
                }
            }
            else if (eventData.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                if (this.pointerDown) {
                    let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        return mesh === this.pointerPlane;
                    });
                    if (this.dragNormal) {
                        if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                            if (pick.hit) {
                                if (this.lastPickedPoint) {
                                    let prevNormal = this.lastPickedPoint.subtract(this.selectedTrackPointHandle.absolutePosition);
                                    let currNormal = pick.pickedPoint.subtract(this.selectedTrackPointHandle.absolutePosition);
                                    let a = Mummu.AngleFromToAround(prevNormal, currNormal, this.selectedTrackPoint.dir);
                                    let n = Mummu.Rotate(this.selectedTrackPointHandle.normal, this.selectedTrackPoint.dir, a);
                                    this.selectedTrackPointHandle.setNormal(n);
                                }
                                this.lastPickedPoint = pick.pickedPoint.clone();
                            }
                        }
                    }
                    else if (this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                        if (pick.hit) {
                            this.dragTrackPoint = true;
                            this.hoveredTrackPointHandle.position.copyFrom(pick.pickedPoint).addInPlace(this.offset);
                        }
                    }
                }
                else {
                    let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            return true;
                        }
                        return false;
                    });
                    if (pick.hit && pick.pickedMesh instanceof TrackPointHandle) {
                        this.setHoveredTrackPointHandle(pick.pickedMesh);
                        this.game.scene.activeCamera.detachControl();
                    }
                    else {
                        this.setHoveredTrackPointHandle(undefined);
                        this.game.scene.activeCamera.attachControl();
                    }
                }
            }
            else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP) {
                this.pointerDown = false;
                if (this.dragNormal && this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.dragNormal = false;
                    this.selectedTrackPoint.normal.copyFrom(this.selectedTrackPointHandle.normal);
                    this.selectedTrackPoint.fixedNormal = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
                else if (this.dragTrackPoint && this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                    this.dragTrackPoint = false;
                    this.hoveredTrackPoint.position.copyFrom(this.hoveredTrackPointHandle.position);
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
                else {
                    let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            if (this.trackPointhandles.indexOf(mesh) != -1) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (pick.pickedMesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(pick.pickedMesh) != -1) {
                        this.setSelectedTrackPointHandle(pick.pickedMesh);
                        this.updateHandles();
                    }
                }
                if (!this.hoveredTrackPointHandle) {
                    this.game.scene.activeCamera.attachControl();
                }
            }
            else if (eventData.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
                if (this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                    if (eventData.event instanceof WheelEvent) {
                        let dA = 3 * (eventData.event.deltaY / 100) / 180 * Math.PI;
                        Mummu.RotateInPlace(this.hoveredTrackPoint.normal, this.hoveredTrackPoint.dir, dA);
                        this.hoveredTrackPoint.fixedNormal = true;
                        this.track.generateWires();
                        this.track.recomputeAbsolutePath();
                        this.track.rebuildWireMeshes();
                        this.updateHandles();
                    }
                }
            }
        };
        this._update = () => {
            if (this.selectedTrackPoint) {
                if (this.selectedTrackPoint.isFirstOrLast()) {
                    this.activeTrackpointPositionInput.targetXYZ = this.selectedTrackPoint.position.clone();
                    this.activeTrackpointNormalInput.targetXYZ = this.selectedTrackPoint.normal.clone();
                }
                else {
                    this.activeTrackpointPositionInput.targetXYZ = this.selectedTrackPoint.position;
                    this.activeTrackpointNormalInput.targetXYZ = this.selectedTrackPoint.normal;
                }
                let slopePrev = this.track.getSlopeAt(this.selectedTrackPointIndex - 1);
                document.getElementById("slope-prev").innerText = slopePrev.toFixed(1) + "%";
                let slopeCurr = this.track.getSlopeAt(this.selectedTrackPointIndex);
                document.getElementById("slope-curr").innerText = slopeCurr.toFixed(1) + "%";
                let slopeNext = this.track.getSlopeAt(this.selectedTrackPointIndex + 1);
                document.getElementById("slope-next").innerText = slopeNext.toFixed(1) + "%";
                this.activeTrackpointTangentIn.setValue(this.selectedTrackPoint.tangentIn);
                this.activeTrackpointTangentOut.setValue(this.selectedTrackPoint.tangentOut);
                let bankCurr = this.track.getBankAt(this.selectedTrackPointIndex);
                document.getElementById("active-trackpoint-bank").innerText = bankCurr.toFixed(1) + "°";
            }
            if (this.track) {
                document.getElementById("slope-global").innerText = this.track.globalSlope.toFixed(1) + "%";
            }
            this.helperCircleRadius.setValue(this.helperShape.circleRadius);
            this.helperGridSize.setValue(this.helperShape.gridSize);
        };
        this.setTrack(this.game.machine.tracks[0]);
        this.helperShape = new HelperShape();
    }
    get track() {
        return this._track;
    }
    setTrack(t) {
        if (t != this.track) {
            if (this._track) {
            }
            this._track = t;
            if (this._track) {
            }
            this.rebuildHandles();
        }
    }
    initialize() {
        this.pointerPlane = BABYLON.MeshBuilder.CreateGround("pointer-plane", { width: 10, height: 10 });
        this.pointerPlane.visibility = 0;
        this.pointerPlane.rotationQuaternion = BABYLON.Quaternion.Identity();
        document.getElementById("prev-track").addEventListener("click", () => {
            let trackIndex = this.game.machine.tracks.indexOf(this._track);
            if (trackIndex > 0) {
                this.setTrack(this.game.machine.tracks[trackIndex - 1]);
                this.centerOnTrack();
            }
        });
        document.getElementById("next-track").addEventListener("click", () => {
            let trackIndex = this.game.machine.tracks.indexOf(this._track);
            if (trackIndex < this.game.machine.tracks.length - 1) {
                this.setTrack(this.game.machine.tracks[trackIndex + 1]);
                this.centerOnTrack();
            }
        });
        document.getElementById("load").addEventListener("click", () => {
            if (this.track) {
                let s = window.localStorage.getItem("last-saved-track");
                if (s) {
                    let data = JSON.parse(s);
                    this.track.deserialize(data);
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                }
            }
        });
        document.getElementById("save").addEventListener("click", () => {
            if (this.track) {
                let data = this.track.serialize();
                window.localStorage.setItem("last-saved-track", JSON.stringify(data));
                Nabu.download("track.json", JSON.stringify(data));
            }
        });
        document.getElementById("btn-cam-top").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(-Math.PI * 0.5, 0);
        });
        document.getElementById("btn-cam-left").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(Math.PI, Math.PI * 0.5);
        });
        document.getElementById("btn-cam-face").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI * 0.5);
        });
        document.getElementById("btn-cam-right").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(0, Math.PI * 0.5);
        });
        document.getElementById("btn-cam-bottom").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI);
        });
        document.getElementById("btn-cam-ortho").addEventListener("click", () => {
            this.game.cameraOrtho = true;
            this.helperShape.setShow(true);
        });
        document.getElementById("btn-cam-perspective").addEventListener("click", () => {
            this.game.cameraOrtho = false;
            this.helperShape.setShow(false);
        });
        document.getElementById("btn-focus-point").addEventListener("click", () => {
            if (this.track && this.selectedTrackPoint) {
                let target = BABYLON.Vector3.TransformCoordinates(this.selectedTrackPoint.position, this.track.getWorldMatrix());
                this.game.setCameraTarget(target);
            }
        });
        document.getElementById("btn-center-track").addEventListener("click", () => {
            this.centerOnTrack();
        });
        document.getElementById("btn-display-wire").addEventListener("click", () => {
            if (this.track) {
                this.track.renderOnlyPath = false;
                this.track.rebuildWireMeshes();
                this.updateHandles();
            }
        });
        document.getElementById("btn-display-path").addEventListener("click", () => {
            if (this.track) {
                this.track.renderOnlyPath = true;
                this.track.rebuildWireMeshes();
                this.updateHandles();
            }
        });
        document.getElementById("btn-show-helper-circle").addEventListener("click", () => {
            this.helperShape.setShowCircle(!this.helperShape.showCircle);
        });
        this.helperCircleRadius = document.getElementById("helper-circle-radius");
        this.helperCircleRadius.onInputNCallback = (n) => {
            this.helperShape.setCircleRadius(n);
        };
        document.getElementById("btn-show-helper-grid").addEventListener("click", () => {
            this.helperShape.setShowGrid(!this.helperShape.showGrid);
        });
        this.helperGridSize = document.getElementById("helper-grid-size");
        this.helperGridSize.onInputNCallback = (n) => {
            this.helperShape.setGridSize(n);
        };
        document.getElementById("prev-trackpoint").addEventListener("click", () => {
            if (this.track) {
                let newTrackIndex = (this.selectedTrackPointIndex - 1 + this.track.trackPoints.length) % this.track.trackPoints.length;
                this.setSelectedTrackPointIndex(newTrackIndex);
            }
        });
        document.getElementById("next-trackpoint").addEventListener("click", () => {
            if (this.track) {
                let newTrackIndex = (this.selectedTrackPointIndex + 1) % this.track.trackPoints.length;
                this.setSelectedTrackPointIndex(newTrackIndex);
            }
        });
        this.activeTrackpointPositionInput = document.getElementById("active-trackpoint-pos");
        this.activeTrackpointPositionInput.onInputXYZCallback = (xyz) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointNormalInput = document.getElementById("active-trackpoint-normal");
        this.activeTrackpointNormalInput.onInputXYZCallback = (xyz) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointTangentIn = document.getElementById("active-trackpoint-tan-in");
        this.activeTrackpointTangentIn.onInputNCallback = (n) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.selectedTrackPoint.tangentIn = n;
                    this.selectedTrackPoint.fixedTangentIn = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointTangentOut = document.getElementById("active-trackpoint-tan-out");
        this.activeTrackpointTangentOut.onInputNCallback = (n) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.selectedTrackPoint.tangentOut = n;
                    this.selectedTrackPoint.fixedTangentOut = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        document.getElementById("active-trackpoint-split").addEventListener("click", () => {
            if (this.track) {
                this.track.splitTrackPointAt(this.selectedTrackPointIndex);
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.rebuildWireMeshes();
                this.rebuildHandles();
            }
        });
        document.getElementById("active-trackpoint-delete").addEventListener("click", () => {
            if (this.track) {
                this.track.deleteTrackPointAt(this.selectedTrackPointIndex);
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.rebuildWireMeshes();
                this.rebuildHandles();
            }
        });
        this.game.scene.onBeforeRenderObservable.add(this._update);
        this.game.scene.onPointerObservable.add(this.onPointerEvent);
    }
    get hoveredTrackPoint() {
        if (this.hoveredTrackPointHandle) {
            return this.hoveredTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    setHoveredTrackPointHandle(trackpointHandle) {
        if (this.hoveredTrackPointHandle) {
            if (this.hoveredTrackPointHandle === this.selectedTrackPointHandle) {
                this.hoveredTrackPointHandle.setMaterial(this.game.handleMaterialActive);
            }
            else {
                this.hoveredTrackPointHandle.setMaterial(this.game.handleMaterial);
            }
        }
        this.hoveredTrackPointHandle = trackpointHandle;
        if (this.hoveredTrackPointHandle) {
            this.hoveredTrackPointHandle.setMaterial(this.game.handleMaterialHover);
        }
    }
    get selectedTrackPointIndex() {
        return this.trackPointhandles.indexOf(this.selectedTrackPointHandle);
    }
    get selectedTrackPoint() {
        if (this.selectedTrackPointHandle) {
            return this.selectedTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    setSelectedTrackPointHandle(trackpointHandle) {
        if (this.selectedTrackPointHandle) {
            this.selectedTrackPointHandle.setMaterial(this.game.handleMaterial);
        }
        this.selectedTrackPointHandle = trackpointHandle;
        if (this.selectedTrackPointHandle) {
            if (this.selectedTrackPointHandle === this.hoveredTrackPointHandle) {
                this.selectedTrackPointHandle.setMaterial(this.game.handleMaterialHover);
            }
            else {
                this.selectedTrackPointHandle.setMaterial(this.game.handleMaterialActive);
            }
        }
        this.updateHandles();
    }
    setSelectedTrackPointIndex(index) {
        let handle = this.trackPointhandles[index];
        this.setSelectedTrackPointHandle(handle);
    }
    removeHandles() {
        if (this.trackPointhandles) {
            this.trackPointhandles.forEach(h => {
                h.dispose();
            });
        }
        this.trackPointhandles = [];
        if (this.normalHandle) {
            this.normalHandle.dispose();
        }
    }
    rebuildHandles() {
        this.removeHandles();
        for (let i = 0; i < this.track.trackPoints.length; i++) {
            let handle = new TrackPointHandle(this.track.trackPoints[0][i]);
            this.trackPointhandles.push(handle);
            let pPrev = this.track.trackPoints[0][i - 1] ? this.track.trackPoints[0][i - 1].position : undefined;
            let p = this.track.trackPoints[0][i].position;
            let pNext = this.track.trackPoints[0][i + 1] ? this.track.trackPoints[0][i + 1].position : undefined;
            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }
            Mummu.QuaternionFromYZAxisToRef(this.track.trackPoints[0][i].normal, pNext.subtract(pPrev), handle.rotationQuaternion);
        }
        this.normalHandle = BABYLON.MeshBuilder.CreateCylinder("normal-handle", { height: 0.03, diameter: 0.0025, tessellation: 8 });
        this.normalHandle.rotationQuaternion = BABYLON.Quaternion.Identity();
        this.normalHandle.material = this.game.handleMaterialActive;
        this.normalHandle.isVisible = false;
    }
    updateHandles() {
        for (let i = 0; i < this.trackPointhandles.length; i++) {
            this.trackPointhandles[i].position.copyFrom(this.trackPointhandles[i].trackPoint.position);
            Mummu.QuaternionFromYZAxisToRef(this.trackPointhandles[i].trackPoint.normal, this.trackPointhandles[i].trackPoint.dir, this.trackPointhandles[i].rotationQuaternion);
        }
        if (this.selectedTrackPointHandle) {
            this.normalHandle.isVisible = true;
            this.normalHandle.parent = this.selectedTrackPointHandle;
            this.normalHandle.position.copyFromFloats(0, 0.015 + 0.5 * this.track.wireGauge / 2, 0);
            if (this.selectedTrackPointHandle.trackPoint.fixedNormal) {
                this.normalHandle.material = this.game.handleMaterialActive;
            }
            else {
                this.normalHandle.material = this.game.handleMaterial;
            }
        }
        else {
            this.normalHandle.isVisible = false;
        }
    }
    centerOnTrack() {
        if (this.track) {
            let center = this.track.getBarycenter();
            center.x = this.track.position.x;
            this.game.setCameraTarget(center);
        }
    }
}
class Wire extends BABYLON.Mesh {
    constructor(track) {
        super("wire");
        this.track = track;
        this.path = [];
        this.normals = [];
        this.absolutePath = [];
        this.parent = this.track;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
    }
    get size() {
        return this.track.wireSize;
    }
    get radius() {
        return this.size * 0.5;
    }
    show() {
        this.isVisible = true;
        this.getChildMeshes().forEach(child => {
            child.isVisible = true;
        });
    }
    hide() {
        this.isVisible = false;
        this.getChildMeshes().forEach(child => {
            child.isVisible = false;
        });
    }
    recomputeAbsolutePath() {
        this.absolutePath.splice(this.path.length);
        for (let i = 0; i < this.path.length; i++) {
            if (!this.absolutePath[i]) {
                this.absolutePath[i] = BABYLON.Vector3.Zero();
            }
            BABYLON.Vector3.TransformCoordinatesToRef(this.path[i], this.getWorldMatrix(), this.absolutePath[i]);
        }
    }
    async instantiate() {
        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }
        let n = 8;
        let shape = [];
        for (let i = 0; i < n; i++) {
            let a = i / n * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * this.radius, sina * this.radius, 0);
        }
        if (!Wire.DEBUG_DISPLAY) {
            let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            wire.parent = this;
            wire.material = this.track.game.steelMaterial;
        }
        if (Wire.DEBUG_DISPLAY) {
            for (let i = 0; i < this.path.length - 1; i++) {
                let dir = this.path[i].subtract(this.path[i + 1]).normalize();
                let l = BABYLON.Vector3.Distance(this.path[i + 1], this.path[i]);
                let wireSection = BABYLON.CreateCapsule("wire-section", { radius: this.size * 0.6, height: l });
                wireSection.position.copyFrom(this.path[i + 1]).addInPlace(this.path[i]).scaleInPlace(0.5);
                wireSection.rotationQuaternion = BABYLON.Quaternion.Identity();
                wireSection.parent = this;
                Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, wireSection.rotationQuaternion);
            }
        }
    }
}
Wire.DEBUG_DISPLAY = false;
Wire.Instances = new Nabu.UniqueList();
var baseRadius = 0.075;
var tileWidth = 0.15;
var tileHeight = 0.03;
class TrackPoint {
    constructor(track, position, normal, dir, tangentIn, tangentOut) {
        this.track = track;
        this.position = position;
        this.normal = normal;
        this.dir = dir;
        this.tangentIn = tangentIn;
        this.tangentOut = tangentOut;
        this.fixedNormal = false;
        this.fixedDir = false;
        this.fixedTangentIn = false;
        this.fixedTangentOut = false;
        this.summedLength = 0;
        if (normal) {
            this.fixedNormal = true;
        }
        else {
            this.fixedNormal = false;
            this.normal = BABYLON.Vector3.Up();
        }
        this.normal = this.normal.clone();
        if (dir) {
            this.fixedDir = true;
        }
        else {
            this.fixedDir = false;
            this.dir = BABYLON.Vector3.Right();
        }
        this.dir = this.dir.clone();
        if (tangentIn) {
            this.fixedTangentIn = true;
        }
        else {
            this.fixedTangentIn = false;
            this.tangentIn = 1;
        }
        if (tangentOut) {
            this.fixedTangentOut = true;
        }
        else {
            this.fixedTangentOut = false;
            this.tangentOut = 1;
        }
    }
    isFirstOrLast() {
        let index = this.track.trackPoints[0].indexOf(this);
        if (index === 0 || index === this.track.trackPoints.length - 1) {
            return true;
        }
        return false;
    }
}
class Track extends BABYLON.Mesh {
    constructor(machine, _i, _j, mirror) {
        super("track", machine.game.scene);
        this.machine = machine;
        this._i = _i;
        this._j = _j;
        this.mirror = mirror;
        this.trackName = "track";
        this.deltaI = 0;
        this.deltaJ = 0;
        this.wireSize = 0.0015;
        this.wireGauge = 0.013;
        this.renderOnlyPath = false;
        this.summedLength = [0];
        this.totalLength = 0;
        this.globalSlope = 0;
        this.AABBMin = BABYLON.Vector3.Zero();
        this.AABBMax = BABYLON.Vector3.Zero();
        this.xExtendable = false;
        this.yExtendable = false;
        this.position.x = this._i * tileWidth;
        this.position.y = -this._j * tileHeight;
        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }
    get game() {
        return this.machine.game;
    }
    get i() {
        return this._i;
    }
    setI(v) {
        this._i = v;
        this.position.x = this._i * tileWidth;
    }
    get j() {
        return this._j;
    }
    setJ(v) {
        this._j = v;
        this.position.y = -this._j * tileHeight;
    }
    setIsVisible(isVisible) {
        this.isVisible = isVisible;
        this.getChildMeshes().forEach(m => {
            m.isVisible = isVisible;
        });
    }
    select() {
        this.selectedMesh.isVisible = true;
    }
    unselect() {
        this.selectedMesh.isVisible = false;
    }
    mirrorTrackPointsInPlace() {
        for (let j = 0; j < this.trackPoints.length; j++) {
            let trackpoints = this.trackPoints[j];
            for (let i = 0; i < trackpoints.length; i++) {
                trackpoints[i].position.x *= -1;
                trackpoints[i].position.x += this.deltaI * tileWidth;
                if (trackpoints[i].normal) {
                    trackpoints[i].normal.x *= -1;
                }
                if (trackpoints[i].dir) {
                    trackpoints[i].dir.x *= -1;
                }
            }
        }
    }
    getSlopeAt(index, trackIndex = 0) {
        let trackpoint = this.trackPoints[trackIndex][index];
        let nextTrackPoint = this.trackPoints[trackIndex][index + 1];
        if (trackpoint) {
            if (nextTrackPoint) {
                let dy = nextTrackPoint.position.y - trackpoint.position.y;
                let dLength = nextTrackPoint.summedLength - trackpoint.summedLength;
                return dy / dLength * 100;
            }
            else {
                let angleToVertical = Mummu.Angle(BABYLON.Axis.Y, trackpoint.dir);
                let angleToHorizontal = Math.PI / 2 - angleToVertical;
                return Math.tan(angleToHorizontal) * 100;
            }
        }
        return 0;
    }
    getBankAt(index, trackIndex = 0) {
        let trackpoint = this.trackPoints[trackIndex][index];
        if (trackpoint) {
            let n = trackpoint.normal;
            if (n.y < 0) {
                n = n.scale(-1);
            }
            let angle = Mummu.AngleFromToAround(trackpoint.normal, BABYLON.Axis.Y, trackpoint.dir);
            return angle / Math.PI * 180;
        }
        return 0;
    }
    splitTrackPointAt(index, trackIndex = 0) {
        if (index === 0) {
            let trackPoint = this.trackPoints[trackIndex][0];
            let nextTrackPoint = this.trackPoints[trackIndex][0 + 1];
            let distA = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInA = trackPoint.dir.scale(distA * trackPoint.tangentOut);
            let tanOutA = nextTrackPoint.dir.scale(distA * nextTrackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(trackPoint.position, tanInA, nextTrackPoint.position, tanOutA, 0.5);
            let normalA = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 0.5);
            let trackPointA = new TrackPoint(this, pointA, normalA);
            this.trackPoints[trackIndex].splice(1, 0, trackPointA);
        }
        if (index > 0 && index < this.trackPoints[trackIndex].length - 1) {
            let prevTrackPoint = this.trackPoints[trackIndex][index - 1];
            let trackPoint = this.trackPoints[trackIndex][index];
            let nextTrackPoint = this.trackPoints[trackIndex][index + 1];
            let distA = BABYLON.Vector3.Distance(trackPoint.position, prevTrackPoint.position);
            let tanInA = prevTrackPoint.dir.scale(distA * prevTrackPoint.tangentOut);
            let tanOutA = trackPoint.dir.scale(distA * trackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(prevTrackPoint.position, tanInA, trackPoint.position, tanOutA, 2 / 3);
            let normalA = BABYLON.Vector3.Lerp(prevTrackPoint.normal, trackPoint.normal, 2 / 3);
            let distB = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInB = trackPoint.dir.scale(distB * trackPoint.tangentOut);
            let tanOutB = nextTrackPoint.dir.scale(distB * nextTrackPoint.tangentIn);
            let pointB = BABYLON.Vector3.Hermite(trackPoint.position, tanInB, nextTrackPoint.position, tanOutB, 1 / 3);
            let normalB = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 1 / 3);
            let trackPointA = new TrackPoint(this, pointA, normalA);
            let trackPointB = new TrackPoint(this, pointB, normalB);
            this.trackPoints[trackIndex].splice(index, 1, trackPointA, trackPointB);
        }
    }
    deleteTrackPointAt(index, trackIndex = 0) {
        if (index > 0 && index < this.trackPoints[trackIndex].length - 1) {
            this.trackPoints[trackIndex].splice(index, 1);
        }
    }
    getBarycenter() {
        if (this.trackPoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.trackPoints[0].map(trackpoint => {
            return trackpoint.position;
        }).reduce((pos1, pos2) => {
            return pos1.add(pos2);
        }).scaleInPlace(1 / this.trackPoints.length);
        return BABYLON.Vector3.TransformCoordinates(barycenter, this.getWorldMatrix());
    }
    generateWires() {
        this.interpolatedPoints = [];
        this.interpolatedNormals = [];
        // Update normals and tangents
        for (let j = 0; j < this.trackPoints.length; j++) {
            let trackPoints = this.trackPoints[j];
            let interpolatedPoints = [];
            this.interpolatedPoints[j] = interpolatedPoints;
            let interpolatedNormals = [];
            this.interpolatedNormals[j] = interpolatedNormals;
            for (let i = 1; i < trackPoints.length - 1; i++) {
                let prevTrackPoint = trackPoints[i - 1];
                let trackPoint = trackPoints[i];
                let nextTrackPoint = trackPoints[i + 1];
                if (!trackPoint.fixedDir) {
                    trackPoint.dir.copyFrom(nextTrackPoint.position).subtractInPlace(prevTrackPoint.position).normalize();
                }
                if (!trackPoint.fixedTangentIn) {
                    trackPoint.tangentIn = 1;
                }
                if (!trackPoint.fixedTangentOut) {
                    trackPoint.tangentOut = 1;
                }
                if (!trackPoint.fixedNormal) {
                    let n = 0;
                    let nextTrackPointWithFixedNormal;
                    while (!nextTrackPointWithFixedNormal) {
                        n++;
                        let tmpTrackPoint = trackPoints[i + n];
                        if (tmpTrackPoint.fixedNormal) {
                            nextTrackPointWithFixedNormal = tmpTrackPoint;
                        }
                    }
                    trackPoint.normal = BABYLON.Vector3.Lerp(prevTrackPoint.normal, nextTrackPointWithFixedNormal.normal, 1 / (1 + n));
                }
                let right = BABYLON.Vector3.Cross(trackPoint.normal, trackPoint.dir);
                trackPoint.normal = BABYLON.Vector3.Cross(trackPoint.dir, right).normalize();
            }
            this.wires[2 * j].path = [];
            this.wires[2 * j + 1].path = [];
            trackPoints[0].summedLength = 0;
            for (let i = 0; i < trackPoints.length - 1; i++) {
                let trackPoint = trackPoints[i];
                let nextTrackPoint = trackPoints[i + 1];
                let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
                let tanIn = trackPoints[i].dir.scale(dist * trackPoint.tangentOut);
                let tanOut = trackPoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
                let count = Math.round(dist / 0.003);
                count = Math.max(0, count);
                interpolatedPoints.push(trackPoint.position);
                interpolatedNormals.push(trackPoint.normal);
                nextTrackPoint.summedLength = trackPoint.summedLength;
                for (let k = 1; k < count; k++) {
                    let amount = k / count;
                    let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                    let normal = BABYLON.Vector3.CatmullRom(trackPoint.normal, trackPoint.normal, nextTrackPoint.normal, nextTrackPoint.normal, amount);
                    interpolatedPoints.push(point);
                    interpolatedNormals.push(normal);
                    nextTrackPoint.summedLength += BABYLON.Vector3.Distance(interpolatedPoints[interpolatedPoints.length - 2], interpolatedPoints[interpolatedPoints.length - 1]);
                }
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, interpolatedPoints[interpolatedPoints.length - 1]);
            }
            interpolatedPoints.push(trackPoints[trackPoints.length - 1].position);
            interpolatedNormals.push(trackPoints[trackPoints.length - 1].normal);
            let N = interpolatedPoints.length;
            this.summedLength = [0];
            this.totalLength = 0;
            for (let i = 0; i < N - 1; i++) {
                let p = interpolatedPoints[i];
                let pNext = interpolatedPoints[i + 1];
                let d = BABYLON.Vector3.Distance(p, pNext);
                this.summedLength[i + 1] = this.summedLength[i] + d;
            }
            this.totalLength = this.summedLength[N - 1];
            let dh = interpolatedPoints[interpolatedPoints.length - 1].y - interpolatedPoints[0].y;
            this.globalSlope = dh / this.totalLength * 100;
            // Compute wire path and Update AABB values.
            this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
            this.AABBMax.copyFromFloats(-Infinity, -Infinity, -Infinity);
            for (let i = 0; i < N; i++) {
                let pPrev = interpolatedPoints[i - 1] ? interpolatedPoints[i - 1] : undefined;
                let p = interpolatedPoints[i];
                let pNext = interpolatedPoints[i + 1] ? interpolatedPoints[i + 1] : undefined;
                if (!pPrev) {
                    pPrev = p.subtract(pNext.subtract(p));
                }
                if (!pNext) {
                    pNext = p.add(p.subtract(pPrev));
                }
                let dir = pNext.subtract(pPrev).normalize();
                let up = interpolatedNormals[i];
                let rotation = BABYLON.Quaternion.Identity();
                Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);
                let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);
                this.wires[2 * j].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-this.wireGauge * 0.5, 0, 0), matrix);
                this.wires[2 * j + 1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
                this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
                this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
                this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
                this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
            }
            Mummu.DecimatePathInPlace(this.wires[2 * j].path, 2 / 180 * Math.PI);
            Mummu.DecimatePathInPlace(this.wires[2 * j + 1].path, 2 / 180 * Math.PI);
            this.AABBMin.x -= this.wireSize * 0.5;
            this.AABBMin.y -= this.wireSize * 0.5;
            this.AABBMin.z -= this.wireSize * 0.5;
            this.AABBMax.x += this.wireSize * 0.5;
            this.AABBMax.y += this.wireSize * 0.5;
            this.AABBMax.z += this.wireSize * 0.5;
            BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.getWorldMatrix(), this.AABBMin);
            BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.getWorldMatrix(), this.AABBMax);
        }
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
    async instantiate() {
        this.sleepersMesh = new BABYLON.Mesh("sleepers-mesh");
        this.sleepersMesh.material = this.game.steelMaterial;
        this.sleepersMesh.parent = this;
        if (this.selectedMesh) {
            this.selectedMesh.dispose();
        }
        let xLeft = -tileWidth * 0.5;
        let xRight = tileWidth * (this.deltaI + 0.5);
        let yTop = tileHeight * 0.25;
        let yBottom = -tileHeight * (this.deltaJ + 0.75);
        this.selectedMesh = BABYLON.MeshBuilder.CreateLines("select-mesh", {
            points: [
                new BABYLON.Vector3(xLeft, yTop, 0),
                new BABYLON.Vector3(xRight, yTop, 0),
                new BABYLON.Vector3(xRight, yBottom, 0),
                new BABYLON.Vector3(xLeft, yBottom, 0),
                new BABYLON.Vector3(xLeft, yTop, 0)
            ]
        });
        this.selectedMesh.parent = this;
        this.selectedMesh.isVisible = false;
        this.rebuildWireMeshes();
    }
    dispose() {
        super.dispose();
        let index = this.machine.tracks.indexOf(this);
        if (index > -1) {
            this.machine.tracks.splice(index, 1);
        }
    }
    update(dt) { }
    rebuildWireMeshes() {
        if (this.renderOnlyPath) {
            let n = 8;
            let shape = [];
            for (let i = 0; i < n; i++) {
                let a = i / n * 2 * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                shape[i] = new BABYLON.Vector3(cosa * this.wireSize * 0.5, sina * this.wireSize * 0.5, 0);
            }
            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.interpolatedPoints[0], closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let vertexData = BABYLON.VertexData.ExtractFromMesh(tmp);
            vertexData.applyToMesh(this.sleepersMesh);
            tmp.dispose();
            this.wires.forEach(wire => {
                wire.hide();
            });
        }
        else {
            this.wires.forEach(wire => {
                wire.show();
            });
            SleeperMeshBuilder.GenerateSleepersVertexData(this, 0.03).applyToMesh(this.sleepersMesh);
            this.wires.forEach(wire => {
                wire.instantiate();
            });
        }
    }
    serialize() {
        let data = { points: [] };
        for (let i = 0; i < this.trackPoints[0].length; i++) {
            data.points[i] = {
                position: { x: this.trackPoints[0][i].position.x, y: this.trackPoints[0][i].position.y, z: this.trackPoints[0][i].position.z }
            };
            if (this.trackPoints[0][i].fixedNormal) {
                data.points[i].normal = { x: this.trackPoints[0][i].normal.x, y: this.trackPoints[0][i].normal.y, z: this.trackPoints[0][i].normal.z };
            }
            if (this.trackPoints[0][i].fixedDir) {
                data.points[i].dir = { x: this.trackPoints[0][i].dir.x, y: this.trackPoints[0][i].dir.y, z: this.trackPoints[0][i].dir.z };
            }
            if (this.trackPoints[0][i].fixedTangentIn) {
                data.points[i].tangentIn = this.trackPoints[0][i].tangentIn;
            }
            if (this.trackPoints[0][i].fixedTangentOut) {
                data.points[i].tangentOut = this.trackPoints[0][i].tangentOut;
            }
        }
        return data;
    }
    deserialize(data) {
        this.trackPoints = [[]];
        for (let i = 0; i < data.points.length; i++) {
            let pointData = data.points[i];
            let normal;
            let direction;
            if (pointData.normal) {
                normal = new BABYLON.Vector3(pointData.normal.x, pointData.normal.y, pointData.normal.z);
            }
            if (pointData.dir) {
                direction = new BABYLON.Vector3(pointData.dir.x, pointData.dir.y, pointData.dir.z);
            }
            let trackPoint = new TrackPoint(this, new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z), normal, direction, pointData.tangentIn, pointData.tangentOut);
            this.trackPoints[0][i] = trackPoint;
        }
    }
}
/// <reference path="./Track.ts"/>
class DoubleLoop extends Track {
    constructor(machine, i, j) {
        super(machine, i, j);
        this.deserialize({
            points: [
                { position: { x: -0.056249999999999994, y: 0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: 0.007831128515433633, y: 0.02686866956826861, z: -0.001512586438867734 }, normal: { x: -0.02088401000702746, y: 0.9212766316260701, z: -0.38834678593461935 } },
                { position: { x: 0.0445, y: 0.0238, z: -0.026 }, normal: { x: -0.4220582199178856, y: 0.863269455131674, z: -0.27682613105776016 }, tangentIn: 1 },
                { position: { x: 0.0441, y: 0.0194, z: -0.0801 }, normal: { x: -0.5105506548736694, y: 0.8362861901986887, z: 0.19990857132957118 } },
                { position: { x: -0.00022584437025674475, y: 0.015373584470800367, z: -0.10497567416976264 }, normal: { x: -0.062210177432127416, y: 0.8376674210294907, z: 0.5426261932211393 } },
                { position: { x: -0.04682594399162551, y: 0.00993486974904878, z: -0.07591274887481546 }, normal: { x: 0.4338049924054248, y: 0.8392539115358117, z: 0.3278202259409408 } },
                { position: { x: -0.044, y: 0.0068, z: -0.0251 }, normal: { x: 0.47274782333094034, y: 0.8547500410127304, z: -0.21427053676274183 } },
                { position: { x: 0.0003, y: 0.0028, z: -0.0004 }, normal: { x: 0.06925374833311816, y: 0.8415192755510988, z: -0.5357697520556448 } },
                { position: { x: 0.0447, y: -0.0012, z: -0.0262 }, normal: { x: -0.4385316126958126, y: 0.8367050678252934, z: -0.32804672554665304 } },
                { position: { x: 0.0442, y: -0.0054, z: -0.08 }, normal: { x: -0.5105423049408571, y: 0.8358650802407707, z: 0.2016832231489942 } },
                { position: { x: -0.00019998794117725982, y: -0.009649497176356298, z: -0.10484166117713693 }, normal: { x: -0.05328804359581278, y: 0.839859833513831, z: 0.5401813070255678 } },
                { position: { x: -0.04678172451684687, y: -0.014002588861738838, z: -0.07560012404016887 }, normal: { x: 0.4340370522882042, y: 0.8399407589318226, z: 0.3257473848337093 }, tangentIn: 1 },
                { position: { x: -0.0438, y: -0.0182, z: -0.0247 }, normal: { x: 0.49613685449256684, y: 0.8445355495674358, z: -0.20151408668143006 } },
                { position: { x: -0.0017, y: -0.0224, z: 0.0002 }, normal: { x: 0.21464241308702953, y: 0.9154904403092122, z: -0.3403026420799902 } },
                { position: { x: 0.056249999999999994, y: -0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
            ],
        });
        this.generateWires();
    }
}
class Elevator extends Track {
    constructor(machine, i, j, h = 1, mirror) {
        super(machine, i, j, mirror);
        this.h = h;
        this.boxesCount = 4;
        this.rWheel = 0.015;
        this.boxX = [];
        this.boxes = [];
        this.wheels = [];
        this.reset = () => {
            for (let i = 0; i < this.boxesCount; i++) {
                this.boxX[i] = i / this.boxesCount * this.chainLength;
                this.update(0);
            }
        };
        this.l = 0;
        this.p = 0;
        this.chainLength = 0;
        this.speed = 0.04; // in m/s
        this.boxesCount;
        this.yExtendable = true;
        this.trackName = "elevator-" + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let dirLeft = new BABYLON.Vector3(1, 0, 0);
        dirLeft.normalize();
        let nLeft = new BABYLON.Vector3(0, 1, 0);
        nLeft.normalize();
        let dirRight = new BABYLON.Vector3(1, 1, 0);
        dirRight.normalize();
        let nRight = new BABYLON.Vector3(-1, 1, 0);
        nRight.normalize();
        this.deltaJ = h;
        this.trackPoints = [
            [
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight * this.deltaJ, 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.1, -tileHeight * (this.deltaJ + 0.1), 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(0, -tileHeight * (this.deltaJ + 0.25), 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(0 + 0.01, -tileHeight * (this.deltaJ + 0.25) + 0.01, 0), dir.scale(-1), n),
                new TrackPoint(this, new BABYLON.Vector3(0 + 0.01, 0 - tileHeight, 0), dir.scale(-1), n),
                new TrackPoint(this, new BABYLON.Vector3(-0.005, 0.035 - tileHeight, 0), (new BABYLON.Vector3(-1, -1, 0)).normalize(), (new BABYLON.Vector3(-1, 1, 0)).normalize())
            ],
            [
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight, 0), nLeft, dirLeft),
                new TrackPoint(this, new BABYLON.Vector3(-0.008, -tileHeight * 0.5, 0), nRight, dirRight)
            ]
        ];
        this.wires.push(new Wire(this), new Wire(this));
        let x = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
            x = -1;
        }
        this.generateWires();
        this.wheels = [
            new BABYLON.Mesh("wheel-0"),
            new BABYLON.Mesh("wheel-1")
        ];
        this.wheels[0].position.copyFromFloats(0.030 * x, -tileHeight * (this.deltaJ + 0.25), 0);
        this.wheels[0].parent = this;
        this.wheels[0].material = this.game.steelMaterial;
        this.wheels[1].position.copyFromFloats(0.030 * x, 0.035 - tileHeight, 0);
        this.wheels[1].parent = this;
        this.wheels[1].material = this.game.steelMaterial;
        this.game.vertexDataLoader.get("./meshes/wheel.babylon").then(vertexDatas => {
            let vertexData = vertexDatas[0];
            if (vertexData) {
                vertexData.applyToMesh(this.wheels[0]);
                vertexData.applyToMesh(this.wheels[1]);
            }
        });
        this.l = Math.abs(this.wheels[1].position.y - this.wheels[0].position.y);
        this.p = 2 * Math.PI * this.rWheel;
        this.chainLength = 2 * this.l + this.p;
        this.boxesCount = Math.round(this.chainLength / 0.08);
        for (let i = 0; i < this.boxesCount; i++) {
            let box = new BABYLON.Mesh("box");
            box.rotationQuaternion = BABYLON.Quaternion.Identity();
            box.parent = this;
            let rampWire0 = new Wire(this);
            let rRamp = this.wireGauge * 0.35;
            rampWire0.path = [new BABYLON.Vector3(-0.019 * x, 0.001, rRamp)];
            let nRamp = 12;
            for (let i = 0; i <= nRamp; i++) {
                let a = i / nRamp * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                rampWire0.path.push(new BABYLON.Vector3((sina * rRamp - rRamp - 0.0005) * x, 0, cosa * rRamp));
            }
            rampWire0.path.push(new BABYLON.Vector3(-0.019 * x, 0.001, -rRamp));
            rampWire0.parent = box;
            this.boxes.push(box);
            this.wires.push(rampWire0);
        }
        let rCable = 0.00075;
        let nCable = 8;
        let cableShape = [];
        for (let i = 0; i < nCable; i++) {
            let a = i / nCable * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            cableShape[i] = new BABYLON.Vector3(cosa * rCable, sina * rCable, 0);
        }
        let x0 = this.wheels[0].position.x;
        let y0 = this.wheels[0].position.y;
        let pathCable = [];
        for (let i = 0; i <= 16; i++) {
            let a = i / 16 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            pathCable.push(new BABYLON.Vector3(x0 + cosa * this.rWheel, y0 - sina * this.rWheel));
        }
        x0 = this.wheels[1].position.x;
        y0 = this.wheels[1].position.y;
        for (let i = 0; i <= 16; i++) {
            let a = i / 16 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            pathCable.push(new BABYLON.Vector3(x0 - cosa * this.rWheel, y0 + sina * this.rWheel));
        }
        this.cable = BABYLON.ExtrudeShape("wire", { shape: cableShape, path: pathCable, closeShape: true, closePath: true });
        this.cable.material = this.game.leatherMaterial;
        this.cable.parent = this;
        this.machine.onStopCallbacks.push(this.reset);
        this.reset();
    }
    dispose() {
        super.dispose();
        this.machine.onStopCallbacks.remove(this.reset);
    }
    update(dt) {
        let dx = this.speed * dt * this.game.timeFactor;
        let x = 1;
        if (this.mirror) {
            x = -1;
        }
        for (let i = 0; i < this.boxesCount; i++) {
            this.boxX[i] += dx;
            while (this.boxX[i] > this.chainLength) {
                this.boxX[i] -= this.chainLength;
            }
            if (this.boxX[i] < this.l) {
                this.boxes[i].position.x = this.wheels[0].position.x - this.rWheel * x;
                this.boxes[i].position.y = this.wheels[0].position.y + this.boxX[i];
                Mummu.QuaternionFromXZAxisToRef(BABYLON.Axis.X, BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            else if (this.boxX[i] < this.l + 0.5 * this.p) {
                let a = (this.boxX[i] - this.l) / (0.5 * this.p) * Math.PI;
                this.boxes[i].position.x = this.wheels[1].position.x - Math.cos(a) * this.rWheel * x;
                this.boxes[i].position.y = this.wheels[1].position.y + Math.sin(a) * this.rWheel;
                let right = this.wheels[1].position.subtract(this.boxes[i].position).normalize();
                Mummu.QuaternionFromXZAxisToRef(right.scale(x), BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            else if (this.boxX[i] < 2 * this.l + 0.5 * this.p) {
                this.boxes[i].position.x = this.wheels[0].position.x + this.rWheel * x;
                this.boxes[i].position.y = this.wheels[1].position.y - (this.boxX[i] - (this.l + 0.5 * this.p));
                Mummu.QuaternionFromXZAxisToRef(BABYLON.Axis.X.scale(-1), BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            else {
                let a = (this.boxX[i] - (2 * this.l + 0.5 * this.p)) / (0.5 * this.p) * Math.PI;
                this.boxes[i].position.x = this.wheels[0].position.x + Math.cos(a) * this.rWheel * x;
                this.boxes[i].position.y = this.wheels[0].position.y - Math.sin(a) * this.rWheel;
                let right = this.wheels[0].position.subtract(this.boxes[i].position).normalize();
                Mummu.QuaternionFromXZAxisToRef(right.scale(x), BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            this.wires[4 + i].recomputeAbsolutePath();
        }
        let deltaAngle = dx / this.p * 2 * Math.PI * x;
        this.wheels[0].rotation.z -= deltaAngle;
        this.wheels[1].rotation.z -= deltaAngle;
    }
}
/*
class Flat extends Track {

    constructor(machine: Machine, i: number, j: number, public w: number = 1) {
        super(machine, i, j);
        this.xExtendable = true;
        this.trackName = "flat-" + w.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        
        this.deltaI = w - 1;

        this.trackPoints = [[
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir)
        ]];

        this.generateWires();
    }
}

class CrossingFlat extends Track {

    constructor(machine: Machine, i: number, j: number, public w: number = 1) {
        super(machine, i, j);
        this.xExtendable = true;
        this.trackName = "flatX-" + w.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let nBank = new BABYLON.Vector3(0, Math.cos(10 / 180 * Math.PI), Math.sin(10 / 180 * Math.PI));
        
        this.deltaI = w - 1;

        this.trackPoints = [[
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir, 1.4, 1.4),
            new TrackPoint(this, new BABYLON.Vector3((tileWidth * (this.deltaI + 0.5)- tileWidth * 0.5) * 0.5, 0, - 0.03), nBank, dir, 1.4, 1.4),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir, 1.4, 1.4)
        ]];

        this.generateWires();
    }
}
*/ 
/// <reference path="./Track.ts"/>
class FlatLoop extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j);
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.0002, y: -0.004, z: -0.0004 }, normal: { x: 0.019861618966497012, y: 0.9751749757297097, z: -0.22054315405967592 } },
                { position: { x: 0.0438, y: -0.0064, z: -0.0176 }, normal: { x: -0.22558304612591473, y: 0.9269655818421536, z: -0.29974505730802486 } },
                { position: { x: 0.0656, y: -0.0092, z: -0.0657 }, normal: { x: -0.36624766795617253, y: 0.9272115297672086, z: -0.07836724305102492 } },
                { position: { x: 0.05, y: -0.0116, z: -0.1081 }, normal: { x: -0.28899453151103105, y: 0.9331762009279609, z: 0.21369215890710064 } },
                { position: { x: 0.0001, y: -0.0146, z: -0.1307 }, normal: { x: -0.06591259754365662, y: 0.9234801060022608, z: 0.3779418252894237 } },
                { position: { x: -0.0463, y: -0.017, z: -0.1117 }, normal: { x: 0.21142849593782587, y: 0.9373586814752951, z: 0.27686945185116646 } },
                { position: { x: -0.064, y: -0.0194, z: -0.0655 }, normal: { x: 0.3862942302916957, y: 0.9210759814896877, z: 0.0489469505296813 } },
                { position: { x: -0.0462, y: -0.022, z: -0.0184 }, normal: { x: 0.2824107521306146, y: 0.937604682593982, z: -0.20283398694217641 } },
                { position: { x: -0.0005, y: -0.0244, z: -0.0002 }, normal: { x: 0.09320082689165142, y: 0.9775672574755118, z: -0.18888055214478572 } },
                { position: { x: 0.075, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        this.deltaJ = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class Loop extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j, mirror);
        this.trackName = "loop";
        this.deltaI = 1;
        this.deltaJ = 3;
        this.deserialize({
            points: [
                { position: { x: -0.07499999999999998, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: -0.021400000000000002, y: -0.0158, z: 0 }, normal: { x: 0.4396275545392263, y: 0.8981638211016448, z: -0.0054188332648665 } },
                { position: { x: 0.01999999999999999, y: -0.0465, z: 0 }, normal: { x: 0.5982436505113027, y: 0.8012971523271827, z: -0.005235293235149783 } },
                { position: { x: 0.05199999999999999, y: -0.0706, z: 0 }, normal: { x: 0.4741604675908546, y: 0.878895570768095, z: -0.05210015986776756 } },
                { position: { x: 0.0795, y: -0.0786, z: 0 }, normal: { x: 0.09449201595693026, y: 0.9944340313908211, z: -0.0466070395133045 } },
                { position: { x: 0.10065375229916038, y: -0.07522312329722819, z: 1.1529110999219938e-11 }, normal: { x: -0.5164966685450393, y: 0.8544407592437108, z: -0.05623326706592006 } },
                { position: { x: 0.11519302709514871, y: -0.05708879183907972, z: -0.0009829866651905254 }, normal: { x: -0.9589534906617966, y: 0.25476375646906013, z: -0.12451357812435228 } },
                { position: { x: 0.11218277110706124, y: -0.03280312921665407, z: -0.0019974993144583333 }, normal: { x: -0.8687142251904587, y: -0.4874405932158047, z: -0.08796171347333712 } },
                { position: { x: 0.09431741317667067, y: -0.018836421903859007, z: -0.006790230548899395 }, normal: { x: -0.2827692887364913, y: -0.9591460712007929, z: -0.008963450649307923 } },
                { position: { x: 0.0715028480454771, y: -0.02070606642307432, z: -0.013133538933271394 }, normal: { x: 0.44191323501249113, y: -0.8959028193766404, z: 0.045506383659676526 } },
                { position: { x: 0.05679978340718872, y: -0.03791636105629381, z: -0.018090494323189286 }, normal: { x: 0.9547976002539688, y: -0.29720598940938536, z: -0.005490210237409393 } },
                { position: { x: 0.05785498312066663, y: -0.06445088096471263, z: -0.01854822983510782 }, normal: { x: 0.8764619011291043, y: 0.452593339877206, z: 0.16423703774713058 } },
                { position: { x: 0.08849293866937, y: -0.10093496548854738, z: -0.013560714982744127 }, normal: { x: 0.4579284797457813, y: 0.879998331714446, z: 0.12611282098783305 } },
                { position: { x: 0.1453843264203472, y: -0.11222087303501635, z: -0.003043587228636343 }, normal: { x: -0.0774630913932069, y: 0.99670764505399, z: -0.023944514251439668 } },
                { position: { x: 0.225, y: -0.09, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class Ramp extends Track {
    constructor(machine, i, j, w = 1, h = 1, mirror) {
        super(machine, i, j, mirror);
        this.w = w;
        this.h = h;
        this.xExtendable = true;
        this.yExtendable = true;
        this.trackName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.deltaI = w - 1;
        this.deltaJ = h;
        this.trackPoints = [[
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), -tileHeight * (this.deltaJ), 0), n, dir)
            ]];
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class CrossingRamp extends Track {
    constructor(machine, i, j, w = 1, h = 1, mirror) {
        super(machine, i, j, mirror);
        this.w = w;
        this.h = h;
        this.xExtendable = true;
        this.yExtendable = true;
        this.trackName = "rampX-" + w.toFixed(0) + "." + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let nBank = new BABYLON.Vector3(0, Math.cos(15 / 180 * Math.PI), Math.sin(15 / 180 * Math.PI));
        this.deltaI = w - 1;
        this.deltaJ = h;
        this.trackPoints = [[
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n.clone(), dir.clone(), 1.4, 1.4),
                new TrackPoint(this, new BABYLON.Vector3((tileWidth * (this.deltaI + 0.5) - tileWidth * 0.5) * 0.5, -tileHeight * (this.deltaJ) * 0.5, -0.03), nBank, dir.clone(), 1.4, 1.4),
                new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), -tileHeight * (this.deltaJ), 0), n.clone(), dir.clone(), 1.4, 1.4)
            ]];
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class SleeperMeshBuilder {
    static GenerateSleepersVertexData(track, spacing) {
        let partialsDatas = [];
        for (let j = 0; j < track.interpolatedPoints.length; j++) {
            let interpolatedPoints = track.interpolatedPoints[j];
            let summedLength = [0];
            for (let i = 1; i < interpolatedPoints.length; i++) {
                let prev = interpolatedPoints[i - 1];
                let trackpoint = interpolatedPoints[i];
                let dist = BABYLON.Vector3.Distance(prev, trackpoint);
                summedLength[i] = summedLength[i - 1] + dist;
            }
            let count = Math.round(summedLength[summedLength.length - 1] / spacing / 3) * 3;
            let correctedSpacing = summedLength[summedLength.length - 1] / count;
            let radius = track.wireSize * 0.5 * 0.75;
            let nShape = 6;
            let shape = [];
            for (let i = 0; i < nShape; i++) {
                let a = i / nShape * 2 * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                shape[i] = new BABYLON.Vector3(cosa * radius, sina * radius, 0);
            }
            let shapeSmall = [];
            for (let i = 0; i < nShape; i++) {
                let a = i / nShape * 2 * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                shapeSmall[i] = new BABYLON.Vector3(cosa * radius * 0.75, sina * radius * 0.75, 0);
            }
            let radiusPath = track.wireGauge * 0.5;
            let nPath = 12;
            let basePath = [];
            for (let i = 0; i <= nPath; i++) {
                let a = i / nPath * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                basePath[i] = new BABYLON.Vector3(cosa * radiusPath, -sina * radiusPath, 0);
            }
            let q = BABYLON.Quaternion.Identity();
            let n = 0.5;
            for (let i = 1; i < interpolatedPoints.length - 1; i++) {
                let sumPrev = summedLength[i - 1];
                let sum = summedLength[i];
                let sumNext = summedLength[i + 1];
                let targetSumLength = n * correctedSpacing;
                let addSleeper = false;
                if (sumPrev < targetSumLength && sum >= targetSumLength) {
                    let f = (targetSumLength - sumPrev) / (sum - sumPrev);
                    if (f > 0.5) {
                        addSleeper = true;
                    }
                }
                if (sum <= targetSumLength && sumNext > targetSumLength) {
                    let f = (targetSumLength - sum) / (sumNext - sum);
                    if (f <= 0.5) {
                        addSleeper = true;
                    }
                }
                if (addSleeper) {
                    let path = basePath.map(v => { return v.clone(); });
                    let dir = interpolatedPoints[i + 1].subtract(interpolatedPoints[i - 1]).normalize();
                    let t = interpolatedPoints[i];
                    Mummu.QuaternionFromYZAxisToRef(track.interpolatedNormals[j][i], dir, q);
                    let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), q, t);
                    for (let j = 0; j < path.length; j++) {
                        BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
                    }
                    let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                    tmp.dispose();
                    let addAnchor = false;
                    if ((n - 1.5) % 3 === 0) {
                        let anchor = path[nPath / 2 - 1];
                        if (anchor.z > -0.01) {
                            addAnchor = true;
                        }
                    }
                    if (addAnchor) {
                        let anchor = path[nPath / 2 - 1];
                        let anchorCenter = anchor.clone();
                        anchorCenter.z = 0.015;
                        let radiusFixation = Math.abs(anchor.z - anchorCenter.z);
                        let anchorWall = anchorCenter.clone();
                        anchorWall.y -= radiusFixation * 0.5;
                        let nFixation = 10;
                        let fixationPath = [];
                        for (let i = 0; i <= nFixation; i++) {
                            let a = i / nFixation * 0.5 * Math.PI;
                            let cosa = Math.cos(a);
                            let sina = Math.sin(a);
                            fixationPath[i] = new BABYLON.Vector3(0, -sina * radiusFixation * 0.5, -cosa * radiusFixation);
                            fixationPath[i].addInPlace(anchorCenter);
                        }
                        let tmp = BABYLON.ExtrudeShape("tmp", { shape: shape, path: fixationPath, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                        partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                        tmp.dispose();
                        let tmpVertexData = BABYLON.CreateCylinderVertexData({ height: 0.001, diameter: 0.01 });
                        let q = BABYLON.Quaternion.Identity();
                        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
                        Mummu.RotateVertexDataInPlace(tmpVertexData, q);
                        Mummu.TranslateVertexDataInPlace(tmpVertexData, anchorWall);
                        partialsDatas.push(tmpVertexData);
                        tmp.dispose();
                    }
                    n++;
                }
            }
        }
        return Mummu.MergeVertexDatas(...partialsDatas);
    }
}
/// <reference path="./Track.ts"/>
class Snake extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j);
        this.trackName = "snake";
        this.deltaI = 1;
        this.deltaJ = 0;
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.015, y: -0.0006, z: -0.02 }, normal: { x: 0, y: 0.983976396926608, z: 0.17829876693721267 } },
                { position: { x: 0.075, y: 0, z: 0 }, normal: { x: -0.0008909764600687716, y: 0.9800741060756494, z: -0.1986301909603991 } },
                { position: { x: 0.125, y: -0.0005, z: -0.02 }, normal: { x: 0, y: 0.9797898655773956, z: 0.20002954609714332 } },
                { position: { x: 0.225, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class Spiral extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j, mirror);
        this.trackName = "spiral";
        this.deltaJ = 3;
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.016, y: -0.0046, z: -0.003 }, normal: { x: -0.015717737727546616, y: 0.9540837723373087, z: -0.2991272439670763 } },
                { position: { x: 0.0539, y: -0.007, z: -0.0291 }, normal: { x: -0.23440514155513867, y: 0.9572137575720567, z: -0.16969399496534734 } },
                { position: { x: 0.0587, y: -0.0104, z: -0.0947 }, normal: { x: -0.26108911497483256, y: 0.962603890274194, z: 0.07229263081840669 } },
                { position: { x: -0.0004, y: -0.014, z: -0.132 }, normal: { x: -0.05669056122664204, y: 0.9496966537903617, z: 0.307997477339017 } },
                { position: { x: -0.0592, y: -0.0176, z: -0.0942 }, normal: { x: 0.2271455627956944, y: 0.956270760554333, z: 0.18425831273260118 } },
                { position: { x: -0.05457944698749076, y: -0.02093380924123054, z: -0.029224609659455173 }, normal: { x: 0.2828470950098421, y: 0.9527277009365863, z: -0.11093894137127873 } },
                { position: { x: -0.0001, y: -0.0242, z: -0.0002 }, normal: { x: 0.05761736284437951, y: 0.9614294117737494, z: -0.2689492994511073 } },
                { position: { x: 0.0539, y: -0.0274, z: -0.0291 }, normal: { x: -0.2056041140599629, y: 0.9592796231163523, z: -0.19367383136440203 } },
                { position: { x: 0.0585, y: -0.0308, z: -0.0951 }, normal: { x: -0.2760246393306465, y: 0.9577600466606554, z: 0.08066034653388042 } },
                { position: { x: -0.0004, y: -0.0344, z: -0.1318 }, normal: { x: -0.05646125432587785, y: 0.9628151753392908, z: 0.2641951265567164 } },
                { position: { x: -0.0596, y: -0.038, z: -0.0941 }, normal: { x: 0.207215385873428, y: 0.9626195991602705, z: 0.1744284700668061 } },
                { position: { x: -0.0545, y: -0.0414, z: -0.0289 }, normal: { x: 0.25683498853746184, y: 0.961760534367209, z: -0.09514443334563788 } },
                { position: { x: -0.0001, y: -0.0446, z: -0.0002 }, normal: { x: 0.05638334684224795, y: 0.9532309575517539, z: -0.29693713099549046 } },
                { position: { x: 0.0537, y: -0.0478, z: -0.0289 }, normal: { x: -0.2235635179648617, y: 0.9523438291486475, z: -0.20751044435802915 } },
                { position: { x: 0.0582, y: -0.0512, z: -0.0933 }, normal: { x: -0.2777348824891539, y: 0.9572384789896519, z: 0.08098042597019127 } },
                { position: { x: -0.0004, y: -0.0548, z: -0.1317 }, normal: { x: -0.059760670464650514, y: 0.9561892328648884, z: 0.28658474003141166 } },
                { position: { x: -0.0594, y: -0.0584, z: -0.0938 }, normal: { x: 0.2333172321844389, y: 0.9540226282981233, z: 0.18815922475641142 } },
                { position: { x: -0.0546, y: -0.0618, z: -0.029 }, normal: { x: 0.27002249679763296, y: 0.9572406097255708, z: -0.10381842955559523 } },
                { position: { x: 0.0001, y: -0.065, z: 0.0001 }, normal: { x: 0.056820314112295565, y: 0.9531047312532147, z: -0.2972588487613405 } },
                { position: { x: 0.0538, y: -0.0682, z: -0.0288 }, normal: { x: -0.22241380697343624, y: 0.9531421193320655, z: -0.2050663278618935 } },
                { position: { x: 0.0583, y: -0.0716, z: -0.0937 }, normal: { x: -0.26972561388849237, y: 0.9599379519312946, z: 0.07594222576687933 } },
                { position: { x: 0, y: -0.0752, z: -0.1314 }, normal: { x: -0.05845262320389176, y: 0.9606457375292047, z: 0.27155673036688727 } },
                { position: { x: -0.0591, y: -0.0788, z: -0.0935 }, normal: { x: 0.21156040971579268, y: 0.9609976130263491, z: 0.17811732312873305 } },
                { position: { x: -0.0545, y: -0.0822, z: -0.0289 }, normal: { x: 0.2585951718617067, y: 0.9642143266760841, z: -0.05847451857347828 } },
                { position: { x: -0.0171, y: -0.0846, z: -0.0034 }, normal: { x: 0.1212412050387472, y: 0.950287799276933, z: -0.2867990040885013 } },
                { position: { x: 0.075, y: -0.09, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
var TrackNames = [
    "ramp-1.1",
    "rampX-1.1",
    "uturn-s",
    "uturn-l",
    "loop",
    "wave",
    "snake",
    "spiral",
    "elevator-4"
];
class TrackFactory {
    constructor(machine) {
        this.machine = machine;
    }
    createTrackWH(trackname, i, j, w, h, mirror) {
        trackname = trackname.split("-")[0];
        let wh = "";
        if (isFinite(w)) {
            wh += w.toFixed(0) + ".";
        }
        if (isFinite(h)) {
            wh += h.toFixed(0);
        }
        trackname += "-" + wh;
        return this.createTrack(trackname, i, j, mirror);
    }
    createTrack(trackname, i, j, mirror) {
        if (trackname.startsWith("flat-")) {
            let w = parseInt(trackname.split("-")[1]);
            return new Ramp(this.machine, i, j, w, 0, mirror);
        }
        if (trackname.startsWith("flatX-")) {
            let w = parseInt(trackname.split("-")[1]);
            return new CrossingRamp(this.machine, i, j, w, 0, mirror);
        }
        if (trackname.startsWith("ramp-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            return new Ramp(this.machine, i, j, w, h, mirror);
        }
        if (trackname.startsWith("rampX-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            return new CrossingRamp(this.machine, i, j, w, h, mirror);
        }
        if (trackname === "uturn-s") {
            return new UTurn(this.machine, i, j, mirror);
        }
        if (trackname === "uturn-l") {
            return new UTurnLarge(this.machine, i, j, mirror);
        }
        if (trackname === "loop") {
            return new Loop(this.machine, i, j, mirror);
        }
        if (trackname === "wave") {
            return new Wave(this.machine, i, j, mirror);
        }
        if (trackname === "snake") {
            return new Snake(this.machine, i, j, mirror);
        }
        if (trackname === "spiral") {
            return new Spiral(this.machine, i, j, mirror);
        }
        if (trackname.startsWith("elevator-")) {
            let h = parseInt(trackname.split("-")[1]);
            return new Elevator(this.machine, i, j, h, mirror);
        }
    }
}
class UTurnLarge extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j, mirror);
        this.trackName = "uturn-l";
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.13394933569683048, y: -0.008441899296066684, z: 0.00026137674993623877 }, normal: { x: 0.032306075793350764, y: 0.9833195664766373, z: -0.17899426708984922 } },
                { position: { x: 0.1712, y: -0.01, z: -0.0105 }, normal: { x: -0.11360563098237532, y: 0.9568855505453798, z: -0.2673271474552511 } },
                { position: { x: 0.1955, y: -0.0116, z: -0.0372 }, normal: { x: -0.20660883087432497, y: 0.9643838758298143, z: -0.16515608085750325 } },
                { position: { x: 0.2038, y: -0.013, z: -0.0688 }, normal: { x: -0.25848323253959904, y: 0.9647301065787487, z: -0.049822083019837024 } },
                { position: { x: 0.197, y: -0.0144, z: -0.0992 }, normal: { x: -0.274874420263502, y: 0.9572314992222168, z: 0.09028792821629655 } },
                { position: { x: 0.1744, y: -0.016, z: -0.1265 }, normal: { x: -0.18804611436208896, y: 0.956335180137496, z: 0.22374468061767094 } },
                { position: { x: 0.1339, y: -0.0178, z: -0.1377 }, normal: { x: -0.051765501746220265, y: 0.9550181735779958, z: 0.29199421392334324 } },
                { position: { x: 0.0987, y: -0.0194, z: -0.1288 }, normal: { x: 0.11311928184404368, y: 0.954449314514888, z: 0.2760987759790836 } },
                { position: { x: 0.0723, y: -0.021, z: -0.1014 }, normal: { x: 0.2540510175431706, y: 0.9536388488664376, z: 0.16134133511898094 } },
                { position: { x: 0.055, y: -0.024, z: -0.0328 }, normal: { x: -0.2934267273272182, y: 0.9518591565545972, z: -0.08868428143255824 } },
                { position: { x: 0.0301, y: -0.0254, z: -0.009 }, normal: { x: -0.16527157396712613, y: 0.9629216416134613, z: -0.2132304362675873 } },
                { position: { x: -0.0057, y: -0.027, z: 0.0007 }, normal: { x: -0.056169210068177, y: 0.9868539889112726, z: -0.1515395143526165 } },
                { position: { x: -0.075, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: -1, y: 0, z: 0 } },
            ],
        });
        this.deltaI = 1;
        this.deltaJ = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class UTurn extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j, mirror);
        this.trackName = "uturn-s";
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.0193, y: -0.0084, z: 0.0003 }, normal: { x: -0.05500779973536025, y: 0.925151067399511, z: -0.37559239137370676 } },
                { position: { x: 0.05180769566226052, y: 0.0056684545036756045, z: -0.004609346816050227 }, normal: { x: -0.6257808486659882, y: 0.6834386999132468, z: -0.37591205474654144 }, tangentOut: 1.275 },
                { position: { x: 0.0638, y: 0.0181, z: -0.0256 }, normal: { x: -0.985533398197922, y: -0.018330358969221288, z: -0.16848714780812155 } },
                { position: { x: 0.0586, y: 0.0099, z: -0.0448 }, normal: { x: -0.8873689664333703, y: 0.20446962902517424, z: 0.4132414405856218 } },
                { position: { x: 0.0454, y: -0.0086, z: -0.0519 }, normal: { x: -0.5726089695906795, y: 0.5162041363475339, z: 0.6369083588413618 } },
                { position: { x: 0.0262, y: -0.0253, z: -0.0454 }, normal: { x: -0.01778258232366703, y: 0.911265522044504, z: 0.41143520522539134 } },
                { position: { x: -0.0152, y: -0.0301, z: -0.0069 }, normal: { x: -0.18431426214031815, y: 0.931209421797995, z: -0.31444755608259073 } },
                { position: { x: -0.075, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: -1, y: 0, z: 0 } },
            ],
        });
        this.deltaJ = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class Wave extends Track {
    constructor(machine, i, j, mirror) {
        super(machine, i, j);
        this.trackName = "wave";
        this.deltaI = 1;
        this.deltaJ = 1;
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: -0.02574170106019552, y: -0.02331256943245867, z: -1.3457124303783985e-10 }, normal: { x: 0.09980015069654494, y: 0.9950075024445529, z: 2.9746223976965384e-11 } },
                { position: { x: 0.0247, y: -0.01, z: 0 }, normal: { x: 0.06997826494958422, y: 0.9975485163312338, z: 7.031366138779832e-11 } },
                { position: { x: 0.07405330047633624, y: -0.030313212452661144, z: -1.1598073586596702e-10 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: -5.235549835316916e-10 } },
                { position: { x: 0.1247, y: -0.02, z: 0 }, normal: { x: 0.12353766744973763, y: 0.9923398836694403, z: 6.989528287372397e-12 } },
                { position: { x: 0.1734746589421829, y: -0.04269030514205091, z: 1.6954757086143357e-10 }, normal: { x: 0.09920903435744811, y: 0.9950666146052045, z: 8.515907414511131e-11 } },
                { position: { x: 0.22499999999999998, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
