class TrackSharedData {

    public sharedInterpolatedPoints: BABYLON.Vector3[] = [];
    public sharedInterpolatedNormals: BABYLON.Vector3[] = [];
    public sharedBaseAngle: number[] = [];
}

class TrackSharedDataManager {

    private _dictionary: Map<string, TrackSharedData[][]> = new Map<string, TrackSharedData[][]>();

    constructor(public machine: Machine) {

    }

    public getSharedData(part: MachinePart, trackIndex: number): TrackSharedData {
        let mirrorIndex = (part.mirrorX ? 0 : 1) + (part.mirrorZ ? 0 : 2);
        let data: TrackSharedData;
        let datas = this._dictionary.get(part.partName);
        if (datas && datas[trackIndex] && datas[trackIndex][mirrorIndex]) {
            data = datas[trackIndex][mirrorIndex];
        }
        else {
            if (!datas) {
                datas = [];
            }
            if (!datas[trackIndex]) {
                datas[trackIndex] = [];
            }
            this._dictionary.set(part.partName, datas);
        }

        if (!data) {
            data = this.generateTrackSharedData(part.tracks[trackIndex]);
            datas[trackIndex][mirrorIndex] = data;
        }

        return data;
    }

    private generateTrackSharedData(track: Track): TrackSharedData {
        let data = new TrackSharedData();

        track.trackpoints[0].summedLength = 0;
        for (let i = 0; i < track.trackpoints.length - 1; i++) {
            let trackPoint = track.trackpoints[i];
            let nextTrackPoint = track.trackpoints[i + 1];
            let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanIn = track.trackpoints[i].dir.scale(dist * trackPoint.tangentOut);
            let tanOut = track.trackpoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
            let count = Math.round(dist / 0.003);
            count = Math.max(0, count);
            data.sharedInterpolatedPoints.push(trackPoint.position);
            nextTrackPoint.summedLength = trackPoint.summedLength;
            for (let k = 1; k < count; k++) {
                let amount = k / count;
                let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                data.sharedInterpolatedPoints.push(point);
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(data.sharedInterpolatedPoints[data.sharedInterpolatedPoints.length - 2], data.sharedInterpolatedPoints[data.sharedInterpolatedPoints.length - 1]);
            }
            nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, data.sharedInterpolatedPoints[data.sharedInterpolatedPoints.length - 1]);
        }

        data.sharedInterpolatedPoints.push(track.trackpoints[track.trackpoints.length - 1].position);

        let N = data.sharedInterpolatedPoints.length;
        
        let normalsForward: BABYLON.Vector3[] = [];
        let normalsBackward: BABYLON.Vector3[] = [];
        normalsForward.push(track.trackpoints[0].normal);
        for (let i = 1; i < data.sharedInterpolatedPoints.length - 1; i++) {
            let prevNormal = normalsForward[i - 1];
            let point = data.sharedInterpolatedPoints[i];
            let nextPoint = data.sharedInterpolatedPoints[i + 1];
            let dir = nextPoint.subtract(point).normalize();
            let n = prevNormal;
            let right = BABYLON.Vector3.Cross(n, dir);
            n = BABYLON.Vector3.Cross(dir, right).normalize();
            normalsForward.push(n);
        }
        normalsForward.push(track.trackpoints[track.trackpoints.length - 1].normal);
        
        normalsBackward[data.sharedInterpolatedPoints.length - 1] = track.trackpoints[track.trackpoints.length - 1].normal;
        for (let i = data.sharedInterpolatedPoints.length - 2; i >= 1; i--) {
            let prevNormal = normalsBackward[i + 1];
            let point = data.sharedInterpolatedPoints[i];
            let prevPoint = data.sharedInterpolatedPoints[i - 1];
            let dir = prevPoint.subtract(point).normalize();
            let n = prevNormal;
            let right = BABYLON.Vector3.Cross(n, dir);
            n = BABYLON.Vector3.Cross(dir, right).normalize();
            normalsBackward[i] = n;
        }
        normalsBackward[0] = track.trackpoints[0].normal;

        for (let i = 0; i < N; i++) {
            let f = i / (N - 1);
            data.sharedInterpolatedNormals.push(BABYLON.Vector3.Lerp(normalsForward[i], normalsBackward[i], f).normalize());
        }

        let maxR = 0;
        data.sharedBaseAngle = [0];
        for (let i = 1; i < N - 1; i++) {
            let n = data.sharedInterpolatedNormals[i];

            let prevPoint = data.sharedInterpolatedPoints[i - 1];
            let point = data.sharedInterpolatedPoints[i];
            let nextPoint = data.sharedInterpolatedPoints[i + 1];

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
                data.sharedBaseAngle[i] = Math.PI / 4 * sign * f;
            }
            else {
                data.sharedBaseAngle[i] = 0;
            }
        }
        data.sharedBaseAngle.push(0);

        let f = 1;
        for (let n = 0; n < 2 * N; n++) {
            for (let i = 0; i < N; i++) {
                let aPrev = data.sharedBaseAngle[i - 1];
                let a = data.sharedBaseAngle[i];
                let point = data.sharedInterpolatedPoints[i];
                let aNext = data.sharedBaseAngle[i + 1];

                if (isFinite(aPrev) && isFinite(aNext)) {
                    let prevPoint = data.sharedInterpolatedPoints[i - 1];
                    let distPrev = BABYLON.Vector3.Distance(prevPoint, point);

                    let nextPoint = data.sharedInterpolatedPoints[i + 1];
                    let distNext = BABYLON.Vector3.Distance(nextPoint, point);

                    let d = distPrev / (distPrev + distNext);

                    data.sharedBaseAngle[i] = (1 - f) * a + f * ((1 - d) * aPrev + d * aNext);
                }
                else if (isFinite(aPrev)) {
                    data.sharedBaseAngle[i] = (1 - f) * a + f * aPrev;
                }
                else if (isFinite(aNext)) {
                    data.sharedBaseAngle[i] = (1 - f) * a + f * aNext;
                }
            }
        }

        return data;
    }
}