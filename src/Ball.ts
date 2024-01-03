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
    public velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    constructor(public game: Game) {
        super("ball");
    }

    public async instantiate(): Promise<void> {
        let data = BABYLON.CreateSphereVertexData({ diameter: this.size });
        data.applyToMesh(this);

        this.getScene().onBeforeRenderObservable.add(this.update);
    }

    private _timer: number = 0;
    public update = () => {
        let gameDt = this.getScene().deltaTime / 1000;
        this._timer += gameDt * this.game.timeFactor;

        while (this._timer > 0) {
            let m = this.mass;
            let dt = this.game.physicDT;
            this._timer -= dt;
    
            let weight = new BABYLON.Vector3(0, -9 * m, 0);
            let reactions = BABYLON.Vector3.Zero();
            let reactionsCount = 0;
    
            let forcedDisplacement = BABYLON.Vector3.Zero();
            let canceledSpeed = BABYLON.Vector3.Zero();
    
            Wire.Instances.forEach(wire => {
                let col = Mummu.SphereCapsuleIntersection(this.position, this.radius, wire.path[0], wire.path[1], wire.size * 0.5);
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
                    let reaction = col.normal.scale(- BABYLON.Vector3.Dot(weight, col.normal));
                    reactions.addInPlace(reaction);
                    reactionsCount++;
                }
            });
            if (reactionsCount > 0) {
                reactions.scaleInPlace(1 / reactionsCount);
                canceledSpeed.scaleInPlace(1 / reactionsCount);
                forcedDisplacement.scaleInPlace(1 / reactionsCount);
            }
            this.velocity.subtractInPlace(canceledSpeed);
            this.position.addInPlace(forcedDisplacement);
    
            let acceleration = weight.add(reactions).scaleInPlace(1 / m);
            this.velocity.addInPlace(acceleration.scale(dt));
            this.position.addInPlace(this.velocity.scale(dt));
        }
    }
}