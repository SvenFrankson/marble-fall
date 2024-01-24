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
            let f = this.velocity.length();
            f = Math.max(Math.min(f, 1), 0.4);
            this._timer -= dt / f;
            let weight = new BABYLON.Vector3(0, -9 * m, 0);
            let reactions = BABYLON.Vector3.Zero();
            let reactionsCount = 0;
            let forcedDisplacement = BABYLON.Vector3.Zero();
            let canceledSpeed = BABYLON.Vector3.Zero();
            this.machine.parts.forEach(part => {
                if (Mummu.AABBAABBIntersect(this.position.x - this.radius, this.position.x + this.radius, this.position.y - this.radius, this.position.y + this.radius, this.position.z - this.radius, this.position.z + this.radius, part.AABBMin.x - this.radius, part.AABBMax.x + this.radius, part.AABBMin.y - this.radius, part.AABBMax.y + this.radius, part.AABBMin.z - this.radius, part.AABBMax.z + this.radius)) {
                    part.allWires.forEach(wire => {
                        let col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5, !(part instanceof UTurnLarge));
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
                            let reaction = col.normal.scale(col.depth * 1000); // 1000 is a magic number.
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
                            this.marbleChocSound.volume = v / 5 * this.game.mainVolume;
                            this.marbleChocSound.play();
                        }
                        this.velocity.scaleInPlace(-0.15).addInPlace(otherSpeed.scale(0.85));
                        ball.velocity.scaleInPlace(-0.15).addInPlace(mySpeed.scale(0.85));
                        //this.velocity.copyFrom(otherSpeed).scaleInPlace(.5);
                        //ball.velocity.copyFrom(mySpeed).scaleInPlace(.6);
                        let dir = this.position.subtract(ball.position).normalize();
                        this.position.addInPlace(dir.scale(depth));
                    }
                }
            });
            if (reactionsCount > 0) {
                reactions.scaleInPlace(1 / reactionsCount);
                canceledSpeed.scaleInPlace(1 / reactionsCount).scaleInPlace(1);
                forcedDisplacement.scaleInPlace(1 / reactionsCount).scaleInPlace(1);
            }
            this.strReaction = this.strReaction * 0.98;
            this.strReaction += reactions.length() * 0.02;
            this.velocity.subtractInPlace(canceledSpeed);
            this.position.addInPlace(forcedDisplacement);
            let friction = this.velocity.scale(-1).scaleInPlace(0.001);
            let acceleration = weight.add(reactions).add(friction).scaleInPlace(1 / m);
            this.velocity.addInPlace(acceleration.scale(dt));
            this.position.addInPlace(this.velocity.scale(dt));
        }
        this.marbleLoopSound.volume = this.strReaction * this.velocity.length() * this.game.timeFactor * this.game.mainVolume;
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
var demo4 = {
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
var demoTest = {
    balls: [{ x: -0.19965407373238375, y: 0.06913964667829861 }],
    parts: [
        { name: "split", i: 0, j: -1 },
        { name: "ramp-1.1", i: -1, j: -2 },
        { name: "uturn-l", i: 1, j: 1 },
        { name: "uturn-s", i: -1, j: 1, mirror: true },
        { name: "ramp-1.0", i: 0, j: 2 },
    ],
};
var demo3 = {
    balls: [
        { x: -0.7529580212020577, y: -0.1654427630682682 },
        { x: -0.7513297912847231, y: -0.32829114967876044 },
        { x: -0.7517784289994465, y: -0.2470864404297073 },
        { x: -0.7522482200985597, y: -0.08369699812598332 },
        { x: -0.7521042373550704, y: -0.0019488102905312332 },
    ],
    parts: [
        { name: "split", i: -2, j: 0 },
        { name: "split", i: -2, j: 3 },
        { name: "split", i: -2, j: 6 },
        { name: "join", i: -2, j: 9, mirror: true },
        { name: "ramp-2.1", i: -4, j: 10, mirror: true },
        { name: "uturn-l", i: -1, j: 2 },
        { name: "uturn-l", i: -4, j: 2, mirror: true },
        { name: "uturn-l", i: -1, j: 5 },
        { name: "uturn-l", i: -1, j: 8 },
        { name: "uturn-l", i: -4, j: 5, mirror: true },
        { name: "uturn-l", i: -4, j: 8, mirror: true },
        { name: "ramp-2.1", i: -4, j: -1 },
        { name: "elevator-13", i: -5, j: -2, mirror: true },
    ],
};
var createDefault = {
    balls: [
        { x: 0.42531514018827754, y: -0.04840511502662046 },
        { x: 0.4025330286177473, y: -0.048624483332179405 },
        { x: 0.3799147747766348, y: -0.047314622188705205 },
        { x: 0.35788764058897626, y: -0.04672729838009122 },
        { x: 0.3351445547662884, y: -0.045358694798261004 },
    ],
    parts: [
        { name: "loop", i: 1, j: -6, mirror: true },
        { name: "spiral", i: 0, j: -3, mirror: true },
        { name: "uturn-l", i: -2, j: 0, mirror: true },
        { name: "ramp-3.1", i: 0, j: 1 },
        { name: "elevator-9", i: 3, j: -7 },
    ],
};
var demo3D = {
    balls: [
        { x: 0.39808697121492503, y: 0.041276811477638765 },
        { x: 0.42178813750112076, y: 0.03490450521423004 },
        { x: 0.4479109908664016, y: 0.030144576207480372 },
        { x: 0.45307246397059453, y: 0.18084865692846974 },
        { x: 0.422445081390991, y: 0.2655912743747426 },
        { x: 0.3756430183403636, y: 0.044253335357509804 },
    ],
    parts: [
        { name: "uturnlayer-1.2", i: 0, j: -4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.2", i: 5, j: 0, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.3", i: 1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.2", i: 5, j: -5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-8", i: 3, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: 1, j: -5, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.4.1", i: 1, j: -4, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.2.1", i: 2, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-2.3", i: 1, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.1.2", i: 2, j: -6, k: 1, mirrorX: false, mirrorZ: true },
    ],
};
var demoLoop = {
    balls: [
        { x: 0.39808697121492503, y: 0.041276811477638765 },
        { x: 0.42178813750112076, y: 0.03490450521423004 },
        { x: 0.4479109908664016, y: 0.030144576207480372 },
        { x: 0.4512616994466042, y: 0.3383223566718828 },
        { x: 0.37699677269433557, y: 0.04633268053343625 },
    ],
    parts: [
        { name: "uturnlayer-1.3", i: 1, j: -1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-2.2", i: 1, j: -11, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -12, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.2", i: 8, j: 1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2", i: 6, j: 1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: 5, j: 1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2", i: 7, j: 1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-12", i: 3, j: -13, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.11.1", i: 2, j: -10, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 2, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-6.2.2", i: 2, j: -1, k: 2, mirrorX: false, mirrorZ: false },
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
class MachineEditor {
    constructor(game) {
        this.game = game;
        this.items = new Map();
        this._currentLayer = 0;
        this._selectedItem = "";
        this._dragOffset = BABYLON.Vector3.Zero();
        this._pointerDownX = 0;
        this._pointerDownY = 0;
        this.pointerDown = (event) => {
            this._pointerDownX = this.game.scene.pointerX;
            this._pointerDownY = this.game.scene.pointerY;
            if (this.selectedObject) {
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh instanceof BallGhost || mesh instanceof MachinePartSelectorMesh) {
                        return true;
                    }
                    return false;
                });
                if (pick.hit) {
                    let pickedObject;
                    if (pick.pickedMesh instanceof BallGhost) {
                        pickedObject = pick.pickedMesh.ball;
                    }
                    else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                        console.log("!");
                        pickedObject = pick.pickedMesh.part;
                    }
                    if (pickedObject === this.selectedObject) {
                        pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                            if (mesh === this.layerMesh) {
                                return true;
                            }
                        });
                        if (pick.hit && pick.pickedPoint) {
                            if (this.selectedObject instanceof MachinePart) {
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
                    if (mesh instanceof MachinePartSelectorMesh) {
                        if (mesh.part != this.draggedObject) {
                            return true;
                        }
                    }
                    if (mesh === this.layerMesh) {
                        return true;
                    }
                });
                if (pick.hit && pick.pickedMesh === this.layerMesh) {
                    let point = pick.pickedPoint.add(this._dragOffset);
                    if (this.draggedObject instanceof MachinePart) {
                        let i = Math.round(point.x / tileWidth);
                        let j = Math.floor((-point.y + 0.25 * tileHeight) / tileHeight);
                        if (i != this.draggedObject.i || j != this.draggedObject.j) {
                            this.draggedObject.setI(i);
                            this.draggedObject.setJ(j);
                            this.draggedObject.setIsVisible(true);
                            this.updateFloatingElements();
                        }
                    }
                    else if (this.draggedObject instanceof Ball) {
                        let p = point.clone();
                        p.z = 0;
                        this.draggedObject.setPositionZero(p);
                        this.draggedObject.setIsVisible(true);
                        this.updateFloatingElements();
                        if (!this.machine.playing) {
                            this.draggedObject.reset();
                        }
                    }
                }
                else if (pick.hit && pick.pickedMesh instanceof MachinePartSelectorMesh && this.draggedObject instanceof MachinePart) {
                    // Not working
                    let n = pick.getNormal(true);
                    if (Math.abs(n.x) > 0) {
                        let point = pick.pickedPoint;
                        let i = Math.round(point.x / tileWidth);
                        let j = Math.floor((-point.y + 0.25 * tileHeight) / tileHeight);
                        if (i != this.draggedObject.i || j != this.draggedObject.j) {
                            this.draggedObject.setI(i);
                            this.draggedObject.setJ(j);
                            this.draggedObject.setK(pick.pickedMesh.part.k);
                            this.draggedObject.setIsVisible(true);
                            this.updateFloatingElements();
                        }
                    }
                }
                else {
                    this.draggedObject.setIsVisible(false);
                }
            }
        };
        this.pointerUp = (event) => {
            let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                if (!this.draggedObject && (mesh instanceof BallGhost || mesh instanceof MachinePartSelectorMesh)) {
                    return true;
                }
                else if (this.draggedObject && mesh === this.layerMesh) {
                    return true;
                }
                return false;
            });
            if (pick.hit) {
                let point = pick.pickedPoint.add(this._dragOffset);
                if (this.draggedObject instanceof MachinePart) {
                    let draggedTrack = this.draggedObject;
                    if (this.machine.parts.indexOf(draggedTrack) === -1) {
                        this.machine.parts.push(draggedTrack);
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
                        else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                            this.setSelectedObject(pick.pickedMesh.part);
                        }
                    }
                }
            }
            else {
                let dx = (this._pointerDownX - this.game.scene.pointerX);
                let dy = (this._pointerDownY - this.game.scene.pointerY);
                if (dx * dx + dy * dy < 10) {
                    this.setSelectedObject(undefined);
                }
            }
        };
        this.actionTileSize = 0.018;
        this._onHPlusTop = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h + 1;
                let j = track.j - 1;
                let editedTrack = await this.editTrackInPlace(track, undefined, j, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onHMinusTop = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h - 1;
                let j = track.j + 1;
                if (h >= 0) {
                    let editedTrack = await this.editTrackInPlace(track, undefined, j, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onWPlusRight = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let w = track.w + 1;
                let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onWMinusRight = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let w = track.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onHPlusBottom = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h + 1;
                let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onHMinusBottom = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h - 1;
                if (h >= 0) {
                    let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onWPlusLeft = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let i = track.i - 1;
                let w = track.w + 1;
                let editedTrack = await this.editTrackInPlace(track, i, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onWMinusLeft = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let i = track.i + 1;
                let w = track.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.editTrackInPlace(track, i, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onDPlus = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.zExtendable) {
                let d = track.d + 1;
                let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, track.yExtendable ? track.h : undefined, d);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onDMinus = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.zExtendable) {
                let d = track.d - 1;
                if (d >= 1) {
                    let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, track.yExtendable ? track.h : undefined, d);
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onDelete = async () => {
            if (this.selectedObject) {
                this.selectedObject.dispose();
                this.setSelectedObject(undefined);
                this.setDraggedObject(undefined);
            }
        };
        this._onMirrorX = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart) {
                let editedTrack = await this.mirrorXTrackInPlace(track);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onMirrorZ = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart) {
                let editedTrack = await this.mirrorZTrackInPlace(track);
                this.setSelectedObject(editedTrack);
            }
        };
        this._onOriginIPlus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginIMinus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: -1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginJPlus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 1, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginJMinus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: -1, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginKPlus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 1 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginKMinus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: -1 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onDestinationIPlus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 1, j: 0, k: 0 }));
            }
        };
        this._onDestinationIMinus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: -1, j: 0, k: 0 }));
            }
        };
        this._onDestinationJPlus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 1, k: 0 }));
            }
        };
        this._onDestinationJMinus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: -1, k: 0 }));
            }
        };
        this._onDestinationKPlus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: 1 }));
            }
        };
        this._onDestinationKMinus = async () => {
            if (this.selectedObject instanceof Ramp) {
                this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: -1 }));
            }
        };
        this.container = document.getElementById("machine-menu");
        this.itemContainer = this.container.querySelector("#machine-editor-item-container");
        this.layerMesh = BABYLON.MeshBuilder.CreatePlane("layer-mesh", { size: 100 });
        this.layerMesh.isVisible = false;
        this.machinePartEditorMenu = new MachinePartEditorMenu(this);
    }
    get machine() {
        return this.game.machine;
    }
    get currentLayer() {
        return this._currentLayer;
    }
    set currentLayer(v) {
        if (v >= 0) {
            this._currentLayer = Math.round(v);
            this.layerMesh.position.z = -this._currentLayer * tileDepth;
        }
    }
    showCurrentLayer() {
        this.machine.parts.forEach(part => {
            if (part.k === this.currentLayer) {
                part.partVisibilityMode = PartVisibilityMode.Default;
            }
            else {
                part.partVisibilityMode = PartVisibilityMode.Ghost;
            }
        });
    }
    hideCurrentLayer() {
        this.machine.parts.forEach(part => {
            part.partVisibilityMode = PartVisibilityMode.Default;
        });
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
        return this._draggedObject;
    }
    setDraggedObject(s) {
        if (s != this._draggedObject) {
            this._draggedObject = s;
            if (this._draggedObject) {
                this.game.camera.detachControl();
                this.showCurrentLayer();
            }
            else {
                this.game.camera.attachControl();
                this.hideCurrentLayer();
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
            if (this._selectedObject instanceof MachinePart) {
                this.currentLayer = this._selectedObject.k;
                this.machinePartEditorMenu.currentPart = this._selectedObject;
            }
        }
        else {
            this.machinePartEditorMenu.currentPart = undefined;
        }
        this.updateFloatingElements();
    }
    async instantiate() {
        document.getElementById("machine-editor-objects").style.display = "block";
        this.game.toolbar.resize();
        this.machinePartEditorMenu.initialize();
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
                    let track = this.machine.trackFactory.createTrack(this._selectedItem, -10, -10, this.currentLayer);
                    track.instantiate().then(() => {
                        track.setIsVisible(false);
                    });
                    this.setDraggedObject(track);
                    this._dragOffset.copyFromFloats(0, 0, 0);
                }
            });
        }
        document.addEventListener("keyup", (event) => {
            if (event.key === "x" || event.key === "Delete") {
                if (this.selectedObject) {
                    this.selectedObject.dispose();
                    this.setSelectedObject(undefined);
                    this.setDraggedObject(undefined);
                }
            }
            else if (event.key === "m") {
                if (this.draggedObject && this.draggedObject instanceof MachinePart) {
                    this.mirrorXTrackInPlace(this.draggedObject).then(track => {
                        this.setDraggedObject(track);
                    });
                }
                else if (this.selectedObject && this.selectedObject instanceof MachinePart) {
                    this.mirrorXTrackInPlace(this.selectedObject).then(track => {
                        this.setSelectedObject(track);
                    });
                }
            }
            else if (event.code === "Numpad4") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginIMinus();
                }
            }
            else if (event.code === "Numpad6") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginIPlus();
                }
            }
            else if (event.code === "Numpad2") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginJPlus();
                }
            }
            else if (event.code === "Numpad8") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginJMinus();
                }
            }
            else if (event.code === "KeyW") {
                if (this.selectedObject instanceof MachinePart) {
                    this.selectedObject.setJ(this.selectedObject.j - 1);
                    this.selectedObject.recomputeAbsolutePath();
                }
            }
            else if (event.code === "KeyA") {
                if (this.selectedObject instanceof MachinePart) {
                    this.selectedObject.setI(this.selectedObject.i - 1);
                    this.selectedObject.recomputeAbsolutePath();
                }
            }
            else if (event.code === "KeyS") {
                if (this.selectedObject instanceof MachinePart) {
                    this.selectedObject.setJ(this.selectedObject.j + 1);
                    this.selectedObject.recomputeAbsolutePath();
                }
            }
            else if (event.code === "KeyD") {
                if (this.selectedObject instanceof MachinePart) {
                    this.selectedObject.setI(this.selectedObject.i + 1);
                    this.selectedObject.recomputeAbsolutePath();
                }
            }
            else if (event.code === "KeyQ") {
                if (this.selectedObject instanceof MachinePart) {
                    this.selectedObject.setK(this.selectedObject.k - 1);
                    this.selectedObject.recomputeAbsolutePath();
                }
            }
            else if (event.code === "KeyE") {
                if (this.selectedObject instanceof MachinePart) {
                    this.selectedObject.setK(this.selectedObject.k + 1);
                    this.selectedObject.recomputeAbsolutePath();
                }
            }
        });
        this.game.canvas.addEventListener("pointerdown", this.pointerDown);
        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);
        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }
        this.floatingElementTop = FloatingElement.Create(this.game);
        this.floatingElementTop.anchor = FloatingElementAnchor.BottomCenter;
        this.HPlusTopButton = this._createButton("machine-editor-h-plus-top", this.floatingElementTop);
        this.HPlusTopButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HPlusTopButton.onclick = this._onHPlusTop;
        this.HMinusTopButton = this._createButton("machine-editor-h-minus-top", this.floatingElementTop);
        this.HMinusTopButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HMinusTopButton.onclick = this._onHMinusTop;
        this.floatingElementRight = FloatingElement.Create(this.game);
        this.floatingElementRight.anchor = FloatingElementAnchor.LeftMiddle;
        this.WMinusRightButton = this._createButton("machine-editor-w-minus-right", this.floatingElementRight);
        this.WMinusRightButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.WMinusRightButton.onclick = this._onWMinusRight;
        this.WPlusRightButton = this._createButton("machine-editor-w-plus-right", this.floatingElementRight);
        this.WPlusRightButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
				<path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
			</svg>
        `;
        this.WPlusRightButton.onclick = this._onWPlusRight;
        this.floatingElementBottom = FloatingElement.Create(this.game);
        this.floatingElementBottom.anchor = FloatingElementAnchor.TopCenter;
        this.HMinusBottomButton = this._createButton("machine-editor-h-minus-bottom", this.floatingElementBottom);
        this.HMinusBottomButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HMinusBottomButton.onclick = this._onHMinusBottom;
        this.HPlusBottomButton = this._createButton("machine-editor-h-plus-bottom", this.floatingElementBottom);
        this.HPlusBottomButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HPlusBottomButton.onclick = this._onHPlusBottom;
        this.floatingElementLeft = FloatingElement.Create(this.game);
        this.floatingElementLeft.anchor = FloatingElementAnchor.RightMiddle;
        this.WPlusLeftButton = this._createButton("machine-editor-w-plus-left", this.floatingElementLeft);
        this.WPlusLeftButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.WPlusLeftButton.onclick = this._onWPlusLeft;
        this.WMinusLeftButton = this._createButton("machine-editor-w-minus-left", this.floatingElementLeft);
        this.WMinusLeftButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.WMinusLeftButton.onclick = this._onWMinusLeft;
        this.floatingElementDelete = FloatingElement.Create(this.game);
        this.floatingElementDelete.anchor = FloatingElementAnchor.LeftBottom;
        this.deletebutton = this._createButton("machine-editor-delete", this.floatingElementDelete);
        this.deletebutton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 25 L75 75 M25 75 L75 25" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.deletebutton.onclick = this._onDelete;
        this.floatingElementBottomRight = FloatingElement.Create(this.game);
        this.floatingElementBottomRight.anchor = FloatingElementAnchor.LeftTop;
        this.tileMirrorXButton = this._createButton("machine-editor-mirror-x", this.floatingElementBottomRight);
        this.tileMirrorXButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L10 50 L25 70 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M75 30 L90 50 L75 70 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M15 50 L85 50" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.tileMirrorXButton.onclick = this._onMirrorX;
        this.tileMirrorZButton = this._createButton("machine-editor-mirror-z", this.floatingElementBottomRight);
        this.tileMirrorZButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L50 10 L70 25 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M30 75 L50 90 L70 75 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M50 15 L50 85"  fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.tileMirrorZButton.onclick = this._onMirrorZ;
        this.floatingElementBottomLeft = FloatingElement.Create(this.game);
        this.floatingElementBottomLeft.style.width = "10px";
        this.floatingElementBottomLeft.anchor = FloatingElementAnchor.RightTop;
        this.DMinusButton = this._createButton("machine-editor-d-minus", this.floatingElementBottomLeft);
        this.DMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
            <path d="M10 70 L50 20 L90 70 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.DMinusButton.onclick = this._onDMinus;
        this.DPlusButton = this._createButton("machine-editor-d-plus", this.floatingElementBottomLeft);
        this.DPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M10 30 L50 80 L90 30 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.DPlusButton.onclick = this._onDPlus;
        // Ramp Origin UI
        this.floatingElementOrigin = FloatingElement.Create(this.game);
        this.floatingElementOrigin.style.width = "calc(var(--button-xs-size) * 3.5)";
        this.floatingElementOrigin.anchor = FloatingElementAnchor.CenterMiddle;
        this.originKMinusButton = this._createButton("machine-editor-origin-k-minus", this.floatingElementOrigin);
        this.originKMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
            <path d="M10 70 L50 20 L90 70 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originKMinusButton.onclick = this._onOriginKMinus;
        this.originJMinusButton = this._createButton("machine-editor-origin-j-minus", this.floatingElementOrigin);
        this.originJMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originJMinusButton.onclick = this._onOriginJMinus;
        this._createButton("", this.floatingElementOrigin, true);
        this.originIMinusButton = this._createButton("machine-editor-origin-i-minus", this.floatingElementOrigin);
        this.originIMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originIMinusButton.onclick = this._onOriginIMinus;
        this._createButton("", this.floatingElementOrigin, true);
        this.originIPlusButton = this._createButton("machine-editor-origin-i-plus", this.floatingElementOrigin);
        this.originIPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originIPlusButton.onclick = this._onOriginIPlus;
        this.originKPlusButton = this._createButton("machine-editor-origin-k-plus", this.floatingElementOrigin);
        this.originKPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M10 30 L50 80 L90 30 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originKPlusButton.onclick = this._onOriginKPlus;
        this.originJPlusButton = this._createButton("machine-editor-origin-j-plus", this.floatingElementOrigin);
        this.originJPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originJPlusButton.onclick = this._onOriginJPlus;
        this._createButton("", this.floatingElementOrigin, true);
        // Ramp Destination UI
        this.floatingElementDestination = FloatingElement.Create(this.game);
        this.floatingElementDestination.style.width = "calc(var(--button-xs-size) * 3.5)";
        this.floatingElementDestination.anchor = FloatingElementAnchor.CenterMiddle;
        this.destinationKMinusButton = this._createButton("machine-editor-destination-k-minus", this.floatingElementDestination);
        this.destinationKMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
            <path d="M10 70 L50 20 L90 70 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationKMinusButton.onclick = this._onDestinationKMinus;
        this.destinationJMinusButton = this._createButton("machine-editor-destination-j-minus", this.floatingElementDestination);
        this.destinationJMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationJMinusButton.onclick = this._onDestinationJMinus;
        this._createButton("", this.floatingElementDestination, true);
        this.destinationIMinusButton = this._createButton("machine-editor-destination-i-minus", this.floatingElementDestination);
        this.destinationIMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationIMinusButton.onclick = this._onDestinationIMinus;
        this._createButton("", this.floatingElementDestination, true);
        this.destinationIPlusButton = this._createButton("machine-editor-destination-i-plus", this.floatingElementDestination);
        this.destinationIPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationIPlusButton.onclick = this._onDestinationIPlus;
        this.destinationKPlusButton = this._createButton("machine-editor-destination-k-plus", this.floatingElementDestination);
        this.destinationKPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M10 30 L50 80 L90 30 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationKPlusButton.onclick = this._onDestinationKPlus;
        this.destinationJPlusButton = this._createButton("machine-editor-destination-j-plus", this.floatingElementDestination);
        this.destinationJPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationJPlusButton.onclick = this._onDestinationJPlus;
        this._createButton("", this.floatingElementDestination, true);
        this.floatingButtons = [
            this.HPlusTopButton,
            this.HMinusTopButton,
            this.WMinusRightButton,
            this.WPlusRightButton,
            this.HMinusBottomButton,
            this.HPlusBottomButton,
            this.WPlusLeftButton,
            this.WMinusLeftButton,
            this.deletebutton,
            this.tileMirrorXButton,
            this.tileMirrorZButton,
            this.DPlusButton,
            this.DMinusButton,
            this.originIPlusButton,
            this.originIMinusButton,
            this.originJPlusButton,
            this.originJMinusButton,
            this.originKPlusButton,
            this.originKMinusButton,
            this.destinationIPlusButton,
            this.destinationIMinusButton,
            this.destinationJPlusButton,
            this.destinationJMinusButton,
            this.destinationKPlusButton,
            this.destinationKMinusButton,
        ];
        this.updateFloatingElements();
    }
    _createButton(id, parent, spacer = false) {
        let button = document.createElement("button");
        if (id != "") {
            button.id = id;
        }
        button.classList.add("btn");
        button.classList.add("xs");
        if (spacer) {
            button.style.visibility = "hidden";
        }
        parent.appendChild(button);
        return button;
    }
    dispose() {
        document.getElementById("machine-editor-objects").style.display = "none";
        this.game.toolbar.resize();
        this.machinePartEditorMenu.dispose();
        this.floatingElementTop.dispose();
        this.floatingElementRight.dispose();
        this.floatingElementBottom.dispose();
        this.floatingElementLeft.dispose();
        this.floatingElementDelete.dispose();
        this.floatingElementBottomRight.dispose();
        this.floatingElementBottomLeft.dispose();
        this.itemContainer.innerHTML = "";
        this.items = new Map();
        this.game.canvas.removeEventListener("pointerdown", this.pointerDown);
        this.game.canvas.removeEventListener("pointermove", this.pointerMove);
        this.game.canvas.removeEventListener("pointerup", this.pointerUp);
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
    async editTrackInPlace(track, i, j, k, w, h, d) {
        if (!isFinite(i)) {
            i = track.i;
        }
        if (!isFinite(j)) {
            j = track.j;
        }
        if (!isFinite(k)) {
            k = track.k;
        }
        let editedTrack = this.machine.trackFactory.createTrackWHD(track.partName, i, j, k, w, h, d, track.mirrorX, track.mirrorZ);
        track.dispose();
        this.machine.parts.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        await editedTrack.instantiate();
        editedTrack.recomputeAbsolutePath();
        this.machine.generateBaseMesh();
        return editedTrack;
    }
    async editRampOriginDestInPlace(ramp, dOrigin, dDestination) {
        let origin = ramp.getOrigin();
        origin.i += dOrigin.i;
        origin.j += dOrigin.j;
        origin.k += dOrigin.k;
        let destination = ramp.getDestination();
        destination.i += dDestination.i;
        destination.j += dDestination.j;
        destination.k += dDestination.k;
        if (origin.i >= destination.i) {
            return ramp;
        }
        let editedRamp = Ramp.CreateFromOriginDestination(origin, destination, this.machine);
        ramp.dispose();
        this.machine.parts.push(editedRamp);
        editedRamp.setIsVisible(true);
        editedRamp.generateWires();
        await editedRamp.instantiate();
        editedRamp.recomputeAbsolutePath();
        this.machine.generateBaseMesh();
        return editedRamp;
    }
    async mirrorXTrackInPlace(track) {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, !track.mirrorX);
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate();
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }
    async mirrorZTrackInPlace(track) {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, track.mirrorX, !track.mirrorZ);
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate();
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }
    getCurrentItemElement() {
        return this.items.get(this._selectedItem);
    }
    updateFloatingElements() {
        this.floatingButtons.forEach(button => {
            button.style.display = "none";
        });
        if (this.selectedObject) {
            let s = this.actionTileSize;
            if (this.selectedObject instanceof Ball) {
                this.deletebutton.style.display = "";
                this.floatingElementDelete.setTarget(new BABYLON.Vector3(this.selectedObject.positionZeroGhost.position.x, this.selectedObject.positionZeroGhost.position.y - this.selectedObject.radius - 0.005, this.selectedObject.positionZeroGhost.position.z + 0));
                this.floatingElementDelete.anchor = FloatingElementAnchor.TopCenter;
            }
            else if (this.selectedObject instanceof MachinePart) {
                let s34 = 3 * s / 4;
                let xLeft = -tileWidth * 0.5;
                let xRight = tileWidth * (this.selectedObject.w - 0.5);
                let xCenter = (xLeft + xRight) * 0.5;
                let yTop = tileHeight * 0.25;
                let yBottom = -tileHeight * (this.selectedObject.h + 0.75);
                let yCenter = (yTop + yBottom) * 0.5;
                this.floatingElementTop.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xCenter, this.selectedObject.position.y + yTop, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                this.floatingElementRight.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xRight, this.selectedObject.position.y + yCenter, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                this.floatingElementBottom.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xCenter, this.selectedObject.position.y + yBottom, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                this.floatingElementLeft.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xLeft, this.selectedObject.position.y + yCenter, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                this.floatingElementBottomRight.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xRight, this.selectedObject.position.y + yBottom, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                this.floatingElementBottomLeft.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xLeft, this.selectedObject.position.y + yBottom, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                if (this.selectedObject instanceof Ramp) {
                    let origin = this.selectedObject.getOrigin();
                    this.floatingElementOrigin.setTarget(new BABYLON.Vector3(origin.i * tileWidth - 0.5 * tileWidth, -origin.j * tileHeight, -origin.k * tileDepth));
                    let destination = this.selectedObject.getDestination();
                    this.floatingElementDestination.setTarget(new BABYLON.Vector3(destination.i * tileWidth - 0.5 * tileWidth, -destination.j * tileHeight, -destination.k * tileDepth));
                    this.floatingElementDelete.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xCenter, this.selectedObject.position.y + yBottom, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                    this.floatingElementDelete.anchor = FloatingElementAnchor.TopCenter;
                }
                else {
                    this.floatingElementDelete.setTarget(new BABYLON.Vector3(this.selectedObject.position.x + xRight, this.selectedObject.position.y + yTop, this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth));
                    this.floatingElementDelete.anchor = FloatingElementAnchor.LeftBottom;
                }
                if (this.selectedObject instanceof Ramp) {
                    this.originIPlusButton.style.display = "";
                    this.originIMinusButton.style.display = "";
                    this.originJPlusButton.style.display = "";
                    this.originJMinusButton.style.display = "";
                    this.originKPlusButton.style.display = "";
                    this.originKMinusButton.style.display = "";
                    this.destinationIPlusButton.style.display = "";
                    this.destinationIMinusButton.style.display = "";
                    this.destinationJPlusButton.style.display = "";
                    this.destinationJMinusButton.style.display = "";
                    this.destinationKPlusButton.style.display = "";
                    this.destinationKMinusButton.style.display = "";
                }
                else {
                    if (this.selectedObject.xExtendable) {
                        this.WMinusRightButton.style.display = "";
                        this.WPlusRightButton.style.display = "";
                        this.WMinusLeftButton.style.display = "";
                        this.WPlusLeftButton.style.display = "";
                    }
                    if (this.selectedObject.yExtendable) {
                        this.HMinusTopButton.style.display = "";
                        this.HPlusTopButton.style.display = "";
                        this.HPlusBottomButton.style.display = "";
                        this.HMinusBottomButton.style.display = "";
                    }
                    if (this.selectedObject.zExtendable) {
                        this.DPlusButton.style.display = "";
                        this.DMinusButton.style.display = "";
                    }
                    if (this.selectedObject.xMirrorable) {
                        this.tileMirrorXButton.style.display = "";
                    }
                    if (this.selectedObject.zMirrorable) {
                        this.tileMirrorZButton.style.display = "";
                    }
                }
                this.deletebutton.style.display = "";
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
        this.mainVolume = 0;
        this.targetTimeFactor = 0.8;
        this.timeFactor = 0.1;
        this.physicDT = 0.0005;
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
        let savedMainSound = window.localStorage.getItem("saved-main-volume");
        if (savedMainSound) {
            let v = parseFloat(savedMainSound);
            if (isFinite(v)) {
                this.mainVolume = Math.max(Math.min(v, 1), 0);
            }
        }
        let savedTimeFactor = window.localStorage.getItem("saved-time-factor");
        if (savedTimeFactor) {
            let v = parseFloat(savedTimeFactor);
            if (isFinite(v)) {
                this.targetTimeFactor = Math.max(Math.min(v, 1), 0);
            }
        }
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
        this.blueMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.blueMaterial.diffuseColor = BABYLON.Color3.FromHexString("#00FFFF");
        this.blueMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.steelMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.steelMaterial.baseColor = new BABYLON.Color3(0.5, 0.75, 1.0);
        this.steelMaterial.metallic = 1.0;
        this.steelMaterial.roughness = 0.15;
        this.steelMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);
        this.copperMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.copperMaterial.baseColor = BABYLON.Color3.FromHexString("#B87333");
        this.copperMaterial.metallic = 1.0;
        this.copperMaterial.roughness = 0.15;
        this.copperMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);
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
        this.camera.panningSensibility = 2000;
        this.camera.panningInertia *= 0.1;
        this.camera.lowerRadiusLimit = 0.05;
        this.camera.upperRadiusLimit = 1.5;
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
        this.creditPlaque = new MenuTile("credit-plaque", 0.2, 0.15, this);
        await this.creditPlaque.instantiate();
        this.creditPlaque.material.emissiveColor.copyFromFloats(1, 1, 1);
        this.creditPlaque.position.x = 0;
        this.creditPlaque.position.y = 0;
        this.creditPlaque.position.z = 0.13;
        this.creditPlaque.rotation.y = Math.PI;
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
            ctx = this.creditPlaque.texture.getContext();
            w = this.creditPlaque.texW;
            h = this.creditPlaque.texH;
            ctx.drawImage(blackboardTex, 80, 200, w, h, 0, 0, w, h);
            this.creditPlaque.texture.drawText("DESIGN, ART & CODE", 140, 200, "70px 'Serif'", "white", null);
            this.creditPlaque.texture.drawText("Sven Frankson", 70, 300, "70px 'Serif'", "white", null);
            this.creditPlaque.texture.drawText("Powered by BABYLONJS", 70, 450, "50px 'Serif'", "white", null);
            this.creditPlaque.texture.drawText("Blackboard texture from FREEPIK", 70, 550, "50px 'Serif'", "white", null);
            this.creditPlaque.texture.drawText("CC0 Wood material from TEXTURECAN", 70, 650, "50px 'Serif'", "white", null);
            this.creditPlaque.texture.drawText("Find license file on GitHub for related urls", 70, 750, "40px 'Serif'", "#8a8674", null);
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
        //this.makeScreenshot("split");
        //return;
        this.toolbar = new Toolbar(this);
        this.toolbar.initialize();
        //let logo = new Logo();
        //logo.initialize();
        this.setContext(GameMode.CreateMode);
    }
    animate() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();
        });
        window.addEventListener("resize", () => {
            this.engine.resize();
            this.toolbar.resize();
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
        window.localStorage.setItem("saved-main-volume", this.mainVolume.toFixed(2));
        window.localStorage.setItem("saved-time-factor", this.targetTimeFactor.toFixed(2));
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
                this.machine.deserialize(demoLoop);
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
                    this.setCameraTarget(new BABYLON.Vector3(-0.33, -0.17, 0));
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
            this.toolbar.resize();
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
        this.creditPlaque.setIsVisible(false);
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
                    this.camera.radius = 0.25 + Math.max(0.15 * (track.w - 1), 0);
                    this.camera.target.copyFromFloats(tileWidth * ((track.w - 1) * 0.55), -tileHeight * (track.h) * 0.5, 0);
                }
                if (objectName === "spiral") {
                    this.camera.target.x -= tileWidth * 0.1;
                    this.camera.target.y -= tileHeight * 0.6;
                    this.camera.radius += 0.1;
                }
                if (track) {
                    this.machine.parts = [track];
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
    getCameraZoomFactor() {
        let f = 1 - (this.camera.radius - this.camera.lowerRadiusLimit) / (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit);
        return f * f;
    }
    setCameraZoomFactor(v) {
        let f = Math.sqrt(v);
        this.camera.radius = (1 - f) * (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit) + this.camera.lowerRadiusLimit;
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
    setIsVisible(isVisible) {
        this.isVisible = isVisible;
        this.getChildMeshes().forEach(m => {
            m.isVisible = isVisible;
        });
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
        if (isFinite(v)) {
            this._audioElement.volume = Math.max(Math.min(v, 1), 0);
        }
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
        let data = BABYLON.CreateSphereVertexData({ diameter: 0.6 * this.trackPoint.track.part.wireGauge });
        data.applyToMesh(this);
        this.position.copyFrom(this.trackPoint.position);
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        this.setNormal(trackPoint.normal);
        this.parent = trackPoint.track.part;
        let normalIndicator = BABYLON.MeshBuilder.CreateCylinder("normal", { height: this.trackPoint.track.part.wireGauge, diameter: 0.0005, tessellation: 8 });
        normalIndicator.parent = this;
        normalIndicator.position.copyFromFloats(0, 0.6 * this.trackPoint.track.part.wireGauge * 0.5 + this.trackPoint.track.part.wireGauge * 0.5, 0);
        this.setMaterial(this.trackPoint.track.part.game.handleMaterial);
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
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
                    this.updateHandles();
                }
                else if (this.dragTrackPoint && this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                    this.dragTrackPoint = false;
                    this.hoveredTrackPoint.position.copyFrom(this.hoveredTrackPointHandle.position);
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
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
                        this.part.generateWires();
                        this.part.recomputeAbsolutePath();
                        this.part.rebuildWireMeshes();
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
                let slopePrev = this.part.getSlopeAt(this.selectedTrackPointIndex - 1);
                document.getElementById("slope-prev").innerText = slopePrev.toFixed(1) + "%";
                let slopeCurr = this.part.getSlopeAt(this.selectedTrackPointIndex);
                document.getElementById("slope-curr").innerText = slopeCurr.toFixed(1) + "%";
                let slopeNext = this.part.getSlopeAt(this.selectedTrackPointIndex + 1);
                document.getElementById("slope-next").innerText = slopeNext.toFixed(1) + "%";
                this.activeTrackpointTangentIn.setValue(this.selectedTrackPoint.tangentIn);
                this.activeTrackpointTangentOut.setValue(this.selectedTrackPoint.tangentOut);
                let bankCurr = this.part.getBankAt(this.selectedTrackPointIndex);
                document.getElementById("active-trackpoint-bank").innerText = bankCurr.toFixed(1) + "°";
            }
            if (this.part) {
                document.getElementById("slope-global").innerText = this.part.globalSlope.toFixed(1) + "%";
            }
            this.helperCircleRadius.setValue(this.helperShape.circleRadius);
            this.helperGridSize.setValue(this.helperShape.gridSize);
        };
        this.setTrack(this.game.machine.parts[0]);
        this.helperShape = new HelperShape();
    }
    get part() {
        return this._track;
    }
    setTrack(t) {
        if (t != this.part) {
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
            let trackIndex = this.game.machine.parts.indexOf(this._track);
            if (trackIndex > 0) {
                this.setTrack(this.game.machine.parts[trackIndex - 1]);
                this.centerOnTrack();
            }
        });
        document.getElementById("next-track").addEventListener("click", () => {
            let trackIndex = this.game.machine.parts.indexOf(this._track);
            if (trackIndex < this.game.machine.parts.length - 1) {
                this.setTrack(this.game.machine.parts[trackIndex + 1]);
                this.centerOnTrack();
            }
        });
        document.getElementById("load").addEventListener("click", () => {
            if (this.part) {
                let s = window.localStorage.getItem("last-saved-track");
                if (s) {
                    let data = JSON.parse(s);
                    this.part.deserialize(data);
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
                }
            }
        });
        document.getElementById("save").addEventListener("click", () => {
            if (this.part) {
                let data = this.part.serialize();
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
            if (this.part && this.selectedTrackPoint) {
                let target = BABYLON.Vector3.TransformCoordinates(this.selectedTrackPoint.position, this.part.getWorldMatrix());
                this.game.setCameraTarget(target);
            }
        });
        document.getElementById("btn-center-track").addEventListener("click", () => {
            this.centerOnTrack();
        });
        document.getElementById("btn-display-wire").addEventListener("click", () => {
            if (this.part) {
                this.part.renderOnlyPath = false;
                this.part.rebuildWireMeshes();
                this.updateHandles();
            }
        });
        document.getElementById("btn-display-path").addEventListener("click", () => {
            if (this.part) {
                this.part.renderOnlyPath = true;
                this.part.rebuildWireMeshes();
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
            if (this.part) {
                let newTrackIndex = (this.selectedTrackPointIndex - 1 + this.part.tracks[0].trackpoints.length) % this.part.tracks[0].trackpoints.length;
                this.setSelectedTrackPointIndex(newTrackIndex);
            }
        });
        document.getElementById("next-trackpoint").addEventListener("click", () => {
            if (this.part) {
                let newTrackIndex = (this.selectedTrackPointIndex + 1) % this.part.tracks[0].trackpoints.length;
                this.setSelectedTrackPointIndex(newTrackIndex);
            }
        });
        this.activeTrackpointPositionInput = document.getElementById("active-trackpoint-pos");
        this.activeTrackpointPositionInput.onInputXYZCallback = (xyz) => {
            if (this.part) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointNormalInput = document.getElementById("active-trackpoint-normal");
        this.activeTrackpointNormalInput.onInputXYZCallback = (xyz) => {
            if (this.part) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointTangentIn = document.getElementById("active-trackpoint-tan-in");
        this.activeTrackpointTangentIn.onInputNCallback = (n) => {
            if (this.part) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.selectedTrackPoint.tangentIn = n;
                    this.selectedTrackPoint.fixedTangentIn = true;
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointTangentOut = document.getElementById("active-trackpoint-tan-out");
        this.activeTrackpointTangentOut.onInputNCallback = (n) => {
            if (this.part) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.selectedTrackPoint.tangentOut = n;
                    this.selectedTrackPoint.fixedTangentOut = true;
                    this.part.generateWires();
                    this.part.recomputeAbsolutePath();
                    this.part.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        document.getElementById("active-trackpoint-split").addEventListener("click", () => {
            if (this.part) {
                this.part.splitTrackPointAt(this.selectedTrackPointIndex);
                this.part.generateWires();
                this.part.recomputeAbsolutePath();
                this.part.rebuildWireMeshes();
                this.rebuildHandles();
            }
        });
        document.getElementById("active-trackpoint-delete").addEventListener("click", () => {
            if (this.part) {
                this.part.deleteTrackPointAt(this.selectedTrackPointIndex);
                this.part.generateWires();
                this.part.recomputeAbsolutePath();
                this.part.rebuildWireMeshes();
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
        for (let i = 0; i < this.part.tracks[0].trackpoints.length; i++) {
            let handle = new TrackPointHandle(this.part.tracks[0].trackpoints[0][i]);
            this.trackPointhandles.push(handle);
            let pPrev = this.part.tracks[0].trackpoints[0][i - 1] ? this.part.tracks[0].trackpoints[0][i - 1].position : undefined;
            let p = this.part.tracks[0].trackpoints[0][i].position;
            let pNext = this.part.tracks[0].trackpoints[0][i + 1] ? this.part.tracks[0].trackpoints[0][i + 1].position : undefined;
            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }
            Mummu.QuaternionFromYZAxisToRef(this.part.tracks[0].trackpoints[0][i].normal, pNext.subtract(pPrev), handle.rotationQuaternion);
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
            this.normalHandle.position.copyFromFloats(0, 0.015 + 0.5 * this.part.wireGauge / 2, 0);
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
        if (this.part) {
            let center = this.part.getBarycenter();
            center.x = this.part.position.x;
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
        if (isFinite(this.wireSize)) {
            return this.wireSize;
        }
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
        this.computeWorldMatrix(true);
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
class Machine {
    constructor(game) {
        this.game = game;
        this.parts = [];
        this.balls = [];
        this.instantiated = false;
        this.playing = false;
        this.onStopCallbacks = new Nabu.UniqueList();
        this.trackFactory = new MachinePartFactory(this);
    }
    async instantiate() {
        for (let i = 0; i < this.balls.length; i++) {
            await this.balls[i].instantiate();
        }
        for (let i = 0; i < this.parts.length; i++) {
            await this.parts[i].instantiate();
        }
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                for (let i = 0; i < this.parts.length; i++) {
                    this.parts[i].recomputeAbsolutePath();
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
        while (this.parts.length > 0) {
            this.parts[0].dispose();
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
                for (let i = 0; i < this.parts.length; i++) {
                    this.parts[i].update(dt);
                }
            }
        }
        else {
            for (let i = 0; i < this.balls.length; i++) {
                if (this.balls[i].marbleLoopSound.volume > 0.01) {
                    this.balls[i].marbleLoopSound.volume *= 0.9;
                }
                else {
                    this.balls[i].marbleLoopSound.volume = 0;
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
        for (let i = 0; i < this.parts.length; i++) {
            let track = this.parts[i];
            minX = Math.min(minX, track.position.x - tileWidth * 0.5);
            maxX = Math.max(maxX, track.position.x + tileWidth * (track.w - 0.5));
            minY = Math.min(minY, track.position.y - tileHeight * (track.h + 1));
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
        for (let i = 0; i < this.parts.length; i++) {
            data.parts.push({
                name: this.parts[i].partName,
                i: this.parts[i].i,
                j: this.parts[i].j,
                k: this.parts[i].k,
                mirrorX: this.parts[i].mirrorX,
                mirrorZ: this.parts[i].mirrorZ
            });
        }
        return data;
    }
    deserialize(data) {
        this.balls = [];
        this.parts = [];
        for (let i = 0; i < data.balls.length; i++) {
            let ballData = data.balls[i];
            let ball = new Ball(new BABYLON.Vector3(ballData.x, ballData.y, 0), this);
            this.balls.push(ball);
        }
        for (let i = 0; i < data.parts.length; i++) {
            let part = data.parts[i];
            let track = this.trackFactory.createTrack(part.name, part.i, part.j, part.k, part.mirror ? true : part.mirrorX, part.mirrorZ);
            this.parts.push(track);
        }
    }
}
var baseRadius = 0.075;
var tileWidth = 0.15;
var tileHeight = 0.03;
var tileDepth = 0.06;
var PartVisibilityMode;
(function (PartVisibilityMode) {
    PartVisibilityMode[PartVisibilityMode["Default"] = 0] = "Default";
    PartVisibilityMode[PartVisibilityMode["Selected"] = 1] = "Selected";
    PartVisibilityMode[PartVisibilityMode["Ghost"] = 2] = "Ghost";
})(PartVisibilityMode || (PartVisibilityMode = {}));
var radius = 0.014 * 1.2 / 2;
var selectorHullShape = [];
for (let i = 0; i < 6; i++) {
    let a = i / 6 * 2 * Math.PI;
    let cosa = Math.cos(a);
    let sina = Math.sin(a);
    selectorHullShape[i] = new BABYLON.Vector3(cosa * radius, sina * radius, 0);
}
class MachinePartSelectorMesh extends BABYLON.Mesh {
    constructor(part) {
        super("machine-part-selector");
        this.part = part;
    }
}
class MachinePart extends BABYLON.Mesh {
    constructor(machine, _i, _j, _k, prop) {
        super("track", machine.game.scene);
        this.machine = machine;
        this._i = _i;
        this._j = _j;
        this._k = _k;
        this.partName = "machine-part";
        this.tracks = [];
        this.wires = [];
        this.allWires = [];
        this.wireSize = 0.0015;
        this.wireGauge = 0.014;
        this.renderOnlyPath = false;
        this.summedLength = [0];
        this.totalLength = 0;
        this.globalSlope = 0;
        this.AABBMin = BABYLON.Vector3.Zero();
        this.AABBMax = BABYLON.Vector3.Zero();
        this.w = 1;
        this.h = 1;
        this.d = 1;
        this.mirrorX = false;
        this.mirrorZ = false;
        this.xExtendable = false;
        this.yExtendable = false;
        this.zExtendable = false;
        this.minD = 1;
        this.xMirrorable = false;
        this.zMirrorable = false;
        this._partVisibilityMode = PartVisibilityMode.Default;
        this.position.x = this._i * tileWidth;
        this.position.y = -this._j * tileHeight;
        this.position.z = -this._k * tileDepth;
        if (prop) {
            if (isFinite(prop.w)) {
                this.w = prop.w;
            }
            if (isFinite(prop.h)) {
                this.h = prop.h;
            }
            if (isFinite(prop.d)) {
                this.d = prop.d;
            }
            if (prop.mirrorX) {
                this.mirrorX = true;
            }
            if (prop.mirrorZ) {
                this.mirrorZ = true;
            }
        }
        this.tracks = [new Track(this)];
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
    get k() {
        return this._k;
    }
    setK(v) {
        this._k = v;
        this._k = Math.max(this._k, 0);
        this.position.z = -this._k * tileDepth;
    }
    setIsVisible(isVisible) {
        this.isVisible = isVisible;
        this.getChildren(undefined, false).forEach(m => {
            if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector") {
                m.isVisible = isVisible;
            }
        });
    }
    get partVisilibityMode() {
        return this._partVisibilityMode;
    }
    set partVisibilityMode(v) {
        this._partVisibilityMode = v;
        if (this._partVisibilityMode === PartVisibilityMode.Default) {
            this.getChildren(undefined, false).forEach(m => {
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector") {
                    m.visibility = 1;
                }
            });
        }
        if (this._partVisibilityMode === PartVisibilityMode.Ghost) {
            this.getChildren(undefined, false).forEach(m => {
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector") {
                    m.visibility = 0.3;
                }
            });
        }
    }
    select() {
        this.selectorMesh.visibility = 0.2;
    }
    unselect() {
        this.selectorMesh.visibility = 0;
    }
    mirrorXTrackPointsInPlace() {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].mirrorXTrackPointsInPlace();
        }
    }
    mirrorZTrackPointsInPlace() {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].mirrorZTrackPointsInPlace();
        }
    }
    getSlopeAt(index, trackIndex = 0) {
        if (this.tracks[trackIndex]) {
            return this.tracks[trackIndex].getSlopeAt(index);
        }
        return 0;
    }
    getBankAt(index, trackIndex = 0) {
        if (this.tracks[trackIndex]) {
            return this.tracks[trackIndex].getBankAt(index);
        }
        return 0;
    }
    splitTrackPointAt(index, trackIndex = 0) {
        if (this.tracks[trackIndex]) {
            this.tracks[trackIndex].splitTrackPointAt(index);
        }
    }
    deleteTrackPointAt(index, trackIndex = 0) {
        if (this.tracks[trackIndex]) {
            this.tracks[trackIndex].deleteTrackPointAt(index);
        }
    }
    getBarycenter() {
        if (this.tracks[0].trackpoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.tracks[0].trackpoints.map(trackpoint => {
            return trackpoint.position;
        }).reduce((pos1, pos2) => {
            return pos1.add(pos2);
        }).scaleInPlace(1 / this.tracks[0].trackpoints.length);
        return BABYLON.Vector3.TransformCoordinates(barycenter, this.getWorldMatrix());
    }
    recomputeAbsolutePath() {
        this.computeWorldMatrix(true);
        this.tracks.forEach(track => {
            track.recomputeAbsolutePath();
        });
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
    async instantiate() {
        if (this.sleepersMesh) {
            this.sleepersMesh.dispose();
        }
        this.sleepersMesh = new BABYLON.Mesh("sleepers-mesh");
        this.sleepersMesh.material = this.game.steelMaterial;
        this.sleepersMesh.parent = this;
        let datas = [];
        for (let n = 0; n < this.tracks.length; n++) {
            let points = [...this.tracks[n].interpolatedPoints].map(p => { return p.clone(); });
            Mummu.DecimatePathInPlace(points, 10 / 180 * Math.PI);
            let dirStart = points[1].subtract(points[0]).normalize();
            let dirEnd = points[points.length - 1].subtract(points[points.length - 2]).normalize();
            points[0].subtractInPlace(dirStart.scale(this.wireGauge * 0.5));
            points[points.length - 1].addInPlace(dirEnd.scale(this.wireGauge * 0.5));
            let tmp = BABYLON.ExtrudeShape("wire", { shape: selectorHullShape, path: this.tracks[n].interpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let data = BABYLON.VertexData.ExtractFromMesh(tmp);
            datas.push(data);
            tmp.dispose();
        }
        if (this.selectorMesh) {
            this.selectorMesh.dispose();
        }
        this.selectorMesh = new MachinePartSelectorMesh(this);
        this.selectorMesh.material = this.game.blueMaterial;
        this.selectorMesh.parent = this;
        if (datas.length) {
            Mummu.MergeVertexDatas(...datas).applyToMesh(this.selectorMesh);
        }
        this.selectorMesh.visibility = 0;
        this.rebuildWireMeshes();
    }
    dispose() {
        super.dispose();
        let index = this.machine.parts.indexOf(this);
        if (index > -1) {
            this.machine.parts.splice(index, 1);
        }
    }
    generateWires() {
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(-Infinity, -Infinity, -Infinity);
        this.allWires = [...this.wires];
        this.tracks.forEach(track => {
            track.generateWires();
            this.AABBMin.minimizeInPlace(track.AABBMin);
            this.AABBMax.maximizeInPlace(track.AABBMax);
            this.allWires.push(track.wires[0], track.wires[1]);
        });
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
            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.tracks[0].interpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let vertexData = BABYLON.VertexData.ExtractFromMesh(tmp);
            vertexData.applyToMesh(this.sleepersMesh);
            tmp.dispose();
            this.allWires.forEach(wire => {
                wire.hide();
            });
        }
        else {
            this.allWires.forEach(wire => {
                wire.show();
            });
            SleeperMeshBuilder.GenerateSleepersVertexData(this, 0.03).applyToMesh(this.sleepersMesh);
            this.tracks.forEach(track => {
                track.wires.forEach(wire => {
                    wire.instantiate();
                });
            });
            this.wires.forEach(wire => {
                wire.instantiate();
            });
        }
    }
    serialize() {
        let data = { points: [] };
        for (let i = 0; i < this.tracks[0].trackpoints.length; i++) {
            data.points[i] = {
                position: { x: this.tracks[0].trackpoints[i].position.x, y: this.tracks[0].trackpoints[i].position.y, z: this.tracks[0].trackpoints[i].position.z }
            };
            if (this.tracks[0].trackpoints[i].fixedNormal) {
                data.points[i].normal = { x: this.tracks[0].trackpoints[i].normal.x, y: this.tracks[0].trackpoints[i].normal.y, z: this.tracks[0].trackpoints[i].normal.z };
            }
            if (this.tracks[0].trackpoints[i].fixedDir) {
                data.points[i].dir = { x: this.tracks[0].trackpoints[i].dir.x, y: this.tracks[0].trackpoints[i].dir.y, z: this.tracks[0].trackpoints[i].dir.z };
            }
            if (this.tracks[0].trackpoints[i].fixedTangentIn) {
                data.points[i].tangentIn = this.tracks[0].trackpoints[i].tangentIn;
            }
            if (this.tracks[0].trackpoints[i].fixedTangentOut) {
                data.points[i].tangentOut = this.tracks[0].trackpoints[i].tangentOut;
            }
        }
        return data;
    }
    deserialize(data) {
        this.tracks = [new Track(this)];
        for (let i = 0; i < data.points.length; i++) {
            let pointData = data.points[i];
            let direction;
            if (pointData.dir) {
                direction = new BABYLON.Vector3(pointData.dir.x, pointData.dir.y, pointData.dir.z);
            }
            let trackPoint = new TrackPoint(this.tracks[0], new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z), direction, pointData.tangentIn, pointData.tangentOut);
            this.tracks[0].trackpoints[i] = trackPoint;
        }
    }
}
var TrackNames = [
    "ramp-1.1.1",
    "ramp-1.1.2",
    "join",
    "split",
    "uturn-s",
    "uturn-l",
    "uturnlayer-1.2",
    "loop-1.2",
    "loop",
    "wave",
    "snake",
    "spiral",
    "elevator-4"
];
class MachinePartFactory {
    constructor(machine) {
        this.machine = machine;
    }
    createTrackWHD(trackname, i, j, k = 0, w, h, d, mirrorX, mirrorZ) {
        trackname = trackname.split("-")[0];
        let whd = "";
        if (isFinite(w)) {
            whd += w.toFixed(0) + ".";
        }
        if (isFinite(h)) {
            whd += h.toFixed(0) + ".";
        }
        if (isFinite(d)) {
            whd += d.toFixed(0) + ".";
        }
        whd = whd.substring(0, whd.length - 1);
        trackname += "-" + whd;
        return this.createTrack(trackname, i, j, k, mirrorX, mirrorZ);
    }
    createTrack(trackname, i, j, k = 0, mirrorX, mirrorZ) {
        if (trackname.startsWith("ramp-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Ramp(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname === "uturn-s") {
            return new UTurn(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "uturn-l") {
            return new UTurnLarge(this.machine, i, j, k, mirrorX);
        }
        if (trackname.startsWith("uturnlayer-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            return new UTurnLayer(this.machine, i, j, k, h, d, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("loop-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            return new Loop2(this.machine, i, j, k, w, d, mirrorX, mirrorZ);
        }
        if (trackname === "loop") {
            return new Loop(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "wave") {
            return new Wave(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "snake") {
            return new Snake(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "spiral") {
            return new Spiral(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "join") {
            return new Join(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "split") {
            return new Split(this.machine, i, j, k, mirrorX);
        }
        if (trackname.startsWith("elevator-")) {
            let h = parseInt(trackname.split("-")[1]);
            return new Elevator(this.machine, i, j, k, h, mirrorX);
        }
    }
}
class SleeperMeshBuilder {
    static GenerateSleepersVertexData(part, spacing) {
        let partialsDatas = [];
        for (let j = 0; j < part.tracks.length; j++) {
            let interpolatedPoints = part.tracks[j].interpolatedPoints;
            let summedLength = [0];
            for (let i = 1; i < interpolatedPoints.length; i++) {
                let prev = interpolatedPoints[i - 1];
                let trackpoint = interpolatedPoints[i];
                let dist = BABYLON.Vector3.Distance(prev, trackpoint);
                summedLength[i] = summedLength[i - 1] + dist;
            }
            let count = Math.round(summedLength[summedLength.length - 1] / spacing / 3) * 3;
            count = Math.max(1, count);
            let correctedSpacing = summedLength[summedLength.length - 1] / count;
            let radius = part.wireSize * 0.5 * 0.75;
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
            let radiusPath = part.wireGauge * 0.5;
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
                    Mummu.QuaternionFromYZAxisToRef(part.tracks[j].interpolatedNormals[i], dir, q);
                    let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), q, t);
                    for (let j = 0; j < path.length; j++) {
                        BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
                    }
                    let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                    tmp.dispose();
                    let addAnchor = false;
                    if (part.k === 0 && (n - 1.5) % 3 === 0) {
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
class Track {
    constructor(part) {
        this.part = part;
        this.trackpoints = [];
        this.summedLength = [0];
        this.totalLength = 0;
        this.globalSlope = 0;
        this.AABBMin = BABYLON.Vector3.Zero();
        this.AABBMax = BABYLON.Vector3.Zero();
        this.wires = [
            new Wire(this.part),
            new Wire(this.part)
        ];
    }
    mirrorXTrackPointsInPlace() {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.x *= -1;
            this.trackpoints[i].position.x += (this.part.w - 1) * tileWidth;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.x *= -1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.x *= -1;
            }
        }
    }
    mirrorZTrackPointsInPlace() {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.z += (this.part.d - 1) * tileDepth * 0.5;
            this.trackpoints[i].position.z *= -1;
            this.trackpoints[i].position.z -= (this.part.d - 1) * tileDepth * 0.5;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.z *= -1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.z *= -1;
            }
        }
    }
    getSlopeAt(index) {
        let trackpoint = this.trackpoints[index];
        let nextTrackPoint = this.trackpoints[index + 1];
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
    getBankAt(index) {
        let trackpoint = this.trackpoints[index];
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
    splitTrackPointAt(index) {
        if (index === 0) {
            let trackPoint = this.trackpoints[0];
            let nextTrackPoint = this.trackpoints[0 + 1];
            let distA = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInA = trackPoint.dir.scale(distA * trackPoint.tangentOut);
            let tanOutA = nextTrackPoint.dir.scale(distA * nextTrackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(trackPoint.position, tanInA, nextTrackPoint.position, tanOutA, 0.5);
            let normalA = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 0.5);
            let trackPointA = new TrackPoint(this, pointA, normalA);
            this.trackpoints.splice(1, 0, trackPointA);
        }
        if (index > 0 && index < this.trackpoints.length - 1) {
            let prevTrackPoint = this.trackpoints[index - 1];
            let trackPoint = this.trackpoints[index];
            let nextTrackPoint = this.trackpoints[index + 1];
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
            this.trackpoints.splice(index, 1, trackPointA, trackPointB);
        }
    }
    deleteTrackPointAt(index) {
        if (index > 0 && index < this.trackpoints.length - 1) {
            this.trackpoints.splice(index, 1);
        }
    }
    generateWires() {
        this.interpolatedPoints = [];
        this.interpolatedNormals = [];
        // Update normals and tangents
        for (let i = 1; i < this.trackpoints.length - 1; i++) {
            let prevTrackPoint = this.trackpoints[i - 1];
            let trackPoint = this.trackpoints[i];
            let nextTrackPoint = this.trackpoints[i + 1];
            if (!trackPoint.fixedDir) {
                trackPoint.dir.copyFrom(nextTrackPoint.position).subtractInPlace(prevTrackPoint.position).normalize();
            }
            if (!trackPoint.fixedTangentIn) {
                trackPoint.tangentIn = 1;
            }
            if (!trackPoint.fixedTangentOut) {
                trackPoint.tangentOut = 1;
            }
        }
        this.wires[0].path = [];
        this.wires[1].path = [];
        this.trackpoints[0].summedLength = 0;
        for (let i = 0; i < this.trackpoints.length - 1; i++) {
            let trackPoint = this.trackpoints[i];
            let nextTrackPoint = this.trackpoints[i + 1];
            let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanIn = this.trackpoints[i].dir.scale(dist * trackPoint.tangentOut);
            let tanOut = this.trackpoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
            let count = Math.round(dist / 0.003);
            count = Math.max(0, count);
            this.interpolatedPoints.push(trackPoint.position);
            nextTrackPoint.summedLength = trackPoint.summedLength;
            for (let k = 1; k < count; k++) {
                let amount = k / count;
                let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                this.interpolatedPoints.push(point);
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(this.interpolatedPoints[this.interpolatedPoints.length - 2], this.interpolatedPoints[this.interpolatedPoints.length - 1]);
            }
            nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, this.interpolatedPoints[this.interpolatedPoints.length - 1]);
        }
        this.interpolatedPoints.push(this.trackpoints[this.trackpoints.length - 1].position);
        let N = this.interpolatedPoints.length;
        let normalsForward = [];
        let normalsBackward = [];
        normalsForward.push(this.trackpoints[0].normal);
        for (let i = 1; i < this.interpolatedPoints.length - 1; i++) {
            let prevNormal = normalsForward[i - 1];
            let point = this.interpolatedPoints[i];
            let nextPoint = this.interpolatedPoints[i + 1];
            let dir = nextPoint.subtract(point).normalize();
            let n = prevNormal;
            let right = BABYLON.Vector3.Cross(n, dir);
            n = BABYLON.Vector3.Cross(dir, right).normalize();
            normalsForward.push(n);
        }
        normalsForward.push(this.trackpoints[this.trackpoints.length - 1].normal);
        normalsBackward[this.interpolatedPoints.length - 1] = this.trackpoints[this.trackpoints.length - 1].normal;
        for (let i = this.interpolatedPoints.length - 2; i >= 1; i--) {
            let prevNormal = normalsBackward[i + 1];
            let point = this.interpolatedPoints[i];
            let prevPoint = this.interpolatedPoints[i - 1];
            let dir = prevPoint.subtract(point).normalize();
            let n = prevNormal;
            let right = BABYLON.Vector3.Cross(n, dir);
            n = BABYLON.Vector3.Cross(dir, right).normalize();
            normalsBackward[i] = n;
        }
        normalsBackward[0] = this.trackpoints[0].normal;
        for (let i = 0; i < N; i++) {
            let f = i / (N - 1);
            this.interpolatedNormals.push(BABYLON.Vector3.Lerp(normalsForward[i], normalsBackward[i], f).normalize());
        }
        let angles = [0];
        for (let i = 1; i < N - 1; i++) {
            let n = this.interpolatedNormals[i];
            let prevPoint = this.interpolatedPoints[i - 1];
            let point = this.interpolatedPoints[i];
            let nextPoint = this.interpolatedPoints[i + 1];
            let dirPrev = point.subtract(prevPoint);
            let dPrev = dirPrev.length();
            let dirNext = nextPoint.subtract(point);
            let dNext = dirNext.length();
            let a = Mummu.AngleFromToAround(dirPrev.scale(-1), dirNext, n);
            if (Math.abs(a) < Math.PI * 0.9999) {
                let sign = Math.sign(a);
                let rPrev = Math.tan(Math.abs(a) / 2) * (dPrev * 0.5);
                let rNext = Math.tan(Math.abs(a) / 2) * (dNext * 0.5);
                let r = (rPrev + rNext) * 0.5;
                let f = 0.06 / r;
                f = Math.max(Math.min(f, 1), 0);
                angles[i] = Math.PI / 4 * sign * f;
            }
            else {
                angles[i] = 0;
            }
        }
        angles.push(0);
        for (let n = 0; n < 50; n++) {
            let newAngles = [...angles];
            for (let i = 1; i < N - 1; i++) {
                let aPrev = angles[i - 1];
                let a = angles[i];
                let aNext = angles[i + 1];
                newAngles[i] = (aPrev + a + aNext) / 3;
            }
            angles = newAngles;
        }
        for (let i = 1; i < N - 1; i++) {
            let point = this.interpolatedPoints[i];
            let nextPoint = this.interpolatedPoints[i + 1];
            let dirNext = nextPoint.subtract(point);
            Mummu.RotateInPlace(this.interpolatedNormals[i], dirNext, angles[i]);
        }
        this.summedLength = [0];
        this.totalLength = 0;
        for (let i = 0; i < N - 1; i++) {
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1];
            let dir = pNext.subtract(p);
            let d = dir.length();
            dir.scaleInPlace(1 / d);
            let right = BABYLON.Vector3.Cross(this.interpolatedNormals[i], dir);
            this.interpolatedNormals[i] = BABYLON.Vector3.Cross(dir, right).normalize();
            this.summedLength[i + 1] = this.summedLength[i] + d;
        }
        this.totalLength = this.summedLength[N - 1];
        let dh = this.interpolatedPoints[this.interpolatedPoints.length - 1].y - this.interpolatedPoints[0].y;
        this.globalSlope = dh / this.totalLength * 100;
        // Compute wire path and Update AABB values.
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < N; i++) {
            let pPrev = this.interpolatedPoints[i - 1] ? this.interpolatedPoints[i - 1] : undefined;
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1] ? this.interpolatedPoints[i + 1] : undefined;
            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }
            let dir = pNext.subtract(pPrev).normalize();
            let up = this.interpolatedNormals[i];
            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);
            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);
            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-this.part.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.part.wireGauge * 0.5, 0, 0), matrix);
            this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
            this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
        }
        Mummu.DecimatePathInPlace(this.wires[0].path, 2 / 180 * Math.PI);
        Mummu.DecimatePathInPlace(this.wires[1].path, 2 / 180 * Math.PI);
        this.AABBMin.x -= this.part.wireSize * 0.5;
        this.AABBMin.y -= this.part.wireSize * 0.5;
        this.AABBMin.z -= this.part.wireSize * 0.5;
        this.AABBMax.x += this.part.wireSize * 0.5;
        this.AABBMax.y += this.part.wireSize * 0.5;
        this.AABBMax.z += this.part.wireSize * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.part.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.part.getWorldMatrix(), this.AABBMax);
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
}
class TrackPoint {
    constructor(track, position, dir, tangentIn, tangentOut) {
        this.track = track;
        this.position = position;
        this.dir = dir;
        this.tangentIn = tangentIn;
        this.tangentOut = tangentOut;
        this.normal = BABYLON.Vector3.Up();
        this.fixedNormal = false;
        this.fixedDir = false;
        this.fixedTangentIn = false;
        this.fixedTangentOut = false;
        this.summedLength = 0;
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
        let right = BABYLON.Vector3.Cross(this.normal, this.dir).normalize();
        BABYLON.Vector3.CrossToRef(this.dir, right, this.normal);
        this.normal.normalize();
    }
    isFirstOrLast() {
        let index = this.track.trackpoints.indexOf(this);
        if (index === 0 || index === this.track.trackpoints.length - 1) {
            return true;
        }
        return false;
    }
}
class Elevator extends MachinePart {
    constructor(machine, i, j, k, h = 1, mirrorX) {
        super(machine, i, j, k, {
            h: 1,
            mirrorX: mirrorX
        });
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
        this.xMirrorable = true;
        this.partName = "elevator-" + h.toFixed(0);
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
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight * this.h, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.1, -tileHeight * (this.h + 0.15), 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0, -tileHeight * (this.h + 0.35), 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0 + 0.01, -tileHeight * (this.h + 0.35) + 0.01, 0), n),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0 + 0.01, 0 - tileHeight, 0), n),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-0.005, 0.035 - tileHeight, 0), (new BABYLON.Vector3(-1, 1, 0)).normalize())
        ];
        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight, 0), dirLeft),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(-0.008, -tileHeight * 0.5, 0), dirRight)
        ];
        let x = 1;
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
            x = -1;
        }
        this.wheels = [
            new BABYLON.Mesh("wheel-0"),
            new BABYLON.Mesh("wheel-1")
        ];
        this.wheels[0].position.copyFromFloats(0.030 * x, -tileHeight * (this.h + 0.35), 0);
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
        this.wires = [];
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
            rampWire0.path = [new BABYLON.Vector3(-0.02 * x, 0.0015, rRamp)];
            let nRamp = 12;
            for (let i = 0; i <= nRamp; i++) {
                let a = i / nRamp * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                rampWire0.path.push(new BABYLON.Vector3((sina * rRamp - rRamp - 0.0005) * x, 0, cosa * rRamp));
            }
            rampWire0.path.push(new BABYLON.Vector3(-0.02 * x, 0.0015, -rRamp));
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
        this.generateWires();
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
        if (this.mirrorX) {
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
            this.wires[i].recomputeAbsolutePath();
        }
        let deltaAngle = dx / this.p * 2 * Math.PI * x;
        this.wheels[0].rotation.z -= deltaAngle;
        this.wheels[1].rotation.z -= deltaAngle;
    }
}
/// <reference path="../machine/MachinePart.ts"/>
class FlatLoop extends MachinePart {
    constructor(machine, i, j, k, mirror) {
        super(machine, i, j, k);
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
        if (mirror) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class Join extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "join";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let dirJoin = (new BABYLON.Vector3(-2, -1, 0)).normalize();
        let nJoin = (new BABYLON.Vector3(-1, 2, 0)).normalize();
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), -tileHeight * this.h, 0), dir)
        ];
        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), dir.scale(-1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.25, -tileHeight * 0.25, 0), dirJoin)
        ];
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
/// <reference path="../machine/MachinePart.ts"/>
class Loop extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            w: 2,
            h: 3,
            d: 1,
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "loop";
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
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class Loop2 extends MachinePart {
    constructor(machine, i, j, k, w = 1, d = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k, {
            w: w,
            d: d,
            mirrorX: mirrorX,
            mirrorZ: mirrorZ,
        });
        this.xExtendable = true;
        this.zExtendable = true;
        this.xMirrorable = true;
        this.zMirrorable = true;
        this.partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir)
        ];
        let r = tileWidth * 0.5 * w * 0.7;
        for (let n = 0; n <= 8; n++) {
            let a = 2 * Math.PI * n / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            this.tracks[0].trackpoints.push(new TrackPoint(this.tracks[0], new BABYLON.Vector3(sina * r, r * 1.2 - cosa * r, -tileDepth * (this.d - 1) * (n + 1) / 10)));
        }
        this.tracks[0].trackpoints.push(new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), 0, -tileDepth * (this.d - 1)), dir));
        /*
        let points = this.tracks[0].trackpoints.map(tp => { return tp.position.clone() });
        let f = 3;
        for (let n = 0; n < 3; n++) {
            let smoothedPoints = [...points].map(p => { return p.clone() });
            for (let i = 1; i < smoothedPoints.length - 1; i++) {
                smoothedPoints[i].copyFrom(points[i - 1]).addInPlace(points[i].scale(f)).addInPlace(points[i + 1]).scaleInPlace(1 / (2 + f));
            }
            points = smoothedPoints;
        }

        for (let i = 0; i < points.length; i++) {
            this.tracks[0].trackpoints[i].position.copyFrom(points[i]);
        }
        */
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            this.mirrorZTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class Ramp extends MachinePart {
    constructor(machine, i, j, k, w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k, {
            w: w,
            h: h,
            d: d,
            mirrorX: mirrorX,
            mirrorZ: mirrorZ,
        });
        this.xExtendable = true;
        this.yExtendable = true;
        this.zExtendable = true;
        this.xMirrorable = true;
        this.zMirrorable = true;
        this.partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), -tileHeight * this.h, -tileDepth * (this.d - 1)), dir)
        ];
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            this.mirrorZTrackPointsInPlace();
        }
        this.generateWires();
    }
    static CreateFromOriginDestination(origin, dest, machine) {
        let i = Math.min(origin.i, dest.i);
        let j = Math.min(origin.j, dest.j);
        let k = Math.min(origin.k, dest.k);
        let w = dest.i - origin.i;
        let h = Math.abs(dest.j - origin.j);
        let d = Math.abs(dest.k - origin.k) + 1;
        let mirrorX = dest.j < origin.j;
        let mirrorZ = false;
        if (mirrorX) {
            if (origin.k < dest.k) {
                mirrorZ = true;
            }
        }
        else {
            if (origin.k > dest.k) {
                mirrorZ = true;
            }
        }
        return new Ramp(machine, i, j, k, w, h, d, mirrorX, mirrorZ);
    }
    getOrigin() {
        let i = this.i;
        let j;
        if (this.mirrorX) {
            j = this.j + this.h;
        }
        else {
            j = this.j;
        }
        let k;
        if (this.mirrorZ) {
            if (this.mirrorX) {
                k = this.k;
            }
            else {
                k = this.k + this.d - 1;
            }
        }
        else {
            if (this.mirrorX) {
                k = this.k + this.d - 1;
            }
            else {
                k = this.k;
            }
        }
        return {
            i: i,
            j: j,
            k: k
        };
    }
    getDestination() {
        let i = this.i + this.w;
        let j;
        if (!this.mirrorX) {
            j = this.j + this.h;
        }
        else {
            j = this.j;
        }
        let k;
        if (this.mirrorZ) {
            if (this.mirrorX) {
                k = this.k + this.d - 1;
            }
            else {
                k = this.k;
            }
        }
        else {
            if (this.mirrorX) {
                k = this.k;
            }
            else {
                k = this.k + this.d - 1;
            }
        }
        return {
            i: i,
            j: j,
            k: k
        };
    }
}
/// <reference path="../machine/MachinePart.ts"/>
class Snake extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            w: 2,
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "snake";
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
/// <reference path="../machine/MachinePart.ts"/>
class Spiral extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            h: 3,
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "spiral";
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
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class Split extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            h: 2,
            mirrorX: mirrorX
        });
        this._animatePivot = Mummu.AnimationFactory.EmptyNumberCallback;
        this.pivotL = 0.025;
        this.reset = () => {
            this._moving = false;
            this.pivot.rotation.z = Math.PI / 4;
        };
        this._moving = false;
        this.xMirrorable = true;
        this.partName = "split";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let rCurb = this.pivotL * 0.3;
        let pEnd = new BABYLON.Vector3(0, -tileHeight, 0);
        pEnd.x -= this.pivotL / Math.SQRT2;
        pEnd.y += this.pivotL / Math.SQRT2;
        let dirEnd = (new BABYLON.Vector3(1, -1, 0)).normalize();
        let nEnd = (new BABYLON.Vector3(1, 1, 0)).normalize();
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[0], pEnd.subtract(dirEnd.scale(0.001)), dirEnd)
        ];
        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight * this.h, 0), dir),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(-this.pivotL / Math.SQRT2, -tileHeight - this.pivotL / Math.SQRT2 - this.wireSize * 1.5, 0), dirEnd.multiplyByFloats(1, -1, 1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(this.pivotL / Math.SQRT2, -tileHeight - this.pivotL / Math.SQRT2 - this.wireSize * 1.5, 0), dirEnd),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight * this.h, 0), dir)
        ];
        this.tracks[2] = new Track(this);
        this.tracks[2].trackpoints = [
            new TrackPoint(this.tracks[2], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), dir.multiplyByFloats(-1, 1, 1)),
            new TrackPoint(this.tracks[2], pEnd.subtract(dirEnd.scale(0.001)).multiplyByFloats(-1, 1, 1), dirEnd.multiplyByFloats(-1, 1, 1))
        ];
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        let anchorDatas = [];
        let tmpVertexData = BABYLON.CreateCylinderVertexData({ height: 0.001, diameter: 0.01 });
        let q = BABYLON.Quaternion.Identity();
        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
        Mummu.RotateVertexDataInPlace(tmpVertexData, q);
        Mummu.TranslateVertexDataInPlace(tmpVertexData, new BABYLON.Vector3(0, 0, 0.015));
        anchorDatas.push(tmpVertexData);
        let axisZMin = -this.wireGauge * 0.6;
        let axisZMax = 0.015 - 0.001 * 0.5;
        tmpVertexData = BABYLON.CreateCylinderVertexData({ height: axisZMax - axisZMin, diameter: 0.001 });
        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
        Mummu.RotateVertexDataInPlace(tmpVertexData, q);
        Mummu.TranslateVertexDataInPlace(tmpVertexData, new BABYLON.Vector3(0, 0, (axisZMax + axisZMin) * 0.5));
        anchorDatas.push(tmpVertexData);
        let anchor = new BABYLON.Mesh("anchor");
        anchor.position.copyFromFloats(0, -tileHeight, 0);
        anchor.parent = this;
        anchor.material = this.game.steelMaterial;
        Mummu.MergeVertexDatas(...anchorDatas).applyToMesh(anchor);
        this.pivot = new BABYLON.Mesh("pivot");
        this.pivot.position.copyFromFloats(0, -tileHeight, 0);
        this.pivot.material = this.game.copperMaterial;
        this.pivot.parent = this;
        this.pivot.rotation.z = Math.PI / 4;
        let dz = this.wireGauge * 0.5;
        this.game.vertexDataLoader.get("./meshes/splitter-arrow.babylon").then(datas => {
            if (datas[0]) {
                let data = Mummu.CloneVertexData(datas[0]);
                Mummu.TranslateVertexDataInPlace(data, new BABYLON.Vector3(0, 0, axisZMin));
                data.applyToMesh(this.pivot);
            }
        });
        let wireHorizontal0 = new Wire(this);
        wireHorizontal0.parent = this.pivot;
        wireHorizontal0.path = [new BABYLON.Vector3(-this.pivotL, 0, -dz), new BABYLON.Vector3(this.pivotL, 0, -dz)];
        let wireHorizontal1 = new Wire(this);
        wireHorizontal1.parent = this.pivot;
        wireHorizontal1.path = [new BABYLON.Vector3(-this.pivotL, 0, dz), new BABYLON.Vector3(this.pivotL, 0, dz)];
        let wireVertical0 = new Wire(this);
        wireVertical0.parent = this.pivot;
        wireVertical0.path = [new BABYLON.Vector3(0, this.pivotL, -dz), new BABYLON.Vector3(0, rCurb * 0.3, -dz)];
        let wireVertical1 = new Wire(this);
        wireVertical1.parent = this.pivot;
        wireVertical1.path = [new BABYLON.Vector3(0, this.pivotL, dz), new BABYLON.Vector3(0, rCurb * 0.3, dz)];
        let curbLeft0 = new Wire(this);
        curbLeft0.wireSize = this.wireSize * 0.8;
        curbLeft0.parent = this.pivot;
        curbLeft0.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbLeft0.path.push(new BABYLON.Vector3(-rCurb + cosa * rCurb, rCurb - sina * rCurb, -dz));
        }
        let curbLeft1 = new Wire(this);
        curbLeft1.wireSize = this.wireSize * 0.8;
        curbLeft1.parent = this.pivot;
        curbLeft1.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbLeft1.path.push(new BABYLON.Vector3(-rCurb + cosa * rCurb, rCurb - sina * rCurb, dz));
        }
        let curbRight0 = new Wire(this);
        curbRight0.wireSize = this.wireSize * 0.8;
        curbRight0.parent = this.pivot;
        curbRight0.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbRight0.path.push(new BABYLON.Vector3(rCurb - cosa * rCurb, rCurb - sina * rCurb, -dz));
        }
        let curbRight1 = new Wire(this);
        curbRight1.wireSize = this.wireSize * 0.8;
        curbRight1.parent = this.pivot;
        curbRight1.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbRight1.path.push(new BABYLON.Vector3(rCurb - cosa * rCurb, rCurb - sina * rCurb, dz));
        }
        this.wires = [wireHorizontal0, wireHorizontal1, curbLeft0, curbLeft1, wireVertical0, wireVertical1, curbRight0, curbRight1];
        this.generateWires();
        this._animatePivot = Mummu.AnimationFactory.CreateNumber(this, this.pivot.rotation, "z", () => {
            if (!this.machine.playing) {
                this.pivot.rotation.z = Math.PI / 4;
            }
            this.wires.forEach(wire => {
                wire.recomputeAbsolutePath();
            });
        }, false, Nabu.Easing.easeInSquare);
        this.machine.onStopCallbacks.push(this.reset);
        this.reset();
    }
    dispose() {
        super.dispose();
        this.machine.onStopCallbacks.remove(this.reset);
    }
    update(dt) {
        if (!this._moving) {
            for (let i = 0; i < this.machine.balls.length; i++) {
                let ball = this.machine.balls[i];
                if (BABYLON.Vector3.Distance(ball.position, this.pivot.absolutePosition) < 0.05) {
                    let local = BABYLON.Vector3.TransformCoordinates(ball.position, this.pivot.getWorldMatrix().clone().invert());
                    if (local.y < ball.radius * 0.9) {
                        if (local.x > ball.radius * 0.5 && local.x < this.pivotL) {
                            this._moving = true;
                            this._animatePivot(-Math.PI / 4, 0.3 / this.game.timeFactor).then(() => {
                                this._moving = false;
                            });
                            return;
                        }
                        else if (local.x > -this.pivotL && local.x < -ball.radius * 0.5) {
                            this._moving = true;
                            this._animatePivot(Math.PI / 4, 0.3 / this.game.timeFactor).then(() => {
                                this._moving = false;
                            });
                            return;
                        }
                    }
                }
            }
        }
    }
}
class UTurnLarge extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            w: 2,
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "uturn-l";
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
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class UTurn extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "uturn-s";
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
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class UTurnLayer extends MachinePart {
    constructor(machine, i, j, k, h, d, mirrorX, mirrorZ) {
        super(machine, i, j, k, {
            h: h,
            d: d,
            mirrorX: mirrorX,
            mirrorZ: mirrorZ
        });
        this.yExtendable = true;
        this.zExtendable = true;
        this.minD = 2;
        this.xMirrorable = true;
        this.zMirrorable = true;
        this.partName = "uturnlayer-" + h.toFixed(0) + "." + d.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let r = tileDepth * (d - 1) * 0.5;
        let x0 = -tileWidth * 0.5 + 2 * Math.PI * r / 6;
        let r2 = r / Math.SQRT2;
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(x0 + 0, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(x0 + r2, 0, -r + r2)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(x0 + r, 0, -r)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(x0 + r2, 0, -r - r2)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(x0 + 0, 0, -2 * r)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, -2 * r), new BABYLON.Vector3(-1, 0, 0)),
        ];
        for (let n = 0; n < this.tracks[0].trackpoints.length; n++) {
            let f = n / (this.tracks[0].trackpoints.length - 1);
            this.tracks[0].trackpoints[n].position.y = -f * (this.h - 1) * tileHeight;
        }
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            this.mirrorZTrackPointsInPlace();
        }
        this.generateWires();
    }
}
/// <reference path="../machine/MachinePart.ts"/>
class Wave extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            w: 2,
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "wave";
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
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
var FloatingElementAnchor;
(function (FloatingElementAnchor) {
    FloatingElementAnchor[FloatingElementAnchor["CenterMiddle"] = 0] = "CenterMiddle";
    FloatingElementAnchor[FloatingElementAnchor["BottomCenter"] = 1] = "BottomCenter";
    FloatingElementAnchor[FloatingElementAnchor["LeftMiddle"] = 2] = "LeftMiddle";
    FloatingElementAnchor[FloatingElementAnchor["TopCenter"] = 3] = "TopCenter";
    FloatingElementAnchor[FloatingElementAnchor["RightMiddle"] = 4] = "RightMiddle";
    FloatingElementAnchor[FloatingElementAnchor["LeftBottom"] = 5] = "LeftBottom";
    FloatingElementAnchor[FloatingElementAnchor["LeftTop"] = 6] = "LeftTop";
    FloatingElementAnchor[FloatingElementAnchor["RightTop"] = 7] = "RightTop";
})(FloatingElementAnchor || (FloatingElementAnchor = {}));
class FloatingElement extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
        this.anchor = FloatingElementAnchor.BottomCenter;
        this.anchorMargin = 10;
        this._update = () => {
            if (!this._targetMesh && !this._targetPosition) {
                return;
            }
            if (this.style.display === "none") {
                return;
            }
            let p = this._targetPosition;
            if (!p) {
                p = this._targetMesh.absolutePosition;
            }
            let screenPos = BABYLON.Vector3.Project(p, BABYLON.Matrix.Identity(), this.game.scene.getTransformMatrix(), this.game.camera.viewport.toGlobal(1, 1));
            let dLeft = 0;
            let dBottom = 0;
            if (this.anchor === FloatingElementAnchor.CenterMiddle) {
                dLeft = -0.5 * this.clientWidth;
                dBottom = -0.5 * this.clientHeight;
            }
            if (this.anchor === FloatingElementAnchor.TopCenter) {
                dLeft = -0.5 * this.clientWidth;
                dBottom = -this.clientHeight - this.anchorMargin;
            }
            if (this.anchor === FloatingElementAnchor.LeftMiddle) {
                dLeft = this.anchorMargin;
                dBottom = -0.5 * this.clientHeight;
            }
            if (this.anchor === FloatingElementAnchor.BottomCenter) {
                dLeft = -0.5 * this.clientWidth;
                dBottom = this.anchorMargin;
            }
            if (this.anchor === FloatingElementAnchor.RightMiddle) {
                dLeft = -this.clientWidth - this.anchorMargin;
                dBottom = -0.5 * this.clientHeight;
            }
            if (this.anchor === FloatingElementAnchor.LeftBottom) {
                dLeft = this.anchorMargin;
                dBottom = this.anchorMargin;
            }
            if (this.anchor === FloatingElementAnchor.LeftTop) {
                dLeft = this.anchorMargin;
                dBottom = -this.clientHeight - this.anchorMargin;
            }
            if (this.anchor === FloatingElementAnchor.RightTop) {
                dLeft = -this.clientWidth - this.anchorMargin;
                dBottom = -this.clientHeight - this.anchorMargin;
            }
            this.style.left = (screenPos.x * this.game.canvas.width + dLeft).toFixed(0) + "px";
            this.style.bottom = ((1 - screenPos.y) * this.game.canvas.height + dBottom).toFixed(0) + "px";
        };
    }
    static Create(game) {
        let panel = document.createElement("floating-element");
        panel.game = game;
        document.body.appendChild(panel);
        return panel;
    }
    connectedCallback() {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
    }
    dispose() {
        if (this._targetMesh) {
            this._targetMesh.getScene().onBeforeRenderObservable.removeCallback(this._update);
        }
        document.body.removeChild(this);
    }
    show() {
        this.style.display = "block";
    }
    hide() {
        this.style.display = "none";
    }
    setTarget(target) {
        this.style.position = "fixed";
        if (target instanceof BABYLON.Mesh) {
            this._targetMesh = target;
            this._targetPosition = undefined;
        }
        else if (target instanceof BABYLON.Vector3) {
            this._targetPosition = target;
            this._targetMesh = undefined;
        }
        this.game.scene.onAfterRenderObservable.add(this._update);
    }
}
window.customElements.define("floating-element", FloatingElement);
class Logo {
    constructor() {
        this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.container.id = "logo";
        this.container.setAttribute("viewBox", "0 0 1000 1000");
        document.body.appendChild(this.container);
    }
    initialize() {
        this.container.innerHTML = `
            <linearGradient id="steel-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#313a42" />
                <stop offset="50%" stop-color="#abc3d6"/>
                <stop offset="100%" stop-color="#313a42" />
            </linearGradient>
            <linearGradient id="copper-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#633204" />
                <stop offset="50%" stop-color="#dec3ab"/>
                <stop offset="100%" stop-color="#633204" />
            </linearGradient>
        `;
        let titleBack = document.createElementNS("http://www.w3.org/2000/svg", "text");
        titleBack.id = "logo-title-back";
        titleBack.classList.add("logo-title");
        titleBack.setAttribute("text-anchor", "middle");
        titleBack.setAttribute("x", "500");
        titleBack.setAttribute("y", "500");
        titleBack.setAttribute("transform-origin", "500 500");
        titleBack.setAttribute("transform", "scale(1 1.2)");
        titleBack.innerHTML = "MARBLE RUN";
        this.container.appendChild(titleBack);
        let title = document.createElementNS("http://www.w3.org/2000/svg", "text");
        title.id = "logo-title";
        title.classList.add("logo-title");
        title.setAttribute("text-anchor", "middle");
        title.setAttribute("x", "500");
        title.setAttribute("y", "500");
        title.setAttribute("transform-origin", "500 500");
        title.setAttribute("transform", "scale(1 1.2)");
        title.innerHTML = "MARBLE RUN";
        this.container.appendChild(title);
        let subtitleBack = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subtitleBack.id = "logo-subtitle-back";
        subtitleBack.classList.add("logo-subtitle");
        subtitleBack.setAttribute("text-anchor", "middle");
        subtitleBack.setAttribute("x", "600");
        subtitleBack.setAttribute("y", "570");
        subtitleBack.innerHTML = "SIMULATOR";
        this.container.appendChild(subtitleBack);
        let subtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subtitle.id = "logo-subtitle";
        subtitle.classList.add("logo-subtitle");
        subtitle.setAttribute("text-anchor", "middle");
        subtitle.setAttribute("x", "600");
        subtitle.setAttribute("y", "570");
        subtitle.innerHTML = "SIMULATOR";
        this.container.appendChild(subtitle);
    }
}
class MachinePartEditorMenu {
    constructor(machineEditor) {
        this.machineEditor = machineEditor;
        this._shown = true;
    }
    get currentPart() {
        return this._currentPart;
    }
    set currentPart(part) {
        this._currentPart = part;
        this.update();
    }
    initialize() {
        this.container = document.getElementById("machine-editor-part-menu");
        this.titleElement = document.querySelector("#machine-editor-part-menu-title span");
        this.showButton = document.querySelector("#machine-editor-part-menu-show");
        this.showButton.onclick = () => {
            this._shown = true;
            this.update();
        };
        this.hideButton = document.querySelector("#machine-editor-part-menu-hide");
        this.hideButton.onclick = () => {
            this._shown = false;
            this.update();
        };
        this.widthLine = document.getElementById("machine-editor-part-menu-width");
        this.wPlusButton = document.querySelector("#machine-editor-part-menu-width button.plus");
        this.wPlusButton.onclick = async () => {
            if (this.currentPart.xExtendable) {
                let w = this.currentPart.w + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, w, this.currentPart.yExtendable ? this.currentPart.h : undefined, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.wMinusButton = document.querySelector("#machine-editor-part-menu-width button.minus");
        this.wMinusButton.onclick = async () => {
            if (this.currentPart.xExtendable) {
                let w = this.currentPart.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, w, this.currentPart.yExtendable ? this.currentPart.h : undefined, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.wValue = document.querySelector("#machine-editor-part-menu-width .value");
        this.heightLine = document.getElementById("machine-editor-part-menu-height");
        this.hPlusButton = document.querySelector("#machine-editor-part-menu-height button.plus");
        this.hPlusButton.onclick = async () => {
            if (this.currentPart.yExtendable) {
                let h = this.currentPart.h + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, h, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.hMinusButton = document.querySelector("#machine-editor-part-menu-height button.minus");
        this.hMinusButton.onclick = async () => {
            if (this.currentPart.yExtendable) {
                let h = this.currentPart.h - 1;
                if (h >= 0) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, h, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.hValue = document.querySelector("#machine-editor-part-menu-height .value");
        this.depthLine = document.getElementById("machine-editor-part-menu-depth");
        this.dPlusButton = document.querySelector("#machine-editor-part-menu-depth button.plus");
        this.dPlusButton.onclick = async () => {
            if (this.currentPart.zExtendable) {
                let d = this.currentPart.d + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, this.currentPart.yExtendable ? this.currentPart.h : undefined, d);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.dMinusButton = document.querySelector("#machine-editor-part-menu-depth button.minus");
        this.dMinusButton.onclick = async () => {
            if (this.currentPart.zExtendable) {
                let d = this.currentPart.d - 1;
                if (d >= this.currentPart.minD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, this.currentPart.yExtendable ? this.currentPart.h : undefined, d);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.dValue = document.querySelector("#machine-editor-part-menu-depth .value");
        this.mirrorXLine = document.getElementById("machine-editor-part-menu-mirrorX");
        this.mirrorXButton = document.querySelector("#machine-editor-part-menu-mirrorX button");
        this.mirrorXButton.onclick = async () => {
            let editedTrack = await this.machineEditor.mirrorXTrackInPlace(this.currentPart);
            this.machineEditor.setSelectedObject(editedTrack);
        };
        this.mirrorZLine = document.getElementById("machine-editor-part-menu-mirrorZ");
        this.mirrorZButton = document.querySelector("#machine-editor-part-menu-mirrorZ button");
        this.mirrorZButton.onclick = async () => {
            let editedTrack = await this.machineEditor.mirrorZTrackInPlace(this.currentPart);
            this.machineEditor.setSelectedObject(editedTrack);
        };
        this.deleteButton = document.querySelector("#machine-editor-part-menu-delete button");
        this.deleteButton.onclick = async () => {
            this.currentPart.dispose();
            this.machineEditor.setSelectedObject(undefined);
            this.machineEditor.setDraggedObject(undefined);
        };
    }
    dispose() {
        this.currentPart = undefined;
    }
    update() {
        if (!this.currentPart) {
            this.container.style.display = "none";
        }
        else {
            this.container.style.display = "";
            this.showButton.style.display = this._shown ? "none" : "";
            this.hideButton.style.display = this._shown ? "" : "none";
            this.widthLine.style.display = this._shown && this.currentPart.xExtendable ? "" : "none";
            this.heightLine.style.display = this._shown && this.currentPart.yExtendable ? "" : "none";
            this.depthLine.style.display = this._shown && this.currentPart.zExtendable ? "" : "none";
            this.mirrorXLine.style.display = this._shown && this.currentPart.xMirrorable ? "" : "none";
            this.mirrorZLine.style.display = this._shown && this.currentPart.zMirrorable ? "" : "none";
            this.titleElement.innerText = this.currentPart.partName;
            this.wValue.innerText = this.currentPart.w.toFixed(0);
            this.hValue.innerText = this.currentPart.h.toFixed(0);
            this.dValue.innerText = this.currentPart.d.toFixed(0);
        }
    }
}
class Toolbar {
    constructor(game) {
        this.game = game;
        this.timeFactorInputShown = false;
        this.loadInputShown = false;
        this.soundInputShown = false;
        this.zoomInputShown = false;
        this._udpate = () => {
            if (this.game.machine) {
                if (this.game.machine.playing != this._lastPlaying) {
                    if (this.game.machine.playing) {
                        this.playButton.style.display = "none";
                        this.pauseButton.style.display = "";
                    }
                    else {
                        this.playButton.style.display = "";
                        this.pauseButton.style.display = "none";
                    }
                    this._lastPlaying = this.game.machine.playing;
                    this.resize();
                }
                this.timeFactorValue.innerText = this.game.timeFactor.toFixed(2);
            }
            if (this.zoomInputShown) {
                this.zoomInput.value = this.game.getCameraZoomFactor().toFixed(3);
            }
        };
        this.onPlay = () => {
            this.game.machine.playing = true;
        };
        this.onPause = () => {
            this.game.machine.playing = false;
        };
        this.onStop = () => {
            this.game.machine.stop();
        };
        this.onTimeFactorButton = () => {
            this.timeFactorInputShown = !this.timeFactorInputShown;
            this.resize();
        };
        this.onTimeFactorInput = (e) => {
            this.game.targetTimeFactor = parseFloat(e.target.value);
        };
        this.onSave = () => {
            let data = this.game.machine.serialize();
            window.localStorage.setItem("last-saved-machine", JSON.stringify(data));
            Nabu.download("my-marble-machine.json", JSON.stringify(data));
        };
        this.onLoad = () => {
            this.loadInputShown = !this.loadInputShown;
            this.resize();
        };
        this.onLoadInput = (event) => {
            let files = event.target.files;
            let file = files[0];
            if (file) {
                const reader = new FileReader();
                reader.addEventListener('load', (event) => {
                    this.game.machine.dispose();
                    this.game.machine.deserialize(JSON.parse(event.target.result));
                    this.game.machine.instantiate();
                    this.game.machine.generateBaseMesh();
                    for (let i = 0; i < this.game.machine.balls.length; i++) {
                        this.game.machine.balls[i].setShowPositionZeroGhost(true);
                    }
                    this.loadInputShown = false;
                    this.resize();
                });
                reader.readAsText(file);
            }
        };
        this.onSoundButton = () => {
            this.soundInputShown = !this.soundInputShown;
            this.resize();
        };
        this.onSoundInput = (e) => {
            this.game.mainVolume = parseFloat(e.target.value);
        };
        this.onZoomButton = () => {
            this.zoomInputShown = !this.zoomInputShown;
            this.resize();
        };
        this.onZoomInput = (e) => {
            this.game.setCameraZoomFactor(parseFloat(e.target.value));
        };
        this.onLayer = (e) => {
            let rect = this.layerButton.getBoundingClientRect();
            let centerY = rect.top + rect.height * 0.5;
            if (e.y > centerY) {
                this.game.machineEditor.currentLayer++;
            }
            else {
                this.game.machineEditor.currentLayer--;
            }
        };
        this.onBack = () => {
            this.game.setContext(GameMode.MainMenu);
        };
        this.closeAllDropdowns = () => {
            if (this.timeFactorInputShown || this.loadInputShown || this.soundInputShown || this.zoomInputShown) {
                this.timeFactorInputShown = false;
                this.loadInputShown = false;
                this.soundInputShown = false;
                this.zoomInputShown = false;
                this.resize();
            }
        };
    }
    initialize() {
        this.container = document.querySelector("#toolbar");
        this.container.style.display = "block";
        this.playButton = document.querySelector("#toolbar-play");
        this.playButton.addEventListener("click", this.onPlay);
        this.pauseButton = document.querySelector("#toolbar-pause");
        this.pauseButton.addEventListener("click", this.onPause);
        this.stopButton = document.querySelector("#toolbar-stop");
        this.stopButton.addEventListener("click", this.onStop);
        this.timeFactorButton = document.querySelector("#toolbar-time-factor");
        this.timeFactorButton.addEventListener("click", this.onTimeFactorButton);
        this.timeFactorValue = document.querySelector("#toolbar-time-factor .value");
        this.timeFactorInput = document.querySelector("#time-factor-value");
        this.timeFactorInput.value = this.game.targetTimeFactor.toFixed(2);
        this.timeFactorInput.addEventListener("input", this.onTimeFactorInput);
        this.timeFactorInputContainer = this.timeFactorInput.parentElement;
        this.saveButton = document.querySelector("#toolbar-save");
        this.saveButton.addEventListener("click", this.onSave);
        this.loadButton = document.querySelector("#toolbar-load");
        this.loadButton.addEventListener("click", this.onLoad);
        this.loadInput = document.querySelector("#load-input");
        this.loadInput.addEventListener("input", this.onLoadInput);
        this.loadInputContainer = this.loadInput.parentElement;
        this.soundButton = document.querySelector("#toolbar-sound");
        this.soundButton.addEventListener("click", this.onSoundButton);
        this.soundInput = document.querySelector("#sound-value");
        this.soundInput.value = this.game.mainVolume.toFixed(2);
        this.soundInput.addEventListener("input", this.onSoundInput);
        this.soundInputContainer = this.soundInput.parentElement;
        this.zoomButton = document.querySelector("#toolbar-zoom");
        this.zoomButton.addEventListener("click", this.onZoomButton);
        this.zoomInput = document.querySelector("#zoom-value");
        this.zoomInput.value = this.game.getCameraZoomFactor().toFixed(3);
        this.zoomInput.addEventListener("input", this.onZoomInput);
        this.zoomInputContainer = this.zoomInput.parentElement;
        this.layerButton = document.querySelector("#toolbar-layer");
        this.layerButton.addEventListener("click", this.onLayer);
        this.backButton = document.querySelector("#toolbar-back");
        this.backButton.addEventListener("click", this.onBack);
        this.resize();
        this.game.canvas.addEventListener("pointerdown", this.closeAllDropdowns);
        this.game.scene.onBeforeRenderObservable.add(this._udpate);
    }
    dispose() {
        this.game.canvas.removeEventListener("pointerdown", this.closeAllDropdowns);
        this.game.scene.onBeforeRenderObservable.removeCallback(this._udpate);
    }
    updateButtonsVisibility() {
        if (this.game.mode === GameMode.MainMenu) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "none";
        }
        else if (this.game.mode === GameMode.Credit) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.CreateMode) {
            this.saveButton.style.display = "";
            this.loadButton.style.display = "";
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.DemoMode) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
    }
    resize() {
        this.updateButtonsVisibility();
        let ratio = this.game.engine.getRenderWidth() / this.game.engine.getRenderHeight();
        this.container.style.bottom = "10px";
        if (ratio < 1) {
            let objectsElement = document.getElementById("machine-editor-objects");
            if (objectsElement.style.display != "none") {
                let h = objectsElement.getBoundingClientRect().height;
                this.container.style.bottom = (h + 10).toFixed(0) + "px";
            }
        }
        let containerWidth = this.container.clientWidth;
        this.container.style.left = ((this.game.engine.getRenderWidth() - containerWidth) * 0.5) + "px";
        this.timeFactorInputContainer.style.display = this.timeFactorInputShown ? "" : "none";
        let rectButton = this.timeFactorButton.getBoundingClientRect();
        let rectContainer = this.timeFactorInputContainer.getBoundingClientRect();
        this.timeFactorInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.timeFactorInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
        this.loadInputContainer.style.display = this.loadInputShown ? "" : "none";
        rectButton = this.loadButton.getBoundingClientRect();
        rectContainer = this.loadInputContainer.getBoundingClientRect();
        this.loadInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.loadInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
        this.soundInputContainer.style.display = this.soundInputShown ? "" : "none";
        rectButton = this.soundButton.getBoundingClientRect();
        rectContainer = this.soundInputContainer.getBoundingClientRect();
        this.soundInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.soundInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
        this.zoomInputContainer.style.display = this.zoomInputShown ? "" : "none";
        rectButton = this.zoomButton.getBoundingClientRect();
        rectContainer = this.zoomInputContainer.getBoundingClientRect();
        this.zoomInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.zoomInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
    }
}
