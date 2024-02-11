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
    get k() {
        return -Math.round(this.positionZero.z / tileDepth);
    }
    set k(v) {
        this.positionZero.z = -Math.round(v) * tileDepth;
        this.positionZeroGhost.position.copyFrom(this.positionZero);
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
        this._timer += dt * this.game.currentTimeFactor;
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
                if (Mummu.SphereAABBCheck(this.position, this.radius, part.AABBMin.x - this.radius, part.AABBMax.x + this.radius, part.AABBMin.y - this.radius, part.AABBMax.y + this.radius, part.AABBMin.z - this.radius, part.AABBMax.z + this.radius)) {
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
                        this.velocity.scaleInPlace(-0.14).addInPlace(otherSpeed.scale(0.84));
                        ball.velocity.scaleInPlace(-0.14).addInPlace(mySpeed.scale(0.84));
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
            //this.velocity.addInPlace(forcedDisplacement.scale(0.1 * 1 / dt));
            this.position.addInPlace(forcedDisplacement);
            let friction = this.velocity.scale(-1).scaleInPlace(0.002);
            let acceleration = weight.add(reactions).add(friction).scaleInPlace(1 / m);
            this.velocity.addInPlace(acceleration.scale(dt));
            this.position.addInPlace(this.velocity.scale(dt));
        }
        this.marbleLoopSound.volume = this.strReaction * this.velocity.length() * this.game.timeFactor * this.game.mainVolume;
    }
}
class Configuration {
    constructor(game) {
        this.game = game;
        this._handleSize = 1;
        this._graphicQ = 3;
        this._uiSize = 1.3;
    }
    get handleSize() {
        return this._handleSize;
    }
    setHandleSize(v, skipStorage) {
        if (isFinite(v)) {
            if (v > 0 && v <= 3) {
                this._handleSize = v;
                if (this.game.machineEditor) {
                    this.game.machineEditor.handles.forEach(handle => {
                        handle.size = this._handleSize;
                    });
                }
                if (!skipStorage) {
                    this.saveToLocalStorage();
                }
            }
        }
    }
    get graphicQ() {
        return this._graphicQ;
    }
    setGraphicQ(v, skipStorage) {
        if (v >= 1 && v <= 3) {
            this._graphicQ = v;
            if (this.game.machine) {
                let data = this.game.machine.serialize();
                this.game.machine.dispose();
                this.game.machine.deserialize(data);
                this.game.machine.instantiate();
            }
            if (!skipStorage) {
                this.saveToLocalStorage();
            }
        }
    }
    get uiSize() {
        return this._uiSize;
    }
    setUISize(v, skipStorage) {
        if (v >= 0.9 && v <= 2) {
            this._uiSize = v;
            var r = document.querySelector(':root');
            r.style.setProperty("--ui-size", (this._uiSize * 100).toFixed(0) + "%");
            if (!skipStorage) {
                this.saveToLocalStorage();
            }
        }
    }
    initialize() {
        let data = JSON.parse(localStorage.getItem("mrs-configuration"));
        this.deserialize(data);
    }
    saveToLocalStorage() {
        let data = this.serialize();
        localStorage.setItem("mrs-configuration", JSON.stringify(data));
    }
    serialize() {
        return {
            handleSize: this.handleSize,
            graphicQ: this.graphicQ,
            uiSize: this.uiSize
        };
    }
    deserialize(data) {
        if (!data) {
            data = {};
            if (!isFinite(data.handleSize)) {
                data.handleSize = this.handleSize;
            }
            if (!isFinite(data.graphicQ)) {
                data.graphicQ = this.graphicQ;
            }
            if (!isFinite(data.uiSize)) {
                data.uiSize = this.uiSize;
            }
        }
        if (data) {
            if (isFinite(data.handleSize)) {
                this.setHandleSize(data.handleSize, true);
            }
            if (isFinite(data.graphicQ)) {
                this.setGraphicQ(data.graphicQ, true);
            }
            if (isFinite(data.uiSize)) {
                this.setUISize(data.uiSize, true);
            }
        }
    }
}
var simpleLoop = {
    balls: [{ x: 0.003999999664723874, y: -0.061500001311302184, z: 0 }],
    parts: [
        { name: "uturnlayer-0.4", i: -3, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.4", i: -1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "elevator-3", i: 0, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.3", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturnlayer-0.3", i: -3, j: 2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 1, k: 0, mirrorX: true, mirrorZ: false },
    ],
};
var demo1 = {
    balls: [
        { x: 0.4539999737739563, y: -0.15150000488758086, z: 0 },
        { x: 0.4539999737739563, y: 0.002181407451629638, z: 0 },
        { x: 0.4539999737739563, y: 0.15586281979084016, z: 0 },
    ],
    parts: [
        { name: "ramp-3.1.1", i: -1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-s", i: -2, j: 5, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-s", i: -2, j: -5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-12", i: 3, j: -7, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 2, j: -6, k: 0, mirrorX: false, mirrorZ: false },
        { name: "wave", i: -1, j: -4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-l", i: 1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2", i: -1, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturnlayer-0.3", i: -2, j: -1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.2.2", i: -1, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.3", i: 2, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -1, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.4.1", i: 0, j: 1, k: 0, mirrorX: true, mirrorZ: false },
    ],
};
var demoLoops = {
    balls: [
        { x: 0.3039999976158142, y: -0.24149999356269836, z: 0 },
        { x: 0.3039999976158142, y: -0.07789317107200623, z: 0 },
        { x: 0.3039999976158142, y: 0.0857136663198471, z: 0 },
        { x: 0.3039999976158142, y: 0.24932048881053925, z: 0 },
    ],
    parts: [
        { name: "loop", i: -1, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop", i: -1, j: -6, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -1, j: -4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-17", i: 2, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 1, j: -8, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.3", i: -2, j: -6, k: 0, mirrorX: true, mirrorZ: true },
        { name: "uturnlayer-1.3", i: 1, j: -4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.3", i: -2, j: -2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "loop", i: -1, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.3", i: 1, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -1, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.3", i: -2, j: 2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "loop", i: -1, j: 2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.3", i: 1, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -1, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-0.3", i: -2, j: 7, k: 0, mirrorX: true, mirrorZ: true },
        { name: "ramp-3.1.3", i: -1, j: 7, k: 0, mirrorX: false, mirrorZ: true },
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
        { x: -0.45039562940864025, y: -0.14880134622293845, z: 0 },
        { x: -0.4507414790693519, y: 0.00570802711480296, z: 0 },
        { x: -0.4512511582822969, y: 0.15488847198893452, z: 1.1102230246251565e-16 },
    ],
    parts: [
        { name: "split", i: 0, j: -5, k: 0, mirrorX: false, mirrorZ: false },
        { name: "split", i: 0, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: -2, j: -6, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop", i: 1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "join", i: -1, j: 2, k: 1, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -2, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-0.3", i: -2, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-0.3", i: 1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturnlayer-1.2", i: -2, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "join", i: 0, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-0.3", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-0.2", i: 1, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "elevator-12", i: -3, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: -1, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.2", i: 4, j: -1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-2.3.1", i: 0, j: -1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: 2, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 3, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.2", i: -3, j: 2, k: 2, mirrorX: true, mirrorZ: true },
        { name: "ramp-3.1.1", i: -2, j: 2, k: 3, mirrorX: false, mirrorZ: false },
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
        { x: 0.4537058415985139, y: 0.25988103124019435 },
        { x: 0.4523347497209613, y: 0.18159650041604788 },
        { x: 0.4518257916075914, y: 0.10443575951224476 },
    ],
    parts: [
        { name: "elevator-12", i: 3, j: -13, k: 0, mirrorX: false, mirrorZ: false },
        { name: "split", i: 1, j: -11, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.2", i: 2, j: -12, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: 3, j: -8, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.5.1", i: 2, j: -9, k: 1, mirrorX: false, mirrorZ: false },
        { name: "spiral", i: 0, j: -9, k: 1, mirrorX: true, mirrorZ: false },
        { name: "join", i: 1, j: -3, k: 3, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.4", i: -1, j: -2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "ramp-2.0.1", i: 1, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: -4, k: 3, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -6, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.3", i: -2, j: -5, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-0.2", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: 2, j: -4, k: 3, mirrorX: true, mirrorZ: false },
    ],
};
var demoXXL = {
    balls: [
        { x: -0.14940814725193807, y: 0.37256903324063273, z: -0.24 },
        { x: 0.12699683890522956, y: 0.3778240595217145, z: -0.24 },
        { x: 0.15394038324885653, y: 0.28825437966177486, z: -0.24000000715255748 },
        { x: 0.15372840040364857, y: 0.20960589947653657, z: -0.2400000071525572 },
        { x: 0.15418796141657928, y: 0.13141977555023623, z: -0.24000000715255748 },
    ],
    parts: [
        { name: "split", i: -1, j: -12, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 0, j: -12, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.2", i: 0, j: -10, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-0.3", i: 2, j: -10, k: 3, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2", i: 0, j: -9, k: 3, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.4", i: -3, j: -10, k: 4, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.5.1", i: 1, j: -10, k: 3, mirrorX: true, mirrorZ: false },
        { name: "join", i: 1, j: 0, k: 6, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-0.3", i: 0, j: 1, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.5", i: 2, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "elevator-14", i: 1, j: -13, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.3.1", i: 0, j: -6, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.2", i: -4, j: -7, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.5", i: -1, j: -1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-0.5", i: 0, j: -7, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.6", i: 2, j: -8, k: 2, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -1, j: -9, k: 7, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.6", i: 2, j: -7, k: 1, mirrorX: false, mirrorZ: true },
        { name: "uturnlayer-1.6", i: -4, j: -6, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.0.1", i: -2, j: -6, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: -2, j: -5, k: 6, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.5", i: 2, j: -4, k: 2, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -3, j: -7, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -5, k: 4, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.2", i: -3, j: -6, k: 3, mirrorX: false, mirrorZ: false },
        { name: "split", i: 1, j: -3, k: 2, mirrorX: true, mirrorZ: false },
    ],
};
var largeTornado = {
    balls: [
        { x: 0.15400000655651092, y: -0.2408360127210617, z: 0 },
        { x: 0.15400000655651092, y: -0.16197078263759612, z: 0 },
        { x: 0.15400000655651092, y: -0.08310558235645295, z: 0 },
        { x: 0.15400000655651092, y: -0.00424036717414856, z: 0 },
        { x: 0.15400000655651092, y: 0.07462484800815582, z: 0 },
        { x: 0.15400000655651092, y: 0.1534900631904602, z: 0 },
    ],
    parts: [
        { name: "uturnlayer-1.5", i: -1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.5", i: 1, j: -5, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.8", i: -2, j: -4, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturnlayer-1.7", i: 1, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.7", i: -2, j: -2, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturnlayer-1.6", i: 1, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.6", i: -1, j: 0, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturnlayer-1.5", i: 1, j: 1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.5", i: -1, j: 2, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturnlayer-1.4", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.4", i: -1, j: 4, k: 1, mirrorX: true, mirrorZ: true },
        { name: "elevator-15", i: 1, j: -7, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.5", i: 1, j: 5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.4.1", i: -1, j: 6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-0.5", i: -4, j: 10, k: 0, mirrorX: true, mirrorZ: true },
        { name: "loop-1.2", i: -2, j: 6, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.2.1", i: -2, j: 8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: 0, j: 8, k: 0, mirrorX: false, mirrorZ: false },
    ],
};
var twoLoops = {
    balls: [
        { x: 0.6040000095367432, y: -0.15091200506687164, z: 0 },
        { x: 0.6040000095367432, y: -0.07407130634784699, z: 0 },
        { x: 0.6040000095367432, y: 0.0027694072723388665, z: 0 },
        { x: 0.6040000095367432, y: 0.07961012089252471, z: 0 },
        { x: 0.6040000095367432, y: 0.15645081961154939, z: 0 },
    ],
    parts: [
        { name: "loop-2.2", i: -1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -3, j: 5, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-0.4", i: -5, j: 5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.3.4", i: -3, j: 5, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.3.1", i: 0, j: 5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.12.1", i: 1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: 3, j: 5, k: 0, mirrorX: false, mirrorZ: false },
        { name: "elevator-12", i: 4, j: -7, k: 0, mirrorX: false, mirrorZ: false },
    ],
};
var logoCircuit = {
    balls: [
        { x: -0.3430786425995497, y: 0.006175036826921158, z: -0.12 },
        { x: -0.4920541867386349, y: -0.05544158273924758, z: -0.18 },
    ],
    parts: [
        { name: "uturnlayer-0.4", i: -3, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.4", i: -1, j: 0, k: 2, mirrorX: false, mirrorZ: true },
        { name: "uturnlayer-0.3", i: -3, j: 2, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: -1, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-s", i: 0, j: 0, k: 3, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.2", i: -2, j: 1, k: 3, mirrorX: true, mirrorZ: false },
    ],
};
var test = { "balls": [{ "x": -0.5766096541939383, "y": 0.4087908683675662, "z": 0 }], "parts": [{ "name": "join", "i": -1, "j": -1, "k": 1, "mirrorX": false, "mirrorZ": false }, { "name": "split", "i": -1, "j": -3, "k": 0, "mirrorX": false, "mirrorZ": false }, { "name": "uturnlayer-0.2", "i": -2, "j": -1, "k": 0, "mirrorX": true, "mirrorZ": false }, { "name": "uturnlayer-0.2", "i": 0, "j": -1, "k": 0, "mirrorX": false, "mirrorZ": false }, { "name": "uturnlayer-0.2", "i": 0, "j": 0, "k": 1, "mirrorX": false, "mirrorZ": false }, { "name": "uturnlayer-0.2", "i": -1, "j": 0, "k": 2, "mirrorX": true, "mirrorZ": false }, { "name": "uturnlayer-2.4", "i": 0, "j": 0, "k": 0, "mirrorX": false, "mirrorZ": true }, { "name": "elevator-16", "i": -4, "j": -14, "k": 0, "mirrorX": true, "mirrorZ": false }, { "name": "ramp-3.0.1", "i": -3, "j": 2, "k": 0, "mirrorX": false, "mirrorZ": false }, { "name": "ramp-2.10.1", "i": -3, "j": -13, "k": 0, "mirrorX": false, "mirrorZ": false }] };
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
        this.showManipulators = false;
        this.showDisplacers = true;
        this.handles = [];
        this.smallHandleSize = 0.02;
        this._currentLayer = 0;
        this._selectedItem = "";
        this._dragOffset = BABYLON.Vector3.Zero();
        this._majDown = false;
        this._ctrlDown = false;
        this._selectedObjects = [];
        this._pointerDownX = 0;
        this._pointerDownY = 0;
        this.pointerDown = (event) => {
            this._pointerDownX = this.game.scene.pointerX;
            this._pointerDownY = this.game.scene.pointerY;
            // First, check for handle pick
            if (!this.draggedObject) {
                let pickHandle = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh instanceof Arrow && mesh.isVisible) {
                        return true;
                    }
                    return false;
                });
                if (pickHandle.hit && pickHandle.pickedMesh instanceof Arrow) {
                    return;
                }
            }
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
                    /*
                    // Not working and break drag.
                    if (mesh instanceof MachinePartSelectorMesh) {
                        if (mesh.part != this.draggedObject) {
                            return true;
                        }
                    }
                    */
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
            // First, check for handle pick
            if (!this.draggedObject) {
                let pickHandle = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh instanceof Arrow && mesh.isVisible) {
                        return true;
                    }
                    return false;
                });
                if (pickHandle.hit && pickHandle.pickedMesh instanceof Arrow) {
                    pickHandle.pickedMesh.onClick();
                    return;
                }
            }
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
                            if (this._majDown) {
                                this.addSelectedObjects(pick.pickedMesh.part);
                            }
                            else {
                                this.setSelectedObject(pick.pickedMesh.part);
                            }
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
        this._onKeyDown = (event) => {
            if (event.code === "ShiftLeft") {
                this._majDown = true;
            }
            else if (event.code === "ControlLeft") {
                this._ctrlDown = true;
            }
            else if (this._ctrlDown && event.key === "a") {
                this.addSelectedObjects(...this.machine.parts);
            }
            else if (event.key === "x" || event.key === "Delete") {
                this._onDelete();
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
            else if (event.code === "KeyW") {
                this._onJMinus();
            }
            else if (event.code === "KeyA") {
                this._onIMinus();
            }
            else if (event.code === "KeyS") {
                this._onJPlus();
            }
            else if (event.code === "KeyD") {
                this._onIPlus();
            }
            else if (event.code === "KeyQ") {
                this._onKMinus();
            }
            else if (event.code === "KeyE") {
                this._onKPlus();
            }
            else if (event.code === "Space") {
                this._onFocus();
            }
        };
        this._onKeyUp = (event) => {
            if (event.code === "ShiftLeft") {
                this._majDown = false;
            }
            else if (event.code === "ControlLeft") {
                this._ctrlDown = false;
            }
        };
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
            this._selectedObjects.forEach(obj => {
                obj.dispose();
            });
            this.setSelectedObject(undefined);
            this.setDraggedObject(undefined);
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
        this._onIPlus = async () => {
            for (let i = 0; i < this._selectedObjects.length; i++) {
                let selectedTrack = this._selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setI(selectedTrack.i + 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    await selectedTrack.instantiate();
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.machine.generateBaseMesh();
            this.updateFloatingElements();
        };
        this._onIMinus = async () => {
            for (let i = 0; i < this._selectedObjects.length; i++) {
                let selectedTrack = this._selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setI(selectedTrack.i - 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    await selectedTrack.instantiate();
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.machine.generateBaseMesh();
            this.updateFloatingElements();
        };
        this._onJPlus = async () => {
            for (let i = 0; i < this._selectedObjects.length; i++) {
                let selectedTrack = this._selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setJ(selectedTrack.j + 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    await selectedTrack.instantiate();
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.machine.generateBaseMesh();
            this.updateFloatingElements();
        };
        this._onJMinus = async () => {
            for (let i = 0; i < this._selectedObjects.length; i++) {
                let selectedTrack = this._selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setJ(selectedTrack.j - 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    await selectedTrack.instantiate();
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.machine.generateBaseMesh();
            this.updateFloatingElements();
        };
        this._onKPlus = async () => {
            if (this.selectedObject instanceof MachinePart) {
                for (let i = 0; i < this._selectedObjects.length; i++) {
                    let selectedTrack = this._selectedObjects[i];
                    if (selectedTrack instanceof MachinePart) {
                        selectedTrack.setK(selectedTrack.k + 1);
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.generateWires();
                        await selectedTrack.instantiate();
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.select();
                        if (this.game.cameraMode === CameraMode.Selected) {
                            this._onFocus();
                        }
                    }
                }
                this.setDraggedObject(undefined);
                this.setSelectedItem("");
                this.machine.generateBaseMesh();
                this.updateFloatingElements();
            }
            else if (this.selectedObject instanceof Ball) {
                this.selectedObject.k = this.selectedObject.k + 1;
                this.setSelectedObject(this.selectedObject);
                this.updateFloatingElements();
                if (!this.machine.playing) {
                    this.selectedObject.reset();
                }
            }
        };
        this._onKMinus = async () => {
            if (this.selectedObject instanceof MachinePart) {
                for (let i = 0; i < this._selectedObjects.length; i++) {
                    let selectedTrack = this._selectedObjects[i];
                    if (selectedTrack instanceof MachinePart) {
                        selectedTrack.setK(selectedTrack.k - 1);
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.generateWires();
                        await selectedTrack.instantiate();
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.select();
                        if (this.game.cameraMode === CameraMode.Selected) {
                            this._onFocus();
                        }
                    }
                }
                this.setDraggedObject(undefined);
                this.setSelectedItem("");
                this.machine.generateBaseMesh();
                this.updateFloatingElements();
            }
            else if (this.selectedObject instanceof Ball) {
                this.selectedObject.k = this.selectedObject.k - 1;
                this.setSelectedObject(this.selectedObject);
                this.updateFloatingElements();
                if (!this.machine.playing) {
                    this.selectedObject.reset();
                }
            }
        };
        this._onFill = () => {
            if (this.selectedObject instanceof Elevator) {
                let elevator = this.selectedObject;
                // Remove all balls located in the Elevator vicinity.
                let currentBallsInElevator = [];
                for (let i = 0; i < this.machine.balls.length; i++) {
                    let ball = this.machine.balls[i];
                    let posLocal = ball.positionZero.subtract(elevator.position);
                    if (elevator.encloseStart.x < posLocal.x && posLocal.x < elevator.encloseEnd.x) {
                        if (elevator.encloseEnd.y < posLocal.y && posLocal.y < elevator.encloseStart.y) {
                            if (elevator.encloseEnd.z < posLocal.z && posLocal.z < elevator.encloseStart.z) {
                                currentBallsInElevator.push(ball);
                            }
                        }
                    }
                }
                for (let i = 0; i < currentBallsInElevator.length; i++) {
                    currentBallsInElevator[i].dispose();
                }
                elevator.reset();
                requestAnimationFrame(() => {
                    let nBalls = Math.floor(elevator.boxesCount / 2);
                    for (let i = 0; i < nBalls; i++) {
                        let box = elevator.boxes[i];
                        let pos = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-0.011, 0.009, 0), box.getWorldMatrix());
                        let ball = new Ball(pos, this.machine);
                        ball.instantiate().then(() => {
                            ball.setShowPositionZeroGhost(true);
                            ball.setIsVisible(true);
                        });
                        this.machine.balls.push(ball);
                    }
                });
            }
        };
        this._onFocus = () => {
            if (this.selectedObjectsCount > 0) {
                this.game.focusMachineParts(false, ...this._selectedObjects);
            }
        };
        this.container = document.getElementById("machine-editor-objects");
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
        v = Math.round(v);
        if (v >= 0) {
            this._currentLayer = v;
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
                this.currentLayer = this._draggedObject.k;
                this.game.camera.detachControl();
                this.showCurrentLayer();
            }
            else {
                this.game.camera.attachControl();
                this.hideCurrentLayer();
            }
        }
    }
    get selectedObjectsCount() {
        return this._selectedObjects.length;
    }
    get selectedObject() {
        return this._selectedObjects[0];
    }
    setSelectedObject(s) {
        if (this._selectedObjects) {
            this._selectedObjects.forEach(obj => {
                obj.unselect();
            });
        }
        if (s) {
            this._selectedObjects = [s];
            if (this.game.cameraMode === CameraMode.Selected) {
                this._onFocus();
            }
        }
        else {
            this._selectedObjects = [];
        }
        if (this._selectedObjects[0]) {
            this.currentLayer = this._selectedObjects[0].k;
            this._selectedObjects[0].select();
            this.machinePartEditorMenu.currentObject = this._selectedObjects[0];
        }
        else {
            this.machinePartEditorMenu.currentObject = undefined;
        }
        this.updateFloatingElements();
    }
    addSelectedObjects(...objects) {
        for (let i = 0; i < objects.length; i++) {
            let object = objects[i];
            let index = this._selectedObjects.indexOf(object);
            if (index === -1) {
                this._selectedObjects.push(object);
                object.select();
                if (this.game.cameraMode === CameraMode.Selected) {
                    this._onFocus();
                }
            }
        }
        if (this.selectedObjectsCount === 1) {
            this.machinePartEditorMenu.currentObject = this.selectedObject;
        }
        if (this.selectedObjectsCount > 1) {
            this.machinePartEditorMenu.currentObject = undefined;
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
        var r = document.querySelector(':root');
        r.style.setProperty("--machine-editor-item-container-width", (Math.ceil(TrackNames.length / 2 + 1) * 16.8).toFixed(0) + "vw");
        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);
        this.game.canvas.addEventListener("pointerdown", this.pointerDown);
        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);
        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }
        this.floatingButtons = [];
        if (this.showManipulators) {
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
            this.floatingButtons.push(this.HPlusTopButton, this.HMinusTopButton, this.WMinusRightButton, this.WPlusRightButton, this.HMinusBottomButton, this.HPlusBottomButton, this.WPlusLeftButton, this.WMinusLeftButton, this.tileMirrorXButton, this.tileMirrorZButton, this.DPlusButton, this.DMinusButton);
        }
        // Ramp Origin UI
        this.originIPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originIPlusHandle.material = this.game.redMaterial;
        this.originIPlusHandle.rotation.z = -Math.PI / 2;
        this.originIPlusHandle.instantiate();
        this.originIPlusHandle.onClick = this._onOriginIPlus;
        this.originIMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originIMinusHandle.material = this.game.redMaterial;
        this.originIMinusHandle.rotation.z = Math.PI / 2;
        this.originIMinusHandle.instantiate();
        this.originIMinusHandle.onClick = this._onOriginIMinus;
        this.originJPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originJPlusHandle.material = this.game.greenMaterial;
        this.originJPlusHandle.rotation.z = Math.PI;
        this.originJPlusHandle.instantiate();
        this.originJPlusHandle.onClick = this._onOriginJPlus;
        this.originJMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originJMinusHandle.material = this.game.greenMaterial;
        this.originJMinusHandle.instantiate();
        this.originJMinusHandle.onClick = this._onOriginJMinus;
        this.originKPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originKPlusHandle.material = this.game.blueMaterial;
        this.originKPlusHandle.rotation.x = -Math.PI / 2;
        this.originKPlusHandle.instantiate();
        this.originKPlusHandle.onClick = this._onOriginKPlus;
        this.originKMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originKMinusHandle.material = this.game.blueMaterial;
        this.originKMinusHandle.rotation.x = Math.PI / 2;
        this.originKMinusHandle.instantiate();
        this.originKMinusHandle.onClick = this._onOriginKMinus;
        // Ramp Destination UI
        this.destinationIPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationIPlusHandle.material = this.game.redMaterial;
        this.destinationIPlusHandle.rotation.z = -Math.PI / 2;
        this.destinationIPlusHandle.instantiate();
        this.destinationIPlusHandle.onClick = this._onDestinationIPlus;
        this.destinationIMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationIMinusHandle.material = this.game.redMaterial;
        this.destinationIMinusHandle.rotation.z = Math.PI / 2;
        this.destinationIMinusHandle.instantiate();
        this.destinationIMinusHandle.onClick = this._onDestinationIMinus;
        this.destinationJPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationJPlusHandle.material = this.game.greenMaterial;
        this.destinationJPlusHandle.rotation.z = Math.PI;
        this.destinationJPlusHandle.instantiate();
        this.destinationJPlusHandle.onClick = this._onDestinationJPlus;
        this.destinationJMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationJMinusHandle.material = this.game.greenMaterial;
        this.destinationJMinusHandle.instantiate();
        this.destinationJMinusHandle.onClick = this._onDestinationJMinus;
        this.destinationKPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationKPlusHandle.material = this.game.blueMaterial;
        this.destinationKPlusHandle.rotation.x = -Math.PI / 2;
        this.destinationKPlusHandle.instantiate();
        this.destinationKPlusHandle.onClick = this._onDestinationKPlus;
        this.destinationKMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationKMinusHandle.material = this.game.blueMaterial;
        this.destinationKMinusHandle.rotation.x = Math.PI / 2;
        this.destinationKMinusHandle.instantiate();
        this.destinationKMinusHandle.onClick = this._onDestinationKMinus;
        // Machine Part displacer UI.
        this.IPlusHandle = new Arrow("IPlusHandle", this.game, 0.03);
        this.IPlusHandle.material = this.game.redMaterial;
        this.IPlusHandle.rotation.z = -Math.PI / 2;
        this.IPlusHandle.instantiate();
        this.IPlusHandle.onClick = this._onIPlus;
        this.IMinusHandle = new Arrow("IMinusHandle", this.game, 0.03);
        this.IMinusHandle.material = this.game.redMaterial;
        this.IMinusHandle.rotation.z = Math.PI / 2;
        this.IMinusHandle.instantiate();
        this.IMinusHandle.onClick = this._onIMinus;
        this.JPlusHandle = new Arrow("JPlusHandle", this.game, 0.03);
        this.JPlusHandle.material = this.game.greenMaterial;
        this.JPlusHandle.rotation.z = Math.PI;
        this.JPlusHandle.instantiate();
        this.JPlusHandle.onClick = this._onJPlus;
        this.JMinusHandle = new Arrow("JMinusHandle", this.game, 0.03);
        this.JMinusHandle.material = this.game.greenMaterial;
        this.JMinusHandle.instantiate();
        this.JMinusHandle.onClick = this._onJMinus;
        this.KPlusHandle = new Arrow("KPlusHandle", this.game, 0.03);
        this.KPlusHandle.material = this.game.blueMaterial;
        this.KPlusHandle.rotation.x = -Math.PI / 2;
        this.KPlusHandle.instantiate();
        this.KPlusHandle.onClick = this._onKPlus;
        this.KMinusHandle = new Arrow("KMinusHandle", this.game, 0.03);
        this.KMinusHandle.material = this.game.blueMaterial;
        this.KMinusHandle.rotation.x = Math.PI / 2;
        this.KMinusHandle.instantiate();
        this.KMinusHandle.onClick = this._onKMinus;
        this.handles = [
            this.IPlusHandle,
            this.IMinusHandle,
            this.JPlusHandle,
            this.JMinusHandle,
            this.KPlusHandle,
            this.KMinusHandle,
            this.originIPlusHandle,
            this.originIMinusHandle,
            this.originJPlusHandle,
            this.originJMinusHandle,
            this.originKPlusHandle,
            this.originKMinusHandle,
            this.destinationIPlusHandle,
            this.destinationIMinusHandle,
            this.destinationJPlusHandle,
            this.destinationJMinusHandle,
            this.destinationKPlusHandle,
            this.destinationKMinusHandle
        ];
        this.handles.forEach(handle => {
            handle.size = this.game.config.handleSize;
        });
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
        this.setSelectedObject(undefined);
        this.game.toolbar.resize();
        if (this.machinePartEditorMenu) {
            this.machinePartEditorMenu.dispose();
        }
        if (this.showManipulators) {
            this.floatingElementTop.dispose();
            this.floatingElementRight.dispose();
            this.floatingElementBottom.dispose();
            this.floatingElementLeft.dispose();
            this.floatingElementBottomRight.dispose();
            this.floatingElementBottomLeft.dispose();
        }
        this.handles.forEach(handle => {
            handle.dispose();
        });
        if (this.itemContainer) {
            this.itemContainer.innerHTML = "";
        }
        this.items = new Map();
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
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
        if (this.floatingButtons) {
            this.floatingButtons.forEach(button => {
                button.style.display = "none";
            });
        }
        if (this.handles) {
            this.handles.forEach(handle => {
                handle.isVisible = false;
            });
        }
        if (this.selectedObject) {
            let s = this.actionTileSize;
            if (this.selectedObject instanceof Ball) {
                this.KPlusHandle.position.copyFrom(this.selectedObject.positionZeroGhost.position);
                this.KPlusHandle.position.y -= 0.02;
                this.KPlusHandle.position.z -= 0.02;
                this.KPlusHandle.isVisible = true;
                this.KMinusHandle.position.copyFrom(this.selectedObject.positionZeroGhost.position);
                this.KMinusHandle.position.y -= 0.02;
                this.KMinusHandle.position.z += 0.02;
                this.KMinusHandle.isVisible = true;
            }
            else if (this.selectedObject instanceof MachinePart) {
                if (this.selectedObject instanceof Ramp && this.selectedObjectsCount === 1) {
                    let origin = this.selectedObject.getOrigin();
                    let pOrigin = new BABYLON.Vector3(origin.i * tileWidth - 0.5 * tileWidth, -origin.j * tileHeight, -origin.k * tileDepth);
                    this.originIPlusHandle.position.copyFrom(pOrigin);
                    this.originIPlusHandle.position.x += this.smallHandleSize;
                    this.originIMinusHandle.position.copyFrom(pOrigin);
                    this.originIMinusHandle.position.x -= this.smallHandleSize;
                    this.originJPlusHandle.position.copyFrom(pOrigin);
                    this.originJPlusHandle.position.y -= this.smallHandleSize;
                    this.originJMinusHandle.position.copyFrom(pOrigin);
                    this.originJMinusHandle.position.y += this.smallHandleSize;
                    this.originKPlusHandle.position.copyFrom(pOrigin);
                    this.originKPlusHandle.position.z -= this.smallHandleSize;
                    this.originKMinusHandle.position.copyFrom(pOrigin);
                    this.originKMinusHandle.position.z += this.smallHandleSize;
                    let destination = this.selectedObject.getDestination();
                    let pDestination = new BABYLON.Vector3(destination.i * tileWidth - 0.5 * tileWidth, -destination.j * tileHeight, -destination.k * tileDepth);
                    this.destinationIPlusHandle.position.copyFrom(pDestination);
                    this.destinationIPlusHandle.position.x += this.smallHandleSize;
                    this.destinationIMinusHandle.position.copyFrom(pDestination);
                    this.destinationIMinusHandle.position.x -= this.smallHandleSize;
                    this.destinationJPlusHandle.position.copyFrom(pDestination);
                    this.destinationJPlusHandle.position.y -= this.smallHandleSize;
                    this.destinationJMinusHandle.position.copyFrom(pDestination);
                    this.destinationJMinusHandle.position.y += this.smallHandleSize;
                    this.destinationKPlusHandle.position.copyFrom(pDestination);
                    this.destinationKPlusHandle.position.z -= this.smallHandleSize;
                    this.destinationKMinusHandle.position.copyFrom(pDestination);
                    this.destinationKMinusHandle.position.z += this.smallHandleSize;
                    this.originIPlusHandle.isVisible = true;
                    this.originIMinusHandle.isVisible = true;
                    this.originJPlusHandle.isVisible = true;
                    this.originJMinusHandle.isVisible = true;
                    this.originKPlusHandle.isVisible = true;
                    this.originKMinusHandle.isVisible = true;
                    this.destinationIPlusHandle.isVisible = true;
                    this.destinationIMinusHandle.isVisible = true;
                    this.destinationJPlusHandle.isVisible = true;
                    this.destinationJMinusHandle.isVisible = true;
                    this.destinationKPlusHandle.isVisible = true;
                    this.destinationKMinusHandle.isVisible = true;
                }
                else {
                    if (this.selectedObjectsCount === 1) {
                        this.IPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.IPlusHandle.position.x += this.selectedObject.encloseEnd.x;
                        this.IPlusHandle.position.y += this.selectedObject.encloseMid.y;
                        this.IPlusHandle.position.z += this.selectedObject.encloseStart.z - tileDepth * 0.5;
                        this.IMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.IMinusHandle.position.x += this.selectedObject.encloseStart.x;
                        this.IMinusHandle.position.y += this.selectedObject.encloseMid.y;
                        this.IMinusHandle.position.z += this.selectedObject.encloseStart.z - tileDepth * 0.5;
                        this.JPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.JPlusHandle.position.x += this.selectedObject.enclose13.x;
                        this.JPlusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.JPlusHandle.position.z += this.selectedObject.encloseStart.z - tileDepth * 0.5;
                        this.JMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.JMinusHandle.position.x += this.selectedObject.enclose13.x;
                        this.JMinusHandle.position.y += this.selectedObject.encloseStart.y;
                        this.JMinusHandle.position.z += this.selectedObject.encloseStart.z - tileDepth * 0.5;
                        this.KPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.KPlusHandle.position.x += this.selectedObject.enclose23.x;
                        this.KPlusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.KPlusHandle.position.z += this.selectedObject.encloseEnd.z;
                        this.KMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.KMinusHandle.position.x += this.selectedObject.enclose23.x;
                        this.KMinusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.KMinusHandle.position.z += this.selectedObject.encloseStart.z;
                    }
                    else if (this.selectedObjectsCount > 1) {
                        let encloseStart = new BABYLON.Vector3(Infinity, -Infinity, -Infinity);
                        let encloseEnd = new BABYLON.Vector3(-Infinity, Infinity, Infinity);
                        this._selectedObjects.forEach(obj => {
                            if (obj instanceof MachinePart) {
                                encloseStart.x = Math.min(encloseStart.x, obj.position.x + obj.encloseStart.x);
                                encloseStart.y = Math.max(encloseStart.y, obj.position.y + obj.encloseStart.y);
                                encloseStart.z = Math.max(encloseStart.z, obj.position.z + obj.encloseStart.z);
                                encloseEnd.x = Math.max(encloseEnd.x, obj.position.x + obj.encloseEnd.x);
                                encloseEnd.y = Math.min(encloseEnd.y, obj.position.y + obj.encloseEnd.y);
                                encloseEnd.z = Math.min(encloseEnd.z, obj.position.z + obj.encloseEnd.z);
                            }
                        });
                        let enclose13 = encloseStart.clone().scaleInPlace(2 / 3).addInPlace(encloseEnd.scale(1 / 3));
                        let encloseMid = encloseStart.clone().addInPlace(encloseEnd).scaleInPlace(0.5);
                        let enclose23 = encloseStart.clone().scaleInPlace(1 / 3).addInPlace(encloseEnd.scale(2 / 3));
                        this.IPlusHandle.position.x = encloseEnd.x;
                        this.IPlusHandle.position.y = encloseMid.y;
                        this.IPlusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.IMinusHandle.position.x = encloseStart.x;
                        this.IMinusHandle.position.y = encloseMid.y;
                        this.IMinusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.JPlusHandle.position.x = enclose13.x;
                        this.JPlusHandle.position.y = encloseEnd.y;
                        this.JPlusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.JMinusHandle.position.x = enclose13.x;
                        this.JMinusHandle.position.y = encloseStart.y;
                        this.JMinusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.KPlusHandle.position.x = enclose23.x;
                        this.KPlusHandle.position.y = encloseEnd.y;
                        this.KPlusHandle.position.z = encloseEnd.z;
                        this.KMinusHandle.position.x = enclose23.x;
                        this.KMinusHandle.position.y = encloseEnd.y;
                        this.KMinusHandle.position.z = encloseStart.z;
                    }
                    this.IPlusHandle.isVisible = true;
                    this.IMinusHandle.isVisible = true;
                    this.JPlusHandle.isVisible = true;
                    this.JMinusHandle.isVisible = true;
                    this.KPlusHandle.isVisible = true;
                    this.KMinusHandle.isVisible = true;
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
    GameMode[GameMode["Options"] = 1] = "Options";
    GameMode[GameMode["Credits"] = 2] = "Credits";
    GameMode[GameMode["CreateMode"] = 3] = "CreateMode";
    GameMode[GameMode["DemoMode"] = 4] = "DemoMode";
})(GameMode || (GameMode = {}));
var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["None"] = 0] = "None";
    CameraMode[CameraMode["Ball"] = 1] = "Ball";
    CameraMode[CameraMode["Landscape"] = 2] = "Landscape";
    CameraMode[CameraMode["Selected"] = 3] = "Selected";
    CameraMode[CameraMode["Focusing"] = 4] = "Focusing";
    CameraMode[CameraMode["FocusingSelected"] = 5] = "FocusingSelected";
})(CameraMode || (CameraMode = {}));
class Game {
    constructor(canvasElement) {
        this.screenRatio = 1;
        this.cameraMode = CameraMode.None;
        this.menuCameraMode = CameraMode.Ball;
        this.targetCamTarget = BABYLON.Vector3.Zero();
        this.targetCamAlpha = -Math.PI * 0.5;
        this.targetCamBeta = Math.PI * 0.5;
        this.targetCamRadius = 0.1;
        this._trackTargetCamSpeed = 0;
        this.cameraOrtho = false;
        this.mainVolume = 0;
        this.targetTimeFactor = 0.8;
        this.timeFactor = 0.1;
        this.physicDT = 0.0005;
        this._pointerDownX = 0;
        this._pointerDownY = 0;
        this.onPointerDown = (event) => {
            this._pointerDownX = this.scene.pointerX;
            this._pointerDownY = this.scene.pointerY;
        };
        this.onPointerUp = (event) => {
            if (this.cameraMode === CameraMode.Ball || this.cameraMode === CameraMode.Landscape) {
                let dx = (this._pointerDownX - this.scene.pointerX);
                let dy = (this._pointerDownY - this.scene.pointerY);
                if (dx * dx + dy * dy > 10 * 10) {
                    this.setCameraMode(CameraMode.None);
                }
            }
        };
        this.onWheelEvent = (event) => {
            if (this.cameraMode === CameraMode.Ball || this.cameraMode === CameraMode.Landscape) {
                this.setCameraMode(CameraMode.None);
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
    getScene() {
        return this.scene;
    }
    get currentTimeFactor() {
        return this.timeFactor * (this.mode === GameMode.MainMenu ? 0.5 : 1);
    }
    async createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        this.vertexDataLoader = new Mummu.VertexDataLoader(this.scene);
        this.config = new Configuration(this);
        this.config.initialize();
        //let line = BABYLON.MeshBuilder.CreateLines("zero", { points: [new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 0, -1)]});
        this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
        //this.scene.clearColor = BABYLON.Color4.FromHexString("#00ff00");
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
        this.cyanMaterial = new BABYLON.StandardMaterial("cyan-material");
        this.cyanMaterial.diffuseColor = BABYLON.Color3.FromHexString("#00FFFF");
        this.cyanMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.redMaterial = new BABYLON.StandardMaterial("red-material");
        this.redMaterial.diffuseColor = BABYLON.Color3.FromHexString("#bf212f");
        this.redMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.greenMaterial = new BABYLON.StandardMaterial("green-material");
        this.greenMaterial.diffuseColor = BABYLON.Color3.FromHexString("#006f3c");
        this.greenMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.blueMaterial = new BABYLON.StandardMaterial("blue-material");
        this.blueMaterial.diffuseColor = BABYLON.Color3.FromHexString("#264b96");
        this.blueMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.uiMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.uiMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.uiMaterial.emissiveColor.copyFromFloats(1, 1, 1);
        this.uiMaterial.specularColor.copyFromFloats(0, 0, 0);
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
        this.camera = new BABYLON.ArcRotateCamera("camera", this.targetCamAlpha, this.targetCamBeta, this.targetCamRadius, this.targetCamTarget.clone());
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 4000;
        this.camera.panningInertia *= 0.5;
        this.camera.lowerRadiusLimit = 0.05;
        this.camera.upperRadiusLimit = 1.5;
        this.camera.angularSensibilityX = 2000;
        this.camera.angularSensibilityY = 2000;
        this.camera.pinchPrecision = 5000;
        let alternateMenuCamMode = () => {
            if (this.menuCameraMode === CameraMode.Ball) {
                this.menuCameraMode = CameraMode.Landscape;
            }
            else {
                this.menuCameraMode = CameraMode.Ball;
            }
            if (this.mode <= GameMode.Credits) {
                this.setCameraMode(this.menuCameraMode);
            }
            setTimeout(alternateMenuCamMode, 10000 + 10000 * Math.random());
        };
        alternateMenuCamMode();
        this.camera.attachControl();
        this.camera.getScene();
        this.machine = new Machine(this);
        this.machineEditor = new MachineEditor(this);
        this.machine.deserialize(demo1);
        //this.machine.deserialize(test);
        await this.machine.instantiate();
        await this.machine.generateBaseMesh();
        let screenshotButton = document.querySelector("#toolbar-screenshot");
        screenshotButton.addEventListener("click", () => {
            this.makeCircuitScreenshot();
        });
        this.mode = GameMode.MainMenu;
        this.logo = new Logo(this);
        this.logo.initialize();
        this.logo.hide();
        this.mainMenu = new MainMenu(this);
        this.mainMenu.resize();
        this.mainMenu.hide();
        this.optionsPage = new OptionsPage(this);
        this.optionsPage.initialize();
        this.optionsPage.hide();
        this.creditsPage = new CreditsPage(this);
        this.creditsPage.hide();
        this.topbar = new Topbar(this);
        this.topbar.initialize();
        this.topbar.resize();
        this.toolbar = new Toolbar(this);
        this.toolbar.initialize();
        this.toolbar.resize();
        let demos = [simpleLoop, demo1, demoLoops, demo3, largeTornado];
        let container = document.getElementById("main-menu");
        let demoButtons = container.querySelectorAll(".panel.demo");
        for (let i = 0; i < demoButtons.length; i++) {
            let demo = demos[i];
            if (demo) {
                let buttonDemo = demoButtons[i];
                buttonDemo.onclick = async () => {
                    this.machine.dispose();
                    this.machine.deserialize(demo);
                    await this.machine.instantiate();
                    await this.machine.generateBaseMesh();
                    this.setPageMode(GameMode.DemoMode);
                };
            }
        }
        let buttonCreate = container.querySelector(".panel.create");
        buttonCreate.onclick = () => {
            this.machine.stop();
            this.setPageMode(GameMode.CreateMode);
        };
        let buttonOption = container.querySelector(".panel.option");
        buttonOption.onclick = () => {
            this.setPageMode(GameMode.Options);
        };
        let buttonCredit = container.querySelector(".panel.credit");
        buttonCredit.onclick = () => {
            this.setPageMode(GameMode.Credits);
        };
        await this.setPageMode(GameMode.MainMenu);
        this.machine.play();
        document.addEventListener("keydown", async (event) => {
            //await this.makeScreenshot("join");
            //await this.makeScreenshot("split");
            if (event.code === "KeyP") {
                let e = document.getElementById("screenshot-frame");
                if (e.style.display != "block") {
                    e.style.display = "block";
                }
                else {
                    this.makeCircuitScreenshot();
                }
            }
            //for (let i = 0; i < TrackNames.length; i++) {
            //    let trackname = TrackNames[i];
            //    await this.makeScreenshot(trackname);
            //}
        });
        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("wheel", this.onWheelEvent);
    }
    animate() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();
        });
        window.onresize = () => {
            console.log("a");
            this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
            this.engine.resize();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    console.log("b");
                    this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
                    this.engine.resize();
                    this.topbar.resize();
                    this.toolbar.resize();
                    this.mainMenu.resize();
                });
            });
        };
    }
    async initialize() {
    }
    update() {
        let dt = this.scene.deltaTime / 1000;
        if (this.cameraMode != CameraMode.None && this.cameraMode != CameraMode.Selected && isFinite(dt)) {
            let speed = 0.01;
            let camTarget = this.targetCamTarget;
            if (this.cameraMode === CameraMode.Ball && this.machine && this.machine.balls && this.machine.balls[0]) {
                this._trackTargetCamSpeed = this._trackTargetCamSpeed * 0.9995 + 30 * 0.0005;
                camTarget = this.machine.balls[0].position;
            }
            else if (this.cameraMode >= CameraMode.Focusing) {
                this._trackTargetCamSpeed = this._trackTargetCamSpeed * 0.995 + 20 * 0.005;
                speed = 0.2;
            }
            else {
                this._trackTargetCamSpeed = 0.2;
            }
            let target = BABYLON.Vector3.Lerp(this.camera.target, camTarget, this._trackTargetCamSpeed * dt);
            let alpha = Nabu.Step(this.camera.alpha, this.targetCamAlpha, Math.PI * speed * dt);
            let beta = Nabu.Step(this.camera.beta, this.targetCamBeta, Math.PI * speed * dt);
            let radius = Nabu.Step(this.camera.radius, this.targetCamRadius, 10 * speed * dt);
            this.camera.target.copyFrom(target);
            this.camera.alpha = alpha;
            this.camera.beta = beta;
            this.camera.radius = radius;
            if (this.cameraMode >= CameraMode.Focusing) {
                if (Math.abs(this.camera.alpha - this.targetCamAlpha) < Math.PI / 180) {
                    if (Math.abs(this.camera.beta - this.targetCamBeta) < Math.PI / 180) {
                        if (Math.abs(this.camera.radius - this.targetCamRadius) < 0.001) {
                            if (BABYLON.Vector3.Distance(this.camera.target, this.targetCamTarget) < 0.001) {
                                if (this.cameraMode === CameraMode.FocusingSelected) {
                                    this.cameraMode = CameraMode.Selected;
                                    this.camera.attachControl();
                                }
                                else {
                                    this.cameraMode = CameraMode.None;
                                    this.camera.attachControl();
                                }
                            }
                        }
                    }
                }
            }
            else if (this.cameraMode <= CameraMode.Landscape) {
                if (Math.abs(this.camera.alpha - this.targetCamAlpha) < Math.PI / 180) {
                    this.targetCamAlpha = -0.2 * Math.PI - Math.random() * Math.PI * 0.6;
                }
                if (Math.abs(this.camera.beta - this.targetCamBeta) < Math.PI / 180) {
                    this.targetCamBeta = 0.3 * Math.PI + Math.random() * Math.PI * 0.4;
                }
            }
        }
        window.localStorage.setItem("saved-main-volume", this.mainVolume.toFixed(2));
        window.localStorage.setItem("saved-time-factor", this.targetTimeFactor.toFixed(2));
        if (this.cameraOrtho) {
            let f = this.camera.radius / 4;
            this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            this.camera.orthoTop = 1 * f;
            this.camera.orthoBottom = -1 * f;
            this.camera.orthoLeft = -this.screenRatio * f;
            this.camera.orthoRight = this.screenRatio * f;
        }
        else {
            this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        }
        if (this.machineEditor) {
            this.machineEditor.update();
        }
        if (this.machine) {
            this.machine.update();
        }
        let fps = 1 / dt;
        if (fps < 30) {
            this.timeFactor *= 0.9;
        }
        else {
            this.timeFactor = this.timeFactor * 0.9 + this.targetTimeFactor * 0.1;
        }
    }
    async setPageMode(mode) {
        this.toolbar.closeAllDropdowns();
        this.machineEditor.dispose();
        this.mode = mode;
        this.topbar.resize();
        if (mode === GameMode.MainMenu) {
            this.setCameraMode(this.menuCameraMode);
            await this.optionsPage.hide();
            await this.creditsPage.hide();
            this.logo.show();
            await this.mainMenu.show();
        }
        if (mode === GameMode.Options) {
            this.setCameraMode(this.menuCameraMode);
            await this.mainMenu.hide();
            await this.creditsPage.hide();
            this.logo.show();
            await this.optionsPage.show();
        }
        if (mode === GameMode.Credits) {
            this.setCameraMode(this.menuCameraMode);
            await this.mainMenu.hide();
            await this.optionsPage.hide();
            this.logo.show();
            await this.creditsPage.show();
        }
        if (mode === GameMode.CreateMode) {
            this.setCameraMode(CameraMode.None);
            this.logo.hide();
            await this.mainMenu.hide();
            await this.optionsPage.hide();
            await this.creditsPage.hide();
            await this.machineEditor.instantiate();
        }
        if (mode === GameMode.DemoMode) {
            this.setCameraMode(CameraMode.Landscape);
            this.logo.hide();
            await this.mainMenu.hide();
            await this.optionsPage.hide();
            await this.creditsPage.hide();
        }
        this.topbar.resize();
        this.toolbar.resize();
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
    async makeCircuitScreenshot() {
        this.machine.baseWall.isVisible = false;
        this.machine.baseFrame.isVisible = false;
        this.skybox.isVisible = false;
        this.scene.clearColor.copyFromFloats(0, 0, 0, 0);
        return new Promise(resolve => {
            requestAnimationFrame(async () => {
                await Mummu.MakeScreenshot({ miniatureName: "circuit", size: 512, outlineWidth: 2 });
                this.machine.baseWall.isVisible = true;
                this.machine.baseFrame.isVisible = true;
                this.skybox.isVisible = true;
                this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
                resolve();
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
    getCameraHorizontalFOV() {
        return 2 * Math.atan(this.screenRatio * Math.tan(this.camera.fov / 2));
    }
    getCameraZoomFactor() {
        let f = 1 - (this.camera.radius - this.camera.lowerRadiusLimit) / (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit);
        return f * f;
    }
    setCameraZoomFactor(v) {
        let f = Math.sqrt(v);
        this.camera.radius = (1 - f) * (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit) + this.camera.lowerRadiusLimit;
    }
    setCameraMode(camMode) {
        if (camMode >= CameraMode.None && camMode <= CameraMode.Landscape) {
            this.cameraMode = camMode;
            if (this.cameraMode == CameraMode.None) {
            }
            else {
                if (this.cameraMode === CameraMode.Ball) {
                    this.targetCamRadius = 0.3;
                }
                else {
                    let encloseStart = this.machine.getEncloseStart();
                    let encloseEnd = this.machine.getEncloseEnd();
                    let size = BABYLON.Vector3.Distance(encloseStart, encloseEnd);
                    this.targetCamTarget.copyFrom(encloseStart.add(encloseEnd).scale(0.5));
                    this.targetCamRadius = size * 0.5;
                }
                this.targetCamAlpha = -0.2 * Math.PI - Math.random() * Math.PI * 0.6;
                this.targetCamBeta = 0.3 * Math.PI + Math.random() * Math.PI * 0.4;
            }
        }
        else if (camMode === CameraMode.Selected) {
            if (this.mode === GameMode.CreateMode) {
                this.cameraMode = camMode;
                this.targetCamAlpha = this.camera.alpha;
                this.targetCamBeta = this.camera.beta;
                this.targetCamRadius = this.camera.radius;
                this.targetCamTarget.copyFrom(this.camera.target);
            }
        }
        this.topbar.resize();
    }
    async focusMachineParts(updateAlphaBetaRadius, ...machineParts) {
        let start = new BABYLON.Vector3(Infinity, -Infinity, -Infinity);
        let end = new BABYLON.Vector3(-Infinity, Infinity, Infinity);
        machineParts.forEach(part => {
            if (part instanceof MachinePart) {
                start.x = Math.min(start.x, part.position.x + part.encloseStart.x);
                start.y = Math.max(start.y, part.position.y + part.encloseStart.y);
                start.z = Math.max(start.z, part.position.z + part.encloseStart.z);
                end.x = Math.max(end.x, part.position.x + part.encloseEnd.x);
                end.y = Math.min(end.y, part.position.y + part.encloseEnd.y);
                end.z = Math.min(end.z, part.position.z + part.encloseEnd.z);
            }
        });
        if (!Mummu.IsFinite(start) || !Mummu.IsFinite(end)) {
            return;
        }
        let center = start.add(end).scale(0.5);
        let w = (end.x - start.x);
        let distW = 0.5 * w / (Math.tan(this.getCameraHorizontalFOV() * 0.5));
        let h = (start.y - end.y);
        let distH = 0.5 * h / (Math.tan(this.camera.fov * 0.5));
        if (this.screenRatio > 1) {
            distW *= 3.5;
            distH *= 2.5;
        }
        else {
            distW *= 1.5;
            distH *= 2.5;
        }
        if (updateAlphaBetaRadius) {
            this.targetCamRadius = Math.max(distW, distH);
            this.targetCamAlpha = -Math.PI / 2;
            this.targetCamBeta = Math.PI / 2;
        }
        else {
            this.targetCamRadius = this.camera.radius;
            this.targetCamAlpha = this.camera.alpha;
            this.targetCamBeta = this.camera.beta;
        }
        this.targetCamTarget.copyFrom(center);
        if (this.cameraMode === CameraMode.Selected) {
            this.cameraMode = CameraMode.FocusingSelected;
        }
        else {
            this.cameraMode = CameraMode.Focusing;
        }
        this.camera.detachControl();
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
class Tools {
    static V3Dir(angleInDegrees, length = 1) {
        return new BABYLON.Vector3(Math.sin(angleInDegrees / 180 * Math.PI) * length, Math.cos(angleInDegrees / 180 * Math.PI) * length, 0);
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
        let q = this.track.game.config.graphicQ;
        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }
        let n = 4;
        if (q === 2) {
            n = 6;
        }
        else if (q === 3) {
            n = 8;
        }
        let shape = [];
        for (let i = 0; i < n; i++) {
            let a = i / n * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * this.radius, sina * this.radius, 0);
        }
        if (!Wire.DEBUG_DISPLAY) {
            let path = this.path;
            if (q === 2) {
                path = [];
                for (let i = 0; i < this.path.length; i++) {
                    if (i % 3 === 0 || i === this.path.length - 1) {
                        path.push(this.path[i]);
                    }
                }
            }
            if (q === 1) {
                path = [];
                for (let i = 0; i < this.path.length; i++) {
                    if (i % 6 === 0 || i === this.path.length - 1) {
                        path.push(this.path[i]);
                    }
                }
            }
            if (this.startTipDir) {
                let d = this.startTipDir.normalize().scaleInPlace(-1).scaleInPlace(this.track.wireGauge * 0.5);
                Mummu.RotateInPlace(d, this.startTipNormal, -Math.PI / 2);
                let tipPath = [d.add(this.startTipCenter)];
                for (let i = 0; i < 8 - 1; i++) {
                    Mummu.RotateInPlace(d, this.startTipNormal, Math.PI / 8);
                    tipPath.push(d.add(this.startTipCenter));
                }
                path = [...tipPath, ...path];
            }
            if (this.endTipDir) {
                let d = this.endTipDir.normalize().scaleInPlace(this.track.wireGauge * 0.5);
                Mummu.RotateInPlace(d, this.endTipNormal, -Math.PI / 2);
                let tipPath = [];
                for (let i = 0; i < 8; i++) {
                    Mummu.RotateInPlace(d, this.endTipNormal, Math.PI / 8);
                    tipPath.push(d.add(this.endTipCenter));
                }
                path.push(...tipPath);
            }
            let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
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
                z: this.balls[i].positionZero.z
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
            let ball = new Ball(new BABYLON.Vector3(ballData.x, ballData.y, isFinite(ballData.z) ? ballData.z : 0), this);
            this.balls.push(ball);
        }
        for (let i = 0; i < data.parts.length; i++) {
            let part = data.parts[i];
            let track = this.trackFactory.createTrack(part.name, part.i, part.j, part.k, part.mirror ? true : part.mirrorX, part.mirrorZ);
            this.parts.push(track);
        }
    }
    getEncloseStart() {
        let encloseStart = new BABYLON.Vector3(Infinity, -Infinity, -Infinity);
        this.parts.forEach(part => {
            encloseStart.x = Math.min(encloseStart.x, part.position.x + part.encloseStart.x);
            encloseStart.y = Math.max(encloseStart.y, part.position.y + part.encloseStart.y);
            encloseStart.z = Math.max(encloseStart.z, part.position.z + part.encloseStart.z);
        });
        return encloseStart;
    }
    getEncloseEnd() {
        let encloseEnd = new BABYLON.Vector3(-Infinity, Infinity, Infinity);
        this.parts.forEach(part => {
            encloseEnd.x = Math.max(encloseEnd.x, part.position.x + part.encloseEnd.x);
            encloseEnd.y = Math.min(encloseEnd.y, part.position.y + part.encloseEnd.y);
            encloseEnd.z = Math.min(encloseEnd.z, part.position.z + part.encloseEnd.z);
        });
        return encloseEnd;
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
        this.encloseStart = BABYLON.Vector3.Zero();
        this.enclose13 = BABYLON.Vector3.One().scaleInPlace(1 / 3);
        this.encloseMid = BABYLON.Vector3.One().scaleInPlace(0.5);
        this.enclose23 = BABYLON.Vector3.One().scaleInPlace(2 / 3);
        this.encloseEnd = BABYLON.Vector3.One();
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
            if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector" && m.name != "enclose-mesh") {
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
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector" && m.name != "enclose-mesh") {
                    m.visibility = 1;
                }
            });
        }
        if (this._partVisibilityMode === PartVisibilityMode.Ghost) {
            this.getChildren(undefined, false).forEach(m => {
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector" && m.name != "enclose-mesh") {
                    m.visibility = 0.3;
                }
            });
        }
    }
    select() {
        this.selectorMesh.visibility = 0.2;
        this.encloseMesh.visibility = 0.1;
    }
    unselect() {
        this.selectorMesh.visibility = 0;
        this.encloseMesh.visibility = 0;
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
        this.selectorMesh.material = this.game.cyanMaterial;
        this.selectorMesh.parent = this;
        if (datas.length) {
            Mummu.MergeVertexDatas(...datas).applyToMesh(this.selectorMesh);
        }
        this.selectorMesh.visibility = 0;
        if (this.encloseMesh) {
            this.encloseMesh.dispose();
        }
        let w = this.w * tileWidth;
        let h = (this.h + 1) * tileHeight;
        let d = this.d * tileDepth;
        let x0 = -tileWidth * 0.5;
        let y0 = tileHeight * 0.5;
        let z0 = tileDepth * 0.5;
        let x1 = x0 + w;
        let y1 = y0 - h;
        let z1 = z0 - d;
        this.encloseStart.copyFromFloats(x0, y0, z0);
        this.encloseEnd.copyFromFloats(x1, y1, z1);
        this.enclose13.copyFrom(this.encloseStart).scaleInPlace(2 / 3).addInPlace(this.encloseEnd.scale(1 / 3));
        this.encloseMid.copyFrom(this.encloseStart).addInPlace(this.encloseEnd).scaleInPlace(0.5);
        this.enclose23.copyFrom(this.encloseStart).scaleInPlace(1 / 3).addInPlace(this.encloseEnd.scale(2 / 3));
        this.encloseMesh = BABYLON.MeshBuilder.CreateLineSystem("enclose-mesh", {
            lines: [
                [new BABYLON.Vector3(x0, y0, z0), new BABYLON.Vector3(x1, y0, z0), new BABYLON.Vector3(x1, y1, z0), new BABYLON.Vector3(x0, y1, z0), new BABYLON.Vector3(x0, y0, z0)],
                [new BABYLON.Vector3(x0, y0, z0), new BABYLON.Vector3(x0, y0, z1)],
                [new BABYLON.Vector3(x1, y0, z0), new BABYLON.Vector3(x1, y0, z1)],
                [new BABYLON.Vector3(x1, y1, z0), new BABYLON.Vector3(x1, y1, z1)],
                [new BABYLON.Vector3(x0, y1, z0), new BABYLON.Vector3(x0, y1, z1)],
                [new BABYLON.Vector3(x0, y0, z1), new BABYLON.Vector3(x1, y0, z1), new BABYLON.Vector3(x1, y1, z1), new BABYLON.Vector3(x0, y1, z1), new BABYLON.Vector3(x0, y0, z1)]
            ]
        }, this.getScene());
        this.encloseMesh.parent = this;
        this.encloseMesh.visibility = 0;
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
            let normal;
            if (pointData.normal) {
                normal = new BABYLON.Vector3(pointData.normal.x, pointData.normal.y, pointData.normal.z);
            }
            let trackPoint = new TrackPoint(this.tracks[0], new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z), direction, normal, pointData.tangentIn, pointData.tangentOut);
            this.tracks[0].trackpoints[i] = trackPoint;
        }
    }
}
var TrackNames = [
    "ramp-1.1.1",
    "join",
    "flatjoin",
    "split",
    "uturn-s",
    "uturn-l",
    "uturnlayer-0.2",
    "loop-1.2",
    "loop",
    "wave",
    "snake",
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
        if (trackname === "flatjoin") {
            return new FlatJoin(this.machine, i, j, k, mirrorX);
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
        let q = part.game.config.graphicQ;
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
            let nShape = 3;
            if (q === 2) {
                nShape = 4;
            }
            else if (q === 3) {
                nShape = 6;
            }
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
            let nPath = 4;
            if (q === 2) {
                nPath = 8;
            }
            else if (q === 3) {
                nPath = 12;
            }
            let basePath = [];
            for (let i = 0; i <= nPath; i++) {
                let a = i / nPath * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                basePath[i] = new BABYLON.Vector3(cosa * radiusPath, -sina * radiusPath, 0);
            }
            let quat = BABYLON.Quaternion.Identity();
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
                    Mummu.QuaternionFromYZAxisToRef(part.tracks[j].interpolatedNormals[i], dir, quat);
                    let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), quat, t);
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
                        let nFixation = 2;
                        if (q === 2) {
                            nFixation = 6;
                        }
                        else if (q === 3) {
                            nFixation = 10;
                        }
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
                        let quat = BABYLON.Quaternion.Identity();
                        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), quat);
                        Mummu.RotateVertexDataInPlace(tmpVertexData, quat);
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
        this.drawStartTip = false;
        this.drawEndTip = false;
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
        if (this.drawStartTip) {
            this.wires[0].startTipCenter = this.trackpoints[0].position.clone();
            this.wires[0].startTipNormal = this.trackpoints[0].normal.clone();
            this.wires[0].startTipDir = this.trackpoints[0].dir.clone();
        }
        if (this.drawEndTip) {
            this.wires[0].endTipCenter = this.trackpoints[this.trackpoints.length - 1].position.clone();
            this.wires[0].endTipNormal = this.trackpoints[this.trackpoints.length - 1].normal.clone();
            this.wires[0].endTipDir = this.trackpoints[this.trackpoints.length - 1].dir.clone();
        }
        /*
        if (this.wires[1].drawStartTip) {
            this.wires[1].startTipNormal = this.trackpoints[this.trackpoints.length - 1].normal;
            this.wires[1].startTipDir = this.trackpoints[this.trackpoints.length - 1].dir;
        }
        if (this.wires[1].drawEndTip) {
            this.wires[1].endTipNormal = this.trackpoints[this.trackpoints.length - 1].normal;
            this.wires[1].endTipDir = this.trackpoints[this.trackpoints.length - 1].dir;
        }
        */
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
}
class TrackPoint {
    constructor(track, position, dir, normal, tangentIn, tangentOut) {
        this.track = track;
        this.position = position;
        this.dir = dir;
        this.normal = normal;
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
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-0.005, 0.035 - tileHeight, 0), (new BABYLON.Vector3(-1, 1, 0)).normalize(), new BABYLON.Vector3(-1, -1, 0).normalize())
        ];
        this.tracks[0].drawEndTip = true;
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
        let dx = this.speed * dt * this.game.currentTimeFactor;
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
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth / 3, 0, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth / 3, -tileHeight, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight, 0), dir)
        ];
        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), dir.scale(-1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.25, -tileHeight * 0.25, 0), dirJoin)
        ];
        let center = new BABYLON.Vector3(0.0135, 0.0165, 0);
        let r = 0.02;
        this.tracks[2] = new Track(this);
        this.tracks[2].trackpoints = [
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(0, -r, 0))),
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, Math.sqrt(3) / 2, 0), new BABYLON.Vector3(1, 0, 0)),
        ];
        this.tracks[2].drawStartTip = true;
        this.tracks[2].drawEndTip = true;
        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        this.generateWires();
    }
}
class FlatJoin extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k, {
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "flatjoin";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let dirJoin = (new BABYLON.Vector3(2, -1, 0)).normalize();
        let nJoin = (new BABYLON.Vector3(1, 2, 0)).normalize();
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight, 0), dir)
        ];
        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(-tileWidth * 0.25, -tileHeight * 0.25, 0), dirJoin)
        ];
        let center = new BABYLON.Vector3(-0.0135, 0.0165, 0);
        let r = 0.02;
        this.tracks[2] = new Track(this);
        this.tracks[2].trackpoints = [
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(0 + 0.03, -r - 0.011, 0)), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, -1, 0)),
        ];
        this.tracks[2].drawStartTip = true;
        this.tracks[2].drawEndTip = true;
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
            h: 4 * w,
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
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, -this.h * tileHeight, 0), dir)
        ];
        let nLoops = 1;
        let rStart = tileWidth * 0.5 * w * 0.7;
        let rEnd = rStart / (nLoops * 0.7);
        for (let n = 0; n <= 8 * nLoops; n++) {
            let f = Math.floor(n / 8) / nLoops;
            let r = rStart * (1 - f) + rEnd * f;
            let a = 2 * Math.PI * n / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            this.tracks[0].trackpoints.push(new TrackPoint(this.tracks[0], new BABYLON.Vector3(sina * r + 0.5 * tileWidth * (this.w - 1), r * 1 - cosa * r - this.h * tileHeight, -tileDepth * (this.d - 1) * (n + 0) / (8 * nLoops))));
        }
        this.tracks[0].trackpoints.push(new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), -this.h * tileHeight, -tileDepth * (this.d - 1)), dir));
        let points = this.tracks[0].trackpoints.map(tp => { return tp.position.clone(); });
        let f = 3;
        for (let n = 0; n < 2; n++) {
            let smoothedPoints = [...points].map(p => { return p.clone(); });
            for (let i = 1; i < smoothedPoints.length - 1; i++) {
                smoothedPoints[i].copyFrom(points[i - 1]).addInPlace(points[i].scale(f)).addInPlace(points[i + 1]).scaleInPlace(1 / (2 + f));
            }
            points = smoothedPoints;
        }
        for (let i = 0; i < points.length; i++) {
            this.tracks[0].trackpoints[i].position.copyFrom(points[i]);
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
            d: 3,
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
            if (this.mirrorX) {
                this.pivot.rotation.z = -Math.PI / 4;
            }
            else {
                this.pivot.rotation.z = Math.PI / 4;
            }
        };
        this._moving = false;
        this.xMirrorable = true;
        this.partName = "split";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let rCurb = this.pivotL * 0.3;
        let pEndLeft = new BABYLON.Vector3(0, -tileHeight, 0);
        pEndLeft.x -= this.pivotL / Math.SQRT2;
        pEndLeft.y += this.pivotL / Math.SQRT2;
        let pEndRight = pEndLeft.multiplyByFloats(-1, 1, 1);
        let dirEnd = Tools.V3Dir(135);
        let nEnd = Tools.V3Dir(45);
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[0], pEndLeft.subtract(dirEnd.scale(0.001)), dirEnd)
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
            new TrackPoint(this.tracks[2], pEndLeft.subtract(dirEnd.scale(0.001)).multiplyByFloats(-1, 1, 1), dirEnd.multiplyByFloats(-1, 1, 1))
        ];
        this.tracks[3] = new Track(this);
        this.tracks[3].trackpoints = [
            new TrackPoint(this.tracks[3], pEndLeft.add(Tools.V3Dir(315, 0.02)).add(Tools.V3Dir(45, 0.014)), Tools.V3Dir(150), new BABYLON.Vector3(0, -1, 0)),
            new TrackPoint(this.tracks[3], new BABYLON.Vector3(0, -0.003, 0)),
            new TrackPoint(this.tracks[3], pEndRight.add(Tools.V3Dir(45, 0.02)).add(Tools.V3Dir(315, 0.014)), Tools.V3Dir(30), new BABYLON.Vector3(0, -1, 0))
        ];
        this.tracks[3].drawStartTip = true;
        this.tracks[3].drawEndTip = true;
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
                            this._animatePivot(-Math.PI / 4, 0.3 / this.game.currentTimeFactor).then(() => {
                                this._moving = false;
                            });
                            return;
                        }
                        else if (local.x > -this.pivotL && local.x < -ball.radius * 0.5) {
                            this._moving = true;
                            this._animatePivot(Math.PI / 4, 0.3 / this.game.currentTimeFactor).then(() => {
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
            d: 3,
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
            d: 2,
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
            w: Math.ceil(d / 3),
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
            this.tracks[0].trackpoints[n].position.y = -f * this.h * tileHeight;
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
class Arrow extends BABYLON.Mesh {
    constructor(name, game, baseSize = 0.1, dir) {
        super(name);
        this.game = game;
        this.baseSize = baseSize;
        this.dir = dir;
        this._update = () => {
            if (this.dir && this.isVisible) {
                let z = this.position.subtract(this.game.camera.globalPosition);
                Mummu.QuaternionFromYZAxisToRef(this.dir, z, this.rotationQuaternion);
            }
        };
        this.scaling.copyFromFloats(this.baseSize, this.baseSize, this.baseSize);
        if (this.dir) {
            this.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
    }
    get size() {
        return this.scaling.x / this.baseSize;
    }
    set size(v) {
        let s = v * this.baseSize;
        this.scaling.copyFromFloats(s, s, s);
    }
    async instantiate() {
        let datas = await this.game.vertexDataLoader.get("./meshes/arrow.babylon");
        if (datas && datas[0]) {
            let data = datas[0];
            data.applyToMesh(this);
        }
        this.game.scene.onBeforeRenderObservable.add(this._update);
    }
    dispose() {
        super.dispose();
        this.game.scene.onBeforeRenderObservable.removeCallback(this._update);
    }
}
class CreditsPage {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById("credits");
        this.container.style.display = "none";
        this.updateNode = new BABYLON.Node("credits-update-node");
    }
    async show() {
        if (this.container.style.display === "") {
            this.container.style.pointerEvents = "";
            return;
        }
        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.display = "";
        await anim(1, 0.5);
        this.container.style.pointerEvents = "";
    }
    async hide() {
        if (this.container.style.display === "none") {
            this.container.style.pointerEvents = "none";
            return;
        }
        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.display = "";
        await anim(0, 0.5);
        this.container.style.display = "none";
        this.container.style.pointerEvents = "none";
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
    constructor(game) {
        this.game = game;
        this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.container.id = "logo";
        this.container.setAttribute("viewBox", "0 0 1000 350");
        this.container.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        this.container.style.opacity = "0";
        this.container.style.pointerEvents = "none";
        document.body.appendChild(this.container);
        this.fullScreenBanner = document.createElement("div");
        this.fullScreenBanner.id = "logo-banner";
        this.fullScreenBanner.style.opacity = "0";
        this.fullScreenBanner.style.pointerEvents = "none";
        document.body.appendChild(this.fullScreenBanner);
        this.updateNode = new BABYLON.Node("main-menu-update-node-logo");
        this.updateNodeBanner = new BABYLON.Node("main-menu-update-node-banner");
    }
    async show() {
        if (this.container.style.visibility === "visible") {
            if (this.fullScreenBanner.style.visibility === "visible") {
                return;
            }
        }
        let animContainer = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        let animBanner = Mummu.AnimationFactory.CreateNumber(this.updateNodeBanner, this.fullScreenBanner.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.fullScreenBanner.style.visibility = "visible";
        this.container.style.visibility = "visible";
        animBanner(1, 1);
        await animContainer(1, 1);
    }
    async hide() {
        if (this.container.style.visibility === "hidden") {
            if (this.fullScreenBanner.style.visibility === "hidden") {
                return;
            }
        }
        let animContainer = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        let animBanner = Mummu.AnimationFactory.CreateNumber(this.updateNodeBanner, this.fullScreenBanner.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.fullScreenBanner.style.visibility = "visible";
        this.container.style.visibility = "visible";
        animBanner(0, 0.5);
        await animContainer(0, 0.5);
        this.fullScreenBanner.style.visibility = "hidden";
        this.container.style.visibility = "hidden";
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
        let img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttribute("x", "100");
        img.setAttribute("y", "-200");
        img.setAttribute("width", "800");
        img.setAttribute("height", "800");
        img.setAttribute("href", "./datas/textures/edited-background.png");
        this.container.appendChild(img);
        let titleBack = document.createElementNS("http://www.w3.org/2000/svg", "text");
        titleBack.id = "logo-title-back";
        titleBack.classList.add("logo-title");
        titleBack.setAttribute("text-anchor", "middle");
        titleBack.setAttribute("x", "500");
        titleBack.setAttribute("y", "200");
        titleBack.setAttribute("transform-origin", "500 200");
        titleBack.setAttribute("transform", "scale(1 1.2)");
        titleBack.innerHTML = "MARBLE RUN";
        this.container.appendChild(titleBack);
        let title = document.createElementNS("http://www.w3.org/2000/svg", "text");
        title.id = "logo-title";
        title.classList.add("logo-title");
        title.setAttribute("text-anchor", "middle");
        title.setAttribute("x", "500");
        title.setAttribute("y", "200");
        title.setAttribute("transform-origin", "500 200");
        title.setAttribute("transform", "scale(1 1.2)");
        title.innerHTML = "MARBLE RUN";
        this.container.appendChild(title);
        let subtitleBack = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subtitleBack.id = "logo-subtitle-back";
        subtitleBack.classList.add("logo-subtitle");
        subtitleBack.setAttribute("text-anchor", "middle");
        subtitleBack.setAttribute("x", "600");
        subtitleBack.setAttribute("y", "270");
        subtitleBack.innerHTML = "SIMULATOR";
        this.container.appendChild(subtitleBack);
        let subtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subtitle.id = "logo-subtitle";
        subtitle.classList.add("logo-subtitle");
        subtitle.setAttribute("text-anchor", "middle");
        subtitle.setAttribute("x", "600");
        subtitle.setAttribute("y", "270");
        subtitle.innerHTML = "SIMULATOR";
        this.container.appendChild(subtitle);
        let earlyAccessDisclaimer = document.createElementNS("http://www.w3.org/2000/svg", "text");
        earlyAccessDisclaimer.setAttribute("text-anchor", "end");
        earlyAccessDisclaimer.setAttribute("x", "340");
        earlyAccessDisclaimer.setAttribute("y", "260");
        earlyAccessDisclaimer.setAttribute("fill", "white");
        earlyAccessDisclaimer.setAttribute("font-family", "Consolas");
        earlyAccessDisclaimer.setAttribute("font-size", "26px");
        earlyAccessDisclaimer.innerHTML = "> v0.1.2 early access";
        this.container.appendChild(earlyAccessDisclaimer);
    }
}
class MachinePartEditorMenu {
    constructor(machineEditor) {
        this.machineEditor = machineEditor;
        this._shown = true;
    }
    get currentObject() {
        return this._currentObject;
    }
    set currentObject(part) {
        this._currentObject = part;
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
        this.ijkLine = document.getElementById("machine-editor-part-menu-ijk");
        this.ijkIElement = this.ijkLine.querySelector(".value.i");
        this.ijkJElement = this.ijkLine.querySelector(".value.j");
        this.ijkKElement = this.ijkLine.querySelector(".value.k");
        this.kLine = document.getElementById("machine-editor-part-menu-k");
        this.kElement = this.kLine.querySelector(".value.k");
        this.widthLine = document.getElementById("machine-editor-part-menu-width");
        this.wPlusButton = document.querySelector("#machine-editor-part-menu-width button.plus");
        this.wPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, w, this.currentObject.yExtendable ? this.currentObject.h : undefined, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.wMinusButton = document.querySelector("#machine-editor-part-menu-width button.minus");
        this.wMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, w, this.currentObject.yExtendable ? this.currentObject.h : undefined, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.wValue = document.querySelector("#machine-editor-part-menu-width .value");
        this.heightLine = document.getElementById("machine-editor-part-menu-height");
        this.hPlusButton = document.querySelector("#machine-editor-part-menu-height button.plus");
        this.hPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.yExtendable) {
                let h = this.currentObject.h + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, h, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.hMinusButton = document.querySelector("#machine-editor-part-menu-height button.minus");
        this.hMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.yExtendable) {
                let h = this.currentObject.h - 1;
                if (h >= 0) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, h, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.hValue = document.querySelector("#machine-editor-part-menu-height .value");
        this.depthLine = document.getElementById("machine-editor-part-menu-depth");
        this.dPlusButton = document.querySelector("#machine-editor-part-menu-depth button.plus");
        this.dPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.zExtendable) {
                let d = this.currentObject.d + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, this.currentObject.yExtendable ? this.currentObject.h : undefined, d);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.dMinusButton = document.querySelector("#machine-editor-part-menu-depth button.minus");
        this.dMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.zExtendable) {
                let d = this.currentObject.d - 1;
                if (d >= this.currentObject.minD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, this.currentObject.yExtendable ? this.currentObject.h : undefined, d);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.dValue = document.querySelector("#machine-editor-part-menu-depth .value");
        this.mirrorXLine = document.getElementById("machine-editor-part-menu-mirrorX");
        this.mirrorXButton = document.querySelector("#machine-editor-part-menu-mirrorX button");
        this.mirrorXButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart) {
                let editedTrack = await this.machineEditor.mirrorXTrackInPlace(this.currentObject);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.mirrorZLine = document.getElementById("machine-editor-part-menu-mirrorZ");
        this.mirrorZButton = document.querySelector("#machine-editor-part-menu-mirrorZ button");
        this.mirrorZButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart) {
                let editedTrack = await this.machineEditor.mirrorZTrackInPlace(this.currentObject);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.fillLine = document.getElementById("machine-editor-part-menu-fill");
        this.fillButton = document.querySelector("#machine-editor-part-menu-fill button");
        this.fillButton.onclick = this.machineEditor._onFill;
        this.focusLine = document.getElementById("machine-editor-part-menu-focus");
        this.focusButton = document.querySelector("#machine-editor-part-menu-focus button");
        this.focusButton.onclick = this.machineEditor._onFocus;
        this.deleteLine = document.getElementById("machine-editor-part-menu-delete");
        this.deleteButton = document.querySelector("#machine-editor-part-menu-delete button");
        this.deleteButton.onclick = async () => {
            this.currentObject.dispose();
            this.machineEditor.setSelectedObject(undefined);
            this.machineEditor.setDraggedObject(undefined);
        };
    }
    dispose() {
        this.currentObject = undefined;
    }
    update() {
        if (this.container) {
            if (!this.currentObject) {
                this.container.style.display = "none";
            }
            else {
                this.container.style.display = "";
                this.showButton.style.display = this._shown ? "none" : "";
                this.hideButton.style.display = this._shown ? "" : "none";
                this.ijkLine.style.display = this._shown && this.currentObject instanceof MachinePart ? "" : "none";
                this.kLine.style.display = this._shown && this.currentObject instanceof Ball ? "" : "none";
                this.widthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xExtendable ? "" : "none";
                this.heightLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.yExtendable ? "" : "none";
                this.depthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zExtendable ? "" : "none";
                this.mirrorXLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xMirrorable ? "" : "none";
                this.mirrorZLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zMirrorable ? "" : "none";
                this.fillLine.style.display = this._shown && this.currentObject instanceof Elevator ? "" : "none";
                this.focusLine.style.display = this._shown ? "" : "none";
                this.deleteLine.style.display = this._shown ? "" : "none";
                if (this.currentObject instanceof MachinePart) {
                    this.titleElement.innerText = this.currentObject.partName;
                    this.ijkIElement.innerText = this.currentObject.i.toFixed(0);
                    this.ijkJElement.innerText = this.currentObject.j.toFixed(0);
                    this.ijkKElement.innerText = this.currentObject.k.toFixed(0);
                    this.wValue.innerText = this.currentObject.w.toFixed(0);
                    this.hValue.innerText = this.currentObject.h.toFixed(0);
                    this.dValue.innerText = this.currentObject.d.toFixed(0);
                }
                else if (this.currentObject instanceof Ball) {
                    this.titleElement.innerText = "Marble";
                    this.kElement.innerText = this.currentObject.k.toFixed(0);
                }
            }
        }
    }
}
class MainMenu {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById("main-menu");
        this.updateNode = new BABYLON.Node("main-menu-update-node");
    }
    async show() {
        if (this.container.style.visibility === "visible") {
            this.container.style.pointerEvents = "";
            return;
        }
        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(1, 1);
        this.container.style.pointerEvents = "";
    }
    async hide() {
        if (this.container.style.visibility === "hidden") {
            this.container.style.pointerEvents = "none";
            return;
        }
        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(0, 0.5);
        this.container.style.visibility = "hidden";
        this.container.style.pointerEvents = "none";
    }
    resize() {
        let requestedTileCount = this.container.querySelectorAll(".panel.demo").length + 3;
        let rect = this.container.getBoundingClientRect();
        let containerW = rect.width;
        let containerH = rect.height;
        let bestValue = 0;
        let xCount;
        let yCount;
        for (let xC = 1; xC <= 10; xC++) {
            for (let yC = 1; yC <= 10; yC++) {
                let count = xC * yC;
                if (count >= requestedTileCount) {
                    let w = containerW / xC;
                    let h = containerH / yC;
                    let area = w * h;
                    let squareness = Math.min(w / h, h / w);
                    let value = area * squareness;
                    if (value > bestValue) {
                        xCount = xC;
                        yCount = yC;
                        bestValue = value;
                    }
                }
            }
        }
        let tileW = containerW / xCount;
        let tileH = containerH / yCount;
        let m = Math.min(tileW, tileH) / 20;
        let demoButtons = this.container.querySelectorAll(".panel.demo");
        for (let i = 0; i < demoButtons.length; i++) {
            let pos = i + 2;
            let button = demoButtons[i];
            button.style.display = "block";
            button.style.width = (tileW - 2 * m).toFixed(0) + "px";
            button.style.height = (tileH - 2 * m).toFixed(0) + "px";
            button.style.position = "absolute";
            button.style.left = ((pos % xCount) * tileW + m).toFixed(0) + "px";
            button.style.top = (Math.floor(pos / xCount) * tileH + m).toFixed(0) + "px";
            button.style.backgroundImage = "url(./datas/icons/demo-" + (i + 1).toFixed(0) + ".png)";
        }
        let n = demoButtons.length;
        let buttonCreate = this.container.querySelector(".panel.create");
        buttonCreate.style.display = "block";
        buttonCreate.style.width = (2 * tileW - 2 * m).toFixed(0) + "px";
        buttonCreate.style.height = (tileH - 2 * m).toFixed(0) + "px";
        buttonCreate.style.position = "absolute";
        buttonCreate.style.left = m.toFixed(0) + "px";
        buttonCreate.style.top = m.toFixed(0) + "px";
        buttonCreate.style.backgroundImage = "url(./datas/icons/create.png)";
        buttonCreate.style.backgroundPosition = "bottom right";
        let buttonOption = this.container.querySelector(".panel.option");
        buttonOption.style.display = "block";
        buttonOption.style.width = (tileW - 2 * m).toFixed(0) + "px";
        buttonOption.style.height = (tileH * 0.5 - 2 * m).toFixed(0) + "px";
        buttonOption.style.position = "absolute";
        buttonOption.style.right = (m).toFixed(0) + "px";
        buttonOption.style.bottom = (0.5 * tileH + m).toFixed(0) + "px";
        let buttonCredit = this.container.querySelector(".panel.credit");
        buttonCredit.style.display = "block";
        buttonCredit.style.width = (tileW - 2 * m).toFixed(0) + "px";
        buttonCredit.style.height = (tileH * 0.5 - 2 * m).toFixed(0) + "px";
        buttonCredit.style.position = "absolute";
        buttonCredit.style.right = (m).toFixed(0) + "px";
        buttonCredit.style.bottom = m.toFixed(0) + "px";
    }
}
class OptionsPage {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById("options");
        this.updateNode = new BABYLON.Node("options-update-node");
    }
    initialize() {
        this.handleSizeMinus = document.getElementById("handle-size-minus");
        this.handleSizeMinus.onclick = () => {
            this.game.config.setHandleSize(this.game.config.handleSize - 0.2);
            this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        };
        this.handleSizeValue = document.getElementById("handle-size-val");
        this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        this.handleSizePlus = document.getElementById("handle-size-plus");
        this.handleSizePlus.onclick = () => {
            this.game.config.setHandleSize(this.game.config.handleSize + 0.2);
            this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        };
        this.graphicQMinus = document.getElementById("graphic-q-minus");
        this.graphicQMinus.onclick = () => {
            this.game.config.setGraphicQ(this.game.config.graphicQ - 1);
            this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        };
        this.graphicQValue = document.getElementById("graphic-q-val");
        this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        this.graphicQPlus = document.getElementById("graphic-q-plus");
        this.graphicQPlus.onclick = () => {
            this.game.config.setGraphicQ(this.game.config.graphicQ + 1);
            this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        };
        this.uiScaleFactorMinus = document.getElementById("ui-size-minus");
        this.uiScaleFactorMinus.onclick = () => {
            this.game.config.setUISize(this.game.config.uiSize - 0.1);
            this.uiScaleFactorValue.innerText = this._uiSizeToString(this.game.config.uiSize);
        };
        this.uiScaleFactorValue = document.getElementById("ui-size-val");
        this.uiScaleFactorValue.innerText = this._uiSizeToString(this.game.config.uiSize);
        this.uiScaleFactorPlus = document.getElementById("ui-size-plus");
        this.uiScaleFactorPlus.onclick = () => {
            this.game.config.setUISize(this.game.config.uiSize + 0.1);
            this.uiScaleFactorValue.innerText = this._uiSizeToString(this.game.config.uiSize);
        };
    }
    _graphicQToString(graphicQ) {
        if (graphicQ === 0) {
            return "Auto";
        }
        else if (graphicQ === 1) {
            return "Low";
        }
        else if (graphicQ === 2) {
            return "Medium";
        }
        else if (graphicQ === 3) {
            return "High";
        }
    }
    _uiSizeToString(s) {
        return (s * 100).toFixed(0) + "%";
    }
    async show() {
        if (this.container.style.visibility === "visible") {
            this.container.style.pointerEvents = "";
            return;
        }
        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(1, 0.5);
        this.container.style.pointerEvents = "";
    }
    async hide() {
        if (this.container.style.visibility === "hidden") {
            this.container.style.pointerEvents = "none";
            return;
        }
        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(0, 0.5);
        this.container.style.visibility = "hidden";
        this.container.style.pointerEvents = "none";
    }
}
class Toolbar {
    constructor(game) {
        this.game = game;
        this.camModeInputShown = false;
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
                this.timeFactorValue.innerText = this.game.currentTimeFactor.toFixed(2);
            }
            if (this.zoomInputShown) {
                this.zoomInput.value = this.game.getCameraZoomFactor().toFixed(3);
            }
            if (this.camModeInputShown) {
                if (this.game.cameraMode === CameraMode.None) {
                    this.camValue.innerText = "None";
                }
                else if (this.game.cameraMode === CameraMode.Ball) {
                    this.camValue.innerText = "Ball";
                }
                else if (this.game.cameraMode === CameraMode.Landscape) {
                    this.camValue.innerText = "Landscape";
                }
                else if (this.game.cameraMode === CameraMode.Selected) {
                    this.camValue.innerText = "Selected";
                }
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
        this.onCamButton = () => {
            this.camModeInputShown = !this.camModeInputShown;
            this.resize();
        };
        this.onCamPrevButton = () => {
            this.game.setCameraMode(this.game.cameraMode - 1);
            this.resize();
        };
        this.onCamNextButton = () => {
            this.game.setCameraMode(this.game.cameraMode + 1);
            this.resize();
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
            this.game.setPageMode(GameMode.MainMenu);
        };
        this.closeAllDropdowns = () => {
            if (this.camModeInputShown || this.timeFactorInputShown || this.loadInputShown || this.soundInputShown || this.zoomInputShown) {
                this.camModeInputShown = false;
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
        this.camButton = document.querySelector("#toolbar-cam-mode");
        this.camButton.addEventListener("click", this.onCamButton);
        this.camButtonPrev = document.querySelector("#toolbar-cam-mode-prev");
        this.camButtonPrev.addEventListener("click", this.onCamPrevButton);
        this.camValue = document.querySelector("#toolbar-cam-mode-value");
        this.camButtonNext = document.querySelector("#toolbar-cam-mode-next");
        this.camButtonNext.addEventListener("click", this.onCamNextButton);
        this.camInputContainer = this.camValue.parentElement;
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
        else if (this.game.mode === GameMode.Credits) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.Options) {
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
        this.camButton.style.display = "none";
    }
    resize() {
        this.updateButtonsVisibility();
        let margin = 10;
        this.container.style.bottom = "10px";
        if (this.game.screenRatio < 1) {
            let objectsElement = document.getElementById("machine-editor-objects");
            if (objectsElement.style.display != "none") {
                let h = objectsElement.getBoundingClientRect().height;
                this.container.style.bottom = (h + 10).toFixed(0) + "px";
            }
        }
        let containerWidth = this.container.clientWidth;
        this.container.style.left = ((this.game.engine.getRenderWidth() - containerWidth) * 0.5) + "px";
        this.camInputContainer.style.display = this.camModeInputShown ? "" : "none";
        let rectButton = this.camButton.getBoundingClientRect();
        let rectContainer = this.camInputContainer.getBoundingClientRect();
        this.camInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.camInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        this.timeFactorInputContainer.style.display = this.timeFactorInputShown ? "" : "none";
        rectButton = this.timeFactorButton.getBoundingClientRect();
        rectContainer = this.timeFactorInputContainer.getBoundingClientRect();
        this.timeFactorInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.timeFactorInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        this.loadInputContainer.style.display = this.loadInputShown ? "" : "none";
        rectButton = this.loadButton.getBoundingClientRect();
        rectContainer = this.loadInputContainer.getBoundingClientRect();
        this.loadInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.loadInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        this.soundInputContainer.style.display = this.soundInputShown ? "" : "none";
        rectButton = this.soundButton.getBoundingClientRect();
        rectContainer = this.soundInputContainer.getBoundingClientRect();
        this.soundInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.soundInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        this.zoomInputContainer.style.display = this.zoomInputShown ? "" : "none";
        rectButton = this.zoomButton.getBoundingClientRect();
        rectContainer = this.zoomInputContainer.getBoundingClientRect();
        this.zoomInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.zoomInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
    }
}
class Topbar {
    constructor(game) {
        this.game = game;
        this._shown = true;
        this.camModeButtons = [];
        this._udpate = () => {
        };
    }
    initialize() {
        this.container = document.querySelector("#topbar");
        this.container.style.display = "block";
        this.showHideButton = this.container.querySelector(".cam-mode");
        this.camModeButtons[CameraMode.None] = this.container.querySelector(".cam-mode-none");
        this.camModeButtons[CameraMode.Landscape] = this.container.querySelector(".cam-mode-landscape");
        this.camModeButtons[CameraMode.Ball] = this.container.querySelector(".cam-mode-ball");
        this.camModeButtons[CameraMode.Selected] = this.container.querySelector(".cam-mode-selected");
        this.showHideButton.onclick = () => {
            this._shown = !this._shown;
            this.resize();
        };
        for (let i = CameraMode.None; i <= CameraMode.Selected; i++) {
            let mode = i;
            this.camModeButtons[mode].onclick = () => {
                this.game.setCameraMode(mode);
                this.resize();
            };
        }
        this.game.scene.onBeforeRenderObservable.add(this._udpate);
    }
    dispose() {
        this.game.scene.onBeforeRenderObservable.removeCallback(this._udpate);
    }
    updateButtonsVisibility() {
        for (let i = 0; i < this.camModeButtons.length; i++) {
            this.camModeButtons[i].style.display = this._shown ? "" : "none";
        }
        if (this.game.mode === GameMode.CreateMode || this.game.mode === GameMode.DemoMode) {
            this.container.style.display = "block";
            if (this._shown) {
                if (this.game.mode === GameMode.CreateMode) {
                    this.camModeButtons[CameraMode.Selected].style.display = "";
                }
                else {
                    this.camModeButtons[CameraMode.Selected].style.display = "none";
                }
            }
        }
        else {
            this.container.style.display = "none";
        }
    }
    resize() {
        this.updateButtonsVisibility();
        if (this.game.screenRatio > 1) {
            let objectsElement = document.getElementById("machine-editor-objects");
            if (objectsElement.style.display != "none") {
                let w = objectsElement.getBoundingClientRect().width;
                this.container.style.left = w.toFixed(0) + "px";
                this.container.style.width = "";
            }
            else {
                this.container.style.left = "0";
            }
        }
        else {
            this.container.style.left = "0px";
            this.container.style.width = "13.5vh";
        }
        this.camModeButtons.forEach(button => {
            button.classList.remove("active");
        });
        this.camModeButtons[this.game.cameraMode].classList.add("active");
    }
}
