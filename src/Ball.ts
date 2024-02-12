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

    public marbleChocSound: Sound;
    public marbleLoopSound: Sound;

    constructor(public positionZero: BABYLON.Vector3, public machine: Machine) {
        super("ball");
        this.marbleChocSound = new Sound({
            fileName: "./datas/sounds/marble-choc.wav",
            loop: false
        });
        this.marbleLoopSound = new Sound({
            fileName: "./datas/sounds/loop.wav",
            loop: true
        });
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

        this.reset();
    }

    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        
        this.marbleLoopSound.volume = 0;
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
        this.marbleLoopSound.volume = 0;
    }

    private _timer: number = 0;
    public strReaction: number = 0;
    public update(dt: number): void {
        if (this.position.y < - 10) {
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
                        let col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5);
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