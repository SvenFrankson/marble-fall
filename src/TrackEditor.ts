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

    constructor(public game: Game) {
        this.setTrack(this.game.tracks[0]);
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

        document.getElementById("btn-center-track").addEventListener("click", () => {
            if (this.track) {
                this.game.camera.target.copyFrom(this.track.getBarycenter());
            }
        });
    }
}