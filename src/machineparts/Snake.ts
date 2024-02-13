class Snake extends MachinePartWithOriginDestination {

    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, h: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k);

        let partName = "snake-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    
    public static GenerateTemplate(w: number = 1, h: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "snake-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        template.angleSmoothFactor = 0.5;

        template.w = w;
        template.h = h;
        template.d = d;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
        
        template.xExtendable = true;
        template.yExtendable = true;
        template.zExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        template.trackTemplates[0] = new TrackTemplate(template);

        let start = new BABYLON.Vector3(- tileWidth * 0.5, 0, 0);
        let end = new BABYLON.Vector3(tileWidth * (template.w - 0.5), - tileHeight * template.h, - tileDepth * (template.d - 1));
        let tanVector = dir.scale(BABYLON.Vector3.Distance(start, end));
        
        template.trackTemplates[0].trackpoints = [new TrackPoint(template.trackTemplates[0], start, dir, undefined, undefined, 1)];
        for (let i = 1; i < 2 * (w + 1); i++ ) {
            let p1 = BABYLON.Vector3.Hermite(start, tanVector, end, tanVector, i / (2 * (w + 1)));
            if (i % 2 === 1) {
                p1.z -= 0.015;
            }
            else {
                p1.z += 0.015;
            }
            template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], p1));
        }
        template.trackTemplates[0].trackpoints.push(new TrackPoint(template.trackTemplates[0], end, dir, undefined, 1));

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }

    public recreateFromOriginDestination(origin: Nabu.IJK, dest: Nabu.IJK, machine: Machine): Snake {
        let i = Math.min(origin.i, dest.i);
        let j = Math.min(origin.j, dest.j);
        let k = Math.min(origin.k, dest.k);
        let w = dest.i - origin.i;
        let h = Math.abs(dest.j - origin.j);
        let d = Math.abs(dest.k - origin.k) + 1;
        let mirrorX = dest.j < origin.j;
        let mirrorZ = false;
        if (mirrorX) {
            if (origin.k < dest.k) {
                mirrorZ = true;
            }
        }
        else {
            if (origin.k > dest.k) {
                mirrorZ = true;
            }
        }
        return new Snake(machine, i, j, k, w, h, d, mirrorX, mirrorZ);
    }
}