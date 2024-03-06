class MachineEditor {

    public get machine(): Machine {
        return this.game.machine;
    }

    public container: HTMLDivElement;
    public itemContainer: HTMLDivElement;
    public items: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    public machinePartEditorMenu: MachinePartEditorMenu;

    public showManipulators: boolean = false;
    public showDisplacers: boolean = true;

    public floatingButtons: HTMLButtonElement[];
    public handles: Arrow[] = [];

    public floatingElementTop: FloatingElement;
    public floatingElementRight: FloatingElement;
    public floatingElementBottom: FloatingElement;
    public floatingElementLeft: FloatingElement;
    public floatingElementBottomRight: FloatingElement;
    public floatingElementBottomLeft: FloatingElement;

    public HPlusTopButton: HTMLButtonElement;
    public HMinusTopButton: HTMLButtonElement;
    public WPlusRightButton: HTMLButtonElement;
    public WMinusRightButton: HTMLButtonElement;
    public HPlusBottomButton: HTMLButtonElement;
    public HMinusBottomButton: HTMLButtonElement;
    public WPlusLeftButton: HTMLButtonElement;
    public WMinusLeftButton: HTMLButtonElement;
    public tileMirrorXButton: HTMLButtonElement;
    public tileMirrorZButton: HTMLButtonElement;
    public DPlusButton: HTMLButtonElement;
    public DMinusButton: HTMLButtonElement;

    public IPlusHandle: Arrow;
    public IMinusHandle: Arrow;
    public JPlusHandle: Arrow;
    public JMinusHandle: Arrow;
    public KPlusHandle: Arrow;
    public KMinusHandle: Arrow;
    
    public smallHandleSize: number = 0.02;
    public originIPlusHandle: Arrow;
    public originIMinusHandle: Arrow;
    public originJPlusHandle: Arrow;
    public originJMinusHandle: Arrow;
    public originKPlusHandle: Arrow;
    public originKMinusHandle: Arrow;
    
    public destinationIPlusHandle: Arrow;
    public destinationIMinusHandle: Arrow;
    public destinationJPlusHandle: Arrow;
    public destinationJMinusHandle: Arrow;
    public destinationKPlusHandle: Arrow;
    public destinationKMinusHandle: Arrow;

    public handleSize: number;
    
    public grid: MachineEditorGrid;

    private _hoveredObject: Arrow;
    public get hoveredObject(): Arrow {
        return this._hoveredObject;
    }
    public set hoveredObject(o: Arrow) {
        if (o != this._hoveredObject) {
            if (this._hoveredObject) {
                this._hoveredObject.unlit();
            }
            this._hoveredObject = o;
            if (this._hoveredObject) {
                this._hoveredObject.highlight();
            }
        }
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
                //this.showCurrentLayer();
            }
            else {
                this.game.camera.attachControl();
                //this.hideCurrentLayer();
            }
        }
    }

    private _majDown: boolean = false;
    private _ctrlDown: boolean = false;
    public selectedObjects: (MachinePart | Ball)[] = [];
    public get selectedObjectsCount(): number {
        return this.selectedObjects.length;
    }
    public get selectedObject(): MachinePart | Ball {
        return this.selectedObjects[0];
    }
    public setSelectedObject(s: MachinePart | Ball, skipUpdateGridPosition?: boolean): void {
        if (this.selectedObjects) {
            this.selectedObjects.forEach(obj => {
                obj.unselect();
            })
        }

        if (s) {
            this.selectedObjects = [s];
            if (this.game.cameraMode === CameraMode.Selected) {
                this._onFocus();
            }
        }
        else {
            this.selectedObjects = [];
        }

        if (this.selectedObjects[0]) {
            if (!skipUpdateGridPosition) {
                this.grid.position.copyFrom(this.selectedObjects[0].position);
            }
            this.selectedObjects[0].select();
            this.machinePartEditorMenu.currentObject = this.selectedObjects[0];
        }
        else {
            this.machinePartEditorMenu.currentObject = undefined;
        }
        this.updateFloatingElements();
    }
    public addOrRemoveSelectedObjects(...objects: (MachinePart | Ball)[]): void {
        for (let i = 0; i < objects.length; i++) {
            let object = objects[i];
            if (!(this.challengeMode && object instanceof MachinePart && !object.isSelectable)) {
                let index = this.selectedObjects.indexOf(object);
                if (index === - 1) {
                    this.selectedObjects.push(object);
                    object.select();
                }
                else {
                    this.selectedObjects.splice(index, 1);
                    object.unselect();
                }
            }
        }
        if (this.game.cameraMode === CameraMode.Selected) {
            this._onFocus();
        }
        if (this.selectedObjectsCount === 1) {
            this.machinePartEditorMenu.currentObject = this.selectedObject;
        }
        if (this.selectedObjectsCount > 1) {
            this.machinePartEditorMenu.currentObject = undefined;
        }
        this.updateFloatingElements();
    }

    constructor(public game: Game) {
        this.container = document.getElementById("machine-editor-objects") as HTMLDivElement;
        this.itemContainer = this.container.querySelector("#machine-editor-item-container") as HTMLDivElement;
        this.grid = new MachineEditorGrid(this);
        this.machinePartEditorMenu = new MachinePartEditorMenu(this);
    }

    public get challengeMode(): boolean {
        return this.game.mode === GameMode.Challenge;
    }

    public itemsCounts: Map<string, number>;

    public getItemCount(trackName: string): number {
        if (this.itemsCounts) {
            return this.itemsCounts.get(trackName);
        }
        return 0;
    }

    public setItemCount(trackName: string, c: number): void {
        if (this.itemsCounts) {
            this.itemsCounts.set(trackName, c);
            let e = document.querySelector("#machine-editor-objects");
            if (e) {
                e = e.querySelector("[track='" + trackName + "']");
                if (e) {
                    e = e.querySelector("div");
                    if (e instanceof HTMLDivElement) {
                        if (isFinite(c)) {
                            e.innerHTML = c.toFixed(0);
                        }
                        else {
                            e.innerHTML = "&#8734;";
                        }
                    }
                }
            }
        }
    }

    public async instantiate(): Promise<void> {
        document.getElementById("machine-editor-objects").style.display = "block";
        this.game.toolbar.resize();
        this.machinePartEditorMenu.initialize();

        this.itemsCounts = new Map<string, number>();

        if (!this.challengeMode) {
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
                    this.setSelectedObject(ball, true);
                    this._dragOffset.copyFromFloats(0, 0, 0);
                }
            });
        }

        let availableTracks: string[] = TrackNames;
        if (this.challengeMode) {
            availableTracks = this.game.challenge.availableElements;
        }
        for (let i = 0; i < availableTracks.length; i++) {
            let trackname = availableTracks[i];
            this.setItemCount(trackname, Infinity);

            let item = document.createElement("div") as HTMLDivElement;
            item.classList.add("machine-editor-item");
            item.setAttribute("track", trackname);
            item.style.backgroundImage = "url(./datas/icons/" + trackname + ".png)"
            item.style.backgroundSize = "cover";
            item.innerText = trackname.split("-")[0];
            this.itemContainer.appendChild(item);
            this.items.set(trackname, item);

            let itemCountElement = document.createElement("div") as HTMLDivElement;
            itemCountElement.classList.add("machine-editor-item-count");
            itemCountElement.innerHTML = "&#8734;";
            item.appendChild(itemCountElement);


            item.addEventListener("pointerdown", () => {
                if (this.getItemCount(trackname) <= 0) {
                    return;
                }
                if (this.draggedObject) {
                    this.draggedObject.dispose();
                    this.setDraggedObject(undefined);
                } 
                if (this.selectedItem === trackname) {
                    this.setSelectedItem("");
                }
                else {
                    this.setSelectedItem(trackname);
                    let track = this.machine.trackFactory.createTrack(this._selectedItem, {
                        fullPartName: trackname,
                        i: 0,
                        j: 0,
                        k: 0
                    });
                    track.isPlaced = false;
                    if (this.challengeMode) {
                        track.sleepersMeshProp = { drawGroundAnchors: true, groundAnchorsRelativeMaxY: 1 };
                    }
                    this.setDraggedObject(track);
                    this.setSelectedObject(track, true);
                    this._dragOffset.copyFromFloats(0, 0, 0);
                    this.setItemCount(trackname, this.getItemCount(trackname) - 1);
                    track.instantiate(true).then(() => {
                        track.setIsVisible(false);
                    });
                }
            });
        }
        
        var r = document.querySelector(':root') as HTMLElement;
        r.style.setProperty("--machine-editor-item-container-width", (Math.ceil(TrackNames.length / 2 + 1) * 16.7).toFixed(0) + "vw");

        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);

        this.game.canvas.addEventListener("pointerdown", this.pointerDown);
        this.game.canvas.addEventListener("pointermove", this.pointerMove);
        this.game.canvas.addEventListener("pointerup", this.pointerUp);

        for (let i = 0; i < this.machine.balls.length; i++) {
            this.machine.balls[i].setShowPositionZeroGhost(true);
        }

        this.floatingButtons = [];

        if (this.showManipulators) {
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

            this.floatingButtons.push(
                this.HPlusTopButton,
                this.HMinusTopButton,
                this.WMinusRightButton,
                this.WPlusRightButton,
                this.HMinusBottomButton,
                this.HPlusBottomButton,
                this.WPlusLeftButton,
                this.WMinusLeftButton,
                this.tileMirrorXButton,
                this.tileMirrorZButton,
                this.DPlusButton,
                this.DMinusButton
            );
        }
        
        // Ramp Origin UI
        this.originIPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originIPlusHandle.material = this.game.materials.redMaterial;
        this.originIPlusHandle.rotation.z = - Math.PI / 2;
        this.originIPlusHandle.instantiate();
        this.originIPlusHandle.onClick = this._onOriginIPlus;

        this.originIMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originIMinusHandle.material = this.game.materials.redMaterial;
        this.originIMinusHandle.rotation.z = Math.PI / 2;
        this.originIMinusHandle.instantiate();
        this.originIMinusHandle.onClick = this._onOriginIMinus;

        this.originJPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originJPlusHandle.material = this.game.materials.greenMaterial;
        this.originJPlusHandle.rotation.z = Math.PI;
        this.originJPlusHandle.instantiate();
        this.originJPlusHandle.onClick = this._onOriginJPlus;

        this.originJMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originJMinusHandle.material = this.game.materials.greenMaterial;
        this.originJMinusHandle.instantiate();
        this.originJMinusHandle.onClick = this._onOriginJMinus;

        this.originKPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originKPlusHandle.material = this.game.materials.blueMaterial;
        this.originKPlusHandle.rotation.x = - Math.PI / 2;
        this.originKPlusHandle.instantiate();
        this.originKPlusHandle.onClick = this._onOriginKPlus;

        this.originKMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.originKMinusHandle.material = this.game.materials.blueMaterial;
        this.originKMinusHandle.rotation.x = Math.PI / 2;
        this.originKMinusHandle.instantiate();
        this.originKMinusHandle.onClick = this._onOriginKMinus;

        // Ramp Destination UI
        this.destinationIPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationIPlusHandle.material = this.game.materials.redMaterial;
        this.destinationIPlusHandle.rotation.z = - Math.PI / 2;
        this.destinationIPlusHandle.instantiate();
        this.destinationIPlusHandle.onClick = this._onDestinationIPlus;

        this.destinationIMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationIMinusHandle.material = this.game.materials.redMaterial;
        this.destinationIMinusHandle.rotation.z = Math.PI / 2;
        this.destinationIMinusHandle.instantiate();
        this.destinationIMinusHandle.onClick = this._onDestinationIMinus;

        this.destinationJPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationJPlusHandle.material = this.game.materials.greenMaterial;
        this.destinationJPlusHandle.rotation.z = Math.PI;
        this.destinationJPlusHandle.instantiate();
        this.destinationJPlusHandle.onClick = this._onDestinationJPlus;

        this.destinationJMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationJMinusHandle.material = this.game.materials.greenMaterial;
        this.destinationJMinusHandle.instantiate();
        this.destinationJMinusHandle.onClick = this._onDestinationJMinus;

        this.destinationKPlusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationKPlusHandle.material = this.game.materials.blueMaterial;
        this.destinationKPlusHandle.rotation.x = - Math.PI / 2;
        this.destinationKPlusHandle.instantiate();
        this.destinationKPlusHandle.onClick = this._onDestinationKPlus;

        this.destinationKMinusHandle = new Arrow("", this.game, this.smallHandleSize);
        this.destinationKMinusHandle.material = this.game.materials.blueMaterial;
        this.destinationKMinusHandle.rotation.x = Math.PI / 2;
        this.destinationKMinusHandle.instantiate();
        this.destinationKMinusHandle.onClick = this._onDestinationKMinus;
        
        // Machine Part displacer UI.
        this.IPlusHandle = new Arrow("IPlusHandle", this.game, 0.03);
        this.IPlusHandle.material = this.game.materials.redMaterial;
        this.IPlusHandle.rotation.z = - Math.PI / 2;
        this.IPlusHandle.instantiate();
        this.IPlusHandle.onClick = this._onIPlus;

        this.IMinusHandle = new Arrow("IMinusHandle", this.game, 0.03);
        this.IMinusHandle.material = this.game.materials.redMaterial;
        this.IMinusHandle.rotation.z = Math.PI / 2;
        this.IMinusHandle.instantiate();
        this.IMinusHandle.onClick = this._onIMinus;

        this.JPlusHandle = new Arrow("JPlusHandle", this.game, 0.03);
        this.JPlusHandle.material = this.game.materials.greenMaterial;
        this.JPlusHandle.rotation.z = Math.PI;
        this.JPlusHandle.instantiate();
        this.JPlusHandle.onClick = this._onJPlus;

        this.JMinusHandle = new Arrow("JMinusHandle", this.game, 0.03);
        this.JMinusHandle.material = this.game.materials.greenMaterial;
        this.JMinusHandle.instantiate();
        this.JMinusHandle.onClick = this._onJMinus;

        this.KPlusHandle = new Arrow("KPlusHandle", this.game, 0.03);
        this.KPlusHandle.material = this.game.materials.blueMaterial;
        this.KPlusHandle.rotation.x = - Math.PI / 2;
        this.KPlusHandle.instantiate();
        this.KPlusHandle.onClick = this._onKPlus;

        this.KMinusHandle = new Arrow("KMinusHandle", this.game, 0.03);
        this.KMinusHandle.material = this.game.materials.blueMaterial;
        this.KMinusHandle.rotation.x = Math.PI / 2;
        this.KMinusHandle.instantiate();
        this.KMinusHandle.onClick = this._onKMinus;

        this.handles = [
            this.IPlusHandle,
            this.IMinusHandle,
            this.JPlusHandle,
            this.JMinusHandle,
            this.KPlusHandle,
            this.KMinusHandle,
            this.originIPlusHandle,
            this.originIMinusHandle,
            this.originJPlusHandle,
            this.originJMinusHandle,
            this.originKPlusHandle,
            this.originKMinusHandle,
            this.destinationIPlusHandle,
            this.destinationIMinusHandle,
            this.destinationJPlusHandle,
            this.destinationJMinusHandle,
            this.destinationKPlusHandle,
            this.destinationKMinusHandle
        ];

        this.handles.forEach(handle => {
            handle.size = this.game.config.handleSize;
        })

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
        this.setSelectedObject(undefined);
        this.game.toolbar.resize();
        if (this.machinePartEditorMenu) {
            this.machinePartEditorMenu.dispose();
        }

        if (this.showManipulators) {
            this.floatingElementTop.dispose();
            this.floatingElementRight.dispose();
            this.floatingElementBottom.dispose();
            this.floatingElementLeft.dispose();
            this.floatingElementBottomRight.dispose();
            this.floatingElementBottomLeft.dispose();
        }
        this.handles.forEach(handle => {
            handle.dispose();
        })

        if (this.itemContainer) {
            this.itemContainer.innerHTML = "";
        }
        this.items = new Map<string, HTMLDivElement>();
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
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

        let pick = this.game.scene.pick(
            this.game.scene.pointerX,
            this.game.scene.pointerY,
            (mesh) => {
                if (mesh instanceof Arrow && mesh.isVisible) {
                    return true;
                }
                return false;
            }
        )
        if (pick.hit && pick.pickedMesh instanceof Arrow) {
            this.hoveredObject = pick.pickedMesh;
        }
        else {
            this.hoveredObject = undefined;
        }

        this.grid.update();
    }

    private _pointerDownX: number = 0;
    private _pointerDownY: number = 0;
    public pointerDown = (event: PointerEvent) => {
        this._pointerDownX = this.game.scene.pointerX;
        this._pointerDownY = this.game.scene.pointerY;
        // First, check for handle pick
        if (!this.draggedObject) {
            let pickHandle = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    if (mesh instanceof Arrow && mesh.isVisible) {
                        return true;
                    }
                    return false;
                }
            )
            if (pickHandle.hit && pickHandle.pickedMesh instanceof Arrow) {
                return;
            }
        }

        if (this.selectedObject) {
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    if (mesh instanceof MachinePartSelectorMesh && mesh.part === this.selectedObject) {
                        return true;
                    }
                    return false;
                }
            )
            if (!pick.hit) {
                pick = this.game.scene.pick(
                    this.game.scene.pointerX,
                    this.game.scene.pointerY,
                    (mesh) => {
                        if (!this.challengeMode && mesh instanceof BallGhost) {
                            return true;
                        }
                        return false;
                    }
                )
            }
            if (!pick.hit) {
                pick = this.game.scene.pick(
                    this.game.scene.pointerX,
                    this.game.scene.pointerY,
                    (mesh) => {
                        if (mesh instanceof MachinePartSelectorMesh && !(this.challengeMode && !mesh.part.isSelectable)) {
                            return true;
                        }
                        return false;
                    }
                )
            }
    
            if (pick.hit) {
                let pickedObject: MachinePart | Ball;
                if (pick.pickedMesh instanceof BallGhost) {
                    pickedObject = pick.pickedMesh.ball;
                }
                else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                    pickedObject = pick.pickedMesh.part;
                }
                if (!this._majDown && this.selectedObjects.indexOf(pickedObject) != -1) {
                    pick = this.game.scene.pick(
                        this.game.scene.pointerX,
                        this.game.scene.pointerY,
                        (mesh) => {
                            if (mesh === this.grid.opaquePlane) {
                                return true;
                            }
                        }
                    )
                    if (pick.hit && pick.pickedPoint) {
                        if (pickedObject instanceof MachinePart) {
                            this._dragOffset.copyFrom(pickedObject.position).subtractInPlace(pick.pickedPoint);
                        }
                        else if (pickedObject instanceof Ball) {
                            this._dragOffset.copyFrom(pickedObject.positionZero).subtractInPlace(pick.pickedPoint);
                        }
                    }
                    else {
                        this._dragOffset.copyFromFloats(0, 0, 0);
                    }
                    this.setDraggedObject(pickedObject);
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
                    if (mesh === this.grid.opaquePlane) {
                        return true;
                    }
                }
            )
    
            if (pick.hit && pick.pickedMesh === this.grid.opaquePlane) {
                let point = pick.pickedPoint.add(this._dragOffset);
                if (this.draggedObject instanceof MachinePart) {
                    let i = Math.round(point.x / tileWidth);
                    let j = Math.floor((- point.y + 0.25 * tileHeight) / tileHeight);
                    let k = Math.round(- point.z / tileDepth);
                    let di = i - this.draggedObject.i;
                    let dj = j - this.draggedObject.j;
                    let dk = k - this.draggedObject.k;
                    if (di != 0 || dj != 0 || dk != 0) {
                        for (let n = 0; n < this.selectedObjects.length; n++) {
                            let selectedObject = this.selectedObjects[n];
                            if (selectedObject instanceof MachinePart && selectedObject != this.draggedObject) {
                                selectedObject.setI(selectedObject.i + di);
                                selectedObject.setJ(selectedObject.j + dj);
                                selectedObject.setK(selectedObject.k + dk);
                            }
                        }
                        this.draggedObject.setI(i);
                        this.draggedObject.setJ(j);
                        this.draggedObject.setK(k);
                        this.draggedObject.setIsVisible(true);
                        this.updateFloatingElements();
                        if (this._dragOffset.lengthSquared() > 0) {
                            this.grid.position.copyFrom(this.draggedObject.position);
                        }
                    }
                }
                else if (this.draggedObject instanceof Ball) {
                    let p = point.clone();
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
        // First, check for handle pick
        let dx = (this._pointerDownX - this.game.scene.pointerX);
        let dy = (this._pointerDownY - this.game.scene.pointerY);
        let clickInPlace = dx * dx + dy * dy < 10;

        if (!this.draggedObject) {
            let pickHandle = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    if (mesh instanceof Arrow && mesh.isVisible) {
                        return true;
                    }
                    return false;
                }
            )
            if (pickHandle.hit && pickHandle.pickedMesh instanceof Arrow) {
                pickHandle.pickedMesh.onClick();
                return;
            }
        }

        let pick = this.game.scene.pick(
            this.game.scene.pointerX,
            this.game.scene.pointerY,
            (mesh) => {
                if (!this.challengeMode && !this.draggedObject && mesh instanceof BallGhost) {
                    return true;
                }
                else if (this.draggedObject && mesh === this.grid.opaquePlane) {
                    return true;
                }
                return false;
            }
        )
        if (!pick.hit) {
            pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
                (mesh) => {
                    if (!this.draggedObject && mesh instanceof MachinePartSelectorMesh && !(this.challengeMode && !mesh.part.isSelectable)) {
                        return true;
                    }
                    else if (this.draggedObject && mesh === this.grid.opaquePlane) {
                        return true;
                    }
                    return false;
                }
            )
        }

        if (pick.hit) {
            if (this.draggedObject instanceof MachinePart) {
                let draggedTrack = this.draggedObject as MachinePart;

                for (let i = 0; i < this.selectedObjects.length; i++) {
                    let selectedObject = this.selectedObjects[i];
                    if (selectedObject instanceof MachinePart && selectedObject != draggedTrack) {
                        selectedObject.generateWires();
                        selectedObject.instantiate(true).then(() => {
                            (selectedObject as MachinePart).recomputeAbsolutePath();
                        });
                    }
                }

                if (this.machine.parts.indexOf(draggedTrack) === -1) {
                    this.machine.parts.push(draggedTrack);
                }
                draggedTrack.setIsVisible(true);
                draggedTrack.generateWires();
                draggedTrack.instantiate(true).then(() => {
                    draggedTrack.recomputeAbsolutePath();
                    this.setSelectedObject(draggedTrack);
                    this.setDraggedObject(undefined);
                    this.setSelectedItem("");
                });
                this.machine.generateBaseMesh();
            }
            else if (this.draggedObject instanceof Ball) {
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
                if (clickInPlace) {
                    if (pick.pickedMesh instanceof BallGhost) {
                        this.setSelectedObject(pick.pickedMesh.ball);
                    }
                    else if (pick.pickedMesh instanceof MachinePartSelectorMesh) {
                        if (this._majDown) {
                            this.addOrRemoveSelectedObjects(pick.pickedMesh.part);
                        }
                        else {
                            this.setSelectedObject(pick.pickedMesh.part);
                        }
                    }
                }
            }
        }
        else {
            let dx = (this._pointerDownX - this.game.scene.pointerX);
            let dy = (this._pointerDownY - this.game.scene.pointerY);
            if (clickInPlace) {
                this.setSelectedObject(undefined);
            }
        }
    }

    public async editTrackInPlace(track: MachinePart, props?: IMachinePartProp): Promise<MachinePart> {
        if (!props) {
            props = {};
        }
        if (!isFinite(props.i)) {
            props.i = track.i;
        }
        if (!isFinite(props.j)) {
            props.j = track.j;
        }
        if (!isFinite(props.k)) {
            props.k = track.k;
        }
        if (!isFinite(props.w) && track.xExtendable) {
            props.w = track.w;
        }
        if (!isFinite(props.h) && track.yExtendable) {
            props.h = track.h;
        }
        if (!isFinite(props.d) && track.zExtendable) {
            props.d = track.d;
        }
        if (!isFinite(props.n) && track.nExtendable) {
            props.n = track.n;
        }

        props.mirrorX = track.mirrorX;
        props.mirrorZ = track.mirrorZ;

        let editedTrack = this.machine.trackFactory.createTrackWHDN(track.partName, props);
        track.dispose();
        this.machine.parts.push(editedTrack);
        editedTrack.setIsVisible(true);
        editedTrack.generateWires();
        this.machine.generateBaseMesh();
        await editedTrack.instantiate(true);
        editedTrack.recomputeAbsolutePath();
        return editedTrack;
    }

    public async editPartOriginDestInPlace(part: MachinePartWithOriginDestination, dOrigin: Nabu.IJK, dDestination: Nabu.IJK): Promise<MachinePartWithOriginDestination> {
        let origin = part.getOrigin();
        origin.i += dOrigin.i;
        origin.j += dOrigin.j;
        origin.k += dOrigin.k;
        let destination = part.getDestination();
        destination.i += dDestination.i;
        destination.j += dDestination.j;
        destination.k += dDestination.k;

        if (origin.i >= destination.i) {
            return part;
        }

        let editedPart = part.recreateFromOriginDestination(origin, destination, this.machine);
        part.dispose();
        this.machine.parts.push(editedPart);
        editedPart.setIsVisible(true);
        editedPart.generateWires();
        this.machine.generateBaseMesh();
        await editedPart.instantiate(true);
        editedPart.recomputeAbsolutePath();
        return editedPart;
    }

    public async mirrorXTrackInPlace(track: MachinePart): Promise<MachinePart> {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, {
            i: track.i,
            j: track.j,
            k: track.k,
            mirrorX: !track.mirrorX,
            mirrorZ: track.mirrorZ
        });
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate(true);
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }

    public async mirrorZTrackInPlace(track: MachinePart): Promise<MachinePart> {
        let mirroredTrack = this.machine.trackFactory.createTrack(track.partName, {
            i: track.i,
            j: track.j,
            k: track.k,
            mirrorX: track.mirrorX,
            mirrorZ: !track.mirrorZ
        });
        track.dispose();
        this.machine.parts.push(mirroredTrack);
        mirroredTrack.setIsVisible(true);
        mirroredTrack.generateWires();
        await mirroredTrack.instantiate(true);
        mirroredTrack.recomputeAbsolutePath();
        return mirroredTrack;
    }

    public getCurrentItemElement(): HTMLDivElement {
        return this.items.get(this._selectedItem);
    }

    public actionTileSize: number = 0.018;
    public updateFloatingElements(): void {
        if (this.floatingButtons) {
            this.floatingButtons.forEach(button => {
                button.style.display = "none";
            })
        }
        if (this.handles) {
            this.handles.forEach(handle => {
                handle.isVisible = false;
            })
        }
        if (this.selectedObject) {
            let s = this.actionTileSize;
            if (this.selectedObject instanceof Ball) {                    
                this.KPlusHandle.position.copyFrom(this.selectedObject.positionZeroGhost.position);
                this.KPlusHandle.position.y -= 0.04;
                this.KPlusHandle.position.z -= 0.03;
                this.KPlusHandle.isVisible = true;
                
                this.KMinusHandle.position.copyFrom(this.selectedObject.positionZeroGhost.position);
                this.KMinusHandle.position.y -= 0.04;
                this.KMinusHandle.position.z += 0.03;
                this.KMinusHandle.isVisible = true;
            }
            else if (this.selectedObject instanceof MachinePart) {
                
                if (!this.challengeMode && this.selectedObject instanceof MachinePartWithOriginDestination && this.selectedObjectsCount === 1) {
                    let origin = this.selectedObject.getOrigin();
                    let pOrigin = new BABYLON.Vector3(
                        origin.i * tileWidth - 0.5 * tileWidth,
                        - origin.j * tileHeight,
                        - origin.k * tileDepth
                    );

                    this.originIPlusHandle.position.copyFrom(pOrigin);
                    this.originIPlusHandle.position.x += this.smallHandleSize * 1.5;
                    this.originIMinusHandle.position.copyFrom(pOrigin);
                    this.originIMinusHandle.position.x -= this.smallHandleSize * 1.5;
                    this.originJPlusHandle.position.copyFrom(pOrigin);
                    this.originJPlusHandle.position.y -= this.smallHandleSize * 1.5;
                    this.originJMinusHandle.position.copyFrom(pOrigin);
                    this.originJMinusHandle.position.y += this.smallHandleSize * 1.5;
                    this.originKPlusHandle.position.copyFrom(pOrigin);
                    this.originKPlusHandle.position.z -= this.smallHandleSize * 1.5;
                    this.originKMinusHandle.position.copyFrom(pOrigin);
                    this.originKMinusHandle.position.z += this.smallHandleSize * 1.5;

                    let destination = this.selectedObject.getDestination();
                    let pDestination = new BABYLON.Vector3(
                        destination.i * tileWidth - 0.5 * tileWidth,
                        - destination.j * tileHeight,
                        - destination.k * tileDepth
                    );

                    this.destinationIPlusHandle.position.copyFrom(pDestination);
                    this.destinationIPlusHandle.position.x += this.smallHandleSize * 1.5;
                    this.destinationIMinusHandle.position.copyFrom(pDestination);
                    this.destinationIMinusHandle.position.x -= this.smallHandleSize * 1.5;
                    this.destinationJPlusHandle.position.copyFrom(pDestination);
                    this.destinationJPlusHandle.position.y -= this.smallHandleSize * 1.5;
                    this.destinationJMinusHandle.position.copyFrom(pDestination);
                    this.destinationJMinusHandle.position.y += this.smallHandleSize * 1.5;
                    this.destinationKPlusHandle.position.copyFrom(pDestination);
                    this.destinationKPlusHandle.position.z -= this.smallHandleSize * 1.5;
                    this.destinationKMinusHandle.position.copyFrom(pDestination);
                    this.destinationKMinusHandle.position.z += this.smallHandleSize * 1.5;
                    
                    this.originIPlusHandle.isVisible = true;
                    this.originIMinusHandle.isVisible = true;
                    this.originJPlusHandle.isVisible = true;
                    this.originJMinusHandle.isVisible = true;
                    this.originKPlusHandle.isVisible = true;
                    this.originKMinusHandle.isVisible = true;
                    this.destinationIPlusHandle.isVisible = true;
                    this.destinationIMinusHandle.isVisible = true;
                    this.destinationJPlusHandle.isVisible = true;
                    this.destinationJMinusHandle.isVisible = true;
                    this.destinationKPlusHandle.isVisible = true;
                    this.destinationKMinusHandle.isVisible = true;
                }
                else {
                    if (this.selectedObjectsCount === 1) {
                        this.IPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.IPlusHandle.position.x += this.selectedObject.encloseEnd.x + this.IPlusHandle.baseSize * 0.5;
                        this.IPlusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.IPlusHandle.position.z += this.selectedObject.encloseMid.z;
                        
                        this.IMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.IMinusHandle.position.x += this.selectedObject.encloseStart.x - this.IMinusHandle.baseSize * 0.5;
                        this.IMinusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.IMinusHandle.position.z += this.selectedObject.encloseMid.z;
                        
                        this.JPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.JPlusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.JPlusHandle.position.y += this.selectedObject.encloseEnd.y - this.JPlusHandle.baseSize * 0.5;
                        this.JPlusHandle.position.z += this.selectedObject.encloseMid.z;
                        
                        this.JMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.JMinusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.JMinusHandle.position.y += this.selectedObject.encloseStart.y + this.JMinusHandle.baseSize * 0.5;
                        this.JMinusHandle.position.z += this.selectedObject.encloseMid.z;
                        
                        this.KPlusHandle.position.copyFrom(this.selectedObject.position);
                        this.KPlusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.KPlusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.KPlusHandle.position.z += this.selectedObject.encloseEnd.z - this.KPlusHandle.baseSize * 0.5;
                        
                        this.KMinusHandle.position.copyFrom(this.selectedObject.position);
                        this.KMinusHandle.position.x += this.selectedObject.encloseMid.x;
                        this.KMinusHandle.position.y += this.selectedObject.encloseEnd.y;
                        this.KMinusHandle.position.z += this.selectedObject.encloseStart.z + this.KMinusHandle.baseSize * 0.5;
                    }
                    else if (this.selectedObjectsCount > 1) {
                        let encloseStart: BABYLON.Vector3 = new BABYLON.Vector3(Infinity, - Infinity, - Infinity);
                        let encloseEnd: BABYLON.Vector3 = new BABYLON.Vector3(- Infinity, Infinity, Infinity);
                        this.selectedObjects.forEach(obj => {
                            if (obj instanceof MachinePart) {
                                encloseStart.x = Math.min(encloseStart.x, obj.position.x + obj.encloseStart.x);
                                encloseStart.y = Math.max(encloseStart.y, obj.position.y + obj.encloseStart.y);
                                encloseStart.z = Math.max(encloseStart.z, obj.position.z + obj.encloseStart.z);
                                
                                encloseEnd.x = Math.max(encloseEnd.x, obj.position.x + obj.encloseEnd.x);
                                encloseEnd.y = Math.min(encloseEnd.y, obj.position.y + obj.encloseEnd.y);
                                encloseEnd.z = Math.min(encloseEnd.z, obj.position.z + obj.encloseEnd.z);
                            }
                        });
                        let enclose13 = encloseStart.clone().scaleInPlace(2 / 3).addInPlace(encloseEnd.scale(1 / 3));
                        let encloseMid = encloseStart.clone().addInPlace(encloseEnd).scaleInPlace(0.5);
                        let enclose23 = encloseStart.clone().scaleInPlace(1 / 3).addInPlace(encloseEnd.scale(2 / 3));
                        
                        this.IPlusHandle.position.x = encloseEnd.x + this.IPlusHandle.baseSize * 0.5;
                        this.IPlusHandle.position.y = encloseMid.y;
                        this.IPlusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        
                        this.IMinusHandle.position.x = encloseStart.x - this.IMinusHandle.baseSize * 0.5;
                        this.IMinusHandle.position.y = encloseMid.y;
                        this.IMinusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        
                        this.JPlusHandle.position.x = enclose13.x;
                        this.JPlusHandle.position.y = encloseEnd.y - this.JMinusHandle.baseSize * 0.5;
                        this.JPlusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        
                        this.JMinusHandle.position.x = enclose13.x;
                        this.JMinusHandle.position.y = encloseStart.y + this.JMinusHandle.baseSize * 0.5;
                        this.JMinusHandle.position.z = encloseStart.z - tileDepth * 0.5;
                        
                        this.KPlusHandle.position.x = enclose23.x;
                        this.KPlusHandle.position.y = encloseEnd.y;
                        this.KPlusHandle.position.z = encloseEnd.z - this.KPlusHandle.baseSize * 0.5;
                        
                        this.KMinusHandle.position.x = enclose23.x;
                        this.KMinusHandle.position.y = encloseEnd.y;
                        this.KMinusHandle.position.z = encloseStart.z + this.KMinusHandle.baseSize * 0.5;
                    }
                    
                    this.IPlusHandle.isVisible = true;
                    this.IMinusHandle.isVisible = true;
                    this.JPlusHandle.isVisible = true;
                    this.JMinusHandle.isVisible = true;
                    this.KPlusHandle.isVisible = true;
                    this.KMinusHandle.isVisible = true;
                }
            }
        }
    }

    private _onKeyDown = (event: KeyboardEvent) => {
        if (event.code === "ShiftLeft") {
            this._majDown = true;
        }
        else if (event.code === "ControlLeft") {
            this._ctrlDown = true;
        }
        else if (this._ctrlDown && event.key === "a") {
            this.setSelectedObject(undefined);
            this.addOrRemoveSelectedObjects(...this.machine.parts);
        }
        else if (event.key === "x" || event.key === "Delete") {
            this._onDelete();
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
        else if (event.code === "KeyW") {
            this._onJMinus();
        }
        else if (event.code === "KeyA") {
            this._onIMinus();
        }
        else if (event.code === "KeyS") {
            this._onJPlus();
        }
        else if (event.code === "KeyD") {
            this._onIPlus();
        }
        else if (event.code === "KeyQ") {
            this._onKMinus();
        }
        else if (event.code === "KeyE") {
            this._onKPlus();
        }
        else if (event.code === "Space") {
            this._onFocus();
        }
    }

    private _onKeyUp = (event: KeyboardEvent) => {
        if (event.code === "ShiftLeft") {
            this._majDown = false;
        }
        else if (event.code === "ControlLeft") {
            this._ctrlDown = false;
        }
    }

    private _onHPlusTop = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h + 1;
            let j = track.j - 1;

            let editedTrack = await this.editTrackInPlace(track, { j: j });
            this.setSelectedObject(editedTrack);
        }
    }

    private _onHMinusTop = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h - 1;
            let j = track.j + 1;

            if (h >= 0) {
                let editedTrack = await this.editTrackInPlace(track, { j: j });
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onWPlusRight = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let w = track.w + 1;

            let editedTrack = await this.editTrackInPlace(track, { w: w });
            this.setSelectedObject(editedTrack);
        }
    }

    private _onWMinusRight = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let w = track.w - 1;

            if (w >= 1) {
                let editedTrack = await this.editTrackInPlace(track, { w: w });
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onHPlusBottom = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h + 1;
            
            let editedTrack = await this.editTrackInPlace(track, { h: h });
            this.setSelectedObject(editedTrack);
        }
    }

    private _onHMinusBottom = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.yExtendable) {
            let h = track.h - 1;
            if (h >= 0) {
                let editedTrack = await this.editTrackInPlace(track, { h: h });
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onWPlusLeft = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let i = track.i - 1;
            let w = track.w + 1;

            let editedTrack = await this.editTrackInPlace(track, { i : i });
            this.setSelectedObject(editedTrack);
        }
    }

    private _onWMinusLeft = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.xExtendable) {
            let i = track.i + 1;
            let w = track.w - 1;

            if (w >= 1) {
                let editedTrack = await this.editTrackInPlace(track, { i : i });
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onDPlus = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.zExtendable) {
            let d = track.d + 1;
            let editedTrack = await this.editTrackInPlace(track, { d : d });
            this.setSelectedObject(editedTrack);
        }
    }

    private _onDMinus = async () => {
        let track = this.selectedObject;
        if (track instanceof MachinePart && track.zExtendable) {
            let d = track.d - 1;
            if (d >= 1) {
                let editedTrack = await this.editTrackInPlace(track, { d : d });
                this.setSelectedObject(editedTrack);
            }
        }
    }

    private _onDelete = async () => {
        this.selectedObjects.forEach(obj => {
            obj.dispose();
        })
        this.setSelectedObject(undefined);
        this.setDraggedObject(undefined);
        this.machine.generateBaseMesh();
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
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginIMinus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: - 1, j: 0, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginJPlus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 1, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginJMinus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: - 1, k: 0 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginKPlus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 1 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onOriginKMinus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: - 1 }, { i: 0, j: 0, k: 0 }));
        }
    }

    private _onDestinationIPlus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 1, j: 0, k: 0 }));
        }
    }

    private _onDestinationIMinus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: - 1, j: 0, k: 0 }));
        }
    }

    private _onDestinationJPlus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 1, k: 0 }));
        }
    }

    private _onDestinationJMinus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: - 1, k: 0 }));
        }
    }

    private _onDestinationKPlus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: 1 }));
        }
    }

    private _onDestinationKMinus = async () => {
        if (this.selectedObject instanceof MachinePartWithOriginDestination) {
            this.setSelectedObject(await this.editPartOriginDestInPlace(this.selectedObject, { i: 0, j: 0, k: 0 }, { i: 0, j: 0, k: - 1 }));
        }
    }

    private _onIPlus = async () => {
        for (let i = 0; i < this.selectedObjects.length; i++) {
            let selectedTrack = this.selectedObjects[i];
            if (selectedTrack instanceof MachinePart) {
                selectedTrack.setI(selectedTrack.i + 1);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.generateWires();
                this.machine.generateBaseMesh();
                await selectedTrack.instantiate(true);
                this.grid.position.copyFrom(selectedTrack.position);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.select();
                if (this.game.cameraMode === CameraMode.Selected) {
                    this._onFocus();
                }
            }
        }
        this.setDraggedObject(undefined);
        this.setSelectedItem("");
        this.updateFloatingElements();
    }

    private _onIMinus = async () => {
        for (let i = 0; i < this.selectedObjects.length; i++) {
            let selectedTrack = this.selectedObjects[i];
            if (selectedTrack instanceof MachinePart) {
                selectedTrack.setI(selectedTrack.i - 1);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.generateWires();
                this.machine.generateBaseMesh();
                await selectedTrack.instantiate(true);
                this.grid.position.copyFrom(selectedTrack.position);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.select();
                if (this.game.cameraMode === CameraMode.Selected) {
                    this._onFocus();
                }
            }
        }
        this.setDraggedObject(undefined);
        this.setSelectedItem("");
        this.updateFloatingElements();
    }
    
    private _onJPlus = async () => {
        for (let i = 0; i < this.selectedObjects.length; i++) {
            let selectedTrack = this.selectedObjects[i];
            if (selectedTrack instanceof MachinePart) {
                selectedTrack.setJ(selectedTrack.j + 1);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.generateWires();
                this.machine.generateBaseMesh();
                await selectedTrack.instantiate(true);
                this.grid.position.copyFrom(selectedTrack.position);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.select();
                if (this.game.cameraMode === CameraMode.Selected) {
                    this._onFocus();
                }
            }
        }
        this.setDraggedObject(undefined);
        this.setSelectedItem("");
        this.updateFloatingElements();
    }

    private _onJMinus = async () => {
        for (let i = 0; i < this.selectedObjects.length; i++) {
            let selectedTrack = this.selectedObjects[i];
            if (selectedTrack instanceof MachinePart) {
                selectedTrack.setJ(selectedTrack.j - 1);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.generateWires();
                this.machine.generateBaseMesh();
                await selectedTrack.instantiate(true);
                this.grid.position.copyFrom(selectedTrack.position);
                selectedTrack.recomputeAbsolutePath();
                selectedTrack.select();
                if (this.game.cameraMode === CameraMode.Selected) {
                    this._onFocus();
                }
            }
        }
        this.setDraggedObject(undefined);
        this.setSelectedItem("");
        this.updateFloatingElements();
    }

    private _onKPlus = async () => {
        if (this.selectedObject instanceof MachinePart) {
            for (let i = 0; i < this.selectedObjects.length; i++) {
                let selectedTrack = this.selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setK(selectedTrack.k + 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    this.machine.generateBaseMesh();
                    await selectedTrack.instantiate(true);
                    this.grid.position.copyFrom(selectedTrack.position);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.updateFloatingElements();
        }
        else if (this.selectedObject instanceof Ball) {
            this.selectedObject.k = this.selectedObject.k + 1;
            this.setSelectedObject(this.selectedObject);
            this.updateFloatingElements();
            if (!this.machine.playing) {
                this.selectedObject.reset();
            }
        }
    }

    private _onKMinus = async () => {
        if (this.selectedObject instanceof MachinePart) {
            for (let i = 0; i < this.selectedObjects.length; i++) {
                let selectedTrack = this.selectedObjects[i];
                if (selectedTrack instanceof MachinePart) {
                    selectedTrack.setK(selectedTrack.k - 1);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.generateWires();
                    this.machine.generateBaseMesh();
                    await selectedTrack.instantiate(true);
                    this.grid.position.copyFrom(selectedTrack.position);
                    selectedTrack.recomputeAbsolutePath();
                    selectedTrack.select();
                    if (this.game.cameraMode === CameraMode.Selected) {
                        this._onFocus();
                    }
                }
            }
            this.setDraggedObject(undefined);
            this.setSelectedItem("");
            this.updateFloatingElements();
        }
        else if (this.selectedObject instanceof Ball) {
            this.selectedObject.k = this.selectedObject.k - 1;
            this.setSelectedObject(this.selectedObject);
            this.updateFloatingElements();
            if (!this.machine.playing) {
                this.selectedObject.reset();
            }
        }
    }

    public _onFill = () => {
        if (this.selectedObject instanceof Elevator) {
            let elevator = this.selectedObject as Elevator;
            // Remove all balls located in the Elevator vicinity.
            let currentBallsInElevator: Ball[] = [];
            for (let i = 0; i < this.machine.balls.length; i++) {
                let ball = this.machine.balls[i];
                let posLocal = ball.positionZero.subtract(elevator.position);
                if (elevator.encloseStart.x < posLocal.x && posLocal.x < elevator.encloseEnd.x) {
                    if (elevator.encloseEnd.y < posLocal.y && posLocal.y < elevator.encloseStart.y) {
                        if (elevator.encloseEnd.z < posLocal.z && posLocal.z < elevator.encloseStart.z) {
                            currentBallsInElevator.push(ball);
                        }
                    }
                }
            }
            for (let i = 0; i < currentBallsInElevator.length; i++) {
                currentBallsInElevator[i].dispose();
            }

            elevator.reset();
            requestAnimationFrame(() => {
                let nBalls = Math.floor(elevator.boxesCount / 2);
                for (let i = 0; i < nBalls; i++) {
                    let box = elevator.boxes[i];
                    let pos = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-0.011 * (elevator.mirrorX ? - 1 : 1), 0.009, 0), box.getWorldMatrix());
                    let ball = new Ball(pos, this.machine);
                    ball.instantiate().then(() => {
                        ball.setShowPositionZeroGhost(true);
                        ball.setIsVisible(true);
                    });
                    this.machine.balls.push(ball);
                }
            })
        }
    }

    public _onFocus = () => {
        if (this.selectedObjectsCount > 0) {
            this.game.focusMachineParts(false, ...this.selectedObjects as MachinePart[]);
        }
    }
}