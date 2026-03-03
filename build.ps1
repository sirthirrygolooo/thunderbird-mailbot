# Script de build – Mailbot CEMagik
# Génère le fichier .xpi installable dans Thunderbird

$ProjectDir = $PSScriptRoot
$Version = (Get-Content "$ProjectDir\manifest.json" | ConvertFrom-Json).version
$OutputFile = "$ProjectDir\mailbot-cemagik-$Version.xpi"

# Fichiers et dossiers à inclure
$Includes = @(
  "manifest.json",
  "background.js",
  "api",
  "compose",
  "options",
  "icons"
)

# Supprimer l'ancien fichier si présent
if (Test-Path $OutputFile) { Remove-Item $OutputFile -Force }

# Créer l'archive zip (= xpi)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($OutputFile, 'Create')

foreach ($item in $Includes) {
  $fullPath = Join-Path $ProjectDir $item
  if (Test-Path $fullPath -PathType Leaf) {
    # Fichier simple
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $item) | Out-Null
  } elseif (Test-Path $fullPath -PathType Container) {
    # Dossier : inclure tous les fichiers récursivement
    Get-ChildItem $fullPath -Recurse -File | ForEach-Object {
      $entryName = $_.FullName.Substring($ProjectDir.Length + 1).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
    }
  }
}

$zip.Dispose()

Write-Host "Extension compilee : $OutputFile" -ForegroundColor Green
Write-Host "Pour installer : Thunderbird > Outils > Modules complementaires > ⚙️ > Installer depuis un fichier"
