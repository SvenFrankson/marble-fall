class Toolbar {
    
    public container: HTMLDivElement;
    public playButton: HTMLButtonElement;
    public pauseButton: HTMLButtonElement;
    public stopButton: HTMLButtonElement;
    public timeFactorButton: HTMLButtonElement;
    public timeFactorValue: HTMLSpanElement;
    public timeFactorInputContainer: HTMLDivElement;
    public timeFactorInput: HTMLInputElement;
    public saveButton: HTMLButtonElement;
    public loadButton: HTMLButtonElement;
    public loadInputContainer: HTMLDivElement;
    public loadInput: HTMLInputElement;
    public soundButton: HTMLButtonElement;
    public soundInputContainer: HTMLDivElement;
    public soundInput: HTMLInputElement;
    public zoomButton: HTMLButtonElement;
    public zoomInputContainer: HTMLDivElement;
    public zoomInput: HTMLInputElement;
    public backButton: HTMLButtonElement;

    public timeFactorInputShown: boolean = false;
    public loadInputShown: boolean = false;
    public soundInputShown: boolean = false;
    public zoomInputShown: boolean = false;

    constructor(public game: Game) {

    }

    public initialize(): void {
        this.container = document.querySelector("#toolbar") as HTMLDivElement;
        this.container.style.display = "block";

        this.playButton = document.querySelector("#toolbar-play") as HTMLButtonElement;
        this.playButton.addEventListener("click", this.onPlay);

        this.pauseButton = document.querySelector("#toolbar-pause") as HTMLButtonElement;
        this.pauseButton.addEventListener("click", this.onPause);

        this.stopButton = document.querySelector("#toolbar-stop") as HTMLButtonElement;
        this.stopButton.addEventListener("click", this.onStop);

        this.timeFactorButton = document.querySelector("#toolbar-time-factor") as HTMLButtonElement;
        this.timeFactorButton.addEventListener("click", this.onTimeFactorButton);

        this.timeFactorValue = document.querySelector("#toolbar-time-factor .value") as HTMLSpanElement;

        this.timeFactorInput = document.querySelector("#time-factor-value") as HTMLInputElement;
        this.timeFactorInput.value = this.game.targetTimeFactor.toFixed(2);
        this.timeFactorInput.addEventListener("input", this.onTimeFactorInput);

        this.timeFactorInputContainer = this.timeFactorInput.parentElement as HTMLDivElement;

        this.saveButton = document.querySelector("#toolbar-save") as HTMLButtonElement;
        this.saveButton.addEventListener("click", this.onSave);

        this.loadButton = document.querySelector("#toolbar-load") as HTMLButtonElement;
        this.loadButton.addEventListener("click", this.onLoad);

        this.loadInput = document.querySelector("#load-input") as HTMLInputElement;
        this.loadInput.addEventListener("input", this.onLoadInput);

        this.loadInputContainer = this.loadInput.parentElement as HTMLDivElement;

        this.soundButton = document.querySelector("#toolbar-sound") as HTMLButtonElement;
        this.soundButton.addEventListener("click", this.onSoundButton);

        this.soundInput = document.querySelector("#sound-value") as HTMLInputElement;
        this.soundInput.value = this.game.mainVolume.toFixed(2);
        this.soundInput.addEventListener("input", this.onSoundInput);

        this.soundInputContainer = this.soundInput.parentElement as HTMLDivElement;

        this.zoomButton = document.querySelector("#toolbar-zoom") as HTMLButtonElement;
        this.zoomButton.addEventListener("click", this.onZoomButton);

        this.zoomInput = document.querySelector("#zoom-value") as HTMLInputElement;
        this.zoomInput.value = this.game.getCameraZoomFactor().toFixed(3);
        this.zoomInput.addEventListener("input", this.onZoomInput);

        this.zoomInputContainer = this.zoomInput.parentElement as HTMLDivElement;

        this.backButton = document.querySelector("#toolbar-back") as HTMLButtonElement;
        this.backButton.addEventListener("click", this.onBack);
        this.resize();

        this.game.canvas.addEventListener("pointerdown", this.closeAllDropdowns);
        this.game.scene.onBeforeRenderObservable.add(this._udpate);
    }

    public dispose(): void {
        this.game.canvas.removeEventListener("pointerdown", this.closeAllDropdowns);
        this.game.scene.onBeforeRenderObservable.removeCallback(this._udpate);
    }

    public updateButtonsVisibility(): void {
        if (this.game.mode === GameMode.MainMenu) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "none";
        }
        else if (this.game.mode === GameMode.Credit) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.CreateMode) {
            this.saveButton.style.display = "";
            this.loadButton.style.display = "";
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.DemoMode) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
    }

    public resize(): void {
        this.updateButtonsVisibility();

        let ratio = this.game.engine.getRenderWidth() / this.game.engine.getRenderHeight();
        this.container.style.bottom = "10px";
        if (ratio < 1) {
            let objectsElement = document.getElementById("machine-editor-objects");
            if (objectsElement.style.display != "none") {
                let h = objectsElement.getBoundingClientRect().height;
                this.container.style.bottom = (h + 10).toFixed(0) + "px";
            }
        }
        let containerWidth = this.container.clientWidth;
        this.container.style.left = ((this.game.engine.getRenderWidth() - containerWidth) * 0.5) + "px";

        this.timeFactorInputContainer.style.display = this.timeFactorInputShown ? "" : "none";
        let rectButton = this.timeFactorButton.getBoundingClientRect();
        let rectContainer = this.timeFactorInputContainer.getBoundingClientRect();
        this.timeFactorInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.timeFactorInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
        
        this.loadInputContainer.style.display = this.loadInputShown ? "" : "none";
        rectButton = this.loadButton.getBoundingClientRect();
        rectContainer = this.loadInputContainer.getBoundingClientRect();
        this.loadInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.loadInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
        
        this.soundInputContainer.style.display = this.soundInputShown ? "" : "none";
        rectButton = this.soundButton.getBoundingClientRect();
        rectContainer = this.soundInputContainer.getBoundingClientRect();
        this.soundInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.soundInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
        
        this.zoomInputContainer.style.display = this.zoomInputShown ? "" : "none";
        rectButton = this.zoomButton.getBoundingClientRect();
        rectContainer = this.zoomInputContainer.getBoundingClientRect();
        this.zoomInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.zoomInputContainer.style.top = (rectButton.top - rectContainer.height - 8).toFixed(0) + "px";
    }

    private _lastPlaying: boolean;
    public _udpate = () => {
        if (this.game.machine) {
            if (this.game.machine.playing != this._lastPlaying) {
                if (this.game.machine.playing) {
                    this.playButton.style.display = "none";
                    this.pauseButton.style.display = "";
                }
                else {
                    this.playButton.style.display = "";
                    this.pauseButton.style.display = "none";
                }
                this._lastPlaying = this.game.machine.playing;
                this.resize();
            }
            this.timeFactorValue.innerText = this.game.timeFactor.toFixed(2);
        }
        if (this.zoomInputShown) {
            this.zoomInput.value = this.game.getCameraZoomFactor().toFixed(3);
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

    public onTimeFactorButton = () => {
        this.timeFactorInputShown = !this.timeFactorInputShown;
        this.resize();
    }

    public onTimeFactorInput = (e: InputEvent) => {
        this.game.targetTimeFactor = parseFloat((e.target as HTMLInputElement).value);
    }

    public onSave = () => {
        let data = this.game.machine.serialize();
        window.localStorage.setItem("last-saved-machine", JSON.stringify(data));
        Nabu.download("my-marble-machine.json", JSON.stringify(data));
    }

    public onLoad = () => {
        this.loadInputShown = !this.loadInputShown;
        this.resize();
    }

    public onLoadInput = (event: Event) => {
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
                this.loadInputShown = false;
                this.resize();
            });
            reader.readAsText(file);
        }
    }

    public onSoundButton = () => {
        this.soundInputShown = !this.soundInputShown;
        this.resize();
    }

    public onSoundInput = (e: InputEvent) => {
        this.game.mainVolume = parseFloat((e.target as HTMLInputElement).value);
    }

    public onZoomButton = () => {
        this.zoomInputShown = !this.zoomInputShown;
        this.resize();
    }

    public onZoomInput = (e: InputEvent) => {
        this.game.setCameraZoomFactor(parseFloat((e.target as HTMLInputElement).value));
    }

    public onBack = () => {
        this.game.setContext(GameMode.MainMenu);
    }

    public closeAllDropdowns = () => {
        if (this.timeFactorInputShown || this.loadInputShown || this.soundInputShown || this.zoomInputShown) {
            this.timeFactorInputShown = false;
            this.loadInputShown = false;
            this.soundInputShown = false;
            this.zoomInputShown = false;
            this.resize();
        }        
    }
}