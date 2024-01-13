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
    private _draggedTrack: Track | Ball;
    public get draggedObject(): Track | Ball {
        return this._draggedTrack;
    }
    public setDraggedObject(s: Track | Ball): void {
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

    private _selectedObject: Track | Ball;
    public get selectedObject(): Track | Ball {
        return this._selectedObject;
    }
    public setSelectedObject(s: Track | Ball): void {
        if (this._selectedObject) {
            this._selectedObject.unselect();
        }
        if (s != this._selectedObject) {
            this._selectedObject = s;
        }
        if (this._selectedObject) {
            this._selectedObject.select();
        }
    }

    constructor(public game: Game) {
        this.container = document.getElementById("machine-editor-menu") as HTMLDivElement;
        this.itemContainer = this.container.querySelector("#machine-editor-item-container") as HTMLDivElement;
    }

    public instantiate(): void {
        this.container.style.display = "block";

        let ballItem = document.createElement("div") as HTMLDivElement;
        ballItem.classList.add("machine-editor-item");
        ballItem.innerText = "ball";
        this.itemContainer.appendChild(ballItem);
        this.items.set("ball", ballItem);

        ballItem.addEventListener("pointerdown", () => {
            if (this.draggedObject) {
                this.draggedObject.dispose();
                this.setDraggedObject(undefined);
            } 
            if (this.selectedItem === "ball") {
                this.setSelectedItem("");
            }
            else {
                this.setSelectedItem("ball");
                let ball = new Ball(BABYLON.Vector3.Zero(), this.machine);
                ball.instantiate().then(() => {
                    ball.setShowPositionZeroGhost(true);
                    ball.setIsVisible(false);
                });
                this.setDraggedObject(ball);
            }
        });

        for (let i = 0; i < TrackNames.length; i++) {
            let trackname = TrackNames[i];
            let item = document.createElement("div") as HTMLDivElement;
            item.classList.add("machine-editor-item");
            item.innerText = trackname;
            this.itemContainer.appendChild(item);
            this.items.set(trackname, item);

            item.addEventListener("pointerdown", () => {
                if (this.draggedObject) {
                    this.draggedObject.dispose();
                    this.setDraggedObject(undefined);
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
                    this.setDraggedObject(track);
                }
            });
        }

        document.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.key === "x") {
                if (this.selectedObject) {
                    this.selectedObject.dispose();
                    this.setSelectedObject(undefined);
                    this.setDraggedObject(undefined);
                }
            }
            else if (event.key === "m") {
                if (this.draggedObject && this.draggedObject instanceof Track) {
                    this.mirrorTrackInPlace(this.draggedObject).then(track => {
                        this.setDraggedObject(track);
                    });
                }
                else if (this.selectedObject && this.selectedObject instanceof Track) {
                    this.mirrorTrackInPlace(this.selectedObject).then(track => {
                        this.setSelectedObject(track);
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
        if (this.selectedObject) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    if (mesh instanceof BallGhost) {
                        return true;
                    }
                    else if (mesh === this.machine.baseWall) {
                        return true;
                    }
                    return false;
                }
            )
            console.log("down " + (pick.pickedMesh ? pick.pickedMesh.name : "no hit"));
    
            if (pick.hit) {
                let pickedObject: Track | Ball;
                if (pick.pickedMesh instanceof BallGhost) {
                    pickedObject = pick.pickedMesh.ball;
                }
                else {
                    let i = Math.round(pick.pickedPoint.x / tileWidth);
                    let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                    pickedObject = this.machine.tracks.find(track => {
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
                }
                if (pickedObject === this.selectedObject) {
                    this.setDraggedObject(this.selectedObject);
                }
            }
        }
    }

    public pointerMove = (event: PointerEvent) => {
        if (this.draggedObject) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    return mesh === this.machine.baseWall;
                }
            )
            console.log("move " + (pick.pickedMesh ? pick.pickedMesh.name : "no hit"));
    
            if (pick.hit) {
                if (this.draggedObject instanceof Track) {
                    let i = Math.round(pick.pickedPoint.x / tileWidth);
                    let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                    this.draggedObject.setI(i);
                    this.draggedObject.setJ(j);
                    this.draggedObject.setIsVisible(true);
                }
                else if (this.draggedObject instanceof Ball) {
                    let p = pick.pickedPoint.clone();
                    p.z = 0;
                    this.draggedObject.setPositionZero(p);
                    this.draggedObject.setIsVisible(true);
                    if (!this.machine.playing) {
                        this.draggedObject.reset();
                    }
                }
            }
            else {
                this.draggedObject.setIsVisible(false);
            }
        }
    }

    public pointerUp = (event: PointerEvent) => {
        let pick = this.game.scene.pick(
            this.game.scene.pointerX,
            this.game.scene.pointerY,
            (mesh) => {
                if (!this.draggedObject && mesh instanceof BallGhost) {
                    return true;
                }
                else if (mesh === this.machine.baseWall) {
                    return true;
                }
                return false;
            }
        )

        console.log("up " + (pick.pickedMesh ? pick.pickedMesh.name : "no hit"));

        if (pick.hit) {
            if (this.draggedObject instanceof Track) {
                let draggedTrack = this.draggedObject as Track;
                let i = Math.round(pick.pickedPoint.x / tileWidth);
                let j = Math.floor((- pick.pickedPoint.y + 0.25 * tileHeight) / tileHeight);
                draggedTrack.setI(i);
                draggedTrack.setJ(j);
                if (this.machine.tracks.indexOf(draggedTrack) === -1) {
                    this.machine.tracks.push(draggedTrack);
                }
                draggedTrack.setIsVisible(true);
                draggedTrack.generateWires();
                draggedTrack.instantiate().then(() => {
                    draggedTrack.recomputeAbsolutePath();
                    this.setSelectedObject(draggedTrack);
                    this.setDraggedObject(undefined);
                    this.setSelectedItem("");
                    this.machine.generateBaseMesh();
                });
            }
            else if (this.draggedObject instanceof Ball) {
                let p = pick.pickedPoint.clone();
                p.z = 0;
                this.draggedObject.setPositionZero(p);
                if (this.machine.balls.indexOf(this.draggedObject) === -1) {
                    this.machine.balls.push(this.draggedObject);
                }
                this.draggedObject.setIsVisible(true);
                this.draggedObject.reset();
                this.setSelectedObject(this.draggedObject);
                this.setDraggedObject(undefined);
                this.setSelectedItem("");
            }
            else {
                if (pick.pickedMesh instanceof BallGhost) {
                    this.setSelectedObject(pick.pickedMesh.ball);
                }
                else if (pick.pickedMesh === this.machine.baseWall) {
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
                    this.setSelectedObject(pickedTrack);
                }
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