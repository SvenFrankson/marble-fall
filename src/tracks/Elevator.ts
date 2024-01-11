class ElevatorDown extends Track {

    public boxesCount: number = 5;
    public boxX: number[] = [];
    public boxes: BABYLON.Mesh[] = [];
    public wheels: BABYLON.Mesh[] = [];

    constructor(game: Game, i: number, j: number, h: number = 1, mirror?: boolean) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        
        this.deltaJ = h - 1;

        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(
                - tileWidth * 0.5,
                - tileHeight * (this.deltaJ + 1),
                0
            ), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(
                0,
                - tileHeight * (this.deltaJ + 1.25),
                0
            ), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(
                0 + 0.01,
                - tileHeight * (this.deltaJ + 1.25) + 0.01,
                0
            ), dir.scale(-1), n),
            new TrackPoint(this, new BABYLON.Vector3(
                0 + 0.01,
                0,
                0
            ), dir.scale(-1), n),
            new TrackPoint(this, new BABYLON.Vector3(
                -0.02,
                0.04,
                0
            ), new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(this, new BABYLON.Vector3(
                -0.03,
                0.04,
                0
            ), new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(-1, 0, 0)),
        ];

        for (let i = 0; i < this.boxesCount; i++) {
            let box = new BABYLON.Mesh("box");
            box.rotationQuaternion = BABYLON.Quaternion.Identity();
            box.parent = this;
    
            let rampWire0 = new Wire(this);
            let rRamp = this.wireGauge * 0.35;
            rampWire0.path = [new BABYLON.Vector3(-0.024, 0.001, rRamp)];
            let nRamp = 12;
            for (let i = 0; i <= nRamp; i++) {
                let a = i / nRamp * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                rampWire0.path.push(new BABYLON.Vector3(sina * rRamp - rRamp - 0.001, 0, cosa * rRamp));
            }
            rampWire0.path.push(new BABYLON.Vector3(-0.024, 0.001, - rRamp));
            rampWire0.parent = box;
    
            this.boxes.push(box);
            this.wires.push(rampWire0);
        }

        this.wheels = [
            new BABYLON.Mesh("wheel-0"),
            new BABYLON.Mesh("wheel-1")
        ]
        this.wheels[0].position.copyFromFloats(0.030, - tileHeight * (this.deltaJ + 1.25), 0);
        this.wheels[0].parent = this;
        this.wheels[0].material = this.game.steelMaterial;

        this.wheels[1].position.copyFromFloats(0.030, 0.04, 0);
        this.wheels[1].parent = this;
        this.wheels[1].material = this.game.steelMaterial;

        this.game.vertexDataLoader.get("./meshes/wheel.babylon").then(vertexDatas => {
            let vertexData = vertexDatas[0];
            if (vertexData) {
                vertexData.applyToMesh(this.wheels[0]);
                vertexData.applyToMesh(this.wheels[1]);
            }
        })

        this.l = Math.abs(this.wheels[1].position.y - this.wheels[0].position.y);
        this.p = 2 * Math.PI * 0.015;
        this.chainLength = 2 * this.l + this.p;

        for (let i = 0; i < this.boxesCount; i++) {
            this.boxX[i] = i / this.boxesCount * this.chainLength;
        }

        this.generateWires();
    }

    public l: number = 0;
    public p: number = 0;
    public chainLength: number = 0;

    public update(): void {
        for (let i = 0; i < this.boxesCount; i++) {
            this.boxX[i] += 0.0005;
            while (this.boxX[i] > this.chainLength) {
                this.boxX[i] -= this.chainLength;
            }
    
            if (this.boxX[i] < this.l) {
                this.boxes[i].position.x = this.wheels[0].position.x - 0.015;
                this.boxes[i].position.y = this.wheels[0].position.y + this.boxX[i];
                Mummu.QuaternionFromXZAxisToRef(BABYLON.Axis.X, BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            else if (this.boxX[i] < this.l + 0.5 * this.p) {
                let a = (this.boxX[i] - this.l) / (0.5 * this.p) * Math.PI;
                this.boxes[i].position.x = this.wheels[1].position.x - Math.cos(a) * 0.015;
                this.boxes[i].position.y = this.wheels[1].position.y + Math.sin(a) * 0.015;
                let right = this.wheels[1].position.subtract(this.boxes[i].position).normalize();
                Mummu.QuaternionFromXZAxisToRef(right, BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            else if (this.boxX[i] < 2 * this.l + 0.5 * this.p) {
                this.boxes[i].position.x = this.wheels[0].position.x + 0.015;
                this.boxes[i].position.y = this.wheels[1].position.y - (this.boxX[i] - (this.l + 0.5 * this.p));
                Mummu.QuaternionFromXZAxisToRef(BABYLON.Axis.X.scale(-1), BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            else {
                let a = (this.boxX[i] - (2 * this.l + 0.5 * this.p)) / (0.5 * this.p) * Math.PI;
                this.boxes[i].position.x = this.wheels[0].position.x + Math.cos(a) * 0.015;
                this.boxes[i].position.y = this.wheels[0].position.y - Math.sin(a) * 0.015;
                let right = this.wheels[0].position.subtract(this.boxes[i].position).normalize();
                Mummu.QuaternionFromXZAxisToRef(right, BABYLON.Axis.Z, this.boxes[i].rotationQuaternion);
            }
            this.wires[2 + i].recomputeAbsolutePath();
        }
        
        this.wheels[0].rotation.z -= 0.01;
        this.wheels[1].rotation.z -= 0.01;
        this.wires[2].recomputeAbsolutePath();
    }
}

class ElevatorUp extends Track {

    constructor(game: Game, i: number, j: number, mirror?: boolean) {
        super(game, i, j);
        let dirLeft = new BABYLON.Vector3(1, 0, 0);
        dirLeft.normalize();
        let nLeft = new BABYLON.Vector3(0, 1, 0);
        nLeft.normalize();
        
        let dirRight = new BABYLON.Vector3(1, 1, 0);
        dirRight.normalize();
        let nRight = new BABYLON.Vector3(- 1, 1, 0);
        nRight.normalize();
        
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight, 0), nLeft, dirLeft),
            new TrackPoint(this, new BABYLON.Vector3(- 0.01, - tileHeight * 0.5, 0), nRight, dirRight)
        ];

        this.generateWires();
    }
}