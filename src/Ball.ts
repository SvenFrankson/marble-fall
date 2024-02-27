class BallGhost extends BABYLON.Mesh {

    constructor(public ball: Ball) {
        super(ball.name + "-ghost");
    }
}

class Ball extends BABYLON.Mesh {

    public get game(): Game {
        return this.machine.game;
    }

    public size: number = 0.016;
    public get radius(): number {
        return this.size * 0.5;
    }
    public get volume(): number {
        return 4 / 3 * Math.PI * Math.pow(this.size * 0.5, 3);
    }
    public get mass(): number {
        return 7850 * this.volume;
    }
    public get sectionArea(): number {
        return Math.PI * this.radius * this.radius;
    }
    public velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    public _showPositionZeroGhost: boolean = false;
    public get showPositionZeroGhost(): boolean {
        return this._showPositionZeroGhost;
    }
    public setShowPositionZeroGhost(v: boolean): void {
        this._showPositionZeroGhost = v;
        if (this.positionZeroGhost) {
            this.positionZeroGhost.isVisible = v;
        }
    }
    public positionZeroGhost: BABYLON.Mesh;
    public selectedMesh: BABYLON.Mesh;

    public setPositionZero(p: BABYLON.Vector3): void {
        this.positionZero.copyFrom(p);
        this.positionZeroGhost.position.copyFrom(p);
    }

    public get k(): number {
        return - Math.round(this.positionZero.z / tileDepth);
    }
    public set k(v: number) {
        this.positionZero.z = - Math.round(v) * tileDepth;
        this.positionZeroGhost.position.copyFrom(this.positionZero);
    }

    public marbleChocSound: BABYLON.Sound;
    public railBumpSound: BABYLON.Sound;
    public marbleLoopSound: BABYLON.Sound;

    constructor(public positionZero: BABYLON.Vector3, public machine: Machine) {
        super("ball");
        this.marbleChocSound = new BABYLON.Sound("marble-choc-sound", "./datas/sounds/marble-choc.wav", this.getScene(), undefined, { loop: false, autoplay: false });
        this.railBumpSound = new BABYLON.Sound("rail-bump-sound", "./datas/sounds/rail-bump.wav", this.getScene(), undefined, { loop: false, autoplay: false });
        this.marbleLoopSound = new BABYLON.Sound("marble-loop-sound", "./datas/sounds/marble-loop.wav", this.getScene(), undefined, { loop: true, autoplay: true });
        this.marbleLoopSound.setVolume(0);
    }

    public select(): void {
        this.selectedMesh.isVisible = true;
    }

    public unselect(): void {
        this.selectedMesh.isVisible = false;
    }
    
    public setIsVisible(isVisible: boolean): void {
        this.isVisible = isVisible;
        this.getChildMeshes().forEach(m => {
            m.isVisible = isVisible;
        })
    }

    public async instantiate(): Promise<void> {
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
        let points: BABYLON.Vector3[] = [];
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

        this.game.shadowGenerator.addShadowCaster(this, false);

        this.reset();
    }

    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
        this.game.shadowGenerator.removeShadowCaster(this, false);
        
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        
        this.marbleLoopSound.setVolume(0, 0.1);
        this.marbleLoopSound.pause();
        if (this.positionZeroGhost) {
            this.positionZeroGhost.dispose();
        }
        let index = this.machine.balls.indexOf(this);
        if (index > - 1) {
            this.machine.balls.splice(index, 1);
        }
    }

    public reset(): void {
        this.position.copyFrom(this.positionZero);
        this.velocity.copyFromFloats(0, 0, 0);
        this._timer = 0;
        this.marbleLoopSound.setVolume(0, 0.1);
    }

    private _lastWires: Wire[] = [];
    private _lastWireIndexes: number[] = [- 1, - 1];
    private _pouet: number = 0;
    public getLastIndex(wire: Wire): number {
        if (this._lastWires[0] === wire) {
            return this._lastWireIndexes[0];
        }
        if (this._lastWires[1] === wire) {
            return this._lastWireIndexes[1];
        }
        return -1;
    }
    public setLastHit(wire: Wire, index: number): void {
        if (this._lastWires[0] === wire) {
            this._lastWireIndexes[0] = index;
            return;
        }
        if (this._lastWires[1] === wire) {
            this._lastWireIndexes[1] = index;
            return;
        }
        this._pouet = (this._pouet + 1) % 2;
        this._lastWires[this._pouet] = wire;
        this._lastWireIndexes[this._pouet] = index;
    }

    private _timer: number = 0;
    public strReaction: number = 0;
    public update(dt: number): void {
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
                if (Mummu.SphereAABBCheck(
                    this.position, this.radius,
                    part.AABBMin.x - this.radius,
                    part.AABBMax.x + this.radius,
                    part.AABBMin.y - this.radius,
                    part.AABBMax.y + this.radius,
                    part.AABBMin.z - this.radius,
                    part.AABBMax.z + this.radius
                )) {
                    part.allWires.forEach(wire => {
                        let index = this.getLastIndex(wire);
                        let col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5, true, index);
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
            let canceledSpeedLength = canceledSpeed.length();
            if (canceledSpeedLength > 0.22) {
                let f = Nabu.MinMax((canceledSpeedLength - 0.22) / 0.5, 0, 1);
                let v = (1 - f) * 0.01 + f * 0.03;
                if (!this.railBumpSound.isPlaying) {
                    console.log(canceledSpeedLength.toFixed(3) + " " + v.toFixed(3));
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