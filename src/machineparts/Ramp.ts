abstract class MachinePartWithOriginDestination extends MachinePart {
    
    
    public abstract recreateFromOriginDestination(origin: Nabu.IJK, dest: Nabu.IJK, machine: Machine): MachinePartWithOriginDestination;
    
    public getOrigin(): Nabu.IJK {
        let i = this.i;
        let j: number;
        if (this.mirrorX) {
            j = this.j + this.h;
        }
        else {
            j = this.j;
        }
        let k: number;
        if (this.mirrorZ) {
            if (this.mirrorX) {
                k = this.k;
            }
            else {
                k = this.k + this.d - 1;
            }
        }
        else {
            if (this.mirrorX) {
                k = this.k + this.d - 1;
            }
            else {
                k = this.k;
            }
        }
        return {
            i: i,
            j: j,
            k: k
        }
    }

    public getDestination(): Nabu.IJK {
        let i = this.i + this.w;
        let j: number;
        if (!this.mirrorX) {
            j = this.j + this.h;
        }
        else {
            j = this.j;
        }
        let k: number;
        if (this.mirrorZ) {
            if (this.mirrorX) {
                k = this.k + this.d - 1;
            }
            else {
                k = this.k;
            }
        }
        else {
            if (this.mirrorX) {
                k = this.k;
            }
            else {
                k = this.k + this.d - 1;
            }
        }
        return {
            i: i,
            j: j,
            k: k
        }
    }
}

class Ramp extends MachinePartWithOriginDestination {

    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, h: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k);

        let partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }
    
    public static GenerateTemplate(w: number = 1, h: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);

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
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), - tileHeight * template.h, - tileDepth * (template.d - 1)), dir)
        ];

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }

    public recreateFromOriginDestination(origin: Nabu.IJK, dest: Nabu.IJK, machine: Machine): Ramp {
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
        return new Ramp(machine, i, j, k, w, h, d, mirrorX, mirrorZ);
    }
}