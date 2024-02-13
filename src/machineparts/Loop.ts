/// <reference path="../machine/MachinePart.ts"/>

class Loop extends MachinePart {


    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k);

        let partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }

    public static GenerateTemplate(w: number, d: number, mirrorX: boolean, mirrorZ: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0);

        template.w = w;
        template.h = 4 * w;
        template.d = d;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
            
        template.xExtendable = true;
        template.zExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, - template.h * tileHeight, 0), dir)
        ];

        let nLoops = 2;
        let rStart = tileWidth * 0.5 * w * 0.7;
        let rEnd = rStart;
        for (let n = 0; n <= 8 * nLoops; n++) {
            let f = Math.floor(n / 8) / nLoops;
            let r = rStart * (1 - f) + rEnd * f;
            let a = 2 * Math.PI * n / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);

            template.trackTemplates[0].trackpoints.push(
                new TrackPoint(
                    template.trackTemplates[0],
                    new BABYLON.Vector3(
                        sina * r + 0.5 * tileWidth * (template.w - 1),
                        r * 1 - cosa * r - template.h * tileHeight,
                        - tileDepth * (template.d - 1) * (n + 0) / (8 * nLoops)
                    )
                )
            );
        }

        template.trackTemplates[0].trackpoints.push(
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), - template.h * tileHeight, - tileDepth * (template.d - 1)), dir)
        );

        let points = template.trackTemplates[0].trackpoints.map(tp => { return tp.position.clone() });
        let f = 3;
        for (let n = 0; n < 2; n++) {
            let smoothedPoints = [...points].map(p => { return p.clone() });
            for (let i = 1; i < smoothedPoints.length - 1; i++) {
                smoothedPoints[i].copyFrom(points[i - 1]).addInPlace(points[i].scale(f)).addInPlace(points[i + 1]).scaleInPlace(1 / (2 + f));
            }
            points = smoothedPoints;
        }

        for (let i = 0; i < points.length; i++) {
            template.trackTemplates[0].trackpoints[i].position.copyFrom(points[i]);
        }

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }
}
