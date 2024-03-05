class Toolbar {
    
    public container: HTMLDivElement;
    public playButton: HTMLButtonElement;
    public pauseButton: HTMLButtonElement;
    public stopButton: HTMLButtonElement;

    public camButton: HTMLButtonElement;
    public camButtonPrev: HTMLButtonElement;
    public camValue: HTMLSpanElement;
    public camButtonNext: HTMLButtonElement;
    public camInputContainer: HTMLDivElement;

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
    public layerButton: HTMLButtonElement;
    public backButton: HTMLButtonElement;

    public camModeInputShown: boolean = false;
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

        this.camButton = document.querySelector("#toolbar-cam-mode") as HTMLButtonElement;
        this.camButton.addEventListener("click", this.onCamButton);
        
        this.camButtonPrev = document.querySelector("#toolbar-cam-mode-prev") as HTMLButtonElement;
        this.camButtonPrev.addEventListener("click", this.onCamPrevButton);
        
        this.camValue = document.querySelector("#toolbar-cam-mode-value") as HTMLSpanElement;

        this.camButtonNext = document.querySelector("#toolbar-cam-mode-next") as HTMLButtonElement;
        this.camButtonNext.addEventListener("click", this.onCamNextButton);

        this.camInputContainer = this.camValue.parentElement as HTMLDivElement;

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

        this.layerButton = document.querySelector("#toolbar-layer") as HTMLButtonElement;
        this.layerButton.addEventListener("click", this.onLayer);

        this.backButton = document.querySelector("#toolbar-back") as HTMLButtonElement;
        
        this.resize();

        this.game.canvas.addEventListener("pointerdown", this.closeAllDropdowns);
        this.game.scene.onBeforeRenderObservable.add(this._udpate);
    }

    public dispose(): void {
        this.game.canvas.removeEventListener("pointerdown", this.closeAllDropdowns);
        this.game.scene.onBeforeRenderObservable.removeCallback(this._udpate);
    }

    public updateButtonsVisibility(): void {
        if (this.game.mode === GameMode.Home) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "none";
        }
        else if (this.game.mode === GameMode.Page) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.Create) {
            this.saveButton.style.display = "";
            this.loadButton.style.display = "";
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.Challenge) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
        else if (this.game.mode === GameMode.Demo) {
            this.saveButton.style.display = "none";
            this.loadButton.style.display = "none";
            this.loadInputShown = false;
            this.backButton.style.display = "";
        }
        this.camButton.style.display = "none";
    }

    public resize(): void {
        this.updateButtonsVisibility();

        let margin = 10;
        this.container.style.bottom = "10px";
        if (this.game.screenRatio < 1) {
            let objectsElement = document.getElementById("machine-editor-objects");
            if (objectsElement.style.display != "none") {
                let h = objectsElement.getBoundingClientRect().height;
                this.container.style.bottom = (h + 10).toFixed(0) + "px";
            }
        }
        let containerWidth = this.container.clientWidth;
        this.container.style.left = ((this.game.engine.getRenderWidth() - containerWidth) * 0.5) + "px";

        this.camInputContainer.style.display = this.camModeInputShown ? "" : "none";
        let rectButton = this.camButton.getBoundingClientRect();
        let rectContainer = this.camInputContainer.getBoundingClientRect();
        this.camInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.camInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";

        this.timeFactorInputContainer.style.display = this.timeFactorInputShown ? "" : "none";
        rectButton = this.timeFactorButton.getBoundingClientRect();
        rectContainer = this.timeFactorInputContainer.getBoundingClientRect();
        this.timeFactorInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.timeFactorInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        
        this.loadInputContainer.style.display = this.loadInputShown ? "" : "none";
        rectButton = this.loadButton.getBoundingClientRect();
        rectContainer = this.loadInputContainer.getBoundingClientRect();
        this.loadInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.loadInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        
        this.soundInputContainer.style.display = this.soundInputShown ? "" : "none";
        rectButton = this.soundButton.getBoundingClientRect();
        rectContainer = this.soundInputContainer.getBoundingClientRect();
        this.soundInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.soundInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
        
        this.zoomInputContainer.style.display = this.zoomInputShown ? "" : "none";
        rectButton = this.zoomButton.getBoundingClientRect();
        rectContainer = this.zoomInputContainer.getBoundingClientRect();
        this.zoomInputContainer.style.left = (rectButton.left).toFixed(0) + "px";
        this.zoomInputContainer.style.top = (rectButton.top - rectContainer.height - margin).toFixed(0) + "px";
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
            this.timeFactorValue.innerText = this.game.currentTimeFactor.toFixed(2);
        }
        if (this.zoomInputShown) {
            this.zoomInput.value = this.game.getCameraZoomFactor().toFixed(3);
        }
        if (this.camModeInputShown) {
            if (this.game.cameraMode === CameraMode.None) {
                this.camValue.innerText = "None";
            }
            else if (this.game.cameraMode === CameraMode.Ball) {
                this.camValue.innerText = "Ball";
            }
            else if (this.game.cameraMode === CameraMode.Landscape) {
                this.camValue.innerText = "Landscape";
            }
            else if (this.game.cameraMode === CameraMode.Selected) {
                this.camValue.innerText = "Selected";
            }
        }
    }

    public onPlay = () => {
        this.game.machine.playing = true;
        if (this.game.machineEditor) {
            this.game.machineEditor.setSelectedObject(undefined);
        }
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

    public onCamButton = () => {
        this.camModeInputShown = !this.camModeInputShown;
        this.resize();
    }

    public onCamPrevButton = () => {
        this.game.setCameraMode(this.game.cameraMode - 1);
        this.resize();
    }

    public onCamNextButton = () => {
        this.game.setCameraMode(this.game.cameraMode + 1);
        this.resize();
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

    public onLayer = (e: PointerEvent) => {
        let rect = this.layerButton.getBoundingClientRect();
        let centerY = rect.top + rect.height * 0.5;
        if (e.y > centerY) {
            //this.game.machineEditor.currentLayer++;
        }
        else {
            //this.game.machineEditor.currentLayer--;
        }
    }

    public closeAllDropdowns = () => {
        if (this.camModeInputShown || this.timeFactorInputShown || this.loadInputShown || this.soundInputShown || this.zoomInputShown) {
            this.camModeInputShown = false;
            this.timeFactorInputShown = false;
            this.loadInputShown = false;
            this.soundInputShown = false;
            this.zoomInputShown = false;
            this.resize();
        }        
    }
}