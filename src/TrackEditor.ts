class TrackEditor {

    private _track: Track;
    public get track(): Track {
        return this._track;
    }
    public setTrack(t: Track): void {
        if (this._track) {
            this._track.disableEditionMode();
        }
        this._track = t;
        if (this._track) {
            this._track.enableEditionMode();
        }
    }

    private _animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;

    constructor(public game: Game) {
        this.setTrack(this.game.tracks[0]);
        this._animateCamera = Mummu.AnimationFactory.CreateNumbers(this.game.camera, this.game.camera, ["alpha", "beta", "radius"]);
    }

    public initialize(): void {
        document.getElementById("prev").addEventListener("click", () => {
            let trackIndex = this.game.tracks.indexOf(this._track);
            if (trackIndex > 0) {
                this.setTrack(this.game.tracks[trackIndex - 1]);
            }
        });
        document.getElementById("next").addEventListener("click", () => {
            let trackIndex = this.game.tracks.indexOf(this._track);
            if (trackIndex < this.game.tracks.length - 1) {
                this.setTrack(this.game.tracks[trackIndex + 1]);
            }
        });

        document.getElementById("save").addEventListener("click", () => {
            if (this.track) {
                let data = this.track.serialize();
                window.localStorage.setItem("saved-track", JSON.stringify(data));
            }
        });

        document.getElementById("btn-cam-top").addEventListener("click", () => {
            this.setCameraAlphaBeta(- Math.PI * 0.5, 0);
        });

        document.getElementById("btn-cam-left").addEventListener("click", () => {
            this.setCameraAlphaBeta(Math.PI, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-face").addEventListener("click", () => {
            this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-right").addEventListener("click", () => {
            this.setCameraAlphaBeta(0, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-bottom").addEventListener("click", () => {
            this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI);
        });

        document.getElementById("btn-center-track").addEventListener("click", () => {
            if (this.track) {
                this.game.camera.target.copyFrom(this.track.getBarycenter());
            }
        });
    }

    public setCameraAlphaBeta(alpha: number, beta: number, radius: number = 0.25): void {
        this._animateCamera([alpha, beta, radius], 0.5);
    }
}