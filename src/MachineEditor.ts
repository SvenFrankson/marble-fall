class MachineEditor {

    public get machine(): Machine {
        return this.game.machine;
    }

    public container: HTMLDivElement;
    public itemContainer: HTMLDivElement;
    public items: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    public actionTiles: ActionTile[];
    
    public actionTileHPlusTop: ActionTile;
    public actionTileHMinusTop: ActionTile;
    public actionTileWPlusRight: ActionTile;
    public actionTileWMinusRight: ActionTile;
    public actionTileHDownBottom: ActionTile;
    public actionTileHUpBottom: ActionTile;
    public actionTileWPlusLeft: ActionTile;
    public actionTileWMinusLeft: ActionTile;
    public actionTileDelete: ActionTile;
    public actionTileMirror: ActionTile;

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
        this.updateActionTile();
    }

    constructor(public game: Game) {
        this.container = document.getElementById("machine-editor-menu") as HTMLDivElement;
        this.itemContainer = this.container.querySelector("#machine-editor-item-container") as HTMLDivElement;
    }

    public async instantiate(): Promise<void> {
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
                this._dragOffset.copyFromFloats(0, 0, 0);
            }
        });

        for (let i = 0; i < TrackNames.length; i++) {
            let trackname = TrackNames[i];
            if (trackname === "elevator") {
                trackname = "elevator-4";
            }
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
                    this._dragOffset.copyFromFloats(0, 0, 0);
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

        document.getElementById("machine-editor-save").addEventListener("click", () => {
            let data = this.machine.serialize();
            window.localStorage.setItem("last-saved-machine", JSON.stringify(data));
            Nabu.download("my-marble-machine.json", JSON.stringify(data));
        });
        document.getElementById("machine-editor-load-input").addEventListener("change", (event: Event) => {
            let files = (event.target as HTMLInputElement).files;
            let file = files[0];
            if (file) {
                const reader = new FileReader();
                reader.addEventListener('load', (event) => {
                    this.machine.dispose();
                    this.machine.deserialize(JSON.parse(event.target.result as string));
                    this.machine.instantiate();
                    this.machine.generateBaseMesh();
                    for (let i = 0; i < this.machine.balls.length; i++) {
                        this.machine.balls[i].setShowPositionZeroGhost(true);
                    }
                });
                reader.readAsText(file);
            }
        })
        document.getElementById("machine-editor-main-menu").onclick = () => {
            this.game.setContext(GameMode.MainMenu);
        }

        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }

        this.actionTileHPlusTop = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHPlusTop.instantiate();
        this.actionTileHPlusTop.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileHMinusTop = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHMinusTop.instantiate();
        this.actionTileHMinusTop.rotation.z = Math.PI;
        this.actionTileHMinusTop.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileWPlusRight = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWPlusRight.instantiate();
        this.actionTileWPlusRight.rotation.z = - Math.PI / 2;
        this.actionTileWPlusRight.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileWMinusRight = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWMinusRight.instantiate();
        this.actionTileWMinusRight.rotation.z = Math.PI / 2;
        this.actionTileWMinusRight.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileHDownBottom = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHDownBottom.instantiate();
        this.actionTileHDownBottom.rotation.z = Math.PI;
        this.actionTileHDownBottom.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileHUpBottom = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileHUpBottom.instantiate();
        this.actionTileHUpBottom.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileWPlusLeft = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWPlusLeft.instantiate();
        this.actionTileWPlusLeft.rotation.z = Math.PI / 2;
        this.actionTileWPlusLeft.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileWMinusLeft = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileWMinusLeft.instantiate();
        this.actionTileWMinusLeft.rotation.z = - Math.PI / 2;
        this.actionTileWMinusLeft.texture.drawText("^", 17, 66, "64px 'Arial'", "white", "black");

        this.actionTileDelete = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileDelete.instantiate();
        this.actionTileDelete.texture.drawText("x", 20, 45, "50px 'Arial'", "white", "black");

        this.actionTileMirror = new ActionTile("", this.actionTileSize, this.game);
        await this.actionTileMirror.instantiate();
        this.actionTileMirror.texture.drawText("< >", 5, 44, "37px 'Arial'", "white", "black");

        this.actionTiles = [
            this.actionTileHPlusTop,
            this.actionTileHMinusTop,
            this.actionTileWPlusRight,
            this.actionTileWMinusRight,
            this.actionTileHDownBottom,
            this.actionTileHUpBottom,
            this.actionTileWPlusLeft,
            this.actionTileWMinusLeft,
            this.actionTileDelete,
            this.actionTileMirror
        ];

        this.updateActionTile();
    }

    public dispose(): void {
        this.container.style.display = "none";
        this.itemContainer.innerHTML = "";
        this.items = new Map<string, HTMLDivElement>();
        this.game.canvas.removeEventListener("pointerdown", this.pointerDown);
        this.game.canvas.removeEventListener("pointermove", this.pointerMove);
        this.game.canvas.removeEventListener("pointerup", this.pointerUp);

        this.actionTiles.forEach(tile => {
            tile.dispose();
        });

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

    private _pointerDownX: number = 0;
    private _pointerDownY: number = 0;
    public pointerDown = (event: PointerEvent) => {
        this._pointerDownX = this.game.scene.pointerX;
        this._pointerDownY = this.game.scene.pointerY;
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
                    pick = this.game.scene.pick(
                        this.game.scene.pointerX,
                        this.game.scene.pointerY,
                        (mesh) => {
                            if (mesh === this.machine.baseWall) {
                                return true;
                            }
                        }
                    )
                    if (pick.hit && pick.pickedPoint) {
                        if (this.selectedObject instanceof Track) {
                            this._dragOffset.copyFrom(this.selectedObject.position).subtractInPlace(pick.pickedPoint);
                        }
                        else if (this.selectedObject instanceof Ball) {
                            this._dragOffset.copyFrom(this.selectedObject.positionZero).subtractInPlace(pick.pickedPoint);
                        }
                    }
                    else {
                        this._dragOffset.copyFromFloats(0, 0, 0);
                    }
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
    
            if (pick.hit) {
                let point = pick.pickedPoint.add(this._dragOffset);
                if (this.draggedObject instanceof Track) {
                    let i = Math.round(point.x / tileWidth);
                    let j = Math.floor((- point.y + 0.25 * tileHeight) / tileHeight);
                    if (i != this.draggedObject.i || j != this.draggedObject.j) {
                        this.draggedObject.setI(i);
                        this.draggedObject.setJ(j);
                        this.draggedObject.setIsVisible(true);
                        this.updateActionTile();
                    }
                }
                else if (this.draggedObject instanceof Ball) {
                    let p = point.clone();
                    p.z = 0;
                    this.draggedObject.setPositionZero(p);
                    this.draggedObject.setIsVisible(true);
                    this.updateActionTile();
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
        if (!this.draggedObject) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    return mesh instanceof ActionTile && this.actionTiles.indexOf(mesh) != - 1;
                }
            )
            if (pick.hit && pick.pickedMesh instanceof BABYLON.Mesh) {
                this.onActionTilePointerUp(pick.pickedMesh);
                return;
            }
        }
        
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

        if (pick.hit) {
            let point = pick.pickedPoint.add(this._dragOffset);
            if (this.draggedObject instanceof Track) {
                let draggedTrack = this.draggedObject as Track;
                let i = Math.round(point.x / tileWidth);
                let j = Math.floor((- point.y + 0.25 * tileHeight) / tileHeight);
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
                let p = point.clone();
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
                let dx = (this._pointerDownX - this.game.scene.pointerX);
                let dy = (this._pointerDownY - this.game.scene.pointerY);
                if (dx * dx + dy * dy < 10) {
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
    }

    public async editTrackInPlace(track: Track, i?: number, j?: number, w?: number, h?: number, mirror?: boolean): Promise<Track> {
        if (!isFinite(i)) {
            i = track.i;
        }
        if (!isFinite(j)) {
            j = track.j;
        }
        if (!mirror) {
            mirror = track.mirror;
        }

        let editedTrack = this.machine.trackFactory.createTrackWH(track.trackName, i, j, w, h, mirror);
        track.dispose();
        this.machine.tracks.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        await editedTrack.instantiate();
        editedTrack.recomputeAbsolutePath();
        return editedTrack;
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

    public actionTileSize: number = 0.018;
    public updateActionTile(): void {
        this.actionTiles.forEach(tile => {
            tile.setIsVisible(false);
        })
        if (this.selectedObject) {
            let s = this.actionTileSize;
            if (this.selectedObject instanceof Ball) {
                this.actionTileDelete.setIsVisible(true);
                
                this.actionTileDelete.position.x = 0;
                this.actionTileDelete.position.y = - this.selectedObject.radius - 1.2 * s;

                this.actionTileDelete.position.addInPlace(this.selectedObject.positionZeroGhost.position);
            }
            else if (this.selectedObject instanceof Track) {
                let s34 = 3 * s / 4;
                let xLeft = - tileWidth * 0.5;
                let xRight = tileWidth * (this.selectedObject.deltaI + 0.5);
                let xCenter = (xLeft + xRight) * 0.5;
                let yTop = tileHeight * 0.25;
                let yBottom = - tileHeight * (this.selectedObject.deltaJ + 0.75);
                let yCenter = (yTop + yBottom) * 0.5;

                this.actionTileHPlusTop.position.x = xCenter - s34;
                this.actionTileHPlusTop.position.y = yTop + s;
                this.actionTileHMinusTop.position.x = xCenter + s34;
                this.actionTileHMinusTop.position.y = yTop + s;
                
                this.actionTileWPlusRight.position.x = xRight + s;
                this.actionTileWPlusRight.position.y = yCenter + s34;
                this.actionTileWMinusRight.position.x = xRight + s;
                this.actionTileWMinusRight.position.y = yCenter - s34;

                this.actionTileHUpBottom.position.x = xCenter - s34;
                this.actionTileHUpBottom.position.y = yBottom - s;
                this.actionTileHDownBottom.position.x = xCenter + s34;
                this.actionTileHDownBottom.position.y = yBottom - s;
                
                this.actionTileWPlusLeft.position.x = xLeft - s;
                this.actionTileWPlusLeft.position.y = yCenter + s34;
                this.actionTileWMinusLeft.position.x = xLeft - s;
                this.actionTileWMinusLeft.position.y = yCenter - s34;

                this.actionTileMirror.position.x = xRight - 0.5 * s;
                this.actionTileMirror.position.y = yBottom - s;
                this.actionTileDelete.position.x = xRight - 0.5 * s;
                this.actionTileDelete.position.y = yTop + s;

                if (this.selectedObject.xExtendable) {
                    this.actionTileWMinusRight.setIsVisible(true);
                    this.actionTileWPlusRight.setIsVisible(true);
                    this.actionTileWMinusLeft.setIsVisible(true);
                    this.actionTileWPlusLeft.setIsVisible(true);
                }
                if (this.selectedObject.yExtendable) {
                    this.actionTileHMinusTop.setIsVisible(true);
                    this.actionTileHPlusTop.setIsVisible(true);
                    this.actionTileHUpBottom.setIsVisible(true);
                    this.actionTileHDownBottom.setIsVisible(true);
                }
                this.actionTileDelete.setIsVisible(true);
                this.actionTileMirror.setIsVisible(true);

                this.actionTiles.forEach(tile => {
                    tile.position.addInPlace(this.selectedObject.position);
                })
            }
        }
    }

    public async onActionTilePointerUp(tile: BABYLON.Mesh): Promise<void> {
        if (this.selectedObject) {
            if (tile === this.actionTileDelete) {
                this.selectedObject.dispose();
                this.setSelectedObject(undefined);
                this.setDraggedObject(undefined);
            }
            else if (this.selectedObject instanceof Track) {
                let track = this.selectedObject;
                if (tile === this.actionTileHPlusTop) {
                    if (track.yExtendable) {
                        let h = track.h + 1;
                        let j = track.j - 1;
    
                        let editedTrack = await this.editTrackInPlace(track, undefined, j, track.xExtendable ? track.w : undefined, h);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileHMinusTop) {
                    if (track.yExtendable) {
                        let h = track.h - 1;
                        let j = track.j + 1;

                        if (h >= 0) {
                            let editedTrack = await this.editTrackInPlace(track, undefined, j, track.xExtendable ? track.w : undefined, h);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileWPlusRight) {
                    if (track.xExtendable) {
                        let w = track.w + 1;

                        let editedTrack = await this.editTrackInPlace(track, undefined, undefined, w, track.yExtendable ? track.h : undefined);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileWMinusRight) {
                    if (track.xExtendable) {
                        let w = track.w - 1;

                        if (w >= 1) {
                            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, w, track.yExtendable ? track.h : undefined);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileHDownBottom) {
                    if (track.yExtendable) {
                        let h = track.h + 1;
                        
                        let editedTrack = await this.editTrackInPlace(track, undefined, undefined, track.xExtendable ? track.w : undefined, h);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileHUpBottom) {
                    if (track.yExtendable) {
                        let h = track.h - 1;
                        if (h >= 0) {
                            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, track.xExtendable ? track.w : undefined, h);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileWPlusLeft) {
                    if (track.xExtendable) {
                        let i = track.i - 1;
                        let w = track.w + 1;

                        let editedTrack = await this.editTrackInPlace(track, i, undefined, w, track.yExtendable ? track.h : undefined);
                        this.setSelectedObject(editedTrack);
                    }
                }
                else if (tile === this.actionTileWMinusLeft) {
                    if (track.xExtendable) {
                        let i = track.i + 1;
                        let w = track.w - 1;

                        if (w >= 1) {
                            let editedTrack = await this.editTrackInPlace(track, i, undefined, w, track.yExtendable ? track.h : undefined);
                            this.setSelectedObject(editedTrack);
                        }
                    }
                }
                else if (tile === this.actionTileMirror) {
                    track = await this.mirrorTrackInPlace(track);
                    this.setSelectedObject(track);
                }
            }
        }
    }
}