class MachineEditor {

    public get machine(): Machine {
        return this.game.machine;
    }

    public container: HTMLDivElement;
    public itemContainer: HTMLDivElement;
    public items: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    public floatingButtons: HTMLButtonElement[];

    public floatingElementTop: FloatingElement;
    public floatingElementRight: FloatingElement;
    public floatingElementBottom: FloatingElement;
    public floatingElementLeft: FloatingElement;
    public floatingElementDelete: FloatingElement;
    public floatingElementBottomRight: FloatingElement;
    public HPlusTopButton: HTMLButtonElement;
    public HMinusTopButton: HTMLButtonElement;
    public WPlusRightButton: HTMLButtonElement;
    public WMinusRightButton: HTMLButtonElement;
    public HPlusBottomButton: HTMLButtonElement;
    public HMinusBottomButton: HTMLButtonElement;
    public WPlusLeftButton: HTMLButtonElement;
    public WMinusLeftButton: HTMLButtonElement;
    public deletebutton: HTMLButtonElement;
    public tileMirrorButton: HTMLButtonElement;

    private _currentLayer: number = 0;
    public get currentLayer(): number {
        return this._currentLayer;
    }
    public set currentLayer(v: number) {
        if (v >= 0) {
            this._currentLayer = Math.round(v);
            this.layerMesh.position.z = - this._currentLayer * tileDepth;
        }
    }
    public layerMesh: BABYLON.Mesh;
    public showCurrentLayer(): void {
        this.machine.parts.forEach(part => {
            if (part.k === this.currentLayer) {
                part.partVisibilityMode = PartVisibilityMode.Default;
            }
            else {
                part.partVisibilityMode = PartVisibilityMode.Ghost;
            }
        })
    }
    public hideCurrentLayer(): void {
        this.machine.parts.forEach(part => {
            part.partVisibilityMode = PartVisibilityMode.Default;
        })
    }

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
    private _draggedObject: MachinePart | Ball;
    public get draggedObject(): MachinePart | Ball {
        return this._draggedObject;
    }
    public setDraggedObject(s: MachinePart | Ball): void {
        if (s != this._draggedObject) {
            this._draggedObject = s;
            if (this._draggedObject) {
                this.game.camera.detachControl();
                this.showCurrentLayer();
            }
            else {
                this.game.camera.attachControl();
                this.hideCurrentLayer();
            }
        }
    }

    private _selectedObject: MachinePart | Ball;
    public get selectedObject(): MachinePart | Ball {
        return this._selectedObject;
    }
    public setSelectedObject(s: MachinePart | Ball): void {
        if (this._selectedObject) {
            this._selectedObject.unselect();
        }
        if (s != this._selectedObject) {
            this._selectedObject = s;
        }
        if (this._selectedObject) {
            this._selectedObject.select();
            if (this._selectedObject instanceof MachinePart) {
                this.currentLayer = this._selectedObject.k;
            }
        }
        this.updateFloatingElements();
    }

    constructor(public game: Game) {
        this.container = document.getElementById("machine-menu") as HTMLDivElement;
        this.itemContainer = this.container.querySelector("#machine-editor-item-container") as HTMLDivElement;
        this.layerMesh = BABYLON.MeshBuilder.CreatePlane("layer-mesh", { size: 2 });
        this.layerMesh.isVisible = false;
    }

    public async instantiate(): Promise<void> {
        document.getElementById("machine-editor-objects").style.display = "block";
        this.game.toolbar.resize();

        let ballItem = document.createElement("div") as HTMLDivElement;
        ballItem.classList.add("machine-editor-item");
        ballItem.style.backgroundImage = "url(./datas/icons/ball.png)"
        ballItem.style.backgroundSize = "cover";
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
            let item = document.createElement("div") as HTMLDivElement;
            item.classList.add("machine-editor-item");
            item.style.backgroundImage = "url(./datas/icons/" + trackname + ".png)"
            item.style.backgroundSize = "cover";
            item.innerText = trackname.split("-")[0];
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
                    let track = this.machine.trackFactory.createTrack(this._selectedItem, - 10, - 10, this.currentLayer);
                    track.instantiate().then(() => {
                        track.setIsVisible(false);
                    });
                    this.setDraggedObject(track);
                    this._dragOffset.copyFromFloats(0, 0, 0);
                }
            });
        }

        document.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.key === "x" || event.key === "Delete") {
                if (this.selectedObject) {
                    this.selectedObject.dispose();
                    this.setSelectedObject(undefined);
                    this.setDraggedObject(undefined);
                }
            }
            else if (event.key === "m") {
                if (this.draggedObject && this.draggedObject instanceof MachinePart) {
                    this.mirrorTrackInPlace(this.draggedObject).then(track => {
                        this.setDraggedObject(track);
                    });
                }
                else if (this.selectedObject && this.selectedObject instanceof MachinePart) {
                    this.mirrorTrackInPlace(this.selectedObject).then(track => {
                        this.setSelectedObject(track);
                    });
                }
            }
        });

        this.game.canvas.addEventListener("pointerdown", this.pointerDown);
        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);

        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }

        this.floatingElementTop = FloatingElement.Create(this.game);
        this.floatingElementTop.anchor = FloatingElementAnchor.BottomCenter;
        this.HPlusTopButton = this._createButton("machine-editor-h-plus-top", this.floatingElementTop);
        this.HPlusTopButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HPlusTopButton.onclick = this._onHPlusTop;
        this.HMinusTopButton = this._createButton("machine-editor-h-minus-top", this.floatingElementTop);
        this.HMinusTopButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HMinusTopButton.onclick = this._onHMinusTop;

        this.floatingElementRight = FloatingElement.Create(this.game);
        this.floatingElementRight.anchor = FloatingElementAnchor.LeftMiddle;
        this.WMinusRightButton = this._createButton("machine-editor-w-minus-right", this.floatingElementRight);
        this.WMinusRightButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.WMinusRightButton.onclick = this._onWMinusRight;
        this.WPlusRightButton = this._createButton("machine-editor-w-plus-right", this.floatingElementRight);
        this.WPlusRightButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
				<path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
			</svg>
        `;
        this.WPlusRightButton.onclick = this._onWPlusRight;

        this.floatingElementBottom = FloatingElement.Create(this.game);
        this.floatingElementBottom.anchor = FloatingElementAnchor.TopCenter;
        this.HMinusBottomButton = this._createButton("machine-editor-h-minus-bottom", this.floatingElementBottom);
        this.HMinusBottomButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HMinusBottomButton.onclick = this._onHMinusBottom;
        this.HPlusBottomButton = this._createButton("machine-editor-h-plus-bottom", this.floatingElementBottom);
        this.HPlusBottomButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.HPlusBottomButton.onclick = this._onHPlusBottom;

        this.floatingElementLeft = FloatingElement.Create(this.game);
        this.floatingElementLeft.anchor = FloatingElementAnchor.RightMiddle;
        this.WPlusLeftButton = this._createButton("machine-editor-w-plus-left", this.floatingElementLeft);
        this.WPlusLeftButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.WPlusLeftButton.onclick = this._onWPlusLeft;
        this.WMinusLeftButton = this._createButton("machine-editor-w-minus-left", this.floatingElementLeft);
        this.WMinusLeftButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.WMinusLeftButton.onclick = this._onWMinusLeft;

        this.floatingElementDelete = FloatingElement.Create(this.game);
        this.floatingElementDelete.anchor = FloatingElementAnchor.LeftBottom;
        this.deletebutton = this._createButton("machine-editor-delete", this.floatingElementDelete);
        this.deletebutton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 25 L75 75 M25 75 L75 25" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.deletebutton.onclick = this._onDelete;

        this.floatingElementBottomRight = FloatingElement.Create(this.game);
        this.floatingElementBottomRight.anchor = FloatingElementAnchor.LeftTop;
        this.tileMirrorButton = this._createButton("machine-editor-mirror", this.floatingElementBottomRight);
        this.tileMirrorButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L10 50 L25 70 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M75 30 L90 50 L75 70 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M15 50 L85 50" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.tileMirrorButton.onclick = this._onMirror;

        this.floatingButtons = [
            this.HPlusTopButton,
            this.HMinusTopButton,
            this.WMinusRightButton,
            this.WPlusRightButton,
            this.HMinusBottomButton,
            this.HPlusBottomButton,
            this.WPlusLeftButton,
            this.WMinusLeftButton,
            this.deletebutton,
            this.tileMirrorButton
        ];

        this.updateFloatingElements();
    }

    private _createButton(id: string, parent: HTMLElement): HTMLButtonElement {
        let button = document.createElement("button");
        button.id = id;
        button.classList.add("btn");
        button.classList.add("xs");
        parent.appendChild(button);
        return button;
    }

    public dispose(): void {
        document.getElementById("machine-editor-objects").style.display = "none";
        this.game.toolbar.resize();

        this.floatingElementTop.dispose();
        this.floatingElementRight.dispose();
        this.floatingElementBottom.dispose();
        this.floatingElementLeft.dispose();
        this.floatingElementDelete.dispose();
        this.floatingElementBottomRight.dispose();

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
                    if (mesh instanceof BallGhost || mesh instanceof MachinePartSelectorMesh) {
                        return true;
                    }
                    return false;
                }
            )
    
            if (pick.hit) {
                let pickedObject: MachinePart | Ball;
                if (pick.pickedMesh instanceof BallGhost) {
                    pickedObject = pick.pickedMesh.ball;
                }
                else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                    console.log("!");
                    pickedObject = pick.pickedMesh.part;
                }
                if (pickedObject === this.selectedObject) {
                    pick = this.game.scene.pick(
                        this.game.scene.pointerX,
                        this.game.scene.pointerY,
                        (mesh) => {
                            if (mesh === this.layerMesh) {
                                return true;
                            }
                        }
                    )
                    if (pick.hit && pick.pickedPoint) {
                        if (this.selectedObject instanceof MachinePart) {
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
                    return mesh === this.layerMesh;
                }
            )
    
            if (pick.hit) {
                let point = pick.pickedPoint.add(this._dragOffset);
                if (this.draggedObject instanceof MachinePart) {
                    let i = Math.round(point.x / tileWidth);
                    let j = Math.floor((- point.y + 0.25 * tileHeight) / tileHeight);
                    if (i != this.draggedObject.i || j != this.draggedObject.j) {
                        this.draggedObject.setI(i);
                        this.draggedObject.setJ(j);
                        this.draggedObject.setIsVisible(true);
                        this.updateFloatingElements();
                    }
                }
                else if (this.draggedObject instanceof Ball) {
                    let p = point.clone();
                    p.z = 0;
                    this.draggedObject.setPositionZero(p);
                    this.draggedObject.setIsVisible(true);
                    this.updateFloatingElements();
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
                if (!this.draggedObject && (mesh instanceof BallGhost || mesh instanceof MachinePartSelectorMesh)) {
                    return true;
                }
                else if (this.draggedObject && mesh === this.layerMesh) {
                    return true;
                }
                return false;
            }
        )

        if (pick.hit) {
            let point = pick.pickedPoint.add(this._dragOffset);
            if (this.draggedObject instanceof MachinePart) {
                let draggedTrack = this.draggedObject as MachinePart;
                let i = Math.round(point.x / tileWidth);
                let j = Math.floor((- point.y + 0.25 * tileHeight) / tileHeight);
                draggedTrack.setI(i);
                draggedTrack.setJ(j);
                if (this.machine.parts.indexOf(draggedTrack) === -1) {
                    this.machine.parts.push(draggedTrack);
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
                    else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                        this.setSelectedObject(pick.pickedMesh.part);
                    }
                }
            }
        }
        else {
            let dx = (this._pointerDownX - this.game.scene.pointerX);
            let dy = (this._pointerDownY - this.game.scene.pointerY);
            if (dx * dx + dy * dy < 10) {
                this.setSelectedObject(undefined);
            }
        }
    }

    public async editTrackInPlace(track: MachinePart, i?: number, j?: number, k?: number, w?: number, h?: number, d?: number, mirror?: boolean): Promise<MachinePart> {
        if (!isFinite(i)) {
            i = track.i;
        }
        if (!isFinite(j)) {
            j = track.j;
        }
        if (!isFinite(k)) {
            k = track.k;
        }
        if (!mirror) {
            mirror = track.mirrorX;
        }

        let editedTrack = this.machine.trackFactory.createTrackWHD(track.partName, i, j, k, w, h, d, mirror);
        track.dispose();
        this.machine.parts.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        await editedTrack.instantiate();
        editedTrack.recomputeAbsolutePath();
        this.machine.generateBaseMesh();
        return editedTrack;
    }

    public async mirrorTrackInPlace(track: MachinePart): Promise<MachinePart> {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, !track.mirrorX);
        track.dispose();
        this.machine.parts.push(mirroredTrack);
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
    public updateFloatingElements(): void {
        this.floatingButtons.forEach(button => {
            button.style.display = "none";
        })
        if (this.selectedObject) {
            let s = this.actionTileSize;
            if (this.selectedObject instanceof Ball) {
                this.deletebutton.style.display = "";
                
                this.floatingElementDelete.setTarget(new BABYLON.Vector3(
                    this.selectedObject.positionZeroGhost.position.x,
                    this.selectedObject.positionZeroGhost.position.y - this.selectedObject.radius - 0.005,
                    this.selectedObject.positionZeroGhost.position.z + 0,
                ));
                this.floatingElementDelete.anchor = FloatingElementAnchor.TopCenter;
            }
            else if (this.selectedObject instanceof MachinePart) {
                let s34 = 3 * s / 4;
                let xLeft = - tileWidth * 0.5;
                let xRight = tileWidth * (this.selectedObject.w - 0.5);
                let xCenter = (xLeft + xRight) * 0.5;
                let yTop = tileHeight * 0.25;
                let yBottom = - tileHeight * (this.selectedObject.h + 0.75);
                let yCenter = (yTop + yBottom) * 0.5;

                this.floatingElementTop.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xCenter,
                    this.selectedObject.position.y + yTop,
                    this.selectedObject.position.z + 0,
                ));
                
                this.floatingElementRight.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xRight,
                    this.selectedObject.position.y + yCenter,
                    this.selectedObject.position.z + 0,
                ));

                this.floatingElementBottom.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xCenter,
                    this.selectedObject.position.y + yBottom,
                    this.selectedObject.position.z + 0,
                ));
                
                this.floatingElementLeft.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xLeft,
                    this.selectedObject.position.y + yCenter,
                    this.selectedObject.position.z + 0,
                ));

                this.floatingElementDelete.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xRight,
                    this.selectedObject.position.y + yTop,
                    this.selectedObject.position.z + 0,
                ));
                this.floatingElementDelete.anchor = FloatingElementAnchor.LeftBottom;

                this.floatingElementBottomRight.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xRight,
                    this.selectedObject.position.y + yBottom,
                    this.selectedObject.position.z + 0,
                ));

                if (this.selectedObject.xExtendable) {
                    this.WMinusRightButton.style.display = "";
                    this.WPlusRightButton.style.display = "";
                    this.WMinusLeftButton.style.display = "";
                    this.WPlusLeftButton.style.display = "";
                }
                if (this.selectedObject.yExtendable) {
                    this.HMinusTopButton.style.display = "";
                    this.HPlusTopButton.style.display = "";
                    this.HPlusBottomButton.style.display = "";
                    this.HMinusBottomButton.style.display = "";
                }
                this.deletebutton.style.display = "";
                if (this.selectedObject.xMirrorable) {
                    this.tileMirrorButton.style.display = "";
                }
            }
        }
    }

    private _onHPlusTop = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h + 1;
            let j = track.j - 1;

            let editedTrack = await this.editTrackInPlace(track, undefined, j, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onHMinusTop = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h - 1;
            let j = track.j + 1;

            if (h >= 0) {
                let editedTrack = await this.editTrackInPlace(track, undefined, j, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onWPlusRight = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let w = track.w + 1;

            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onWMinusRight = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let w = track.w - 1;

            if (w >= 1) {
                let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onHPlusBottom = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h + 1;
            
            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onHMinusBottom = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h - 1;
            if (h >= 0) {
                let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, h, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onWPlusLeft = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let i = track.i - 1;
            let w = track.w + 1;

            let editedTrack = await this.editTrackInPlace(track, i, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onWMinusLeft = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let i = track.i + 1;
            let w = track.w - 1;

            if (w >= 1) {
                let editedTrack = await this.editTrackInPlace(track, i, undefined, undefined, w, track.yExtendable ? track.h : undefined, track.zExtendable ? track.d : undefined);
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onDelete = async () => {
        if (this.selectedObject) {
            this.selectedObject.dispose();
            this.setSelectedObject(undefined);
            this.setDraggedObject(undefined);
        }
    }

    private _onMirror = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart) {
            track = await this.mirrorTrackInPlace(track);
            this.setSelectedObject(track);
        }
    }
}