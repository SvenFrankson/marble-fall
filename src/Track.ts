class Track extends BABYLON.Mesh {

    public wires: Wire[];

    constructor() {
        super("track");

        this.wires = [
            new Wire(),
            new Wire()
        ]
    }

    public async instantiate(test: boolean = false): Promise<void> {

        if (test) {
            this.wires[0].path = [new BABYLON.Vector3(0, 0, 0.006), new BABYLON.Vector3(0.05, 0, 0.006), new BABYLON.Vector3(0.106, 0, -0.05), new BABYLON.Vector3(0.05, 0, -0.106), new BABYLON.Vector3(0, 0, -0.106)];
            Mummu.CatmullRomPathInPlace(this.wires[0].path);
            Mummu.CatmullRomPathInPlace(this.wires[0].path);
            Mummu.CatmullRomPathInPlace(this.wires[0].path);
            Mummu.CatmullRomPathInPlace(this.wires[0].path);
            //Mummu.CatmullRomPathInPlace(this.wires[0].path);
            this.wires[1].path = [new BABYLON.Vector3(0, 0, -0.006), new BABYLON.Vector3(0.05, -0.001, -0.006), new BABYLON.Vector3(0.094, -0.002, -0.05), new BABYLON.Vector3(0.05, -0.001, -0.094), new BABYLON.Vector3(0, 0, -0.094)];
            Mummu.CatmullRomPathInPlace(this.wires[1].path);
            Mummu.CatmullRomPathInPlace(this.wires[1].path);
            Mummu.CatmullRomPathInPlace(this.wires[1].path);
            Mummu.CatmullRomPathInPlace(this.wires[1].path);
            //Mummu.CatmullRomPathInPlace(this.wires[1].path);
        }
        else {
            this.wires[0].path = [new BABYLON.Vector3(0, 0, 0.006), new BABYLON.Vector3(0.2, -0.02, 0.006)];
            this.wires[1].path = [new BABYLON.Vector3(0, 0, -0.006), new BABYLON.Vector3(0.2, -0.02, -0.006)];
        }

        this.wires.forEach(wire => {
            wire.path.forEach(point => {
                BABYLON.Vector3.TransformCoordinatesToRef(point, this.getWorldMatrix(), point);
            })
        });

        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}