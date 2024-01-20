class Join extends MachinePart {

    constructor(machine: Machine, i: number, j: number, mirror?: boolean) {
        super(machine, i, j, 1, 1, mirror);
        this.partName = "join";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let dirJoin = (new BABYLON.Vector3(-2, -1, 0)).normalize();
        let nJoin = (new BABYLON.Vector3(-1, 2, 0)).normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - tileHeight * this.h, 0), n, dir)
        ];

        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), n, dir.scale(-1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.25, - tileHeight * 0.25, 0), nJoin, dirJoin)
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class Splitter extends MachinePart {

    public pivot: BABYLON.Mesh;
    public pivotL: number = 0.025;

    constructor(machine: Machine, i: number, j: number, mirror?: boolean) {
        super(machine, i, j, 1, 2, mirror);
        this.partName = "splitter";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let rCurb = this.pivotL * 0.5;
        let pEnd = new BABYLON.Vector3(0, - tileHeight, 0);
        pEnd.x -= this.pivotL / Math.SQRT2;
        pEnd.y += this.pivotL / Math.SQRT2;
        let dirEnd = (new BABYLON.Vector3(1, -1, 0)).normalize();
        let nEnd = (new BABYLON.Vector3(1, 1, 0)).normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this.tracks[0], pEnd.subtract(dirEnd.scale(0.001)), nEnd, dirEnd)
        ];

        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight * this.h, 0), n, dir),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(0, - tileHeight * (this.h - 0.1), 0), n, dir),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, - tileHeight * this.h, 0), n, dir)
        ];

        this.tracks[2] = new Track(this);
        this.tracks[2].trackpoints = [
            new TrackPoint(this.tracks[2], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), n.multiplyByFloats(-1, 1, 1), dir.multiplyByFloats(-1, 1, 1)),
            new TrackPoint(this.tracks[2], pEnd.subtract(dirEnd.scale(0.001)).multiplyByFloats(-1, 1, 1), nEnd.multiplyByFloats(-1, 1, 1), dirEnd.multiplyByFloats(-1, 1, 1))
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.pivot = BABYLON.MeshBuilder.CreateBox("pivot", { width: 0.005, height: 0.005, depth: this.wireGauge * 1.2 });
        this.pivot.position.copyFromFloats(0, - tileHeight, 0);
        this.pivot.parent = this;
        this.pivot.rotation.z = Math.PI / 4;
        let dz = this.wireGauge * 0.5;

        let wireLeft0 = new Wire(this);
        wireLeft0.parent = this.pivot;
        wireLeft0.path = [new BABYLON.Vector3(-this.pivotL, 0, - dz), new BABYLON.Vector3(0, 0, -dz)];

        let curbLeft0 = new Wire(this);
        curbLeft0.wireSize = this.wireSize * 0.8;
        curbLeft0.parent = this.pivot;
        curbLeft0.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbLeft0.path.push(new BABYLON.Vector3(- rCurb + cosa * rCurb, rCurb - sina * rCurb, - dz));
        }

        let wireLeft1 = new Wire(this);
        wireLeft1.parent = this.pivot;
        wireLeft1.path = [new BABYLON.Vector3(-this.pivotL, 0, dz), new BABYLON.Vector3(0, 0, dz)];

        let curbLeft1 = new Wire(this);
        curbLeft1.wireSize = this.wireSize * 0.8;
        curbLeft1.parent = this.pivot;
        curbLeft1.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbLeft1.path.push(new BABYLON.Vector3(- rCurb + cosa * rCurb, rCurb - sina * rCurb, dz));
        }

        let wireUp0 = new Wire(this);
        wireUp0.parent = this.pivot;
        wireUp0.path = [new BABYLON.Vector3(0, this.pivotL, - dz), new BABYLON.Vector3(0, 0, -dz)];

        let wireUp1 = new Wire(this);
        wireUp1.parent = this.pivot;
        wireUp1.path = [new BABYLON.Vector3(0, this.pivotL, dz), new BABYLON.Vector3(0, 0, dz)];

        let wireRight0 = new Wire(this);
        wireRight0.parent = this.pivot;
        wireRight0.path = [new BABYLON.Vector3(this.pivotL, 0, - dz), new BABYLON.Vector3(0, 0, -dz)];
        
        let curbRight0 = new Wire(this);
        curbRight0.wireSize = this.wireSize * 0.8;
        curbRight0.parent = this.pivot;
        curbRight0.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbRight0.path.push(new BABYLON.Vector3(rCurb - cosa * rCurb, rCurb - sina * rCurb, -dz));
        }

        let wireRight1 = new Wire(this);
        wireRight1.parent = this.pivot;
        wireRight1.path = [new BABYLON.Vector3(this.pivotL, 0, dz), new BABYLON.Vector3(0, 0, dz)];

        let curbRight1 = new Wire(this);
        curbRight1.wireSize = this.wireSize * 0.8;
        curbRight1.parent = this.pivot;
        curbRight1.path = [];
        for (let i = 0; i <= 8; i++) {
            let a = Math.PI / 2 * i / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            curbRight1.path.push(new BABYLON.Vector3(rCurb - cosa * rCurb, rCurb - sina * rCurb, dz));
        }

        this.wires = [wireLeft0, wireLeft1, curbLeft0, curbLeft1, wireUp0, wireUp1, wireRight0, wireRight1, curbRight0, curbRight1];

        this.generateWires();
    }

    public update(dt: number): void {
        let hasMoved = false;
        this.machine.balls.forEach(ball => {
            if (BABYLON.Vector3.Distance(ball.position, this.pivot.absolutePosition) < 0.05) {
                let local = BABYLON.Vector3.TransformCoordinates(ball.position, this.pivot.getWorldMatrix().clone().invert());
                if (local.y < ball.radius * 1.2) {
                    if (local.x > 0 && local.x < this.pivotL) {
                        this.pivot.rotation.z -= 0.1;
                        this.pivot.rotation.z = Math.max(Math.min(this.pivot.rotation.z, Math.PI / 4), - Math.PI / 4)
                        hasMoved = true;
                    }
                    else if (local.x > - this.pivotL && local.x < 0) {
                        this.pivot.rotation.z += 0.1;
                        this.pivot.rotation.z = Math.max(Math.min(this.pivot.rotation.z, Math.PI / 4), - Math.PI / 4)
                        hasMoved = true;
                    }
                }
            }
        });
        if (hasMoved) {
            this.wires.forEach(wire => {
                wire.recomputeAbsolutePath();
            })
        }
    }
}