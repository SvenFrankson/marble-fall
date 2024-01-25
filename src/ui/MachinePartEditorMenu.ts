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
    public deleteButton: HTMLButtonElement;

    private _currentObject: MachinePart | Ball;
    public get currentObject(): MachinePart | Ball {
        return this._currentObject;
    }
    public set currentObject(part: MachinePart | Ball) {
        this._currentObject = part;
        this.update();
    }

    private _shown: boolean = true;

    constructor(public machineEditor: MachineEditor) {

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
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w + 1;
    
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, w, this.currentObject.yExtendable ? this.currentObject.h : undefined, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.wMinusButton = document.querySelector("#machine-editor-part-menu-width button.minus") as HTMLButtonElement;
        this.wMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, w, this.currentObject.yExtendable ? this.currentObject.h : undefined, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.wValue = document.querySelector("#machine-editor-part-menu-width .value") as HTMLSpanElement;

        this.heightLine = document.getElementById("machine-editor-part-menu-height") as HTMLDivElement;
    
        this.hPlusButton = document.querySelector("#machine-editor-part-menu-height button.plus") as HTMLButtonElement;
        this.hPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.yExtendable) {
                let h = this.currentObject.h + 1;
    
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, h, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.hMinusButton = document.querySelector("#machine-editor-part-menu-height button.minus") as HTMLButtonElement;
        this.hMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.yExtendable) {
                let h = this.currentObject.h - 1;
                if (h >= 0) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, h, this.currentObject.zExtendable ? this.currentObject.d : undefined);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.hValue = document.querySelector("#machine-editor-part-menu-height .value") as HTMLSpanElement;

        this.depthLine = document.getElementById("machine-editor-part-menu-depth") as HTMLDivElement;
    
        this.dPlusButton = document.querySelector("#machine-editor-part-menu-depth button.plus") as HTMLButtonElement;
        this.dPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.zExtendable) {
                let d = this.currentObject.d + 1;
    
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, this.currentObject.yExtendable ? this.currentObject.h : undefined, d);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.dMinusButton = document.querySelector("#machine-editor-part-menu-depth button.minus") as HTMLButtonElement;
        this.dMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.zExtendable) {
                let d = this.currentObject.d - 1;
                if (d >= this.currentObject.minD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, undefined, undefined, undefined, this.currentObject.xExtendable ? this.currentObject.w : undefined, this.currentObject.yExtendable ? this.currentObject.h : undefined, d);
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.dValue = document.querySelector("#machine-editor-part-menu-depth .value") as HTMLSpanElement;

        this.mirrorXLine = document.getElementById("machine-editor-part-menu-mirrorX") as HTMLDivElement;

        this.mirrorXButton = document.querySelector("#machine-editor-part-menu-mirrorX button") as HTMLButtonElement;
        this.mirrorXButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart) {
                let editedTrack = await this.machineEditor.mirrorXTrackInPlace(this.currentObject);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.mirrorZLine = document.getElementById("machine-editor-part-menu-mirrorZ") as HTMLDivElement;

        this.mirrorZButton = document.querySelector("#machine-editor-part-menu-mirrorZ button") as HTMLButtonElement;
        this.mirrorZButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart) {
                let editedTrack = await this.machineEditor.mirrorZTrackInPlace(this.currentObject);
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.deleteButton = document.querySelector("#machine-editor-part-menu-delete button") as HTMLButtonElement;
        this.deleteButton.onclick = async () => {
            this.currentObject.dispose();
            this.machineEditor.setSelectedObject(undefined);
            this.machineEditor.setDraggedObject(undefined);
        }
    }

    public dispose(): void {
        this.currentObject = undefined;
    }

    public update(): void {
        if (!this.currentObject) {
            this.container.style.display = "none";
        }
        else {
            this.container.style.display = "";
            this.showButton.style.display = this._shown ? "none" : "";
            this.hideButton.style.display = this._shown ? "" : "none";
            this.widthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xExtendable ? "" : "none";
            this.heightLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.yExtendable ? "" : "none";
            this.depthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zExtendable ? "" : "none";
            this.mirrorXLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xMirrorable ? "" : "none";
            this.mirrorZLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zMirrorable ? "" : "none";

            if (this.currentObject instanceof MachinePart) {
                this.titleElement.innerText = this.currentObject.partName;
                this.wValue.innerText = this.currentObject.w.toFixed(0);
                this.hValue.innerText = this.currentObject.h.toFixed(0);
                this.dValue.innerText = this.currentObject.d.toFixed(0);
            }
            else if (this.currentObject instanceof Ball) {
                this.titleElement.innerText = "Marble";
            }
        }
    }
}