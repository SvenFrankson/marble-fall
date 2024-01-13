class MachineEditor {

    public get machine(): Machine {
        return this.game.machine;
    }

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

    private _dragOffset: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private _draggedTrack: Track;
    public get draggedTrack(): Track {
        return this._draggedTrack;
    }
    public setDraggedTrack(s: Track): void {
        if (s != this._draggedTrack) {
            this._draggedTrack = s;
            if (this._draggedTrack) {
                this.game.camera.detachControl();
            }
            else {
                this.game.camera.attachControl();
            }
        }
    }

    private _selectedTrack: Track;
    public get selectedTrack(): Track {
        return this._selectedTrack;
    }
    public setSelectedTrack(s: Track): void {
        if (this._selectedTrack) {
            this._selectedTrack.unselect();
        }
        if (s != this._selectedTrack) {
            this._selectedTrack = s;
        }
        if (this._selectedTrack) {
            this._selectedTrack.select();
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
                if (this.draggedTrack) {
                    this.draggedTrack.dispose();
                    this.setDraggedTrack(undefined);
                } 
                if (this.selectedItem === trackname) {
                    this.setSelectedItem("");
                }
                else {
                    this.setSelectedItem(trackname);
                    let track = this.machine.trackFactory.createTrack(this._selectedItem, - 10, - 10);
                    track.instantiate().then(() => {
                        track.setIsVisible(false);
                    });
                    this.setDraggedTrack(track);
                }
            });
        }

        document.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.key === "x") {
                if (this.selectedTrack) {
                    this.selectedTrack.dispose();
                    this.setSelectedTrack(undefined);
                    this.setDraggedTrack(undefined);
                }
            }
            else if (event.key === "m") {
                if (this.draggedTrack) {
                    this.mirrorTrackInPlace(this.draggedTrack).then(track => {
                        this.setDraggedTrack(track);
                    });
                }
                else if (this.selectedTrack) {
                    this.mirrorTrackInPlace(this.selectedTrack).then(track => {
                        this.setSelectedTrack(track);
                    });
                }
            }
        });

        this.game.canvas.addEventListener("pointerdown", this.pointerDown);
        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);

        document.getElementById("machine-editor-play").onclick = () => {
            this.machine.play();
        }

        document.getElementById("machine-editor-stop").onclick = () => {
            this.machine.stop();
        }

        document.getElementById("machine-editor-main-menu").onclick = () => {
            this.game.setContext(GameMode.MainMenu);
        }

        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }
    }

    public dispose(): void {
        this.container.style.display = "none";
        this.itemContainer.innerHTML = "";
        this.items = new Map<string, HTMLDivElement>();
        this.game.canvas.removeEventListener("pointerdown", this.pointerDown);
        this.game.canvas.removeEventListener("pointermove", this.pointerMove);
        this.game.canvas.removeEventListener("pointerup", this.pointerUp);

        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(false);
        }
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

    public pointerDown = (event: PointerEvent) => {
        if (this.selectedTrack) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    return mesh === this.machine.baseWall;
                }
            )
    
            if (pick.hit) {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                let pickedTrack = this.machine.tracks.find(track => {
                    if (track.i <= i) {
                        if ((track.i + track.deltaI) >= i) {
                            if (track.j <= j) {
                                if ((track.j + track.deltaJ) >= j) {
                                    return true;
                                }
                            }
                        }
                    }
                });
                if (pickedTrack === this.selectedTrack) {
                    this.setDraggedTrack(this.selectedTrack);
                }
            }
        }
    }

    public pointerMove = (event: PointerEvent) => {
        if (this.draggedTrack) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    return mesh === this.machine.baseWall;
                }
            )
    
            if (pick.hit) {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                this.draggedTrack.setI(i);
                this.draggedTrack.setJ(j);
                this.draggedTrack.setIsVisible(true);
            }
            else {
                this.draggedTrack.setIsVisible(false);
            }
        }
    }

    public pointerUp = (event: PointerEvent) => {
        let pick = this.game.scene.pick(
            this.game.scene.pointerX,
            this.game.scene.pointerY,
            (mesh) => {
                return mesh === this.machine.baseWall;
            }
        )

        if (pick.hit) {
            if (this.draggedTrack) {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                this.draggedTrack.setI(i);
                this.draggedTrack.setJ(j);
                if (this.machine.tracks.indexOf(this.draggedTrack) === -1) {
                    this.machine.tracks.push(this.draggedTrack);
                }
                this.draggedTrack.setIsVisible(true);
                this.draggedTrack.generateWires();
                this.draggedTrack.instantiate().then(() => {
                    this.draggedTrack.recomputeAbsolutePath();
                    this.setSelectedTrack(this.draggedTrack);
                    this.setDraggedTrack(undefined);
                    this.setSelectedItem("");
                    this.machine.generateBaseMesh();
                });
            }
            else {
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                let pickedTrack = this.machine.tracks.find(track => {
                    if (track.i <= i) {
                        if ((track.i + track.deltaI) >= i) {
                            if (track.j <= j) {
                                if ((track.j + track.deltaJ) >= j) {
                                    return true;
                                }
                            }
                        }
                    }
                });
                this.setSelectedTrack(pickedTrack);
            }
        }
    }

    public async mirrorTrackInPlace(track: Track): Promise<Track> {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.trackName, track.i, track.j, !track.mirror);
        track.dispose();
        this.machine.tracks.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate();
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }

    public getCurrentItemElement(): HTMLDivElement {
        return this.items.get(this._selectedItem);
    }
}