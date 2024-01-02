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

    constructor() {
        super("ball");
    }

    public async instantiate(): Promise<void> {
        let data = BABYLON.CreateSphereVertexData({ diameter: this.size });
        data.applyToMesh(this);

        this.getScene().onBeforeRenderObservable.add(this.update);
    }

    public update = () => {
        let m = this.mass;
        let dt = 0.015;
        dt = dt / 8;

        let weight = new BABYLON.Vector3(0, -9 * m, 0);
        let reactions = BABYLON.Vector3.Zero();
        let reactionsCount = 0;

        let forcedDisplacement = BABYLON.Vector3.Zero();

        Wire.Instances.forEach(wire => {
            let col = Mummu.SphereCapsuleIntersection(this.position, this.radius, wire.path[0], wire.path[1], wire.size * 0.5);
            if (col.hit) {
                // Move away from collision
                forcedDisplacement.addInPlace(col.normal.scale(col.depth));
                // Cancel depth component of speed
                this.velocity.addInPlace(col.normal.scale(- BABYLON.Vector3.Dot(this.velocity, col.normal)));
                // Add ground reaction
                let reaction = col.normal.scale(- BABYLON.Vector3.Dot(weight, col.normal));
                reactions.addInPlace(reaction);
                reactionsCount++;
            }
        });
        this.position.addInPlace(forcedDisplacement);
        if (reactionsCount > 0) {
            reactions.scale(1 / reactionsCount);
        }

        let acceleration = weight.add(reactions).scaleInPlace(1 / m);
        this.velocity.addInPlace(acceleration.scale(dt));
        this.position.addInPlace(this.velocity.scale(dt));
    }
}