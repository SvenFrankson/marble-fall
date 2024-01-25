class TrackPoint {

    public fixedNormal: boolean = false;
    public fixedDir: boolean = false;
    public fixedTangentIn: boolean = false;
    public fixedTangentOut: boolean = false;
    public summedLength: number = 0;

    constructor(
        public track: Track,
        public position: BABYLON.Vector3,
        public dir?: BABYLON.Vector3,
        public normal?: BABYLON.Vector3,
        public tangentIn?: number,
        public tangentOut?: number
    ) {
        if (normal) {
            this.fixedNormal = true;
        }
        else {
            this.fixedNormal = false;
            this.normal = BABYLON.Vector3.Up();
        }
        this.normal = this.normal.clone();

        if (dir) {
            this.fixedDir = true;
        }
        else {
            this.fixedDir = false;
            this.dir = BABYLON.Vector3.Right();
        }
        this.dir = this.dir.clone();
        
        if (tangentIn) {
            this.fixedTangentIn = true;
        }
        else {
            this.fixedTangentIn = false;
            this.tangentIn = 1;
        }
        
        if (tangentOut) {
            this.fixedTangentOut = true;
        }
        else {
            this.fixedTangentOut = false;
            this.tangentOut = 1;
        }

        let right = BABYLON.Vector3.Cross(this.normal, this.dir).normalize();
        BABYLON.Vector3.CrossToRef(this.dir, right, this.normal);
        this.normal.normalize();
    }

    public isFirstOrLast(): boolean {
        let index = this.track.trackpoints.indexOf(this);
        if (index === 0 || index === this.track.trackpoints.length - 1) {
            return true;
        }
        return false;
    }
}