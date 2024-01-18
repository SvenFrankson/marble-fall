class Toolbar {
    
    public container: HTMLDivElement;
    public playButton: HTMLButtonElement;
    public pauseButton: HTMLButtonElement;
    public stopButton: HTMLButtonElement;
    public saveButton: HTMLButtonElement;
    public loadButton: HTMLButtonElement;
    public speedButton: HTMLButtonElement;
    public backButton: HTMLButtonElement;

    constructor(public game: Game) {

    }

    public initialize(): void {
        this.container = document.querySelector("#toolbar") as HTMLDivElement;
        this.playButton = document.querySelector("#toolbar-play") as HTMLButtonElement;
        this.playButton.addEventListener("click", this.onPlay);
        this.pauseButton = document.querySelector("#toolbar-pause") as HTMLButtonElement;
        this.pauseButton.addEventListener("click", this.onPause);
        this.stopButton = document.querySelector("#toolbar-stop") as HTMLButtonElement;
        this.stopButton.addEventListener("click", this.onStop);
        this.saveButton = document.querySelector("#toolbar-save") as HTMLButtonElement;
        this.saveButton.addEventListener("click", this.onSave);
        this.loadButton = document.querySelector("#toolbar-load") as HTMLButtonElement;
        this.loadButton.addEventListener("click", this.onLoad);
        this.speedButton = document.querySelector("#toolbar-speed") as HTMLButtonElement;
        this.backButton = document.querySelector("#toolbar-back") as HTMLButtonElement;
        this.backButton.addEventListener("click", this.onBack);
        this.resize();

        this.game.scene.onBeforeRenderObservable.add(this._udpate);
    }

    public dispose(): void {
        this.game.scene.onBeforeRenderObservable.removeCallback(this._udpate);
    }

    public resize(): void {
        let ratio = this.game.engine.getRenderWidth() / this.game.engine.getRenderHeight();
        if (ratio > 1) {
            this.container.style.bottom = "10px";
        }
        else {
            this.container.style.bottom = "310px";
        }
        let containerWidth = this.container.clientWidth;
        this.container.style.left = ((this.game.engine.getRenderWidth() - containerWidth) * 0.5) + "px";
    }

    private _lastPlaying: boolean;
    public _udpate = () => {
        if (this.game.machine) {
            if (this.game.machine.playing != this._lastPlaying) {
                if (this.game.machine.playing) {
                    this.playButton.style.display = "none";
                    this.pauseButton.style.display = "inline-block";
                }
                else {
                    this.playButton.style.display = "inline-block";
                    this.pauseButton.style.display = "none";
                }
                this._lastPlaying = this.game.machine.playing;
            }
        }
    }

    public onPlay = () => {
        this.game.machine.playing = true;
    }

    public onPause = () => {
        this.game.machine.playing = false;
    }

    public onStop = () => {
        this.game.machine.stop();
    }

    public onSave = () => {
        let data = this.game.machine.serialize();
        window.localStorage.setItem("last-saved-machine", JSON.stringify(data));
        Nabu.download("my-marble-machine.json", JSON.stringify(data));
    }

    public onLoad = (event: Event) => {
        let files = (event.target as HTMLInputElement).files;
        let file = files[0];
        if (file) {
            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                this.game.machine.dispose();
                this.game.machine.deserialize(JSON.parse(event.target.result as string));
                this.game.machine.instantiate();
                this.game.machine.generateBaseMesh();
                for (let i = 0; i < this.game.machine.balls.length; i++) {
                    this.game.machine.balls[i].setShowPositionZeroGhost(true);
                }
            });
            reader.readAsText(file);
        }
    }

    public onBack = () => {
        this.game.setContext(GameMode.MainMenu);
    }
}