Function Select-FileDialog {
    param([string]$Description="Select File",[string]$RootFolder="Desktop")

    [System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") | Out-Null     

    $objForm = New-Object System.Windows.Forms.OpenFileDialog
    $objForm.InitialDirectory = $RootFolder
    $objForm.Title = $Description
    $Show = $objForm.ShowDialog()
    If ($Show -eq "OK") {
        $objForm.FileName | Out-Host
    } Else {
        Write-Error "Operation cancelled by user."
    }
}

Select-FileDialog # Variable contains user file selection
