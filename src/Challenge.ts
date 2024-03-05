interface IChallengeData {
    index: number;
    machine: IMachineData;
    camAlpha: number;
    camBeta: number;
    camRadius: number;
    camTarget: { x: number, y: number, z: number },
    tutoMode: number;
    elements: string[];
    gridIMin: number;
    gridIMax: number;
    gridJMin: number;
    gridJMax: number;
    gridDepth: number;
}

class ChallengeStep {

    public static Wait(challenge: Challenge, duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            return new Promise<void>(resolve => {
                setTimeout(resolve, duration * 1000);
            })
        }
        return step;
    }

    public static Text(challenge: Challenge, text: string, duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            step.challenge.tutoPopup.setAttribute("duration", duration.toFixed(3));
            step.challenge.tutoText.innerText = text;
            return step.challenge.tutoPopup.show(0.5);
        }
        return step;
    }

    public static Arrow(challenge: Challenge, position: BABYLON.Vector3 | (() => BABYLON.Vector3), duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            let p: BABYLON.Vector3;
            if (position instanceof BABYLON.Vector3) {
                p = position;
            }
            else {
                p = position();
            }
            let dir = new BABYLON.Vector3(0, - 1, 0);
            let arrow = new HighlightArrow("challenge-step-arrow", challenge.game, 0.07, 0.02, dir);
            arrow.position = p;
            return new Promise<void>(resolve => {
                arrow.instantiate().then(async () => {
                    await arrow.show(0.5);
                    await challenge.WaitAnimation(duration);
                    await arrow.hide(0.5);
                    arrow.dispose();
                    resolve();
                });
            })
        }
        return step;
    }

    public static SvgArrow(challenge: Challenge, element: HTMLElement | (() => HTMLElement), dir: number, duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            let arrow = new SvgArrow("challenge-step-arrow", challenge.game, 0.3, 0.15, dir);
            return new Promise<void>(resolve => {
                arrow.instantiate().then(async () => {
                    if (element instanceof HTMLElement) {
                        arrow.setTarget(element);
                    }
                    else {
                        arrow.setTarget(element());
                    }
                    await arrow.show(0.5);
                    await challenge.WaitAnimation(duration);
                    await arrow.hide(0.5);
                    arrow.dispose();
                    resolve();
                });
            })
        }
        return step;
    }

    public static SvgArrowSlide(challenge: Challenge, element: HTMLElement | (() => HTMLElement), target: { x: () => number, y: () => number, dir: number }, duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            let arrow = new SvgArrow("challenge-step-arrow", challenge.game, 0.3, 0.1, -45);
            return new Promise<void>(resolve => {
                arrow.instantiate().then(async () => {
                    if (element instanceof HTMLElement) {
                        arrow.setTarget(element);
                    }
                    else {
                        arrow.setTarget(element());
                    }
                    await arrow.show(0.5);
                    await arrow.slide(target.x(), target.y(), target.dir, duration, Nabu.Easing.easeInOutSine);
                    await arrow.hide(0.5);
                    arrow.dispose();
                    resolve();
                });
            })
        }
        return step;
    }

    constructor(public challenge: Challenge) {

    }

    public doStep: () => Promise<void>;
}

class Challenge {

    public WaitAnimation = Mummu.AnimationFactory.EmptyVoidCallback;
    public tutoPopup: Popup;
    public tutoText: HTMLDivElement;
    public tutoComplete: Popup;

    public state: number = 0;

    public delay = 2.5;
    public steps: (ChallengeStep | ChallengeStep[])[] = [];

    public winZoneMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public winZoneMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    
    public gridIMin: number = - 4;
    public gridIMax: number = 4;
    public gridJMin: number = - 10;
    public gridJMax: number = 1;
    public gridDepth: number = 0;

    public availableElements: string[] = [];
    
    constructor(public game: Game) {
        this.WaitAnimation = Mummu.AnimationFactory.CreateWait(this.game);

        this.tutoPopup = document.getElementById("challenge-tuto") as Popup;
        this.tutoText = this.tutoPopup.querySelector("div");

        this.tutoComplete = document.getElementById("challenge-next") as Popup;
    }

    public initialize(data: IChallengeData): void {
        this.steps = ChallengeSteps.GetSteps(this, data.index);
        
        this.state = 0;
        let arrival = this.game.machine.parts.find(part => { return part.partName === "end"; });
        if (arrival) {
            let p = arrival.position.clone();
            let x0 = tileWidth * 0.15;
            let y0 = - 1.4 * tileHeight - 0.005;
            p.x += x0;
            p.y += y0;
            this.winZoneMin.copyFrom(p);
            this.winZoneMin.x -= 0.04;
            this.winZoneMin.z -= 0.01;
            this.winZoneMax.copyFrom(p);
            this.winZoneMax.x += 0.04;
            this.winZoneMax.y += 0.02;
            this.winZoneMax.z += 0.01;
        }
        this.game.machineEditor.grid.position.copyFromFloats(0, 0, 0);
        this.gridIMin = data.gridIMin;
        this.gridIMax = data.gridIMax;
        this.gridJMin = data.gridJMin;
        this.gridJMax = data.gridJMax;
        this.gridDepth = data.gridDepth;

        for (let i = 0; i < this.availableElements.length; i++) {
            this.game.machineEditor.setItemCount(this.availableElements[i], 1);
        }
    }

    private _successTime: number = 0;
    public update(dt: number): void {
        if (this.state < 100) {
            let ballsIn = true;
            for (let i = 0; i < this.game.machine.balls.length; i++) {
                let ball = this.game.machine.balls[i];
                ballsIn = ballsIn && ball && Mummu.SphereAABBCheck(ball.position, ball.radius, this.winZoneMin, this.winZoneMax);
            }
            
            if (ballsIn) {
                this._successTime += dt;
            }
            else {
                this._successTime = 0;
            }
    
            if (this._successTime > 1) {
                this.state = 101;
            } 
        }

        if (this.state != - 1 && this.state < 100) {
            let next = this.state + 1;
            let step = this.steps[this.state];
            if (step instanceof ChallengeStep) {
                this.state = -1;
                step.doStep().then(() => { this.state = next; });
            }
            else if (step) {
                let count = step.length;
                this.state = -1;
                for (let i = 0; i < step.length; i++) {
                    step[i].doStep().then(() => { count --; });
                }
                let checkAllDone = setInterval(() => {
                    if (count === 0) {
                        this.state = next;
                        clearInterval(checkAllDone);
                    }
                }, 15);
            }
        }
        else if (this.state > 100) {
            this.state = 100;
            let doFinalStep = async () => {
                this.tutoText.innerText = "Challenge completed - Well done !";
                this.tutoPopup.setAttribute("duration", "0");
                this.tutoPopup.show(0.5);
                await this.WaitAnimation(2);
                this.tutoComplete.show(0.5);
            }
            doFinalStep();
        }
    }
}