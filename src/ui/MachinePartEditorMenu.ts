class MachinePartEditorMenu {
    
    public container: HTMLDivElement;
    public showButton: HTMLButtonElement;
    public hideButton: HTMLButtonElement;

    public widthLine: HTMLDivElement;
    public heightLine: HTMLDivElement;
    public depthLine: HTMLDivElement;
    public mirrorXLine: HTMLDivElement;
    public mirrorZLine: HTMLDivElement;

    public titleElement: HTMLSpanElement;
    public wPlusButton: HTMLButtonElement;
    public wMinusButton: HTMLButtonElement;
    public wValue: HTMLSpanElement;
    public hPlusButton: HTMLButtonElement;
    public hMinusButton: HTMLButtonElement;
    public hValue: HTMLSpanElement;
    public dPlusButton: HTMLButtonElement;
    public dMinusButton: HTMLButtonElement;
    public dValue: HTMLSpanElement;
    public mirrorXButton: HTMLButtonElement;
    public mirrorZButton: HTMLButtonElement;

    private _currentPart: MachinePart;
    public get currentPart(): MachinePart {
        return this._currentPart;
    }
    public set currentPart(part: MachinePart) {
        this._currentPart = part;
        this.update();
    }

    private _shown: boolean = true;

    constructor(public game: Game) {

    }

    public initialize(): void {
        this.container = document.getElementById("machine-editor-part-menu") as HTMLDivElement;

        this.titleElement = document.querySelector("#machine-editor-part-menu-title span") as HTMLSpanElement;

        this.showButton = document.querySelector("#machine-editor-part-menu-show") as HTMLButtonElement;
        this.showButton.onclick = () => {
            this._shown = true;
            this.update();
        }

        this.hideButton = document.querySelector("#machine-editor-part-menu-hide") as HTMLButtonElement;
        this.hideButton.onclick = () => {
            this._shown = false;
            this.update();
        }

        this.widthLine = document.getElementById("machine-editor-part-menu-width") as HTMLDivElement;
    
        this.wPlusButton = document.querySelector("#machine-editor-part-menu-width button.plus") as HTMLButtonElement;
        this.wPlusButton.onclick = async () => {
            if (this.currentPart.xExtendable) {
                let w = this.currentPart.w + 1;
    
                let editedTrack = await this.game.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, w, this.currentPart.yExtendable ? this.currentPart.h : undefined, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                this.game.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.wMinusButton = document.querySelector("#machine-editor-part-menu-width button.minus") as HTMLButtonElement;
        this.wMinusButton.onclick = async () => {
            if (this.currentPart.xExtendable) {
                let w = this.currentPart.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.game.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, w, this.currentPart.yExtendable ? this.currentPart.h : undefined, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                    this.game.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.wValue = document.querySelector("#machine-editor-part-menu-width .value") as HTMLSpanElement;

        this.heightLine = document.getElementById("machine-editor-part-menu-height") as HTMLDivElement;
    
        this.hPlusButton = document.querySelector("#machine-editor-part-menu-height button.plus") as HTMLButtonElement;
        this.hPlusButton.onclick = async () => {
            if (this.currentPart.yExtendable) {
                let h = this.currentPart.h + 1;
    
                let editedTrack = await this.game.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, h, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                this.game.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.hMinusButton = document.querySelector("#machine-editor-part-menu-height button.minus") as HTMLButtonElement;
        this.hMinusButton.onclick = async () => {
            if (this.currentPart.yExtendable) {
                let h = this.currentPart.h - 1;
                if (h >= 0) {
                    let editedTrack = await this.game.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, h, this.currentPart.zExtendable ? this.currentPart.d : undefined);
                    this.game.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.hValue = document.querySelector("#machine-editor-part-menu-height .value") as HTMLSpanElement;

        this.depthLine = document.getElementById("machine-editor-part-menu-depth") as HTMLDivElement;
    
        this.dPlusButton = document.querySelector("#machine-editor-part-menu-depth button.plus") as HTMLButtonElement;
        this.dPlusButton.onclick = async () => {
            if (this.currentPart.zExtendable) {
                let d = this.currentPart.d + 1;
    
                let editedTrack = await this.game.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, this.currentPart.yExtendable ? this.currentPart.h : undefined, d);
                this.game.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.dMinusButton = document.querySelector("#machine-editor-part-menu-depth button.minus") as HTMLButtonElement;
        this.dMinusButton.onclick = async () => {
            if (this.currentPart.zExtendable) {
                let d = this.currentPart.d - 1;
                if (d >= this.currentPart.minD) {
                    let editedTrack = await this.game.machineEditor.editTrackInPlace(this.currentPart, undefined, undefined, undefined, this.currentPart.xExtendable ? this.currentPart.w : undefined, this.currentPart.yExtendable ? this.currentPart.h : undefined, d);
                    this.game.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.dValue = document.querySelector("#machine-editor-part-menu-depth .value") as HTMLSpanElement;

        this.mirrorXLine = document.getElementById("machine-editor-part-menu-mirrorX") as HTMLDivElement;

        this.mirrorXButton = document.querySelector("#machine-editor-part-menu-mirrorX button") as HTMLButtonElement;
        this.mirrorXButton.onclick = async () => {
            let editedTrack = await this.game.machineEditor.mirrorXTrackInPlace(this.currentPart);
            this.game.machineEditor.setSelectedObject(editedTrack);
        }

        this.mirrorZLine = document.getElementById("machine-editor-part-menu-mirrorZ") as HTMLDivElement;

        this.mirrorZButton = document.querySelector("#machine-editor-part-menu-mirrorZ button") as HTMLButtonElement;
        this.mirrorZButton.onclick = async () => {
            let editedTrack = await this.game.machineEditor.mirrorZTrackInPlace(this.currentPart);
            this.game.machineEditor.setSelectedObject(editedTrack);
        }
    }

    public dispose(): void {
        this.currentPart = undefined;
    }

    public update(): void {
        if (!this.currentPart) {
            this.container.style.display = "none";
        }
        else {
            this.container.style.display = "";
            this.showButton.style.display = this._shown ? "none" : "";
            this.hideButton.style.display = this._shown ? "" : "none";
            this.widthLine.style.display = this._shown && this.currentPart.xExtendable ? "" : "none";
            this.heightLine.style.display = this._shown && this.currentPart.yExtendable ? "" : "none";
            this.depthLine.style.display = this._shown && this.currentPart.zExtendable ? "" : "none";
            this.mirrorXLine.style.display = this._shown && this.currentPart.xMirrorable ? "" : "none";
            this.mirrorZLine.style.display = this._shown && this.currentPart.zMirrorable ? "" : "none";

            this.titleElement.innerText = this.currentPart.partName;
            this.wValue.innerText = this.currentPart.w.toFixed(0);
            this.hValue.innerText = this.currentPart.h.toFixed(0);
            this.dValue.innerText = this.currentPart.d.toFixed(0);
        }
    }
}