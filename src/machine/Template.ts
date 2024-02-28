class TrackTemplate {

    public trackpoints: TrackPoint[] = [] = [];
    public interpolatedPoints: BABYLON.Vector3[] = [];
    public interpolatedNormals: BABYLON.Vector3[] = [];
    public angles: number[] = [];

    public drawStartTip: boolean = false;
    public drawEndTip: boolean = false;

    public preferedStartBank: number = 0;
    public preferedEndBank: number = 0;

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    constructor(public partTemplate: MachinePartTemplate) {

    }

    public mirrorXTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.x *= - 1;
            this.trackpoints[i].position.x += (this.partTemplate.w - 1) * tileWidth;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.x *= - 1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.x *= - 1;
            }
        }
    }

    public mirrorZTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.z += (this.partTemplate.d - 1) * tileDepth * 0.5;
            this.trackpoints[i].position.z *= - 1;
            this.trackpoints[i].position.z -= (this.partTemplate.d - 1) * tileDepth * 0.5;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.z *= - 1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.z *= - 1;
            }
        }
    }
    
    public onNormalEvaluated: (n: BABYLON.Vector3, p?: BABYLON.Vector3, relativeIndex?: number) => void;
    public initialize(): void {
        for (let i = 1; i < this.trackpoints.length - 1; i++) {

            let prevTrackPoint = this.trackpoints[i - 1];
            let trackPoint = this.trackpoints[i];
            let nextTrackPoint = this.trackpoints[i + 1];

            if (!trackPoint.fixedDir) {
                trackPoint.dir.copyFrom(nextTrackPoint.position).subtractInPlace(prevTrackPoint.position).normalize();
            }
            if (!trackPoint.fixedTangentIn) {
                trackPoint.tangentIn = 1;
            }
            if (!trackPoint.fixedTangentOut) {
                trackPoint.tangentOut = 1;
            }
        }

        this.trackpoints[0].summedLength = 0;
        for (let i = 0; i < this.trackpoints.length - 1; i++) {
            let trackPoint = this.trackpoints[i];
            let nextTrackPoint = this.trackpoints[i + 1];
            let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanIn = this.trackpoints[i].dir.scale(dist * trackPoint.tangentOut);
            let tanOut = this.trackpoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
            let count = Math.round(dist / 0.003);
            count = Math.max(0, count);
            this.interpolatedPoints.push(trackPoint.position);
            nextTrackPoint.summedLength = trackPoint.summedLength;
            for (let k = 1; k < count; k++) {
                let amount = k / count;
                let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                this.interpolatedPoints.push(point);
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(this.interpolatedPoints[this.interpolatedPoints.length - 2], this.interpolatedPoints[this.interpolatedPoints.length - 1]);
            }
            nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, this.interpolatedPoints[this.interpolatedPoints.length - 1]);
        }

        this.interpolatedPoints.push(this.trackpoints[this.trackpoints.length - 1].position);

        let N = this.interpolatedPoints.length;
        
        let normalsForward: BABYLON.Vector3[] = [];
        let normalsBackward: BABYLON.Vector3[] = [];
        normalsForward.push(this.trackpoints[0].normal);
        for (let i = 1; i < this.interpolatedPoints.length - 1; i++) {
            let prevNormal = normalsForward[i - 1];
            let point = this.interpolatedPoints[i];
            let nextPoint = this.interpolatedPoints[i + 1];
            let dir = nextPoint.subtract(point).normalize();
            let n = prevNormal;
            let right = BABYLON.Vector3.Cross(n, dir);
            n = BABYLON.Vector3.Cross(dir, right).normalize();
            if (this.onNormalEvaluated) {
                this.onNormalEvaluated(n, point, i / (this.interpolatedPoints.length - 1));
            }
            normalsForward.push(n);
        }
        normalsForward.push(this.trackpoints[this.trackpoints.length - 1].normal);
        
        normalsBackward[this.interpolatedPoints.length - 1] = this.trackpoints[this.trackpoints.length - 1].normal;
        for (let i = this.interpolatedPoints.length - 2; i >= 1; i--) {
            let prevNormal = normalsBackward[i + 1];
            let point = this.interpolatedPoints[i];
            let prevPoint = this.interpolatedPoints[i - 1];
            let dir = prevPoint.subtract(point).normalize();
            let n = prevNormal;
            let right = BABYLON.Vector3.Cross(n, dir);
            n = BABYLON.Vector3.Cross(dir, right).normalize();
            if (this.onNormalEvaluated) {
                this.onNormalEvaluated(n, point, i / (this.interpolatedPoints.length - 1));
            }
            normalsBackward[i] = n;
        }
        normalsBackward[0] = this.trackpoints[0].normal;

        for (let i = 0; i < N; i++) {
            let f = i / (N - 1);
            this.interpolatedNormals[i] = BABYLON.Vector3.Lerp(normalsForward[i], normalsBackward[i], f).normalize();
        }

        let maxR = 0;
        this.angles = [this.preferedStartBank];
        for (let i = 1; i < N - 1; i++) {
            let n = this.interpolatedNormals[i];

            let prevPoint = this.interpolatedPoints[i - 1];
            let point = this.interpolatedPoints[i];
            let nextPoint = this.interpolatedPoints[i + 1];

            let dirPrev = point.subtract(prevPoint);
            let dPrev = dirPrev.length();

            let dirNext = nextPoint.subtract(point);
            let dNext = dirNext.length();

            let a = Mummu.AngleFromToAround(dirPrev.scale(-1), dirNext, n);
            if (Math.abs(a) < Math.PI * 0.9999999) {
                let sign = Math.sign(a);
    
                let rPrev = Math.tan(Math.abs(a) / 2) * (dPrev * 0.5);
                let rNext = Math.tan(Math.abs(a) / 2) * (dNext * 0.5);
                let r = (rPrev + rNext) * 0.5;
                maxR = Math.max(r, maxR);

                let f = 0.06 / r;
                f = Math.max(Math.min(f, 1), 0);
                this.angles[i] = Math.PI / 4 * sign * f;
            }
            else {
                this.angles[i] = 0;
            }
        }
        this.angles.push(this.preferedEndBank);

        let dec = 1;
        for (let i = 1; i < 0.5 * (N - 1); i++) {
            if (Math.abs(this.angles[i]) < Math.abs(this.preferedStartBank) * dec) {
                this.angles[i] = this.preferedStartBank * dec;
                dec *= 0.9;
            }
            else {
                i = Infinity;
            }
        }
        
        dec = 1;
        for (let i = N - 1 - 1; i > 0.5 * (N - 1); i--) {
            if (Math.abs(this.angles[i]) < Math.abs(this.preferedEndBank) * dec) {
                this.angles[i] = this.preferedEndBank * dec;
                dec *= 0.9;
            }
            else {
                i = - Infinity;
            }
        }

        let tmpAngles = [...this.angles];
        let f = 1;
        for (let n = 0; n < this.partTemplate.angleSmoothSteps; n++) {
            for (let i = 0; i < N; i++) {
                let aPrev = tmpAngles[i - 1];
                let a = tmpAngles[i];
                let point = this.interpolatedPoints[i];
                let aNext = tmpAngles[i + 1];

                if (isFinite(aPrev) && isFinite(aNext)) {
                    let prevPoint = this.interpolatedPoints[i - 1];
                    let distPrev = BABYLON.Vector3.Distance(prevPoint, point);

                    let nextPoint = this.interpolatedPoints[i + 1];
                    let distNext = BABYLON.Vector3.Distance(nextPoint, point);

                    let d = distPrev / (distPrev + distNext);

                    tmpAngles[i] = (1 - f) * a + f * ((1 - d) * aPrev + d * aNext);
                }
                else if (isFinite(aPrev)) {
                    tmpAngles[i] = (1 - f) * a + f * aPrev;
                }
                else if (isFinite(aNext)) {
                    tmpAngles[i] = (1 - f) * a + f * aNext;
                }
            }
        }

        this.preferedStartBank = tmpAngles[0];
        this.preferedEndBank = tmpAngles[tmpAngles.length - 1];

        this.summedLength = [0];
        this.totalLength = 0;
        for (let i = 0; i < N - 1; i++) {
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1];
            let dir = pNext.subtract(p);
            let d = dir.length();
            dir.scaleInPlace(1 / d);
            let right = BABYLON.Vector3.Cross(this.interpolatedNormals[i], dir);
            this.interpolatedNormals[i] = BABYLON.Vector3.Cross(dir, right).normalize();
            this.summedLength[i + 1] = this.summedLength[i] + d;
        }
        this.totalLength = this.summedLength[N - 1];

        let dh = this.interpolatedPoints[this.interpolatedPoints.length - 1].y - this.interpolatedPoints[0].y;
        this.globalSlope = dh / this.totalLength * 100;
    }
}

class MachinePartTemplate {

    public partName: string = "machine-part-template";

    public w: number = 1;
    public h: number = 1;
    public d: number = 1;
    public n: number = 1;
    public mirrorX: boolean = false;
    public mirrorZ: boolean = false;
    public angleSmoothSteps: number = 30;

    public xExtendable: boolean = false;
    public yExtendable: boolean = false;
    public zExtendable: boolean = false;
    public nExtendable: boolean = false;
    public minH: number = 1;
    public minD: number = 1;
    public maxD: number = 10;
    public xMirrorable: boolean = false;
    public zMirrorable: boolean = false;
    public hasOriginDestinationHandles: boolean = false;

    public trackTemplates: TrackTemplate[] = [];
    
    public mirrorXTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackTemplates.length; i++) {
            this.trackTemplates[i].mirrorXTrackPointsInPlace();
        }
    }

    public mirrorZTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackTemplates.length; i++) {
            this.trackTemplates[i].mirrorZTrackPointsInPlace();
        }
    }
    
    public initialize(): void {
        this.trackTemplates.forEach(trackTemplate => {
            trackTemplate.initialize();
        });
    }
}

class TemplateManager {

    private _dictionary: Map<string, MachinePartTemplate[]> = new Map<string, MachinePartTemplate[]>();

    constructor(public machine: Machine) {

    }

    public getTemplate(partName: string, mirrorX?: boolean, mirrorZ?: boolean): MachinePartTemplate {
        let mirrorIndex = (mirrorX ? 0 : 1) + (mirrorZ ? 0 : 2);
        let data: MachinePartTemplate;
        let datas = this._dictionary.get(partName);
        if (datas && datas[mirrorIndex]) {
            data = datas[mirrorIndex];
        }
        else {
            if (!datas) {
                datas = [];
            }
            this._dictionary.set(partName, datas);
        }

        if (!data) {
            if (partName.startsWith("uturn-")) {
                let h = parseInt(partName.split("-")[1].split(".")[0]);
                let d = parseInt(partName.split("-")[1].split(".")[1]);
                data = UTurn.GenerateTemplate(h, d, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("wall-")) {
                let h = parseInt(partName.split("-")[1].split(".")[0]);
                let d = parseInt(partName.split("-")[1].split(".")[1]);
                data = Wall.GenerateTemplate(h, d, mirrorX);
            }
            else if (partName === "uturnsharp") {
                data = UTurnSharp.GenerateTemplate(mirrorX);
            }
            else if (partName.startsWith("ramp-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let d = parseInt(partName.split("-")[1].split(".")[2]);
                data = Ramp.GenerateTemplate(w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("wave-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let d = parseInt(partName.split("-")[1].split(".")[2]);
                data = Wave.GenerateTemplate(w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("snake-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let d = parseInt(partName.split("-")[1].split(".")[2]);
                data = Snake.GenerateTemplate(w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("elevator-")) {
                let h = parseInt(partName.split("-")[1]);
                data = Elevator.GenerateTemplate(h, mirrorX);
            }
            else if (partName === "split") {
                data = Split.GenerateTemplate(mirrorX);
            }
            else if (partName === "flatjoin") {
                data = FlatJoin.GenerateTemplate(mirrorX);
            }
            else if (partName === "join") {
                data = Join.GenerateTemplate(mirrorX);
            }
            else if (partName.startsWith("loop-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let d = parseInt(partName.split("-")[1].split(".")[1]);
                let n = parseInt(partName.split("-")[1].split(".")[2]);
                data = Loop.GenerateTemplate(w, d, n, mirrorX, mirrorZ);
            }
            else if (partName.startsWith("spiral-")) {
                let w = parseInt(partName.split("-")[1].split(".")[0]);
                let h = parseInt(partName.split("-")[1].split(".")[1]);
                let n = parseInt(partName.split("-")[1].split(".")[2]);
                data = Spiral.GenerateTemplate(w, h, n, mirrorX, mirrorZ);
            }
            else if (partName === "quarter") {
                data = QuarterNote.GenerateTemplate(mirrorX);
            }
            else if (partName === "double") {
                data = DoubleNote.GenerateTemplate(mirrorX);
            }
            datas[mirrorIndex] = data;
        }

        return data;
    }
}