/// <reference path="../machine/MachinePart.ts"/>

class Loop extends MachinePart {
    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k, {
            w: w,
            h: 4 * w,
            d: d,
            mirrorX: mirrorX,
            mirrorZ: mirrorZ,
        });
        this.xExtendable = true;
        this.zExtendable = true;
        this.xMirrorable = true;
        this.zMirrorable = true;

        this.partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();


        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, - this.h * tileHeight, 0), dir)
        ];

        let nLoops = 1;
        let rStart = tileWidth * 0.5 * w * 0.7;
        let rEnd = rStart / (nLoops * 0.7);
        for (let n = 0; n <= 8 * nLoops; n++) {
            let f = Math.floor(n / 8) / nLoops;
            let r = rStart * (1 - f) + rEnd * f;
            let a = 2 * Math.PI * n / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);

            this.tracks[0].trackpoints.push(
                new TrackPoint(
                    this.tracks[0],
                    new BABYLON.Vector3(
                        sina * r + 0.5 * tileWidth * (this.w - 1),
                        r * 1 - cosa * r - this.h * tileHeight,
                        - tileDepth * (this.d - 1) * (n + 0) / (8 * nLoops)
                    )
                )
            );
        }

        this.tracks[0].trackpoints.push(
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - this.h * tileHeight, - tileDepth * (this.d - 1)), dir)
        );

        let points = this.tracks[0].trackpoints.map(tp => { return tp.position.clone() });
        let f = 3;
        for (let n = 0; n < 2; n++) {
            let smoothedPoints = [...points].map(p => { return p.clone() });
            for (let i = 1; i < smoothedPoints.length - 1; i++) {
                smoothedPoints[i].copyFrom(points[i - 1]).addInPlace(points[i].scale(f)).addInPlace(points[i + 1]).scaleInPlace(1 / (2 + f));
            }
            points = smoothedPoints;
        }

        for (let i = 0; i < points.length; i++) {
            this.tracks[0].trackpoints[i].position.copyFrom(points[i]);
        }

        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            this.mirrorZTrackPointsInPlace();
        }

        this.generateWires();
    }
}
