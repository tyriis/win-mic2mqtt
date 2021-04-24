# win-mic2mqtt

exports the microphone mute state to mqtt topic and allow to set microphone mute state via mqtt topic

## Prerequisites
- [nodejs](https://nodejs.org/) (tested with v14)
- [pm2](https://pm2.keymetrics.io/) (tested with 4.5.6)
```powershell
npm install pm2 -g
```
- Allow script execution for CurrentUser
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
```
- [AudioDeviceCmdlets library](https://github.com/frgnca/AudioDeviceCmdlets) (the prebuild library is included inside this repository)
```powershell
New-Item "$($profile | split-path)\Modules\AudioDeviceCmdlets" -Type directory -Force
Copy-Item "C:\path\to\AudioDeviceCmdlets.dll" "$($profile | split-path)\Modules\AudioDeviceCmdlets\AudioDeviceCmdlets.dll"
Set-Location "$($profile | Split-Path)\Modules\AudioDeviceCmdlets"
Get-ChildItem | Unblock-File
Import-Module AudioDeviceCmdlets
```

## Install

install the dependencies

```powershell
npm install
```

