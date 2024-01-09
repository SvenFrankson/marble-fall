class SleeperMeshBuilder {

    public static GenerateSleepersVertexData(track: Track, spacing: number): BABYLON.VertexData {
        let summedLength: number[] = [0];
        for (let i = 1; i < track.interpolatedPoints.length; i++) {
            let prev = track.interpolatedPoints[i - 1];
            let trackpoint = track.interpolatedPoints[i];
            let dist = BABYLON.Vector3.Distance(prev, trackpoint);
            summedLength[i] = summedLength[i - 1] + dist;
        }

        let count = Math.round(summedLength[summedLength.length - 1] / spacing);
        let correctedSpacing = summedLength[summedLength.length - 1] / count;

        let partialsDatas: BABYLON.VertexData[] = [];

        let radius = track.wireSize * 0.5 * 0.75;
        let nShape = 6;
        let shape: BABYLON.Vector3[] = [];
        for (let i = 0; i < nShape; i++) {
            let a = i / nShape * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * radius, sina * radius, 0);
        }

        let shapeSmall: BABYLON.Vector3[] = [];
        for (let i = 0; i < nShape; i++) {
            let a = i / nShape * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shapeSmall[i] = new BABYLON.Vector3(cosa * radius * 0.75, sina * radius * 0.75, 0);
        }

        let radiusPath = track.wireGauge * 0.5;
        let nPath = 12;
        let basePath: BABYLON.Vector3[] = [];
        for (let i = 0; i <= nPath; i++) {
            let a = i / nPath * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            basePath[i] = new BABYLON.Vector3(cosa * radiusPath, - sina * radiusPath, 0);
        }

        let q = BABYLON.Quaternion.Identity();
        let n = 0.5;
        for (let i = 1; i < track.interpolatedPoints.length - 1; i++) {
            let sumPrev = summedLength[i - 1];
            let sum = summedLength[i];
            let sumNext = summedLength[i + 1];
            let targetSumLength = n * correctedSpacing;
            let addSleeper: boolean = false;
            if (sumPrev < targetSumLength && sum >= targetSumLength) {
                let f = (targetSumLength - sumPrev) / (sum - sumPrev);
                if (f > 0.5) {
                    addSleeper = true;
                }
            }
            if (sum <= targetSumLength && sumNext > targetSumLength) {
                let f = (targetSumLength - sum) / (sumNext - sum);
                if (f <= 0.5) {
                    addSleeper = true;
                }
            }
            if (addSleeper) {
                let path = basePath.map(v => { return v.clone(); });
    
                let dir = track.interpolatedPoints[i + 1].subtract(track.interpolatedPoints[i - 1]).normalize();
                let t = track.interpolatedPoints[i];
                Mummu.QuaternionFromYZAxisToRef(track.interpolatedNormals[i], dir, q);
                let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), q, t);
                
                for (let j = 0; j < path.length; j++) {
                    BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
                }
    
                let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                tmp.dispose();

                if (n === 0.5 || n === count - 0.5) {
                    let anchor = path[nPath - 4];
                    let anchorWall = anchor.clone();
                    anchorWall.z = 0.015;
                    let fixationPath = [anchor, anchorWall];
                    let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: fixationPath, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                    tmp.dispose();
                }
                n++;
            }
        }

        return Mummu.MergeVertexDatas(...partialsDatas);
    }
}