class Ball extends BABYLON.Mesh {

    public size: number = 0.014;
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

    constructor(public game: Game) {
        super("ball");
    }

    public async instantiate(): Promise<void> {
        let data = BABYLON.CreateSphereVertexData({ diameter: this.size });
        data.applyToMesh(this);

        this.material = this.game.steelMaterial;

        this.getScene().onBeforeRenderObservable.add(this.update);
    }

    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        
        this.getScene().onBeforeRenderObservable.removeCallback(this.update);
    }

    private _timer: number = 0;
    public update = () => {
        let gameDt = this.getScene().deltaTime / 1000;
        if (isFinite(gameDt)) {
            this._timer += gameDt * this.game.timeFactor;
            this._timer = Math.min(this._timer, 1);
        }

        while (this._timer > 0) {
            let m = this.mass;
            let dt = this.game.physicDT;
            this._timer -= dt;
    
            let weight = new BABYLON.Vector3(0, -9 * m, 0);
            let reactions = BABYLON.Vector3.Zero();
            let reactionsCount = 0;
    
            let forcedDisplacement = BABYLON.Vector3.Zero();
            let canceledSpeed = BABYLON.Vector3.Zero();
    
            this.game.tracks.forEach(track => {
                if (Mummu.AABBAABBIntersect(
                    this.position.x - this.radius,
                    this.position.x + this.radius,
                    this.position.y - this.radius,
                    this.position.y + this.radius,
                    this.position.z - this.radius,
                    this.position.z + this.radius,
                    track.AABBMin.x - this.radius,
                    track.AABBMax.x + this.radius,
                    track.AABBMin.y - this.radius,
                    track.AABBMax.y + this.radius,
                    track.AABBMin.z - this.radius,
                    track.AABBMax.z + this.radius
                )) {
                    track.wires.forEach(wire => {
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
                            let reaction = col.normal.scale(- col.depth);
                            reactions.addInPlace(reaction);
                            reactionsCount++;
                        }
                    });
                }
            });
            if (reactionsCount > 0) {
                reactions.scaleInPlace(1 / reactionsCount);
                canceledSpeed.scaleInPlace(1 / reactionsCount);
                forcedDisplacement.scaleInPlace(1 / reactionsCount);
            }
            this.velocity.subtractInPlace(canceledSpeed);
            this.position.addInPlace(forcedDisplacement);

            let friction = this.velocity.scale(-1).scaleInPlace(0.001);
    
            let acceleration = weight.add(reactions).add(friction).scaleInPlace(1 / m);
            this.velocity.addInPlace(acceleration.scale(dt));
            
            this.position.addInPlace(this.velocity.scale(dt));
        }

        if (this.position.y < - 10000) {
            this.dispose();
        }
    }
}