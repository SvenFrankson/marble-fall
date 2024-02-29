class MainMaterials {

    public metalMaterials: BABYLON.PBRMetallicRoughnessMaterial[] = [];
    public getMetalMaterial(colorIndex: number): BABYLON.PBRMetallicRoughnessMaterial {
        return this.metalMaterials[colorIndex % this.metalMaterials.length];
    }
    public woodMaterial: BABYLON.StandardMaterial;
    public velvetMaterial: BABYLON.StandardMaterial;
    public logoMaterial: BABYLON.StandardMaterial;
    public baseAxisMaterial: BABYLON.StandardMaterial;
    public leatherMaterial: BABYLON.StandardMaterial;
    public whiteMaterial: BABYLON.StandardMaterial;
    public deepBlackMaterial: BABYLON.StandardMaterial;
    public paintingLight: BABYLON.StandardMaterial;
    public handleMaterial: BABYLON.StandardMaterial;
    public ghostMaterial: BABYLON.StandardMaterial;
    public gridMaterial: BABYLON.StandardMaterial;
    public cyanMaterial: BABYLON.StandardMaterial;
    public redMaterial: BABYLON.StandardMaterial;
    public greenMaterial: BABYLON.StandardMaterial;
    public blueMaterial: BABYLON.StandardMaterial;
    public uiMaterial: BABYLON.StandardMaterial;

    constructor(public game: Game) {
        this.handleMaterial = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterial.diffuseColor.copyFromFloats(0, 0, 0);
        this.handleMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterial.alpha = 1;

        this.ghostMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.ghostMaterial.diffuseColor.copyFromFloats(0.8, 0.8, 1);
        this.ghostMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.ghostMaterial.alpha = 0.3;

        this.gridMaterial = new BABYLON.StandardMaterial("grid-material");
        this.gridMaterial.diffuseColor.copyFromFloats(0, 0, 0);
        this.gridMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.gridMaterial.alpha = this.game.config.gridOpacity;

        this.cyanMaterial = new BABYLON.StandardMaterial("cyan-material");
        this.cyanMaterial.diffuseColor = BABYLON.Color3.FromHexString("#00FFFF");
        this.cyanMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.redMaterial = new BABYLON.StandardMaterial("red-material");
        this.redMaterial.diffuseColor = BABYLON.Color3.FromHexString("#bf212f");
        this.redMaterial.emissiveColor = BABYLON.Color3.FromHexString("#bf212f");
        this.redMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.greenMaterial = new BABYLON.StandardMaterial("green-material");
        this.greenMaterial.diffuseColor = BABYLON.Color3.FromHexString("#006f3c");
        this.greenMaterial.emissiveColor = BABYLON.Color3.FromHexString("#006f3c");
        this.greenMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.blueMaterial = new BABYLON.StandardMaterial("blue-material");
        this.blueMaterial.diffuseColor = BABYLON.Color3.FromHexString("#264b96");
        this.blueMaterial.emissiveColor = BABYLON.Color3.FromHexString("#264b96");
        this.blueMaterial.specularColor.copyFromFloats(0, 0, 0);

        this.uiMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.uiMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.uiMaterial.emissiveColor.copyFromFloats(1, 1, 1);
        this.uiMaterial.specularColor.copyFromFloats(0, 0, 0);

        let steelMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.game.scene);
        steelMaterial.baseColor = new BABYLON.Color3(0.5, 0.75, 1.0);
        steelMaterial.metallic = 1.0;
        steelMaterial.roughness = 0.15;
        steelMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.game.scene);
        
        let copperMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.game.scene);
        copperMaterial.baseColor = BABYLON.Color3.FromHexString("#B87333");
        copperMaterial.metallic = 1.0;
        copperMaterial.roughness = 0.15;
        copperMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.game.scene);

        this.metalMaterials = [steelMaterial, copperMaterial];

        this.velvetMaterial = new BABYLON.StandardMaterial("velvet-material");
        this.velvetMaterial.diffuseColor.copyFromFloats(0.75, 0.75, 0.75);
        this.velvetMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/velvet.jpg");
        this.velvetMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.logoMaterial = new BABYLON.StandardMaterial("logo-material");
        this.logoMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.logoMaterial.diffuseTexture = new BABYLON.Texture("./datas/icons/logo-white-no-bg.png");
        this.logoMaterial.diffuseTexture.hasAlpha = true;
        this.logoMaterial.useAlphaFromDiffuseTexture = true;
        this.logoMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.logoMaterial.alpha = 0.3;
        
        this.baseAxisMaterial = new BABYLON.StandardMaterial("logo-material");
        this.baseAxisMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.baseAxisMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/axis.png");
        this.baseAxisMaterial.diffuseTexture.hasAlpha = true;
        this.baseAxisMaterial.useAlphaFromDiffuseTexture = true;
        this.baseAxisMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        
        this.woodMaterial = new BABYLON.StandardMaterial("wood-material");
        this.woodMaterial.diffuseColor.copyFromFloats(0.3, 0.3, 0.3);
        //this.woodMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/wood-color.jpg");
        //this.woodMaterial.ambientTexture = new BABYLON.Texture("./datas/textures/wood-ambient-occlusion.jpg");
        //this.woodMaterial.specularTexture = new BABYLON.Texture("./datas/textures/wood-roughness.jpg");
        this.woodMaterial.specularColor.copyFromFloats(0.2, 0.2, 0.2);
        //this.woodMaterial.bumpTexture = new BABYLON.Texture("./datas/textures/wood-normal-2.png");
        
        this.leatherMaterial = new BABYLON.StandardMaterial("leather-material");
        this.leatherMaterial.diffuseColor.copyFromFloats(0.05, 0.02, 0.02);
        this.leatherMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        
        this.whiteMaterial = new BABYLON.StandardMaterial("white-material");
        this.whiteMaterial.diffuseColor.copyFromFloats(0.9, 0.95, 1).scaleInPlace(0.9);
        this.whiteMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        
        this.deepBlackMaterial = new BABYLON.StandardMaterial("deep-black-material");
        this.deepBlackMaterial.diffuseColor.copyFromFloats(0, 0, 0.);
        this.deepBlackMaterial.specularColor.copyFromFloats(0, 0, 0);

        this.paintingLight = new BABYLON.StandardMaterial("autolit-material");
        this.paintingLight.diffuseColor.copyFromFloats(1, 1, 1);
        this.paintingLight.emissiveTexture = new BABYLON.Texture("./datas/textures/painting-light.png");
        this.paintingLight.specularColor.copyFromFloats(0.1, 0.1, 0.1);
    }
}