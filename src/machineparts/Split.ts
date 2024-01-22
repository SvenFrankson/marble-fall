class Split extends MachinePart {

    private _animatePivot = Mummu.AnimationFactory.EmptyNumberCallback;

    public pivot: BABYLON.Mesh;
    public pivotL: number = 0.025;

    constructor(machine: Machine, i: number, j: number, mirror?: boolean) {
        super(machine, i, j, 1, 2, mirror);
        this.partName = "split";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let rCurb = this.pivotL * 0.3;
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
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(- this.pivotL / Math.SQRT2, - tileHeight - this.pivotL / Math.SQRT2 - this.wireSize * 1.5, 0), BABYLON.Vector3.Up(), dirEnd.multiplyByFloats(1, -1, 1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(this.pivotL / Math.SQRT2, - tileHeight - this.pivotL / Math.SQRT2 - this.wireSize * 1.5, 0), BABYLON.Vector3.Up(), dirEnd),
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

        let anchorDatas: BABYLON.VertexData[] = [];
        let tmpVertexData = BABYLON.CreateCylinderVertexData({ height: 0.001, diameter: 0.01 });
        let q = BABYLON.Quaternion.Identity();
        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
        Mummu.RotateVertexDataInPlace(tmpVertexData, q);
        Mummu.TranslateVertexDataInPlace(tmpVertexData, new BABYLON.Vector3(0, 0, 0.015));
        anchorDatas.push(tmpVertexData);

        let axisZMin = - this.wireGauge * 0.6;
        let axisZMax = 0.015 - 0.001 * 0.5;
        tmpVertexData = BABYLON.CreateCylinderVertexData({ height: axisZMax - axisZMin, diameter: 0.001 });
        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
        Mummu.RotateVertexDataInPlace(tmpVertexData, q);
        Mummu.TranslateVertexDataInPlace(tmpVertexData, new BABYLON.Vector3(0, 0, (axisZMax + axisZMin) * 0.5));
        anchorDatas.push(tmpVertexData);

        let anchor = new BABYLON.Mesh("anchor");
        anchor.position.copyFromFloats(0, - tileHeight, 0);
        anchor.parent = this;
        anchor.material = this.game.steelMaterial;
        Mummu.MergeVertexDatas(...anchorDatas).applyToMesh(anchor);

        this.pivot = new BABYLON.Mesh("pivot");
        this.pivot.position.copyFromFloats(0, - tileHeight, 0);
        this.pivot.material = this.game.copperMaterial;
        this.pivot.parent = this;
        this.pivot.rotation.z = Math.PI / 4;
        let dz = this.wireGauge * 0.5;
        this.game.vertexDataLoader.get("./meshes/splitter-arrow.babylon").then(datas => {
            if (datas[0]) {
                let data = Mummu.CloneVertexData(datas[0]);
                Mummu.TranslateVertexDataInPlace(data, new BABYLON.Vector3(0, 0, axisZMin));
                data.applyToMesh(this.pivot);
            }
        })

        let wireHorizontal0 = new Wire(this);
        wireHorizontal0.parent = this.pivot;
        wireHorizontal0.path = [new BABYLON.Vector3(-this.pivotL, 0, - dz), new BABYLON.Vector3(this.pivotL, 0, -dz)];

        let wireHorizontal1 = new Wire(this);
        wireHorizontal1.parent = this.pivot;
        wireHorizontal1.path = [new BABYLON.Vector3(-this.pivotL, 0, dz), new BABYLON.Vector3(this.pivotL, 0, dz)];

        let wireVertical0 = new Wire(this);
        wireVertical0.parent = this.pivot;
        wireVertical0.path = [new BABYLON.Vector3(0, this.pivotL, - dz), new BABYLON.Vector3(0, rCurb * 0.3, -dz)];

        let wireVertical1 = new Wire(this);
        wireVertical1.parent = this.pivot;
        wireVertical1.path = [new BABYLON.Vector3(0, this.pivotL, dz), new BABYLON.Vector3(0, rCurb * 0.3, dz)];

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

        this.wires = [wireHorizontal0, wireHorizontal1, curbLeft0, curbLeft1, wireVertical0, wireVertical1, curbRight0, curbRight1];

        this.generateWires();

        this._animatePivot = Mummu.AnimationFactory.CreateNumber(this, this.pivot.rotation, "z", () => {
            if (!this.machine.playing) {
                this.pivot.rotation.z = Math.PI / 4;
            }
            this.wires.forEach(wire => {
                wire.recomputeAbsolutePath();
            })
        }, false, Nabu.Easing.easeInSquare);
        this.machine.onStopCallbacks.push(this.reset);
        this.reset();
    }
        
    public dispose(): void {
        super.dispose();
        this.machine.onStopCallbacks.remove(this.reset);
    }

    public reset = () => {
        this._moving = false;
        this.pivot.rotation.z = Math.PI / 4;
    }

    private _moving: boolean = false;
    public update(dt: number): void {
        if (!this._moving) {
            for (let i = 0; i < this.machine.balls.length; i++) {
                let ball = this.machine.balls[i];
                if (BABYLON.Vector3.Distance(ball.position, this.pivot.absolutePosition) < 0.05) {
                    let local = BABYLON.Vector3.TransformCoordinates(ball.position, this.pivot.getWorldMatrix().clone().invert());
                    if (local.y < ball.radius * 0.9) {
                        if (local.x > ball.radius * 0.5 && local.x < this.pivotL) {
                            this._moving = true;
                            this._animatePivot(- Math.PI / 4, 0.3 / this.game.timeFactor).then(() => {
                                this._moving = false;
                            });
                            return;
                        }
                        else if (local.x > - this.pivotL && local.x < - ball.radius * 0.5) {
                            this._moving = true;
                            this._animatePivot(Math.PI / 4, 0.3 / this.game.timeFactor).then(() => {
                                this._moving = false;
                            });
                            return;
                        }
                    }
                }
            }
        }
    }
}