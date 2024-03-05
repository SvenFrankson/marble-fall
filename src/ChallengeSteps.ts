class ChallengeSteps {

    public static GetSteps(challenge: Challenge, index: number): (ChallengeStep | ChallengeStep[])[] {
        if (index === 1) {
            return [
                ChallengeStep.Wait(challenge, challenge.delay * 0.5),
                ChallengeStep.Text(challenge, "Challenge 1 - Easy", challenge.delay),
                ChallengeStep.Text(challenge, "To complete the puzzle,", challenge.delay),
                [
                    ChallengeStep.Arrow(challenge, () => {
                        let ball = challenge.game.machine.balls[0];
                        if (ball) {
                            return ball.position;
                        }
                        return BABYLON.Vector3.Zero();
                    }, challenge.delay),
                    ChallengeStep.Text(challenge, "bring the ball...", challenge.delay),
                ],
                [
                    ChallengeStep.Arrow(challenge, () => {
                        let arrival = challenge.game.machine.parts.find(part => { return part.partName === "end"; });
                        if (arrival) {
                            let p = arrival.position.clone();
                            let x0 = tileWidth * 0.15;
                            let y0 = - 1.4 * tileHeight - 0.005;
                            p.x += x0;
                            p.y += y0;
                            return p;
                        }
                        return BABYLON.Vector3.Zero();
                    }, challenge.delay),
                    ChallengeStep.Text(challenge, "... to its destination.", challenge.delay),
                ],
                [
                    ChallengeStep.SvgArrowSlide(challenge, () => { return document.querySelector(".machine-editor-item"); }, { x: () => { return window.innerWidth * 0.5 }, y: () => { return window.innerHeight * 0.5 }, dir: - 135 }, challenge.delay),
                    ChallengeStep.Text(challenge, "Add track elements to complete the circuit.", challenge.delay),
                ],
                [
                    ChallengeStep.SvgArrow(challenge, () => { return document.querySelector("#toolbar-play"); }, - 155, challenge.delay),
                    ChallengeStep.Text(challenge, "Press PLAY to run your solution.", challenge.delay),
                ]
            ];
        }
        else if (index === 2) {
            return [
                ChallengeStep.Wait(challenge, challenge.delay * 0.5),
                ChallengeStep.Text(challenge, "Challenge 2 - Gravity", challenge.delay),
                ChallengeStep.Text(challenge, "Gravity causes mutual attraction", challenge.delay),
                ChallengeStep.Text(challenge, "between all things that have mass.", challenge.delay)
            ];
        }
        else if (index === 3) {
            return [
                ChallengeStep.Wait(challenge, challenge.delay * 0.5),
                ChallengeStep.Text(challenge, "Challenge 3 - Turn Around", challenge.delay),
                ChallengeStep.Text(challenge, "There's no straight path", challenge.delay),
                ChallengeStep.Text(challenge, "make a detour.", challenge.delay)
            ];
        }
        else if (index === 4) {
            return [
                ChallengeStep.Wait(challenge, challenge.delay * 0.5),
                ChallengeStep.Text(challenge, "Challenge 4 - Join", challenge.delay),
                ChallengeStep.Text(challenge, "Completion requires both balls", challenge.delay),
                ChallengeStep.Text(challenge, "to reach their same destination.", challenge.delay)
            ];
        }
        else if (index === 5) {
            return [
                ChallengeStep.Wait(challenge, challenge.delay * 0.5),
                ChallengeStep.Text(challenge, "Challenge 5 - Gravity II", challenge.delay),
                ChallengeStep.Text(challenge, "Gravitational energy is the potential energy", challenge.delay),
                ChallengeStep.Text(challenge, "an object has due to gravity.", challenge.delay)
            ];
        }
    }
}