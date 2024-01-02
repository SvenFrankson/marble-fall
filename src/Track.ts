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

        this.wires[0].path = [new BABYLON.Vector3(0, 0, 0.005), new BABYLON.Vector3(0.5, -0.05, 0.005)];
        this.wires[1].path = [new BABYLON.Vector3(0, 0, -0.005), new BABYLON.Vector3(0.5, -0.05, -0.005)];

        this.wires.forEach(wire => {
            wire.path.forEach(point => {
                point.addInPlace(this.position);
            })
        });

        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}