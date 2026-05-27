#!/usr/bin/env pwsh
# Deploy the perf-lab demo (REST + gRPC + frontend) to Azure Container Apps.
#
# Prereqs:
#   az login
#   az extension add --name containerapp --upgrade   (preview is fine)
#
# Run:
#   ./deploy-azure.ps1                       # defaults
#   ./deploy-azure.ps1 -Location westeurope  # pick a region near you
#
# Real test: each service runs in its own Container App with EXTERNAL ingress and a
# real TLS cert. gRPC uses ingress transport "http2" (not downgraded); REST uses
# "auto" so the browser still gets HTTP/2 from the ingress. The frontend is built
# AFTER the backends so it bakes in their real https FQDNs. Open the frontend URL
# from your browser over the public internet -> real bandwidth + latency, nothing faked.

param(
  [string]$ResourceGroup = 'graftcode-perf-rg',
  [string]$Location      = 'eastus',
  [string]$EnvName       = 'graftcode-perf-env',
  [string]$AcrName       = "graftperf$((Get-Random -Maximum 99999))"  # must be globally unique
)

$ErrorActionPreference = 'Stop'
# Force UTF-8 so the az CLI doesn't crash streaming ACR build logs that contain
# non-cp1252 characters (e.g. Vite's "✓") on Windows consoles.
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'
$root = $PSScriptRoot

# Resolve the real az executable so our helper functions don't recurse into
# themselves (PowerShell is case-insensitive: a function named "az" would shadow
# the CLI). az is a .cmd wrapper on Windows, so check $LASTEXITCODE explicitly.
$AzExe = (Get-Command az -CommandType Application | Select-Object -First 1).Source

# NOTE: simple functions (no param()/[CmdletBinding]) on purpose, so they don't
# acquire PowerShell common parameters. Otherwise "-o" is treated as an ambiguous
# prefix of -OutVariable/-OutBuffer instead of being passed to az. $args captures
# every argument verbatim.
function Invoke-Az {
  & $AzExe @args
  if ($LASTEXITCODE -ne 0) { throw "FAILED: az $($args -join ' ')  (exit $LASTEXITCODE)" }
}
function Get-AzValue {
  $out = (& $AzExe @args) | Out-String
  if ($LASTEXITCODE -ne 0) { throw "FAILED: az $($args -join ' ')  (exit $LASTEXITCODE)" }
  $val = $out.Trim()
  if (-not $val) { throw "EMPTY result from: az $($args -join ' ')" }
  return $val
}

$restApp = 'rest-energy'
$grpcApp = 'grpc-energy'
$webApp  = 'perf-lab'

Write-Host "==> Registering resource providers (one-time per subscription)"
foreach ($ns in 'Microsoft.ContainerRegistry', 'Microsoft.App', 'Microsoft.OperationalInsights') {
  & $AzExe provider register -n $ns -o none | Out-Null
}
foreach ($ns in 'Microsoft.ContainerRegistry', 'Microsoft.App', 'Microsoft.OperationalInsights') {
  $state = ''
  for ($i = 0; $i -lt 60; $i++) {
    $state = (& $AzExe provider show -n $ns --query registrationState -o tsv)
    if ($state -eq 'Registered') { break }
    Write-Host "   waiting for $ns ($state) ..."
    Start-Sleep -Seconds 10
  }
  if ($state -ne 'Registered') { throw "Provider $ns did not register (last: $state)" }
}

Write-Host "==> Resource group $ResourceGroup in $Location"
Invoke-Az group create -n $ResourceGroup -l $Location -o none

Write-Host "==> Container Registry $AcrName"
Invoke-Az acr create -g $ResourceGroup -n $AcrName --sku Basic --admin-enabled true -o none
$acrServer = Get-AzValue acr show -g $ResourceGroup -n $AcrName --query loginServer -o tsv
$acrUser   = Get-AzValue acr credential show -g $ResourceGroup -n $AcrName --query username -o tsv
$acrPass   = Get-AzValue acr credential show -g $ResourceGroup -n $AcrName --query 'passwords[0].value' -o tsv

Write-Host "==> Building backend images in ACR (no local Docker needed)"
Invoke-Az acr build -r $AcrName -t "rest-energy:latest" "$root/electric-company-ws"
Invoke-Az acr build -r $AcrName -t "grpc-energy:latest" "$root/grpc-energy-price-dotnet"

Write-Host "==> Container Apps environment $EnvName"
# --logs-destination none skips the auto-generated Log Analytics workspace
# (not needed for a perf demo; fewer resources to provision and fewer ways to fail).
Invoke-Az containerapp env create -g $ResourceGroup -n $EnvName -l $Location --logs-destination none -o none

Write-Host "==> Deploying REST app (transport auto)"
Invoke-Az containerapp create -g $ResourceGroup -n $restApp --environment $EnvName `
  --image "$acrServer/rest-energy:latest" `
  --registry-server $acrServer --registry-username $acrUser --registry-password $acrPass `
  --target-port 8080 --ingress external --transport auto `
  --min-replicas 1 --cpu 1 --memory 2Gi -o none
$restFqdn = Get-AzValue containerapp show -g $ResourceGroup -n $restApp --query properties.configuration.ingress.fqdn -o tsv

Write-Host "==> Deploying gRPC app (transport http2)"
Invoke-Az containerapp create -g $ResourceGroup -n $grpcApp --environment $EnvName `
  --image "$acrServer/grpc-energy:latest" `
  --registry-server $acrServer --registry-username $acrUser --registry-password $acrPass `
  --target-port 8080 --ingress external --transport http2 `
  --min-replicas 1 --cpu 1 --memory 2Gi -o none
$grpcFqdn = Get-AzValue containerapp show -g $ResourceGroup -n $grpcApp --query properties.configuration.ingress.fqdn -o tsv

Write-Host "    REST: https://$restFqdn"
Write-Host "    gRPC: https://$grpcFqdn"

Write-Host "==> Building frontend image with backend URLs"
Invoke-Az acr build -r $AcrName -t "perf-lab:latest" `
  --build-arg "VITE_REST_URL=https://$restFqdn" `
  --build-arg "VITE_GRPC_URL=https://$grpcFqdn" `
  "$root/perf-lab"

Write-Host "==> Deploying frontend"
Invoke-Az containerapp create -g $ResourceGroup -n $webApp --environment $EnvName `
  --image "$acrServer/perf-lab:latest" `
  --registry-server $acrServer --registry-username $acrUser --registry-password $acrPass `
  --target-port 81 --ingress external --transport auto `
  --min-replicas 1 --cpu 0.5 --memory 1Gi -o none
$webFqdn = Get-AzValue containerapp show -g $ResourceGroup -n $webApp --query properties.configuration.ingress.fqdn -o tsv

Write-Host ""
Write-Host "============================================================"
Write-Host " Open the demo:  https://$webFqdn"
Write-Host " REST backend:   https://$restFqdn/api/EnergyPrice/price"
Write-Host " gRPC backend:   https://$grpcFqdn  (transport: http2)"
Write-Host "============================================================"
Write-Host " Tear down with:  az group delete -n $ResourceGroup --yes --no-wait"
