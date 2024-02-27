interface IConfigurationData {

    handleSize?: number;
    graphicQ?: number;
    uiSize?: number;
    gridOpacity?: number;
}

class Configuration {

    private _handleSize: number = 1;
    public get handleSize() {
        return this._handleSize; 
    }
    public setHandleSize(v: number, skipStorage?: boolean) {
        if (isFinite(v)) {
            if (v > 0 && v <= 3) {
                this._handleSize = v;

                if (this.game.machineEditor) {
                    this.game.machineEditor.handles.forEach(handle => {
                        handle.size = this._handleSize;
                    })
                }

                if (!skipStorage) {
                    this.saveToLocalStorage();
                }
            }
        }
    }

    private _graphicQ: number = 3;
    public get graphicQ() {
        return this._graphicQ;
    }
    public setGraphicQ(v: number, skipStorage?: boolean) {
        if (v >= 1 && v <= 3) {
            this._graphicQ = v;

            if (this.game.machine) {
                let data = this.game.machine.serialize();
                this.game.machine.dispose();
                this.game.machine.deserialize(data);
                this.game.machine.instantiate();
            }
            if (this.game.room) {
                this.game.room.dispose();
                if (this._graphicQ > 1) {
                    this.game.room = new Room(this.game);
                    this.game.room.instantiate();
                }
            }
            this.game.updateCameraLayer();

            if (!skipStorage) {
                this.saveToLocalStorage();
            }
        }
    }

    private _uiSize: number = 1.3;
    public get uiSize() {
        return this._uiSize;
    }
    public setUISize(v: number, skipStorage?: boolean) {
        if (v >= 0.9 && v <= 2) {
            this._uiSize = v;

            var r = document.querySelector(':root') as HTMLElement;
            r.style.setProperty("--ui-size", (this._uiSize * 100).toFixed(0) + "%");

            if (!skipStorage) {
                this.saveToLocalStorage();
            }
        }
    }

    private _gridOpacity: number = 0.3;
    public get gridOpacity() {
        return this._gridOpacity;
    }
    public setGridOpacity(v: number, skipStorage?: boolean) {
        if (v >= 0 && v <= 1) {
            this._gridOpacity = v;

            if (this.game.gridMaterial) {
                this.game.gridMaterial.alpha = v;
            }

            if (!skipStorage) {
                this.saveToLocalStorage();
            }
        }
    }

    constructor(public game: Game) {

    }

    public initialize(): void {
        let data = JSON.parse(localStorage.getItem("mrs-configuration"));
        this.deserialize(data);
    }

    public saveToLocalStorage(): void {
        let data = this.serialize();
        localStorage.setItem("mrs-configuration", JSON.stringify(data));
    }

    public serialize(): IConfigurationData {
        return {
            handleSize: this.handleSize,
            graphicQ: this.graphicQ,
            uiSize: this.uiSize,
            gridOpacity: this.gridOpacity
        }
    }

    public deserialize(data: IConfigurationData) {
        if (!data) {
            data = {};
            if (!isFinite(data.handleSize)) {
                data.handleSize = this.handleSize;
            }
            if (!isFinite(data.graphicQ)) {
                data.graphicQ = this.graphicQ;
            }
            if (!isFinite(data.uiSize)) {
                data.uiSize = this.uiSize;
            }
            if (!isFinite(data.gridOpacity)) {
                data.gridOpacity = this.gridOpacity;
            }
        }
        if (data) {
            if (isFinite(data.handleSize)) {
                this.setHandleSize(data.handleSize, true);
            }
            if (isFinite(data.graphicQ)) {
                this.setGraphicQ(data.graphicQ, true);
            }
            if (isFinite(data.uiSize)) {
                this.setUISize(data.uiSize, true);
            }
            if (isFinite(data.gridOpacity)) {
                this.setGridOpacity(data.gridOpacity, true);
            }
        }
    }
}