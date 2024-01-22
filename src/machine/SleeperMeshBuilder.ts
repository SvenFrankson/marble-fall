class SleeperMeshBuilder {

    public static GenerateSleepersVertexData(part: MachinePart, spacing: number): BABYLON.VertexData {
        let partialsDatas: BABYLON.VertexData[] = [];

        for (let j = 0; j < part.tracks.length; j++) {
            let interpolatedPoints = part.tracks[j].interpolatedPoints;
            let summedLength: number[] = [0];
            for (let i = 1; i < interpolatedPoints.length; i++) {
                let prev = interpolatedPoints[i - 1];
                let trackpoint = interpolatedPoints[i];
                let dist = BABYLON.Vector3.Distance(prev, trackpoint);
                summedLength[i] = summedLength[i - 1] + dist;
            }

            let count = Math.round(summedLength[summedLength.length - 1] / spacing / 3) * 3;
            count = Math.max(1, count);
            let correctedSpacing = summedLength[summedLength.length - 1] / count;

            let radius = part.wireSize * 0.5 * 0.75;
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

            let radiusPath = part.wireGauge * 0.5;
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
            for (let i = 1; i < interpolatedPoints.length - 1; i++) {
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
        
                    let dir = interpolatedPoints[i + 1].subtract(interpolatedPoints[i - 1]).normalize();
                    let t = interpolatedPoints[i];
                    Mummu.QuaternionFromYZAxisToRef(part.tracks[j].interpolatedNormals[i], dir, q);
                    let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), q, t);
                    
                    for (let j = 0; j < path.length; j++) {
                        BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
                    }
        
                    let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                    tmp.dispose();

                    let addAnchor = false;
                    if ((n - 1.5) % 3 === 0) {
                        let anchor = path[nPath / 2 - 1];
                        if (anchor.z > - 0.01) {
                            addAnchor = true;
                        }
                    }

                    if (addAnchor) {
                        let anchor = path[nPath / 2 - 1];
                        let anchorCenter = anchor.clone();
                        anchorCenter.z = 0.015;
                        let radiusFixation = Math.abs(anchor.z - anchorCenter.z);
                        let anchorWall = anchorCenter.clone();
                        anchorWall.y -= radiusFixation * 0.5;
                        let nFixation = 10;
                        let fixationPath: BABYLON.Vector3[] = [];
                        for (let i = 0; i <= nFixation; i++) {
                            let a = i / nFixation * 0.5 * Math.PI;
                            let cosa = Math.cos(a);
                            let sina = Math.sin(a);
                            fixationPath[i] = new BABYLON.Vector3(0, - sina * radiusFixation * 0.5, - cosa * radiusFixation);
                            fixationPath[i].addInPlace(anchorCenter);  
                        }
                        
                        let tmp = BABYLON.ExtrudeShape("tmp", { shape: shape, path: fixationPath, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                        partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                        tmp.dispose();

                        let tmpVertexData = BABYLON.CreateCylinderVertexData({ height: 0.001, diameter: 0.01 });
                        let q = BABYLON.Quaternion.Identity();
                        Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
                        Mummu.RotateVertexDataInPlace(tmpVertexData, q);
                        Mummu.TranslateVertexDataInPlace(tmpVertexData, anchorWall);
                        partialsDatas.push(tmpVertexData);
                        tmp.dispose();

                    }
                    n++;
                }
            }
        }
        
        return Mummu.MergeVertexDatas(...partialsDatas);
    }
}