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
            let arrow = new HighlightArrow("challenge-step-arrow", challenge.game, 0.1, dir);
            arrow.position = p.subtract(dir.scale(0.0));
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

    public steps: (ChallengeStep | ChallengeStep[])[] = [];
    
    constructor(public game: Game) {
        this.WaitAnimation = Mummu.AnimationFactory.CreateWait(this.game);

        this.tutoPopup = document.getElementById("challenge-tuto") as Popup;
        this.tutoText = this.tutoPopup.querySelector("div");

        this.steps = [
            ChallengeStep.Wait(this, 0.5),
            ChallengeStep.Text(this, "Challenge mode, easy start.", 0.5),
            [
                ChallengeStep.Arrow(this, () => {
                    let ball = game.machine.balls[0];
                    if (ball) {
                        return ball.position;
                    }
                    return BABYLON.Vector3.Zero();
                }, 0.5),
                ChallengeStep.Text(this, "Bring the ball...", 0.5),
            ],
            [
                ChallengeStep.Arrow(this, () => {
                    let arrival = game.machine.parts.find(part => { return part.partName === "end"; });
                    console.log(game.machine.parts);
                    console.log(arrival);
                    if (arrival) {
                        let p = arrival.position.clone();
                        let x0 = tileWidth * 0.15;
                        let y0 = - 1.4 * tileHeight - 0.005;
                        p.x += x0;
                        p.y += y0;
                        return p;
                    }
                    return BABYLON.Vector3.Zero();
                }, 3),
                ChallengeStep.Text(this, "to its destination.", 3),
            ],
            ChallengeStep.Text(this, "First, add the adequate Track elements.", 2),
            ChallengeStep.Text(this, "Then press Play.", 2),
            ChallengeStep.Text(this, "Puzzle is completed when the ball is in the golden receptacle.", 4),
        ]
    }

    public initialize(): void {
        this.state = 0;
    }

    public update(): void {
        if (this.state != - 1) {
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
                    let I = i;
                    step[i].doStep().then(() => { console.log("step " + I + " done"); count --; });
                }
                let checkAllDone = setInterval(() => {
                    if (count === 0) {
                        console.log("all done");
                        this.state = next;
                        clearInterval(checkAllDone);
                    }
                }, 15);
            }
        }
    }
}