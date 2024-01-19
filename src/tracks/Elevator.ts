class Elevator extends MachinePart {

    public boxesCount: number = 4;
    public rWheel: number = 0.015;
    public boxX: number[] = [];
    public boxes: BABYLON.Mesh[] = [];
    public wheels: BABYLON.Mesh[] = [];
    public cable: BABYLON.Mesh;

    constructor(machine: Machine, i: number, j: number, public h: number = 1, mirror?: boolean) {
        super(machine, i, j, 1, h, mirror);
        this.boxesCount
        this.yExtendable = true;
        this.partName = "elevator-" + h.toFixed(0);
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
        let nRight = new BABYLON.Vector3(- 1, 1, 0);
        nRight.normalize();

        this.trackPoints = [
            [
                new TrackPoint(this, new BABYLON.Vector3(
                    - tileWidth * 0.5,
                    - tileHeight * this.h,
                    0
                ), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(
                    - tileWidth * 0.1,
                    - tileHeight * (this.h + 0.1),
                    0
                ), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(
                    0,
                    - tileHeight * (this.h + 0.25),
                    0
                ), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(
                    0 + 0.01,
                    - tileHeight * (this.h + 0.25) + 0.01,
                    0
                ), dir.scale(-1), n),
                new TrackPoint(this, new BABYLON.Vector3(
                    0 + 0.01,
                    0 - tileHeight,
                    0
                ), dir.scale(-1), n),
                new TrackPoint(this, new BABYLON.Vector3(
                    -0.005,
                    0.035 - tileHeight,
                    0
                ), (new BABYLON.Vector3(-1, -1, 0)).normalize(), (new BABYLON.Vector3(-1, 1, 0)).normalize())
            ],
            [
                new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight, 0), nLeft, dirLeft),
                new TrackPoint(this, new BABYLON.Vector3(- 0.008, - tileHeight * 0.5, 0), nRight, dirRight)
            ]
        ];
        
        this.wires.push(new Wire(this), new Wire(this));

        let x = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
            x = - 1;
        }

        this.generateWires();

        this.wheels = [
            new BABYLON.Mesh("wheel-0"),
            new BABYLON.Mesh("wheel-1")
        ]
        this.wheels[0].position.copyFromFloats(0.030 * x, - tileHeight * (this.h + 0.25), 0);
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
        })

        this.l = Math.abs(this.wheels[1].position.y - this.wheels[0].position.y);
        this.p = 2 * Math.PI * this.rWheel;
        this.chainLength = 2 * this.l + this.p;

        this.boxesCount = Math.round(this.chainLength / 0.08);

        for (let i = 0; i < this.boxesCount; i++) {
            let box = new BABYLON.Mesh("box");
            box.rotationQuaternion = BABYLON.Quaternion.Identity();
            box.parent = this;
    
            let rampWire0 = new Wire(this);
            let rRamp = this.wireGauge * 0.35;
            rampWire0.path = [new BABYLON.Vector3(-0.019 * x, 0.001, rRamp)];
            let nRamp = 12;
            for (let i = 0; i <= nRamp; i++) {
                let a = i / nRamp * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                rampWire0.path.push(new BABYLON.Vector3((sina * rRamp - rRamp - 0.0005) * x, 0, cosa * rRamp));
            }
            rampWire0.path.push(new BABYLON.Vector3(- 0.019 * x, 0.001, - rRamp));
            rampWire0.parent = box;
    
            this.boxes.push(box);
            this.wires.push(rampWire0);
        }

        let rCable = 0.00075;
        let nCable = 8;
        let cableShape: BABYLON.Vector3[] = [];
        for (let i = 0; i < nCable; i++) {
            let a = i / nCable * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            cableShape[i] = new BABYLON.Vector3(cosa * rCable, sina * rCable, 0);
        }
        let x0 = this.wheels[0].position.x;
        let y0 = this.wheels[0].position.y;
        let pathCable: BABYLON.Vector3[] = [];
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

        this.machine.onStopCallbacks.push(this.reset);
        this.reset();
    }

    public dispose(): void {
        super.dispose();
        this.machine.onStopCallbacks.remove(this.reset);
    }
    
    public reset = () => {
        for (let i = 0; i < this.boxesCount; i++) {
            this.boxX[i] = i / this.boxesCount * this.chainLength;
            this.update(0);
        }
    }

    public l: number = 0;
    public p: number = 0;
    public chainLength: number = 0;
    public speed: number = 0.04; // in m/s

    public update(dt: number): void {
        let dx = this.speed * dt * this.game.timeFactor;
        let x = 1;
        if (this.mirror) {
            x = - 1;
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
            this.wires[4 + i].recomputeAbsolutePath();
        }
        
        let deltaAngle = dx / this.p * 2 * Math.PI * x;
        this.wheels[0].rotation.z -= deltaAngle;
        this.wheels[1].rotation.z -= deltaAngle;
    }
}