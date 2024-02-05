class Tools {

    public static V3Dir(angleInDegrees: number, length: number = 1): BABYLON.Vector3 {
        return new BABYLON.Vector3(
            Math.sin(angleInDegrees / 180 * Math.PI) * length,
            Math.cos(angleInDegrees / 180 * Math.PI) * length,
            0
        );
    }
}