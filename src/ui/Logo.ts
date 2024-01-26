class Logo {

    public container: SVGElement;
    public fullScreenBanner: HTMLDivElement;

    constructor(public game: Game) {
        this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.container.id = "logo";
        this.container.setAttribute("viewBox", "0 0 1000 350");
        this.container.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        this.container.style.opacity = "0";
        this.container.style.pointerEvents = "none";
        document.body.appendChild(this.container);

        this.fullScreenBanner = document.createElement("div");
        this.fullScreenBanner.id = "logo-banner";
        this.fullScreenBanner.style.opacity = "0";
        this.fullScreenBanner.style.pointerEvents = "none";
        document.body.appendChild(this.fullScreenBanner);
    }

    public async show(): Promise<void> {
        if (this.container.style.visibility === "visible") {
            if (this.fullScreenBanner.style.visibility === "visible") {
                return;
            }
        }
        
        let animContainer = Mummu.AnimationFactory.CreateNumber(this.game, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        let animBanner = Mummu.AnimationFactory.CreateNumber(this.game, this.fullScreenBanner.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.fullScreenBanner.style.visibility = "visible";
        this.container.style.visibility = "visible";
        animBanner(1, 1);
        await animContainer(1, 1);
    }

    public async hide(): Promise<void> {
        if (this.container.style.visibility === "hidden") {
            if (this.fullScreenBanner.style.visibility === "hidden") {
                return;
            }
        }

        let animContainer = Mummu.AnimationFactory.CreateNumber(this.game, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        let animBanner = Mummu.AnimationFactory.CreateNumber(this.game, this.fullScreenBanner.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.fullScreenBanner.style.visibility = "visible";
        this.container.style.visibility = "visible";
        animBanner(0, 0.5);
        await animContainer(0, 0.5);
        this.fullScreenBanner.style.visibility = "hidden";
        this.container.style.visibility = "hidden";
    }

    public initialize(): void {

        this.container.innerHTML = `
            <linearGradient id="steel-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#313a42" />
                <stop offset="50%" stop-color="#abc3d6"/>
                <stop offset="100%" stop-color="#313a42" />
            </linearGradient>
            <linearGradient id="copper-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#633204" />
                <stop offset="50%" stop-color="#dec3ab"/>
                <stop offset="100%" stop-color="#633204" />
            </linearGradient>
        `;

        let img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttribute("x", "100");
        img.setAttribute("y", "-225");
        img.setAttribute("width", "800");
        img.setAttribute("height", "800");
        img.setAttribute("href", "./datas/textures/edited-background.png");
        this.container.appendChild(img);

        let titleBack = document.createElementNS("http://www.w3.org/2000/svg", "text");
        titleBack.id = "logo-title-back";
        titleBack.classList.add("logo-title");
        titleBack.setAttribute("text-anchor", "middle");
        titleBack.setAttribute("x", "500");
        titleBack.setAttribute("y", "200");
        titleBack.setAttribute("transform-origin", "500 200")
        titleBack.setAttribute("transform", "scale(1 1.2)")
        titleBack.innerHTML = "MARBLE RUN";
        this.container.appendChild(titleBack);

        let title = document.createElementNS("http://www.w3.org/2000/svg", "text");
        title.id = "logo-title";
        title.classList.add("logo-title");
        title.setAttribute("text-anchor", "middle");
        title.setAttribute("x", "500");
        title.setAttribute("y", "200");
        title.setAttribute("transform-origin", "500 200")
        title.setAttribute("transform", "scale(1 1.2)")
        title.innerHTML = "MARBLE RUN";
        this.container.appendChild(title);

        let subtitleBack = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subtitleBack.id = "logo-subtitle-back";
        subtitleBack.classList.add("logo-subtitle");
        subtitleBack.setAttribute("text-anchor", "middle");
        subtitleBack.setAttribute("x", "600");
        subtitleBack.setAttribute("y", "270");
        subtitleBack.innerHTML = "SIMULATOR";
        this.container.appendChild(subtitleBack);

        let subtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subtitle.id = "logo-subtitle";
        subtitle.classList.add("logo-subtitle");
        subtitle.setAttribute("text-anchor", "middle");
        subtitle.setAttribute("x", "600");
        subtitle.setAttribute("y", "270");
        subtitle.innerHTML = "SIMULATOR";
        this.container.appendChild(subtitle);

        let earlyAccessDisclaimer = document.createElementNS("http://www.w3.org/2000/svg", "text");
        earlyAccessDisclaimer.setAttribute("text-anchor", "end");
        earlyAccessDisclaimer.setAttribute("x", "340");
        earlyAccessDisclaimer.setAttribute("y", "250");
        earlyAccessDisclaimer.setAttribute("fill", "white");
        earlyAccessDisclaimer.setAttribute("font-family", "Consolas");
        earlyAccessDisclaimer.setAttribute("font-size", "26px");
        earlyAccessDisclaimer.innerHTML = "> v0.1 early access";
        this.container.appendChild(earlyAccessDisclaimer);
    }
}