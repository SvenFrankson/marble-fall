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
    public floatingElementBottomLeft: FloatingElement;
    public floatingElementOrigin: FloatingElement;
    public floatingElementDestination: FloatingElement;

    public HPlusTopButton: HTMLButtonElement;
    public HMinusTopButton: HTMLButtonElement;
    public WPlusRightButton: HTMLButtonElement;
    public WMinusRightButton: HTMLButtonElement;
    public HPlusBottomButton: HTMLButtonElement;
    public HMinusBottomButton: HTMLButtonElement;
    public WPlusLeftButton: HTMLButtonElement;
    public WMinusLeftButton: HTMLButtonElement;
    public deletebutton: HTMLButtonElement;
    public tileMirrorXButton: HTMLButtonElement;
    public tileMirrorZButton: HTMLButtonElement;
    public DPlusButton: HTMLButtonElement;
    public DMinusButton: HTMLButtonElement;
    
    public originIPlusButton: HTMLButtonElement;
    public originIMinusButton: HTMLButtonElement;
    public originJPlusButton: HTMLButtonElement;
    public originJMinusButton: HTMLButtonElement;
    public originKPlusButton: HTMLButtonElement;
    public originKMinusButton: HTMLButtonElement;
    
    public destinationIPlusButton: HTMLButtonElement;
    public destinationIMinusButton: HTMLButtonElement;
    public destinationJPlusButton: HTMLButtonElement;
    public destinationJMinusButton: HTMLButtonElement;
    public destinationKPlusButton: HTMLButtonElement;
    public destinationKMinusButton: HTMLButtonElement;

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
                    this.mirrorXTrackInPlace(this.draggedObject).then(track => {
                        this.setDraggedObject(track);
                    });
                }
                else if (this.selectedObject && this.selectedObject instanceof MachinePart) {
                    this.mirrorXTrackInPlace(this.selectedObject).then(track => {
                        this.setSelectedObject(track);
                    });
                }
            }
            else if (event.code === "Numpad4") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginIMinus();
                }
            }
            else if (event.code === "Numpad6") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginIPlus();
                }
            }
            else if (event.code === "Numpad2") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginJPlus();
                }
            }
            else if (event.code === "Numpad8") {
                if (this.selectedObject && this.selectedObject instanceof Ramp) {
                    this._onOriginJMinus();
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
        this.tileMirrorXButton = this._createButton("machine-editor-mirror-x", this.floatingElementBottomRight);
        this.tileMirrorXButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L10 50 L25 70 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M75 30 L90 50 L75 70 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M15 50 L85 50" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.tileMirrorXButton.onclick = this._onMirrorX;
        this.tileMirrorZButton = this._createButton("machine-editor-mirror-z", this.floatingElementBottomRight);
        this.tileMirrorZButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L50 10 L70 25 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M30 75 L50 90 L70 75 Z" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M50 15 L50 85"  fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.tileMirrorZButton.onclick = this._onMirrorZ;
        
        this.floatingElementBottomLeft = FloatingElement.Create(this.game);
        this.floatingElementBottomLeft.style.width = "10px";
        this.floatingElementBottomLeft.anchor = FloatingElementAnchor.RightTop;
        this.DMinusButton = this._createButton("machine-editor-d-minus", this.floatingElementBottomLeft);
        this.DMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
            <path d="M10 70 L50 20 L90 70 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.DMinusButton.onclick = this._onDMinus;
        this.DPlusButton = this._createButton("machine-editor-d-plus", this.floatingElementBottomLeft);
        this.DPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M10 30 L50 80 L90 30 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.DPlusButton.onclick = this._onDPlus;

        // Ramp Origin UI
        this.floatingElementOrigin = FloatingElement.Create(this.game);
        this.floatingElementOrigin.style.width = "calc(var(--button-xs-size) * 3.5)";
        this.floatingElementOrigin.anchor = FloatingElementAnchor.CenterMiddle;
        
        this.originKMinusButton = this._createButton("machine-editor-origin-k-minus", this.floatingElementOrigin);
        this.originKMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
            <path d="M10 70 L50 20 L90 70 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originKMinusButton.onclick = this._onOriginKMinus;
        this.originJMinusButton = this._createButton("machine-editor-origin-j-minus", this.floatingElementOrigin);
        this.originJMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originJMinusButton.onclick = this._onOriginJMinus;
        this._createButton("", this.floatingElementOrigin, true);

        this.originIMinusButton = this._createButton("machine-editor-origin-i-minus", this.floatingElementOrigin);
        this.originIMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originIMinusButton.onclick = this._onOriginIMinus;
        this._createButton("", this.floatingElementOrigin, true);
        this.originIPlusButton = this._createButton("machine-editor-origin-i-plus", this.floatingElementOrigin);
        this.originIPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originIPlusButton.onclick = this._onOriginIPlus;

        this.originKPlusButton = this._createButton("machine-editor-origin-k-plus", this.floatingElementOrigin);
        this.originKPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M10 30 L50 80 L90 30 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originKPlusButton.onclick = this._onOriginKPlus;
        this.originJPlusButton = this._createButton("machine-editor-origin-j-plus", this.floatingElementOrigin);
        this.originJPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.originJPlusButton.onclick = this._onOriginJPlus;
        this._createButton("", this.floatingElementOrigin, true);

        // Ramp Destination UI
        this.floatingElementDestination = FloatingElement.Create(this.game);
        this.floatingElementDestination.style.width = "calc(var(--button-xs-size) * 3.5)";
        this.floatingElementDestination.anchor = FloatingElementAnchor.CenterMiddle;
        
        this.destinationKMinusButton = this._createButton("machine-editor-destination-k-minus", this.floatingElementDestination);
        this.destinationKMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
            <path d="M10 70 L50 20 L90 70 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationKMinusButton.onclick = this._onDestinationKMinus;
        this.destinationJMinusButton = this._createButton("machine-editor-destination-j-minus", this.floatingElementDestination);
        this.destinationJMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 70 L50 20 L80 70" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationJMinusButton.onclick = this._onDestinationJMinus;
        this._createButton("", this.floatingElementDestination, true);

        this.destinationIMinusButton = this._createButton("machine-editor-destination-i-minus", this.floatingElementDestination);
        this.destinationIMinusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M70 25 L20 50 L70 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationIMinusButton.onclick = this._onDestinationIMinus;
        this._createButton("", this.floatingElementDestination, true);
        this.destinationIPlusButton = this._createButton("machine-editor-destination-i-plus", this.floatingElementDestination);
        this.destinationIPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M30 25 L80 50 L30 80" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationIPlusButton.onclick = this._onDestinationIPlus;

        this.destinationKPlusButton = this._createButton("machine-editor-destination-k-plus", this.floatingElementDestination);
        this.destinationKPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M10 30 L50 80 L90 30 Z" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationKPlusButton.onclick = this._onDestinationKPlus;
        this.destinationJPlusButton = this._createButton("machine-editor-destination-j-plus", this.floatingElementDestination);
        this.destinationJPlusButton.innerHTML = `
            <svg class="label" viewBox="0 0 100 100">
                <path d="M25 30 L50 80 L80 30" fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        this.destinationJPlusButton.onclick = this._onDestinationJPlus;
        this._createButton("", this.floatingElementDestination, true);

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
            this.tileMirrorXButton,
            this.tileMirrorZButton,
            this.DPlusButton,
            this.DMinusButton,
            this.originIPlusButton,
            this.originIMinusButton,
            this.originJPlusButton,
            this.originJMinusButton,
            this.originKPlusButton,
            this.originKMinusButton,
            this.destinationIPlusButton,
            this.destinationIMinusButton,
            this.destinationJPlusButton,
            this.destinationJMinusButton,
            this.destinationKPlusButton,
            this.destinationKMinusButton,
        ];

        this.updateFloatingElements();
    }

    private _createButton(id: string, parent: HTMLElement, spacer: boolean = false): HTMLButtonElement {
        let button = document.createElement("button");
        if (id != "") {
            button.id = id;
        }
        button.classList.add("btn");
        button.classList.add("xs");
        if (spacer) {
            button.style.visibility = "hidden";
        }
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
        this.floatingElementBottomLeft.dispose();

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
                    if (mesh instanceof MachinePartSelectorMesh) {
                        if (mesh.part != this.draggedObject) {
                            return true;
                        }
                    }
                    if (mesh === this.layerMesh) {
                        return true;
                    }
                }
            )
    
            if (pick.hit && pick.pickedMesh === this.layerMesh) {
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
            else if (pick.hit && pick.pickedMesh instanceof MachinePartSelectorMesh && this.draggedObject instanceof MachinePart) {
                // Not working
                let n = pick.getNormal(true);
                if (Math.abs(n.x) > 0) {
                    let point = pick.pickedPoint
                    let i = Math.round(point.x / tileWidth);
                    let j = Math.floor((- point.y + 0.25 * tileHeight) / tileHeight);
                    if (i != this.draggedObject.i || j != this.draggedObject.j) {
                        this.draggedObject.setI(i);
                        this.draggedObject.setJ(j);
                        this.draggedObject.setK(pick.pickedMesh.part.k);
                        this.draggedObject.setIsVisible(true);
                        this.updateFloatingElements();
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

    public async editTrackInPlace(track: MachinePart, i?: number, j?: number, k?: number, w?: number, h?: number, d?: number): Promise<MachinePart> {
        if (!isFinite(i)) {
            i = track.i;
        }
        if (!isFinite(j)) {
            j = track.j;
        }
        if (!isFinite(k)) {
            k = track.k;
        }

        let editedTrack = this.machine.trackFactory.createTrackWHD(track.partName, i, j, k, w, h, d, track.mirrorX, track.mirrorZ);
        track.dispose();
        this.machine.parts.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        await editedTrack.instantiate();
        editedTrack.recomputeAbsolutePath();
        this.machine.generateBaseMesh();
        return editedTrack;
    }

    public async editRampOriginDestInPlace(ramp: Ramp, dOrigin: Nabu.IJK, dDestination: Nabu.IJK): Promise<Ramp> {
        let origin = ramp.getOrigin();
        origin.i += dOrigin.i;
        origin.j += dOrigin.j;
        origin.k += dOrigin.k;
        let destination = ramp.getDestination();
        destination.i += dDestination.i;
        destination.j += dDestination.j;
        destination.k += dDestination.k;

        if (origin.i >= destination.i) {
            return ramp;
        }

        let editedRamp = Ramp.CreateFromOriginDestination(origin, destination, this.machine);
        ramp.dispose();
        this.machine.parts.push(editedRamp);
        editedRamp.setIsVisible(true);
        editedRamp.generateWires();
        await editedRamp.instantiate();
        editedRamp.recomputeAbsolutePath();
        this.machine.generateBaseMesh();
        return editedRamp;
    }

    public async mirrorXTrackInPlace(track: MachinePart): Promise<MachinePart> {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, !track.mirrorX);
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate();
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }

    public async mirrorZTrackInPlace(track: MachinePart): Promise<MachinePart> {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, track.i, track.j, track.k, track.mirrorX, !track.mirrorZ);
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
                    this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                ));
                
                this.floatingElementRight.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xRight,
                    this.selectedObject.position.y + yCenter,
                    this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                ));

                this.floatingElementBottom.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xCenter,
                    this.selectedObject.position.y + yBottom,
                    this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                ));
                
                this.floatingElementLeft.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xLeft,
                    this.selectedObject.position.y + yCenter,
                    this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                ));

                this.floatingElementBottomRight.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xRight,
                    this.selectedObject.position.y + yBottom,
                    this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                ));

                this.floatingElementBottomLeft.setTarget(new BABYLON.Vector3(
                    this.selectedObject.position.x + xLeft,
                    this.selectedObject.position.y + yBottom,
                    this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                ));

                if (this.selectedObject instanceof Ramp) {
                    let origin = this.selectedObject.getOrigin();
                    this.floatingElementOrigin.setTarget(new BABYLON.Vector3(
                        origin.i * tileWidth - 0.5 * tileWidth,
                        - origin.j * tileHeight,
                        - origin.k * tileDepth
                    ));
                    let destination = this.selectedObject.getDestination();
                    this.floatingElementDestination.setTarget(new BABYLON.Vector3(
                        destination.i * tileWidth - 0.5 * tileWidth,
                        - destination.j * tileHeight,
                        - destination.k * tileDepth
                    ));

                    this.floatingElementDelete.setTarget(new BABYLON.Vector3(
                        this.selectedObject.position.x + xCenter,
                        this.selectedObject.position.y + yBottom,
                        this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                    ));
                    this.floatingElementDelete.anchor = FloatingElementAnchor.TopCenter;
                }
                else {
                    this.floatingElementDelete.setTarget(new BABYLON.Vector3(
                        this.selectedObject.position.x + xRight,
                        this.selectedObject.position.y + yTop,
                        this.selectedObject.position.z - 0.5 * (this.selectedObject.d - 1) * tileDepth,
                    ));
                    this.floatingElementDelete.anchor = FloatingElementAnchor.LeftBottom;
                }

                if (this.selectedObject instanceof Ramp) {
                    this.originIPlusButton.style.display = "";
                    this.originIMinusButton.style.display = "";
                    this.originJPlusButton.style.display = "";
                    this.originJMinusButton.style.display = "";
                    this.originKPlusButton.style.display = "";
                    this.originKMinusButton.style.display = "";
                    this.destinationIPlusButton.style.display = "";
                    this.destinationIMinusButton.style.display = "";
                    this.destinationJPlusButton.style.display = "";
                    this.destinationJMinusButton.style.display = "";
                    this.destinationKPlusButton.style.display = "";
                    this.destinationKMinusButton.style.display = "";
                }
                else {
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
                    if (this.selectedObject.zExtendable) {
                        this.DPlusButton.style.display = "";
                        this.DMinusButton.style.display = "";
                    }
                    if (this.selectedObject.xMirrorable) {
                        this.tileMirrorXButton.style.display = "";
                    }
                    if (this.selectedObject.zMirrorable) {
                        this.tileMirrorZButton.style.display = "";
                    }
                }
                this.deletebutton.style.display = "";
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

    private _onDPlus = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.zExtendable) {
            let d = track.d + 1;
            let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, track.yExtendable ? track.h : undefined, d);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onDMinus = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.zExtendable) {
            let d = track.d - 1;
            if (d >= 1) {
                let editedTrack = await this.editTrackInPlace(track, undefined, undefined, undefined, track.xExtendable ? track.w : undefined, track.yExtendable ? track.h : undefined, d);
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

    private _onMirrorX = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart) {
            let editedTrack = await this.mirrorXTrackInPlace(track);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onMirrorZ = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart) {
            let editedTrack = await this.mirrorZTrackInPlace(track);
            this.setSelectedObject(editedTrack);
        }
    }

    private _onOriginIPlus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginIMinus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: - 1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginJPlus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 1, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginJMinus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: - 1, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginKPlus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 1 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginKMinus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: - 1 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onDestinationIPlus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 1, j: 0, k: 0 }));
        }
    }

    private _onDestinationIMinus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: - 1, j: 0, k: 0 }));
        }
    }

    private _onDestinationJPlus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 1, k: 0 }));
        }
    }

    private _onDestinationJMinus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: - 1, k: 0 }));
        }
    }

    private _onDestinationKPlus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: 1 }));
        }
    }

    private _onDestinationKMinus = async () => {
        if (this.selectedObject instanceof Ramp) {
            this.setSelectedObject(await this.editRampOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: - 1 }));
        }
    }
}