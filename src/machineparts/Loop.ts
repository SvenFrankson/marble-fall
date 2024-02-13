/// <reference path="../machine/MachinePart.ts"/>

class Loop extends MachinePart {


    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, d: number = 1, n: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k);

        if (!isFinite(n)) {
            n = 1;
        }

        let partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0) + "." + n.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }

    public static GenerateTemplate(w: number, d: number, n: number, mirrorX: boolean, mirrorZ: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "loop-" + w.toFixed(0) + "." + d.toFixed(0) + "." + n.toFixed(0);

        template.w = w;
        template.h = 4;
        template.d = d;
        template.n = n;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
            
        template.xExtendable = true;
        template.zExtendable = true;
        template.nExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].onNormalEvaluated = (n => {
            n.z = 0;
            n.normalize();
        })
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, - template.h * tileHeight, 0), Tools.V3Dir(90))
        ];

        let nLoops = n;
        let xCenterStart = 0;
        let xCenterEnd = tileWidth * (template.w - 1);
        let r = tileWidth * 0.5 * 0.7;
        let depthStart = 0.013;
        let depthEnd = - 0.013;
        if (d > 1) {
            depthStart = 0;
            depthEnd = - tileDepth * (template.d - 1)
        }
        for (let n = 0; n <= 8 * nLoops; n++) {
            let f = (n + 0) / (8 * nLoops);
            let a = 2 * Math.PI * n / 8;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);

            let normal: BABYLON.Vector3;
            if (n % 8 === 4) {
                normal = Tools.V3Dir(180, 1);
            }

            template.trackTemplates[0].trackpoints.push(
                new TrackPoint(
                    template.trackTemplates[0],
                    new BABYLON.Vector3(
                        sina * r + f * (xCenterEnd - xCenterStart) + xCenterStart,
                        r * 1 - cosa * r - template.h * tileHeight,
                        f * (depthEnd - depthStart) + depthStart
                    ),
                    undefined,
                    normal
                )
            );
        }

        template.trackTemplates[0].trackpoints.push(
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), - template.h * tileHeight, - tileDepth * (template.d - 1)), Tools.V3Dir(90))
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
