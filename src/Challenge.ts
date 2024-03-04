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
            let arrow = new HighlightArrow("challenge-step-arrow", challenge.game, 0.1, 0.02, dir);
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

    constructor(public challenge: Challenge) {

    }

    public doStep: () => Promise<void>;
}

class Challenge {

    public WaitAnimation = Mummu.AnimationFactory.EmptyVoidCallback;
    public tutoPopup: Popup;
    public tutoText: HTMLDivElement;

    public state: number = 0;

    public delay = 0.5;
    public steps: (ChallengeStep | ChallengeStep[])[] = [];

    public winSteps: (ChallengeStep | ChallengeStep[])[] = [];

    public winZoneMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public winZoneMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    
    constructor(public game: Game) {
        this.WaitAnimation = Mummu.AnimationFactory.CreateWait(this.game);

        this.tutoPopup = document.getElementById("challenge-tuto") as Popup;
        this.tutoText = this.tutoPopup.querySelector("div");

        this.steps = [
            ChallengeStep.Wait(this, this.delay),
            ChallengeStep.Text(this, "Challenge mode, easy start.", this.delay),
            [
                ChallengeStep.Arrow(this, () => {
                    let ball = game.machine.balls[0];
                    if (ball) {
                        return ball.position;
                    }
                    return BABYLON.Vector3.Zero();
                }, this.delay),
                ChallengeStep.Text(this, "Bring the ball...", this.delay),
            ],
            [
                ChallengeStep.Arrow(this, () => {
                    let arrival = game.machine.parts.find(part => { return part.partName === "end"; });
                    if (arrival) {
                        let p = arrival.position.clone();
                        let x0 = tileWidth * 0.15;
                        let y0 = - 1.4 * tileHeight - 0.005;
                        p.x += x0;
                        p.y += y0;
                        return p;
                    }
                    return BABYLON.Vector3.Zero();
                }, this.delay),
                ChallengeStep.Text(this, "to its destination.", this.delay),
            ],
            ChallengeStep.Text(this, "First, add the adequate Track elements.", this.delay),
            ChallengeStep.Text(this, "Then press Play.", this.delay),
            ChallengeStep.Text(this, "Puzzle is completed when the ball is in the golden receptacle.", this.delay),
        ];

        this.winSteps = [
            ChallengeStep.Text(this, "Well done !", 3)
        ]
    }

    public initialize(): void {
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

            let test = BABYLON.MeshBuilder.CreateBox("zone", { 
                width: this.winZoneMax.x - this.winZoneMin.x,
                height: this.winZoneMax.y - this.winZoneMin.y,
                depth: this.winZoneMax.z - this.winZoneMin.z,
            })
            test.position.copyFrom(this.winZoneMin).addInPlace(this.winZoneMax).scaleInPlace(0.5);
            test.material = this.game.materials.cyanMaterial;
        }
    }

    private _successTime: number = 0;
    public update(dt: number): void {
        if (this.state < 100) {
            let ball = this.game.machine.balls[0];
            if (ball && Mummu.SphereAABBCheck(ball.position, ball.radius, this.winZoneMin, this.winZoneMax)) {
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
            let next = this.state + 1;
            let step = this.winSteps[this.state - 101];
            if (step instanceof ChallengeStep) {
                this.state = 100;
                step.doStep().then(() => { this.state = next; });
            }
            else if (step) {
                let count = step.length;
                this.state = 100;
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
    }
}