Write-Debug "Make Build for Marble Fall"

if (Test-Path "../marble-fall-build") {
    Remove-Item "../marble-fall-build" -Recurse -Force
}
New-Item "../marble-fall-build" -ItemType "directory"


Copy-Item -Path "./*" -Destination "../marble-fall-build/" -Recurse -Force -Exclude ".git", "src", "lib", ".vscode"

New-Item "../marble-fall-build/lib" -ItemType "directory"
New-Item "../marble-fall-build/lib/mummu" -ItemType "directory"
Copy-Item -Path "./lib/mummu/mummu.js" -Destination "../marble-fall-build/lib/mummu/mummu.js"
New-Item "../marble-fall-build/lib/nabu" -ItemType "directory"
Copy-Item -Path "./lib/nabu/nabu.js" -Destination "../marble-fall-build/lib/nabu/nabu.js"
Copy-Item -Path "./lib/babylon.js" -Destination "../marble-fall-build/lib/babylon.js"
Copy-Item -Path "./lib/babylonjs.loaders.js" -Destination "../marble-fall-build/lib/babylonjs.loaders.js"

Get-ChildItem -Path "../marble-fall-build/" "*.blend" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Get-ChildItem -Path "../marble-fall-build/" "*.blend1" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Get-ChildItem -Path "../marble-fall-build/" "*.babylon.manifest" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Get-ChildItem -Path "../marble-fall-build/" "*.log" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Get-ChildItem -Path "../marble-fall-build/" "*.xcf" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Get-ChildItem -Path "../marble-fall-build/" "*.d.ts" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Get-ChildItem -Path "../marble-fall-build/" "*.pdn" -Recurse | ForEach-Object { Remove-Item -Path $_.FullName }
Remove-Item -Path "../marble-fall-build/.gitignore"
Remove-Item -Path "../marble-fall-build/init_repo.bat"
Remove-Item -Path "../marble-fall-build/make_build.ps1"
Remove-Item -Path "../marble-fall-build/tsconfig.json"

(Get-Content "../marble-fall-build/index.html").Replace('./lib/babylon.max.js', './lib/babylon.js') | Set-Content "../marble-fall-build/index.html"