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
        this.constructorIndex = 0;
        this.size = 0.016;
        this.velocity = BABYLON.Vector3.Zero();
        this._showPositionZeroGhost = false;
        this.memCount = 2;
        this._lastWires = [];
        this._lastWireIndexes = [];
        this._pouet = 0;
        this.averageWithOptim = 0;
        this.averageNoOptim = 0;
        this.optimCount = 0;
        this.totalCount = 0;
        this._timer = 0;
        this.strReaction = 0;
        this.constructorIndex = Ball.ConstructorIndex++;
        this.marbleChocSound = new BABYLON.Sound("marble-choc-sound", "./datas/sounds/marble-choc.wav", this.getScene(), undefined, { loop: false, autoplay: false });
        this.railBumpSound = new BABYLON.Sound("rail-bump-sound", "./datas/sounds/rail-bump.wav", this.getScene(), undefined, { loop: false, autoplay: false });
        this.marbleLoopSound = new BABYLON.Sound("marble-loop-sound", "./datas/sounds/marble-loop.wav", this.getScene(), undefined, { loop: true, autoplay: true });
        this.marbleLoopSound.setVolume(0);
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
        this.marbleLoopSound.setVolume(0);
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
        this.marbleLoopSound.setVolume(0, 0.1);
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
        this.marbleLoopSound.setVolume(0, 0.1);
    }
    getLastIndex(wire) {
        for (let i = 0; i < this.memCount; i++) {
            if (this._lastWires[i] === wire) {
                return this._lastWireIndexes[i];
            }
        }
        return -1;
    }
    setLastHit(wire, index) {
        for (let i = 0; i < this.memCount; i++) {
            if (this._lastWires[i] === wire) {
                this._lastWireIndexes[i] = index;
                return;
            }
        }
        this._pouet = (this._pouet + 1) % this.memCount;
        this._lastWires[this._pouet] = wire;
        this._lastWireIndexes[this._pouet] = index;
    }
    update(dt) {
        if (this.position.y < this.machine.baseMeshMinY - 0.5) {
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
                        let index = this.getLastIndex(wire);
                        let col;
                        /*
                        if (this.constructorIndex === 0) {
                            if (index > - 1) {
                                this.optimCount++;
                                let t0 = performance.now();
                                col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5, true, index);
                                this.setLastHit(wire, col.index);
                                let t1 = performance.now();
                                let t = t1 - t0;
                                this.averageWithOptim = this.averageWithOptim * 0.9999 + t * 0.0001;
                            }
                            else {
                                let t0 = performance.now();
                                col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5, true, index);
                                this.setLastHit(wire, col.index);
                                let t1 = performance.now();
                                let t = t1 - t0;
                                this.averageNoOptim = this.averageNoOptim * 0.9999 + t * 0.0001;
                            }
                            this.totalCount++;
                            if (Math.random() < 0.001) {
                                let optimRate = this.optimCount / this.totalCount * 100;
                                console.log("optim rate " + optimRate.toFixed(3) + " %");
                                console.log("averageWithOptim " + this.averageWithOptim.toFixed(6) + " ms");
                                console.log("averageNoOptim " + this.averageNoOptim.toFixed(6) + " ms");
                            }
                        }
                        else {
                            */
                        let f = Nabu.MinMax(this.velocity.lengthSquared(), 0, 1);
                        let range = Math.round(f * 32 + (1 - f) * 2);
                        col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5, true, index, range);
                        //}
                        if (col.hit) {
                            //this.setLastHit(wire, col.index);
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
                    /*
                    if (part instanceof QuarterNote || part instanceof DoubleNote) {
                        part.tings.forEach(ting => {
                            let col = Mummu.SphereMeshIntersection(this.position, this.radius, ting);
                            if (col.hit) {
                                if (BABYLON.Vector3.Dot(this.velocity, col.normal) < 0) {
                                    part.notes[0].play();
                                    console.log(part.notes[0].name);
                                    BABYLON.Vector3.ReflectToRef(this.velocity, col.normal, this.velocity);
                                    if (this.velocity.length() > 0.8) {
                                        this.velocity.normalize().scaleInPlace(0.8);
                                    }
                                }
                            }
                        })
                    }
                    */
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
                            if (!this.marbleChocSound.isPlaying) {
                                this.marbleChocSound.setVolume(v / 5 * this.game.mainVolume);
                                this.marbleChocSound.play();
                            }
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
            let canceledSpeedLength = canceledSpeed.length();
            if (canceledSpeedLength > 0.22) {
                let f = Nabu.MinMax((canceledSpeedLength - 0.22) / 0.5, 0, 1);
                let v = (1 - f) * 0.01 + f * 0.03;
                if (!this.railBumpSound.isPlaying) {
                    this.railBumpSound.setVolume(v);
                    this.railBumpSound.play();
                }
            }
            this.strReaction = this.strReaction * 0.98;
            this.strReaction += reactions.length() * 0.02;
            this.velocity.subtractInPlace(canceledSpeed);
            //this.velocity.addInPlace(forcedDisplacement.scale(0.1 * 1 / dt));
            this.position.addInPlace(forcedDisplacement);
            let friction = this.velocity.scale(-1).scaleInPlace(0.001);
            let acceleration = weight.add(reactions).add(friction).scaleInPlace(1 / m);
            this.velocity.addInPlace(acceleration.scale(dt));
            this.position.addInPlace(this.velocity.scale(dt));
        }
        let f = this.velocity.length();
        this.marbleLoopSound.setVolume(2 * this.strReaction * f * this.game.timeFactor * this.game.mainVolume);
    }
}
Ball.ConstructorIndex = 0;
class Configuration {
    constructor(game) {
        this.game = game;
        this._handleSize = 1;
        this._autoGraphicQ = 1;
        this._graphicQ = 2;
        this._uiSize = 1.3;
        this._gridOpacity = 0.3;
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
    get autoGraphicQ() {
        return this._autoGraphicQ === 1;
    }
    setAutoGraphicQ(v, skipStorage) {
        this._autoGraphicQ = v ? 1 : 0;
        if (!skipStorage) {
            this.saveToLocalStorage();
        }
    }
    get graphicQ() {
        return this._graphicQ;
    }
    setGraphicQ(v, skipStorage) {
        if (v >= 1 && v <= 3) {
            this._graphicQ = v;
            if (!skipStorage) {
                if (this.game.machine) {
                    let data = this.game.machine.serialize();
                    this.game.machine.dispose();
                    this.game.machine.deserialize(data);
                    this.game.machine.instantiate();
                }
                if (this.game.room) {
                    this.game.room.dispose();
                }
                if (this._graphicQ > 1) {
                    this.game.room = new Room(this.game);
                    this.game.room.instantiate();
                }
                this.game.updateCameraLayer();
                this.game.updateShadowGenerator();
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
    get gridOpacity() {
        return this._gridOpacity;
    }
    setGridOpacity(v, skipStorage) {
        if (v >= 0 && v <= 1) {
            this._gridOpacity = v;
            if (this.game.gridMaterial) {
                this.game.gridMaterial.alpha = v;
            }
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
            uiSize: this.uiSize,
            gridOpacity: this.gridOpacity
        };
    }
    deserialize(data) {
        if (!data) {
            data = {};
            if (!isFinite(data.handleSize)) {
                data.handleSize = this.handleSize;
            }
            if (!isFinite(data.autoGraphicQ)) {
                data.autoGraphicQ = this._autoGraphicQ;
            }
            if (!isFinite(data.graphicQ)) {
                data.graphicQ = this.graphicQ;
            }
            if (!isFinite(data.uiSize)) {
                data.uiSize = this.uiSize;
            }
            if (!isFinite(data.gridOpacity)) {
                data.gridOpacity = this.gridOpacity;
            }
        }
        if (data) {
            if (isFinite(data.handleSize)) {
                this.setHandleSize(data.handleSize, true);
            }
            if (isFinite(data.autoGraphicQ)) {
                this.setAutoGraphicQ(data.autoGraphicQ === 1 ? true : false, true);
            }
            if (isFinite(data.graphicQ)) {
                this.setGraphicQ(data.graphicQ, true);
            }
            if (isFinite(data.uiSize)) {
                this.setUISize(data.uiSize, true);
            }
            if (isFinite(data.gridOpacity)) {
                this.setGridOpacity(data.gridOpacity, true);
            }
        }
    }
}
var simpleLoop = {
    balls: [{ x: 0.003999999664723874, y: -0.061500001311302184, z: 0 }],
    parts: [
        { name: "uturn-0.4", i: -3, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "elevator-3", i: 0, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.3", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: -3, j: 2, k: 0, mirrorX: true, mirrorZ: false },
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
        { name: "elevator-12", i: 3, j: -7, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 2, j: -6, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2.1", i: -1, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: -2, j: -1, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: 2, j: 4, k: 0 },
        { name: "ramp-3.2.2", i: -1, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: 2, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -1, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.4.1", i: 0, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -5, k: 0, mirrorX: true },
        { name: "wave-3.2.1", i: -1, j: -5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 2, j: -3, k: 0 },
        { name: "ramp-3.2.1", i: -1, j: -3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnsharp", i: -2, j: 5, k: 1, mirrorX: true },
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
        { name: "elevator-17", i: 2, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 1, j: -8, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.1.1", i: -1, j: -8, k: 0 },
        { name: "ramp-1.4.1", i: 0, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.1.1", i: 0, j: -6, k: 2 },
        { name: "uturn-1.3", i: -2, j: -4, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: -3, k: 2 },
        { name: "uturn-1.3", i: 1, j: -2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.1", i: 0, j: -1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.1.1", i: -1, j: -4, k: 0 },
        { name: "uturn-1.3", i: -2, j: 0, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: 1, k: 2 },
        { name: "loop-1.1.1", i: 0, j: -2, k: 2 },
        { name: "uturn-1.3", i: 1, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.1", i: 0, j: 3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.1.1", i: -1, j: 0, k: 0 },
        { name: "uturn-1.3", i: -2, j: 4, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: 5, k: 2 },
        { name: "loop-1.1.1", i: 0, j: 2, k: 2 },
        { name: "uturn-1.3", i: 1, j: 6, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturnsharp", i: 0, j: 7, k: 0, mirrorX: true },
        { name: "ramp-1.0.1", i: 1, j: 8, k: 0, mirrorX: false, mirrorZ: false },
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
        { name: "join", i: -1, j: 2, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: -2, j: -2, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: -3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-1.2", i: -2, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "join", i: 0, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 1, j: 4, k: 0 },
        { name: "elevator-12", i: -3, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.3.1", i: 0, j: -1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "snake-1.2.3", i: 1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 2, j: -1, k: 1 },
        { name: "loop-1.1.1", i: -2, j: 0, k: 2 },
        { name: "ramp-1.4.1", i: -1, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -3, j: 4, k: 2, mirrorX: true, mirrorZ: true },
        { name: "ramp-3.1.1", i: -2, j: 3, k: 3, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.1.1", i: -2, j: 4, k: 0, mirrorX: true, mirrorZ: false },
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
        { name: "uturn-1.2", i: 0, j: -4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.2", i: 5, j: 0, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: 1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.2", i: 5, j: -5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-8", i: 3, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: 1, j: -5, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.4.1", i: 1, j: -4, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.2.1", i: 2, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-2.3", i: 1, j: -7, k: 0, mirrorX: true, mirrorZ: false },
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
        { name: "uturn-1.4", i: -1, j: -2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "ramp-2.0.1", i: 1, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: -4, k: 3, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -6, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -2, j: -5, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
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
        { name: "uturn-0.3", i: 2, j: -10, k: 3, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2", i: 0, j: -9, k: 3, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -3, j: -10, k: 4, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.5.1", i: 1, j: -10, k: 3, mirrorX: true, mirrorZ: false },
        { name: "join", i: 1, j: 0, k: 6, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 0, j: 1, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.5", i: 2, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "elevator-14", i: 1, j: -13, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.3.1", i: 0, j: -6, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.2", i: -4, j: -7, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.5", i: -1, j: -1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.5", i: 0, j: -7, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.6", i: 2, j: -8, k: 2, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -1, j: -9, k: 7, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.6", i: 2, j: -7, k: 1, mirrorX: false, mirrorZ: true },
        { name: "uturn-1.6", i: -4, j: -6, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.0.1", i: -2, j: -6, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: -2, j: -5, k: 6, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: 2, j: -4, k: 2, mirrorX: false, mirrorZ: true },
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
        { name: "uturn-1.5", i: -1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.5", i: 1, j: -5, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.8", i: -2, j: -4, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.7", i: 1, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.7", i: -2, j: -2, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.6", i: 1, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.6", i: -1, j: 0, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.5", i: 1, j: 1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: -1, j: 2, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.4", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: 4, k: 1, mirrorX: true, mirrorZ: true },
        { name: "elevator-15", i: 1, j: -7, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: 1, j: 5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.4.1", i: -1, j: 6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.5", i: -4, j: 10, k: 0, mirrorX: true, mirrorZ: true },
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
        { name: "uturn-0.4", i: -5, j: 5, k: 0, mirrorX: true, mirrorZ: false },
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
        { name: "uturn-0.4", i: -3, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: 0, k: 2, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: -3, j: 2, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: -1, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-s", i: 0, j: 0, k: 3, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.2", i: -2, j: 1, k: 3, mirrorX: true, mirrorZ: false },
    ],
};
var test = {
    balls: [{ x: -0.5766096541939383, y: 0.4087908683675662, z: 0 }],
    parts: [
        { name: "join", i: -1, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "split", i: -1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: 0, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 0, j: 0, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-2.4", i: 0, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "elevator-16", i: -4, j: -14, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.0.1", i: -3, j: 2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.10.1", i: -3, j: -13, k: 0, mirrorX: false, mirrorZ: false },
    ],
};
var test2 = {
    balls: [{ x: 0.1470751372356046, y: -0.021790127870097292, z: -1.1102230246251565e-16 }],
    parts: [
        { name: "elevator-7", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "loop-1.2", i: -1, j: -5, k: 1, mirrorZ: true },
        { name: "ramp-1.4.2", i: 0, j: -5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.2", i: -1, j: -1, k: 0, mirrorX: false, mirrorZ: true },
    ],
};
var deathLoop = {
    balls: [
        { x: 0.15400000655651092, y: -0.09149998760223389, z: 0 },
        { x: 0.15400000655651092, y: -0.011062685012817383, z: 0 },
        { x: 0.15400000655651092, y: 0.0693746473789215, z: 0 },
        { x: 0.15400000655651092, y: 0.14981196486949921, z: 0 },
        { x: 0.15400000655651092, y: 0.2302492823600769, z: 0 },
        { x: 0.15400000655651092, y: 0.3106865849494934, z: 0 },
        { x: 0.13336174356459699, y: -0.08357069912963007, z: 0 },
        { x: 0.116171708005261, y: -0.08169939664358977, z: 0 },
        { x: 0.09848493236671044, y: -0.07917683386823743, z: 0 },
    ],
    parts: [
        { name: "ramp-3.13.1", i: -2, j: -10, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-14", i: 1, j: -11, k: 0, mirrorZ: false },
        { name: "loop-1.5.2", i: -3, j: -1, k: 0, mirrorX: true },
        { name: "loop-1.5.1", i: -4, j: -1, k: 0 },
        { name: "uturn-0.3", i: -6, j: 2, k: 0, mirrorX: true },
        { name: "uturn-0.2", i: -2, j: 1, k: 2 },
        { name: "uturn-1.3", i: -3, j: 1, k: 3, mirrorX: true },
        { name: "ramp-3.1.6", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -5, j: 1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -5, j: 2, k: 0 },
    ],
};
var test3 = {
    balls: [{ x: 0.15141078307665115, y: -0.06119131474246342, z: 1.1102230246251565e-16 }],
    parts: [
        { name: "ramp-2.8.1", i: -1, j: -5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-9", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "ramp-2.0.1", i: -3, j: 3, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.3", i: -1, j: 3, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.0.1", i: -3, j: 3, k: 7, mirrorX: false, mirrorZ: false },
        { name: "loop-1.8.1", i: -2, j: -1, k: 0, mirrorZ: true },
        { name: "uturn-0.6", i: -5, j: 3, k: 2, mirrorX: true, mirrorZ: true },
    ],
};
var popopo = {
    balls: [
        { x: 0.15400000655651092, y: 0.02849998736381531, z: 0 },
        { x: 0.15400000655651092, y: 0.10534068608283996, z: 0 },
        { x: 0.15400000655651092, y: 0.18218139970302583, z: 0 },
        { x: 0.15400000655651092, y: 0.2590221133232117, z: 0 },
        { x: 0.15400000655651092, y: 0.33586281204223634, z: 0 },
    ],
    parts: [
        { name: "uturn-0.2", i: -2, j: -12, k: 0, mirrorX: true },
        { name: "ramp-2.0.1", i: -1, j: -12, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.1.1", i: 1, j: -11, k: 1 },
        { name: "uturn-0.2", i: -4, j: -5, k: 3, mirrorX: true },
        { name: "ramp-2.5.1", i: -1, j: -12, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 2, j: -7, k: 1 },
        { name: "split", i: -3, j: -7, k: 3, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: -2, j: -5, k: 3 },
        { name: "ramp-1.3.1", i: -3, j: -5, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -5, j: -3, k: 5, mirrorX: true },
        { name: "ramp-1.0.1", i: -2, j: -2, k: 4, mirrorX: false, mirrorZ: false },
        { name: "flatjoin", i: -1, j: -3, k: 4, mirrorZ: false },
        { name: "wave-2.2.1", i: -4, j: -5, k: 5, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.0.1", i: -2, j: -7, k: 3, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: -3, k: 5 },
        { name: "ramp-3.0.1", i: -4, j: -3, k: 6, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -3, k: 4, mirrorX: true },
        { name: "elevator-12", i: 1, j: -13, k: 0, mirrorZ: false },
        { name: "ramp-1.1.5", i: 0, j: -2, k: 0, mirrorX: false, mirrorZ: true },
    ],
};
var xxlStressTest = {
    balls: [
        { x: -0.7539999856948852, y: -0.09149998760223389, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: -0.013237598896026612, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.06502478981018066, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.14328714871406556, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.22154953742027284, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.2998119261264801, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.3780743148326874, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.45633673334121705, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.5345991220474243, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.6128615107536316, z: -0.23999999463558197 },
        { x: -0.9039999618530273, y: -0.15150001978874206, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: -0.07242200112342835, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.0066559579372406, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.08573394680023193, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.16481193566322327, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.2438899245262146, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.32296791338920594, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.4020459022521973, z: -0.05999999865889549 },
        { x: 0.4539999737739563, y: -0.18150002098083495, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.10227644777297974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.02305287456512451, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.056170698642730714, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.13539427185058595, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.21461781525611878, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.293841388463974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.37306496167182923, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.45228853487968446, z: -0.30000001192092896 },
    ],
    parts: [
        { name: "uturn-0.2", i: 0, j: 4, k: 1 },
        { name: "ramp-5.1.1", i: -5, j: 4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-5.1.1", i: -5, j: 3, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -3, j: 3, k: 4 },
        { name: "uturn-0.4", i: -7, j: 3, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: -5, j: 3, k: 5, mirrorX: false, mirrorZ: false },
        { name: "split", i: -4, j: 1, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 4, j: 0, k: 2 },
        { name: "join", i: 3, j: -1, k: 2, mirrorZ: false },
        { name: "ramp-1.0.1", i: 4, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: 1, j: -2, k: 3 },
        { name: "uturn-0.3", i: 0, j: -2, k: 3, mirrorX: true, mirrorZ: true },
        { name: "uturnsharp", i: 5, j: -2, k: 2 },
        { name: "ramp-2.1.1", i: 0, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.2.1", i: 3, j: -4, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.2.1", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2.1", i: 2, j: -5, k: 2, mirrorZ: true },
        { name: "loop-1.2.1", i: 2, j: -6, k: 1 },
        { name: "spiral-2.3.2", i: 0, j: -6, k: 2, mirrorX: true },
        { name: "uturn-0.4", i: 2, j: -6, k: 2, mirrorZ: true },
        { name: "ramp-1.4.1", i: 1, j: -6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -5, j: -11, k: 1, mirrorX: true },
        { name: "ramp-1.0.1", i: -4, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.8.1", i: -3, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "spiral-3.8.6", i: -3, j: -11, k: 1 },
        { name: "split", i: -4, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: -5, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: -13, k: 0 },
        { name: "ramp-2.0.1", i: -3, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-19", i: -6, j: -14, k: 1, mirrorX: true, mirrorZ: false },
        { name: "loop-1.5.2", i: -2, j: -17, k: 0, mirrorZ: true },
        { name: "ramp-2.7.1", i: -4, j: -20, k: 4, mirrorX: false, mirrorZ: false },
        { name: "elevator-24", i: -5, j: -21, k: 4, mirrorX: true, mirrorZ: false },
        { name: "elevator-23", i: 3, j: -17, k: 5, mirrorZ: false },
        { name: "spiral-1.5.3", i: 2, j: -16, k: 5, mirrorX: true },
        { name: "ramp-2.4.1", i: 0, j: -11, k: 5, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2.1", i: -1, j: -11, k: 5, mirrorZ: true },
        { name: "ramp-2.5.1", i: -3, j: -7, k: 6, mirrorX: true, mirrorZ: false },
        { name: "loop-1.4.1", i: -4, j: -6, k: 3 },
        { name: "uturn-0.5", i: -6, j: -2, k: 3, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.3", i: -4, j: -4, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 5 },
        { name: "spiral-2.3.3", i: 1, j: 3, k: 5 },
        { name: "ramp-4.1.1", i: -3, j: 3, k: 5, mirrorX: true, mirrorZ: false },
        { name: "wave-4.3.1", i: -3, j: 0, k: 7, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -4, j: 3, k: 5, mirrorX: true, mirrorZ: true },
        { name: "split", i: -2, j: -4, k: 5, mirrorX: false, mirrorZ: false },
        { name: "wave-2.2.1", i: -1, j: -2, k: 5, mirrorX: false, mirrorZ: false },
        { name: "ramp-6.1.1", i: -2, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "flatjoin", i: -3, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -4, j: -2, k: 2, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.3", i: -2, j: -1, k: 2 },
    ],
};
var aerial = {
    balls: [
        { x: 0.3039999976158142, y: -0.36149999833106994, z: 0 },
        { x: 0.3039999976158142, y: -0.28106269574165343, z: 0 },
        { x: 0.3039999976158142, y: -0.20062536334991454, z: 0 },
        { x: 0.3039999976158142, y: -0.12018804585933686, z: 0 },
        { x: 0.3039999976158142, y: -0.03975073954463005, z: 0 },
        { x: 0.3039999976158142, y: 0.04068657422065735, z: 0 },
    ],
    parts: [
        { name: "uturn-0.3", i: 1, j: 12, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.2.3", i: 2, j: 12, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 3, j: 12, k: 1 },
        { name: "ramp-1.0.2", i: 2, j: 12, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.3.1", i: 1, j: 10, k: 1 },
        { name: "ramp-1.1.1", i: 0, j: 9, k: 5, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.6.2", i: -2, j: 8, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: 1, j: 8, k: 1 },
        { name: "uturn-0.4", i: -4, j: 8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.0.3", i: -2, j: 8, k: 1, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: 3, j: 6, k: 5 },
        { name: "loop-1.4.1", i: -1, j: 6, k: 2 },
        { name: "ramp-2.3.6", i: 1, j: 3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.7.2", i: -1, j: 3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.6.1", i: 2, j: 2, k: 2 },
        { name: "ramp-2.4.1", i: 0, j: 2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: -1, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: 0, j: 1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "spiral-1.3.2", i: 1, j: -2, k: 0, mirrorX: true },
        { name: "elevator-15", i: 2, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: 10, k: 1, mirrorX: true },
    ],
};
var nested = {
    balls: [
        { x: -0.7539999856948852, y: -0.09149998760223389, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: -0.013237598896026612, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.06502478981018066, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.14328714871406556, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.22154953742027284, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.2998119261264801, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.3780743148326874, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.45633673334121705, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.5345991220474243, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.6128615107536316, z: -0.23999999463558197 },
        { x: -0.9039999618530273, y: -0.15150001978874206, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: -0.07242200112342835, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.0066559579372406, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.08573394680023193, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.16481193566322327, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.2438899245262146, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.32296791338920594, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.4020459022521973, z: -0.05999999865889549 },
        { x: 0.4539999737739563, y: -0.18150002098083495, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.10227644777297974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.02305287456512451, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.056170698642730714, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.13539427185058595, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.21461781525611878, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.293841388463974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.37306496167182923, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.45228853487968446, z: -0.30000001192092896 },
    ],
    parts: [
        { name: "uturn-0.2", i: 0, j: 4, k: 1 },
        { name: "ramp-5.1.1", i: -5, j: 4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-5.1.1", i: -5, j: 3, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -3, j: 3, k: 4 },
        { name: "uturn-0.4", i: -7, j: 3, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: -5, j: 3, k: 5, mirrorX: false, mirrorZ: false },
        { name: "split", i: -4, j: 1, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 4, j: 0, k: 2 },
        { name: "join", i: 3, j: -1, k: 2, mirrorZ: false },
        { name: "ramp-1.0.1", i: 4, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: 1, j: -2, k: 3 },
        { name: "uturn-0.3", i: 0, j: -2, k: 3, mirrorX: true, mirrorZ: true },
        { name: "uturnsharp", i: 5, j: -2, k: 2 },
        { name: "ramp-2.1.1", i: 0, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.2.1", i: 3, j: -4, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.2.1", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2.1", i: 2, j: -5, k: 2, mirrorZ: true },
        { name: "loop-1.2.1", i: 2, j: -6, k: 1 },
        { name: "spiral-2.3.2", i: 0, j: -6, k: 2, mirrorX: true },
        { name: "uturn-0.4", i: 2, j: -6, k: 2, mirrorZ: true },
        { name: "ramp-1.4.1", i: 1, j: -6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -5, j: -11, k: 1, mirrorX: true },
        { name: "ramp-1.0.1", i: -4, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.8.1", i: -3, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "spiral-3.8.6", i: -3, j: -11, k: 1 },
        { name: "split", i: -4, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: -5, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: -13, k: 0 },
        { name: "ramp-2.0.1", i: -3, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-19", i: -6, j: -14, k: 1, mirrorX: true, mirrorZ: false },
        { name: "loop-1.5.2", i: -2, j: -17, k: 0, mirrorZ: true },
        { name: "ramp-2.7.1", i: -4, j: -20, k: 4, mirrorX: false, mirrorZ: false },
        { name: "elevator-24", i: -5, j: -21, k: 4, mirrorX: true, mirrorZ: false },
        { name: "elevator-23", i: 3, j: -17, k: 5, mirrorZ: false },
        { name: "spiral-1.5.3", i: 2, j: -16, k: 5, mirrorX: true },
        { name: "ramp-2.4.1", i: 0, j: -11, k: 5, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2.1", i: -1, j: -11, k: 5, mirrorZ: true },
        { name: "ramp-2.5.1", i: -3, j: -7, k: 6, mirrorX: true, mirrorZ: false },
        { name: "loop-1.4.1", i: -4, j: -6, k: 3 },
        { name: "uturn-0.5", i: -6, j: -2, k: 3, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.3", i: -4, j: -4, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 5 },
        { name: "spiral-2.3.3", i: 1, j: 3, k: 5 },
        { name: "ramp-4.1.1", i: -3, j: 3, k: 5, mirrorX: true, mirrorZ: false },
        { name: "wave-4.3.1", i: -3, j: 0, k: 7, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -4, j: 3, k: 5, mirrorX: true, mirrorZ: true },
        { name: "split", i: -2, j: -4, k: 5, mirrorX: false, mirrorZ: false },
        { name: "wave-2.2.1", i: -1, j: -2, k: 5, mirrorX: false, mirrorZ: false },
        { name: "ramp-6.1.1", i: -2, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "flatjoin", i: -3, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -4, j: -2, k: 2, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.3", i: -2, j: -1, k: 2 },
    ],
};
var testNote = {
    balls: [{ x: -0.0037693503651293203, y: 0.1497480616625865, z: 5.551115123125783e-17 }],
    parts: [
        { name: "quarter", i: 4, j: -3, k: 0, mirrorZ: false },
        { name: "quarter", i: 3, j: -4, k: 0, mirrorZ: false },
        { name: "quarter", i: 2, j: -5, k: 0, mirrorZ: false },
        { name: "quarter", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "elevator-10", i: 0, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 5, j: -2, k: 0 },
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
        this.DEBUG_MODE = false;
        this.screenRatio = 1;
        this.cameraMode = CameraMode.None;
        this.menuCameraMode = CameraMode.Ball;
        this.targetCamTarget = BABYLON.Vector3.Zero();
        this.targetCamAlpha = -Math.PI * 0.5;
        this.targetCamBeta = Math.PI * 0.4;
        this.targetCamRadius = 0.3;
        this._trackTargetCamSpeed = 0;
        this.cameraOrtho = false;
        this.mainVolume = 0;
        this.targetTimeFactor = 0.8;
        this.timeFactor = 0.1;
        this.physicDT = 0.0005;
        this.averagedFPS = 0;
        this.updateConfigTimeout = -1;
        this._showGraphicAutoUpdateAlertInterval = 0;
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
        BABYLON.Engine.audioEngine.useCustomUnlockedButton = true;
        window.addEventListener("click", () => {
            if (!BABYLON.Engine.audioEngine.unlocked) {
                BABYLON.Engine.audioEngine.unlock();
            }
        }, { once: true });
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
        if (this.DEBUG_MODE) {
            this.scene.clearColor = BABYLON.Color4.FromHexString("#00ff0000");
        }
        else {
            this.scene.clearColor = BABYLON.Color4.FromHexString("#272B2EFF");
        }
        this.spotLight = new BABYLON.SpotLight("spot-light", new BABYLON.Vector3(0, 0.5, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 1, this.scene);
        this.spotLight.shadowMinZ = 1;
        this.spotLight.shadowMaxZ = 3;
        this.handleMaterial = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterial.diffuseColor.copyFromFloats(0, 0, 0);
        this.handleMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterial.alpha = 1;
        this.ghostMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.ghostMaterial.diffuseColor.copyFromFloats(0.8, 0.8, 1);
        this.ghostMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.ghostMaterial.alpha = 0.3;
        this.gridMaterial = new BABYLON.StandardMaterial("grid-material");
        this.gridMaterial.diffuseColor.copyFromFloats(0, 0, 0);
        this.gridMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.gridMaterial.alpha = this.config.gridOpacity;
        this.cyanMaterial = new BABYLON.StandardMaterial("cyan-material");
        this.cyanMaterial.diffuseColor = BABYLON.Color3.FromHexString("#00FFFF");
        this.cyanMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.redMaterial = new BABYLON.StandardMaterial("red-material");
        this.redMaterial.diffuseColor = BABYLON.Color3.FromHexString("#bf212f");
        this.redMaterial.emissiveColor = BABYLON.Color3.FromHexString("#bf212f");
        this.redMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.greenMaterial = new BABYLON.StandardMaterial("green-material");
        this.greenMaterial.diffuseColor = BABYLON.Color3.FromHexString("#006f3c");
        this.greenMaterial.emissiveColor = BABYLON.Color3.FromHexString("#006f3c");
        this.greenMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.blueMaterial = new BABYLON.StandardMaterial("blue-material");
        this.blueMaterial.diffuseColor = BABYLON.Color3.FromHexString("#264b96");
        this.blueMaterial.emissiveColor = BABYLON.Color3.FromHexString("#264b96");
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
        this.velvetMaterial = new BABYLON.StandardMaterial("velvet-material");
        this.velvetMaterial.diffuseColor.copyFromFloats(0.75, 0.75, 0.75);
        this.velvetMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/velvet.jpg");
        this.velvetMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.logoMaterial = new BABYLON.StandardMaterial("logo-material");
        this.logoMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.logoMaterial.diffuseTexture = new BABYLON.Texture("./datas/icons/logo-white-no-bg.png");
        this.logoMaterial.diffuseTexture.hasAlpha = true;
        this.logoMaterial.useAlphaFromDiffuseTexture = true;
        this.logoMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.logoMaterial.alpha = 0.3;
        this.baseAxisMaterial = new BABYLON.StandardMaterial("logo-material");
        this.baseAxisMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.baseAxisMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/axis.png");
        this.baseAxisMaterial.diffuseTexture.hasAlpha = true;
        this.baseAxisMaterial.useAlphaFromDiffuseTexture = true;
        this.baseAxisMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.woodMaterial = new BABYLON.StandardMaterial("wood-material");
        this.woodMaterial.diffuseColor.copyFromFloats(0.3, 0.3, 0.3);
        //this.woodMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/wood-color.jpg");
        //this.woodMaterial.ambientTexture = new BABYLON.Texture("./datas/textures/wood-ambient-occlusion.jpg");
        //this.woodMaterial.specularTexture = new BABYLON.Texture("./datas/textures/wood-roughness.jpg");
        this.woodMaterial.specularColor.copyFromFloats(0.2, 0.2, 0.2);
        //this.woodMaterial.bumpTexture = new BABYLON.Texture("./datas/textures/wood-normal-2.png");
        this.leatherMaterial = new BABYLON.StandardMaterial("leather-material");
        this.leatherMaterial.diffuseColor.copyFromFloats(0.05, 0.02, 0.02);
        this.leatherMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.whiteMaterial = new BABYLON.StandardMaterial("white-material");
        this.whiteMaterial.diffuseColor.copyFromFloats(0.9, 0.95, 1).scaleInPlace(0.9);
        this.whiteMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.deepBlackMaterial = new BABYLON.StandardMaterial("deep-black-material");
        this.deepBlackMaterial.diffuseColor.copyFromFloats(0, 0, 0.);
        this.deepBlackMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.paintingLight = new BABYLON.StandardMaterial("autolit-material");
        this.paintingLight.diffuseColor.copyFromFloats(1, 1, 1);
        this.paintingLight.emissiveTexture = new BABYLON.Texture("./datas/textures/painting-light.png");
        this.paintingLight.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.skybox = BABYLON.MeshBuilder.CreateSphere("skyBox", { diameter: 20, sideOrientation: BABYLON.Mesh.BACKSIDE }, this.scene);
        this.skybox.layerMask = 0x10000000;
        let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new BABYLON.Texture("./datas/skyboxes/city_night_low_res.png");
        skyboxMaterial.diffuseTexture = skyTexture;
        skyboxMaterial.diffuseColor.copyFromFloats(0.25, 0.25, 0.25);
        skyboxMaterial.emissiveColor.copyFromFloats(0.25, 0.25, 0.25);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.skybox.material = skyboxMaterial;
        this.skybox.rotation.y = 0.16 * Math.PI;
        this.camera = new BABYLON.ArcRotateCamera("camera", this.targetCamAlpha, this.targetCamBeta, this.targetCamRadius, this.targetCamTarget.clone());
        this.camera.minZ = 0.01;
        this.camera.maxZ = 25;
        this.camera.upperBetaLimit = Math.PI * 0.5;
        this.camera.lowerRadiusLimit = 0.05;
        this.camera.upperRadiusLimit = 2;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 4000;
        this.camera.panningInertia *= 0.5;
        this.camera.angularSensibilityX = 2000;
        this.camera.angularSensibilityY = 2000;
        this.camera.pinchPrecision = 5000;
        this.updateCameraLayer();
        this.updateShadowGenerator();
        if (this.DEBUG_MODE) {
            if (window.localStorage.getItem("camera-target")) {
                let target = JSON.parse(window.localStorage.getItem("camera-target"));
                this.camera.target.x = target.x;
                this.camera.target.y = target.y;
                this.camera.target.z = target.z;
            }
            if (window.localStorage.getItem("camera-position")) {
                let positionItem = JSON.parse(window.localStorage.getItem("camera-position"));
                let position = new BABYLON.Vector3(positionItem.x, positionItem.y, positionItem.z);
                this.camera.setPosition(position);
            }
        }
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
        if (this.config.graphicQ > 1) {
            this.room = new Room(this);
        }
        this.machine = new Machine(this);
        this.machineEditor = new MachineEditor(this);
        if (this.DEBUG_MODE) {
            this.machine.deserialize(nested);
        }
        else {
            this.machine.deserialize(simpleLoop);
        }
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
        await this.machine.generateBaseMesh();
        await this.machine.instantiate();
        if (this.room) {
            await this.room.instantiate();
        }
        let demos = [simpleLoop, demo1, demoLoops, demo3, largeTornado, deathLoop, popopo, aerial];
        let container = document.getElementById("main-menu");
        let demoButtons = container.querySelectorAll(".panel.demo");
        for (let i = 0; i < demoButtons.length; i++) {
            let demo = demos[i];
            if (demo) {
                let buttonDemo = demoButtons[i];
                buttonDemo.onclick = async () => {
                    this.machine.dispose();
                    this.machine.deserialize(demo);
                    await this.machine.generateBaseMesh();
                    await this.machine.instantiate();
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
        if (this.DEBUG_MODE) {
            await this.setPageMode(GameMode.CreateMode);
        }
        else {
            await this.setPageMode(GameMode.MainMenu);
        }
        this.machine.play();
        document.addEventListener("keydown", async (event) => {
            //await this.makeScreenshot("join");
            //await this.makeScreenshot("split");
            if (event.code === "KeyP") {
                //await this.makeScreenshot("spiral-1.2.1");
                await this.makeScreenshot("wall-4.2");
                let e = document.getElementById("screenshot-frame");
                if (e.style.display != "block") {
                    e.style.display = "block";
                }
                else {
                    this.makeCircuitScreenshot();
                }
                /*
                for (let i = 0; i < TrackNames.length; i++) {
                    let trackname = TrackNames[i];
                    await this.makeScreenshot(trackname);
                }
                */
            }
        });
        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("wheel", this.onWheelEvent);
        if (this.DEBUG_MODE) {
            setInterval(() => {
                let triCount = this.machine.parts.map(part => { return part.getTriCount(); }).reduce((t1, t2) => { return t1 + t2; });
                triCount += this.machine.parts.map(ball => { return ball.getIndices().length / 3; }).reduce((b1, b2) => { return b1 + b2; });
                console.log("global machin tricount " + triCount);
            }, 3000);
        }
    }
    animate() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();
        });
        window.onresize = () => {
            this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
            this.engine.resize();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
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
        if (this.DEBUG_MODE) {
            let camPos = this.camera.position;
            let camTarget = this.camera.target;
            window.localStorage.setItem("camera-position", JSON.stringify({ x: camPos.x, y: camPos.y, z: camPos.z }));
            window.localStorage.setItem("camera-target", JSON.stringify({ x: camTarget.x, y: camTarget.y, z: camTarget.z }));
        }
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
                    this.targetCamBeta = 0.15 * Math.PI + Math.random() * Math.PI * 0.35;
                }
            }
        }
        this.camera.target.x = Nabu.MinMax(this.camera.target.x, this.machine.baseMeshMinX, this.machine.baseMeshMaxX);
        this.camera.target.y = Nabu.MinMax(this.camera.target.y, this.machine.baseMeshMinY, this.machine.baseMeshMaxY);
        this.camera.target.z = Nabu.MinMax(this.camera.target.z, this.machine.baseMeshMinZ, this.machine.baseMeshMaxZ);
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
        if (isFinite(fps)) {
            if (fps < 30 && this.timeFactor > this.targetTimeFactor / 2) {
                this.timeFactor *= 0.9;
            }
            else {
                this.timeFactor = this.timeFactor * 0.9 + this.targetTimeFactor * 0.1;
            }
            if (this.config.autoGraphicQ && (this.mode === GameMode.MainMenu || this.mode === GameMode.DemoMode)) {
                this.averagedFPS = 0.95 * this.averagedFPS + 0.05 * fps;
                if (this.averagedFPS < 30 && this.config.graphicQ > 1) {
                    if (this.updateConfigTimeout === -1) {
                        this.updateConfigTimeout = setTimeout(() => {
                            if (this.config.autoGraphicQ && (this.mode === GameMode.MainMenu || this.mode === GameMode.DemoMode)) {
                                let newConfig = this.config.graphicQ - 1;
                                this.config.setGraphicQ(newConfig);
                                this.showGraphicAutoUpdateAlert();
                            }
                            this.updateConfigTimeout = -1;
                        }, 3000);
                    }
                }
                else if (this.averagedFPS > 55 && this.config.graphicQ < 3) {
                    if (this.updateConfigTimeout === -1) {
                        this.updateConfigTimeout = setTimeout(() => {
                            if (this.config.autoGraphicQ && (this.mode === GameMode.MainMenu || this.mode === GameMode.DemoMode)) {
                                let newConfig = this.config.graphicQ + 1;
                                this.config.setGraphicQ(newConfig);
                                this.showGraphicAutoUpdateAlert();
                            }
                            this.updateConfigTimeout = -1;
                        }, 3000);
                    }
                }
                else {
                    clearTimeout(this.updateConfigTimeout);
                    this.updateConfigTimeout = -1;
                }
            }
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
        this.machine.regenerateBaseAxis();
    }
    async makeScreenshot(objectName) {
        this.machine.setBaseIsVisible(false);
        this.skybox.isVisible = false;
        if (this.room) {
            this.room.ground.position.y = 100;
        }
        this.scene.clearColor = BABYLON.Color4.FromHexString("#272B2EFF");
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
                    let mirrorX = false;
                    if (objectName.startsWith("wall")) {
                        mirrorX = true;
                    }
                    track = this.machine.trackFactory.createTrack(objectName, 0, 0, 0, mirrorX);
                    this.camera.radius = 0.25 + Math.max(0.15 * (track.w - 1), 0);
                    this.camera.target.copyFromFloats(tileWidth * ((track.w - 1) * 0.55), -tileHeight * (track.h) * 0.5, 0);
                }
                if (objectName.startsWith("spiral") || objectName.startsWith("wall")) {
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
        this.machine.setBaseIsVisible(false);
        this.skybox.isVisible = false;
        if (this.room) {
            this.room.ground.position.y = 100;
        }
        this.scene.clearColor.copyFromFloats(0, 0, 0, 0);
        return new Promise(resolve => {
            requestAnimationFrame(async () => {
                await Mummu.MakeScreenshot({ miniatureName: "circuit", size: 512, outlineWidth: 2 });
                this.machine.setBaseIsVisible(true);
                this.skybox.isVisible = true;
                this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
                resolve();
            });
        });
    }
    updateCameraLayer() {
        if (this.camera) {
            if (this.horizontalBlur) {
                this.horizontalBlur.dispose();
            }
            if (this.verticalBlur) {
                this.verticalBlur.dispose();
            }
            if (this.camBackGround) {
                this.camBackGround.dispose();
            }
            if (this.config.graphicQ > 1) {
                this.camBackGround = new BABYLON.FreeCamera("background-camera", BABYLON.Vector3.Zero());
                this.camBackGround.parent = this.camera;
                this.camBackGround.layerMask = 0x10000000;
                this.scene.activeCameras = [this.camBackGround, this.camera];
                this.horizontalBlur = new BABYLON.BlurPostProcess("blurH", new BABYLON.Vector2(1, 0), 16, 1, this.camBackGround);
                this.verticalBlur = new BABYLON.BlurPostProcess("blurV", new BABYLON.Vector2(0, 1), 16, 1, this.camBackGround);
            }
            else {
                this.scene.activeCameras = [this.camera];
            }
        }
    }
    updateShadowGenerator() {
        if (this.camera) {
            if (this.config.graphicQ > 2 && !this.shadowGenerator) {
                this.shadowGenerator = new BABYLON.ShadowGenerator(2048, this.spotLight);
                this.shadowGenerator.useBlurExponentialShadowMap = true;
                this.shadowGenerator.depthScale = 0.01;
                this.shadowGenerator.blurScale = 1;
                this.shadowGenerator.useKernelBlur = true;
                this.shadowGenerator.blurKernel = 4;
                this.shadowGenerator.setDarkness(0.8);
            }
            else {
                if (this.shadowGenerator) {
                    this.shadowGenerator.dispose();
                    delete this.shadowGenerator;
                }
            }
        }
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
                    this.targetCamRadius = size * 0.7;
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
    showGraphicAutoUpdateAlert() {
        let alert = document.getElementById("auto-update-graphic-alert");
        if (this.config.graphicQ === 1) {
            alert.innerText = "Graphic Quality set to LOW";
        }
        else if (this.config.graphicQ === 2) {
            alert.innerText = "Graphic Quality set to MEDIUM";
        }
        else if (this.config.graphicQ === 3) {
            alert.innerText = "Graphic Quality set to HIGH";
        }
        alert.style.opacity = "0";
        alert.style.display = "block";
        clearInterval(this._showGraphicAutoUpdateAlertInterval);
        let n = 0;
        this._showGraphicAutoUpdateAlertInterval = setInterval(() => {
            n++;
            if (n <= 100) {
                alert.style.opacity = n + "%";
            }
            else {
                clearInterval(this._showGraphicAutoUpdateAlertInterval);
                n = 100;
                this._showGraphicAutoUpdateAlertInterval = setInterval(() => {
                    n--;
                    if (n > 0) {
                        alert.style.opacity = n + "%";
                    }
                    else {
                        alert.style.opacity = "0";
                        alert.style.display = "none";
                        clearInterval(this._showGraphicAutoUpdateAlertInterval);
                    }
                }, 75);
            }
        }, 8);
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
        let n = 3;
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
        this.margin = 0.05;
        this.baseMeshMinX = -this.margin;
        this.baseMeshMaxX = this.margin;
        this.baseMeshMinY = -this.margin;
        this.baseMeshMaxY = this.margin;
        this.baseMeshMinZ = -this.margin;
        this.baseMeshMaxZ = this.margin;
        this.requestUpdateShadow = false;
        this.trackFactory = new MachinePartFactory(this);
        this.templateManager = new TemplateManager(this);
    }
    async instantiate() {
        this.parts = this.parts.sort((a, b) => { return b.j - a.j; });
        for (let i = 0; i < this.parts.length; i++) {
            await this.parts[i].instantiate();
            await Nabu.Wait(1);
        }
        for (let i = 0; i < this.balls.length; i++) {
            await this.balls[i].instantiate();
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
        if (this.requestUpdateShadow) {
            this.updateShadow();
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
                this.balls[i].marbleLoopSound.setVolume(0, 0.1);
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
        this.baseMeshMinX = -this.margin;
        this.baseMeshMaxX = this.margin;
        this.baseMeshMinY = -this.margin;
        this.baseMeshMaxY = this.margin;
        this.baseMeshMinZ = -this.margin;
        this.baseMeshMaxZ = this.margin;
        for (let i = 0; i < this.parts.length; i++) {
            let track = this.parts[i];
            this.baseMeshMinX = Math.min(this.baseMeshMinX, track.position.x - tileWidth * 0.5);
            this.baseMeshMaxX = Math.max(this.baseMeshMaxX, track.position.x + tileWidth * (track.w - 0.5));
            this.baseMeshMinY = Math.min(this.baseMeshMinY, track.position.y - tileHeight * (track.h + 1));
            this.baseMeshMaxY = Math.max(this.baseMeshMaxY, track.position.y);
            this.baseMeshMinZ = Math.min(this.baseMeshMinZ, track.position.z - tileDepth * (track.d - 0.5));
            this.baseMeshMaxZ = Math.max(this.baseMeshMaxZ, track.position.z);
        }
        if (false) {
            let w = this.baseMeshMaxX - this.baseMeshMinX;
            let h = this.baseMeshMaxY - this.baseMeshMinY;
            let u = w * 4;
            let v = h * 4;
            if (this.baseWall) {
                this.baseWall.dispose();
            }
            this.baseWall = BABYLON.MeshBuilder.CreatePlane("base-wall", { width: h + 2 * this.margin, height: w + 2 * this.margin, sideOrientation: BABYLON.Mesh.DOUBLESIDE, frontUVs: new BABYLON.Vector4(0, 0, v, u) });
            this.baseWall.position.x = (this.baseMeshMaxX + this.baseMeshMinX) * 0.5;
            this.baseWall.position.y = (this.baseMeshMaxY + this.baseMeshMinY) * 0.5;
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
                    positions[3 * i] += w * 0.5 - 0.01 + this.margin;
                }
                else if (x < 0) {
                    positions[3 * i] -= w * 0.5 - 0.01 + this.margin;
                }
                if (y > 0) {
                    positions[3 * i + 1] += h * 0.5 - 0.01 + this.margin;
                }
                else if (y < 0) {
                    positions[3 * i + 1] -= h * 0.5 - 0.01 + this.margin;
                }
            }
            data.positions = positions;
            data.applyToMesh(this.baseFrame);
        }
        else {
            let w = this.baseMeshMaxX - this.baseMeshMinX;
            let h = 1;
            let d = this.baseMeshMaxZ - this.baseMeshMinZ;
            if (this.baseFrame) {
                this.baseFrame.dispose();
            }
            this.baseFrame = new BABYLON.Mesh("base-stand");
            this.baseFrame.position.x = (this.baseMeshMaxX + this.baseMeshMinX) * 0.5;
            this.baseFrame.position.y = this.baseMeshMinY;
            this.baseFrame.position.z = (this.baseMeshMaxZ + this.baseMeshMinZ) * 0.5;
            this.baseFrame.material = this.game.whiteMaterial;
            let vertexDatas = await this.game.vertexDataLoader.get("./meshes/museum-stand.babylon");
            let data = Mummu.CloneVertexData(vertexDatas[0]);
            let positions = [...data.positions];
            for (let i = 0; i < positions.length / 3; i++) {
                let x = positions[3 * i];
                let z = positions[3 * i + 2];
                if (x > 0) {
                    positions[3 * i] += w * 0.5 - 0.5 + this.margin;
                }
                else if (x < 0) {
                    positions[3 * i] -= w * 0.5 - 0.5 + this.margin;
                }
                if (z > 0) {
                    positions[3 * i + 2] += d * 0.5 - 0.5 + this.margin;
                }
                else if (z < 0) {
                    positions[3 * i + 2] -= d * 0.5 - 0.5 + this.margin;
                }
            }
            data.positions = positions;
            data.applyToMesh(this.baseFrame);
            if (this.baseWall) {
                this.baseWall.dispose();
            }
            this.baseWall = new BABYLON.Mesh("base-top");
            this.baseWall.receiveShadows = true;
            this.baseWall.position.x = (this.baseMeshMaxX + this.baseMeshMinX) * 0.5;
            this.baseWall.position.y = this.baseMeshMinY;
            this.baseWall.position.z = (this.baseMeshMaxZ + this.baseMeshMinZ) * 0.5;
            this.baseWall.material = this.game.velvetMaterial;
            data = Mummu.CloneVertexData(vertexDatas[1]);
            let uvs = [];
            positions = [...data.positions];
            for (let i = 0; i < positions.length / 3; i++) {
                let x = positions[3 * i];
                let z = positions[3 * i + 2];
                if (x > 0) {
                    positions[3 * i] += w * 0.5 - 0.5 + this.margin;
                }
                else if (x < 0) {
                    positions[3 * i] -= w * 0.5 - 0.5 + this.margin;
                }
                if (z > 0) {
                    positions[3 * i + 2] += d * 0.5 - 0.5 + this.margin;
                }
                else if (z < 0) {
                    positions[3 * i + 2] -= d * 0.5 - 0.5 + this.margin;
                }
                uvs.push(positions[3 * i] * 2);
                uvs.push(positions[3 * i + 2] * 2);
            }
            data.positions = positions;
            data.uvs = uvs;
            data.applyToMesh(this.baseWall);
            if (this.baseLogo) {
                this.baseLogo.dispose();
            }
            this.baseLogo = new BABYLON.Mesh("base-logo");
            this.baseLogo.position.x = (this.baseMeshMaxX + this.baseMeshMinX) * 0.5;
            this.baseLogo.position.y = this.baseMeshMinY + 0.0001;
            this.baseLogo.position.z = (this.baseMeshMaxZ + this.baseMeshMinZ) * 0.5;
            let w05 = w * 0.5;
            let d05 = d * 0.5;
            let logoW = Math.max(w * 0.3, 0.1);
            let logoH = logoW / 794 * 212;
            let corner1Data = Mummu.CreateQuadVertexData({
                p1: new BABYLON.Vector3(w05 - logoW, 0, -d05),
                p2: new BABYLON.Vector3(w05, 0, -d05),
                p3: new BABYLON.Vector3(w05, 0, -d05 + logoH),
                p4: new BABYLON.Vector3(w05 - logoW, 0, -d05 + logoH)
            });
            Mummu.TranslateVertexDataInPlace(corner1Data, new BABYLON.Vector3(this.margin - 0.02, 0, -this.margin + 0.02));
            let corner2Data = Mummu.CreateQuadVertexData({
                p1: new BABYLON.Vector3(-w05 + logoW, 0, d05),
                p2: new BABYLON.Vector3(-w05, 0, d05),
                p3: new BABYLON.Vector3(-w05, 0, d05 - logoH),
                p4: new BABYLON.Vector3(-w05 + logoW, 0, d05 - logoH)
            });
            Mummu.TranslateVertexDataInPlace(corner2Data, new BABYLON.Vector3(-this.margin + 0.02, 0, this.margin - 0.02));
            Mummu.MergeVertexDatas(corner1Data, corner2Data).applyToMesh(this.baseLogo);
            this.baseLogo.material = this.game.logoMaterial;
            this.regenerateBaseAxis();
        }
        if (this.game.room) {
            this.game.room.setGroundHeight(this.baseMeshMinY - 0.8);
        }
        this.game.spotLight.position.y = this.baseMeshMinY + 2.2;
        let dir = new BABYLON.Vector3((this.baseMeshMinX + this.baseMeshMaxX) * 0.5, -3, (this.baseMeshMinZ + this.baseMeshMaxZ) * 0.5).normalize();
        this.game.spotLight.direction = dir;
    }
    regenerateBaseAxis() {
        if (this.baseAxis) {
            this.baseAxis.dispose();
        }
        if (this.game.mode === GameMode.CreateMode) {
            let w = this.baseMeshMaxX - this.baseMeshMinX;
            let d = this.baseMeshMaxZ - this.baseMeshMinZ;
            let w05 = w * 0.5;
            let d05 = d * 0.5;
            let s = Math.min(w05, d05) * 0.9;
            this.baseAxis = new BABYLON.Mesh("base-logo");
            let axisSquareData = Mummu.CreateQuadVertexData({
                p1: new BABYLON.Vector3(-s, 0, -s),
                p2: new BABYLON.Vector3(s, 0, -s),
                p3: new BABYLON.Vector3(s, 0, s),
                p4: new BABYLON.Vector3(-s, 0, s)
            });
            axisSquareData.applyToMesh(this.baseAxis);
            this.baseAxis.position.x = (this.baseMeshMaxX + this.baseMeshMinX) * 0.5;
            this.baseAxis.position.y = this.baseMeshMinY + 0.0001;
            this.baseAxis.position.z = (this.baseMeshMaxZ + this.baseMeshMinZ) * 0.5;
            this.baseAxis.material = this.game.baseAxisMaterial;
        }
    }
    setBaseIsVisible(v) {
        if (this.baseFrame) {
            this.baseFrame.isVisible = v;
        }
        if (this.baseWall) {
            this.baseWall.isVisible = v;
        }
        if (this.baseLogo) {
            this.baseLogo.isVisible = v;
        }
        if (this.baseAxis) {
            this.baseAxis.isVisible = v;
        }
    }
    getBankAt(pos, exclude) {
        for (let i = 0; i < this.parts.length; i++) {
            let part = this.parts[i];
            if (part != exclude) {
                for (let j = 0; j < part.tracks.length; j++) {
                    let track = part.tracks[j];
                    if (BABYLON.Vector3.DistanceSquared(track.startWorldPosition, pos) < 0.000001) {
                        return { isEnd: false, bank: track.preferedStartBank, part: part };
                    }
                    if (BABYLON.Vector3.DistanceSquared(track.endWorldPosition, pos) < 0.000001) {
                        return { isEnd: true, bank: track.preferedEndBank, part: part };
                    }
                }
            }
        }
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
            if (track) {
                this.parts.push(track);
            }
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
    updateShadow() {
        if (this.game.shadowGenerator) {
            this.parts = this.parts.sort((a, b) => { return b.j - a.j; });
            this.game.shadowGenerator.getShadowMapForRendering().renderList = [];
            for (let i = 0; i < 20; i++) {
                if (i < this.parts.length) {
                    this.game.shadowGenerator.addShadowCaster(this.parts[i], true);
                }
            }
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
var radius = 0.014 * 1.5 / 2;
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
    constructor(machine, _i, _j, _k, isPlaced = true) {
        super("track", machine.game.scene);
        this.machine = machine;
        this._i = _i;
        this._j = _j;
        this._k = _k;
        this.isPlaced = isPlaced;
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
        this.neighbours = new Nabu.UniqueList();
        this._partVisibilityMode = PartVisibilityMode.Default;
        this.position.x = this._i * tileWidth;
        this.position.y = -this._j * tileHeight;
        this.position.z = -this._k * tileDepth;
        this.tracks = [new Track(this)];
    }
    get partName() {
        return this.template ? this.template.partName : "machine-part-no-template";
    }
    get game() {
        return this.machine.game;
    }
    addNeighbour(other) {
        this.neighbours.push(other);
        other.neighbours.push(this);
    }
    removeNeighbour(other) {
        this.neighbours.remove(other);
        other.neighbours.remove(this);
    }
    removeAllNeighbours() {
        while (this.neighbours.length > 0) {
            this.removeNeighbour(this.neighbours.get(0));
        }
    }
    get w() {
        return this.template.w;
    }
    get h() {
        return this.template.h;
    }
    get d() {
        return this.template.d;
    }
    get n() {
        return this.template.n;
    }
    get mirrorX() {
        return this.template.mirrorX;
    }
    get mirrorZ() {
        return this.template.mirrorZ;
    }
    get xExtendable() {
        return this.template.xExtendable;
    }
    get yExtendable() {
        return this.template.yExtendable;
    }
    get zExtendable() {
        return this.template.zExtendable;
    }
    get nExtendable() {
        return this.template.nExtendable;
    }
    get minH() {
        return this.template.minH;
    }
    get minD() {
        return this.template.minD;
    }
    get maxD() {
        return this.template.maxD;
    }
    get xMirrorable() {
        return this.template.xMirrorable;
    }
    get zMirrorable() {
        return this.template.zMirrorable;
    }
    get hasOriginDestinationHandles() {
        return this.template.hasOriginDestinationHandles;
    }
    get template() {
        return this._template;
    }
    setTemplate(template) {
        this._template = template;
    }
    get i() {
        return this._i;
    }
    setI(v) {
        if (this._i != v) {
            this._i = v;
            this.position.x = this._i * tileWidth;
            this.isPlaced = true;
            this.freezeWorldMatrix();
            if (this.sleepersMesh) {
                this.sleepersMesh.freezeWorldMatrix();
            }
            this.machine.requestUpdateShadow = true;
        }
    }
    get j() {
        return this._j;
    }
    setJ(v) {
        if (this._j != v) {
            this._j = v;
            this.position.y = -this._j * tileHeight;
            this.isPlaced = true;
            this.freezeWorldMatrix();
            if (this.sleepersMesh) {
                this.sleepersMesh.freezeWorldMatrix();
            }
            this.machine.requestUpdateShadow = true;
        }
    }
    get k() {
        return this._k;
    }
    setK(v) {
        if (this._k != v) {
            this._k = v;
            this.position.z = -this._k * tileDepth;
            this.isPlaced = true;
            this.freezeWorldMatrix();
            if (this.sleepersMesh) {
                this.sleepersMesh.freezeWorldMatrix();
            }
            this.machine.requestUpdateShadow = true;
        }
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
        this.encloseMesh.visibility = 1;
    }
    unselect() {
        this.selectorMesh.visibility = 0;
        this.encloseMesh.visibility = 0;
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
    getBarycenter() {
        if (this.tracks[0].template.trackpoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.tracks[0].template.trackpoints.map(trackpoint => {
            return trackpoint.position;
        }).reduce((pos1, pos2) => {
            return pos1.add(pos2);
        }).scaleInPlace(1 / this.tracks[0].template.trackpoints.length);
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
    async instantiate(rebuildNeighboursWireMeshes) {
        if (this.sleepersMesh) {
            this.sleepersMesh.dispose();
        }
        this.sleepersMesh = new BABYLON.Mesh("sleepers-mesh");
        this.sleepersMesh.material = this.game.steelMaterial;
        this.sleepersMesh.parent = this;
        let datas = [];
        for (let n = 0; n < this.tracks.length; n++) {
            let points = [...this.tracks[n].templateInterpolatedPoints].map(p => { return p.clone(); });
            Mummu.DecimatePathInPlace(points, 10 / 180 * Math.PI);
            let dirStart = points[1].subtract(points[0]).normalize();
            let dirEnd = points[points.length - 1].subtract(points[points.length - 2]).normalize();
            points[0].subtractInPlace(dirStart.scale(this.wireGauge * 0.5));
            points[points.length - 1].addInPlace(dirEnd.scale(this.wireGauge * 0.5));
            let tmp = BABYLON.ExtrudeShape("wire", { shape: selectorHullShape, path: this.tracks[n].templateInterpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
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
        this.rebuildWireMeshes(rebuildNeighboursWireMeshes);
        this.AABBMin.copyFromFloats(this.encloseStart.x, this.encloseEnd.y, this.encloseEnd.z);
        this.AABBMax.copyFromFloats(this.encloseEnd.x, this.encloseStart.y, this.encloseStart.z);
        this.AABBMin.addInPlace(this.position);
        this.AABBMax.addInPlace(this.position);
        this.freezeWorldMatrix();
        this.machine.requestUpdateShadow = true;
    }
    dispose() {
        super.dispose();
        this.removeAllNeighbours();
        let index = this.machine.parts.indexOf(this);
        if (index > -1) {
            this.machine.parts.splice(index, 1);
        }
    }
    generateWires() {
        this.allWires = [...this.wires];
        if (this.template) {
            for (let i = 0; i < this.template.trackTemplates.length; i++) {
                let track = this.tracks[i];
                if (!track) {
                    track = new Track(this);
                    this.tracks[i] = track;
                }
                track.initialize(this.template.trackTemplates[i]);
                this.allWires.push(track.wires[0], track.wires[1]);
            }
        }
        else {
            console.error("Can't generate wires, no template provided for " + this.partName);
            console.log(this);
        }
    }
    update(dt) { }
    rebuildWireMeshes(rebuildNeighboursWireMeshes) {
        if (this.renderOnlyPath) {
            let n = 8;
            let shape = [];
            for (let i = 0; i < n; i++) {
                let a = i / n * 2 * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                shape[i] = new BABYLON.Vector3(cosa * this.wireSize * 0.5, sina * this.wireSize * 0.5, 0);
            }
            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.tracks[0].templateInterpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let vertexData = BABYLON.VertexData.ExtractFromMesh(tmp);
            vertexData.applyToMesh(this.sleepersMesh);
            tmp.dispose();
            this.allWires.forEach(wire => {
                wire.hide();
            });
        }
        else {
            let neighboursToUpdate;
            if (rebuildNeighboursWireMeshes) {
                neighboursToUpdate = this.neighbours.cloneAsArray();
                for (let i = 0; i < neighboursToUpdate.length; i++) {
                    neighboursToUpdate[i].rebuildWireMeshes();
                }
            }
            this.allWires.forEach(wire => {
                wire.show();
            });
            this.removeAllNeighbours();
            this.tracks.forEach(track => {
                if (track.template) {
                    track.recomputeWiresPath();
                    track.recomputeAbsolutePath();
                }
                track.wires.forEach(wire => {
                    wire.instantiate();
                });
            });
            this.wires.forEach(wire => {
                wire.instantiate();
            });
            requestAnimationFrame(() => {
                if (!this.sleepersMesh.isDisposed()) {
                    SleeperMeshBuilder.GenerateSleepersVertexData(this, { drawGroundAnchors: true, groundAnchorsRelativeMaxY: 0.6 }).applyToMesh(this.sleepersMesh);
                    this.sleepersMesh.freezeWorldMatrix();
                    this.machine.requestUpdateShadow = true;
                    if (this.game.DEBUG_MODE) {
                        console.log(this.partName + " tricount " + this.getTriCount());
                    }
                }
            });
            if (rebuildNeighboursWireMeshes) {
                neighboursToUpdate = this.neighbours.cloneAsArray();
                for (let i = 0; i < neighboursToUpdate.length; i++) {
                    neighboursToUpdate[i].rebuildWireMeshes();
                }
            }
        }
        this.freezeWorldMatrix();
        this.machine.requestUpdateShadow = true;
    }
    getTriCount() {
        let triCount = this.getIndices().length / 3;
        let children = this.getChildMeshes();
        children.forEach(child => {
            triCount += child.getIndices().length / 3;
        });
        return triCount;
    }
}
var TrackNames = [
    "ramp-1.1.1",
    "wave-2.1.1",
    "snake-2.1.1",
    "join",
    "flatjoin",
    "split",
    "uturn-0.2",
    "wall-4.2",
    "uturnsharp",
    "loop-1.1",
    "spiral-1.2.1",
    "elevator-4"
];
class MachinePartFactory {
    constructor(machine) {
        this.machine = machine;
    }
    createTrackWHDN(trackname, props) {
        if (!props) {
            props = {};
        }
        trackname = trackname.split("-")[0];
        let whd = "";
        if (isFinite(props.w)) {
            whd += props.w.toFixed(0) + ".";
        }
        if (isFinite(props.h)) {
            whd += props.h.toFixed(0) + ".";
        }
        if (isFinite(props.d)) {
            whd += props.d.toFixed(0) + ".";
        }
        if (isFinite(props.n)) {
            whd += props.n.toFixed(0) + ".";
        }
        whd = whd.substring(0, whd.length - 1);
        trackname += "-" + whd;
        console.log(trackname);
        return this.createTrack(trackname, props.i, props.j, props.k, props.mirrorX, props.mirrorZ);
    }
    createTrack(trackname, i, j, k = 0, mirrorX, mirrorZ) {
        if (trackname.startsWith("ramp-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Ramp(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("wave-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Wave(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("snake-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Snake(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("uturn-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            if (isFinite(h) && isFinite(d)) {
                return new UTurn(this.machine, i, j, k, h, d, mirrorX, mirrorZ);
            }
        }
        if (trackname.startsWith("wall-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            if (isFinite(h) && isFinite(d)) {
                return new Wall(this.machine, i, j, k, h, d, mirrorX);
            }
        }
        if (trackname === "uturnsharp") {
            return new UTurnSharp(this.machine, i, j, k, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("loop-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            let n = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Loop(this.machine, i, j, k, w, d, n, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("spiral-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let n = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Spiral(this.machine, i, j, k, w, h, n, mirrorX, mirrorZ);
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
        if (trackname === "quarter") {
            return new QuarterNote(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "double") {
            return new DoubleNote(this.machine, i, j, k, mirrorX);
        }
    }
}
class SleeperMeshBuilder {
    static GenerateSleepersVertexData(part, props) {
        if (!isFinite(props.spacing)) {
            props.spacing = 0.03;
        }
        if (!isFinite(props.groundAnchorsRelativeMaxY)) {
            props.groundAnchorsRelativeMaxY = 1;
        }
        let q = part.game.config.graphicQ;
        let partialsDatas = [];
        for (let j = 0; j < part.tracks.length; j++) {
            let interpolatedPoints = part.tracks[j].templateInterpolatedPoints;
            let summedLength = [0];
            for (let i = 1; i < interpolatedPoints.length; i++) {
                let prev = interpolatedPoints[i - 1];
                let trackpoint = interpolatedPoints[i];
                let dist = BABYLON.Vector3.Distance(prev, trackpoint);
                summedLength[i] = summedLength[i - 1] + dist;
            }
            let count = Math.round(summedLength[summedLength.length - 1] / props.spacing / 3) * 3;
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
                    let up = part.tracks[j].trackInterpolatedNormals[i];
                    Mummu.QuaternionFromYZAxisToRef(up, dir, quat);
                    let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), quat, t);
                    for (let j = 0; j < path.length; j++) {
                        BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
                    }
                    let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                    tmp.dispose();
                    if (props.drawWallAnchors) {
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
                    }
                    if (props.drawGroundAnchors) {
                        if ((n - 1.5) % 6 === 0 && up.y > 0.1) {
                            let anchor = path[nPath / 2];
                            let anchorYWorld = anchor.y + part.position.y;
                            let anchorBase = anchor.clone();
                            let minY = part.machine.baseMeshMinY;
                            let maxY = part.machine.baseMeshMaxY;
                            anchorBase.y = part.machine.baseMeshMinY - part.position.y;
                            if (anchorYWorld < minY + props.groundAnchorsRelativeMaxY * (maxY - minY)) {
                                let rayOrigin = anchor.add(part.position);
                                let rayDir = new BABYLON.Vector3(0, -1, 0);
                                rayOrigin.addInPlace(rayDir.scale(0.05));
                                let ray = new BABYLON.Ray(rayOrigin, rayDir, 3);
                                let pick = part.game.scene.pickWithRay(ray, (m => { return m instanceof MachinePartSelectorMesh; }));
                                if (!pick.hit) {
                                    let fixationPath = [anchor, anchorBase];
                                    let tmp = BABYLON.ExtrudeShape("tmp", { shape: shape, path: fixationPath, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                                    tmp.dispose();
                                    let tmpVertexData = BABYLON.CreateCylinderVertexData({ height: 0.002, diameter: 0.008, tessellation: 8 });
                                    Mummu.TranslateVertexDataInPlace(tmpVertexData, anchorBase);
                                    partialsDatas.push(tmpVertexData);
                                    tmp.dispose();
                                }
                            }
                        }
                    }
                    n++;
                }
            }
        }
        return Mummu.MergeVertexDatas(...partialsDatas);
    }
}
class TrackTemplate {
    constructor(partTemplate) {
        this.partTemplate = partTemplate;
        this.trackpoints = [] = [];
        this.interpolatedPoints = [];
        this.interpolatedNormals = [];
        this.angles = [];
        this.drawStartTip = false;
        this.drawEndTip = false;
        this.preferedStartBank = 0;
        this.preferedEndBank = 0;
        this.summedLength = [0];
        this.totalLength = 0;
        this.globalSlope = 0;
        this.AABBMin = BABYLON.Vector3.Zero();
        this.AABBMax = BABYLON.Vector3.Zero();
    }
    mirrorXTrackPointsInPlace() {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.x *= -1;
            this.trackpoints[i].position.x += (this.partTemplate.w - 1) * tileWidth;
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
            this.trackpoints[i].position.z += (this.partTemplate.d - 1) * tileDepth * 0.5;
            this.trackpoints[i].position.z *= -1;
            this.trackpoints[i].position.z -= (this.partTemplate.d - 1) * tileDepth * 0.5;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.z *= -1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.z *= -1;
            }
        }
    }
    initialize() {
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
            if (this.onNormalEvaluated) {
                this.onNormalEvaluated(n, point, i / (this.interpolatedPoints.length - 1));
            }
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
            if (this.onNormalEvaluated) {
                this.onNormalEvaluated(n, point, i / (this.interpolatedPoints.length - 1));
            }
            normalsBackward[i] = n;
        }
        normalsBackward[0] = this.trackpoints[0].normal;
        for (let i = 0; i < N; i++) {
            let f = i / (N - 1);
            this.interpolatedNormals[i] = BABYLON.Vector3.Lerp(normalsForward[i], normalsBackward[i], f).normalize();
        }
        let maxR = 0;
        this.angles = [this.preferedStartBank];
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
            if (Math.abs(a) < Math.PI * 0.9999999) {
                let sign = Math.sign(a);
                let rPrev = Math.tan(Math.abs(a) / 2) * (dPrev * 0.5);
                let rNext = Math.tan(Math.abs(a) / 2) * (dNext * 0.5);
                let r = (rPrev + rNext) * 0.5;
                maxR = Math.max(r, maxR);
                let f = 0.06 / r;
                f = Math.max(Math.min(f, 1), 0);
                this.angles[i] = Math.PI / 4 * sign * f;
            }
            else {
                this.angles[i] = 0;
            }
        }
        this.angles.push(this.preferedEndBank);
        let dec = 1;
        for (let i = 1; i < 0.5 * (N - 1); i++) {
            if (Math.abs(this.angles[i]) < Math.abs(this.preferedStartBank) * dec) {
                this.angles[i] = this.preferedStartBank * dec;
                dec *= 0.9;
            }
            else {
                i = Infinity;
            }
        }
        dec = 1;
        for (let i = N - 1 - 1; i > 0.5 * (N - 1); i--) {
            if (Math.abs(this.angles[i]) < Math.abs(this.preferedEndBank) * dec) {
                this.angles[i] = this.preferedEndBank * dec;
                dec *= 0.9;
            }
            else {
                i = -Infinity;
            }
        }
        let tmpAngles = [...this.angles];
        let f = 1;
        for (let n = 0; n < this.partTemplate.angleSmoothSteps; n++) {
            for (let i = 0; i < N; i++) {
                let aPrev = tmpAngles[i - 1];
                let a = tmpAngles[i];
                let point = this.interpolatedPoints[i];
                let aNext = tmpAngles[i + 1];
                if (isFinite(aPrev) && isFinite(aNext)) {
                    let prevPoint = this.interpolatedPoints[i - 1];
                    let distPrev = BABYLON.Vector3.Distance(prevPoint, point);
                    let nextPoint = this.interpolatedPoints[i + 1];
                    let distNext = BABYLON.Vector3.Distance(nextPoint, point);
                    let d = distPrev / (distPrev + distNext);
                    tmpAngles[i] = (1 - f) * a + f * ((1 - d) * aPrev + d * aNext);
                }
                else if (isFinite(aPrev)) {
                    tmpAngles[i] = (1 - f) * a + f * aPrev;
                }
                else if (isFinite(aNext)) {
                    tmpAngles[i] = (1 - f) * a + f * aNext;
                }
            }
        }
        this.preferedStartBank = tmpAngles[0];
        this.preferedEndBank = tmpAngles[tmpAngles.length - 1];
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
    }
}
class MachinePartTemplate {
    constructor() {
        this.partName = "machine-part-template";
        this.w = 1;
        this.h = 1;
        this.d = 1;
        this.n = 1;
        this.mirrorX = false;
        this.mirrorZ = false;
        this.angleSmoothSteps = 30;
        this.xExtendable = false;
        this.yExtendable = false;
        this.zExtendable = false;
        this.nExtendable = false;
        this.minH = 1;
        this.minD = 1;
        this.maxD = 10;
        this.xMirrorable = false;
        this.zMirrorable = false;
        this.hasOriginDestinationHandles = false;
        this.trackTemplates = [];
    }
    mirrorXTrackPointsInPlace() {
        for (let i = 0; i < this.trackTemplates.length; i++) {
            this.trackTemplates[i].mirrorXTrackPointsInPlace();
        }
    }
    mirrorZTrackPointsInPlace() {
        for (let i = 0; i < this.trackTemplates.length; i++) {
            this.trackTemplates[i].mirrorZTrackPointsInPlace();
        }
    }
    initialize() {
        this.trackTemplates.forEach(trackTemplate => {
            trackTemplate.initialize();
        });
    }
}
class TemplateManager {
    constructor(machine) {
        this.machine = machine;
        this._dictionary = new Map();
    }
    getTemplate(partName, mirrorX, mirrorZ) {
        let mirrorIndex = (mirrorX ? 0 : 1) + (mirrorZ ? 0 : 2);
        let data;
        let datas = this._dictionary.get(partName);
        if (datas && datas[mirrorIndex]) {
            data = datas[mirrorIndex];
        }
        else {
            if (!datas) {
                datas = [];
            }
            this._dictionary.set(partName, datas);
        }
        if (!data) {
            if (partName.startsWith("uturn-")) {
                let h = parseInt(partName.split("-")[1].split(".")[0]);
                let d = parseInt(partName.split("-")[1].split(".")[1]);
                data = UTurn.GenerateTemplate(h, d, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("wall-")) {
                let h = parseInt(partName.split("-")[1].split(".")[0]);
                let d = parseInt(partName.split("-")[1].split(".")[1]);
                data = Wall.GenerateTemplate(h, d, mirrorX);
            }
            else if (partName === "uturnsharp") {
                data = UTurnSharp.GenerateTemplate(mirrorX);
            }
            else if (partName.startsWith("ramp-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let d = parseInt(partName.split("-")[1].split(".")[2]);
                data = Ramp.GenerateTemplate(w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("wave-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let d = parseInt(partName.split("-")[1].split(".")[2]);
                data = Wave.GenerateTemplate(w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("snake-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let d = parseInt(partName.split("-")[1].split(".")[2]);
                data = Snake.GenerateTemplate(w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("elevator-")) {
                let h = parseInt(partName.split("-")[1]);
                data = Elevator.GenerateTemplate(h, mirrorX);
            }
            else if (partName === "split") {
                data = Split.GenerateTemplate(mirrorX);
            }
            else if (partName === "flatjoin") {
                data = FlatJoin.GenerateTemplate(mirrorX);
            }
            else if (partName === "join") {
                data = Join.GenerateTemplate(mirrorX);
            }
            else if (partName.startsWith("loop-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let d = parseInt(partName.split("-")[1].split(".")[1]);
                let n = parseInt(partName.split("-")[1].split(".")[2]);
                data = Loop.GenerateTemplate(w, d, n, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("spiral-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let n = parseInt(partName.split("-")[1].split(".")[2]);
                data = Spiral.GenerateTemplate(w, h, n, mirrorX, mirrorZ);
            }
            else if (partName === "quarter") {
                data = QuarterNote.GenerateTemplate(mirrorX);
            }
            else if (partName === "double") {
                data = DoubleNote.GenerateTemplate(mirrorX);
            }
            datas[mirrorIndex] = data;
        }
        return data;
    }
}
class Track {
    constructor(part) {
        this.part = part;
        this._startWorldPosition = BABYLON.Vector3.Zero();
        this._endWorldPosition = BABYLON.Vector3.Zero();
        this.AABBMin = BABYLON.Vector3.Zero();
        this.AABBMax = BABYLON.Vector3.Zero();
        this.wires = [
            new Wire(this.part),
            new Wire(this.part)
        ];
    }
    get templateInterpolatedPoints() {
        return this.template.interpolatedPoints;
    }
    get preferedStartBank() {
        return this.template ? this.template.preferedStartBank : 0;
    }
    get startWorldPosition() {
        this._startWorldPosition.copyFrom(this.part.position).addInPlace(this.templateInterpolatedPoints[0]);
        return this._startWorldPosition;
    }
    get preferedEndBank() {
        return this.template ? this.template.preferedEndBank : 0;
    }
    get endWorldPosition() {
        this._endWorldPosition.copyFrom(this.part.position).addInPlace(this.templateInterpolatedPoints[this.templateInterpolatedPoints.length - 1]);
        return this._endWorldPosition;
    }
    get trackIndex() {
        return this.part.tracks.indexOf(this);
    }
    getSlopeAt(index) {
        let trackpoint = this.template.trackpoints[index];
        let nextTrackPoint = this.template.trackpoints[index + 1];
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
        let trackpoint = this.template.trackpoints[index];
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
    initialize(template) {
        this.template = template;
        this.trackInterpolatedNormals = template.interpolatedNormals.map(v => { return v.clone(); });
        // Update AABB values.
        let N = this.templateInterpolatedPoints.length;
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < N; i++) {
            let p = this.templateInterpolatedPoints[i];
            this.AABBMin.minimizeInPlace(p);
            this.AABBMax.maximizeInPlace(p);
        }
        this.AABBMin.x -= (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMin.y -= (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMin.z -= (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMax.x += (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMax.y += (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMax.z += (this.part.wireSize + this.part.wireGauge) * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.part.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.part.getWorldMatrix(), this.AABBMax);
    }
    recomputeWiresPath() {
        let N = this.templateInterpolatedPoints.length;
        let angles = [...this.template.angles];
        this.trackInterpolatedNormals = this.template.interpolatedNormals.map(v => { return v.clone(); });
        //Mummu.DrawDebugPoint(this.startWorldPosition.add(this.endWorldPosition).scale(0.5), 60, BABYLON.Color3.Blue());
        let startBank = this.preferedStartBank;
        let otherS = this.part.machine.getBankAt(this.startWorldPosition, this.part);
        if (otherS) {
            this.part.addNeighbour(otherS.part);
            //Mummu.DrawDebugPoint(this.startWorldPosition, 60, BABYLON.Color3.Green());
            let otherBank = otherS.bank * (otherS.isEnd ? 1 : -1);
            if (this.preferedStartBank * otherBank >= 0) {
                startBank = Math.sign(this.preferedStartBank + otherBank) * Math.max(Math.abs(this.preferedStartBank), Math.abs(otherBank));
            }
            else {
                startBank = this.preferedStartBank * 0.5 + otherBank * 0.5;
            }
        }
        let endBank = this.preferedEndBank;
        let otherE = this.part.machine.getBankAt(this.endWorldPosition, this.part);
        if (otherE) {
            this.part.addNeighbour(otherE.part);
            //Mummu.DrawDebugPoint(this.endWorldPosition, 60, BABYLON.Color3.Red());
            let otherBank = otherE.bank * (otherE.isEnd ? -1 : 1);
            if (this.preferedEndBank * otherBank >= 0) {
                endBank = Math.sign(this.preferedEndBank + otherBank) * Math.max(Math.abs(this.preferedEndBank), Math.abs(otherBank));
            }
            else {
                endBank = this.preferedEndBank * 0.5 + otherBank * 0.5;
            }
        }
        angles[0] = startBank;
        angles[angles.length - 1] = endBank;
        let f = 1;
        for (let n = 0; n < this.template.partTemplate.angleSmoothSteps; n++) {
            for (let i = 1; i < N - 1; i++) {
                let aPrev = angles[i - 1];
                let a = angles[i];
                let point = this.templateInterpolatedPoints[i];
                let aNext = angles[i + 1];
                if (isFinite(aPrev) && isFinite(aNext)) {
                    let prevPoint = this.templateInterpolatedPoints[i - 1];
                    let distPrev = BABYLON.Vector3.Distance(prevPoint, point);
                    let nextPoint = this.templateInterpolatedPoints[i + 1];
                    let distNext = BABYLON.Vector3.Distance(nextPoint, point);
                    let d = distPrev / (distPrev + distNext);
                    angles[i] = (1 - f) * a + f * ((1 - d) * aPrev + d * aNext);
                }
                else if (isFinite(aPrev)) {
                    angles[i] = (1 - f) * a + f * aPrev;
                }
                else if (isFinite(aNext)) {
                    angles[i] = (1 - f) * a + f * aNext;
                }
            }
        }
        /*
        let dec = 1;
        for (let i = 1; i <= 0.5 * (N - 1); i++) {
            if (Math.abs(angles[i]) < Math.abs(startBank) * dec) {
                angles[i] = startBank * dec;
                dec *= 0.99;
            }
            else {
                i = Infinity;
            }
        }
        
        dec = 1;
        for (let i = N - 1 - 1; i >= 0.5 * (N - 1); i--) {
            if (Math.abs(angles[i]) < Math.abs(endBank) * dec) {
                angles[i] = endBank * dec;
                dec *= 0.99;
            }
            else {
                i = - Infinity;
            }
        }
        */
        for (let i = 0; i < N; i++) {
            let prevPoint = this.templateInterpolatedPoints[i - 1];
            let point = this.templateInterpolatedPoints[i];
            let nextPoint = this.templateInterpolatedPoints[i + 1];
            let dir;
            if (nextPoint) {
                dir = nextPoint;
            }
            else {
                dir = point;
            }
            if (prevPoint) {
                dir = dir.subtract(prevPoint);
            }
            else {
                dir = dir.subtract(point);
            }
            Mummu.RotateInPlace(this.trackInterpolatedNormals[i], dir, angles[i]);
        }
        // Compute wire path
        for (let i = 0; i < N; i++) {
            let pPrev = this.templateInterpolatedPoints[i - 1] ? this.templateInterpolatedPoints[i - 1] : undefined;
            let p = this.templateInterpolatedPoints[i];
            let pNext = this.templateInterpolatedPoints[i + 1] ? this.templateInterpolatedPoints[i + 1] : undefined;
            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }
            let dir = pNext.subtract(pPrev).normalize();
            let up = this.trackInterpolatedNormals[i];
            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);
            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);
            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-this.part.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.part.wireGauge * 0.5, 0, 0), matrix);
        }
        Mummu.DecimatePathInPlace(this.wires[0].path, 2 / 180 * Math.PI);
        Mummu.DecimatePathInPlace(this.wires[1].path, 2 / 180 * Math.PI);
        if (this.template.drawStartTip) {
            this.wires[0].startTipCenter = this.template.trackpoints[0].position.clone();
            this.wires[0].startTipNormal = this.template.trackpoints[0].normal.clone();
            this.wires[0].startTipDir = this.template.trackpoints[0].dir.clone();
        }
        if (this.template.drawEndTip) {
            this.wires[0].endTipCenter = this.template.trackpoints[this.template.trackpoints.length - 1].position.clone();
            this.wires[0].endTipNormal = this.template.trackpoints[this.template.trackpoints.length - 1].normal.clone();
            this.wires[0].endTipDir = this.template.trackpoints[this.template.trackpoints.length - 1].dir.clone();
        }
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
}
class TrackPoint {
    constructor(template, position, dir, normal, tangentIn, tangentOut) {
        this.template = template;
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
        let index = this.template.trackpoints.indexOf(this);
        if (index === 0 || index === this.template.trackpoints.length - 1) {
            return true;
        }
        return false;
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
        this._selectedItem = "";
        this._dragOffset = BABYLON.Vector3.Zero();
        this._majDown = false;
        this._ctrlDown = false;
        this.selectedObjects = [];
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
                    if (mesh instanceof MachinePartSelectorMesh && mesh.part === this.selectedObject) {
                        return true;
                    }
                    return false;
                });
                if (!pick.hit) {
                    pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        if (mesh instanceof BallGhost) {
                            return true;
                        }
                        return false;
                    });
                }
                if (!pick.hit) {
                    pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        if (mesh instanceof MachinePartSelectorMesh) {
                            return true;
                        }
                        return false;
                    });
                }
                if (pick.hit) {
                    let pickedObject;
                    if (pick.pickedMesh instanceof BallGhost) {
                        pickedObject = pick.pickedMesh.ball;
                    }
                    else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                        pickedObject = pick.pickedMesh.part;
                    }
                    if (!this._majDown && this.selectedObjects.indexOf(pickedObject) != -1) {
                        pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                            if (mesh === this.grid.opaquePlane) {
                                return true;
                            }
                        });
                        if (pick.hit && pick.pickedPoint) {
                            if (pickedObject instanceof MachinePart) {
                                this._dragOffset.copyFrom(pickedObject.position).subtractInPlace(pick.pickedPoint);
                            }
                            else if (pickedObject instanceof Ball) {
                                this._dragOffset.copyFrom(pickedObject.positionZero).subtractInPlace(pick.pickedPoint);
                            }
                        }
                        else {
                            this._dragOffset.copyFromFloats(0, 0, 0);
                        }
                        this.setDraggedObject(pickedObject);
                    }
                }
            }
        };
        this.pointerMove = (event) => {
            if (this.draggedObject) {
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh === this.grid.opaquePlane) {
                        return true;
                    }
                });
                if (pick.hit && pick.pickedMesh === this.grid.opaquePlane) {
                    let point = pick.pickedPoint.add(this._dragOffset);
                    if (this.draggedObject instanceof MachinePart) {
                        let i = Math.round(point.x / tileWidth);
                        let j = Math.floor((-point.y + 0.25 * tileHeight) / tileHeight);
                        let k = Math.round(-point.z / tileDepth);
                        let di = i - this.draggedObject.i;
                        let dj = j - this.draggedObject.j;
                        let dk = k - this.draggedObject.k;
                        if (di != 0 || dj != 0 || dk != 0) {
                            for (let n = 0; n < this.selectedObjects.length; n++) {
                                let selectedObject = this.selectedObjects[n];
                                if (selectedObject instanceof MachinePart && selectedObject != this.draggedObject) {
                                    selectedObject.setI(selectedObject.i + di);
                                    selectedObject.setJ(selectedObject.j + dj);
                                    selectedObject.setK(selectedObject.k + dk);
                                }
                            }
                            this.draggedObject.setI(i);
                            this.draggedObject.setJ(j);
                            this.draggedObject.setK(k);
                            this.draggedObject.setIsVisible(true);
                            this.updateFloatingElements();
                            if (this._dragOffset.lengthSquared() > 0) {
                                this.grid.position.copyFrom(this.draggedObject.position);
                            }
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
            let dx = (this._pointerDownX - this.game.scene.pointerX);
            let dy = (this._pointerDownY - this.game.scene.pointerY);
            let clickInPlace = dx * dx + dy * dy < 10;
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
                if (!this.draggedObject && mesh instanceof BallGhost) {
                    return true;
                }
                else if (this.draggedObject && mesh === this.grid.opaquePlane) {
                    return true;
                }
                return false;
            });
            if (!pick.hit) {
                pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (!this.draggedObject && mesh instanceof MachinePartSelectorMesh) {
                        return true;
                    }
                    else if (this.draggedObject && mesh === this.grid.opaquePlane) {
                        return true;
                    }
                    return false;
                });
            }
            if (pick.hit) {
                if (this.draggedObject instanceof MachinePart) {
                    let draggedTrack = this.draggedObject;
                    for (let i = 0; i < this.selectedObjects.length; i++) {
                        let selectedObject = this.selectedObjects[i];
                        if (selectedObject instanceof MachinePart && selectedObject != draggedTrack) {
                            selectedObject.generateWires();
                            selectedObject.instantiate(true).then(() => {
                                selectedObject.recomputeAbsolutePath();
                            });
                        }
                    }
                    if (this.machine.parts.indexOf(draggedTrack) === -1) {
                        this.machine.parts.push(draggedTrack);
                    }
                    draggedTrack.setIsVisible(true);
                    draggedTrack.generateWires();
                    draggedTrack.instantiate(true).then(() => {
                        draggedTrack.recomputeAbsolutePath();
                        this.setSelectedObject(draggedTrack);
                        this.setDraggedObject(undefined);
                        this.setSelectedItem("");
                    });
                    this.machine.generateBaseMesh();
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
                    if (clickInPlace) {
                        if (pick.pickedMesh instanceof BallGhost) {
                            this.setSelectedObject(pick.pickedMesh.ball);
                        }
                        else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                            if (this._majDown) {
                                this.addOrRemoveSelectedObjects(pick.pickedMesh.part);
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
                if (clickInPlace) {
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
                this.setSelectedObject(undefined);
                this.addOrRemoveSelectedObjects(...this.machine.parts);
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
                let editedTrack = await this.editTrackInPlace(track, { j: j });
                this.setSelectedObject(editedTrack);
            }
        };
        this._onHMinusTop = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h - 1;
                let j = track.j + 1;
                if (h >= 0) {
                    let editedTrack = await this.editTrackInPlace(track, { j: j });
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onWPlusRight = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let w = track.w + 1;
                let editedTrack = await this.editTrackInPlace(track, { w: w });
                this.setSelectedObject(editedTrack);
            }
        };
        this._onWMinusRight = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let w = track.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.editTrackInPlace(track, { w: w });
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onHPlusBottom = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h + 1;
                let editedTrack = await this.editTrackInPlace(track, { h: h });
                this.setSelectedObject(editedTrack);
            }
        };
        this._onHMinusBottom = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.yExtendable) {
                let h = track.h - 1;
                if (h >= 0) {
                    let editedTrack = await this.editTrackInPlace(track, { h: h });
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onWPlusLeft = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let i = track.i - 1;
                let w = track.w + 1;
                let editedTrack = await this.editTrackInPlace(track, { i: i });
                this.setSelectedObject(editedTrack);
            }
        };
        this._onWMinusLeft = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.xExtendable) {
                let i = track.i + 1;
                let w = track.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.editTrackInPlace(track, { i: i });
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onDPlus = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.zExtendable) {
                let d = track.d + 1;
                let editedTrack = await this.editTrackInPlace(track, { d: d });
                this.setSelectedObject(editedTrack);
            }
        };
        this._onDMinus = async () => {
            let track = this.selectedObject;
            if (track instanceof MachinePart && track.zExtendable) {
                let d = track.d - 1;
                if (d >= 1) {
                    let editedTrack = await this.editTrackInPlace(track, { d: d });
                    this.setSelectedObject(editedTrack);
                }
            }
        };
        this._onDelete = async () => {
            this.selectedObjects.forEach(obj => {
                obj.dispose();
            });
            this.setSelectedObject(undefined);
            this.setDraggedObject(undefined);
            this.machine.generateBaseMesh();
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
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginIMinus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: -1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginJPlus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 1, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginJMinus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: -1, k: 0 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginKPlus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 1 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onOriginKMinus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: -1 }, { i: 0, j: 0, k: 0 }));
            }
        };
        this._onDestinationIPlus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 1, j: 0, k: 0 }));
            }
        };
        this._onDestinationIMinus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: -1, j: 0, k: 0 }));
            }
        };
        this._onDestinationJPlus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 1, k: 0 }));
            }
        };
        this._onDestinationJMinus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: -1, k: 0 }));
            }
        };
        this._onDestinationKPlus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: 1 }));
            }
        };
        this._onDestinationKMinus = async () => {
            if (this.selectedObject instanceof MachinePartWithOriginDestination) {
                this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: -1 }));
            }
        };
        this._onIPlus = async () => {
            for (let i = 0; i < this.selectedObjects.length; i++) {
                let selectedTrack = this.selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setI(selectedTrack.i + 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    this.machine.generateBaseMesh();
                    await selectedTrack.instantiate(true);
                    this.grid.position.copyFrom(selectedTrack.position);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.updateFloatingElements();
        };
        this._onIMinus = async () => {
            for (let i = 0; i < this.selectedObjects.length; i++) {
                let selectedTrack = this.selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setI(selectedTrack.i - 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    this.machine.generateBaseMesh();
                    await selectedTrack.instantiate(true);
                    this.grid.position.copyFrom(selectedTrack.position);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.updateFloatingElements();
        };
        this._onJPlus = async () => {
            for (let i = 0; i < this.selectedObjects.length; i++) {
                let selectedTrack = this.selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setJ(selectedTrack.j + 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    this.machine.generateBaseMesh();
                    await selectedTrack.instantiate(true);
                    this.grid.position.copyFrom(selectedTrack.position);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.updateFloatingElements();
        };
        this._onJMinus = async () => {
            for (let i = 0; i < this.selectedObjects.length; i++) {
                let selectedTrack = this.selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setJ(selectedTrack.j - 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    this.machine.generateBaseMesh();
                    await selectedTrack.instantiate(true);
                    this.grid.position.copyFrom(selectedTrack.position);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.updateFloatingElements();
        };
        this._onKPlus = async () => {
            if (this.selectedObject instanceof MachinePart) {
                for (let i = 0; i < this.selectedObjects.length; i++) {
                    let selectedTrack = this.selectedObjects[i];
                    if (selectedTrack instanceof MachinePart) {
                        selectedTrack.setK(selectedTrack.k + 1);
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.generateWires();
                        this.machine.generateBaseMesh();
                        await selectedTrack.instantiate(true);
                        this.grid.position.copyFrom(selectedTrack.position);
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.select();
                        if (this.game.cameraMode === CameraMode.Selected) {
                            this._onFocus();
                        }
                    }
                }
                this.setDraggedObject(undefined);
                this.setSelectedItem("");
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
                for (let i = 0; i < this.selectedObjects.length; i++) {
                    let selectedTrack = this.selectedObjects[i];
                    if (selectedTrack instanceof MachinePart) {
                        selectedTrack.setK(selectedTrack.k - 1);
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.generateWires();
                        this.machine.generateBaseMesh();
                        await selectedTrack.instantiate(true);
                        this.grid.position.copyFrom(selectedTrack.position);
                        selectedTrack.recomputeAbsolutePath();
                        selectedTrack.select();
                        if (this.game.cameraMode === CameraMode.Selected) {
                            this._onFocus();
                        }
                    }
                }
                this.setDraggedObject(undefined);
                this.setSelectedItem("");
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
                        let pos = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-0.011 * (elevator.mirrorX ? -1 : 1), 0.009, 0), box.getWorldMatrix());
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
                this.game.focusMachineParts(false, ...this.selectedObjects);
            }
        };
        this.container = document.getElementById("machine-editor-objects");
        this.itemContainer = this.container.querySelector("#machine-editor-item-container");
        this.grid = new MachineEditorGrid(this);
        this.machinePartEditorMenu = new MachinePartEditorMenu(this);
    }
    get machine() {
        return this.game.machine;
    }
    get hoveredObject() {
        return this._hoveredObject;
    }
    set hoveredObject(o) {
        if (o != this._hoveredObject) {
            if (this._hoveredObject) {
                this._hoveredObject.unlit();
            }
            this._hoveredObject = o;
            if (this._hoveredObject) {
                this._hoveredObject.highlight();
            }
        }
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
                //this.showCurrentLayer();
            }
            else {
                this.game.camera.attachControl();
                //this.hideCurrentLayer();
            }
        }
    }
    get selectedObjectsCount() {
        return this.selectedObjects.length;
    }
    get selectedObject() {
        return this.selectedObjects[0];
    }
    setSelectedObject(s, skipUpdateGridPosition) {
        if (this.selectedObjects) {
            this.selectedObjects.forEach(obj => {
                obj.unselect();
            });
        }
        if (s) {
            this.selectedObjects = [s];
            if (this.game.cameraMode === CameraMode.Selected) {
                this._onFocus();
            }
        }
        else {
            this.selectedObjects = [];
        }
        if (this.selectedObjects[0]) {
            if (!skipUpdateGridPosition) {
                this.grid.position.copyFrom(this.selectedObjects[0].position);
            }
            this.selectedObjects[0].select();
            this.machinePartEditorMenu.currentObject = this.selectedObjects[0];
        }
        else {
            this.machinePartEditorMenu.currentObject = undefined;
        }
        this.updateFloatingElements();
    }
    addOrRemoveSelectedObjects(...objects) {
        for (let i = 0; i < objects.length; i++) {
            let object = objects[i];
            let index = this.selectedObjects.indexOf(object);
            if (index === -1) {
                console.log("add object to selection");
                this.selectedObjects.push(object);
                object.select();
            }
            else {
                console.log("remove object from selection");
                this.selectedObjects.splice(index, 1);
                object.unselect();
            }
        }
        if (this.game.cameraMode === CameraMode.Selected) {
            this._onFocus();
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
                this.setSelectedObject(ball, true);
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
                    let track = this.machine.trackFactory.createTrack(this._selectedItem, 0, 0, 0);
                    track.isPlaced = false;
                    track.instantiate(true).then(() => {
                        track.setIsVisible(false);
                    });
                    this.setDraggedObject(track);
                    this.setSelectedObject(track, true);
                    this._dragOffset.copyFromFloats(0, 0, 0);
                }
            });
        }
        var r = document.querySelector(':root');
        r.style.setProperty("--machine-editor-item-container-width", (Math.ceil(TrackNames.length / 2 + 1) * 16.7).toFixed(0) + "vw");
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
        let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
            if (mesh instanceof Arrow && mesh.isVisible) {
                return true;
            }
            return false;
        });
        if (pick.hit && pick.pickedMesh instanceof Arrow) {
            this.hoveredObject = pick.pickedMesh;
        }
        else {
            this.hoveredObject = undefined;
        }
        this.grid.update();
    }
    async editTrackInPlace(track, props) {
        if (!props) {
            props = {};
        }
        if (!isFinite(props.i)) {
            props.i = track.i;
        }
        if (!isFinite(props.j)) {
            props.j = track.j;
        }
        if (!isFinite(props.k)) {
            props.k = track.k;
        }
        if (!isFinite(props.w) && track.xExtendable) {
            props.w = track.w;
        }
        if (!isFinite(props.h) && track.yExtendable) {
            props.h = track.h;
        }
        if (!isFinite(props.d) && track.zExtendable) {
            props.d = track.d;
        }
        if (!isFinite(props.n) && track.nExtendable) {
            props.n = track.n;
        }
        props.mirrorX = track.mirrorX;
        props.mirrorZ = track.mirrorZ;
        let editedTrack = this.machine.trackFactory.createTrackWHDN(track.partName, props);
        track.dispose();
        this.machine.parts.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        this.machine.generateBaseMesh();
        await editedTrack.instantiate(true);
        editedTrack.recomputeAbsolutePath();
        return editedTrack;
    }
    async editPartOriginDestInPlace(part, dOrigin, dDestination) {
        let origin = part.getOrigin();
        origin.i += dOrigin.i;
        origin.j += dOrigin.j;
        origin.k += dOrigin.k;
        let destination = part.getDestination();
        destination.i += dDestination.i;
        destination.j += dDestination.j;
        destination.k += dDestination.k;
        if (origin.i >= destination.i) {
            return part;
        }
        let editedPart = part.recreateFromOriginDestination(origin, destination, this.machine);
        part.dispose();
        this.machine.parts.push(editedPart);
        editedPart.setIsVisible(true);
        editedPart.generateWires();
        this.machine.generateBaseMesh();
        await editedPart.instantiate(true);
        editedPart.recomputeAbsolutePath();
        return editedPart;
    }
    async mirrorXTrackInPlace(track) {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, !track.mirrorX);
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate(true);
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }
    async mirrorZTrackInPlace(track) {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, track.mirrorX, !track.mirrorZ);
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate(true);
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
                this.KPlusHandle.position.y -= 0.04;
                this.KPlusHandle.position.z -= 0.03;
                this.KPlusHandle.isVisible = true;
                this.KMinusHandle.position.copyFrom(this.selectedObject.positionZeroGhost.position);
                this.KMinusHandle.position.y -= 0.04;
                this.KMinusHandle.position.z += 0.03;
                this.KMinusHandle.isVisible = true;
            }
            else if (this.selectedObject instanceof MachinePart) {
                if (this.selectedObject instanceof MachinePartWithOriginDestination && this.selectedObjectsCount === 1) {
                    let origin = this.selectedObject.getOrigin();
                    let pOrigin = new BABYLON.Vector3(origin.i * tileWidth - 0.5 * tileWidth, -origin.j * tileHeight, -origin.k * tileDepth);
                    this.originIPlusHandle.position.copyFrom(pOrigin);
                    this.originIPlusHandle.position.x += this.smallHandleSize * 1.5;
                    this.originIMinusHandle.position.copyFrom(pOrigin);
                    this.originIMinusHandle.position.x -= this.smallHandleSize * 1.5;
                    this.originJPlusHandle.position.copyFrom(pOrigin);
                    this.originJPlusHandle.position.y -= this.smallHandleSize * 1.5;
                    this.originJMinusHandle.position.copyFrom(pOrigin);
                    this.originJMinusHandle.position.y += this.smallHandleSize * 1.5;
                    this.originKPlusHandle.position.copyFrom(pOrigin);
                    this.originKPlusHandle.position.z -= this.smallHandleSize * 1.5;
                    this.originKMinusHandle.position.copyFrom(pOrigin);
                    this.originKMinusHandle.position.z += this.smallHandleSize * 1.5;
                    let destination = this.selectedObject.getDestination();
                    let pDestination = new BABYLON.Vector3(destination.i * tileWidth - 0.5 * tileWidth, -destination.j * tileHeight, -destination.k * tileDepth);
                    this.destinationIPlusHandle.position.copyFrom(pDestination);
                    this.destinationIPlusHandle.position.x += this.smallHandleSize * 1.5;
                    this.destinationIMinusHandle.position.copyFrom(pDestination);
                    this.destinationIMinusHandle.position.x -= this.smallHandleSize * 1.5;
                    this.destinationJPlusHandle.position.copyFrom(pDestination);
                    this.destinationJPlusHandle.position.y -= this.smallHandleSize * 1.5;
                    this.destinationJMinusHandle.position.copyFrom(pDestination);
                    this.destinationJMinusHandle.position.y += this.smallHandleSize * 1.5;
                    this.destinationKPlusHandle.position.copyFrom(pDestination);
                    this.destinationKPlusHandle.position.z -= this.smallHandleSize * 1.5;
                    this.destinationKMinusHandle.position.copyFrom(pDestination);
                    this.destinationKMinusHandle.position.z += this.smallHandleSize * 1.5;
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
                        this.IPlusHandle.position.x += this.selectedObject.encloseEnd.x + this.IPlusHandle.baseSize * 0.5;
                        this.IPlusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.IPlusHandle.position.z += this.selectedObject.encloseMid.z;
                        this.IMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.IMinusHandle.position.x += this.selectedObject.encloseStart.x - this.IMinusHandle.baseSize * 0.5;
                        this.IMinusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.IMinusHandle.position.z += this.selectedObject.encloseMid.z;
                        this.JPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.JPlusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.JPlusHandle.position.y += this.selectedObject.encloseEnd.y - this.JPlusHandle.baseSize * 0.5;
                        this.JPlusHandle.position.z += this.selectedObject.encloseMid.z;
                        this.JMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.JMinusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.JMinusHandle.position.y += this.selectedObject.encloseStart.y + this.JMinusHandle.baseSize * 0.5;
                        this.JMinusHandle.position.z += this.selectedObject.encloseMid.z;
                        this.KPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.KPlusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.KPlusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.KPlusHandle.position.z += this.selectedObject.encloseEnd.z - this.KPlusHandle.baseSize * 0.5;
                        this.KMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.KMinusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.KMinusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.KMinusHandle.position.z += this.selectedObject.encloseStart.z + this.KMinusHandle.baseSize * 0.5;
                    }
                    else if (this.selectedObjectsCount > 1) {
                        let encloseStart = new BABYLON.Vector3(Infinity, -Infinity, -Infinity);
                        let encloseEnd = new BABYLON.Vector3(-Infinity, Infinity, Infinity);
                        this.selectedObjects.forEach(obj => {
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
                        this.IPlusHandle.position.x = encloseEnd.x + this.IPlusHandle.baseSize * 0.5;
                        this.IPlusHandle.position.y = encloseMid.y;
                        this.IPlusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.IMinusHandle.position.x = encloseStart.x - this.IMinusHandle.baseSize * 0.5;
                        this.IMinusHandle.position.y = encloseMid.y;
                        this.IMinusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.JPlusHandle.position.x = enclose13.x;
                        this.JPlusHandle.position.y = encloseEnd.y - this.JMinusHandle.baseSize * 0.5;
                        this.JPlusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.JMinusHandle.position.x = enclose13.x;
                        this.JMinusHandle.position.y = encloseStart.y + this.JMinusHandle.baseSize * 0.5;
                        this.JMinusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        this.KPlusHandle.position.x = enclose23.x;
                        this.KPlusHandle.position.y = encloseEnd.y;
                        this.KPlusHandle.position.z = encloseEnd.z - this.KPlusHandle.baseSize * 0.5;
                        this.KMinusHandle.position.x = enclose23.x;
                        this.KMinusHandle.position.y = encloseEnd.y;
                        this.KMinusHandle.position.z = encloseStart.z + this.KMinusHandle.baseSize * 0.5;
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
class MachineEditorGrid extends BABYLON.Mesh {
    constructor(editor) {
        super("machine-editor-grid");
        this.editor = editor;
        this.closestAxis = BABYLON.Vector3.Forward();
        this._lastSelectedObjectsCount = 0;
        this._lastPosition = BABYLON.Vector3.Zero();
        this._lastCamDir = BABYLON.Vector3.One();
        this.opaquePlane = BABYLON.MeshBuilder.CreatePlane("machine-editor-opaque-grid", { size: 100 });
        this.opaquePlane.material = this.editor.game.gridMaterial;
        this.opaquePlane.rotationQuaternion = BABYLON.Quaternion.Identity();
        let count = 20;
        let xLines = [];
        let color = new BABYLON.Color4(1, 1, 1, 0.2);
        let colors = [];
        for (let j = -count; j <= count; j++) {
            xLines.push([
                new BABYLON.Vector3(0, j * tileHeight - 0.5 * tileHeight, -count * tileDepth),
                new BABYLON.Vector3(0, j * tileHeight - 0.5 * tileHeight, count * tileDepth),
            ]);
            colors.push([color, color]);
        }
        for (let k = -count; k <= count; k++) {
            xLines.push([
                new BABYLON.Vector3(0, -count * tileHeight - 0.5 * tileHeight, k * tileDepth - 0.5 * tileDepth),
                new BABYLON.Vector3(0, count * tileHeight - 0.5 * tileHeight, k * tileDepth - 0.5 * tileDepth),
            ]);
            colors.push([color, color]);
        }
        this.xGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-x-grid", { lines: xLines, colors: colors }, editor.game.scene);
        let yLines = [];
        for (let i = -count; i <= count; i++) {
            yLines.push([
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, 0, -count * tileDepth),
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, 0, count * tileDepth),
            ]);
        }
        for (let k = -count; k <= count; k++) {
            yLines.push([
                new BABYLON.Vector3(-count * tileWidth - 0.5 * tileWidth, 0, k * tileDepth - 0.5 * tileDepth),
                new BABYLON.Vector3(count * tileWidth - 0.5 * tileWidth, 0, k * tileDepth - 0.5 * tileDepth),
            ]);
        }
        this.yGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-y-grid", { lines: yLines, colors: colors }, editor.game.scene);
        let zLines = [];
        for (let j = -count; j <= count; j++) {
            zLines.push([
                new BABYLON.Vector3(-count * tileWidth - 0.5 * tileWidth, j * tileHeight - 0.5 * tileHeight, 0),
                new BABYLON.Vector3(count * tileWidth - 0.5 * tileWidth, j * tileHeight - 0.5 * tileHeight, 0),
            ]);
        }
        for (let i = -count; i <= count; i++) {
            zLines.push([
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, -count * tileHeight - 0.5 * tileHeight, 0),
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, count * tileHeight - 0.5 * tileHeight, 0),
            ]);
        }
        this.zGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-z-grid", { lines: zLines, colors: colors }, editor.game.scene);
        this.opaquePlane.isVisible = false;
        this.xGrid.isVisible = false;
        this.yGrid.isVisible = false;
        this.zGrid.isVisible = false;
    }
    update() {
        let camDir = this.editor.game.camera.getDirection(BABYLON.Axis.Z);
        if (this.editor.selectedObjectsCount != this._lastSelectedObjectsCount ||
            this.editor.selectedObject != this._lastSelectedObject ||
            Mummu.Angle(camDir, this._lastCamDir) > Math.PI / 180 ||
            BABYLON.Vector3.DistanceSquared(this.position, this._lastPosition) > 0.001 * 0.001) {
            this.xGrid.isVisible = false;
            this.yGrid.isVisible = false;
            this.zGrid.isVisible = false;
            this.opaquePlane.isVisible = false;
            this.xGrid.position.copyFrom(this.position);
            this.yGrid.position.copyFrom(this.position);
            this.zGrid.position.copyFrom(this.position);
            let minIJK = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
            let maxIJK = new BABYLON.Vector3(Infinity, Infinity, Infinity);
            let worldEncloseStart = new BABYLON.Vector3(Infinity, -Infinity, -Infinity);
            let worldEncloseEnd = new BABYLON.Vector3(-Infinity, Infinity, Infinity);
            if (this.editor.selectedObjects.length > 0) {
                this.opaquePlane.isVisible = true;
                this.editor.selectedObjects.forEach(obj => {
                    if (obj instanceof MachinePart) {
                        worldEncloseStart.x = Math.min(worldEncloseStart.x, obj.position.x + obj.encloseStart.x);
                        worldEncloseStart.y = Math.max(worldEncloseStart.y, obj.position.y + obj.encloseStart.y);
                        worldEncloseStart.z = Math.max(worldEncloseStart.z, obj.position.z + obj.encloseStart.z);
                        worldEncloseEnd.x = Math.max(worldEncloseEnd.x, obj.position.x + obj.encloseEnd.x);
                        worldEncloseEnd.y = Math.min(worldEncloseEnd.y, obj.position.y + obj.encloseEnd.y);
                        worldEncloseEnd.z = Math.min(worldEncloseEnd.z, obj.position.z + obj.encloseEnd.z);
                    }
                });
                Mummu.GetClosestAxisToRef(camDir, this.closestAxis);
                Mummu.QuaternionFromZYAxisToRef(this.closestAxis, BABYLON.Vector3.One(), this.opaquePlane.rotationQuaternion);
                if (this.closestAxis.x != 0) {
                    this.xGrid.isVisible = this.isVisible;
                    if (this.editor.selectedObject instanceof MachinePart && this.editor.selectedObject.isPlaced) {
                        if (this.closestAxis.x > 0) {
                            maxIJK.x = this.editor.selectedObject.i;
                            this.xGrid.position.x = worldEncloseEnd.x;
                        }
                        else {
                            minIJK.x = this.editor.selectedObject.i;
                            this.xGrid.position.x = worldEncloseStart.x;
                        }
                    }
                    this.opaquePlane.position.copyFrom(this.xGrid.position);
                }
                if (this.closestAxis.y != 0) {
                    this.yGrid.isVisible = this.isVisible;
                    if (this.editor.selectedObject instanceof MachinePart && this.editor.selectedObject.isPlaced) {
                        if (this.closestAxis.y > 0) {
                            minIJK.y = this.editor.selectedObject.j;
                            this.yGrid.position.y = worldEncloseStart.y;
                        }
                        else {
                            maxIJK.y = this.editor.selectedObject.j;
                            this.yGrid.position.y = worldEncloseEnd.y;
                        }
                    }
                    this.opaquePlane.position.copyFrom(this.yGrid.position);
                }
                if (this.closestAxis.z != 0) {
                    this.zGrid.isVisible = this.isVisible;
                    if (this.editor.selectedObject instanceof MachinePart && this.editor.selectedObject.isPlaced) {
                        if (this.closestAxis.z > 0) {
                            minIJK.z = this.editor.selectedObject.k;
                            this.zGrid.position.z = worldEncloseStart.z;
                        }
                        else {
                            maxIJK.z = this.editor.selectedObject.k;
                            this.zGrid.position.z = worldEncloseEnd.z;
                        }
                    }
                    this.opaquePlane.position.copyFrom(this.zGrid.position);
                }
            }
            /*
            this.editor.machine.parts.forEach(part => {
                if (
                    part.i <= maxIJK.x && part.i >= minIJK.x &&
                    part.j <= maxIJK.y && part.j >= minIJK.y &&
                    part.k <= maxIJK.z && part.k >= minIJK.z
                ) {
                    part.partVisibilityMode = PartVisibilityMode.Default;
                }
                else {
                    part.partVisibilityMode = PartVisibilityMode.Ghost;
                }
            })
            */
            this._lastSelectedObjectsCount = this.editor.selectedObjects.length;
            this._lastSelectedObject = this.editor.selectedObject;
            this._lastPosition.copyFrom(this.position);
            this._lastCamDir.copyFrom(camDir);
        }
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
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { w: w });
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.wMinusButton = document.querySelector("#machine-editor-part-menu-width button.minus");
        this.wMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { w: w });
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
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { h: h });
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.hMinusButton = document.querySelector("#machine-editor-part-menu-height button.minus");
        this.hMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.yExtendable) {
                let h = this.currentObject.h - 1;
                if (h >= this.currentObject.minH) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { h: h });
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
                if (d <= this.currentObject.maxD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { d: d });
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.dMinusButton = document.querySelector("#machine-editor-part-menu-depth button.minus");
        this.dMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.zExtendable) {
                let d = this.currentObject.d - 1;
                if (d >= this.currentObject.minD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { d: d });
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.dValue = document.querySelector("#machine-editor-part-menu-depth .value");
        this.countLine = document.getElementById("machine-editor-part-menu-count");
        this.nPlusButton = document.querySelector("#machine-editor-part-menu-count button.plus");
        this.nPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.nExtendable) {
                let n = this.currentObject.n + 1;
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { n: n });
                this.machineEditor.setSelectedObject(editedTrack);
            }
        };
        this.nMinusButton = document.querySelector("#machine-editor-part-menu-count button.minus");
        this.nMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.nExtendable) {
                let n = this.currentObject.n - 1;
                if (n > 0) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { n: n });
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        };
        this.nValue = document.querySelector("#machine-editor-part-menu-count .value");
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
                this.ijkLine.style.display = "none";
                this.kLine.style.display = this._shown && this.currentObject instanceof Ball ? "" : "none";
                this.widthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xExtendable ? "" : "none";
                this.heightLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.yExtendable ? "" : "none";
                this.depthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zExtendable ? "" : "none";
                this.countLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.nExtendable ? "" : "none";
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
                    this.nValue.innerText = this.currentObject.n.toFixed(0);
                }
                else if (this.currentObject instanceof Ball) {
                    this.titleElement.innerText = "Marble";
                    this.kElement.innerText = this.currentObject.k.toFixed(0);
                }
            }
        }
    }
}
class Elevator extends MachinePart {
    constructor(machine, i, j, k, h = 1, mirrorX) {
        super(machine, i, j, k);
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
        let partName = "elevator-" + h.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        let x = 1;
        if (mirrorX) {
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
            let rRamp = this.wireGauge * 0.35;
            let nRamp = 12;
            let rampWire0 = new Wire(this);
            rampWire0.path = [new BABYLON.Vector3(-0.02 * x, 0.0015, rRamp)];
            for (let i = 0; i <= nRamp * 0.5; i++) {
                let a = i / nRamp * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                rampWire0.path.push(new BABYLON.Vector3((sina * rRamp - rRamp - 0.0005) * x, 0, cosa * rRamp));
            }
            rampWire0.parent = box;
            let rampWire1 = new Wire(this);
            rampWire1.path = [new BABYLON.Vector3(-0.02 * x, 0.0015, rRamp)];
            for (let i = nRamp * 0.5; i <= nRamp; i++) {
                let a = i / nRamp * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                rampWire1.path.push(new BABYLON.Vector3((sina * rRamp - rRamp - 0.0005) * x, 0, cosa * rRamp));
            }
            rampWire1.path.push(new BABYLON.Vector3(-0.02 * x, 0.0015, -rRamp));
            rampWire1.parent = box;
            this.boxes.push(box);
            this.wires.push(rampWire0, rampWire1);
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
    static GenerateTemplate(h, mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "elevator-" + h.toFixed(0);
        template.h = h;
        template.mirrorX = mirrorX;
        template.yExtendable = true;
        template.xMirrorable = true;
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
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight * h, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.1, -tileHeight * (h + 0.15), 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0, -tileHeight * (h + 0.35), 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0 + 0.01, -tileHeight * (h + 0.35) + 0.01, 0), n),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0 + 0.01, 0 - tileHeight, 0), n),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-0.005, 0.035 - tileHeight, 0), (new BABYLON.Vector3(-1, 1, 0)).normalize(), new BABYLON.Vector3(-1, -1, 0).normalize())
        ];
        template.trackTemplates[0].drawEndTip = true;
        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight, 0), dirLeft),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(-0.008, -tileHeight * 0.5, 0), dirRight)
        ];
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
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
class FlatJoin extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k);
        let partName = "flatjoin";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        console.log(this.template);
        this.generateWires();
    }
    static GenerateTemplate(mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "flatjoin";
        template.mirrorX = mirrorX;
        template.xMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let dirJoin = (new BABYLON.Vector3(2, -1, 0)).normalize();
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight, 0), dir)
        ];
        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(-tileWidth * 0.25, -tileHeight * 0.25, 0), dirJoin)
        ];
        let center = new BABYLON.Vector3(-0.0135, 0.0165, 0);
        let r = 0.02;
        template.trackTemplates[2] = new TrackTemplate(template);
        template.trackTemplates[2].trackpoints = [
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(0 + 0.03, -r - 0.011, 0)), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, -1, 0)),
        ];
        template.trackTemplates[2].drawStartTip = true;
        template.trackTemplates[2].drawEndTip = true;
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
class Join extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k);
        let partName = "join";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        this.generateWires();
    }
    static GenerateTemplate(mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "join";
        template.mirrorX = mirrorX;
        template.xMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let dirJoin = (new BABYLON.Vector3(-2, -1, 0)).normalize();
        let nJoin = (new BABYLON.Vector3(-1, 2, 0)).normalize();
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth / 3, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth / 3, -tileHeight, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight, 0), dir)
        ];
        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), dir.scale(-1)),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(tileWidth * 0.25, -tileHeight * 0.25, 0), dirJoin)
        ];
        let center = new BABYLON.Vector3(0.0135, 0.0165, 0);
        let r = 0.02;
        template.trackTemplates[2] = new TrackTemplate(template);
        template.trackTemplates[2].trackpoints = [
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(0, -r, 0))),
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, Math.sqrt(3) / 2, 0), new BABYLON.Vector3(1, 0, 0)),
        ];
        template.trackTemplates[2].drawStartTip = true;
        template.trackTemplates[2].drawEndTip = true;
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
/// <reference path="../machine/MachinePart.ts"/>
class Loop extends MachinePart {
    constructor(machine, i, j, k, w = 1, d = 1, n = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        if (!isFinite(n)) {
            n = 1;
        }
        n = Math.min(n, 2 * d);
        let partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0) + "." + n.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(w, d, n, mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0) + "." + n.toFixed(0);
        template.angleSmoothSteps = 20;
        template.w = w;
        template.h = 4;
        template.d = d;
        template.n = n;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
        template.xExtendable = true;
        template.zExtendable = true;
        template.nExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].onNormalEvaluated = (n => {
            n.z = 0;
            n.normalize();
        });
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, -template.h * tileHeight, 0), Tools.V3Dir(90))
        ];
        let nLoops = n;
        let xCenterStart = 0;
        let xCenterEnd = tileWidth * (template.w - 1);
        let r = tileWidth * 0.5 * 0.7;
        let depthStart = 0.013;
        let depthEnd = -0.013;
        if (d > 1) {
            depthStart = 0;
            depthEnd = -tileDepth * (template.d - 1);
        }
        for (let n = 0; n <= 8 * nLoops; n++) {
            let f = (n + 0) / (8 * nLoops);
            let a = 2 * Math.PI * n / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(sina * r + f * (xCenterEnd - xCenterStart) + xCenterStart, r * 1 - cosa * r - template.h * tileHeight, f * (depthEnd - depthStart) + depthStart)));
        }
        template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), -template.h * tileHeight, -tileDepth * (template.d - 1)), Tools.V3Dir(90)));
        let points = template.trackTemplates[0].trackpoints.map(tp => { return tp.position.clone(); });
        let f = 3;
        for (let n = 0; n < 2; n++) {
            let smoothedPoints = [...points].map(p => { return p.clone(); });
            for (let i = 1; i < smoothedPoints.length - 1; i++) {
                smoothedPoints[i].copyFrom(points[i - 1]).addInPlace(points[i].scale(f)).addInPlace(points[i + 1]).scaleInPlace(1 / (2 + f));
            }
            points = smoothedPoints;
        }
        for (let i = 0; i < points.length; i++) {
            template.trackTemplates[0].trackpoints[i].position.copyFrom(points[i]);
        }
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
class MachinePartWithOriginDestination extends MachinePart {
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
class Ramp extends MachinePartWithOriginDestination {
    constructor(machine, i, j, k, w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        let partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        template.w = w;
        template.h = h;
        template.d = d;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
        template.xExtendable = true;
        template.yExtendable = true;
        template.zExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), -tileHeight * template.h, -tileDepth * (template.d - 1)), dir)
        ];
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
    recreateFromOriginDestination(origin, dest, machine) {
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
}
class UTurnSharp extends MachinePart {
    constructor(machine, i, j, k, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        let partName = "uturnsharp";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "uturnsharp";
        template.d = 2;
        template.angleSmoothSteps = 50;
        template.mirrorX = mirrorX,
            template.mirrorZ = mirrorZ;
        template.xMirrorable = true;
        template.zMirrorable = true;
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-0.075, 0, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0.0193, -0.0084, 0.000)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0.0518, 0.0057, -0.0046)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0.0638, 0.0181, -0.0256)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0.0586, 0.0099, -0.0448)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0.0454, -0.0086, -0.0519)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0.0262, -0.0253, -0.0454)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-0.0152, -0.0301, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-0.075, -0.03, 0), new BABYLON.Vector3(-1, 0, 0))
        ];
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
class Snake extends MachinePartWithOriginDestination {
    constructor(machine, i, j, k, w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        let partName = "snake-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "snake-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        template.angleSmoothSteps = 20;
        template.w = w;
        template.h = h;
        template.d = d;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
        template.xExtendable = true;
        template.yExtendable = true;
        template.zExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        template.trackTemplates[0] = new TrackTemplate(template);
        let start = new BABYLON.Vector3(-tileWidth * 0.5, 0, 0);
        let end = new BABYLON.Vector3(tileWidth * (template.w - 0.5), -tileHeight * template.h, -tileDepth * (template.d - 1));
        let tanVector = dir.scale(BABYLON.Vector3.Distance(start, end));
        template.trackTemplates[0].trackpoints = [new TrackPoint(template.trackTemplates[0], start, dir, undefined, undefined, 1)];
        for (let i = 1; i < (w + 1); i++) {
            let p1 = BABYLON.Vector3.Hermite(start, tanVector, end, tanVector, i / ((w + 1)));
            if (i % 2 === 1) {
                p1.z -= 0.03;
            }
            else {
                p1.z += 0.03;
            }
            template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], p1));
        }
        template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], end, dir, undefined, 1));
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
    recreateFromOriginDestination(origin, dest, machine) {
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
        return new Snake(machine, i, j, k, w, h, d, mirrorX, mirrorZ);
    }
}
/// <reference path="../machine/MachinePart.ts"/>
class Spiral extends MachinePart {
    constructor(machine, i, j, k, w = 1, h = 1, n = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        let partName = "spiral-" + w.toFixed(0) + "." + h.toFixed(0) + "." + n.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(w, h, n, mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "spiral-" + w.toFixed(0) + "." + h.toFixed(0) + "." + n.toFixed(0);
        template.angleSmoothSteps = 50;
        template.w = w;
        template.h = h;
        template.d = 3;
        template.n = n;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
        template.xExtendable = true;
        template.yExtendable = true;
        template.nExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].preferedStartBank = -Math.PI / 10 * (template.mirrorX ? -1 : 1);
        template.trackTemplates[0].preferedEndBank = -Math.PI / 10 * (template.mirrorX ? -1 : 1);
        template.trackTemplates[0].onNormalEvaluated = (n => {
            n.copyFromFloats(0, 1, 0);
        });
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), Tools.V3Dir(90))
        ];
        let nSpirals = template.n;
        let xCenterStart = 0;
        let xCenterEnd = tileWidth * (template.w - 1);
        let r = tileWidth * 0.5 * 0.8;
        let heightStart = 0;
        let heightEnd = -tileHeight * template.h;
        for (let n = 0; n <= 6 * nSpirals; n++) {
            let f = n / (6 * nSpirals);
            let a = 2 * Math.PI * n / 6;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            let dir;
            if (n === 0 || n === 6 * nSpirals) {
                dir = BABYLON.Vector3.Right();
            }
            template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(f * (xCenterEnd - xCenterStart) + xCenterStart + sina * r, f * (heightEnd - heightStart) + heightStart, (cosa - 1) * r), dir));
        }
        template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), heightEnd, 0), Tools.V3Dir(90)));
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        console.log(template.trackTemplates[0].preferedStartBank);
        console.log(template.trackTemplates[0].preferedEndBank);
        return template;
    }
}
class Split extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k);
        this._animatePivot = Mummu.AnimationFactory.EmptyNumberCallback;
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
        let partName = "split";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        let rCurb = Split.pivotL * 0.3;
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
        wireHorizontal0.path = [new BABYLON.Vector3(-Split.pivotL, 0, -dz), new BABYLON.Vector3(Split.pivotL, 0, -dz)];
        let wireHorizontal1 = new Wire(this);
        wireHorizontal1.parent = this.pivot;
        wireHorizontal1.path = [new BABYLON.Vector3(-Split.pivotL, 0, dz), new BABYLON.Vector3(Split.pivotL, 0, dz)];
        let wireVertical0 = new Wire(this);
        wireVertical0.parent = this.pivot;
        wireVertical0.path = [new BABYLON.Vector3(0, Split.pivotL, -dz), new BABYLON.Vector3(0, rCurb * 0.3, -dz)];
        let wireVertical1 = new Wire(this);
        wireVertical1.parent = this.pivot;
        wireVertical1.path = [new BABYLON.Vector3(0, Split.pivotL, dz), new BABYLON.Vector3(0, rCurb * 0.3, dz)];
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
    static GenerateTemplate(mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "split";
        template.h = 2;
        template.xMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let pEndLeft = new BABYLON.Vector3(0, -tileHeight, 0);
        pEndLeft.x -= Split.pivotL / Math.SQRT2;
        pEndLeft.y += Split.pivotL / Math.SQRT2;
        let pEndRight = pEndLeft.multiplyByFloats(-1, 1, 1);
        let dirEnd = Tools.V3Dir(135);
        let nEnd = Tools.V3Dir(45);
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], pEndLeft.subtract(dirEnd.scale(0.001)), dirEnd)
        ];
        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight * template.h, 0), dir),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(-Split.pivotL / Math.SQRT2, -tileHeight - Split.pivotL / Math.SQRT2 - 0.0015 * 1.5, 0), dirEnd.multiplyByFloats(1, -1, 1)),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(Split.pivotL / Math.SQRT2, -tileHeight - Split.pivotL / Math.SQRT2 - 0.0015 * 1.5, 0), dirEnd),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight * template.h, 0), dir)
        ];
        template.trackTemplates[2] = new TrackTemplate(template);
        template.trackTemplates[2].trackpoints = [
            new TrackPoint(template.trackTemplates[2], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), dir.multiplyByFloats(-1, 1, 1)),
            new TrackPoint(template.trackTemplates[2], pEndLeft.subtract(dirEnd.scale(0.001)).multiplyByFloats(-1, 1, 1), dirEnd.multiplyByFloats(-1, 1, 1))
        ];
        template.trackTemplates[3] = new TrackTemplate(template);
        template.trackTemplates[3].trackpoints = [
            new TrackPoint(template.trackTemplates[3], pEndLeft.add(Tools.V3Dir(315, 0.02)).add(Tools.V3Dir(45, 0.014)), Tools.V3Dir(150), new BABYLON.Vector3(0, -1, 0)),
            new TrackPoint(template.trackTemplates[3], new BABYLON.Vector3(0, -0.003, 0)),
            new TrackPoint(template.trackTemplates[3], pEndRight.add(Tools.V3Dir(45, 0.02)).add(Tools.V3Dir(315, 0.014)), Tools.V3Dir(30), new BABYLON.Vector3(0, -1, 0))
        ];
        template.trackTemplates[3].drawStartTip = true;
        template.trackTemplates[3].drawEndTip = true;
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
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
                        if (local.x > ball.radius * 0.5 && local.x < Split.pivotL) {
                            this._moving = true;
                            this._animatePivot(-Math.PI / 4, 0.3 / this.game.currentTimeFactor).then(() => {
                                this._moving = false;
                            });
                            return;
                        }
                        else if (local.x > -Split.pivotL && local.x < -ball.radius * 0.5) {
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
Split.pivotL = 0.025;
class UTurn extends MachinePart {
    constructor(machine, i, j, k, h, d, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        let partName = "uturn-" + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(h, d, mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "uturn-" + h.toFixed(0) + "." + d.toFixed(0);
        template.angleSmoothSteps = 50;
        template.w = Math.ceil(d / 3),
            template.h = h,
            template.d = d,
            template.mirrorX = mirrorX,
            template.mirrorZ = mirrorZ;
        template.yExtendable = true;
        template.zExtendable = true;
        template.minD = 2;
        template.xMirrorable = true;
        template.zMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let r = tileDepth * (d - 1) * 0.5;
        let x0 = -tileWidth * 0.5 + 2 * Math.PI * r / 6;
        let r2 = r / Math.SQRT2;
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].preferedStartBank = -Math.PI / 10 * (template.mirrorX ? -1 : 1);
        template.trackTemplates[0].preferedEndBank = -Math.PI / 10 * (template.mirrorX ? -1 : 1);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(x0 + 0, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(x0 + r2, 0, -r + r2)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(x0 + r, 0, -r)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(x0 + r2, 0, -r - r2)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(x0 + 0, 0, -2 * r)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, -2 * r), new BABYLON.Vector3(-1, 0, 0)),
        ];
        for (let n = 0; n < template.trackTemplates[0].trackpoints.length; n++) {
            let f = n / (template.trackTemplates[0].trackpoints.length - 1);
            template.trackTemplates[0].trackpoints[n].position.y = -f * template.h * tileHeight;
        }
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
class Wall extends MachinePart {
    constructor(machine, i, j, k, h = 4, d = 1, mirrorX) {
        super(machine, i, j, k);
        if (d === 3) {
            h = Math.max(h, 5);
        }
        if (d === 4) {
            h = Math.max(h, 7);
        }
        let partName = "wall-" + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        this.generateWires();
    }
    static GenerateTemplate(h, d, mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "wall-" + h.toFixed(0) + "." + d.toFixed(0);
        template.angleSmoothSteps = 50;
        template.w = Math.ceil(d / 3),
            template.h = h,
            template.d = d,
            template.mirrorX = mirrorX,
            template.yExtendable = true;
        template.zExtendable = true;
        template.minH = 4;
        template.minD = 2;
        template.maxD = 4;
        template.xMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let r = 0.5 * tileDepth * (template.d - 1);
        let zEnd = -tileDepth * (template.d - 1);
        let yStart = -tileHeight * template.h;
        template.trackTemplates[0] = new TrackTemplate(template);
        let center = new BABYLON.Vector3(-tileWidth * 0.5, 0, zEnd * 0.5);
        template.trackTemplates[0].onNormalEvaluated = ((n, p) => {
            let dx = Math.abs(p.x) / (tileWidth * 0.5);
            let dy = Math.abs(p.y - yStart) / (r * 0.5);
            let d = Math.sqrt(dx * dx + dy * dy);
            let f = Nabu.MinMax(1 - d, 0, 1);
            let newN = center.subtract(p).normalize();
            n.scaleInPlace(1 - f).addInPlace(newN.scaleInPlace(f));
        });
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, yStart, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0, yStart, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, yStart + r, 0), new BABYLON.Vector3(0, 1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, -r, 0), new BABYLON.Vector3(0, 1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, 0, zEnd * 0.5), new BABYLON.Vector3(0, 0, -1)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, -r, zEnd), new BABYLON.Vector3(0, -1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, yStart + r, zEnd), new BABYLON.Vector3(0, -1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0, yStart, zEnd), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, yStart, zEnd), new BABYLON.Vector3(-1, 0, 0)),
        ];
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
class Wave extends MachinePartWithOriginDestination {
    constructor(machine, i, j, k, w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        super(machine, i, j, k);
        let partName = "wave-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    static GenerateTemplate(w = 1, h = 1, d = 1, mirrorX, mirrorZ) {
        let template = new MachinePartTemplate();
        template.partName = "wave-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        template.w = w;
        template.h = h;
        template.d = d;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
        template.xExtendable = true;
        template.yExtendable = true;
        template.zExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        template.trackTemplates[0] = new TrackTemplate(template);
        let start = new BABYLON.Vector3(-tileWidth * 0.5, 0, 0);
        let end = new BABYLON.Vector3(tileWidth * (template.w - 0.5), -tileHeight * template.h, -tileDepth * (template.d - 1));
        let tanVector = dir.scale(BABYLON.Vector3.Distance(start, end));
        template.trackTemplates[0].trackpoints = [new TrackPoint(template.trackTemplates[0], start, dir, undefined, undefined, 1)];
        for (let i = 1; i < 2 * (w + 1); i++) {
            let p1 = BABYLON.Vector3.Hermite(start, tanVector, end, tanVector, i / (2 * (w + 1)));
            if (i % 2 === 1) {
                p1.y -= 0.008;
            }
            else {
                p1.y += 0.008;
            }
            template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], p1));
        }
        template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], end, dir, undefined, 1));
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
    recreateFromOriginDestination(origin, dest, machine) {
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
        return new Wave(machine, i, j, k, w, h, d, mirrorX, mirrorZ);
    }
}
class QuarterNote extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k);
        this.notes = [];
        this.tings = [];
        this.noteMesh = [];
        let partName = "quarter";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        this.generateWires();
        let x = 1;
        if (mirrorX) {
            x = -1;
        }
        let ting = BABYLON.MeshBuilder.CreateGround("ting", { width: 0.015, height: 0.06 });
        ting.position.x = -0.2 * tileWidth * x;
        ting.position.y = -0.015;
        ting.rotation.z = Math.PI / 24 * x;
        ting.parent = this;
        this.tings.push(ting);
        let index = QuarterNote.index;
        QuarterNote.index++;
        if (QuarterNote.index >= QuarterNote.NoteNames.length) {
            QuarterNote.index = 0;
        }
        let note = new BABYLON.Sound("note-" + index, "./datas/sounds/notes/" + QuarterNote.NoteNames[index] + ".mp3", this.getScene(), undefined, { loop: false, autoplay: false });
        this.notes.push(note);
        let tile = BABYLON.MeshBuilder.CreateBox("tile", { width: 0.015, height: 0.005, depth: 0.06 });
        tile.material = machine.game.steelMaterial;
        tile.position.copyFrom(ting.position);
        tile.rotation.copyFrom(ting.rotation);
        tile.parent = this;
        tile.computeWorldMatrix(true);
        tile.position.subtractInPlace(tile.up.scale(0.0026));
    }
    static GenerateTemplate(mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "quarter";
        template.h = 1;
        template.mirrorX = mirrorX;
        template.xMirrorable = true;
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
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.3, 0 - 0.01, 0), Tools.V3Dir(130))
        ];
        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.1, -0.015, 0), Tools.V3Dir(70)),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(tileWidth * 0.3, -tileHeight * template.h, 0), dir),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight * template.h, 0), dir)
        ];
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
QuarterNote.NoteNames = [
    "c3",
    "d3",
    "e3",
    "f3",
    "g3",
    "a4",
    "b4",
    "c4",
];
QuarterNote.index = 0;
class DoubleNote extends MachinePart {
    constructor(machine, i, j, k, mirrorX) {
        super(machine, i, j, k);
        this.notes = [];
        this.tings = [];
        this.noteMesh = [];
        let partName = "double";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        this.generateWires();
        let x = 1;
        if (mirrorX) {
            x = -1;
        }
        let ting = BABYLON.MeshBuilder.CreateGround("ting", { width: 0.015, height: 0.06 });
        ting.position.x = -0.2 * tileWidth * x;
        ting.position.y = -0.015;
        ting.rotation.z = Math.PI / 9 * x;
        ting.parent = this;
        this.tings.push(ting);
        let index = QuarterNote.index;
        QuarterNote.index++;
        if (QuarterNote.index >= QuarterNote.NoteNames.length) {
            QuarterNote.index = 0;
        }
        let note = new BABYLON.Sound("note-" + index, "./datas/sounds/notes/" + QuarterNote.NoteNames[index] + ".mp3", this.getScene(), undefined, { loop: false, autoplay: false });
        this.notes.push(note);
        let tile = BABYLON.MeshBuilder.CreateBox("tile", { width: 0.015, height: 0.005, depth: 0.06 });
        tile.material = machine.game.steelMaterial;
        tile.position.copyFrom(ting.position);
        tile.rotation.copyFrom(ting.rotation);
        tile.parent = this;
        tile.computeWorldMatrix(true);
        tile.position.subtractInPlace(tile.up.scale(0.0026));
        let ting2 = BABYLON.MeshBuilder.CreateGround("ting2", { width: 0.015, height: 0.06 });
        ting2.position.x = -0.05 * tileWidth * x;
        ting2.position.y = -0.001;
        ting2.rotation.z = -Math.PI / 10 * x;
        ting2.parent = this;
        this.tings.push(ting2);
        index = QuarterNote.index;
        QuarterNote.index++;
        if (QuarterNote.index >= QuarterNote.NoteNames.length) {
            QuarterNote.index = 0;
        }
        let note2 = new BABYLON.Sound("note-" + index, "./datas/sounds/notes/" + QuarterNote.NoteNames[index] + ".mp3", this.getScene(), undefined, { loop: false, autoplay: false });
        this.notes.push(note2);
        let tile2 = BABYLON.MeshBuilder.CreateBox("tile2", { width: 0.015, height: 0.005, depth: 0.06 });
        tile2.material = machine.game.steelMaterial;
        tile2.position.copyFrom(ting2.position);
        tile2.rotation.copyFrom(ting2.rotation);
        tile2.parent = this;
        tile2.computeWorldMatrix(true);
        tile2.position.subtractInPlace(tile2.up.scale(0.0026));
    }
    static GenerateTemplate(mirrorX) {
        let template = new MachinePartTemplate();
        template.partName = "double";
        template.h = 1;
        template.mirrorX = mirrorX;
        template.xMirrorable = true;
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
        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(-tileWidth * 0.3, 0 - 0.01, 0), Tools.V3Dir(130))
        ];
        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * 0, -tileHeight * template.h + 0.02, 0), Tools.V3Dir(110)),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(tileWidth * 0.5, -tileHeight * template.h, 0), dir)
        ];
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        template.initialize();
        return template;
    }
}
class Painting extends BABYLON.Mesh {
    constructor(room, paintingName, size = 0.5) {
        super("painting-" + paintingName);
        this.room = room;
        this.paintingName = paintingName;
        this.size = size;
        this.layerMask = 0x10000000;
    }
    async instantiate() {
        let vertexDatas = await this.room.game.vertexDataLoader.get("./meshes/paint-support.babylon");
        if (vertexDatas && vertexDatas[0]) {
            vertexDatas[0].applyToMesh(this);
        }
        if (vertexDatas && vertexDatas[1]) {
            let steel = new BABYLON.Mesh("steel");
            vertexDatas[1].applyToMesh(steel);
            steel.parent = this;
            steel.material = this.room.game.steelMaterial;
            steel.layerMask = 0x10000000;
        }
        if (vertexDatas && vertexDatas[2]) {
            let lightedPlane = new BABYLON.Mesh("lighted-plane");
            vertexDatas[2].applyToMesh(lightedPlane);
            lightedPlane.parent = this;
            lightedPlane.material = this.room.game.paintingLight;
            lightedPlane.layerMask = 0x10000000;
        }
        let texture = new BABYLON.Texture("./datas/textures/" + this.paintingName + ".jpg");
        return new Promise(resolve => {
            let checkTextureLoaded = () => {
                if (texture.isReady()) {
                    let w = texture._texture.baseWidth;
                    let h = texture._texture.baseHeight;
                    let r = w / h;
                    let wMesh = this.size;
                    let hMesh = this.size;
                    if (r >= 1) {
                        hMesh /= r;
                    }
                    else {
                        wMesh *= r;
                    }
                    let body = BABYLON.MeshBuilder.CreateBox("paint-body", { width: wMesh + 0.04, height: hMesh + 0.04, depth: 0.04 });
                    body.layerMask = 0x10000000;
                    body.position.y = 1.2;
                    body.parent = this;
                    let plane = BABYLON.MeshBuilder.CreatePlane("paint", { width: wMesh, height: hMesh });
                    plane.layerMask = 0x10000000;
                    let mat = new BABYLON.StandardMaterial(this.name + "-material");
                    mat.diffuseTexture = texture;
                    mat.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);
                    plane.material = mat;
                    plane.position.y = 1.2;
                    plane.position.z = 0.021;
                    plane.rotation.y = Math.PI;
                    plane.parent = this;
                    resolve();
                }
                else {
                    requestAnimationFrame(checkTextureLoaded);
                }
            };
            checkTextureLoaded();
        });
    }
}
class Room {
    constructor(game) {
        this.game = game;
        this.ground = new BABYLON.Mesh("room-ground");
        this.ground.layerMask = 0x10000000;
        this.ground.position.y = -2;
        this.ground.receiveShadows = true;
        let groundMaterial = new BABYLON.StandardMaterial("ground-material");
        groundMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/concrete.png");
        groundMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3f4c52");
        groundMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.ground.material = groundMaterial;
        this.wall = new BABYLON.Mesh("room-wall");
        this.wall.layerMask = 0x10000000;
        this.wall.material = this.game.whiteMaterial;
        this.wall.parent = this.ground;
        this.frame = new BABYLON.Mesh("room-frame");
        this.frame.layerMask = 0x10000000;
        this.frame.material = this.game.steelMaterial;
        this.frame.parent = this.ground;
        this.light1 = new BABYLON.HemisphericLight("light1", (new BABYLON.Vector3(1, 3, 0)).normalize(), this.game.scene);
        this.light1.groundColor.copyFromFloats(0.3, 0.3, 0.3);
        this.light1.intensity = 0.2;
        this.light1.includeOnlyWithLayerMask = 0x10000000;
        this.light2 = new BABYLON.HemisphericLight("light2", (new BABYLON.Vector3(-1, 3, 0)).normalize(), this.game.scene);
        this.light2.groundColor.copyFromFloats(0.3, 0.3, 0.3);
        this.light2.intensity = 0.2;
        this.light2.includeOnlyWithLayerMask = 0x10000000;
    }
    async instantiate() {
        console.log("Room instantiate");
        let vertexDatas = await this.game.vertexDataLoader.get("./meshes/room.babylon");
        vertexDatas[0].applyToMesh(this.ground);
        vertexDatas[1].applyToMesh(this.wall);
        vertexDatas[2].applyToMesh(this.frame);
        let paintingNames = [
            "bilbao_1",
            "bilbao_2",
            "bilbao_3",
            "flower_1",
            "flower_2",
            "flower_3",
            "flower_4",
            "fort_william_1",
            "glasgow_1",
        ];
        let n = 0;
        let randomPainting = () => {
            return paintingNames[n++];
        };
        let paint1 = new Painting(this, randomPainting(), 0.8);
        paint1.instantiate();
        paint1.position.copyFromFloats(4, 0, 4);
        paint1.rotation.y = -0.75 * Math.PI;
        paint1.parent = this.ground;
        let paint11 = new Painting(this, randomPainting(), 0.8);
        paint11.instantiate();
        paint11.position.copyFromFloats(2.8, 0, 4.5);
        paint11.rotation.y = -Math.PI;
        paint11.parent = this.ground;
        let paint2 = new Painting(this, randomPainting(), 0.8);
        paint2.instantiate();
        paint2.position.copyFromFloats(4, 0, -4);
        paint2.rotation.y = -0.25 * Math.PI;
        paint2.parent = this.ground;
        let paint21 = new Painting(this, randomPainting(), 0.8);
        paint21.instantiate();
        paint21.position.copyFromFloats(2.8, 0, -4.5);
        paint21.parent = this.ground;
        let paint3 = new Painting(this, randomPainting(), 0.8);
        paint3.instantiate();
        paint3.position.copyFromFloats(-4, 0, -4);
        paint3.rotation.y = 0.25 * Math.PI;
        paint3.parent = this.ground;
        let paint31 = new Painting(this, randomPainting(), 0.8);
        paint31.instantiate();
        paint31.position.copyFromFloats(-4.5, 0, -2.8);
        paint31.rotation.y = 0.5 * Math.PI;
        paint31.parent = this.ground;
        let paint32 = new Painting(this, randomPainting(), 0.8);
        paint32.instantiate();
        paint32.position.copyFromFloats(-2.8, 0, -4.5);
        paint32.parent = this.ground;
        let paint4 = new Painting(this, randomPainting(), 0.8);
        paint4.instantiate();
        paint4.position.copyFromFloats(-4, 0, 4);
        paint4.rotation.y = 0.75 * Math.PI;
        paint4.parent = this.ground;
        let paint41 = new Painting(this, randomPainting(), 0.8);
        paint41.instantiate();
        paint41.position.copyFromFloats(-2.8, 0, 4.5);
        paint41.rotation.y = Math.PI;
        paint41.parent = this.ground;
        let sculpt1 = new Sculpt(this, this.game.steelMaterial);
        sculpt1.instantiate();
        sculpt1.position.copyFromFloats(4.5, 0, 0);
        sculpt1.rotation.y = -0.5 * Math.PI;
        sculpt1.parent = this.ground;
        let sculpt2 = new Sculpt(this, this.game.copperMaterial);
        sculpt2.instantiate();
        sculpt2.position.copyFromFloats(-4.5, 0, 0);
        sculpt2.rotation.y = 0.5 * Math.PI;
        sculpt2.parent = this.ground;
        if (this.game.machine) {
            this.setGroundHeight(this.game.machine.baseMeshMinY - 0.8);
        }
    }
    setGroundHeight(h) {
        if (this.ground) {
            this.ground.position.y = h;
        }
    }
    dispose() {
        this.ground.dispose();
        this.frame.dispose();
        this.wall.dispose();
        this.light1.dispose();
        this.light2.dispose();
    }
}
class Sculpt extends BABYLON.Mesh {
    constructor(room, mat) {
        super("sculpt");
        this.room = room;
        this.mat = mat;
        this.layerMask = 0x10000000;
    }
    async instantiate() {
        let vertexDatas = await this.room.game.vertexDataLoader.get("./meshes/museum-stand-decoy.babylon");
        if (vertexDatas && vertexDatas[0]) {
            vertexDatas[0].applyToMesh(this);
        }
        if (vertexDatas && vertexDatas[1]) {
            let steel = new BABYLON.Mesh("steel");
            vertexDatas[1].applyToMesh(steel);
            steel.parent = this;
            steel.material = this.mat;
            steel.layerMask = 0x10000000;
        }
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
        this.material = game.handleMaterial;
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
    highlight() {
        this.renderOutline = true;
        this.outlineColor = BABYLON.Color3.White();
        this.outlineWidth = 0.05 * this.size;
    }
    unlit() {
        this.renderOutline = false;
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
        earlyAccessDisclaimer.innerHTML = "> v0.1.4 early access";
        this.container.appendChild(earlyAccessDisclaimer);
    }
}
class MainMenu {
    constructor(game) {
        this.game = game;
        this.xCount = 1;
        this.yCount = 1;
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
        let requestedTileCount = 0;
        let requestedFullLines = 0;
        let panels = [];
        let elements = this.container.querySelectorAll("menu-panel");
        for (let i = 0; i < elements.length; i++) {
            let panel = elements[i];
            panels[i] = panel;
            panel.w = parseInt(panel.getAttribute("w"));
            panel.h = parseInt(panel.getAttribute("h"));
            let area = panel.w * panel.h;
            requestedTileCount += area;
        }
        let rect = this.container.getBoundingClientRect();
        let containerW = rect.width;
        let containerH = rect.height;
        let min = 0;
        let ok = false;
        let emptyLinesBottom = 0;
        while (!ok) {
            ok = true;
            min++;
            let bestValue = 0;
            for (let xC = min; xC <= 10; xC++) {
                for (let yC = min; yC <= 10; yC++) {
                    let count = xC * yC;
                    if (count >= requestedTileCount) {
                        let w = containerW / xC;
                        let h = containerH / (yC + requestedFullLines);
                        let area = w * h;
                        let squareness = Math.min(w / h, h / w);
                        let value = area * squareness;
                        if (value > bestValue) {
                            this.xCount = xC;
                            this.yCount = yC + requestedFullLines;
                            bestValue = value;
                        }
                    }
                }
            }
            let grid = [];
            for (let y = 0; y <= this.yCount; y++) {
                grid[y] = [];
                for (let x = 0; x <= this.xCount; x++) {
                    grid[y][x] = (x < this.xCount && y < this.yCount);
                }
            }
            for (let n = 0; n < panels.length; n++) {
                let panel = panels[n];
                panel.x = -1;
                panel.y = -1;
                for (let line = 0; line < this.yCount && panel.x === -1; line++) {
                    for (let col = 0; col < this.xCount && panel.x === -1; col++) {
                        let fit = true;
                        for (let x = 0; x < panel.w; x++) {
                            for (let y = 0; y < panel.h; y++) {
                                fit = fit && grid[line + y][col + x];
                            }
                        }
                        if (fit) {
                            panel.x = col;
                            panel.y = line;
                            for (let x = 0; x < panel.w; x++) {
                                for (let y = 0; y < panel.h; y++) {
                                    grid[line + y][col + x] = false;
                                }
                            }
                        }
                    }
                }
                if (panel.x === -1) {
                    ok = false;
                }
            }
            if (ok) {
                let empty = true;
                emptyLinesBottom = 0;
                for (let y = this.yCount - 1; y > 0 && empty; y--) {
                    for (let x = 0; x < this.xCount && empty; x++) {
                        if (!grid[y][x]) {
                            empty = false;
                        }
                    }
                    if (empty) {
                        emptyLinesBottom++;
                    }
                }
            }
        }
        let tileW = containerW / this.xCount;
        let tileH = containerH / this.yCount;
        let m = Math.min(tileW, tileH) / 15;
        for (let i = 0; i < panels.length; i++) {
            let panel = panels[i];
            panel.style.display = "block";
            panel.style.width = (panel.w * tileW - 2 * m).toFixed(0) + "px";
            panel.style.height = (panel.h * tileH - 2 * m).toFixed(0) + "px";
            panel.style.position = "absolute";
            panel.computedLeft = (panel.x * tileW + m);
            if (panel.style.display != "none") {
                panel.style.left = panel.computedLeft.toFixed(0) + "px";
            }
            panel.computedTop = (panel.y * tileH + m + emptyLinesBottom * 0.5 * tileH);
            panel.style.top = panel.computedTop.toFixed(0) + "px";
            let label = panel.querySelector(".label");
            if (label) {
                label.style.fontSize = (tileW / 4).toFixed(0) + "px";
            }
            let label2 = panel.querySelector(".label-2");
            if (label2) {
                label2.style.fontSize = (tileW / 7).toFixed(0) + "px";
            }
        }
        this.container.querySelector("menu-panel.create").style.backgroundImage = "url(./datas/icons/create.png)";
        let demoPanels = this.container.querySelectorAll("menu-panel.demo");
        demoPanels.forEach((e, i) => {
            if (e instanceof HTMLElement) {
                e.style.backgroundImage = "url(./datas/icons/demo-" + (i + 1).toFixed(0) + ".png)";
            }
        });
    }
}
class MainMenuPanel extends HTMLElement {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.w = 1;
        this.h = 1;
        this.computedTop = 0;
        this.computedLeft = 0;
    }
    get top() {
        return parseFloat(this.style.top);
    }
    set top(v) {
        if (this) {
            this.style.top = v.toFixed(1) + "px";
        }
    }
    get left() {
        return parseFloat(this.style.left);
    }
    set left(v) {
        if (this) {
            this.style.left = v.toFixed(1) + "px";
        }
    }
}
customElements.define("menu-panel", MainMenuPanel);
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
        this.autoGraphicQMinus = document.getElementById("auto-graphic-q-minus");
        this.autoGraphicQMinus.onclick = () => {
            this.game.config.setAutoGraphicQ(!this.game.config.autoGraphicQ);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
        };
        this.autoGraphicQValue = document.getElementById("auto-graphic-q-val");
        this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
        this.autoGraphicQPlus = document.getElementById("auto-graphic-q-plus");
        this.autoGraphicQPlus.onclick = () => {
            this.game.config.setAutoGraphicQ(!this.game.config.autoGraphicQ);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
        };
        this.graphicQMinus = document.getElementById("graphic-q-minus");
        this.graphicQMinus.onclick = () => {
            this.game.config.setAutoGraphicQ(false);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
            this.game.config.setGraphicQ(this.game.config.graphicQ - 1);
            this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        };
        this.graphicQValue = document.getElementById("graphic-q-val");
        this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        this.graphicQPlus = document.getElementById("graphic-q-plus");
        this.graphicQPlus.onclick = () => {
            this.game.config.setAutoGraphicQ(false);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
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
        this.gridOpacityMinus = document.getElementById("grid-opacity-minus");
        this.gridOpacityMinus.onclick = () => {
            this.game.config.setGridOpacity(this.game.config.gridOpacity - 0.05);
            this.gridOpacityValue.innerText = this.game.config.gridOpacity.toFixed(2);
        };
        this.gridOpacityValue = document.getElementById("grid-opacity-val");
        this.gridOpacityValue.innerText = this.game.config.gridOpacity.toFixed(2);
        this.gridOpacityPlus = document.getElementById("grid-opacity-plus");
        this.gridOpacityPlus.onclick = () => {
            this.game.config.setGridOpacity(this.game.config.gridOpacity + 0.05);
            this.gridOpacityValue.innerText = this.game.config.gridOpacity.toFixed(2);
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
        this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
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
                //this.game.machineEditor.currentLayer++;
            }
            else {
                //this.game.machineEditor.currentLayer--;
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
