class MachineEditor {

    public container: HTMLDivElement;
    public itemContainer: HTMLDivElement;
    public items: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    private _selectedItem: string = "";
    public get selectedItem(): string {
        return this._selectedItem;
    }
    public setSelectedItem(s: string): void {
        if (s != this._selectedItem) {
            let e = this.getCurrentItemElement();
            if (e) {
                e.classList.remove("selected");
            }
            this._selectedItem = s;
            e = this.getCurrentItemElement();
            if (e) {
                e.classList.add("selected");
            }
        }
    }

    private _selectedTrack: Track;
    public get selectedTrack(): Track {
        return this._selectedTrack;
    }
    public setSelectedTrack(s: Track): void {
        if (s != this._selectedTrack) {
            this._selectedTrack = s;
        }
    }

    constructor(public game: Game) {
        this.container = document.getElementById("machine-editor-menu") as HTMLDivElement;
        this.itemContainer = this.container.querySelector("#machine-editor-item-container") as HTMLDivElement;
    }

    public instantiate(): void {
        this.container.style.display = "block";
        for (let i = 0; i < TrackNames.length; i++) {
            let trackname = TrackNames[i];
            let item = document.createElement("div") as HTMLDivElement;
            item.classList.add("machine-editor-item");
            item.innerText = trackname;
            this.itemContainer.appendChild(item);
            this.items.set(trackname, item);

            item.addEventListener("pointerdown", () => {
                if (this.selectedTrack) {
                    this.selectedTrack.dispose();
                    this.setSelectedTrack(undefined);
                } 
                if (this.selectedItem === trackname) {
                    this.setSelectedItem("");
                }
                else {
                    this.setSelectedItem(trackname);
                    let track = this.game.machine.trackFactory.createTrack(this._selectedItem, - 10, - 10);
                    track.instantiate().then(() => {
                        track.setIsVisible(false);
                    });
                    this.setSelectedTrack(track);
                }
            });
        }

        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);

        document.getElementById("machine-editor-main-menu").onclick = () => {
            this.game.setContext(GameMode.MainMenu);
        }
    }

    public dispose(): void {
        this.container.style.display = "none";
        this.itemContainer.innerHTML = "";
        this.items = new Map<string, HTMLDivElement>();
        this.game.canvas.removeEventListener("pointermove", this.pointerMove);
        this.game.canvas.removeEventListener("pointerup", this.pointerUp);
    }

    public update(): void {
        let ratio = this.game.engine.getRenderWidth() / this.game.engine.getRenderHeight();
        if (ratio > 1) {
            this.container.classList.add("left");
            this.container.classList.remove("bottom");
        }
        else {
            this.container.classList.add("bottom");
            this.container.classList.remove("left");
        }
    }

    public pointerMove = (event: PointerEvent) => {
        if (this.selectedTrack) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    return mesh === this.game.machine.baseWall;
                }
            )
    
            if (pick.hit) {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor(- pick.pickedPoint.y / tileHeight);
                this.selectedTrack.setI(i);
                this.selectedTrack.setJ(j);
                this.selectedTrack.setIsVisible(true);
            }
            else {
                this.selectedTrack.setIsVisible(false);
            }
        }
    }

    public pointerUp = (event: PointerEvent) => {
        if (this.selectedTrack) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    return mesh === this.game.machine.baseWall;
                }
            )

            if (pick.hit) {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor(- pick.pickedPoint.y / tileHeight);
                this.selectedTrack.setI(i);
                this.selectedTrack.setJ(j);
                this.game.machine.tracks.push(this.selectedTrack);
                this.selectedTrack.setIsVisible(true);
                this.selectedTrack.generateWires();
                this.selectedTrack.instantiate().then(() => {
                    this.selectedTrack.recomputeAbsolutePath();
                    this.setSelectedTrack(undefined);
                });
                this.setSelectedItem("");
            }
        }
    }

    public getCurrentItemElement(): HTMLDivElement {
        return this.items.get(this._selectedItem);
    }
}