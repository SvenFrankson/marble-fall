class SleeperMeshBuilder {

    public static GenerateSleepersVertexData(track: Track): BABYLON.VertexData {
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
        for (let i = 0; i < track.trackPoints.length; i++) {
            let trackpoint = track.trackPoints[i];
            let path = basePath.map(v => { return v.clone(); });

            let t = trackpoint.position;
            Mummu.QuaternionFromYZAxisToRef(trackpoint.normal, trackpoint.dir, q);
            let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), q, t);
            
            for (let j = 0; j < path.length; j++) {
                BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
            }

            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
            tmp.dispose();
        }

        return Mummu.MergeVertexDatas(...partialsDatas);
    }
}