class Track extends BABYLON.Mesh {

    public wires: Wire[];

    constructor() {
        super("track");

        this.wires = [
            new Wire(),
            new Wire()
        ]
    }

    public async instantiate(): Promise<void> {

        this.wires[0].path = [new BABYLON.Vector3(0, 0, 0.006), new BABYLON.Vector3(0.2, -0.02, 0.006)];
        this.wires[1].path = [new BABYLON.Vector3(0, 0, -0.006), new BABYLON.Vector3(0.2, -0.02, -0.006)];

        this.wires.forEach(wire => {
            wire.path.forEach(point => {
                BABYLON.Vector3.TransformCoordinatesToRef(point, this.getWorldMatrix(), point);
            })
        });

        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}