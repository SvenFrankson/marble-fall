class MachineEditor {

    public container: HTMLDivElement;
    public itemContainer: HTMLDivElement;
    public currentItem: string;

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
            item.addEventListener("pointerdown", () => {
                this.currentItem = trackname;
            });
        }

        this.game.canvas.addEventListener("pointerup", this.pointerUp)

        document.getElementById("machine-editor-main-menu").onclick = () => {
            this.game.setContext(GameMode.MainMenu);
        }
    }

    public dispose(): void {
        this.container.style.display = "none";
        this.itemContainer.innerHTML = "";
        this.game.canvas.removeEventListener("pointerup", this.pointerUp)
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

    public pointerUp = (event: PointerEvent) => {
        let pick = this.game.scene.pick(
            this.game.scene.pointerX,
            this.game.scene.pointerY,
            (mesh) => {
                return mesh === this.game.machine.baseWall;
            }
        )

        if (pick.hit) {
            if (this.currentItem) {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor(- pick.pickedPoint.y / tileHeight);
                let track = this.game.machine.trackFactory.createTrack(this.currentItem, i, j);
                this.game.machine.tracks.push(track);
                track.instantiate().then(() => {
                    track.recomputeAbsolutePath();
                });
            }
        }
    }
}