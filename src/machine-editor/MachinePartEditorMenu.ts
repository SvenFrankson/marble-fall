class MachinePartEditorMenu {
    
    public container: HTMLDivElement;
    public showButton: HTMLButtonElement;
    public hideButton: HTMLButtonElement;

    public ijkLine: HTMLDivElement;
    public kLine: HTMLDivElement;
    public widthLine: HTMLDivElement;
    public heightLine: HTMLDivElement;
    public depthLine: HTMLDivElement;
    public countLine: HTMLDivElement;
    public mirrorXLine: HTMLDivElement;
    public mirrorZLine: HTMLDivElement;
    public fillLine: HTMLDivElement;
    public focusLine: HTMLDivElement;
    public deleteLine: HTMLDivElement;

    public titleElement: HTMLSpanElement;
    public ijkIElement: HTMLSpanElement;
    public ijkJElement: HTMLSpanElement;
    public ijkKElement: HTMLSpanElement;
    public kElement: HTMLSpanElement;
    public wPlusButton: HTMLButtonElement;
    public wMinusButton: HTMLButtonElement;
    public wValue: HTMLSpanElement;
    public hPlusButton: HTMLButtonElement;
    public hMinusButton: HTMLButtonElement;
    public hValue: HTMLSpanElement;
    public dPlusButton: HTMLButtonElement;
    public dMinusButton: HTMLButtonElement;
    public dValue: HTMLSpanElement;
    public nPlusButton: HTMLButtonElement;
    public nMinusButton: HTMLButtonElement;
    public nValue: HTMLSpanElement;
    public mirrorXButton: HTMLButtonElement;
    public mirrorZButton: HTMLButtonElement;
    public fillButton: HTMLButtonElement;
    public focusButton: HTMLButtonElement;
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

        this.ijkLine = document.getElementById("machine-editor-part-menu-ijk") as HTMLDivElement;
        this.ijkIElement = this.ijkLine.querySelector(".value.i") as HTMLSpanElement;
        this.ijkJElement = this.ijkLine.querySelector(".value.j") as HTMLSpanElement;
        this.ijkKElement = this.ijkLine.querySelector(".value.k") as HTMLSpanElement;

        this.kLine = document.getElementById("machine-editor-part-menu-k") as HTMLDivElement;
        this.kElement = this.kLine.querySelector(".value.k") as HTMLSpanElement;

        this.widthLine = document.getElementById("machine-editor-part-menu-width") as HTMLDivElement;
    
        this.wPlusButton = document.querySelector("#machine-editor-part-menu-width button.plus") as HTMLButtonElement;
        this.wPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w + 1;
    
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { w: w });
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.wMinusButton = document.querySelector("#machine-editor-part-menu-width button.minus") as HTMLButtonElement;
        this.wMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.xExtendable) {
                let w = this.currentObject.w - 1;
                if (w >= 1) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { w: w });
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
    
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { h: h });
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.hMinusButton = document.querySelector("#machine-editor-part-menu-height button.minus") as HTMLButtonElement;
        this.hMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.yExtendable) {
                let h = this.currentObject.h - 1;
                if (h >= this.currentObject.minH) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { h: h });
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
    
                if (d <= this.currentObject.maxD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { d: d });
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.dMinusButton = document.querySelector("#machine-editor-part-menu-depth button.minus") as HTMLButtonElement;
        this.dMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.zExtendable) {
                let d = this.currentObject.d - 1;
                if (d >= this.currentObject.minD) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { d: d });
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.dValue = document.querySelector("#machine-editor-part-menu-depth .value") as HTMLSpanElement;

        this.countLine = document.getElementById("machine-editor-part-menu-count") as HTMLDivElement;
    
        this.nPlusButton = document.querySelector("#machine-editor-part-menu-count button.plus") as HTMLButtonElement;
        this.nPlusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.nExtendable) {
                let n = this.currentObject.n + 1;
    
                let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { n: n });
                this.machineEditor.setSelectedObject(editedTrack);
            }
        }

        this.nMinusButton = document.querySelector("#machine-editor-part-menu-count button.minus") as HTMLButtonElement;
        this.nMinusButton.onclick = async () => {
            if (this.currentObject instanceof MachinePart && this.currentObject.nExtendable) {
                let n = this.currentObject.n - 1;
                if (n > 0) {
                    let editedTrack = await this.machineEditor.editTrackInPlace(this.currentObject, { n: n });
                    this.machineEditor.setSelectedObject(editedTrack);
                }
            }
        }

        this.nValue = document.querySelector("#machine-editor-part-menu-count .value") as HTMLSpanElement;

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

        this.fillLine = document.getElementById("machine-editor-part-menu-fill") as HTMLDivElement;

        this.fillButton = document.querySelector("#machine-editor-part-menu-fill button") as HTMLButtonElement;
        this.fillButton.onclick = this.machineEditor._onFill;

        this.focusLine = document.getElementById("machine-editor-part-menu-focus") as HTMLDivElement;

        this.focusButton = document.querySelector("#machine-editor-part-menu-focus button") as HTMLButtonElement;
        this.focusButton.onclick = this.machineEditor._onFocus;

        this.deleteLine = document.getElementById("machine-editor-part-menu-delete") as HTMLDivElement;

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
        if (this.container) {
            if (!this.currentObject) {
                this.container.style.display = "none";
            }
            else {
                this.container.style.display = "";
                this.showButton.style.display = this._shown ? "none" : "";
                this.hideButton.style.display = this._shown ? "" : "none";
                this.ijkLine.style.display = "none";
                this.kLine.style.display = this._shown && this.currentObject instanceof Ball ? "" : "none";
                this.widthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xExtendable ? "" : "none";
                this.heightLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.yExtendable ? "" : "none";
                this.depthLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zExtendable ? "" : "none";
                this.countLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.nExtendable ? "" : "none";
                this.mirrorXLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.xMirrorable ? "" : "none";
                this.mirrorZLine.style.display = this._shown && this.currentObject instanceof MachinePart && this.currentObject.zMirrorable ? "" : "none";
                this.fillLine.style.display = this._shown && this.currentObject instanceof Elevator ? "" : "none";
                this.focusLine.style.display = this._shown ? "" : "none";
                this.deleteLine.style.display = this._shown ? "" : "none";
    
                if (this.currentObject instanceof MachinePart) {
                    this.titleElement.innerText = this.currentObject.partName;
                    this.ijkIElement.innerText = this.currentObject.i.toFixed(0);
                    this.ijkJElement.innerText = this.currentObject.j.toFixed(0);
                    this.ijkKElement.innerText = this.currentObject.k.toFixed(0);
                    this.wValue.innerText = this.currentObject.w.toFixed(0);
                    this.hValue.innerText = this.currentObject.h.toFixed(0);
                    this.dValue.innerText = this.currentObject.d.toFixed(0);
                    this.nValue.innerText = this.currentObject.n.toFixed(0);
                }
                else if (this.currentObject instanceof Ball) {
                    this.titleElement.innerText = "Marble";
                    this.kElement.innerText = this.currentObject.k.toFixed(0);
                }
            }
        }
    }
}